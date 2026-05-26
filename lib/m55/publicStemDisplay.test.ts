import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { buildCoreResult } from './coreResult/buildCoreResult';
import { essenceStemLaneIndex } from './essenceEngine';
import { resolveCoreStemAuthority } from './coreResult/resolveCoreStemAuthority';
import { resetCalendarBundleCacheForTests } from './calendar/loadCalendarBundle';
import { enrichBirthProfileForSave } from '../soul/birthProfileV2';
import type { BirthProfile } from '../soul/profile';
import {
  STEM_LANE_TEN_VIEWS_IMAGE,
  resolveCorePublicStemDisplay,
  resolvePublicStemDisplay,
  resolvePublicTitleByStemLaneIndex,
  observationTraitNameFromCoreLabel,
} from './publicStemDisplay';
import { deriveLockedShelfStemPreviewFromProfile } from './compositeStem/deriveLockedShelfStemPreviewCore';

const GOLDEN_V2_PROFILE: BirthProfile = enrichBirthProfileForSave({
  nickname: 'parity',
  birthDate: '1983-02-28',
  birthTime: '12:00',
  birthTimeUnknown: false,
  country: 'JP',
  birthplace: '東京都',
});

describe('publicStemDisplay parity', () => {
  it('LP-01: 1992-12-19 v2 authority => プランナー on core and locked shelf', () => {
    resetCalendarBundleCacheForTests();
    const birthDate = '1992-12-19';
    const profile = enrichBirthProfileForSave({ nickname: 't', birthDate });
    const authority = resolveCoreStemAuthority(profile);
    assert.ok(authority);
    assert.equal(authority.stemLaneIndex, 1);
    assert.equal(authority.publicTitle, 'プランナー');

    const core = buildCoreResult({ nickname: 't', birthDate });
    assert.equal(core.stemLaneIndex, 1);
    assert.equal(resolveCorePublicStemDisplay(core).publicTitle, 'プランナー');

    const shelf = deriveLockedShelfStemPreviewFromProfile(profile);
    assert.ok(shelf);
    assert.equal(shelf.publicTitle, 'プランナー');
    assert.equal(resolveCorePublicStemDisplay(core).publicTitle, shelf.publicTitle);
  });

  it('LP-01b: CoreHero source must not use PRESIDENT as primary visible label', () => {
    const src = readFileSync(join(process.cwd(), 'components/core/CoreHeroSection.tsx'), 'utf8');
    assert.doesNotMatch(src, /PRESIDENT/);
    assert.doesNotMatch(src, /HERO_VISUAL_PRESET/);
    assert.match(src, /resolveCorePublicStemDisplay/);
    assert.match(src, /stemDisplay\.publicTitle/);
  });

  it('LP-02: 1983-02-28 Core uses v2 lane 9 アナリスト (not legacy JDN クリエイター)', () => {
    resetCalendarBundleCacheForTests();
    const birthDate = '1983-02-28';
    assert.equal(essenceStemLaneIndex(birthDate), 3);
    assert.equal(resolvePublicTitleByStemLaneIndex(3), 'クリエイター');
    const core = buildCoreResult({ nickname: 't', birthDate });
    assert.equal(core.stemLaneIndex, 9);
    assert.equal(resolveCorePublicStemDisplay(core).publicTitle, 'アナリスト');
    assert.equal(resolveCorePublicStemDisplay(core).imagePath, '/ten-views/analyst.webp');
  });

  it('LP-03: 1983-02-28 v2 golden => アナリスト + TYPE from v2 lane 9', () => {
    resetCalendarBundleCacheForTests();
    const preview = deriveLockedShelfStemPreviewFromProfile(GOLDEN_V2_PROFILE);
    assert.ok(preview);
    assert.equal(preview.publicTitle, 'アナリスト');
    assert.equal(preview.stemLaneIndex, 9);

    const core = buildCoreResult({ nickname: 't', birthDate: '1983-02-28' });
    assert.equal(resolveCorePublicStemDisplay(core).publicTitle, 'アナリスト');
    assert.equal(observationTraitNameFromCoreLabel(core.coreLabel), '統合設計');
  });

  it('LP-04: locked shelf preview publicTitle matches core public stem display', () => {
    resetCalendarBundleCacheForTests();
    const birthDate = '1992-12-19';
    const profile = enrichBirthProfileForSave({ nickname: 't', birthDate });
    const core = buildCoreResult({ nickname: 't', birthDate });
    const shelf = deriveLockedShelfStemPreviewFromProfile(profile);
    assert.ok(shelf);
    assert.equal(resolveCorePublicStemDisplay(core).publicTitle, shelf.publicTitle);
  });

  it('LP-05: image map keyed by stemLaneIndex is shared', () => {
    assert.equal(STEM_LANE_TEN_VIEWS_IMAGE[5], '/ten-views/producer.webp');
    assert.equal(
      resolvePublicStemDisplay(5)!.imagePath,
      STEM_LANE_TEN_VIEWS_IMAGE[5],
    );
  });

  it('LP-06: core publicTitle matches v2 locked shelf preview (not legacy JDN)', () => {
    resetCalendarBundleCacheForTests();
    for (const birthDate of ['1992-12-19', '1983-02-28', '2000-01-01']) {
      const profile = enrichBirthProfileForSave({ nickname: 'm', birthDate });
      const shelf = deriveLockedShelfStemPreviewFromProfile(profile);
      assert.ok(shelf, `shelf missing at ${birthDate}`);
      const core = buildCoreResult({ nickname: 'm', birthDate });
      const coreTitle = resolveCorePublicStemDisplay(core).publicTitle;
      assert.equal(coreTitle, shelf.publicTitle, `labelMismatch at ${birthDate}`);
      assert.notEqual(coreTitle, resolvePublicTitleByStemLaneIndex(essenceStemLaneIndex(birthDate)), `legacy parity at ${birthDate}`);
    }
  });
});

