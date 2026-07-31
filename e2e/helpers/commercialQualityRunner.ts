/**
 * Browser execution seam for the commercial quality control plane.
 *
 * The pure engine (lib/commercialQuality/**) owns the rules; this helper owns
 * the Playwright measurement and the M55 clean-capture integration. Existing
 * suites keep their own execution: Commit A only establishes this shared seam.
 */
import { execSync } from 'node:child_process';

import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import type { CommercialQualityAdapter } from '../../lib/commercialQuality/continuousResponsiveEngine';
import { stressProfileSpec } from '../../lib/commercialQuality/contentStateStress';
import { assertProfileSupported } from '../../lib/commercialQuality/setupRegistry';
import type {
  CasePlan,
  MeasuredAxeViolation,
  MeasuredNode,
  MeasuredSurface,
  SurfaceManifestEntry,
} from '../../lib/commercialQuality/types';
import { m55SetupById } from '../../lib/m55/commercialUx/qualityControl/m55SetupRegistry';
import {
  observeRuntimeStateId,
  stateDomContractForEntry,
} from '../../lib/m55/commercialUx/qualityControl/m55StateDomContracts';
import {
  assertLocalNavigationStable,
  assertOverlayAbsence,
  requireCleanCaptureEnvironment,
  safeGotoLocal,
} from './cleanCaptureEnvironment';

export type MeasureInput = {
  protectedElements: readonly { selector: string; role: MeasuredNode['role']; requireText: boolean }[];
  ctaSelector: string | null;
  fixedSelectors: readonly string[];
  boundaries: readonly { selector: string; position: 'preceding' | 'following' }[];
  containerSelector: string;
};

type BrowserGeometry = {
  observedRoute: string;
  observedOrigin: string;
  innerWidth: number;
  documentScrollWidth: number;
  protectedNodes: MeasuredNode[];
  criticalCta: MeasuredNode | null;
  fixedNodes: MeasuredSurface['fixedNodes'];
  boundaries: MeasuredSurface['boundaries'];
  containerRect: MeasuredSurface['containerRect'];
  governedTextLength: number;
  shellTextLength: number;
  loadingIndicatorPresent: boolean;
  largestVerticalGapPx: number;
  landmarks: string[];
};

/**
 * Self-contained browser collector. Read-only: it never hides, styles or
 * detaches a node, so a defect cannot be sanitized away before measurement.
 */
