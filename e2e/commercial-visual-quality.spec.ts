/**
 * Commercial responsive quality gate.
 *
 * The browser only measures geometry, computed colour and clipping; every
 * judgement is delegated to the pure checker so the same rules that reject the
 * intentionally broken fixtures also guard the real routes.
 *
 * Run: npx playwright test e2e/commercial-visual-quality.spec.ts
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import {
  COMMERCIAL_VIEWPORTS,
  COMMERCIAL_VIEWPORT_HEIGHTS,
  COMMERCIAL_VISUAL_CASES,
  findingCoverageGaps,
  type CommercialVisualCase,
  type CommercialViewport,
} from '../lib/m55/commercialUx/visualQuality/commercialVisualQualityContract';
import {
  checkMeasuredPage,
  contrastRatio,
  requiredContrastFor,
  type MeasuredPage,
  type MeasuredScrollState,
} from '../lib/m55/commercialUx/visualQuality/commercialVisualQualityChecks';
import { establishCheckoutPrep } from '../lib/m55/commercialUx/qualityControl/m55QualityFixtures';
import {
  assertLocalNavigationStable,
  assertOverlayAbsence,
  prepareCleanCapturePage,
  requireCleanCaptureEnvironment,
} from './helpers/cleanCaptureEnvironment';

const VISUAL_QUALITY_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';

/** Real free answer identifiers, so /core reaches the RESULT phase. */
const COMPLETE_FREE = {
  'free.start_style': 'free.start_style.map_first',
  'free.decision_style': 'free.decision_style.sort_first',
  'free.recovery_style': 'free.recovery_style.pause_short',
  'free.distance_style': 'free.distance_style.close_careful',
  'free.change_style': 'free.change_style.observe_first',
  'free.primary_theme': 'free.primary_theme.report_preview',
} as const;

async function seedFreeResult(context: BrowserContext) {
  await context.addInitScript(
    ({ free }) => {
      const id = 'playwright-visual-quality';
      localStorage.setItem('m55_device_id_v1', id);
      localStorage.setItem(
        `m55_profile_v1_${id}`,
        JSON.stringify({ nickname: '試験', birthDate: '1983-02-28' }),
      );
      const keys = Object.keys(free).sort();
      const payload = keys.map((k) => `${k}=${(free as Record<string, string>)[k]}`).join('&');
      sessionStorage.setItem(
        'm55_self_funnel_v1',
        JSON.stringify({
          schemaVersion: 1,
          draftFreeAnswers: free,
          committedFreeAnswers: free,
          freeResultFingerprint: `ffp1|試験|1983-02-28|${payload}`,
          questionIndex: 5,
          generationCount: 1,
        }),
      );
      sessionStorage.setItem('m55_free_answers_v1', JSON.stringify(free));
    },
    { free: COMPLETE_FREE },
  );
}

/**
 * Collect one measurement snapshot. Everything returned is plain JSON so the
 * pure checker can be replayed outside a browser.
 */
