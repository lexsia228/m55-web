/**
 * HOME Hero continuous responsive closure gate.
 *
 * Fresh-load and resize sweeps across 320–1440 (step 16) plus breakpoint
 * neighborhoods, at multiple heights. Geometry only — no baseline updates.
 *
 * Run:
 *   M55_E2E_CLEAN_CAPTURE=1 npm run test:e2e:home-continuous-responsive
 */
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  assertOverlayAbsence,
  prepareCleanCapturePage,
  requireCleanCaptureEnvironment,
} from './helpers/cleanCaptureEnvironment';

const WIDTH_STEP = 16;
const WIDTH_MIN = 320;
const WIDTH_MAX = 1440;
const BREAKPOINT_NEIGHBORHOODS = [
  767, 768, 769, 895, 896, 897, 1023, 1024, 1025, 1279, 1280, 1281,
] as const;
const HEIGHTS = [568, 667, 736, 812, 844, 900] as const;
const CONTACT_SHEET_HEIGHT = 812;
const CONTACT_SHEET_DIR = join('e2e', 'screenshots', '_tmp-home-continuous-responsive');

const REPRESENTATIVE_WIDTHS = [320, 360, 390, 430, 768, 1024, 1280, 1440] as const;

function buildGovernedWidths(): number[] {
  const set = new Set<number>();
  for (let w = WIDTH_MIN; w <= WIDTH_MAX; w += WIDTH_STEP) set.add(w);
  for (const w of BREAKPOINT_NEIGHBORHOODS) set.add(w);
  return [...set].sort((a, b) => a - b);
}

const GOVERNED_WIDTHS = buildGovernedWidths();

type Rect = { top: number; left: number; right: number; bottom: number; width: number; height: number };

type ClipDiag = {
  ok: boolean;
  failures: string[];
  viewport: { width: number; height: number };
  failingSelector?: string;
  elementRect?: Rect;
  clippingAncestor?: string;
  ancestorRect?: Rect;
  ancestorComputed?: Record<string, string>;
};