function collectGeometry(input: MeasureInput): BrowserGeometry {
  const MAX_LINE_CHARS = 600;

  const toRect = (r: DOMRect) => ({
    top: r.top,
    left: r.left,
    right: r.right,
    bottom: r.bottom,
    width: r.width,
    height: r.height,
  });

  const emptyRect = { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };

  const computedOf = (el: Element) => {
    const s = window.getComputedStyle(el);
    return {
      overflow: s.overflow,
      overflowX: s.overflowX,
      overflowY: s.overflowY,
      height: s.height,
      minHeight: s.minHeight,
      maxHeight: s.maxHeight,
      position: s.position,
      zIndex: s.zIndex,
      transform: s.transform,
      display: s.display,
      alignItems: s.alignItems,
      justifyContent: s.justifyContent,
      flex: s.flex,
      gridTemplateRows: s.gridTemplateRows,
      inset: `${s.top} ${s.right} ${s.bottom} ${s.left}`,
      width: s.width,
    };
  };

  const describeSelector = (el: Element) => {
    if (el === document.body) return 'body';
    if (el === document.documentElement) return 'html';
    const id = el.getAttribute('id');
    if (id) return `#${id}`;
    const testId = el.getAttribute('data-testid');
    if (testId) return `[data-testid="${testId}"]`;
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : '';
    return cls ? `${el.tagName.toLowerCase()}.${cls}` : el.tagName.toLowerCase();
  };

  /**
   * Nearest ancestor whose clipped box cuts the element's *currently painted*
   * viewport band. Tall scroll containers that merely extend past a viewport
   * shell are not treated as clipped content.
   */
  const findClippingAncestor = (el: Element) => {
    const target = el.getBoundingClientRect();
    const viewTop = 0;
    const viewBottom = window.innerHeight;
    const viewLeft = 0;
    const viewRight = window.innerWidth;
    const visibleTop = Math.max(target.top, viewTop);
    const visibleBottom = Math.min(target.bottom, viewBottom);
    const visibleLeft = Math.max(target.left, viewLeft);
    const visibleRight = Math.min(target.right, viewRight);
    if (visibleBottom - visibleTop <= 1.5 || visibleRight - visibleLeft <= 1.5) {
      return null;
    }
    let parent = el.parentElement;
    while (parent && parent !== document.documentElement) {
      const style = window.getComputedStyle(parent);
      const clipsY = style.overflowY === 'hidden' || style.overflowY === 'clip';
      const clipsX = style.overflowX === 'hidden' || style.overflowX === 'clip';
      if (clipsY || clipsX) {
        const box = parent.getBoundingClientRect();
        const cutBottom =
          clipsY && visibleBottom > box.bottom + 1.5 && visibleTop < box.bottom - 1.5;
        const cutTop = clipsY && visibleTop < box.top - 1.5 && visibleBottom > box.top + 1.5;
        const cutRight =
          clipsX && visibleRight > box.right + 1.5 && visibleLeft < box.right - 1.5;
        const cutLeft = clipsX && visibleLeft < box.left - 1.5 && visibleRight > box.left + 1.5;
        if (cutBottom || cutTop || cutRight || cutLeft) {
          return {
            selector: describeSelector(parent),
            rect: toRect(box),
            computed: computedOf(parent),
          };
        }
      }
      parent = parent.parentElement;
    }
    return null;
  };

  /** Rendered lines reconstructed from Range.getClientRects(). */
  const renderedLines = (el: Element) => {
    const lines = new Map<number, { text: string; rect: DOMRect }>();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let budget = MAX_LINE_CHARS;
    let node = walker.nextNode();
    while (node && budget > 0) {
      const text = node.textContent ?? '';
      for (let i = 0; i < text.length && budget > 0; i += 1) {
        budget -= 1;
        if (text[i] === '\n') continue;
        const range = document.createRange();
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const rects = range.getClientRects();
        if (rects.length === 0) continue;
        const r = rects[0];
        if (r.width === 0 && r.height === 0) continue;
        const key = Math.round(r.top);
        const existing = lines.get(key);
        if (existing) {
          existing.text += text[i];
          if (r.right > existing.rect.right || r.bottom > existing.rect.bottom) {
            existing.rect = new DOMRect(
              Math.min(existing.rect.left, r.left),
              Math.min(existing.rect.top, r.top),
              Math.max(existing.rect.right, r.right) - Math.min(existing.rect.left, r.left),
              Math.max(existing.rect.bottom, r.bottom) - Math.min(existing.rect.top, r.top),
            );
          }
        } else {
          lines.set(key, { text: text[i], rect: r });
        }
      }
      node = walker.nextNode();
    }
    return [...lines.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, line]) => ({ text: line.text, rect: toRect(line.rect) }));
  };

  const accessibleNameOf = (el: Element) => {
    const aria = el.getAttribute('aria-label');
    if (aria && aria.trim()) return aria.trim();
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const ref = document.getElementById(labelledBy);
      if (ref?.textContent?.trim()) return ref.textContent.trim();
    }
    const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    return text.length ? text : null;
  };

  const describeNode = (
    selector: string,
    role: MeasuredNode['role'],
    requireText: boolean,
  ): MeasuredNode => {
    const el = document.querySelector(selector);
    if (!(el instanceof Element)) {
      return {
        selector,
        role,
        found: false,
        visible: false,
        opacity: 0,
        textLength: 0,
        rect: emptyRect,
        clippingAncestor: null,
        renderedLines: [],
        accessibleName: null,
        focusVisible: null,
      };
    }
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const visible =
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      rect.width > 0 &&
      rect.height > 0;
    const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    return {
      selector,
      role,
      found: true,
      visible,
      opacity: Number.parseFloat(style.opacity || '1'),
      textLength: text.length,
      rect: toRect(rect),
      clippingAncestor: findClippingAncestor(el),
      renderedLines: renderedLines(el),
      accessibleName: accessibleNameOf(el),
      focusVisible: null,
    };
  };

  const container = document.querySelector(input.containerSelector);
  const containerRect = container instanceof Element ? toRect(container.getBoundingClientRect()) : null;
  const governedText = container ? (container.textContent ?? '').replace(/\s+/g, ' ').trim() : '';
  const bodyText = (document.body.textContent ?? '').replace(/\s+/g, ' ').trim();

  let largestVerticalGapPx = 0;
  if (container instanceof Element) {
    const rects = Array.from(container.children)
      .map((child) => child.getBoundingClientRect())
      .filter((r) => r.height > 0)
      .sort((a, b) => a.top - b.top);
    for (let i = 1; i < rects.length; i += 1) {
      largestVerticalGapPx = Math.max(largestVerticalGapPx, rects[i].top - rects[i - 1].bottom);
    }
  }

  const loadingIndicatorPresent =
    document.querySelector('[aria-busy="true"]') !== null ||
    document.querySelector('[data-m55-loading="true"]') !== null ||
    bodyText.includes('読み込み中…');

  const landmarks: string[] = [];
  for (const [tag, landmark] of [
    ['main', 'main'],
    ['header', 'banner'],
    ['nav', 'navigation'],
    ['footer', 'contentinfo'],
  ] as const) {
    if (document.querySelector(tag)) landmarks.push(tag === 'main' ? 'main' : landmark);
  }

  const fixedNodes: BrowserGeometry['fixedNodes'] = input.fixedSelectors.flatMap((selector) => {
    const el = document.querySelector(selector);
    if (!(el instanceof Element)) return [];
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return [
      {
        selector,
        position: style.position,
        zIndex: style.zIndex,
        visible:
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          rect.width > 0 &&
          rect.height > 0,
        rect: toRect(rect),
      },
    ];
  });

  return {
    observedRoute: location.pathname,
    observedOrigin: location.origin,
    innerWidth: window.innerWidth,
    documentScrollWidth: Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    ),
    protectedNodes: input.protectedElements.map((p) =>
      describeNode(p.selector, p.role, p.requireText),
    ),
    criticalCta: input.ctaSelector ? describeNode(input.ctaSelector, 'cta', true) : null,
    fixedNodes,
    boundaries: input.boundaries.map((boundary) => {
      const el = document.querySelector(boundary.selector);
      return {
        selector: boundary.selector,
        position: boundary.position,
        found: el instanceof Element,
        rect: el instanceof Element ? toRect(el.getBoundingClientRect()) : emptyRect,
      };
    }),
    containerRect,
    governedTextLength: governedText.length,
    shellTextLength: Math.max(0, bodyText.length - governedText.length),
    loadingIndicatorPresent,
    largestVerticalGapPx,
    landmarks,
  };
}

