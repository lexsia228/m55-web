import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resetCalendarBundleCacheForTests } from './calendar/loadCalendarBundle';
import { buildCoreResult } from './coreResult/buildCoreResult';
import { resolveCoreStemAuthority } from './coreResult/resolveCoreStemAuthority';
import { deriveLockedShelfStemPreviewFromProfile } from './compositeStem/deriveLockedShelfStemPreviewCore';
import { enrichBirthProfileForSave } from '../soul/birthProfileV2';
import {
  resolveCorePublicStemDisplay,
  resolvePublicStemDisplay,
} from './publicStemDisplay';
import { essenceStemLaneIndex } from './essenceEngine';

const DM_GX_01_PROFILE = enrichBirthProfileForSave({
  nickname: 'gx01',
  birthDate: '1983-02-28',
  birthTimeUnknown: true,
  country: 'JP',
  timezone: 'Asia/Tokyo',
});

describe('divinationGoldenParity P0 — DM-GX-01', () => {
  it('DM-GX-01 v2 authority lane 9 / アナリスト', () => {
    resetCalendarBundleCacheForTests();
    const authority = resolveCoreStemAuthority(DM_GX_01_PROFILE);
    assert.ok(authority);
    assert.equal(authority.stemLaneIndex, 9);
    assert.equal(authority.stemChar, '癸');
    assert.equal(authority.publicTitle, 'アナリスト');
    assert.equal(authority.calculationMode, 'unknown_time_noon');
  });

  it('DM-GX-01 Core public title and image match v2', () => {
    resetCalendarBundleCacheForTests();
    const core = buildCoreResult({ nickname: 'gx01', birthDate: '1983-02-28' });
    assert.equal(core.stemLaneIndex, 9);
    const display = resolveCorePublicStemDisplay(core);
    assert.equal(display.publicTitle, 'アナリスト');
    assert.equal(display.imagePath, '/ten-views/analyst.webp');
    assert.equal(display.displayOneLine, resolvePublicStemDisplay(9)!.displayOneLine);
  });

  it('DM-GX-01 Core public display matches locked shelf preview', () => {
    resetCalendarBundleCacheForTests();
    const shelf = deriveLockedShelfStemPreviewFromProfile(DM_GX_01_PROFILE);
    assert.ok(shelf);
    assert.equal(shelf.stemLaneIndex, 9);
    assert.equal(shelf.publicTitle, 'アナリスト');

    const core = buildCoreResult({ nickname: 'gx01', birthDate: '1983-02-28' });
    const coreDisplay = resolveCorePublicStemDisplay(core);
    assert.equal(coreDisplay.publicTitle, shelf.publicTitle);
    assert.equal(coreDisplay.imagePath, '/ten-views/analyst.webp');
  });

  it('DM-GX-01 Core stemLaneIndex does not use legacy essenceStemLaneIndex', () => {
    resetCalendarBundleCacheForTests();
    assert.equal(essenceStemLaneIndex('1983-02-28'), 3);
    const core = buildCoreResult({ nickname: 'gx01', birthDate: '1983-02-28' });
    assert.equal(core.stemLaneIndex, 9);
    assert.notEqual(core.stemLaneIndex, essenceStemLaneIndex('1983-02-28'));
  });
});