async function measurePage(
  page: Page,
  governedCase: CommercialVisualCase,
  viewportWidth: number,
  viewportHeight: number,
  scrollState: MeasuredScrollState,
): Promise<MeasuredPage> {
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
          `measurePage(${caseId}@${route}/${scrollState}): documentElement is not an Element at ${location.href}`,
        );
      }
      if (!(document.body instanceof Element)) {
        throw new Error(
          `measurePage(${caseId}@${route}/${scrollState}): document.body is not an Element at ${location.href}`,
        );
      }

      const styleOf = (node: Element): CSSStyleDeclaration => {
        if (!(node instanceof Element)) {
          throw new Error(
            `measurePage(${caseId}@${route}/${scrollState}): getComputedStyle called with non-Element`,
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

/** Premium states are only reachable through the real /core bridge hand-off. */
async function enterPremiumFromCore(page: Page) {
  await page.goto('/core', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('m55-core-essence')).toHaveAttribute('data-m55-ux-phase', 'RESULT', {
    timeout: 30_000,
  });
  const bridgeCta = page.getByTestId('m55-paid-bridge-primary');
  await bridgeCta.scrollIntoViewIfNeeded();
  const bridgeHref = await bridgeCta.getAttribute('href');
  await bridgeCta.click();
  try {
    await expect(page).toHaveURL(/\/dtr\/lp/, { timeout: 20_000 });
  } catch {
    // Client-side navigation can be dropped while the dev server recompiles.
    // Follow the bridge's own href instead of inventing a destination.
    if (!bridgeHref) throw new Error('premium bridge CTA has no href');
    await page.goto(bridgeHref, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  }
  await expect(page.getByTestId('m55-paid-questionnaire-active')).toBeVisible({ timeout: 30_000 });
}

/**
 * Scroll far enough for the floating rail to reveal itself. The shell may host
 * its own scrollport, so the deepest scrollable container is scrolled too.
 */
async function engageFloatingRail(page: Page) {
  await page.evaluate(() => {
    if (!(document.documentElement instanceof Element)) return;
    const scrollers: Element[] = [document.documentElement];
    for (const node of Array.from(document.querySelectorAll('*'))) {
      if (!(node instanceof Element)) continue;
      const style = getComputedStyle(node);
      const scrolls = style.overflowY === 'auto' || style.overflowY === 'scroll';
      if (scrolls && node.scrollHeight > node.clientHeight + 8) scrollers.push(node);
    }
    for (const node of scrollers) {
      node.scrollTop = Math.min(node.scrollHeight - node.clientHeight, node.clientHeight * 2);
    }
    window.scrollTo({ top: Math.min(document.documentElement.scrollHeight, window.innerHeight * 2) });
  });
  await page.waitForTimeout(600);
}

/** Drive the page into the governed state before measuring. */
async function applySetup(page: Page, governedCase: CommercialVisualCase) {
  if (governedCase.setup === 'none') {
    await page.goto(governedCase.route, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  }

  if (governedCase.setup === 'core_free_result') {
    await page.goto('/core', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.getByTestId('m55-core-essence')).toHaveAttribute('data-m55-ux-phase', 'RESULT', {
      timeout: 30_000,
    });
    await page.evaluate(() => {
      const headline = document.querySelector('[data-testid="m55-premium-bridge-headline"]');
      const cta = document.querySelector('[data-testid="m55-paid-bridge-primary"]');
      const header =
        document.querySelector('[data-m55-public-shell] > header') ||
        document.querySelector('header');
      const rail = document.querySelector('[data-testid="m55-scroll-to-top"]');
      const main = document.querySelector('main');
      const target = headline instanceof Element ? headline : document.querySelector('#core-paid');
      if (!(target instanceof Element)) return;

      const scrollByDelta = (delta: number) => {
        if (!delta) return;
        // ShellLayout scrolls inside <main>; PublicShell uses the document.
        if (
          main instanceof HTMLElement &&
          main.scrollHeight > main.clientHeight + 8
        ) {
          main.scrollTop += delta;
        } else {
          window.scrollBy(0, delta);
        }
      };

      target.scrollIntoView({ block: 'start' });
      const headerBottom =
        header instanceof Element ? header.getBoundingClientRect().bottom : 64;
      let rect = target.getBoundingClientRect();
      scrollByDelta(rect.top - (headerBottom + 12));

      if (cta instanceof Element && rail instanceof Element) {
        const ctaRect = cta.getBoundingClientRect();
        const railRect = rail.getBoundingClientRect();
        const railVisible =
          railRect.width > 0 &&
          railRect.height > 0 &&
          getComputedStyle(rail).visibility !== 'hidden' &&
          Number.parseFloat(getComputedStyle(rail).opacity || '1') > 0.05;
        if (railVisible) {
          const overlapY =
            Math.min(ctaRect.bottom, railRect.bottom) - Math.max(ctaRect.top, railRect.top);
          const overlapX =
            Math.min(ctaRect.right, railRect.right) - Math.max(ctaRect.left, railRect.left);
          if (overlapY > 0 && overlapX > 0) {
            scrollByDelta(overlapY + 12);
          }
        }
      }
    });
  }

  if (governedCase.setup === 'premium_questionnaire') {
    await enterPremiumFromCore(page);
  }

  if (governedCase.setup === 'premium_plans') {
    await enterPremiumFromCore(page);
    for (let i = 0; i < 6; i += 1) {
      await page.locator('[role="radio"]').first().click();
      const label = i === 5 ? '回答を確認する' : '次へ';
      await page.getByRole('button', { name: label }).click();
    }
    await expect(page.locator('[data-m55-paid-phase="complete"]')).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'プランを選ぶ' }).click();
    await expect(page.getByTestId('m55-dtr-plan-selection')).toBeVisible({ timeout: 30_000 });
    // Keep the plan headline below the fixed public header before geometry.
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="m55-dtr-plan-selection"]');
      const header =
        document.querySelector('[data-m55-public-shell] > header') ||
        document.querySelector('header');
      const main = document.querySelector('main');
      if (!(el instanceof Element)) return;
      el.scrollIntoView({ block: 'start' });
      const headerBottom =
        header instanceof Element ? header.getBoundingClientRect().bottom : 64;
      const delta = el.getBoundingClientRect().top - (headerBottom + 8);
      if (!delta) return;
      if (main instanceof HTMLElement && main.scrollHeight > main.clientHeight + 8) {
        main.scrollTop += delta;
      } else {
        window.scrollBy(0, delta);
      }
    });
  }

  if (governedCase.setup === 'premium_checkout') {
    await establishCheckoutPrep(page, VISUAL_QUALITY_BASE_URL);
  }

  await expect(page.locator(governedCase.readySelector).first()).toBeVisible({ timeout: 30_000 });
  // Settle webfont metrics and lazy layout before measuring geometry.
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(250);
}