function measureInputFor(entry: SurfaceManifestEntry): MeasureInput {
  const container =
    entry.protectedElements.find((element) => element.role === 'container') ??
    entry.protectedElements[0];
  return {
    protectedElements: entry.protectedElements.map((element) => ({
      selector: element.selector,
      role: element.role,
      requireText: element.requireText,
    })),
    ctaSelector: entry.criticalCta?.selector ?? null,
    fixedSelectors: entry.fixedElements,
    boundaries: entry.sectionBoundaries.map((boundary) => ({
      selector: boundary.selector,
      position: boundary.position,
    })),
    containerSelector: container?.selector ?? 'main',
  };
}

async function measureFocusVisible(page: Page, selector: string): Promise<boolean | null> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!(el instanceof HTMLElement)) return null;
    el.focus({ preventScroll: true });
    if (document.activeElement !== el) return null;
    const style = window.getComputedStyle(el);
    const hasOutline =
      style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth || '0') > 0;
    const hasShadow = style.boxShadow !== 'none' && style.boxShadow.trim().length > 0;
    el.blur();
    return hasOutline || hasShadow;
  }, selector);
}

export async function collectAxeViolations(page: Page): Promise<readonly MeasuredAxeViolation[]> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return results.violations.map((violation) => ({
    id: violation.id,
    impact: (violation.impact ?? null) as MeasuredAxeViolation['impact'],
    nodeCount: violation.nodes.length,
    targets: violation.nodes.flatMap((node) => node.target.map((target) => String(target))),
    helpUrl: violation.helpUrl,
  }));
}

