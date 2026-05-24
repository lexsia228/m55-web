import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { buildCoreResult } from './coreResult/buildCoreResult';
import { essenceStemLaneIndex } from './essenceEngine';
import { deriveDtrShelfStemDisplay } from './dtrShelfStemDisplay';
import { runDtrEngine } from './dtrEngine';
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
  it('LP-01: 1992-12-19 lane 5 => プロデューサー on core and DTR paths', () => {
    const birthDate = '1992-12-19';
    const lane = essenceStemLaneIndex(birthDate);
    assert.equal(lane, 5);

    const core = buildCoreResult({ nickname: 't', birthDate });
    assert.equal(core.stemLaneIndex, 5);
    assert.equal(resolveCorePublicStemDisplay(core).publicTitle, 'プロデューサー');

    const shelf = deriveDtrShelfStemDisplay({ birthDate, nickname: 't' });
    assert.ok(shelf);
    assert.equal(shelf.publicTitle, 'プロデューサー');

    const dtr = runDtrEngine({ birthDate, nickname: 't', locale: 'ja-JP', contextScope: 'dtr' });
    assert.equal(TEN_STEM_PUBLIC_TITLE(dtr.auditMeta.stemLaneIndex), 'プロデューサー');
  });

  it('LP-01b: CoreHero source must not use PRESIDENT as primary visible label', () => {
    const src = readFileSync(join(process.cwd(), 'components/core/CoreHeroSection.tsx'), 'utf8');
    assert.doesNotMatch(src, /PRESIDENT/);
    assert.doesNotMatch(src, /HERO_VISUAL_PRESET/);
    assert.match(src, /resolveCorePublicStemDisplay/);
    assert.match(src, /stemDisplay\.publicTitle/);
  });

  it('LP-02: 1983-02-28 legacy JDN lane 3 => クリエイター', () => {
    const birthDate = '1983-02-28';
    const lane = essenceStemLaneIndex(birthDate);
    assert.equal(lane, 3);
    assert.equal(resolvePublicTitleByStemLaneIndex(lane), 'クリエイター');
    const core = buildCoreResult({ nickname: 't', birthDate });
    assert.equal(resolveCorePublicStemDisplay(core).publicTitle, 'クリエイター');
  });

  it('LP-03: 1983-02-28 v2 golden => アナリスト + 静観分析 observation trait', () => {
    resetCalendarBundleCacheForTests();
    const preview = deriveLockedShelfStemPreviewFromProfile(GOLDEN_V2_PROFILE);
    assert.ok(preview);
    assert.equal(preview.publicTitle, 'アナリスト');
    assert.equal(preview.stemLaneIndex, 9);

    const core = buildCoreResult({ nickname: 't', birthDate: '1983-02-28' });
    assert.equal(observationTraitNameFromCoreLabel(core.coreLabel), '静観分析');
  });

  it('LP-04: shelf helper publicTitle matches core public stem display at same lane', () => {
    const birthDate = '1992-12-19';
    const core = buildCoreResult({ nickname: 't', birthDate });
    const shelf = deriveDtrShelfStemDisplay({ birthDate, nickname: 't' });
    assert.ok(shelf);
    assert.equal(
      resolveCorePublicStemDisplay(core).publicTitle,
      shelf.publicTitle,
    );
  });

  it('LP-05: image map keyed by stemLaneIndex is shared', () => {
    assert.equal(STEM_LANE_TEN_VIEWS_IMAGE[5], '/ten-views/producer.webp');
    assert.equal(
      resolvePublicStemDisplay(5)!.imagePath,
      STEM_LANE_TEN_VIEWS_IMAGE[5],
    );
  });

  it('LP-06: matrix cases must not diverge core publicTitle vs DTR publicTitle', () => {
    for (const birthDate of ['1992-12-19', '1983-02-28', '2000-01-01']) {
      const lane = essenceStemLaneIndex(birthDate);
      const core = buildCoreResult({ nickname: 'm', birthDate });
      const coreTitle = resolveCorePublicStemDisplay(core).publicTitle;
      const dtrTitle = resolvePublicTitleByStemLaneIndex(lane);
      assert.equal(coreTitle, dtrTitle, `labelMismatch at ${birthDate}`);
    }
  });
});

describe('core hero hierarchy P-CORE-HERO-HIERARCHY-01', () => {
  const coreHeroSrc = () =>
    readFileSync(join(process.cwd(), 'components/core/CoreHeroSection.tsx'), 'utf8');

  it('LH-01: 1992-12-19 primary visible label = プロデューサー', () => {
    const core = buildCoreResult({ nickname: 't', birthDate: '1992-12-19' });
    assert.equal(resolveCorePublicStemDisplay(core).publicTitle, 'プロデューサー');
  });

  it('LH-02: 1992-12-19 secondary trait = 直観展開', () => {
    const core = buildCoreResult({ nickname: 't', birthDate: '1992-12-19' });
    assert.equal(observationTraitNameFromCoreLabel(core.coreLabel), '直観展開');
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

  it('LH-06: 1983-02-28 v2 golden primary アナリスト, secondary 静観分析', () => {
    resetCalendarBundleCacheForTests();
    const preview = deriveLockedShelfStemPreviewFromProfile(GOLDEN_V2_PROFILE);
    assert.ok(preview);
    assert.equal(preview.publicTitle, 'アナリスト');
    assert.equal(preview.stemLaneIndex, 9);

    const core = buildCoreResult({ nickname: 't', birthDate: '1983-02-28' });
    assert.equal(observationTraitNameFromCoreLabel(core.coreLabel), '静観分析');
    assert.equal(resolveCorePublicStemDisplay(core).publicTitle, 'クリエイター');
  });

  it('LH-07: DTR publicTitle parity remains intact', () => {
    const birthDate = '1992-12-19';
    const core = buildCoreResult({ nickname: 'm', birthDate });
    const shelf = deriveDtrShelfStemDisplay({ birthDate, nickname: 'm' });
    assert.ok(shelf);
    assert.equal(resolveCorePublicStemDisplay(core).publicTitle, shelf.publicTitle);
    assert.equal(
      resolveCorePublicStemDisplay(core).displayOneLine,
      resolvePublicStemDisplay(5)!.displayOneLine,
    );
  });
});

function TEN_STEM_PUBLIC_TITLE(lane: number): string {
  return resolvePublicTitleByStemLaneIndex(lane)!;
}