// Default mode: each governed case must be measured even when another fails.
test.describe.configure({ mode: 'default', timeout: 240_000 });

test.beforeAll(() => {
  requireCleanCaptureEnvironment('commercial-visual-quality');
});

test('every reviewed commercial finding is owned by a governed case', () => {
  expect(findingCoverageGaps(), 'reviewed findings without a governed case').toEqual([]);
});

type PaintedTextMeasurement = {
  text: string;
  color: string;
  foreground: [number, number, number];
  background: [number, number, number];
  fontSizePx: number;
  fontWeight: number;
  opacity: number;
  ancestorOpacities: number[];
  hasBackgroundImage: boolean;
};

async function openDrawerSummaryPanel(page: Page) {
  const trigger = page.locator('[aria-controls="drawer-hub-body-summary"]');
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.locator('#drawer-hub-body-summary')).toBeVisible();
  await expect(page.getByTestId('m55-drawer-summary-panel')).toBeVisible();
}

async function measurePaintedText(page: Page, selector: string): Promise<PaintedTextMeasurement[]> {
  return page.locator(selector).evaluateAll((elements) => {
    type Rgba = { r: number; g: number; b: number; a: number };
    const parse = (value: string): Rgba | null => {
      const match = /rgba?\(([^)]+)\)/.exec(value);
      if (!match) return null;
      const parts = match[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      if (parts.length < 3 || parts.some(Number.isNaN)) return null;
      return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
    };
    const over = (foreground: Rgba, background: Rgba): Rgba => ({
      r: foreground.r * foreground.a + background.r * (1 - foreground.a),
      g: foreground.g * foreground.a + background.g * (1 - foreground.a),
      b: foreground.b * foreground.a + background.b * (1 - foreground.a),
      a: foreground.a + background.a * (1 - foreground.a),
    });

    return elements.map((element) => {
      const style = getComputedStyle(element);
      const layers: Rgba[] = [];
      const ancestorOpacities: number[] = [];
      let hasBackgroundImage = false;
      for (let node: Element | null = element; node; node = node.parentElement) {
        const nodeStyle = getComputedStyle(node);
        const background = parse(nodeStyle.backgroundColor);
        if (background && background.a > 0) layers.push(background);
        const opacity = Number.parseFloat(nodeStyle.opacity || '1');
        ancestorOpacities.push(opacity);
        if (nodeStyle.backgroundImage !== 'none') hasBackgroundImage = true;
      }
      let background: Rgba = { r: 255, g: 255, b: 255, a: 1 };
      for (const layer of layers.reverse()) background = over(layer, background);
      const rawForeground = parse(style.color);
      if (!rawForeground) throw new Error(`unparseable foreground: ${style.color}`);
      const painted = over(rawForeground, background);
      return {
        text: element.textContent?.trim() ?? '',
        color: style.color,
        foreground: [painted.r, painted.g, painted.b] as [number, number, number],
        background: [background.r, background.g, background.b] as [number, number, number],
        fontSizePx: Number.parseFloat(style.fontSize),
        fontWeight: Number.parseInt(style.fontWeight, 10) || 400,
        opacity: Number.parseFloat(style.opacity || '1'),
        ancestorOpacities,
        hasBackgroundImage,
      };
    });
  });
}

