/**
 * P1B Preview visual evidence harness — Human-evidence infrastructure only.
 *
 * Active only when M55_PREVIEW_EVIDENCE=1 with explicit origin/SHA/branch env.
 * Default CI does not invoke this spec; inactive mode is a no-op contract test.
 *
 * Future command (do not run in implementation gate):
 *   M55_PREVIEW_EVIDENCE=1 M55_PREVIEW_ORIGIN=... M55_PREVIEW_EXPECTED_SHA=...
 *   M55_PREVIEW_EXPECTED_BRANCH=... PLAYWRIGHT_BASE_URL=... \
 *   npx playwright test e2e/commercial-visual-preview-evidence.spec.ts --project=chromium
 */
import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Browser, type Page } from '@playwright/test';

import {
  establishCheckoutPrep,
  establishCoreResult,
} from '../lib/m55/commercialUx/qualityControl/m55QualityFixtures';
import {
  commercialVisualCaseById,
  type CommercialVisualCase,
} from '../lib/m55/commercialUx/visualQuality/commercialVisualQualityContract';
import {
  checkMeasuredPage,
  contrastRatio,
  requiredContrastFor,
  type MeasuredPage,
} from '../lib/m55/commercialUx/visualQuality/commercialVisualQualityChecks';
import {
  PREVIEW_EVIDENCE_OUTPUT_ROOT,
  assertPreviewNavigationStable,
  buildPreviewEvidenceRecordMetadata,
  installPreviewMainFrameNavigationGuard,
  isPreviewEvidenceActive,
  loadPreviewEvidenceAuthority,
  preflightPreviewBuildIdentity,
  type PreviewBuildDiagnostics,
  type PreviewEvidenceAuthority,
  type PreviewMainFrameNavigationGuard,
} from './helpers/previewEvidenceAuthority';

const PREVIEW_EVIDENCE_ACTIVE = isPreviewEvidenceActive();
const PREVIEW_EVIDENCE_EVENT_PREFIX = 'M55_PREVIEW_EVIDENCE_EVENT ';

const PREVIEW_EVIDENCE_VIEWS = [
  { viewId: 'core-free-result-320x568', caseId: 'core-free-result', width: 320, height: 568 },
  { viewId: 'core-free-result-390x844', caseId: 'core-free-result', width: 390, height: 844 },
  { viewId: 'core-free-result-1280x900', caseId: 'core-free-result', width: 1280, height: 900 },
  { viewId: 'premium-checkout-320x568', caseId: 'premium-checkout', width: 320, height: 568 },
  { viewId: 'premium-checkout-390x844', caseId: 'premium-checkout', width: 390, height: 844 },
  { viewId: 'premium-checkout-1280x900', caseId: 'premium-checkout', width: 1280, height: 900 },
] as const;

type ContrastSummaryRow = {
  caseId: string;
  route: string;
  viewport: { width: number; height: number };
  selector: string;
  role: string;
  ratio: number | null;
  threshold: number | null;
  pass: boolean;
  failureCodes: string[];
};

function emitPreviewEvidenceEvent(event: Record<string, unknown>): void {
  console.log(`${PREVIEW_EVIDENCE_EVENT_PREFIX}${JSON.stringify(event)}`);
}

function requireGovernedCase(caseId: string): CommercialVisualCase {
  const governedCase = commercialVisualCaseById(caseId);
  if (!governedCase) {
    throw new Error(`PREVIEW_EVIDENCE_CASE_UNDECLARED: ${caseId}`);
  }
  return governedCase;
}

