import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  COMMERCIAL_VIEWPORTS,
  COMMERCIAL_VISUAL_CASES,
  COMMERCIAL_VISUAL_FINDINGS,
  PUBLIC_FIXED_HEADER_SELECTOR,
  findingCoverageGaps,
} from './commercialVisualQualityContract';
import { checkMeasuredPage, contrastRatio, effectiveMeasuredRect, intersectRects, requiredContrastFor } from './commercialVisualQualityChecks';
import {
  brokenFixtures,
  fixtureCase,
  healthyDesktopPage,
  healthyMobilePage,
} from './commercialVisualQualityFixtures';
import {
  CANONICAL_FREE_ENTRY_CTA_JA,
  divergentFreeEntryCtaOwners,
  freeEntryCtaOwners,
} from './freeEntryCtaAuthority';
import { PLAN_COMPARISON } from '../planComparison';
import { M55_COMMERCIAL_TERMINOLOGY as T } from '../terminology';
import { STATIC_FREE_TO_PAID_BRIDGE } from '../../../../components/core/corePublicCopy';

describe('commercial visual quality — contract', () => {
  it('governs the eight reviewed viewports', () => {
    assert.deepEqual([...COMMERCIAL_VIEWPORTS], [320, 360, 390, 430, 768, 1024, 1280, 1440]);
  });

  it('assigns every reviewed P0/P1 finding to a governed case', () => {
    assert.deepEqual(findingCoverageGaps(), []);
    assert.ok(Object.keys(COMMERCIAL_VISUAL_FINDINGS).length >= 10);
  });

  it('gives every governed case at least one protected target', () => {
    for (const governedCase of COMMERCIAL_VISUAL_CASES) {
      assert.ok(
        governedCase.protectedTargets.length > 0,
        `${governedCase.caseId} has no protected targets`,
      );
    }
  });
});

describe('commercial visual quality — contrast maths', () => {
  it('matches the WCAG reference ratio for black on white', () => {
    assert.equal(Math.round(contrastRatio([0, 0, 0], [255, 255, 255]) * 100) / 100, 21);
  });

  it('requires the stricter floor for normal-size text only', () => {
    assert.equal(requiredContrastFor(14, 400), 4.5);
    assert.equal(requiredContrastFor(24, 400), 3);
    assert.equal(requiredContrastFor(19, 700), 3);
    assert.equal(requiredContrastFor(19, 400), 4.5);
  });
});

describe('commercial visual quality — healthy snapshots pass', () => {
  it('reports no failure for a defect-free mobile page', () => {
    const page = healthyMobilePage();
    assert.deepEqual(checkMeasuredPage(page, fixtureCase(page)), []);
  });

  it('reports no failure for a defect-free desktop page', () => {
    const page = healthyDesktopPage();
    assert.deepEqual(checkMeasuredPage(page, fixtureCase(page)), []);
  });
});

describe('commercial visual quality — intentionally broken fixtures are rejected', () => {
  const fixtures = brokenFixtures();

  it('covers the six reviewed defect classes', () => {
    assert.equal(fixtures.length, 6);
    assert.equal(new Set(fixtures.map((f) => f.expectedRule)).size, 6);
  });

  for (const fixture of fixtures) {
    it(`rejects ${fixture.id} — ${fixture.defect}`, () => {
      const failures = checkMeasuredPage(fixture.page, fixtureCase(fixture.page));
      assert.ok(
        failures.some((f) => f.rule === fixture.expectedRule),
        `${fixture.id} produced ${JSON.stringify(failures.map((f) => f.rule))}, expected ${fixture.expectedRule}`,
      );
    });
  }
});

describe('commercial visual quality — Free entry CTA is one label', () => {
  it('names a single canonical Free entry label', () => {
    assert.equal(CANONICAL_FREE_ENTRY_CTA_JA, '無料で見てみる');
  });

  it('has every Free entry owner agreeing with the canonical label', () => {
    assert.ok(freeEntryCtaOwners().length >= 8);
    assert.deepEqual(divergentFreeEntryCtaOwners(), []);
  });
});