async function assertHomeHeroContract(page: Page, width: number, height: number): Promise<ClipDiag> {
  return page.evaluate(
    ({ width: vw, height: vh }) => {
      const failures: string[] = [];
      const rectOf = (el: Element): Rect => {
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

      const hero = document.querySelector('[data-testid="m55-home-hero"]');
      const title = document.querySelector('[data-testid="m55-home-hero-title"]');
      const support = document.querySelector('[data-testid="m55-home-hero-support"]');
      const trust = document.querySelector('[data-testid="m55-home-hero-trust"]');
      const cta = document.querySelector('[data-m55-hero-cta="true"]');
      const next = document.querySelector('[data-testid="m55-home-lower"]');

      if (!hero || !title || !support || !trust || !cta || !next) {
        return {
          ok: false,
          failures: ['missing required HOME Hero selectors'],
          viewport: { width: vw, height: vh },
        };
      }

      const scrollWidth = document.documentElement.scrollWidth;
      if (scrollWidth > window.innerWidth + 1) {
        failures.push(`horizontal overflow: scrollWidth=${scrollWidth} innerWidth=${window.innerWidth}`);
      }

      const heroRect = rectOf(hero);
      const titleRect = rectOf(title);
      const supportRect = rectOf(support);
      const trustRect = rectOf(trust);
      const ctaRect = rectOf(cta);
      const nextRect = rectOf(next);

      const eps = 1.5;
      const fullyInside = (inner: Rect, outer: Rect, label: string) => {
        if (
          inner.top < outer.top - eps ||
          inner.left < outer.left - eps ||
          inner.right > outer.right + eps ||
          inner.bottom > outer.bottom + eps
        ) {
          failures.push(
            `${label} not fully inside Hero (inner=${JSON.stringify(inner)} hero=${JSON.stringify(outer)})`,
          );
        }
      };

      fullyInside(titleRect, heroRect, 'headline');
      fullyInside(ctaRect, heroRect, 'CTA');
      fullyInside(supportRect, heroRect, 'support-copy');
      fullyInside(trustRect, heroRect, 'login-free label');

      if (ctaRect.height < 44 - eps) {
        failures.push(`CTA height ${ctaRect.height} < 44`);
      }

      const contentBottom = Math.max(titleRect.bottom, ctaRect.bottom, supportRect.bottom, trustRect.bottom);
      if (contentBottom > heroRect.bottom + eps) {
        failures.push(`Hero content bottom ${contentBottom} > Hero bottom ${heroRect.bottom}`);
      }
      if (nextRect.top + eps < contentBottom) {
        failures.push(`following section top ${nextRect.top} < Hero content bottom ${contentBottom}`);
      }
      if (nextRect.top + eps < heroRect.bottom && heroRect.bottom - nextRect.top > 2) {
        /* allow shared border; reject true negative overlap of content */
      }
      if (nextRect.top < contentBottom - eps) {
        failures.push(`negative overlap: next.top=${nextRect.top} contentBottom=${contentBottom}`);
      }

      const opacityOf = (el: Element) => Number.parseFloat(getComputedStyle(el).opacity || '1');
      for (const [label, el] of [
        ['headline', title],
        ['support', support],
        ['trust', trust],
        ['cta', cta],
      ] as const) {
        if (opacityOf(el) <= 0.01 || (el as HTMLElement).offsetParent === null && getComputedStyle(el).position !== 'fixed') {
          const vis = getComputedStyle(el).visibility;
          if (vis === 'hidden' || opacityOf(el) <= 0.01) {
            failures.push(`${label} not visible (opacity/visibility)`);
          }
        }
        if ((el.textContent || '').trim().length === 0) {
          failures.push(`${label} empty text`);
        }
      }

      const findClippingAncestor = (el: Element): { selector: string; rect: Rect; computed: Record<string, string> } | null => {
        const target = rectOf(el);
        let node: Element | null = el.parentElement;
        while (node && node !== document.documentElement) {
          const style = getComputedStyle(node);
          const overflowY = style.overflowY;
          const overflow = style.overflow;
          const clips =
            overflowY === 'hidden' ||
            overflowY === 'clip' ||
            overflow === 'hidden' ||
            overflow === 'clip';
          if (clips) {
            const box = rectOf(node);
            if (target.bottom > box.bottom + eps || target.top < box.top - eps) {
              const tag = node.tagName.toLowerCase();
              const testid = node.getAttribute('data-testid');
              const cls = typeof node.className === 'string' ? node.className.split(/\s+/).slice(0, 2).join('.') : '';
              return {
                selector: testid ? `[data-testid="${testid}"]` : `${tag}${cls ? '.' + cls : ''}`,
                rect: box,
                computed: {
                  width: style.width,
                  height: style.height,
                  minHeight: style.minHeight,
                  maxHeight: style.maxHeight,
                  overflow: style.overflow,
                  overflowY: style.overflowY,
                  position: style.position,
                  display: style.display,
                  alignItems: style.alignItems,
                  justifyContent: style.justifyContent,
                  transform: style.transform,
                },
              };
            }
          }
          node = node.parentElement;
        }
        return null;
      };

      let clippingAncestor: ClipDiag['clippingAncestor'];
      let ancestorRect: Rect | undefined;
      let ancestorComputed: Record<string, string> | undefined;
      let failingSelector: string | undefined;
      let elementRect: Rect | undefined;

      for (const [sel, el] of [
        ['[data-testid="m55-home-hero-title"]', title],
        ['[data-m55-hero-cta="true"]', cta],
        ['[data-testid="m55-home-hero-support"]', support],
        ['[data-testid="m55-home-hero-trust"]', trust],
      ] as const) {
        const clip = findClippingAncestor(el);
        if (clip) {
          failures.push(`${sel} clipped by ${clip.selector}`);
          failingSelector = sel;
          elementRect = rectOf(el);
          clippingAncestor = clip.selector;
          ancestorRect = clip.rect;
          ancestorComputed = clip.computed;
          break;
        }
      }

      /* Fixed/sticky controls must not cover protected hero content. */
      const protectedEls = [title, cta, support, trust];
      const overlays = [
        ...document.querySelectorAll(
          '[data-m55-public-shell] > header, [data-m55-public-shell] header, [data-testid="m55-scroll-to-top"]',
        ),
      ];
      for (const overlay of overlays) {
        const style = getComputedStyle(overlay);
        if (style.position !== 'fixed' && style.position !== 'sticky') continue;
        const o = rectOf(overlay);
        if (o.width < 1 || o.height < 1 || style.visibility === 'hidden' || Number.parseFloat(style.opacity || '1') < 0.05) {
          continue;
        }
        for (const el of protectedEls) {
          const r = rectOf(el);
          const overlap =
            r.left < o.right - 2 &&
            r.right > o.left + 2 &&
            r.top < o.bottom - 2 &&
            r.bottom > o.top + 2;
          if (overlap) {
            const id = overlay.getAttribute('data-testid') || overlay.tagName.toLowerCase();
            failures.push(`fixed/sticky control overlaps protected content (${id})`);
          }
        }
      }

      /* Protected Hero text must not extend past the visual viewport. */
      for (const [label, el] of [
        ['headline', title],
        ['cta', cta],
        ['support', support],
        ['trust', trust],
      ] as const) {
        const r = rectOf(el);
        if (r.right > window.innerWidth + 2 || r.left < -2) {
          failures.push(`${label} extends beyond visual viewport`);
        }
      }

      /* Japanese punctuation-only lines inside Hero. */
      const punctOnly = /^[\s。、．，・…‥！？!?：:；;「」『』（）()【】［］\[\]―ー\-]+$/u;
      for (const el of hero.querySelectorAll('h1, p, span, button')) {
        const text = (el.textContent || '').trim();
        if (text.length > 0 && punctOnly.test(text)) {
          failures.push(`Japanese punctuation-only line: "${text}"`);
        }
      }

      return {
        ok: failures.length === 0,
        failures,
        viewport: { width: vw, height: vh },
        failingSelector,
        elementRect,
        clippingAncestor,
        ancestorRect,
        ancestorComputed,
      };
    },
    { width, height },
  );
}

function formatFailure(
  mode: string,
  width: number,
  height: number,
  diag: ClipDiag,
  neighbor?: { prev?: string; next?: string },
): string {
  return [
    `[${mode}] ${width}x${height}`,
    ...diag.failures.map((f) => `  - ${f}`),
    diag.failingSelector ? `  selector: ${diag.failingSelector}` : '',
    diag.elementRect ? `  elementRect: ${JSON.stringify(diag.elementRect)}` : '',
    diag.clippingAncestor ? `  clippingAncestor: ${diag.clippingAncestor}` : '',
    diag.ancestorRect ? `  ancestorRect: ${JSON.stringify(diag.ancestorRect)}` : '',
    diag.ancestorComputed ? `  ancestorComputed: ${JSON.stringify(diag.ancestorComputed)}` : '',
    neighbor?.prev ? `  previous breakpoint: ${neighbor.prev}` : '',
    neighbor?.next ? `  following breakpoint: ${neighbor.next}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

async function gotoHomeReady(page: Page) {
  await prepareCleanCapturePage(page);
  await page.goto('/home', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('m55-home-hero')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('[data-m55-hero-cta="true"]')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('m55-home-hero-trust')).toBeVisible();
  await assertOverlayAbsence(page, 'home-continuous-responsive');
}

test.describe('HOME continuous responsive Hero contract', () => {
  test.beforeAll(() => {
    requireCleanCaptureEnvironment('home-continuous-responsive');
  });

  test('fresh-load sweep across governed widths × heights', async ({ page }) => {
    test.setTimeout(45 * 60 * 1000);
    const failures: string[] = [];
    const results = new Map<string, string>();

    for (const height of HEIGHTS) {
      for (let i = 0; i < GOVERNED_WIDTHS.length; i++) {
        const width = GOVERNED_WIDTHS[i];
        await page.setViewportSize({ width, height });
        await gotoHomeReady(page);
        const diag = await assertHomeHeroContract(page, width, height);
        const key = `${width}x${height}`;
        results.set(key, diag.ok ? 'PASS' : 'FAIL');
        if (!diag.ok) {
          failures.push(
            formatFailure('fresh-load', width, height, diag, {
              prev: i > 0 ? `${GOVERNED_WIDTHS[i - 1]}x${height}=${results.get(`${GOVERNED_WIDTHS[i - 1]}x${height}`)}` : undefined,
              next:
                i < GOVERNED_WIDTHS.length - 1
                  ? `${GOVERNED_WIDTHS[i + 1]}x${height}=(pending)`
                  : undefined,
            }),
          );
        }
      }
    }

    expect(failures, failures.join('\n\n')).toEqual([]);
  });

  test('continuous resize-down 1440→320 at each height', async ({ page }) => {
    test.setTimeout(30 * 60 * 1000);
    const failures: string[] = [];
    const widthsDown = [...GOVERNED_WIDTHS].sort((a, b) => b - a);

    for (const height of HEIGHTS) {
      await page.setViewportSize({ width: WIDTH_MAX, height });
      await gotoHomeReady(page);
      let prevKey = '';
      let prevResult = '';
      for (const width of widthsDown) {
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(50);
        const diag = await assertHomeHeroContract(page, width, height);
        const key = `${width}x${height}`;
        if (!diag.ok) {
          failures.push(
            formatFailure('resize-down', width, height, diag, {
              prev: prevKey ? `${prevKey}=${prevResult}` : undefined,
            }),
          );
        }
        prevKey = key;
        prevResult = diag.ok ? 'PASS' : 'FAIL';
      }
    }

    expect(failures, failures.join('\n\n')).toEqual([]);
  });

  test('continuous resize-up 320→1440 at each height', async ({ page }) => {
    test.setTimeout(30 * 60 * 1000);
    const failures: string[] = [];
    const widthsUp = [...GOVERNED_WIDTHS].sort((a, b) => a - b);

    for (const height of HEIGHTS) {
      await page.setViewportSize({ width: WIDTH_MIN, height });
      await gotoHomeReady(page);
      let prevKey = '';
      let prevResult = '';
      for (const width of widthsUp) {
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(50);
        const diag = await assertHomeHeroContract(page, width, height);
        const key = `${width}x${height}`;
        if (!diag.ok) {
          failures.push(
            formatFailure('resize-up', width, height, diag, {
              prev: prevKey ? `${prevKey}=${prevResult}` : undefined,
            }),
          );
        }
        prevKey = key;
        prevResult = diag.ok ? 'PASS' : 'FAIL';
      }
    }

    expect(failures, failures.join('\n\n')).toEqual([]);
  });

  test('representative widths still pass', async ({ page }) => {
    test.setTimeout(10 * 60 * 1000);
    const failures: string[] = [];
    for (const height of [812, 900] as const) {
      for (const width of REPRESENTATIVE_WIDTHS) {
        await page.setViewportSize({ width, height });
        await gotoHomeReady(page);
        const diag = await assertHomeHeroContract(page, width, height);
        if (!diag.ok) failures.push(formatFailure('representative', width, height, diag));
      }
    }
    expect(failures, failures.join('\n\n')).toEqual([]);
  });

  test('contact sheet at height 812 (temporary review output)', async ({ page }) => {
    test.setTimeout(20 * 60 * 1000);
    rmSync(CONTACT_SHEET_DIR, { recursive: true, force: true });
    mkdirSync(CONTACT_SHEET_DIR, { recursive: true });

    const flags: string[] = [];
    let prevHeroBottom = 0;
    let prevCopyLeft = 0;

    for (const width of GOVERNED_WIDTHS) {
      await page.setViewportSize({ width, height: CONTACT_SHEET_HEIGHT });
      await gotoHomeReady(page);
      const diag = await assertHomeHeroContract(page, width, CONTACT_SHEET_HEIGHT);
      const shot = join(CONTACT_SHEET_DIR, `home-hero-${width}.png`);
      await page.getByTestId('m55-home-hero').screenshot({ path: shot });

      const metrics = await page.evaluate(() => {
        const hero = document.querySelector('[data-testid="m55-home-hero"]')!;
        const cta = document.querySelector('[data-m55-hero-cta="true"]')!;
        const support = document.querySelector('[data-testid="m55-home-hero-support"]')!;
        const trust = document.querySelector('[data-testid="m55-home-hero-trust"]')!;
        const copy = document.querySelector('[data-testid="m55-home-hero-title"]')!;
        const next = document.querySelector('[data-testid="m55-home-lower"]')!;
        const hr = hero.getBoundingClientRect();
        const cr = cta.getBoundingClientRect();
        const sr = support.getBoundingClientRect();
        const tr = trust.getBoundingClientRect();
        const titleR = copy.getBoundingClientRect();
        const nr = next.getBoundingClientRect();
        return {
          heroBottom: hr.bottom,
          copyLeft: titleR.left,
          ctaPartial: cr.bottom > hr.bottom - 1 || cr.top < hr.top + 1,
          missingSupport: sr.height < 1 || getComputedStyle(support).opacity === '0',
          missingTrust: tr.height < 1 || getComputedStyle(trust).opacity === '0',
          sectionCollision: nr.top < Math.max(cr.bottom, sr.bottom, tr.bottom) - 1,
        };
      });

      if (!diag.ok || metrics.ctaPartial) flags.push(`${width}: partially visible CTA / contract fail`);
      if (metrics.missingSupport) flags.push(`${width}: missing support copy`);
      if (metrics.missingTrust) flags.push(`${width}: missing login-free label`);
      if (metrics.sectionCollision) flags.push(`${width}: section-boundary collision`);
      if (prevHeroBottom > 0 && Math.abs(metrics.heroBottom - prevHeroBottom) > 220) {
        flags.push(`${width}: sudden layout discontinuity vs previous width`);
      }
      if (prevCopyLeft > 0 && Math.abs(metrics.copyLeft - prevCopyLeft) > 180 && width > 640) {
        flags.push(`${width}: abrupt copy displacement`);
      }
      prevHeroBottom = metrics.heroBottom;
      prevCopyLeft = metrics.copyLeft;
    }

    writeFileSync(join(CONTACT_SHEET_DIR, 'flags.json'), JSON.stringify({ flags }, null, 2));
    expect(flags, flags.join('\n')).toEqual([]);
  });
});
