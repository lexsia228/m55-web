import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { resetCalendarBundleCacheForTests } from '../calendar/loadCalendarBundle';
import type { BirthProfile } from '../../soul/profile';
import { enrichBirthProfileForSave } from '../../soul/birthProfileV2';
import {
  birthProfileToFulfillmentFields,
  deriveLockedShelfStemPreviewFromProfile,
} from './deriveLockedShelfStemPreview';

const GOLDEN_V2_PROFILE: BirthProfile = enrichBirthProfileForSave({
  nickname: 'golden',
  birthDate: '1983-02-28',
  birthTime: '12:00',
  birthTimeUnknown: false,
  country: 'JP',
  birthplace: '東京都',
});

const INCOMPLETE_LEGACY_PROFILE: BirthProfile = {
  nickname: 'legacy',
  birthDate: '1983-02-28',
  country: 'JP',
};

describe('deriveLockedShelfStemPreviewFromProfile', () => {
  it('returns null for incomplete legacy profile (no concrete type)', () => {
    assert.equal(deriveLockedShelfStemPreviewFromProfile(INCOMPLETE_LEGACY_PROFILE), null);
    assert.equal(deriveLockedShelfStemPreviewFromProfile(null), null);
  });

  it('1983-02-28 JP v2 complete profile yields アナリスト / lane 9', () => {
    resetCalendarBundleCacheForTests();
    const preview = deriveLockedShelfStemPreviewFromProfile(GOLDEN_V2_PROFILE);
    assert.ok(preview);
    assert.equal(preview!.stemLaneIndex, 9);
    assert.equal(preview!.publicTitle, 'アナリスト');
    assert.notEqual(preview!.publicTitle, 'クリエイター');
    assert.equal(preview!.nickname, 'golden');
  });

  it('allows birthTimeUnknown without explicit birthTime', () => {
    resetCalendarBundleCacheForTests();
    const profile = enrichBirthProfileForSave({
      nickname: 'unknown-time',
      birthDate: '1983-02-28',
      birthTimeUnknown: true,
      country: 'JP',
    });
    const preview = deriveLockedShelfStemPreviewFromProfile(profile);
    assert.ok(preview);
    assert.equal(preview!.publicTitle, 'アナリスト');
  });

  it('birthProfileToFulfillmentFields defaults country to JP', () => {
    const fields = birthProfileToFulfillmentFields({
      nickname: 'A',
      birthDate: '1990-01-01',
      birthTimeUnknown: true,
    });
    assert.ok(fields);
    assert.equal(fields!.country, 'JP');
  });
});

describe('DtrShelfPanel locked path guard', () => {
  it('does not use essenceStemLaneIndex in DtrShelfPanel source', () => {
    const src = readFileSync(
      join(process.cwd(), 'components/dtr/DtrShelfPanel.tsx'),
      'utf8',
    );
    assert.doesNotMatch(src, /essenceStemLaneIndex/);
    assert.match(src, /deriveLockedShelfStemPreviewFromProfile/);
  });
});