export type MeasureOptions = {
  includeAccessibility?: boolean;
  expectedOrigin: string;
};

export async function measureCommercialSurface(
  page: Page,
  entry: SurfaceManifestEntry,
  plan: CasePlan,
  options: MeasureOptions,
): Promise<MeasuredSurface> {
  const geometry = await page.evaluate(collectGeometry, measureInputFor(entry));

  let criticalCta = geometry.criticalCta;
  if (criticalCta?.found && entry.criticalCta) {
    criticalCta = {
      ...criticalCta,
      focusVisible: await measureFocusVisible(page, entry.criticalCta.selector),
    };
  }

  const axeViolations = (options.includeAccessibility ?? true)
    ? await collectAxeViolations(page)
    : [];

  // Re-observe independently from the rendered DOM — never accept a
  // caller-certified runtimeStateId bypass.
  const contract = stateDomContractForEntry(entry);
  const observedRuntimeStateId = await observeRuntimeStateId(page, contract);
  if (!observedRuntimeStateId) {
    throw new Error(
      `STATE_CONTRACT_MISSING: missing observed state marker ${contract.selector} for ${entry.surfaceId}`,
    );
  }
  if (observedRuntimeStateId !== entry.runtimeStateId) {
    throw new Error(
      `LAYOUT_STATE_DRIFT: observed ${observedRuntimeStateId} expected ${entry.runtimeStateId}`,
    );
  }

  return {
    surfaceId: entry.surfaceId,
    runtimeStateId: observedRuntimeStateId,
    observedRoute: geometry.observedRoute,
    observedOrigin: geometry.observedOrigin,
    expectedOrigin: options.expectedOrigin,
    pageAlive: !page.isClosed(),
    viewport: plan.viewport,
    innerWidth: geometry.innerWidth,
    documentScrollWidth: geometry.documentScrollWidth,
    protectedNodes: geometry.protectedNodes,
    criticalCta,
    fixedNodes: geometry.fixedNodes,
    boundaries: geometry.boundaries,
    containerRect: geometry.containerRect,
    governedTextLength: geometry.governedTextLength,
    shellTextLength: geometry.shellTextLength,
    loadingIndicatorPresent: geometry.loadingIndicatorPresent,
    largestVerticalGapPx: geometry.largestVerticalGapPx,
    axeViolations,
    landmarks: geometry.landmarks,
  };
}

export function resolveSourceCommit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}


export type M55AdapterOptions = {
  baseURL: string;
  label: string;
  includeAccessibility?: boolean;
};

export type AppliedProfileEvidence = {
  content?: Readonly<Record<string, unknown>>;
  execution?: Readonly<Record<string, unknown>>;
  fontGeometryBefore?: number;
  fontGeometryAfter?: number;
};

/**
 * M55 project adapter. Executable setups own navigation and state.
 * non_runtime_reference setups are refused. Unsupported stress fails closed.
 */