function buildContrastSummary(
  governedCase: CommercialVisualCase,
  measured: MeasuredPage,
  viewport: { width: number; height: number },
  checkerFailures: ReturnType<typeof checkMeasuredPage>,
): ContrastSummaryRow[] {
  const contrastFailures = checkerFailures.filter((f) => f.rule === 'contrast_below_minimum');
  return governedCase.protectedTargets.map((target) => {
    const element = measured.elements.find((el) => el.selector === target.selector);
    const failures = contrastFailures.filter((f) => f.selector === target.selector);
    if (target.contrastExempt) {
      return {
        caseId: governedCase.caseId,
        route: governedCase.route,
        viewport,
        selector: target.selector,
        role: target.role,
        ratio: null,
        threshold: null,
        pass: true,
        failureCodes: [],
      };
    }
    if (!element?.foreground || !element.background) {
      return {
        caseId: governedCase.caseId,
        route: governedCase.route,
        viewport,
        selector: target.selector,
        role: target.role,
        ratio: null,
        threshold: requiredContrastFor(element?.fontSizePx ?? null, element?.fontWeight ?? null),
        pass: failures.length === 0 && Boolean(element?.present),
        failureCodes: failures.map((f) => f.rule),
      };
    }
    const ratio = contrastRatio(element.foreground, element.background);
    const threshold = requiredContrastFor(element.fontSizePx, element.fontWeight);
    return {
      caseId: governedCase.caseId,
      route: governedCase.route,
      viewport,
      selector: target.selector,
      role: target.role,
      ratio: Number(ratio.toFixed(2)),
      threshold,
      pass: failures.length === 0 && ratio + 0.05 >= threshold,
      failureCodes: failures.map((f) => f.rule),
    };
  });
}

async function setupCoreFreeResultPreview(
  page: Page,
  baseURL: string,
  authorizedOrigin: string,
): Promise<void> {
  await establishCoreResult(page, baseURL);
  await expect(page.getByTestId('m55-free-to-paid-bridge')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('m55-paid-bridge-primary')).toBeVisible({ timeout: 30_000 });
  await assertPreviewNavigationStable(page, {
    label: 'core-free-result:setup',
    authorizedOrigin,
    expectedPathname: '/core',
  });
}

async function setupPremiumCheckoutPreview(
  page: Page,
  baseURL: string,
  authorizedOrigin: string,
): Promise<void> {
  await establishCheckoutPrep(page, baseURL);
  await expect(page.locator('[data-m55-paid-phase="checkout"]')).toBeVisible({ timeout: 30_000 });
  await assertPreviewNavigationStable(page, {
    label: 'premium-checkout:setup',
    authorizedOrigin,
    expectedPathname: '/dtr/lp',
  });
}

/**
 * THIN_ADAPTER_ONLY — browser extraction mirrors e2e/commercial-visual-quality.spec.ts
 * measurePage so checkMeasuredPage receives identical MeasuredPage snapshots.
 */