describe('core hero hierarchy P-CORE-HERO-HIERARCHY-01', () => {
  const coreHeroSrc = () =>
    readFileSync(join(process.cwd(), 'components/core/CoreHeroSection.tsx'), 'utf8');

  it('LH-01: 1992-12-19 primary visible label = プランナー (v2)', () => {
    resetCalendarBundleCacheForTests();
    const core = buildCoreResult({ nickname: 't', birthDate: '1992-12-19' });
    assert.equal(resolveCorePublicStemDisplay(core).publicTitle, 'プランナー');
  });

  it('LH-02: 1992-12-19 secondary trait from v2 lane TYPE_02', () => {
    resetCalendarBundleCacheForTests();
    const core = buildCoreResult({ nickname: 't', birthDate: '1992-12-19' });
    assert.equal(observationTraitNameFromCoreLabel(core.coreLabel), '共鳴受容');
  });

  it('LH-03: CoreHero main headline binds stemDisplay.publicTitle', () => {
    const src = coreHeroSrc();
    assert.match(src, /corePosterMainHeadlineName\}>\{stemDisplay\.publicTitle\}/);
    assert.match(src, /corePosterHeroLead\}>\{stemDisplay\.displayOneLine\}/);
    assert.doesNotMatch(src, /corePosterHeroEyebrowEn/);
  });

  it('LH-04: observationTraitName is not the sole primary headline binding', () => {
    const src = coreHeroSrc();
    assert.doesNotMatch(src, /corePosterMainHeadlineName\}>\{observationTraitName\}/);
    assert.match(src, /corePosterTraitRowName\}>\{observationTraitName\}/);
  });

  it('LH-05: PRESIDENT / HERO_VISUAL_PRESET regression clean', () => {
    const src = coreHeroSrc();
    assert.doesNotMatch(src, /PRESIDENT/);
    assert.doesNotMatch(src, /HERO_VISUAL_PRESET/);
  });

  it('LH-06: 1983-02-28 v2 golden primary アナリスト, secondary from lane 9 TYPE', () => {
    resetCalendarBundleCacheForTests();
    const preview = deriveLockedShelfStemPreviewFromProfile(GOLDEN_V2_PROFILE);
    assert.ok(preview);
    assert.equal(preview.publicTitle, 'アナリスト');
    assert.equal(preview.stemLaneIndex, 9);

    const core = buildCoreResult({ nickname: 't', birthDate: '1983-02-28' });
    assert.equal(observationTraitNameFromCoreLabel(core.coreLabel), '統合設計');
    assert.equal(resolveCorePublicStemDisplay(core).publicTitle, 'アナリスト');
    assert.equal(resolveCorePublicStemDisplay(core).imagePath, '/ten-views/analyst.webp');
  });

  it('LH-07: core publicTitle matches v2 locked shelf preview', () => {
    resetCalendarBundleCacheForTests();
    const birthDate = '1992-12-19';
    const profile = enrichBirthProfileForSave({ nickname: 'm', birthDate });
    const core = buildCoreResult({ nickname: 'm', birthDate });
    const shelf = deriveLockedShelfStemPreviewFromProfile(profile);
    assert.ok(shelf);
    assert.equal(resolveCorePublicStemDisplay(core).publicTitle, shelf.publicTitle);
    assert.equal(
      resolveCorePublicStemDisplay(core).displayOneLine,
      resolvePublicStemDisplay(core.stemLaneIndex)!.displayOneLine,
    );
  });
});