test('paid DTR readability — painted contrast and shared-style isolation', async ({ browser }) => {
  const viewports = [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 1280, height: 900 },
  ] as const;
  const targets = [
    { role: 'premium overline', selector: '[data-testid="m55-premium-overline"]', minWeight: 400 },
    { role: 'manual slot label', selector: '[data-testid="m55-personal-manual"] li span', minWeight: 400 },
    { role: 'manual slot body', selector: '[data-testid="m55-personal-manual"] li p', minWeight: 400 },
    { role: 'premium takeaway', selector: '[data-testid="m55-premium-takeaway"]', minWeight: 400 },
    { role: 'privacy note', selector: '[data-premium-share-persistence]', minWeight: 400 },
    { role: 'share guidance', selector: '[data-testid="m55-premium-share-guidance"]', minWeight: 400 },
    { role: 'next-action label', selector: '[data-testid="m55-premium-next-action"] span', minWeight: 400 },
    { role: 'next-action body', selector: '[data-testid="m55-premium-next-action"] p:not([class*="mark"])', minWeight: 400 },
    { role: 'next-action note', selector: '[data-testid="m55-premium-next-action"] p[class*="mark"]', minWeight: 400 },
    { role: 'share action', selector: '[data-testid="m55-narrative-share-actions"] button', minWeight: 650 },
    { role: 'report meta heading', selector: '[aria-label="プレミアムレポートの情報"] > p:first-child', minWeight: 600 },
    { role: 'report meta label', selector: '[aria-label="プレミアムレポートの情報"] [role="listitem"] > span:first-child', minWeight: 600 },
    { role: 'report meta note', selector: '[aria-label="プレミアムレポートの情報"] > p[class*="reportMetaNote"]', minWeight: 400 },
    { role: 'headline control', selector: '#premium-narrative-close-title', minWeight: 700 },
    { role: 'report meta lead control', selector: '[aria-label="プレミアムレポートの情報"] > p:nth-child(2)', minWeight: 400 },
    { role: 'report meta value control', selector: '[aria-label="プレミアムレポートの情報"] [role="listitem"] > span:last-child', minWeight: 400 },
  ] as const;

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await prepareCleanCapturePage(page);
    await page.goto(`${VISUAL_QUALITY_BASE_URL}/dev/dtr-drawer-preview?projection=1&withConsult=1`);
    await openDrawerSummaryPanel(page);
    const premiumClose = page.getByTestId('m55-premium-narrative-close');
    await expect(premiumClose).toBeVisible();
    const shareCard = premiumClose.getByTestId('m55-narrative-share-card');
    await expect(
      premiumClose.locator(':scope > h3').filter({ hasText: /^今のあなたへ残しておく一文$/ }),
      'reader-local duplicate heading',
    ).toHaveCount(0);
    await expect(
      shareCard.getByRole('heading', { level: 3, name: '今のあなたへ残しておく一文' }),
      'canonical public share headline',
    ).toHaveCount(1);
    await expect(
      shareCard.locator(':scope > p').filter({ hasText: /^M55 プレミアムレポートから$/ }),
      'share-card provenance rendered exactly once',
    ).toHaveCount(1);
    for (const target of targets) {
      const measurements = await measurePaintedText(page, target.selector);
      if (target.role === 'premium takeaway' && measurements.length === 0) {
        await expect(page.getByTestId('m55-personal-hidden-spec')).toBeVisible();
        continue;
      }
      expect(measurements.length, `${target.role}@${viewport.width} rendered`).toBeGreaterThan(0);
      for (const measurement of measurements) {
        const required = requiredContrastFor(measurement.fontSizePx, measurement.fontWeight);
        expect(measurement.hasBackgroundImage, `${target.role}: unresolved background`).toBe(false);
        expect(contrastRatio(measurement.foreground, measurement.background), target.role).toBeGreaterThanOrEqual(required);
        expect(measurement.fontWeight, `${target.role}: font weight`).toBeGreaterThanOrEqual(target.minWeight);
        expect(measurement.opacity, `${target.role}: element opacity`).toBe(1);
        expect(measurement.ancestorOpacities.every((opacity) => opacity === 1), `${target.role}: ancestor opacity`).toBe(true);
      }
    }
    if (viewport.width === 390) {
      const chapterTrigger = page.locator('[aria-controls="drawer-hub-body-chapter-1"]');
      await chapterTrigger.click();
      await expect(page.locator('#drawer-hub-body-chapter-1')).toBeVisible();
      await expect(page.getByTestId('m55-premium-narrative-close')).toHaveCount(0);
      await openDrawerSummaryPanel(page);
      const fabBox = await page.getByRole('button', { name: 'プレミアムレポートの入口へ戻る' }).boundingBox();
      expect(fabBox).not.toBeNull();
      if (fabBox) {
        expect(fabBox.width).toBeGreaterThanOrEqual(44);
        expect(fabBox.height).toBeGreaterThanOrEqual(44);
        expect(fabBox.x + fabBox.width / 2).toBeGreaterThan(viewport.width * 0.55);
      }
      const axe = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
      const targeted = axe.violations.flatMap((violation) => violation.nodes).filter((node) =>
        node.target.some((selector) =>
          /NarrativeShare_(optionLabel|body|mark|chooserLead|secondary)|reportMeta(Heading|ItemLabel|Note)/.test(String(selector)),
        ),
      );
      expect(targeted, 'targeted Axe color-contrast violations').toEqual([]);
    }
    await context.close();
  }

  const defaultContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const defaultPage = await defaultContext.newPage();
  await prepareCleanCapturePage(defaultPage);
  await defaultPage.goto(`${VISUAL_QUALITY_BASE_URL}/dev/dtr-drawer-preview`);
  await openDrawerSummaryPanel(defaultPage);
  await expect(defaultPage.getByTestId('m55-premium-narrative-close')).toBeVisible();
  await expect(defaultPage.locator('[data-testid="m55-personal-manual"] li')).toHaveCount(0);
  await expect(defaultPage.getByTestId('m55-premium-next-action')).toHaveCount(0);
  const sharedProvenance = await measurePaintedText(defaultPage, '[data-testid="m55-narrative-share-card"] p[class*="cta"]');
  expect(sharedProvenance).toHaveLength(1);
  expect(sharedProvenance[0].color).toBe('rgba(255, 250, 241, 0.92)');
  expect(sharedProvenance[0].fontSizePx).toBeCloseTo(14.08, 2);
  expect(sharedProvenance[0].fontWeight).toBe(600);
  expect(sharedProvenance[0].opacity).toBe(1);
  await defaultContext.close();

  const freeContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await seedFreeResult(freeContext);
  const freePage = await freeContext.newPage();
  await prepareCleanCapturePage(freePage);
  await freePage.goto(`${VISUAL_QUALITY_BASE_URL}/core`);
  await expect(freePage.getByTestId('m55-core-essence')).toHaveAttribute('data-m55-ux-phase', 'RESULT');
  const freeChooser = freePage.getByTestId('m55-free-result-share');
  await expect(freeChooser).toBeVisible();
  await expect(freeChooser).not.toHaveClass(/premiumClose/);
  const freeLead = await measurePaintedText(
    freePage,
    '[data-testid="m55-free-result-share"] > p[class*="chooserLead"]',
  );
  expect(freeLead).toHaveLength(1);
  expect(freeLead[0].color).toBe('rgba(45, 40, 70, 0.82)');
  expect(freeLead[0].background).toEqual([254.04, 253.72, 253.4]);
  expect(freeLead[0].fontSizePx).toBeCloseTo(15.2, 2);
  expect(freeLead[0].fontWeight).toBe(400);
  expect(freeLead[0].opacity).toBe(1);
  expect(freeLead[0].ancestorOpacities).toEqual([1, 1, 1, 0, 1, 1, 1, 1, 1]);
  await freeContext.close();
});

