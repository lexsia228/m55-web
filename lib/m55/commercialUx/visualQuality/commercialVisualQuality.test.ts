import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  COMMERCIAL_VIEWPORTS,
  COMMERCIAL_VISUAL_CASES,
  COMMERCIAL_VISUAL_FINDINGS,
  findingCoverageGaps,
} from './commercialVisualQualityContract';
import { checkMeasuredPage, contrastRatio, requiredContrastFor } from './commercialVisualQualityChecks';
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