async function measurePreviewEvidencePage(
  page: Page,
  governedCase: CommercialVisualCase,
  viewportWidth: number,
  viewportHeight: number,
): Promise<MeasuredPage> {
  const scrollState = 'top' as const;
  return page.evaluate(
    ({
      caseId,
      route,
      scrollState,
      targets,
      overlaySelectors,
      groups,
      viewportWidth: vw,
      viewportHeight: vh,
    }) => {
      if (!(document.documentElement instanceof Element)) {
        throw new Error(
          `measurePreviewEvidencePage(${caseId}@${route}/${scrollState}): documentElement is not an Element at ${location.href}`,
        );
      }
      if (!(document.body instanceof Element)) {
        throw new Error(
          `measurePreviewEvidencePage(${caseId}@${route}/${scrollState}): document.body is not an Element at ${location.href}`,
        );
      }

      const styleOf = (node: Element): CSSStyleDeclaration => {
        if (!(node instanceof Element)) {
          throw new Error(
            `measurePreviewEvidencePage(${caseId}@${route}/${scrollState}): getComputedStyle called with non-Element`,
          );
        }
        return getComputedStyle(node);
      };

      const parseColor = (value: string): [number, number, number] | null => {
        const match = /rgba?\(([^)]+)\)/.exec(value);
        if (!match) return null;
        const parts = match[1].split(',').map((p) => Number.parseFloat(p.trim()));
        if (parts.length < 3 || parts.some((p) => Number.isNaN(p))) return null;
        const alpha = parts.length >= 4 ? parts[3] : 1;
        if (alpha === 0) return null;
        return [parts[0], parts[1], parts[2]];
      };

      const compositeOver = (
        fg: [number, number, number],
        bg: [number, number, number],
        alpha: number,
      ): [number, number, number] => [
        fg[0] * alpha + bg[0] * (1 - alpha),
        fg[1] * alpha + bg[1] * (1 - alpha),
        fg[2] * alpha + bg[2] * (1 - alpha),
      ];

      /** Walk ancestors compositing translucent layers onto an opaque base. */
      const effectiveBackground = (el: Element): [number, number, number] | null => {
        let node: Element | null = el;
        const stack: { color: [number, number, number]; alpha: number }[] = [];
        while (node instanceof Element) {
          const style = styleOf(node);
          const match = /rgba?\(([^)]+)\)/.exec(style.backgroundColor);
          if (match) {
            const parts = match[1].split(',').map((p) => Number.parseFloat(p.trim()));
            const alpha = parts.length >= 4 ? parts[3] : 1;
            if (alpha > 0) {
              stack.push({ color: [parts[0], parts[1], parts[2]], alpha });
              if (alpha >= 1) break;
            }
          }
          node = node.parentElement;
        }
        if (stack.length === 0) return [255, 255, 255];
        let base = stack[stack.length - 1].color;
        for (let i = stack.length - 2; i >= 0; i -= 1) {
          base = compositeOver(stack[i].color, base, stack[i].alpha);
        }
        return base;
      };

      const rectOf = (el: Element) => {
        const r = el.getBoundingClientRect();
        return {
          top: r.top,
          left: r.left,
          right: r.right,
          bottom: r.bottom,
          width: r.width,
          height: r.height,
        };
      };

      const CLIPPING_OVERFLOWS = new Set(['auto', 'scroll', 'hidden', 'clip']);

      /**
       * Effective paint box: raw layout rect intersected with the viewport and every
       * ancestor whose overflow establishes a clip (auto / scroll / hidden / clip).
       */
      const visibleRectOf = (el: Element): {
        top: number;
        left: number;
        right: number;
        bottom: number;
        width: number;
        height: number;
      } | null => {
        const raw = rectOf(el);
        let left = raw.left;
        let top = raw.top;
        let right = raw.right;
        let bottom = raw.bottom;

        left = Math.max(left, 0);
        top = Math.max(top, 0);
        right = Math.min(right, vw);
        bottom = Math.min(bottom, vh);

        let node = el.parentElement;
        while (node instanceof Element) {
          const style = styleOf(node);
          const clipsX = CLIPPING_OVERFLOWS.has(style.overflowX);
          const clipsY = CLIPPING_OVERFLOWS.has(style.overflowY);
          if (clipsX || clipsY) {
            const box = node.getBoundingClientRect();
            if (clipsX) {
              left = Math.max(left, box.left);
              right = Math.min(right, box.right);
            }
            if (clipsY) {
              top = Math.max(top, box.top);
              bottom = Math.min(bottom, box.bottom);
            }
          }
          node = node.parentElement;
        }

        const width = right - left;
        const height = bottom - top;
        if (width <= 0 || height <= 0) return null;
        return { left, top, right, bottom, width, height };
      };

      /**
       * Identify the nearest ancestor whose hidden overflow actually cuts the
       * element's box, and report it so a failure names the responsible owner.
       * `document.body` and the root element are excluded: their scroll box is
       * the page itself, which the document-level overflow rule already covers.
       */
      const clippingAncestorOf = (el: Element): string | null => {
        const own = el.getBoundingClientRect();
        let node = el.parentElement;
        while (node && node !== document.body && node !== document.documentElement) {
          const style = styleOf(node);
          const clipsX = style.overflowX === 'hidden' || style.overflowX === 'clip';
          const clipsY = style.overflowY === 'hidden' || style.overflowY === 'clip';
          if (clipsX || clipsY) {
            const box = node.getBoundingClientRect();
            const describe = (axis: string, amount: number) =>
              `${node!.tagName.toLowerCase()}.${node!.className || '(no class)'} clips ${axis} by ${amount.toFixed(1)}px`;
            if (clipsX && own.left < box.left - 1) return describe('left', box.left - own.left);
            if (clipsX && own.right > box.right + 1) return describe('right', own.right - box.right);
            if (clipsY && own.top < box.top - 1) return describe('top', box.top - own.top);
            if (clipsY && own.bottom > box.bottom + 1) return describe('bottom', own.bottom - box.bottom);
          }
          node = node.parentElement;
        }
        return null;
      };

      const focusIndicator = (el: Element): boolean | null => {
        if (!(el instanceof HTMLElement)) return null;
        // A disabled placeholder is not a focus target, so it has nothing to prove.
        if (el.matches(':disabled') || el.getAttribute('aria-disabled') === 'true') return null;
        const before = styleOf(el);
        const beforeSignature = `${before.outlineStyle}|${before.outlineWidth}|${before.boxShadow}`;
        el.focus();
        const after = styleOf(el);
        const afterSignature = `${after.outlineStyle}|${after.outlineWidth}|${after.boxShadow}`;
        el.blur();
        if (afterSignature !== beforeSignature) return true;
        // A permanently visible ring also satisfies the contract.
        return after.outlineStyle !== 'none' && Number.parseFloat(after.outlineWidth) > 0;
      };

      /** Widest ancestor box: the stage the reading column sits inside. */
      const widestAncestorWidth = (el: Element): number => {
        let widest = el.getBoundingClientRect().width;
        let node = el.parentElement;
        while (node && node !== document.documentElement) {
          widest = Math.max(widest, node.getBoundingClientRect().width);
          node = node.parentElement;
        }
        return widest;
      };

      const elements = targets.map((target) => {
        const el = document.querySelector(target.selector);
        if (!(el instanceof Element)) {
          return {
            selector: target.selector,
            role: target.role,
            present: false,
            rect: null,
            scrollWidth: null,
            scrollHeight: null,
            clientWidth: null,
            clientHeight: null,
            clippedByAncestor: null,
            foreground: null,
            background: null,
            fontSizePx: null,
            fontWeight: null,
            hasVisibleFocusIndicator: null,
            stageWidth: null,
            visibleRect: null,
          };
        }
        const style = styleOf(el);
        return {
          selector: target.selector,
          role: target.role,
          present: true,
          rect: rectOf(el),
          visibleRect: visibleRectOf(el),
          scrollWidth: el.scrollWidth,
          scrollHeight: el.scrollHeight,
          clientWidth: el.clientWidth,
          clientHeight: el.clientHeight,
          clippedByAncestor: clippingAncestorOf(el),
          foreground: parseColor(style.color),
          background: effectiveBackground(el),
          fontSizePx: Number.parseFloat(style.fontSize) || null,
          fontWeight: Number.parseInt(style.fontWeight, 10) || null,
          hasVisibleFocusIndicator: target.role === 'cta' ? focusIndicator(el) : null,
          stageWidth: target.role === 'desktop_content' ? widestAncestorWidth(el) : null,
        };
      });

      /*
       * `getComputedStyle` resolves `env()` to pixels, so the only honest proof
       * that a bottom-anchored control compensates the safe area is a matching
       * CSS declaration that references the variable. All app stylesheets are
       * same-origin, so their rules are readable.
       */
      const declaresBottomSafeArea = (el: Element): boolean => {
        const BOTTOM_PROPS = /(^|[^-])(bottom|inset|padding|padding-bottom|margin-bottom)\s*:/;
        const visit = (rules: CSSRuleList | undefined): boolean => {
          for (const rule of Array.from(rules ?? [])) {
            if (rule instanceof CSSMediaRule || rule instanceof CSSSupportsRule) {
              if (visit(rule.cssRules)) return true;
              continue;
            }
            if (!(rule instanceof CSSStyleRule)) continue;
            const text = rule.cssText;
            if (!text.includes('safe-area-inset-bottom')) continue;
            if (!BOTTOM_PROPS.test(text)) continue;
            // Compare against the bare selector so pseudo-classes do not block a match.
            const selectors = rule.selectorText
              .split(',')
              .map((s) => s.replace(/::?[a-zA-Z-]+(\([^)]*\))?/g, '').trim())
              .filter(Boolean);
            for (const candidate of selectors) {
              try {
                if (el.matches(candidate)) return true;
              } catch {
                /* unsupported selector syntax is not evidence either way */
              }
            }
          }
          return false;
        };
        for (const sheet of Array.from(document.styleSheets)) {
          let rules: CSSRuleList | undefined;
          try {
            rules = sheet.cssRules;
          } catch {
            continue;
          }
          if (visit(rules)) return true;
        }
        return false;
      };

      const overlays = overlaySelectors.map((selector) => {
        const el = document.querySelector(selector);
        if (!(el instanceof Element)) {
          return {
            selector,
            present: false,
            visible: false,
            position: null,
            rect: null,
            anchoredToBottom: false,
            safeAreaCompensated: false,
            visibleRect: null,
          };
        }
        const style = styleOf(el);
        const rect = rectOf(el);
        const visible =
          style.visibility !== 'hidden' &&
          style.display !== 'none' &&
          Number.parseFloat(style.opacity || '1') > 0.05 &&
          el.getAttribute('aria-hidden') !== 'true';
        const position = style.position as
          | 'fixed'
          | 'sticky'
          | 'static'
          | 'absolute'
          | 'relative';
        // Anchored to the bottom edge when it sits in the lower band of the viewport.
        const anchoredToBottom =
          (position === 'fixed' || position === 'sticky') && rect.bottom > vh - rect.height - 96;
        return {
          selector,
          present: true,
          visible,
          position,
          rect,
          visibleRect: visibleRectOf(el),
          anchoredToBottom,
          safeAreaCompensated: declaresBottomSafeArea(el),
        };
      });

      const coVisibleGroups = groups.map((group) => ({
        groupId: group.groupId,
        selectors: group.selectors,
        rects: group.selectors.map((selector) => {
          const el = document.querySelector(selector);
          return el instanceof Element ? rectOf(el) : null;
        }),
      }));

      const scrollContainers = [
        { label: 'html', node: document.documentElement, isPageLevel: true },
        { label: 'body', node: document.body, isPageLevel: true },
      ].map(({ label, node, isPageLevel }) => ({
        label,
        overflowX: styleOf(node).overflowX,
        scrollWidth: node.scrollWidth,
        clientWidth: node.clientWidth,
        isPageLevel,
      }));

      // Any element that establishes its own horizontal scrollport counts too.
      for (const node of Array.from(document.querySelectorAll('*'))) {
        if (!(node instanceof Element)) continue;
        const style = styleOf(node);
        if (style.overflowX !== 'auto' && style.overflowX !== 'scroll') continue;
        if (node.scrollWidth <= node.clientWidth + 1) continue;
        scrollContainers.push({
          label: `${node.tagName.toLowerCase()}.${String(node.className).slice(0, 60) || '(no class)'}`,
          overflowX: style.overflowX,
          scrollWidth: node.scrollWidth,
          clientWidth: node.clientWidth,
          isPageLevel: false,
        });
      }

      /*
       * Collect elements outside the viewport. Zero-size, hidden and decorative
       * `aria-hidden` layers are skipped: only content boxes matter, and a
       * deliberately over-scaled background image is not a commercial defect.
       * Prefer the widest offender first so document-overflow failures name the
       * actual root cause (e.g. an unconstrained hero image).
       */
      const overflowingCandidates: { description: string; left: number; right: number; span: number }[] =
        [];
      for (const node of Array.from(document.querySelectorAll('*'))) {
        if (!(node instanceof Element)) continue;
        const style = styleOf(node);
        if (style.visibility === 'hidden' || style.display === 'none') continue;
        if (node.closest('[aria-hidden="true"]')) continue;
        if (node.closest('[data-nextjs-dev-tools-button], nextjs-portal')) continue;
        if (node.closest('[data-m55-clean-capture-hidden]')) continue;
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        if (rect.right <= vw + 1 && rect.left >= -1) continue;
        const id = node.getAttribute('data-testid') || node.id || '';
        const description = `${node.tagName.toLowerCase()}${id ? `#${id}` : ''}.${String(node.className).slice(0, 60) || '(no class)'}`;
        overflowingCandidates.push({
          description,
          left: rect.left,
          right: rect.right,
          span: rect.right - rect.left,
        });
      }
      overflowingCandidates.sort((a, b) => b.span - a.span);
      const overflowingElements: { description: string; left: number; right: number }[] = [];
      for (const candidate of overflowingCandidates) {
        if (overflowingElements.some((e) => candidate.description.startsWith(e.description))) continue;
        overflowingElements.push({
          description: candidate.description,
          left: candidate.left,
          right: candidate.right,
        });
        if (overflowingElements.length >= 10) break;
      }

      return {
        caseId,
        route,
        scrollState,
        viewportWidth: vw,
        viewportHeight: vh,
        documentScrollWidth: document.documentElement.scrollWidth,
        documentClientWidth: document.documentElement.clientWidth,
        scrollContainers,
        overflowingElements,
        elements,
        overlays,
        coVisibleGroups,
      };
    },
    {
      caseId: governedCase.caseId,
      route: governedCase.route,
      scrollState,
      targets: governedCase.protectedTargets.map((t) => ({ selector: t.selector, role: t.role })),
      overlaySelectors: [...governedCase.overlaySelectors],
      groups: governedCase.mobileCoVisibleGroups.map((g) => ({
        groupId: g.groupId,
        selectors: [...g.selectors],
      })),
      viewportWidth,
      viewportHeight,
    },
  );
}