for (const governedCase of COMMERCIAL_VISUAL_CASES) {
  test(`commercial visual quality — ${governedCase.caseId}`, async ({ browser }) => {
    const failures: string[] = [];

    for (const width of COMMERCIAL_VIEWPORTS) {
      const height = COMMERCIAL_VIEWPORT_HEIGHTS[width as CommercialViewport];
      /*
       * A fresh context per viewport: the Premium funnel advances client state as
       * it is driven, so a reused session would land a later viewport in a
       * different phase than the one under measurement. HOME / Pricing also use
       * isolated contexts so one Clerk/navigation event cannot poison later cases.
       */
      const context = await browser.newContext({ viewport: { width, height } });
      if (governedCase.setup !== 'none') await seedFreeResult(context);
      const page = await context.newPage();
      await prepareCleanCapturePage(page);
      await applySetup(page, governedCase);
      await assertLocalNavigationStable(page, {
        label: `${governedCase.caseId}@${width}:setup`,
        expectedPathname: governedCase.route,
      });

      /*
       * Measure at rest and again mid-scroll. The floating rail (sticky Premium
       * CTA, back-to-top control) only materialises once the reader scrolls, so
       * the rail collision rules are meaningless without the engaged state.
       */
      for (const scrollState of ['top', 'engaged'] as const) {
        if (scrollState === 'engaged') await engageFloatingRail(page);
        // Order: readiness settled → geometry measure/check → overlay absence.
        const measured = await measurePage(page, governedCase, width, height, scrollState);
        for (const failure of checkMeasuredPage(measured, governedCase)) {
          failures.push(
            `${failure.caseId}@${failure.viewportWidth}/${failure.scrollState} ${failure.rule} ${failure.selector}: ${failure.detail}`,
          );
        }
        await assertOverlayAbsence(page, `${governedCase.caseId}@${width}/${scrollState}`);
      }

      await context.close();
    }

    expect(failures, `commercial visual quality failures\n${failures.join('\n')}`).toEqual([]);
  });
}
