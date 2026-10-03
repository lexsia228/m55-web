import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { resetCalendarBundleCacheForTests } from '../calendar/loadCalendarBundle';
import { buildPrivacySafeShareCardV1 } from '../freeResult/privacySafeShareCardV1';
import { resolveCorePublicStemDisplay } from '../publicStemDisplay';
import { buildCoreResultClient } from './buildCoreResult.client';
import { CORE_ENGINE_VERSION } from './coreEngineVersion';
import {
  ensureSealedCoreResult,
  promoteGuestCoreSnapshotToClerkUser,
  readCoreIdentityContinuity,
} from './store';
import type { CoreIdentityContinuityV1, CoreResult, SealedCoreEnvelopeV3 } from './types';

const DEVICE_ID = 'identity-consistency-device';
const BIRTH = '1992-12-19';
const NICK = 'mi';
const STALE_ENGINE = 'm55-core-canonical-v1';
const LEGACY_SEALED_AT = '2020-01-01T00:00:00.000Z';

const storage = new Map<string, string>();
let failV3Writes = false;

function v3Key(ownerId: string): string {
  return `m55_core_result_v3_${ownerId}`;
}

function v1Key(ownerId: string): string {
  return `m55_core_result_v1_${ownerId}`;
}

function installBrowserGlobals(): void {
  Object.defineProperty(globalThis, 'window', {
    value: {},
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (failV3Writes && key.startsWith('m55_core_result_v3_')) {
          throw new Error('quota');
        }
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    },
    configurable: true,
    writable: true,
  });
}

function profile(nickname = NICK, birthDate = BIRTH) {
  return { nickname, birthDate };
}

function legacyRecord(options?: {
  nickname?: string;
  birthDate?: string;
  stemLaneIndex?: number;
  publicTitle?: string;
  sealedAt?: string;
}) {
  return {
    version: 1,
    sealedInputs: {
      birthDate: options?.birthDate ?? BIRTH,
      nickname: options?.nickname ?? NICK,
    },
    sealedAt: options?.sealedAt ?? LEGACY_SEALED_AT,
    stemLaneIndex: options?.stemLaneIndex ?? 5,
    publicTitle: options?.publicTitle ?? 'プロデューサー',
    symbol: '大地',
    displayOneLine: 'legacy',
    summaryShort: 'legacy-summary',
    keywords: [],
    focusAreas: [],
  };
}

function staleEnvelope(options?: {
  nickname?: string;
  birthDate?: string;
  stemLaneIndex?: number;
  engineVersion?: string;
  lockedAt?: string;
  coreType?: string;
  coreLabel?: string;
  identityContinuity?: CoreIdentityContinuityV1;
}): SealedCoreEnvelopeV3 {
  const coreResult = {
    stemLaneIndex: options?.stemLaneIndex ?? 5,
    coreType: options?.coreType ?? 'TYPE_06',
    coreLabel: options?.coreLabel ?? 'STALE_LABEL',
    coreSummary: 'stale-summary',
    coreAxisScores: {
      socialEnergy: 1,
      stability: 1,
      openness: 1,
      cooperation: 1,
      structure: 1,
    },
    axisDetails: [],
    composition: { dominantAxes: [], secondaryAxes: [] },
    affinities: [],
    strengths: [],
    cautions: [],
    workStyle: { summary: 'stale', strengths: [], cautions: [] },
    relationships: { summary: 'stale', strengths: [], cautions: [] },
    love: { summary: 'stale', strengths: [], cautions: [] },
    engineVersion: options?.engineVersion ?? STALE_ENGINE,
    lockedAt: options?.lockedAt ?? '2019-05-05T00:00:00.000Z',
  } as CoreResult;
  const envelope: SealedCoreEnvelopeV3 = {
    schemaVersion: 3,
    sealedInputs: {
      birthDate: options?.birthDate ?? BIRTH,
      nickname: options?.nickname ?? NICK,
    },
    coreResult,
  };
  if (options?.identityContinuity) envelope.identityContinuity = options.identityContinuity;
  return envelope;
}

function readStoredEnvelope(ownerId: string): SealedCoreEnvelopeV3 | null {
  const raw = storage.get(v3Key(ownerId));
  if (!raw) return null;
  return JSON.parse(raw) as SealedCoreEnvelopeV3;
}

function saveOwnerProfile(ownerId: string, nickname = NICK, birthDate = BIRTH): void {
  storage.set(
    `m55_profile_v1_${ownerId}`,
    JSON.stringify({ nickname, birthDate }),
  );
}

function assertCurrentPlanner(result: CoreResult): void {
  assert.equal(result.stemLaneIndex, 1);
  assert.equal(result.engineVersion, CORE_ENGINE_VERSION);
  assert.equal(resolveCorePublicStemDisplay(result).publicTitle, 'プランナー');
  assert.equal(result.coreLabel.includes('プロデューサー'), false);
  assert.equal(JSON.stringify(result).includes('プロデューサー'), false);
  const share = buildPrivacySafeShareCardV1({ stemLaneIndex: result.stemLaneIndex });
  assert.ok(share);
  assert.equal(share.stemLaneIndex, 1);
  assert.equal(share.traitNameJa, 'プランナー');
  assert.equal(share.imagePath.includes('producer'), false);
}

