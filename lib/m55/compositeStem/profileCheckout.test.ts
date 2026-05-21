import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_COUNTRY,
  enrichBirthProfileForSave,
  isV2ProfileFieldsComplete,
  mergeBirthProfileWithDraftExtra,
  v2ProfileBlockReason,
} from '../../soul/birthProfileV2';
import { validateDtrCheckoutProfile } from './checkoutProfileGate';
import { buildStripeCheckoutMetadataFromProfile } from './stripeCheckoutMetadata';
import { INPUT_VERSION_V1, ENGINE_VERSION_V2 } from './constants';
import { runM55CompositeStemPipeline } from './pipeline';
import type { M55CompositeCanonicalInput } from './types';

const GOLDEN: M55CompositeCanonicalInput = {
  birthDate: '1983-02-28',
  birthTime: '12:00',
  birthTimeUnknown: false,
  country: 'JP',
  birthplace: '東京都',
  timezone: 'Asia/Tokyo',
  locale: 'ja-JP',
  nickname: 'GX',
  contextScope: 'dtr',
  calendarSystem: 'gregorian_civil',
};

describe('profile v2 checkout readiness', () => {
  it('allows checkout when birthTime is set', () => {
    const p = enrichBirthProfileForSave({
      nickname: 'A',
      birthDate: '1990-01-01',
      birthTime: '09:30',
      birthTimeUnknown: false,
      country: 'JP',
    });
    assert.equal(v2ProfileBlockReason(p), null);
    assert.equal(validateDtrCheckoutProfile(p).ok, true);
  });

  it('allows checkout when birthTimeUnknown is true', () => {
    const p = enrichBirthProfileForSave({
      nickname: 'A',
      birthDate: '1990-01-01',
      birthTimeUnknown: true,
      country: 'JP',
    });
    assert.equal(isV2ProfileFieldsComplete(p), true);
    assert.equal(validateDtrCheckoutProfile(p).ok, true);
  });

  it('blocks when birthTime empty and unknown not selected', () => {
    const p = { nickname: 'A', birthDate: '1990-01-01', country: 'JP' };
    assert.equal(v2ProfileBlockReason(p), 'birth_time_or_unknown');
    assert.equal(validateDtrCheckoutProfile(p).ok, false);
  });

  it('defaults country to JP on enrich save', () => {
    const p = enrichBirthProfileForSave({
      nickname: 'A',
      birthDate: '1990-01-01',
      birthTimeUnknown: true,
    });
    assert.equal(p.country, DEFAULT_COUNTRY);
    assert.equal(p.timezone, 'Asia/Tokyo');
  });

  it('metadata payload contains v2 fields', () => {
    const p = enrichBirthProfileForSave({
      nickname: 'テスト',
      birthDate: '1983-02-28',
      birthTime: '12:00',
      birthTimeUnknown: false,
      country: 'JP',
      birthplace: '東京都',
    });
    const meta = buildStripeCheckoutMetadataFromProfile(p, 'DTR_CORE_STATIC_V1');
    assert.equal(meta.profileBirthDate, '1983-02-28');
    assert.equal(meta.profileBirthTime, '12:00');
    assert.equal(meta.profileBirthTimeUnknown, 'false');
    assert.equal(meta.profileCountry, 'JP');
    assert.equal(meta.profileBirthplace, '東京都');
    assert.equal(meta.profileTimezone, 'Asia/Tokyo');
    assert.equal(meta.inputVersion, INPUT_VERSION_V1);
    assert.equal(meta.engineVersionCandidate, ENGINE_VERSION_V2);
    assert.ok(meta.calculationMode);
  });

  it('merges draft extra_json without raw secrets', () => {
    const merged = mergeBirthProfileWithDraftExtra(
      { nickname: 'A', birthDate: '1990-01-01' },
      {
        birthTimeUnknown: true,
        country: 'JP',
        email: 'must-not-leak@example.com',
        userId: 'secret-id',
      },
    );
    assert.ok(merged);
    assert.equal(merged!.birthTimeUnknown, true);
    assert.equal(validateDtrCheckoutProfile(merged).ok, true);
    const meta = buildStripeCheckoutMetadataFromProfile(merged!, 'DTR_CORE_STATIC_V1');
    assert.equal(meta.profileBirthTimeUnknown, 'true');
    assert.equal((meta as Record<string, string>).email, undefined);
    assert.equal((meta as Record<string, string>).userId, undefined);
  });
});

describe('GX-01 golden (pipeline)', () => {
  it('1983-02-28 Tokyo noon → stem 9 / 癸', () => {
    const out = runM55CompositeStemPipeline(GOLDEN);
    assert.equal(out.stemLaneIndex, 9);
    assert.equal(out.stemChar, '癸');
  });
});