describe('commercial visual quality — Premium CTA leads with outcome', () => {
  it('keeps the question count out of the primary Premium CTA', () => {
    assert.equal(T.premiumBridgeCta, 'プレミアムの読み解きへ進む');
    assert.equal(STATIC_FREE_TO_PAID_BRIDGE.primaryCtaJa, T.premiumBridgeCta);
    assert.doesNotMatch(STATIC_FREE_TO_PAID_BRIDGE.primaryCtaJa, /\d+問/);
  });

  it('still discloses the answering effort next to the CTA', () => {
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.effortJa, /6問/);
  });
});

describe('commercial visual quality — plan difference is comparable before selection', () => {
  it('states the difference for both tiers from Product Truth values', () => {
    const compact = PLAN_COMPARISON.compactDifference;
    assert.equal(compact.light.nameJa, PLAN_COMPARISON.light.publicName);
    assert.equal(compact.full.nameJa, PLAN_COMPARISON.full.publicName);
    assert.equal(compact.light.priceLabelJa, PLAN_COMPARISON.light.priceLabelJa);
    assert.equal(compact.full.priceLabelJa, PLAN_COMPARISON.full.priceLabelJa);
    assert.match(compact.light.differenceJa, /1件/);
    assert.match(compact.full.differenceJa, /5件/);
  });

  it('avoids accuracy or ranking language in the comparison', () => {
    const text = Object.values(PLAN_COMPARISON.compactDifference)
      .map((v) => (typeof v === 'string' ? v : Object.values(v).join('')))
      .join('');
    assert.doesNotMatch(text, /%|％|的中|精度|おすすめ|人気|最適/);
  });
});

function rect(left: number, top: number, width: number, height: number) {
  return { left, top, width, height, right: left + width, bottom: top + height };
}

function stickyHeaderOverlay(box = rect(0, 0, 390, 64)) {
  return {
    selector: PUBLIC_FIXED_HEADER_SELECTOR,
    present: true,
    visible: true,
    position: 'sticky' as const,
    rect: box,
    visibleRect: box,
    anchoredToBottom: false,
    safeAreaCompensated: false,
  };
}