describe('personal free legacy/v2 identity consistency', () => {
  beforeEach(() => {
    storage.clear();
    failV3Writes = false;
    storage.set('m55_device_id_v1', DEVICE_ID);
    installBrowserGlobals();
    resetCalendarBundleCacheForTests();
  });

  afterEach(() => {
    storage.clear();
    failV3Writes = false;
  });

  it('T1 1992-12-19 legacy Producer migrates to current Planner', () => {
    const userId = 'user_t1';
    saveOwnerProfile(userId);
    storage.set(v1Key(userId), JSON.stringify(legacyRecord()));

    const result = ensureSealedCoreResult(userId, profile());
    const stored = readStoredEnvelope(userId);
    const continuity = readCoreIdentityContinuity(userId);

    assertCurrentPlanner(result);
    assert.ok(stored);
    assert.equal(stored.schemaVersion, 3);
    assert.equal(stored.coreResult.engineVersion, CORE_ENGINE_VERSION);
    assert.equal(stored.coreResult.stemLaneIndex, 1);
    assert.equal(JSON.stringify(stored).includes('generatedAt'), false);
    assert.ok(continuity);
    assert.equal(continuity.source, 'legacy_v1');
    assert.equal(continuity.previousStemLaneIndex, 5);
    assert.equal(continuity.previousPublicTitle, 'プロデューサー');
    assert.equal(continuity.previousEngineVersion, null);
    assert.equal(continuity.currentStemLaneIndex, 1);
    assert.equal(continuity.currentPublicTitle, 'プランナー');
    assert.equal(continuity.currentEngineVersion, CORE_ENGINE_VERSION);
    assert.equal(continuity.publicIdentityChanged, true);
    assert.equal(storage.has(v1Key(userId)), false);
  });

  it('T2 current result, public display, and share identity stay Planner', () => {
    const userId = 'user_t2';
    storage.set(v1Key(userId), JSON.stringify(legacyRecord({ publicTitle: 'プロデューサー' })));

    const result = ensureSealedCoreResult(userId, profile());
    const stored = readStoredEnvelope(userId);

    assertCurrentPlanner(result);
    assert.ok(stored);
    assertCurrentPlanner(stored.coreResult);
    assert.equal(stored.coreResult.coreSummary.includes('プロデューサー'), false);
  });

  it('T3 same-identity legacy keeps canonical result and changed false', () => {
    const userId = 'user_t3';
    saveOwnerProfile(userId);
    const legacy = legacyRecord({ stemLaneIndex: 1, publicTitle: 'プランナー' });
    storage.set(v1Key(userId), JSON.stringify(legacy));

    const result = ensureSealedCoreResult(userId, profile());
    const fresh = buildCoreResultClient(profile());
    const continuity = readCoreIdentityContinuity(userId);

    assert.equal(result.stemLaneIndex, fresh.stemLaneIndex);
    assert.equal(result.coreLabel, fresh.coreLabel);
    assert.equal(result.coreSummary, fresh.coreSummary);
    assert.deepEqual(result.axisDetails, fresh.axisDetails);
    assert.equal(result.engineVersion, fresh.engineVersion);
    assert.equal(result.lockedAt, legacy.sealedAt);
    assert.ok(continuity);
    assert.equal(continuity.source, 'legacy_v1');
    assert.equal(continuity.publicIdentityChanged, false);
    assert.equal(continuity.previousStemLaneIndex, 1);
    assert.equal(continuity.currentPublicTitle, 'プランナー');
  });

  it('T4 stale v3 only records previous identity and reseals canonical v2', () => {
    const userId = 'user_t4';
    saveOwnerProfile(userId);
    storage.set(
      v3Key(userId),
      JSON.stringify(staleEnvelope({ stemLaneIndex: 5, coreLabel: 'NOT_THE_PUBLIC_TITLE' })),
    );

    const result = ensureSealedCoreResult(userId, profile());
    const continuity = readCoreIdentityContinuity(userId);
    const stored = readStoredEnvelope(userId);

    assertCurrentPlanner(result);
    assert.equal(result.coreLabel, 'TYPE_02');
    assert.ok(continuity);
    assert.equal(continuity.source, 'stale_v3');
    assert.equal(continuity.previousStemLaneIndex, 5);
    assert.equal(continuity.previousPublicTitle, 'プロデューサー');
    assert.equal(continuity.previousCoreLabel, 'NOT_THE_PUBLIC_TITLE');
    assert.equal(continuity.previousEngineVersion, STALE_ENGINE);
    assert.equal(continuity.currentStemLaneIndex, 1);
    assert.equal(continuity.currentPublicTitle, 'プランナー');
    assert.equal(continuity.publicIdentityChanged, true);
    assert.ok(stored);
    assert.equal(stored.coreResult.engineVersion, CORE_ENGINE_VERSION);
    assert.equal(stored.coreResult.coreLabel.includes('NOT_THE_PUBLIC_TITLE'), false);
  });

  it('T5 matching stale v3 stays primary previous identity over legacy', () => {
    const userId = 'user_t5';
    saveOwnerProfile(userId);
    storage.set(v3Key(userId), JSON.stringify(staleEnvelope({ stemLaneIndex: 5 })));
    storage.set(
      v1Key(userId),
      JSON.stringify(legacyRecord({ stemLaneIndex: 9, publicTitle: 'アナリスト' })),
    );

    const result = ensureSealedCoreResult(userId, profile());
    const continuity = readCoreIdentityContinuity(userId);

    assertCurrentPlanner(result);
    assert.equal(result.stemLaneIndex, 1);
    assert.ok(continuity);
    assert.equal(continuity.source, 'stale_v3');
    assert.equal(continuity.previousStemLaneIndex, 5);
    assert.equal(continuity.previousPublicTitle, 'プロデューサー');
    assert.notEqual(continuity.previousStemLaneIndex, 9);
    assert.notEqual(continuity.previousPublicTitle, 'アナリスト');
    assert.equal(storage.has(v1Key(userId)), true);
  });

  it('T6 usable current v3 stays unchanged and retains leftover legacy', () => {
    const userId = 'user_t6';
    saveOwnerProfile(userId);
    const continuity: CoreIdentityContinuityV1 = {
      version: 'core_identity_continuity_v1',
      source: 'legacy_v1',
      previousStemLaneIndex: 5,
      previousPublicTitle: 'プロデューサー',
      previousCoreLabel: null,
      previousEngineVersion: null,
      currentStemLaneIndex: 1,
      currentPublicTitle: 'プランナー',
      currentEngineVersion: CORE_ENGINE_VERSION,
      publicIdentityChanged: true,
    };
    const existing = staleEnvelope({
      stemLaneIndex: 1,
      engineVersion: CORE_ENGINE_VERSION,
      lockedAt: 'locked-sentinel',
      coreType: 'TYPE_02',
      coreLabel: 'TYPE_02',
      identityContinuity: continuity,
    });
    const before = JSON.stringify(existing);
    storage.set(v3Key(userId), before);
    storage.set(v1Key(userId), JSON.stringify(legacyRecord()));

    const result = ensureSealedCoreResult(userId, profile());

    assert.equal(storage.get(v3Key(userId)), before);
    assert.equal(result.lockedAt, 'locked-sentinel');
    assert.equal(result.stemLaneIndex, 1);
    assert.equal(result.engineVersion, CORE_ENGINE_VERSION);
    assert.deepEqual(readCoreIdentityContinuity(userId), continuity);
    assert.equal(storage.has(v1Key(userId)), true);
  });

  it('T7 legacy-only guest promotion writes current Clerk v3', () => {
    const clerkId = 'user_clerk_t7';
    saveOwnerProfile(clerkId);
    storage.set(v1Key(DEVICE_ID), JSON.stringify(legacyRecord()));

    const promoted = promoteGuestCoreSnapshotToClerkUser(clerkId);
    const stored = readStoredEnvelope(clerkId);
    const continuity = readCoreIdentityContinuity(clerkId);

    assert.equal(promoted, true);
    assert.ok(stored);
    assertCurrentPlanner(stored.coreResult);
    assert.ok(continuity);
    assert.equal(continuity.source, 'legacy_v1');
    assert.equal(continuity.previousStemLaneIndex, 5);
    assert.equal(continuity.previousPublicTitle, 'プロデューサー');
    assert.equal(continuity.currentStemLaneIndex, 1);
    assert.equal(continuity.publicIdentityChanged, true);
    assert.equal(storage.has(v1Key(DEVICE_ID)), false);
    assert.equal(stored.coreResult.stemLaneIndex === 5, false);
  });

  it('T8 stale guest v3 promotion rebuilds canonical Clerk v3', () => {
    const clerkId = 'user_clerk_t8';
    saveOwnerProfile(clerkId);
    const stale = staleEnvelope({ stemLaneIndex: 5, lockedAt: 'stale-guest-lock' });
    storage.set(v3Key(DEVICE_ID), JSON.stringify(stale));
    storage.set(
      v1Key(DEVICE_ID),
      JSON.stringify(legacyRecord({ stemLaneIndex: 9, publicTitle: 'アナリスト' })),
    );

    const promoted = promoteGuestCoreSnapshotToClerkUser(clerkId);
    const stored = readStoredEnvelope(clerkId);
    const continuity = readCoreIdentityContinuity(clerkId);

    assert.equal(promoted, true);
    assert.ok(stored);
    assertCurrentPlanner(stored.coreResult);
    assert.notEqual(stored.coreResult.engineVersion, STALE_ENGINE);
    assert.notEqual(stored.coreResult.lockedAt, 'stale-guest-lock');
    assert.notEqual(stored.coreResult.coreLabel, 'STALE_LABEL');
    assert.ok(continuity);
    assert.equal(continuity.source, 'stale_v3');
    assert.equal(continuity.previousStemLaneIndex, 5);
    assert.equal(continuity.previousPublicTitle, 'プロデューサー');
    assert.equal(continuity.previousCoreLabel, 'STALE_LABEL');
    assert.notEqual(continuity.previousPublicTitle, 'アナリスト');
    assert.equal(storage.has(v1Key(DEVICE_ID)), true);
    assert.equal(storage.get(v3Key(DEVICE_ID)), JSON.stringify(stale));
  });

  it('T9 guest and Clerk profile mismatch does not promote', () => {
    const clerkId = 'user_clerk_t9';
    saveOwnerProfile(clerkId, NICK, BIRTH);
    storage.set(
      v3Key(DEVICE_ID),
      JSON.stringify(staleEnvelope({ nickname: 'other', birthDate: '1983-02-28', stemLaneIndex: 5 })),
    );
    storage.set(
      v1Key(DEVICE_ID),
      JSON.stringify(legacyRecord({ nickname: 'other', birthDate: '1983-02-28' })),
    );

    const promoted = promoteGuestCoreSnapshotToClerkUser(clerkId);

    assert.equal(promoted, false);
    assert.equal(storage.has(v3Key(clerkId)), false);
    assert.equal(storage.has(v1Key(DEVICE_ID)), true);
    assert.equal(storage.has(v3Key(DEVICE_ID)), true);
  });

  it('T10 malformed legacy and canonical failure do not fall back to legacy identity', () => {
    const malformedUser = 'user_t10_malformed';
    storage.set(
      v1Key(malformedUser),
      JSON.stringify({
        version: 1,
        stemLaneIndex: 5,
        publicTitle: 'プロデューサー',
        sealedInputs: { birthDate: BIRTH },
      }),
    );

    const result = ensureSealedCoreResult(malformedUser, profile());
    assertCurrentPlanner(result);
    assert.equal(readCoreIdentityContinuity(malformedUser), null);
    assert.equal(storage.has(v1Key(malformedUser)), true);

    const failingUser = 'user_t10_fail';
    storage.set(
      v1Key(failingUser),
      JSON.stringify(legacyRecord({ birthDate: 'not-a-date' })),
    );
    assert.throws(() => ensureSealedCoreResult(failingUser, profile('mi', 'not-a-date')));
    assert.equal(storage.has(v3Key(failingUser)), false);
    assert.equal(storage.has(v1Key(failingUser)), true);
    assert.equal(storage.get(v1Key(failingUser))?.includes('プロデューサー'), true);
  });

  it('T11 storage write failure keeps legacy evidence', () => {
    const userId = 'user_t11';
    storage.set(v1Key(userId), JSON.stringify(legacyRecord()));
    failV3Writes = true;

    const result = ensureSealedCoreResult(userId, profile());

    assertCurrentPlanner(result);
    assert.equal(storage.has(v3Key(userId)), false);
    assert.equal(storage.has(v1Key(userId)), true);
    assert.equal(storage.get(v1Key(userId))?.includes('プロデューサー'), true);
  });

  it('T12 fresh current v3 does not change an existing canonical result', () => {
    const userId = 'user_t12';
    const first = ensureSealedCoreResult(userId, profile());
    const storedBefore = storage.get(v3Key(userId));
    const second = ensureSealedCoreResult(userId, profile());

    assert.deepEqual(second, first);
    assert.equal(storage.get(v3Key(userId)), storedBefore);
    assert.equal(readCoreIdentityContinuity(userId), null);
    assert.equal(second.engineVersion, CORE_ENGINE_VERSION);
    assert.equal(second.stemLaneIndex, 1);
  });

  it('T13 1992-12-19 nickname variation stays lane 1 / Planner', () => {
    const alpha = ensureSealedCoreResult('user_t13_a', profile('alpha'));
    const beta = ensureSealedCoreResult('user_t13_b', profile('beta'));

    assertCurrentPlanner(alpha);
    assertCurrentPlanner(beta);
    assert.equal(alpha.stemLaneIndex, beta.stemLaneIndex);
    assert.equal(
      resolveCorePublicStemDisplay(alpha).publicTitle,
      resolveCorePublicStemDisplay(beta).publicTitle,
    );
  });

  it('T14 pre-lane stale v3 keeps the stored coreLabel and invents no lane', () => {
    const userId = 'user_t14';
    saveOwnerProfile(userId);
    const historical = {
      schemaVersion: 3,
      sealedInputs: { birthDate: BIRTH, nickname: NICK },
      coreResult: {
        coreType: 'TYPE_OLD',
        coreLabel: '直観展開型',
        coreSummary: 'historical-summary',
        engineVersion: STALE_ENGINE,
        lockedAt: '2026-04-01T00:00:00.000Z',
      },
    };
    assert.equal(Object.prototype.hasOwnProperty.call(historical.coreResult, 'stemLaneIndex'), false);
    storage.set(v3Key(userId), JSON.stringify(historical));

    const result = ensureSealedCoreResult(userId, profile());
    const storedRaw = storage.get(v3Key(userId));
    const continuity = readCoreIdentityContinuity(userId);

    assertCurrentPlanner(result);
    assert.ok(storedRaw);
    assert.match(storedRaw, /"previousStemLaneIndex":null/);
    assert.equal(storedRaw.includes('プロデューサー'), false);
    assert.ok(continuity);
    assert.equal(continuity.source, 'stale_v3');
    assert.equal(continuity.previousStemLaneIndex, null);
    assert.equal(continuity.previousPublicTitle, null);
    assert.equal(continuity.previousCoreLabel, '直観展開型');
    assert.equal(continuity.currentStemLaneIndex, 1);
    assert.equal(continuity.currentPublicTitle, 'プランナー');
    assert.equal(continuity.publicIdentityChanged, continuity.previousCoreLabel !== result.coreLabel);
    assert.equal(continuity.publicIdentityChanged, true);
    assert.equal(result.coreLabel, 'TYPE_02');

    const roundTrip = JSON.parse(storedRaw) as { identityContinuity: { previousStemLaneIndex: unknown } };
    assert.equal(roundTrip.identityContinuity.previousStemLaneIndex, null);
    assert.deepEqual(readCoreIdentityContinuity(userId), continuity);
  });

  it('T15 continuity stays bound to the current profile', () => {
    const userId = 'user_t15';
    saveOwnerProfile(userId, 'alpha', BIRTH);
    storage.set(v1Key(userId), JSON.stringify(legacyRecord({ nickname: 'alpha' })));

    ensureSealedCoreResult(userId, profile('alpha'));
    const bound = readCoreIdentityContinuity(userId);
    assert.ok(bound);
    assert.equal(bound.source, 'legacy_v1');

    saveOwnerProfile(userId, 'beta', '1983-02-28');
    assert.equal(readCoreIdentityContinuity(userId), null);
    assert.equal(readStoredEnvelope(userId)?.sealedInputs.nickname, 'alpha');
    assert.equal(readStoredEnvelope(userId)?.coreResult.stemLaneIndex, 1);
  });

  it('T16 malformed stale lane does not clamp a previous title', () => {
    const outOfRange = 'user_t16_range';
    saveOwnerProfile(outOfRange);
    storage.set(
      v3Key(outOfRange),
      JSON.stringify({
        schemaVersion: 3,
        sealedInputs: { birthDate: BIRTH, nickname: NICK },
        coreResult: {
          stemLaneIndex: 15,
          coreLabel: '直観展開型',
          engineVersion: STALE_ENGINE,
          lockedAt: '2026-04-02T00:00:00.000Z',
        },
      }),
    );

    const ranged = ensureSealedCoreResult(outOfRange, profile());
    const rangedContinuity = readCoreIdentityContinuity(outOfRange);
    assertCurrentPlanner(ranged);
    assert.ok(rangedContinuity);
    assert.equal(rangedContinuity.previousStemLaneIndex, null);
    assert.equal(rangedContinuity.previousPublicTitle, null);
    assert.equal(rangedContinuity.previousCoreLabel, '直観展開型');
    assert.equal(storage.get(v3Key(outOfRange))?.includes('プロデューサー'), false);

    const fractional = 'user_t16_fraction';
    saveOwnerProfile(fractional);
    storage.set(
      v3Key(fractional),
      JSON.stringify({
        schemaVersion: 3,
        sealedInputs: { birthDate: BIRTH, nickname: NICK },
        coreResult: {
          stemLaneIndex: 5.5,
          coreLabel: '   ',
          engineVersion: 1,
          lockedAt: '2026-04-03T00:00:00.000Z',
        },
      }),
    );

    const fractionResult = ensureSealedCoreResult(fractional, profile());
    const fractionContinuity = readCoreIdentityContinuity(fractional);
    assertCurrentPlanner(fractionResult);
    assert.ok(fractionContinuity);
    assert.equal(fractionContinuity.previousStemLaneIndex, null);
    assert.equal(fractionContinuity.previousPublicTitle, null);
    assert.equal(fractionContinuity.previousCoreLabel, null);
    assert.equal(fractionContinuity.previousEngineVersion, null);
    assert.equal(fractionContinuity.publicIdentityChanged, false);
  });

  it('T17 current v3 without continuity keeps the result and records legacy evidence', () => {
    const userId = 'user_t17';
    saveOwnerProfile(userId);
    const existing = staleEnvelope({
      stemLaneIndex: 1,
      engineVersion: CORE_ENGINE_VERSION,
      lockedAt: 'current-lock-t17',
      coreType: 'TYPE_02',
      coreLabel: 'TYPE_02',
    });
    storage.set(v3Key(userId), JSON.stringify(existing));
    storage.set(v1Key(userId), JSON.stringify(legacyRecord()));
    const before = JSON.parse(JSON.stringify(existing.coreResult)) as CoreResult;

    const result = ensureSealedCoreResult(userId, profile());
    const stored = readStoredEnvelope(userId);
    const continuity = readCoreIdentityContinuity(userId);

    assert.deepEqual(result, before);
    assert.ok(stored);
    assert.deepEqual(stored.coreResult, before);
    assert.equal(JSON.stringify(stored.coreResult), JSON.stringify(before));
    assert.equal(stored.coreResult.lockedAt, 'current-lock-t17');
    assert.ok(continuity);
    assert.equal(continuity.source, 'legacy_v1');
    assert.equal(continuity.previousStemLaneIndex, 5);
    assert.equal(continuity.previousPublicTitle, 'プロデューサー');
    assert.equal(continuity.currentStemLaneIndex, 1);
    assert.equal(continuity.currentPublicTitle, 'プランナー');
    assert.equal(storage.has(v1Key(userId)), false);
  });

  it('T18 enrichment write failure keeps legacy evidence and the current result', () => {
    const userId = 'user_t18';
    saveOwnerProfile(userId);
    const existing = staleEnvelope({
      stemLaneIndex: 1,
      engineVersion: CORE_ENGINE_VERSION,
      lockedAt: 'current-lock-t18',
      coreType: 'TYPE_02',
      coreLabel: 'TYPE_02',
    });
    const beforeRaw = JSON.stringify(existing);
    storage.set(v3Key(userId), beforeRaw);
    storage.set(v1Key(userId), JSON.stringify(legacyRecord()));
    failV3Writes = true;

    const result = ensureSealedCoreResult(userId, profile());

    assert.deepEqual(result, existing.coreResult);
    assert.equal(storage.get(v3Key(userId)), beforeRaw);
    assert.equal(storage.has(v1Key(userId)), true);
    assert.equal(readCoreIdentityContinuity(userId), null);
  });

  it('T19 valid stale_v3 continuity stays primary over leftover legacy', () => {
    const userId = 'user_t19';
    saveOwnerProfile(userId);
    const continuity: CoreIdentityContinuityV1 = {
      version: 'core_identity_continuity_v1',
      source: 'stale_v3',
      previousStemLaneIndex: 5,
      previousPublicTitle: 'プロデューサー',
      previousCoreLabel: 'STALE_LABEL',
      previousEngineVersion: STALE_ENGINE,
      currentStemLaneIndex: 1,
      currentPublicTitle: 'プランナー',
      currentEngineVersion: CORE_ENGINE_VERSION,
      publicIdentityChanged: true,
    };
    const existing = staleEnvelope({
      stemLaneIndex: 1,
      engineVersion: CORE_ENGINE_VERSION,
      lockedAt: 'current-lock-t19',
      coreType: 'TYPE_02',
      coreLabel: 'TYPE_02',
      identityContinuity: continuity,
    });
    const beforeRaw = JSON.stringify(existing);
    storage.set(v3Key(userId), beforeRaw);
    storage.set(v1Key(userId), JSON.stringify(legacyRecord({ stemLaneIndex: 9, publicTitle: 'アナリスト' })));

    const result = ensureSealedCoreResult(userId, profile());

    assert.equal(storage.get(v3Key(userId)), beforeRaw);
    assert.deepEqual(result, existing.coreResult);
    assert.equal(readCoreIdentityContinuity(userId)?.source, 'stale_v3');
    assert.equal(readCoreIdentityContinuity(userId)?.previousStemLaneIndex, 5);
    assert.notEqual(readCoreIdentityContinuity(userId)?.previousPublicTitle, 'アナリスト');
    assert.equal(storage.has(v1Key(userId)), true);
  });

  it('T20 invalid target DOB not-a-date does not promote a current guest v3', () => {
    const clerkId = 'user_clerk_t20';
    saveOwnerProfile(clerkId, NICK, 'not-a-date');
    storage.set(
      v3Key(DEVICE_ID),
      JSON.stringify(
        staleEnvelope({
          birthDate: 'not-a-date',
          stemLaneIndex: 1,
          engineVersion: CORE_ENGINE_VERSION,
          lockedAt: 'guest-current',
        }),
      ),
    );

    assert.equal(promoteGuestCoreSnapshotToClerkUser(clerkId), false);
    assert.equal(storage.has(v3Key(clerkId)), false);
    assert.equal(storage.has(v3Key(DEVICE_ID)), true);
  });

  it('T21 invalid civil DOB 2026-02-30 fails promotion and continuity read', () => {
    const clerkId = 'user_clerk_t21';
    saveOwnerProfile(clerkId, NICK, '2026-02-30');
    storage.set(
      v3Key(clerkId),
      JSON.stringify(
        staleEnvelope({
          birthDate: '2026-02-30',
          stemLaneIndex: 1,
          engineVersion: CORE_ENGINE_VERSION,
          identityContinuity: {
            version: 'core_identity_continuity_v1',
            source: 'legacy_v1',
            previousStemLaneIndex: 5,
            previousPublicTitle: 'プロデューサー',
            previousCoreLabel: null,
            previousEngineVersion: null,
            currentStemLaneIndex: 1,
            currentPublicTitle: 'プランナー',
            currentEngineVersion: CORE_ENGINE_VERSION,
            publicIdentityChanged: true,
          },
        }),
      ),
    );
    const beforeClerk = storage.get(v3Key(clerkId));
    storage.set(
      v3Key(DEVICE_ID),
      JSON.stringify(
        staleEnvelope({
          birthDate: '2026-02-30',
          stemLaneIndex: 1,
          engineVersion: CORE_ENGINE_VERSION,
        }),
      ),
    );

    assert.equal(promoteGuestCoreSnapshotToClerkUser(clerkId), false);
    assert.equal(readCoreIdentityContinuity(clerkId), null);
    assert.equal(storage.get(v3Key(clerkId)), beforeClerk);
  });

  it('T22 malformed partial DOB fails closed', () => {
    const clerkId = 'user_clerk_t22';
    saveOwnerProfile(clerkId, NICK, '1992-12');
    storage.set(
      v3Key(clerkId),
      JSON.stringify(
        staleEnvelope({
          birthDate: '1992-12',
          stemLaneIndex: 1,
          engineVersion: CORE_ENGINE_VERSION,
          identityContinuity: {
            version: 'core_identity_continuity_v1',
            source: 'stale_v3',
            previousStemLaneIndex: null,
            previousPublicTitle: null,
            previousCoreLabel: '直観展開型',
            previousEngineVersion: STALE_ENGINE,
            currentStemLaneIndex: 1,
            currentPublicTitle: 'プランナー',
            currentEngineVersion: CORE_ENGINE_VERSION,
            publicIdentityChanged: true,
          },
        }),
      ),
    );
    storage.set(v3Key(DEVICE_ID), JSON.stringify(staleEnvelope({ birthDate: '1992-12', stemLaneIndex: 1, engineVersion: CORE_ENGINE_VERSION })));

    const clerkBefore = storage.get(v3Key(clerkId));
    const guestBefore = storage.get(v3Key(DEVICE_ID));
    assert.ok(clerkBefore);
    assert.ok(guestBefore);

    assert.equal(promoteGuestCoreSnapshotToClerkUser(clerkId), false);
    assert.equal(readCoreIdentityContinuity(clerkId), null);
    assert.equal(storage.get(v3Key(clerkId)), clerkBefore);
    assert.equal(storage.get(v3Key(DEVICE_ID)), guestBefore);
  });

  it('T23 contradictory continuity engine is not returned', () => {
    const userId = 'user_t23';
    saveOwnerProfile(userId);
    storage.set(
      v3Key(userId),
      JSON.stringify(
        staleEnvelope({
          stemLaneIndex: 1,
          engineVersion: CORE_ENGINE_VERSION,
          coreType: 'TYPE_02',
      coreLabel: 'TYPE_02',
          identityContinuity: {
            version: 'core_identity_continuity_v1',
            source: 'legacy_v1',
            previousStemLaneIndex: 5,
            previousPublicTitle: 'プロデューサー',
            previousCoreLabel: null,
            previousEngineVersion: null,
            currentStemLaneIndex: 1,
            currentPublicTitle: 'プランナー',
            currentEngineVersion: 'bogus-engine',
            publicIdentityChanged: true,
          },
        }),
      ),
    );

    assert.equal(readCoreIdentityContinuity(userId), null);
    assert.equal(ensureSealedCoreResult(userId, profile()).stemLaneIndex, 1);
  });

  it('T24 contradictory continuity lane and title are not returned', () => {
    const userId = 'user_t24';
    saveOwnerProfile(userId);
    storage.set(
      v3Key(userId),
      JSON.stringify(
        staleEnvelope({
          stemLaneIndex: 1,
          engineVersion: CORE_ENGINE_VERSION,
          coreType: 'TYPE_02',
      coreLabel: 'TYPE_02',
          lockedAt: 'lane-lock-t24',
          identityContinuity: {
            version: 'core_identity_continuity_v1',
            source: 'legacy_v1',
            previousStemLaneIndex: 5,
            previousPublicTitle: 'プロデューサー',
            previousCoreLabel: null,
            previousEngineVersion: null,
            currentStemLaneIndex: 9,
            currentPublicTitle: 'アナリスト',
            currentEngineVersion: CORE_ENGINE_VERSION,
            publicIdentityChanged: true,
          },
        }),
      ),
    );

    assert.equal(readCoreIdentityContinuity(userId), null);
    const result = ensureSealedCoreResult(userId, profile());
    assert.equal(result.stemLaneIndex, 1);
    assert.equal(result.lockedAt, 'lane-lock-t24');
    assert.equal(resolveCorePublicStemDisplay(result).publicTitle, 'プランナー');
  });

  it('T25 empty previousEngineVersion does not survive as valid metadata', () => {
    const planted = 'user_t25_planted';
    saveOwnerProfile(planted);
    storage.set(
      v3Key(planted),
      JSON.stringify(
        staleEnvelope({
          stemLaneIndex: 1,
          engineVersion: CORE_ENGINE_VERSION,
          identityContinuity: {
            version: 'core_identity_continuity_v1',
            source: 'stale_v3',
            previousStemLaneIndex: 5,
            previousPublicTitle: 'プロデューサー',
            previousCoreLabel: null,
            previousEngineVersion: '',
            currentStemLaneIndex: 1,
            currentPublicTitle: 'プランナー',
            currentEngineVersion: CORE_ENGINE_VERSION,
            publicIdentityChanged: true,
          },
        }),
      ),
    );
    assert.equal(readCoreIdentityContinuity(planted), null);

    const built = 'user_t25_built';
    saveOwnerProfile(built);
    storage.set(
      v3Key(built),
      JSON.stringify(
        staleEnvelope({
          stemLaneIndex: 5,
          engineVersion: '',
          coreLabel: '直観展開型',
        }),
      ),
    );
    ensureSealedCoreResult(built, profile());
    const continuity = readCoreIdentityContinuity(built);
    assert.ok(continuity);
    assert.equal(continuity.previousEngineVersion, null);
    assert.equal(storage.get(v3Key(built))?.includes('"previousEngineVersion":""'), false);
  });

  it('T26 valid profile-bound continuity is returned', () => {
    const userId = 'user_t26';
    saveOwnerProfile(userId);
    const continuity: CoreIdentityContinuityV1 = {
      version: 'core_identity_continuity_v1',
      source: 'legacy_v1',
      previousStemLaneIndex: 5,
      previousPublicTitle: 'プロデューサー',
      previousCoreLabel: null,
      previousEngineVersion: null,
      currentStemLaneIndex: 1,
      currentPublicTitle: 'プランナー',
      currentEngineVersion: CORE_ENGINE_VERSION,
      publicIdentityChanged: true,
    };
    storage.set(
      v3Key(userId),
      JSON.stringify(
        staleEnvelope({
          stemLaneIndex: 1,
          engineVersion: CORE_ENGINE_VERSION,
          lockedAt: 'valid-lock-t26',
          coreType: 'TYPE_02',
      coreLabel: 'TYPE_02',
          identityContinuity: continuity,
        }),
      ),
    );

    assert.deepEqual(readCoreIdentityContinuity(userId), continuity);
    const result = ensureSealedCoreResult(userId, profile());
    assert.equal(result.lockedAt, 'valid-lock-t26');
    assert.equal(result.stemLaneIndex, 1);
    assert.deepEqual(readCoreIdentityContinuity(userId), continuity);
  });

  it('T27 current v3 without legacy does not fabricate continuity', () => {
    const userId = 'user_t27';
    saveOwnerProfile(userId);
    const existing = staleEnvelope({
      stemLaneIndex: 1,
      engineVersion: CORE_ENGINE_VERSION,
      lockedAt: 'bare-lock-t27',
      coreType: 'TYPE_02',
      coreLabel: 'TYPE_02',
    });
    const beforeRaw = JSON.stringify(existing);
    storage.set(v3Key(userId), beforeRaw);

    const result = ensureSealedCoreResult(userId, profile());

    assert.deepEqual(result, existing.coreResult);
    assert.equal(storage.get(v3Key(userId)), beforeRaw);
    assert.equal(readCoreIdentityContinuity(userId), null);
    assert.equal(storage.has(v1Key(userId)), false);
  });

  it('T28 current guest v3 legacy enrichment retires guest legacy only after target write', () => {
    const clerkId = 'user_clerk_t28';
    saveOwnerProfile(clerkId);
    const guest = staleEnvelope({
      stemLaneIndex: 1,
      engineVersion: CORE_ENGINE_VERSION,
      lockedAt: 'guest-current-t28',
      coreType: 'TYPE_02',
      coreLabel: 'TYPE_02',
    });
    storage.set(v3Key(DEVICE_ID), JSON.stringify(guest));
    storage.set(v1Key(DEVICE_ID), JSON.stringify(legacyRecord()));

    assert.equal(promoteGuestCoreSnapshotToClerkUser(clerkId), true);
    const stored = readStoredEnvelope(clerkId);
    assert.ok(stored);
    assert.deepEqual(stored.coreResult, guest.coreResult);
    assert.equal(stored.coreResult.stemLaneIndex, 1);
    assert.equal(stored.identityContinuity?.source, 'legacy_v1');
    assert.equal(stored.identityContinuity?.previousPublicTitle, 'プロデューサー');
    assert.equal(storage.has(v1Key(DEVICE_ID)), false);

    const clerkFail = 'user_clerk_t28_fail';
    saveOwnerProfile(clerkFail);
    storage.set(v3Key(DEVICE_ID), JSON.stringify(guest));
    storage.set(v1Key(DEVICE_ID), JSON.stringify(legacyRecord()));
    failV3Writes = true;

    assert.equal(promoteGuestCoreSnapshotToClerkUser(clerkFail), false);
    assert.equal(storage.has(v3Key(clerkFail)), false);
    assert.equal(storage.has(v1Key(DEVICE_ID)), true);
    assert.equal(storage.get(v3Key(DEVICE_ID)), JSON.stringify(guest));
  });

  it('T29 current Clerk without continuity receives guest legacy evidence', () => {
    const clerkId = 'user_clerk_t29';
    saveOwnerProfile(clerkId);
    const clerk = staleEnvelope({
      stemLaneIndex: 1,
      engineVersion: CORE_ENGINE_VERSION,
      lockedAt: 'clerk-lock-t29',
      coreType: 'TYPE_02',
      coreLabel: 'TYPE_02',
    });
    storage.set(v3Key(clerkId), JSON.stringify(clerk));
    storage.set(v1Key(DEVICE_ID), JSON.stringify(legacyRecord()));
    const beforeCore = JSON.stringify(clerk.coreResult);

    assert.equal(promoteGuestCoreSnapshotToClerkUser(clerkId), true);
    const stored = readStoredEnvelope(clerkId);
    assert.ok(stored);
    assert.equal(JSON.stringify(stored.coreResult), beforeCore);
    assert.deepEqual(stored.coreResult, clerk.coreResult);
    assert.equal(stored.coreResult.stemLaneIndex, 1);
    assert.equal(stored.identityContinuity?.source, 'legacy_v1');
    assert.equal(stored.identityContinuity?.previousStemLaneIndex, 5);
    assert.equal(stored.identityContinuity?.previousPublicTitle, 'プロデューサー');
    assert.equal(stored.identityContinuity?.currentPublicTitle, 'プランナー');
    assert.equal(storage.has(v1Key(DEVICE_ID)), false);
  });

  it('T30 Clerk legacy enrichment write failure keeps both envelopes', () => {
    const clerkId = 'user_clerk_t30';
    saveOwnerProfile(clerkId);
    const clerk = staleEnvelope({
      stemLaneIndex: 1,
      engineVersion: CORE_ENGINE_VERSION,
      lockedAt: 'clerk-lock-t30',
      coreType: 'TYPE_02',
      coreLabel: 'TYPE_02',
    });
    const beforeRaw = JSON.stringify(clerk);
    storage.set(v3Key(clerkId), beforeRaw);
    storage.set(v1Key(DEVICE_ID), JSON.stringify(legacyRecord()));
    failV3Writes = true;

    assert.equal(promoteGuestCoreSnapshotToClerkUser(clerkId), false);
    assert.equal(storage.get(v3Key(clerkId)), beforeRaw);
    assert.equal(storage.has(v1Key(DEVICE_ID)), true);
    assert.equal(readCoreIdentityContinuity(clerkId), null);
  });

  it('T31 invalid Clerk continuity is replaced by compatible guest continuity', () => {
    const clerkId = 'user_clerk_t31';
    saveOwnerProfile(clerkId);
    const clerk = staleEnvelope({
      stemLaneIndex: 1,
      engineVersion: CORE_ENGINE_VERSION,
      lockedAt: 'clerk-lock-t31',
      coreType: 'TYPE_02',
      coreLabel: 'TYPE_02',
      identityContinuity: {
        version: 'core_identity_continuity_v1',
        source: 'legacy_v1',
        previousStemLaneIndex: 5,
        previousPublicTitle: 'プロデューサー',
        previousCoreLabel: null,
        previousEngineVersion: null,
        currentStemLaneIndex: 9,
        currentPublicTitle: 'アナリスト',
        currentEngineVersion: CORE_ENGINE_VERSION,
        publicIdentityChanged: true,
      },
    });
    const guestContinuity: CoreIdentityContinuityV1 = {
      version: 'core_identity_continuity_v1',
      source: 'stale_v3',
      previousStemLaneIndex: 5,
      previousPublicTitle: 'プロデューサー',
      previousCoreLabel: '直観展開型',
      previousEngineVersion: STALE_ENGINE,
      currentStemLaneIndex: 1,
      currentPublicTitle: 'プランナー',
      currentEngineVersion: CORE_ENGINE_VERSION,
      publicIdentityChanged: true,
    };
    storage.set(v3Key(clerkId), JSON.stringify(clerk));
    storage.set(
      v3Key(DEVICE_ID),
      JSON.stringify(
        staleEnvelope({
          stemLaneIndex: 1,
          engineVersion: CORE_ENGINE_VERSION,
          lockedAt: 'guest-other-lock',
          identityContinuity: guestContinuity,
        }),
      ),
    );
    const beforeCore = JSON.stringify(clerk.coreResult);

    assert.equal(promoteGuestCoreSnapshotToClerkUser(clerkId), true);
    const stored = readStoredEnvelope(clerkId);
    assert.ok(stored);
    assert.equal(JSON.stringify(stored.coreResult), beforeCore);
    assert.equal(stored.coreResult.lockedAt, 'clerk-lock-t31');
    assert.deepEqual(stored.identityContinuity, guestContinuity);
    assert.equal(readCoreIdentityContinuity(clerkId)?.previousCoreLabel, '直観展開型');
  });

  it('T32 valid Clerk continuity stays primary and older guest legacy is retained', () => {
    const clerkId = 'user_clerk_t32';
    saveOwnerProfile(clerkId);
    const continuity: CoreIdentityContinuityV1 = {
      version: 'core_identity_continuity_v1',
      source: 'stale_v3',
      previousStemLaneIndex: 5,
      previousPublicTitle: 'プロデューサー',
      previousCoreLabel: 'STALE_LABEL',
      previousEngineVersion: STALE_ENGINE,
      currentStemLaneIndex: 1,
      currentPublicTitle: 'プランナー',
      currentEngineVersion: CORE_ENGINE_VERSION,
      publicIdentityChanged: true,
    };
    const clerk = staleEnvelope({
      stemLaneIndex: 1,
      engineVersion: CORE_ENGINE_VERSION,
      lockedAt: 'clerk-lock-t32',
      coreType: 'TYPE_02',
      coreLabel: 'TYPE_02',
      identityContinuity: continuity,
    });
    const beforeRaw = JSON.stringify(clerk);
    storage.set(v3Key(clerkId), beforeRaw);
    storage.set(v1Key(DEVICE_ID), JSON.stringify(legacyRecord({ stemLaneIndex: 9, publicTitle: 'アナリスト' })));

    assert.equal(promoteGuestCoreSnapshotToClerkUser(clerkId), true);
    assert.equal(storage.get(v3Key(clerkId)), beforeRaw);
    assert.equal(readCoreIdentityContinuity(clerkId)?.source, 'stale_v3');
    assert.equal(readCoreIdentityContinuity(clerkId)?.previousPublicTitle, 'プロデューサー');
    assert.equal(storage.has(v1Key(DEVICE_ID)), true);
  });

  it('T33 malformed current-engine Clerk does not block a valid current guest', () => {
    const clerkId = 'user_clerk_t33';
    saveOwnerProfile(clerkId);
    storage.set(
      v3Key(clerkId),
      JSON.stringify({
        schemaVersion: 3,
        sealedInputs: { birthDate: BIRTH, nickname: NICK },
        coreResult: {
          coreLabel: 'BROKEN',
          engineVersion: CORE_ENGINE_VERSION,
          lockedAt: 'malformed-clerk',
        },
      }),
    );
    const guest = staleEnvelope({
      stemLaneIndex: 1,
      engineVersion: CORE_ENGINE_VERSION,
      lockedAt: 'guest-usable-t33',
      coreType: 'TYPE_02',
      coreLabel: 'TYPE_02',
    });
    storage.set(v3Key(DEVICE_ID), JSON.stringify(guest));

    assert.equal(promoteGuestCoreSnapshotToClerkUser(clerkId), true);
    const stored = readStoredEnvelope(clerkId);
    assert.ok(stored);
    assert.equal(stored.coreResult.stemLaneIndex, 1);
    assert.equal(stored.coreResult.engineVersion, CORE_ENGINE_VERSION);
    assert.equal(stored.coreResult.lockedAt, 'guest-usable-t33');
    assert.equal(resolveCorePublicStemDisplay(stored.coreResult).publicTitle, 'プランナー');
  });

  it('T34 malformed Clerk lane does not clamp and recovers from guest legacy', () => {
    const outOfRange = 'user_clerk_t34_range';
    saveOwnerProfile(outOfRange);
    storage.set(
      v3Key(outOfRange),
      JSON.stringify({
        schemaVersion: 3,
        sealedInputs: { birthDate: BIRTH, nickname: NICK },
        coreResult: {
          stemLaneIndex: 15,
          coreLabel: 'BROKEN',
          engineVersion: CORE_ENGINE_VERSION,
          lockedAt: 'lane-15',
        },
      }),
    );
    storage.set(v1Key(DEVICE_ID), JSON.stringify(legacyRecord()));

    assert.equal(promoteGuestCoreSnapshotToClerkUser(outOfRange), true);
    const ranged = readStoredEnvelope(outOfRange);
    assert.ok(ranged);
    assertCurrentPlanner(ranged.coreResult);
    assert.equal(ranged.identityContinuity?.source, 'legacy_v1');
    assert.equal(ranged.identityContinuity?.previousStemLaneIndex, 5);
    assert.equal(ranged.identityContinuity?.previousPublicTitle, 'プロデューサー');
    assert.equal(storage.has(v1Key(DEVICE_ID)), false);

    const fractional = 'user_clerk_t34_fraction';
    saveOwnerProfile(fractional);
    storage.set(
      v3Key(fractional),
      JSON.stringify({
        schemaVersion: 3,
        sealedInputs: { birthDate: BIRTH, nickname: NICK },
        coreResult: {
          stemLaneIndex: 5.5,
          engineVersion: CORE_ENGINE_VERSION,
          lockedAt: 'lane-fraction',
        },
      }),
    );
    storage.set(v1Key(DEVICE_ID), JSON.stringify(legacyRecord({ publicTitle: 'プロデューサー', stemLaneIndex: 5 })));

    assert.equal(promoteGuestCoreSnapshotToClerkUser(fractional), true);
    const fractionStored = readStoredEnvelope(fractional);
    assert.ok(fractionStored);
    assertCurrentPlanner(fractionStored.coreResult);
    assert.equal(fractionStored.identityContinuity?.previousStemLaneIndex, 5);
    assert.notEqual(fractionStored.identityContinuity?.previousStemLaneIndex, 6);
    assert.equal(fractionStored.coreResult.lockedAt === 'lane-fraction', false);
  });

  it('T35 malformed Clerk with no guest recovery is not a success', () => {
    const clerkId = 'user_clerk_t35';
    saveOwnerProfile(clerkId);
    const beforeRaw = JSON.stringify({
      schemaVersion: 3,
      sealedInputs: { birthDate: BIRTH, nickname: NICK },
      coreResult: {
        stemLaneIndex: 15,
        engineVersion: CORE_ENGINE_VERSION,
        lockedAt: 'malformed-only',
      },
    });
    storage.set(v3Key(clerkId), beforeRaw);

    assert.equal(promoteGuestCoreSnapshotToClerkUser(clerkId), false);
    assert.equal(storage.get(v3Key(clerkId)), beforeRaw);
  });

  it('T36 valid Clerk result wins over a current guest with nothing further to transfer', () => {
    const clerkId = 'user_clerk_t36';
    saveOwnerProfile(clerkId);
    const clerk = staleEnvelope({
      stemLaneIndex: 1,
      engineVersion: CORE_ENGINE_VERSION,
      lockedAt: 'clerk-owns-t36',
      coreType: 'TYPE_02',
      coreLabel: 'TYPE_02',
    });
    const beforeRaw = JSON.stringify(clerk);
    storage.set(v3Key(clerkId), beforeRaw);
    storage.set(
      v3Key(DEVICE_ID),
      JSON.stringify(
        staleEnvelope({
          stemLaneIndex: 1,
          engineVersion: CORE_ENGINE_VERSION,
          lockedAt: 'guest-other-t36',
          coreType: 'TYPE_02',
          coreLabel: 'TYPE_02',
        }),
      ),
    );

    assert.equal(promoteGuestCoreSnapshotToClerkUser(clerkId), true);
    assert.equal(storage.get(v3Key(clerkId)), beforeRaw);
    assert.equal(readStoredEnvelope(clerkId)?.coreResult.lockedAt, 'clerk-owns-t36');
    assert.equal(readStoredEnvelope(clerkId)?.coreResult.stemLaneIndex, 1);
  });

  it('T37 valid Clerk keeps its result and records stale guest history ahead of legacy', () => {
    const clerkId = 'user_clerk_t37';
    saveOwnerProfile(clerkId);
    const clerk = staleEnvelope({
      stemLaneIndex: 1,
      engineVersion: CORE_ENGINE_VERSION,
      lockedAt: 'clerk-lock-t37',
      coreType: 'TYPE_02',
      coreLabel: 'TYPE_02',
    });
    storage.set(v3Key(clerkId), JSON.stringify(clerk));
    storage.set(
      v3Key(DEVICE_ID),
      JSON.stringify(
        staleEnvelope({
          stemLaneIndex: 5,
          engineVersion: STALE_ENGINE,
          coreLabel: '直観展開型',
          lockedAt: 'stale-guest-t37',
        }),
      ),
    );
    storage.set(v1Key(DEVICE_ID), JSON.stringify(legacyRecord({ stemLaneIndex: 9, publicTitle: 'アナリスト' })));
    const beforeCore = JSON.stringify(clerk.coreResult);

    assert.equal(promoteGuestCoreSnapshotToClerkUser(clerkId), true);
    const stored = readStoredEnvelope(clerkId);
    assert.ok(stored);
    assert.equal(JSON.stringify(stored.coreResult), beforeCore);
    assert.equal(stored.identityContinuity?.source, 'stale_v3');
    assert.equal(stored.identityContinuity?.previousStemLaneIndex, 5);
    assert.equal(stored.identityContinuity?.previousPublicTitle, 'プロデューサー');
    assert.equal(stored.identityContinuity?.previousCoreLabel, '直観展開型');
    assert.notEqual(stored.identityContinuity?.previousPublicTitle, 'アナリスト');
    assert.equal(storage.has(v1Key(DEVICE_ID)), true);
  });

  it('T38 stale guest enrichment write failure leaves Clerk and guest evidence', () => {
    const clerkId = 'user_clerk_t38';
    saveOwnerProfile(clerkId);
    const clerk = staleEnvelope({
      stemLaneIndex: 1,
      engineVersion: CORE_ENGINE_VERSION,
      lockedAt: 'clerk-lock-t38',
      coreType: 'TYPE_02',
      coreLabel: 'TYPE_02',
    });
    const beforeRaw = JSON.stringify(clerk);
    const guestRaw = JSON.stringify(
      staleEnvelope({
        stemLaneIndex: 5,
        engineVersion: STALE_ENGINE,
        coreLabel: '直観展開型',
      }),
    );
    storage.set(v3Key(clerkId), beforeRaw);
    storage.set(v3Key(DEVICE_ID), guestRaw);
    storage.set(v1Key(DEVICE_ID), JSON.stringify(legacyRecord({ stemLaneIndex: 9, publicTitle: 'アナリスト' })));
    failV3Writes = true;

    assert.equal(promoteGuestCoreSnapshotToClerkUser(clerkId), false);
    assert.equal(storage.get(v3Key(clerkId)), beforeRaw);
    assert.equal(storage.get(v3Key(DEVICE_ID)), guestRaw);
    assert.equal(storage.has(v1Key(DEVICE_ID)), true);
  });

  it('T39 usable guest stale continuity does not delete a separate legacy record', () => {
    const clerkId = 'user_clerk_t39';
    saveOwnerProfile(clerkId);
    storage.set(
      v3Key(clerkId),
      JSON.stringify({
        schemaVersion: 3,
        sealedInputs: { birthDate: BIRTH, nickname: NICK },
        coreResult: {
          stemLaneIndex: 15,
          coreType: 'TYPE_02',
          coreLabel: 'TYPE_02',
          engineVersion: CORE_ENGINE_VERSION,
          lockedAt: 'malformed-clerk-t39',
        },
      }),
    );
    const continuity: CoreIdentityContinuityV1 = {
      version: 'core_identity_continuity_v1',
      source: 'stale_v3',
      previousStemLaneIndex: 5,
      previousPublicTitle: 'プロデューサー',
      previousCoreLabel: '直観展開型',
      previousEngineVersion: STALE_ENGINE,
      currentStemLaneIndex: 1,
      currentPublicTitle: 'プランナー',
      currentEngineVersion: CORE_ENGINE_VERSION,
      publicIdentityChanged: true,
    };
    const guest = staleEnvelope({
      stemLaneIndex: 1,
      engineVersion: CORE_ENGINE_VERSION,
      lockedAt: 'guest-current-t39',
      coreType: 'TYPE_02',
      coreLabel: 'TYPE_02',
      identityContinuity: continuity,
    });
    storage.set(v3Key(DEVICE_ID), JSON.stringify(guest));
    storage.set(v1Key(DEVICE_ID), JSON.stringify(legacyRecord({ stemLaneIndex: 9, publicTitle: 'アナリスト' })));

    assert.equal(promoteGuestCoreSnapshotToClerkUser(clerkId), true);
    const stored = readStoredEnvelope(clerkId);
    assert.ok(stored);
    assert.deepEqual(stored.coreResult, guest.coreResult);
    assert.equal(stored.sealedInputs.birthDate, BIRTH);
    assert.equal(stored.sealedInputs.nickname, NICK);
    assert.equal(stored.identityContinuity?.source, 'stale_v3');
    assert.equal(stored.coreResult.stemLaneIndex, 1);
    assert.equal(stored.coreResult.coreType, 'TYPE_02');
    assert.equal(stored.coreResult.coreLabel, 'TYPE_02');
    assert.equal(resolveCorePublicStemDisplay(stored.coreResult).publicTitle, 'プランナー');
    assert.equal(storage.has(v1Key(DEVICE_ID)), true);
  });

  it('T40 guest current without continuity persists legacy evidence only after write', () => {
    const clerkId = 'user_clerk_t40';
    saveOwnerProfile(clerkId);
    storage.set(
      v3Key(clerkId),
      JSON.stringify({
        schemaVersion: 3,
        sealedInputs: { birthDate: BIRTH, nickname: NICK },
        coreResult: {
          engineVersion: CORE_ENGINE_VERSION,
          lockedAt: 'missing-lane-t40',
        },
      }),
    );
    const guest = staleEnvelope({
      stemLaneIndex: 1,
      engineVersion: CORE_ENGINE_VERSION,
      lockedAt: 'guest-current-t40',
      coreType: 'TYPE_02',
      coreLabel: 'TYPE_02',
    });
    storage.set(v3Key(DEVICE_ID), JSON.stringify(guest));
    storage.set(v1Key(DEVICE_ID), JSON.stringify(legacyRecord()));

    assert.equal(promoteGuestCoreSnapshotToClerkUser(clerkId), true);
    const stored = readStoredEnvelope(clerkId);
    assert.ok(stored);
    assert.deepEqual(stored.coreResult, guest.coreResult);
    assert.equal(stored.identityContinuity?.source, 'legacy_v1');
    assert.equal(stored.identityContinuity?.previousStemLaneIndex, 5);
    assert.equal(stored.identityContinuity?.previousPublicTitle, 'プロデューサー');
    assert.equal(storage.has(v1Key(DEVICE_ID)), false);

    const clerkFail = 'user_clerk_t40_fail';
    saveOwnerProfile(clerkFail);
    storage.set(
      v3Key(clerkFail),
      JSON.stringify({
        schemaVersion: 3,
        sealedInputs: { birthDate: BIRTH, nickname: NICK },
        coreResult: { engineVersion: CORE_ENGINE_VERSION, lockedAt: 'missing-lane-t40-fail' },
      }),
    );
    storage.set(v3Key(DEVICE_ID), JSON.stringify(guest));
    storage.set(v1Key(DEVICE_ID), JSON.stringify(legacyRecord()));
    const guestLegacyBefore = storage.get(v1Key(DEVICE_ID));
    failV3Writes = true;

    assert.equal(promoteGuestCoreSnapshotToClerkUser(clerkFail), false);
    assert.equal(storage.has(v3Key(clerkFail)), true);
    assert.equal(storage.get(v1Key(DEVICE_ID)), guestLegacyBefore);
    assert.equal(readStoredEnvelope(clerkFail)?.coreResult.lockedAt, 'missing-lane-t40-fail');
  });

  it('T41 missing core type and label does not suppress valid guest recovery', () => {
    const clerkId = 'user_clerk_t41';
    saveOwnerProfile(clerkId);
    storage.set(
      v3Key(clerkId),
      JSON.stringify({
        schemaVersion: 3,
        sealedInputs: { birthDate: BIRTH, nickname: NICK },
        coreResult: {
          stemLaneIndex: 1,
          engineVersion: CORE_ENGINE_VERSION,
          lockedAt: 'missing-identity-t41',
        },
      }),
    );
    const guest = staleEnvelope({
      stemLaneIndex: 1,
      engineVersion: CORE_ENGINE_VERSION,
      lockedAt: 'guest-canonical-t41',
      coreType: 'TYPE_02',
      coreLabel: 'TYPE_02',
    });
    storage.set(v3Key(DEVICE_ID), JSON.stringify(guest));

    assert.equal(promoteGuestCoreSnapshotToClerkUser(clerkId), true);
    const stored = readStoredEnvelope(clerkId);
    assert.ok(stored);
    assert.deepEqual(stored.coreResult, guest.coreResult);
    assert.equal(stored.coreResult.stemLaneIndex, 1);
    assert.equal(stored.coreResult.coreType, 'TYPE_02');
    assert.equal(stored.coreResult.coreLabel, 'TYPE_02');
    assert.equal(stored.coreResult.lockedAt, 'guest-canonical-t41');
  });

  it('T42 contradictory core type does not suppress valid guest recovery', () => {
    const clerkId = 'user_clerk_t42';
    saveOwnerProfile(clerkId);
    storage.set(
      v3Key(clerkId),
      JSON.stringify({
        schemaVersion: 3,
        sealedInputs: { birthDate: BIRTH, nickname: NICK },
        coreResult: {
          stemLaneIndex: 1,
          coreType: 'TYPE_10',
          coreLabel: 'TYPE_10',
          engineVersion: CORE_ENGINE_VERSION,
          lockedAt: 'mixed-identity-t42',
        },
      }),
    );
    const guest = staleEnvelope({
      stemLaneIndex: 1,
      engineVersion: CORE_ENGINE_VERSION,
      lockedAt: 'guest-canonical-t42',
      coreType: 'TYPE_02',
      coreLabel: 'TYPE_02',
    });
    storage.set(v3Key(DEVICE_ID), JSON.stringify(guest));

    assert.equal(promoteGuestCoreSnapshotToClerkUser(clerkId), true);
    const stored = readStoredEnvelope(clerkId);
    assert.ok(stored);
    assert.equal(stored.coreResult.stemLaneIndex, 1);
    assert.equal(stored.coreResult.coreType, 'TYPE_02');
    assert.equal(stored.coreResult.coreLabel, 'TYPE_02');
    assert.equal(stored.coreResult.lockedAt, 'guest-canonical-t42');
    assert.notEqual(stored.coreResult.lockedAt, 'mixed-identity-t42');
  });

  it('T43 canonical Clerk identity stays in place when nothing needs transfer', () => {
    const clerkId = 'user_clerk_t43';
    saveOwnerProfile(clerkId);
    const clerk = staleEnvelope({
      stemLaneIndex: 1,
      engineVersion: CORE_ENGINE_VERSION,
      lockedAt: 'canonical-clerk-t43',
      coreType: 'TYPE_02',
      coreLabel: 'TYPE_02',
    });
    const beforeRaw = JSON.stringify(clerk);
    storage.set(v3Key(clerkId), beforeRaw);

    assert.equal(promoteGuestCoreSnapshotToClerkUser(clerkId), true);
    assert.equal(storage.get(v3Key(clerkId)), beforeRaw);
    assert.equal(readStoredEnvelope(clerkId)?.coreResult.coreType, 'TYPE_02');
    assert.equal(readStoredEnvelope(clerkId)?.coreResult.coreLabel, 'TYPE_02');
    assert.equal(readStoredEnvelope(clerkId)?.coreResult.stemLaneIndex, 1);
  });

  it('T45 current-engine mixed vintage v3 reseals to canonical Planner', () => {
    const userId = 'user_t45';
    saveOwnerProfile(userId);
    storage.set(
      v3Key(userId),
      JSON.stringify({
        schemaVersion: 3,
        sealedInputs: { birthDate: BIRTH, nickname: NICK },
        coreResult: {
          stemLaneIndex: 5,
          coreType: 'TYPE_02',
          coreLabel: 'プロデューサー',
          coreSummary: 'legacy-producer-summary',
          engineVersion: CORE_ENGINE_VERSION,
          lockedAt: 'historical-mixed-lock',
        },
      }),
    );

    const result = ensureSealedCoreResult(userId, profile());
    const stored = readStoredEnvelope(userId);
    const continuity = readCoreIdentityContinuity(userId);

    assertCurrentPlanner(result);
    assert.equal(result.stemLaneIndex, 1);
    assert.equal(result.coreType, 'TYPE_02');
    assert.equal(result.coreLabel, 'TYPE_02');
    assert.notEqual(result.lockedAt, 'historical-mixed-lock');
    assert.ok(stored);
    assertCurrentPlanner(stored.coreResult);
    assert.equal(stored.coreResult.coreType, 'TYPE_02');
    assert.equal(stored.coreResult.coreLabel, 'TYPE_02');
    assert.equal(stored.coreResult.coreSummary.includes('legacy-producer-summary'), false);
    assert.ok(continuity);
    assert.equal(continuity.source, 'stale_v3');
    assert.equal(continuity.previousStemLaneIndex, 5);
    assert.equal(continuity.previousPublicTitle, 'プロデューサー');
    assert.equal(continuity.previousEngineVersion, CORE_ENGINE_VERSION);
    assert.equal(continuity.currentStemLaneIndex, 1);
    assert.equal(continuity.currentPublicTitle, 'プランナー');
  });

  it('T46 mixed vintage write failure keeps the persisted envelope and legacy', () => {
    const userId = 'user_t46';
    saveOwnerProfile(userId);
    const mixed = {
      schemaVersion: 3,
      sealedInputs: { birthDate: BIRTH, nickname: NICK },
      coreResult: {
        stemLaneIndex: 5,
        coreType: 'TYPE_02',
        coreLabel: 'プロデューサー',
        coreSummary: 'legacy-producer-summary',
        engineVersion: CORE_ENGINE_VERSION,
        lockedAt: 'historical-mixed-lock',
      },
    };
    const beforeRaw = JSON.stringify(mixed);
    const legacyRaw = JSON.stringify(legacyRecord());
    storage.set(v3Key(userId), beforeRaw);
    storage.set(v1Key(userId), legacyRaw);
    failV3Writes = true;

    const result = ensureSealedCoreResult(userId, profile());

    assertCurrentPlanner(result);
    assert.equal(result.stemLaneIndex, 1);
    assert.equal(storage.get(v3Key(userId)), beforeRaw);
    assert.equal(storage.get(v1Key(userId)), legacyRaw);
  });

  it('T47 current-engine lane with contradictory type is resealed', () => {
    const userId = 'user_t47';
    saveOwnerProfile(userId);
    storage.set(
      v3Key(userId),
      JSON.stringify(
        staleEnvelope({
          stemLaneIndex: 1,
          engineVersion: CORE_ENGINE_VERSION,
          coreType: 'TYPE_10',
          coreLabel: 'TYPE_10',
          lockedAt: 'contradictory-t47',
        }),
      ),
    );

    const result = ensureSealedCoreResult(userId, profile());
    const stored = readStoredEnvelope(userId);
    const continuity = readCoreIdentityContinuity(userId);

    assertCurrentPlanner(result);
    assert.equal(result.coreType, 'TYPE_02');
    assert.equal(result.coreLabel, 'TYPE_02');
    assert.notEqual(result.lockedAt, 'contradictory-t47');
    assert.ok(stored);
    assert.equal(stored.coreResult.coreType, 'TYPE_02');
    assert.equal(stored.coreResult.coreLabel, 'TYPE_02');
    assert.ok(continuity);
    assert.equal(continuity.source, 'stale_v3');
    assert.equal(continuity.previousStemLaneIndex, 1);
    assert.equal(continuity.previousCoreLabel, 'TYPE_10');
    assert.equal(continuity.currentStemLaneIndex, 1);
    assert.equal(continuity.currentPublicTitle, 'プランナー');
  });

  it('T48 usable canonical current v3 is returned unchanged', () => {
    const userId = 'user_t48';
    saveOwnerProfile(userId);
    const existing = staleEnvelope({
      stemLaneIndex: 1,
      engineVersion: CORE_ENGINE_VERSION,
      lockedAt: 'canonical-lock-t48',
      coreType: 'TYPE_02',
      coreLabel: 'TYPE_02',
    });
    const beforeRaw = JSON.stringify(existing);
    storage.set(v3Key(userId), beforeRaw);

    const result = ensureSealedCoreResult(userId, profile());

    assert.deepEqual(result, existing.coreResult);
    assert.equal(storage.get(v3Key(userId)), beforeRaw);
    assert.equal(result.lockedAt, 'canonical-lock-t48');
  });

  it('T49 usable current v3 keeps stale continuity and leftover legacy', () => {
    const userId = 'user_t49';
    saveOwnerProfile(userId);
    const continuity: CoreIdentityContinuityV1 = {
      version: 'core_identity_continuity_v1',
      source: 'stale_v3',
      previousStemLaneIndex: 5,
      previousPublicTitle: 'プロデューサー',
      previousCoreLabel: 'プロデューサー',
      previousEngineVersion: CORE_ENGINE_VERSION,
      currentStemLaneIndex: 1,
      currentPublicTitle: 'プランナー',
      currentEngineVersion: CORE_ENGINE_VERSION,
      publicIdentityChanged: true,
    };
    const existing = staleEnvelope({
      stemLaneIndex: 1,
      engineVersion: CORE_ENGINE_VERSION,
      lockedAt: 'usable-stale-continuity-t49',
      coreType: 'TYPE_02',
      coreLabel: 'TYPE_02',
      identityContinuity: continuity,
    });
    const beforeRaw = JSON.stringify(existing);
    const legacyRaw = JSON.stringify(legacyRecord({ stemLaneIndex: 9, publicTitle: 'アナリスト' }));
    storage.set(v3Key(userId), beforeRaw);
    storage.set(v1Key(userId), legacyRaw);

    const result = ensureSealedCoreResult(userId, profile());

    assert.deepEqual(result, existing.coreResult);
    assert.equal(storage.get(v3Key(userId)), beforeRaw);
    assert.equal(readCoreIdentityContinuity(userId)?.source, 'stale_v3');
    assert.equal(readCoreIdentityContinuity(userId)?.previousStemLaneIndex, 5);
    assert.equal(storage.get(v1Key(userId)), legacyRaw);
  });

  it('T50 non-usable owner v3 writes canonical continuity and keeps legacy', () => {
    const userId = 'user_t50';
    saveOwnerProfile(userId);
    storage.set(v3Key(userId), JSON.stringify(staleEnvelope({ stemLaneIndex: 5 })));
    const legacyRaw = JSON.stringify(legacyRecord({ stemLaneIndex: 9, publicTitle: 'アナリスト' }));
    storage.set(v1Key(userId), legacyRaw);

    const result = ensureSealedCoreResult(userId, profile());
    const stored = readStoredEnvelope(userId);

    assertCurrentPlanner(result);
    assert.ok(stored);
    assert.equal(stored.identityContinuity?.source, 'stale_v3');
    assert.equal(stored.identityContinuity?.previousStemLaneIndex, 5);
    assert.equal(storage.get(v1Key(userId)), legacyRaw);
  });

  it('T51 stale guest recovery writes Clerk canonical continuity and keeps guest legacy', () => {
    const clerkId = 'user_clerk_t51';
    saveOwnerProfile(clerkId);
    storage.set(v3Key(DEVICE_ID), JSON.stringify(staleEnvelope({ stemLaneIndex: 5 })));
    const legacyRaw = JSON.stringify(legacyRecord({ stemLaneIndex: 9, publicTitle: 'アナリスト' }));
    storage.set(v1Key(DEVICE_ID), legacyRaw);

    assert.equal(promoteGuestCoreSnapshotToClerkUser(clerkId), true);
    const stored = readStoredEnvelope(clerkId);
    assert.ok(stored);
    assertCurrentPlanner(stored.coreResult);
    assert.equal(stored.identityContinuity?.source, 'stale_v3');
    assert.equal(stored.identityContinuity?.previousStemLaneIndex, 5);
    assert.equal(storage.get(v1Key(DEVICE_ID)), legacyRaw);
  });

  it('T52 legacy-only path retires legacy only after a successful current write', () => {
    const userId = 'user_t52';
    saveOwnerProfile(userId);
    storage.set(v1Key(userId), JSON.stringify(legacyRecord()));

    const result = ensureSealedCoreResult(userId, profile());
    const stored = readStoredEnvelope(userId);

    assertCurrentPlanner(result);
    assert.ok(stored);
    assert.equal(stored.identityContinuity?.source, 'legacy_v1');
    assert.equal(storage.has(v1Key(userId)), false);

    const failingUser = 'user_t52_fail';
    saveOwnerProfile(failingUser);
    const legacyRaw = JSON.stringify(legacyRecord());
    storage.set(v1Key(failingUser), legacyRaw);
    failV3Writes = true;

    const failed = ensureSealedCoreResult(failingUser, profile());

    assertCurrentPlanner(failed);
    assert.equal(storage.has(v3Key(failingUser)), false);
    assert.equal(storage.get(v1Key(failingUser)), legacyRaw);
  });
});