export function createM55CommercialQualityAdapter(
  options: M55AdapterOptions,
): CommercialQualityAdapter<Page> & {
  lastProfileEvidence: () => AppliedProfileEvidence | null;
} {
  const expectedOrigin = new URL(options.baseURL).origin;
  let lastEvidence: AppliedProfileEvidence | null = null;

  return {
    projectId: 'm55',
    sourceCommit: resolveSourceCommit,
    lastProfileEvidence: () => lastEvidence,

    applyStressProfile: async (_page, entry, spec) => {
      const setup = m55SetupById(entry.setupId);
      if (!setup || typeof setup.execute !== 'function') {
        throw new Error(`SETUP_UNKNOWN_ID: ${entry.setupId}`);
      }
      if (setup.executionClass !== 'executable') {
        throw new Error(`SETUP_NON_RUNTIME: ${entry.setupId}`);
      }
      if (!setup.supportedContentStressProfiles.includes(spec.profile)) {
        throw new Error(`SETUP_STRESS_UNSUPPORTED: ${spec.profile} on ${setup.setupId}`);
      }
      if (spec.requiresAuthentication && !setup.hasDeterministicAuthFixture) {
        throw new Error(`SETUP_AUTH_WITHOUT_FIXTURE: ${entry.surfaceId} / ${spec.profile}`);
      }
    },

    prepareCase: async (page, entry, plan) => {
      requireCleanCaptureEnvironment(options.label);
      const setup = m55SetupById(entry.setupId);
      if (!setup || typeof setup.execute !== 'function') {
        throw new Error(`SETUP_UNKNOWN_ID: ${entry.setupId}`);
      }
      if (setup.executionClass !== 'executable') {
        throw new Error(`SETUP_NON_RUNTIME: refuse to prepare ${setup.setupId}`);
      }
      assertProfileSupported(setup, plan.contentStressProfile, plan.profile);

      await page.setViewportSize(plan.viewport);
      const context = { page, baseURL: options.baseURL, label: options.label };
      lastEvidence = {};

      if (setup.applyExecutionProfile) {
        const applied = await setup.applyExecutionProfile(context, entry, plan.profile);
        lastEvidence.execution = applied.evidence;
      }

      const executed = await setup.execute(context, entry);
      lastEvidence.content = { setup: executed.evidence };

      if (setup.applyGovernedStress) {
        const applied = await setup.applyGovernedStress(
          context,
          entry,
          plan.contentStressProfile,
        );
        lastEvidence.content = { ...lastEvidence.content, stress: applied.evidence };
      }

      await page.waitForLoadState('domcontentloaded');

      if (plan.profile === 'font_load_transition') {
        const before = await page.evaluate(() => {
          const main = document.querySelector('main');
          return main ? main.getBoundingClientRect().height : 0;
        });
        lastEvidence.fontGeometryBefore = before;
        await page.evaluate(() => document.fonts?.ready ?? Promise.resolve());
        await page.waitForTimeout(50);
        const after = await page.evaluate(() => {
          const main = document.querySelector('main');
          return main ? main.getBoundingClientRect().height : 0;
        });
        lastEvidence.fontGeometryAfter = after;
        if (before <= 0 || after <= 0) {
          throw new Error('font_load_transition: governed geometry missing before/after fonts.ready');
        }
      } else {
        await page.evaluate(() => document.fonts?.ready ?? Promise.resolve());
        await page.waitForTimeout(90);
      }

      await assertLocalNavigationStable(page, {
        label: `${options.label}:${entry.surfaceId}`,
        previousUrl: page.url(),
      });
      await assertOverlayAbsence(page, `${options.label}:${entry.surfaceId}`);
    },

    teardownCase: async (page, entry) => {
      const setup = m55SetupById(entry.setupId);
      if (setup?.teardown) {
        await setup.teardown({ page, baseURL: options.baseURL, label: options.label }, entry);
      }
    },

    measure: async (page, entry, plan) =>
      measureCommercialSurface(page, entry, plan, {
        expectedOrigin,
        includeAccessibility: options.includeAccessibility ?? true,
      }),
  };
}

export { stressProfileSpec };