describe('commercial visual quality — visible-rect overlay precision', () => {
  it('intersectRects returns null for zero-area overlap', () => {
    assert.equal(intersectRects(rect(0, 0, 10, 10), rect(10, 0, 10, 10)), null);
  });

  it('effectiveMeasuredRect preserves tri-state visibleRect semantics', () => {
    const raw = rect(0, 0, 100, 100);
    assert.deepEqual(effectiveMeasuredRect(raw, undefined), raw);
    assert.equal(effectiveMeasuredRect(raw, null), null);
    assert.deepEqual(effectiveMeasuredRect(raw, rect(10, 10, 20, 20)), rect(10, 10, 20, 20));
  });

  it('VISIBLE_OVERLAP_STILL_FAILS — visible overlap keeps overlay_covers_protected', () => {
    const page = {
      ...healthyMobilePage(),
      overlays: [stickyHeaderOverlay()],
      elements: [
        {
          ...healthyMobilePage().elements[0],
          rect: rect(16, 40, 358, 48),
          visibleRect: rect(16, 40, 358, 48),
        },
      ],
    };
    const failures = checkMeasuredPage(page, fixtureCase(page));
    assert.ok(
      failures.some((f) => f.rule === 'overlay_covers_protected'),
      `expected overlay_covers_protected, got ${JSON.stringify(failures.map((f) => f.rule))}`,
    );
  });

  it('CLIPPED_ONLY_OVERLAP_PASSES — raw overlap clipped below overlay passes', () => {
    const page = {
      ...healthyMobilePage(),
      overlays: [stickyHeaderOverlay()],
      elements: [
        {
          ...healthyMobilePage().elements[0],
          rect: rect(16, 40, 358, 80),
          visibleRect: rect(16, 64, 358, 56),
        },
      ],
    };
    const failures = checkMeasuredPage(page, fixtureCase(page)).filter(
      (f) => f.rule === 'overlay_covers_protected',
    );
    assert.deepEqual(failures, []);
  });

  it('PARTIALLY_VISIBLE_OVERLAP_USES_VISIBLE_RECT — decision follows visible portion', () => {
    const header = rect(0, 0, 390, 64);
    const rawHeading = rect(16, 20, 358, 80);
    const visibleHeading = rect(16, 56, 358, 44);
    assert.ok(intersectRects(header, rawHeading));
    assert.ok(intersectRects(header, visibleHeading));

    const page = {
      ...healthyMobilePage(),
      overlays: [stickyHeaderOverlay(header)],
      elements: [
        {
          ...healthyMobilePage().elements[0],
          rect: rawHeading,
          visibleRect: visibleHeading,
        },
      ],
    };
    const failures = checkMeasuredPage(page, fixtureCase(page)).filter(
      (f) => f.rule === 'overlay_covers_protected',
    );
    assert.equal(failures.length, 1);
  });

  it('NO_OVERLAP_PASSES — disjoint raw and visible geometry pass', () => {
    const page = {
      ...healthyMobilePage(),
      overlays: [stickyHeaderOverlay()],
      elements: [
        {
          ...healthyMobilePage().elements[0],
          rect: rect(16, 120, 358, 48),
          visibleRect: rect(16, 120, 358, 48),
        },
      ],
    };
    const failures = checkMeasuredPage(page, fixtureCase(page)).filter(
      (f) => f.rule === 'overlay_covers_protected',
    );
    assert.deepEqual(failures, []);
  });

  it('fully clipped protected element does not fail overlay_covers_protected', () => {
    const page = {
      ...healthyMobilePage(),
      overlays: [stickyHeaderOverlay()],
      elements: [
        {
          ...healthyMobilePage().elements[0],
          rect: rect(16, 40, 358, 80),
          visibleRect: null,
        },
      ],
    };
    const failures = checkMeasuredPage(page, fixtureCase(page)).filter(
      (f) => f.rule === 'overlay_covers_protected',
    );
    assert.deepEqual(failures, []);
  });

  it('VISIBLE_OVERLAY_PROTECTION_PRESERVED — sticky PublicHeader covering visible heading still fails', () => {
    const page = {
      ...healthyMobilePage(),
      caseId: 'core-free-result',
      route: '/core',
      overlays: [stickyHeaderOverlay()],
      elements: [
        {
          selector: '[data-testid="m55-free-to-paid-bridge"] h3',
          role: 'heading' as const,
          present: true,
          rect: rect(16, 32, 358, 40),
          visibleRect: rect(16, 32, 358, 40),
          scrollWidth: 358,
          scrollHeight: 40,
          clientWidth: 358,
          clientHeight: 40,
          clippedByAncestor: null,
          foreground: [26, 26, 26],
          background: [255, 255, 255],
          fontSizePx: 24,
          fontWeight: 700,
          hasVisibleFocusIndicator: null,
          stageWidth: null,
        },
      ],
    };
    const failures = checkMeasuredPage(page, fixtureCase(page));
    assert.ok(failures.some((f) => f.rule === 'overlay_covers_protected'));
  });

  it('CORE_RAW_OVERLAP_CAN_EXIST while CORE_VISIBLE_OVERLAP_EXPECTED is empty at 390/top', () => {
    const headerBottom = 64;
    const mainTop = headerBottom;
    const header = rect(0, 0, 390, headerBottom);
    const protectedRaw = rect(16, 48, 358, 40);
    const protectedVisible = rect(16, mainTop, 358, 24);

    assert.ok(intersectRects(header, protectedRaw), 'CORE_RAW_OVERLAP_CAN_EXIST');
    assert.equal(
      intersectRects(header, protectedVisible),
      null,
      'CORE_VISIBLE_OVERLAP_EXPECTED=false',
    );

    const page = {
      ...healthyMobilePage(),
      caseId: 'core-free-result',
      route: '/core',
      viewportWidth: 390,
      overlays: [stickyHeaderOverlay(header)],
      elements: [
        {
          selector: '[data-testid="m55-free-to-paid-bridge"] h3',
          role: 'heading' as const,
          present: true,
          rect: protectedRaw,
          visibleRect: protectedVisible,
          scrollWidth: 358,
          scrollHeight: 40,
          clientWidth: 358,
          clientHeight: 40,
          clippedByAncestor: null,
          foreground: [26, 26, 26],
          background: [255, 255, 255],
          fontSizePx: 24,
          fontWeight: 700,
          hasVisibleFocusIndicator: null,
          stageWidth: null,
        },
      ],
    };
    const failures = checkMeasuredPage(page, fixtureCase(page)).filter(
      (f) => f.rule === 'overlay_covers_protected',
    );
    assert.deepEqual(failures, [], 'CORE_390_TOP_FALSE_POSITIVE_EXPECTED_REMOVED');
  });
});