async function runPreviewEvidenceView(input: {
  browser: Browser;
  view: (typeof PREVIEW_EVIDENCE_VIEWS)[number];
  authority: PreviewEvidenceAuthority;
  diagnostics: PreviewBuildDiagnostics;
}): Promise<void> {
  const governedCase = requireGovernedCase(input.view.caseId);
  const baseURL = input.authority.authorizedOrigin;
  const context = await input.browser.newContext({
    viewport: { width: input.view.width, height: input.view.height },
  });
  const page = await context.newPage();
  let navigationGuard: PreviewMainFrameNavigationGuard | null = null;

  try {
    navigationGuard = await installPreviewMainFrameNavigationGuard(page, input.authority);

    if (input.view.caseId === 'core-free-result') {
      await setupCoreFreeResultPreview(page, baseURL, input.authority.authorizedOrigin);
    } else {
      await setupPremiumCheckoutPreview(page, baseURL, input.authority.authorizedOrigin);
    }
    navigationGuard.assertNoBlockedNavigation(`preview evidence — ${input.view.viewId}:post-fixture`);

    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(250);

    const measured = await measurePreviewEvidencePage(
      page,
      governedCase,
      input.view.width,
      input.view.height,
    );
    const checkerFailures = checkMeasuredPage(measured, governedCase);
    const contrastSummary = buildContrastSummary(
      governedCase,
      measured,
      { width: input.view.width, height: input.view.height },
      checkerFailures,
    );

    const contrastFailures = checkerFailures.filter((f) => f.rule === 'contrast_below_minimum');
    expect(
      contrastFailures,
      `preview contrast failures\n${contrastFailures.map((f) => `${f.selector}: ${f.detail}`).join('\n')}`,
    ).toEqual([]);

    await assertPreviewNavigationStable(page, {
      label: `preview evidence — ${input.view.viewId}:pre-screenshot`,
      authorizedOrigin: input.authority.authorizedOrigin,
    });

    const screenshotBuffer = await page.screenshot({ fullPage: false });

    await assertPreviewNavigationStable(page, {
      label: `preview evidence — ${input.view.viewId}:pre-final-evidence`,
      authorizedOrigin: input.authority.authorizedOrigin,
    });
    navigationGuard.assertNoBlockedNavigation(`preview evidence — ${input.view.viewId}:pre-final-evidence`);

    fs.mkdirSync(PREVIEW_EVIDENCE_OUTPUT_ROOT, { recursive: true });
    const screenshotPath = path.join(PREVIEW_EVIDENCE_OUTPUT_ROOT, `${input.view.viewId}.png`);
    fs.writeFileSync(screenshotPath, screenshotBuffer);

    const metadata = buildPreviewEvidenceRecordMetadata({
      authority: input.authority,
      diagnostics: input.diagnostics,
      governedCaseId: governedCase.caseId,
      route: governedCase.route,
      viewId: input.view.viewId,
      viewport: { width: input.view.width, height: input.view.height },
      screenshotPath,
    });

    emitPreviewEvidenceEvent({
      ...metadata,
      machineContrastSummary: contrastSummary,
      humanVisualApproved: false,
    });
  } finally {
    if (navigationGuard) {
      await navigationGuard.uninstall();
    }
    await context.close();
  }
}

test.describe.configure({ mode: 'serial', timeout: 300_000 });

test.describe('P1B Preview visual evidence harness', () => {
  test('default-inactive contract — dormant unless M55_PREVIEW_EVIDENCE=1', () => {
    if (PREVIEW_EVIDENCE_ACTIVE) {
      test.skip(true, 'active mode uses preview evidence view tests below');
    }
  });

  test.describe('active preview evidence views', () => {
    test.skip(!PREVIEW_EVIDENCE_ACTIVE, 'requires M55_PREVIEW_EVIDENCE=1');

    let authority: PreviewEvidenceAuthority;
    let diagnostics: PreviewBuildDiagnostics;

    test.beforeAll(async () => {
      authority = loadPreviewEvidenceAuthority();
      diagnostics = await preflightPreviewBuildIdentity(authority);
    });

    for (const view of PREVIEW_EVIDENCE_VIEWS) {
      test(`preview evidence — ${view.viewId}`, async ({ browser }) => {
        await runPreviewEvidenceView({ browser, view, authority, diagnostics });
      });
    }
  });
});
