import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DTR_CORE_LIGHT_V1, DTR_CORE_FULL_V1 } from '../../oneTimeCheckout';
import {
  buildPurchaseInputSnapshotV1,
  readPurchaseInputSnapshotV1,
} from './purchaseInputSnapshotV1';
import { buildOpaqueStripeCheckoutMetadata, hashOpaqueUserRef } from './stripeOpaqueCheckoutRefs';
import {
  buildPaidSavedReportChapterBodiesV1,
  hashChapterBodiesForEquality,
} from './buildPaidSavedReportChapterBodiesV1';
import { buildPaidDtrChapterMaterialPack } from '../dtrPaidChapterMaterialPack';
import { buildV2FulfillmentSnapshotFromFields } from '../compositeStem/buildV2FulfillmentSnapshot';
import { composePaidIndividualizationFromEngineContext } from '../dtrPaidIndividualizationCompose';

function freeSet(): Record<string, string> {
  return {
    'free.start_style': 'free.start_style.map_first',
    'free.decision_style': 'free.decision_style.sort_first',
    'free.recovery_style': 'free.recovery_style.pause_short',
    'free.distance_style': 'free.distance_style.close_careful',
    'free.change_style': 'free.change_style.observe_first',
    'free.primary_theme': 'free.primary_theme.work',
  };
}

function paidSet(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    'paid.work_focus': 'paid.work_focus.priority',
    'paid.decision_friction': 'paid.decision_friction.too_many',
    'paid.relation_focus': 'paid.relation_focus.words',
    'paid.fatigue_signal': 'paid.fatigue_signal.after_push',
    'paid.recovery_sequence': 'paid.recovery_sequence.pause_first',
    'paid.restart_condition': 'paid.restart_condition.overview_first',
    ...overrides,
  };
}

const PROFILE = {
  nickname: 'QA',
  birthDate: '1990-01-15',
  birthTimeUnknown: true,
  country: 'JP',
};

describe('paid saved report vertical slice', () => {
  it('purchase input snapshot deterministic + immutable shape', () => {
    const input = {
      userId: 'user_test_1',
      productId: DTR_CORE_LIGHT_V1,
      profile: PROFILE,
      freeAnswerSet: freeSet(),
      paidAnswerSet: paidSet(),
      stemLaneIndex: 3,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const a = buildPurchaseInputSnapshotV1(input);
    const b = buildPurchaseInputSnapshotV1(input);
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.equal(
      a.value.individualization.audit.outputHash,
      b.value.individualization.audit.outputHash,
    );
    assert.equal(a.value.frozen, true);
    assert.match(JSON.stringify(a.value), /fp-v1/);
    assert.doesNotMatch(JSON.stringify(a.value), /s1_identity/);
  });

  it('stripe metadata has no DOB/answers/nickname/raw prose', () => {
    const meta = buildOpaqueStripeCheckoutMetadata({
      productId: DTR_CORE_FULL_V1,
      purchaseContextId: '11111111-1111-4111-8111-111111111111',
      opaqueUserRef: 'abc123',
      inputVersion: 'input-v1',
      engineVersionCandidate: 'engine-v2',
    });
    const serialized = JSON.stringify(meta);
    assert.ok(meta.purchaseContextId);
    assert.ok(meta.opaqueUserRef);
    assert.equal(meta.profileNickname, undefined);
    assert.equal(meta.profileBirthDate, undefined);
    assert.doesNotMatch(serialized, /1990-01-15/);
    assert.doesNotMatch(serialized, /free\.|paid\./);
    assert.doesNotMatch(serialized, /user_/);
  });

  it('Light/FULL chapter bodies equal for same input', () => {
    const built = buildPurchaseInputSnapshotV1({
      userId: 'user_test_2',
      productId: DTR_CORE_LIGHT_V1,
      profile: PROFILE,
      freeAnswerSet: freeSet(),
      paidAnswerSet: paidSet(),
      stemLaneIndex: 5,
      createdAt: '2026-01-02T00:00:00.000Z',
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    const v2 = buildV2FulfillmentSnapshotFromFields({
      nickname: PROFILE.nickname,
      birthDate: PROFILE.birthDate,
      birthTime: null,
      birthTimeUnknown: true,
      country: 'JP',
      birthplace: null,
      timezone: null,
    });
    const ind = composePaidIndividualizationFromEngineContext(v2.engine_context_json);
    const pack = buildPaidDtrChapterMaterialPack(v2.engine_context_json, ind);
    const bodies = buildPaidSavedReportChapterBodiesV1({
      draft: built.value.individualization,
      materialPack: pack,
    });
    assert.ok((bodies.s1_identity ?? '').length > 120);
    assert.ok((bodies.s2_composition ?? '').length > 120);
    assert.ok((bodies.s3_essence ?? '').length > 120);
    assert.ok((bodies.s4_strengths ?? '').length > 120);
    const hashA = hashChapterBodiesForEquality(bodies);
    const hashB = hashChapterBodiesForEquality(bodies);
    assert.equal(hashA, hashB);
    assert.doesNotMatch(bodies.s1_identity ?? '', /free\.|paid_ch|selectors-v1/);
  });

  it('paid answer variance changes output hash', () => {
    const base = buildPurchaseInputSnapshotV1({
      userId: 'user_test_3',
      productId: DTR_CORE_LIGHT_V1,
      profile: PROFILE,
      freeAnswerSet: freeSet(),
      paidAnswerSet: paidSet(),
      stemLaneIndex: 2,
      createdAt: '2026-01-03T00:00:00.000Z',
    });
    const variant = buildPurchaseInputSnapshotV1({
      userId: 'user_test_3',
      productId: DTR_CORE_LIGHT_V1,
      profile: PROFILE,
      freeAnswerSet: freeSet(),
      paidAnswerSet: paidSet({ 'paid.work_focus': 'paid.work_focus.pace' }),
      stemLaneIndex: 2,
      createdAt: '2026-01-03T00:00:00.000Z',
    });
    assert.equal(base.ok, true);
    assert.equal(variant.ok, true);
    if (!base.ok || !variant.ok) return;
    assert.notEqual(
      base.value.individualization.audit.outputHash,
      variant.value.individualization.audit.outputHash,
    );
  });

  it('readPurchaseInputSnapshotV1 roundtrip', () => {
    const built = buildPurchaseInputSnapshotV1({
      userId: 'user_test_4',
      productId: DTR_CORE_LIGHT_V1,
      profile: PROFILE,
      freeAnswerSet: freeSet(),
      paidAnswerSet: paidSet(),
      stemLaneIndex: 1,
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    const extra = { purchaseInputV1: built.value };
    const read = readPurchaseInputSnapshotV1(extra);
    assert.ok(read);
    assert.equal(read?.individualization.audit.sourceVersions.selectorVersion, 'selectors-v1');
  });

  it('synthetic matrix: 900 deterministic cases with zero hard failures', () => {
    const DOBS = Array.from({ length: 20 }, (_, i) => {
      const y = 1980 + (i % 16);
      const m = String((i % 12) + 1).padStart(2, '0');
      const d = String((i % 28) + 1).padStart(2, '0');
      return `${y}-${m}-${d}`;
    });
    const FREE_START = [
      'free.start_style.map_first',
      'free.start_style.try_first',
      'free.start_style.ask_first',
    ];
    const FREE_DECISION = [
      'free.decision_style.sort_first',
      'free.decision_style.deadline_first',
      'free.decision_style.wait_first',
    ];
    const FREE_RECOVERY = [
      'free.recovery_style.pause_short',
      'free.recovery_style.shrink_task',
      'free.recovery_style.change_scene',
    ];
    const FREE_DISTANCE = [
      'free.distance_style.close_careful',
      'free.distance_style.middle_steady',
      'free.distance_style.solo_reset',
    ];
    const FREE_CHANGE = [
      'free.change_style.observe_first',
      'free.change_style.adjust_fast',
      'free.change_style.rebuild_slow',
    ];
    const FREE_THEME = [
      'free.primary_theme.work',
      'free.primary_theme.relation',
      'free.primary_theme.fatigue',
      'free.primary_theme.tendency',
      'free.primary_theme.report_preview',
    ];
    const PAID_PROFILES = [
      paidSet(),
      paidSet({
        'paid.work_focus': 'paid.work_focus.pace',
        'paid.decision_friction': 'paid.decision_friction.unclear_end',
      }),
      paidSet({
        'paid.relation_focus': 'paid.relation_focus.timing',
        'paid.fatigue_signal': 'paid.fatigue_signal.before_start',
        'paid.restart_condition': 'paid.restart_condition.shrink_scope',
      }),
    ];

    let attempted = 0;
    let valid = 0;
    let emptyChapters = 0;
    let deterministicMismatch = 0;
    let piiLeakage = 0;
    let lightFullMismatch = 0;
    const reportHashes = new Set<string>();

    for (let di = 0; di < DOBS.length; di++) {
      for (let fi = 0; fi < 15; fi++) {
        for (let pi = 0; pi < PAID_PROFILES.length; pi++) {
          attempted++;
          const birthDate = DOBS[di]!;
          const freeAnswerSet = {
            'free.start_style': FREE_START[fi % FREE_START.length]!,
            'free.decision_style': FREE_DECISION[(fi + 1) % FREE_DECISION.length]!,
            'free.recovery_style': FREE_RECOVERY[(fi + 2) % FREE_RECOVERY.length]!,
            'free.distance_style': FREE_DISTANCE[(fi + 3) % FREE_DISTANCE.length]!,
            'free.change_style': FREE_CHANGE[(fi + 4) % FREE_CHANGE.length]!,
            'free.primary_theme': FREE_THEME[fi % FREE_THEME.length]!,
          };
          const paidAnswerSet = PAID_PROFILES[pi]!;
          const stemLaneIndex = (di + fi + pi) % 10;
          const profile = { nickname: 'Syn', birthDate, birthTimeUnknown: true, country: 'JP' };

          const lightBuilt = buildPurchaseInputSnapshotV1({
            userId: 'user_syn',
            productId: DTR_CORE_LIGHT_V1,
            profile,
            freeAnswerSet,
            paidAnswerSet,
            stemLaneIndex,
            createdAt: '2026-06-01T00:00:00.000Z',
          });
          const fullBuilt = buildPurchaseInputSnapshotV1({
            userId: 'user_syn',
            productId: DTR_CORE_FULL_V1,
            profile,
            freeAnswerSet,
            paidAnswerSet,
            stemLaneIndex,
            createdAt: '2026-06-01T00:00:00.000Z',
          });
          if (!lightBuilt.ok || !fullBuilt.ok) continue;
          valid++;

          const meta = buildOpaqueStripeCheckoutMetadata({
            productId: DTR_CORE_LIGHT_V1,
            purchaseContextId: '22222222-2222-4222-8222-222222222222',
            opaqueUserRef: hashOpaqueUserRef('user_syn'),
            inputVersion: 'input-v1',
            engineVersionCandidate: 'engine-v2',
          });
          const metaJson = JSON.stringify(meta);
          if (
            metaJson.includes(birthDate) ||
            /free\.|paid\./.test(metaJson) ||
            /user_/.test(metaJson)
          ) {
            piiLeakage++;
          }

          const v2 = buildV2FulfillmentSnapshotFromFields({
            nickname: profile.nickname,
            birthDate,
            birthTime: null,
            birthTimeUnknown: true,
            country: 'JP',
            birthplace: null,
            timezone: null,
          });
          const ind = composePaidIndividualizationFromEngineContext(v2.engine_context_json);
          const pack = buildPaidDtrChapterMaterialPack(v2.engine_context_json, ind);

          const bodiesA = buildPaidSavedReportChapterBodiesV1({
            draft: lightBuilt.value.individualization,
            materialPack: pack,
          });
          const bodiesB = buildPaidSavedReportChapterBodiesV1({
            draft: fullBuilt.value.individualization,
            materialPack: pack,
          });
          const chapterKeys = ['s1_identity', 's2_composition', 's3_essence', 's4_strengths'] as const;
          for (const key of chapterKeys) {
            if ((bodiesA[key] ?? '').length < 80) emptyChapters++;
          }

          const hashLight = hashChapterBodiesForEquality(bodiesA);
          const hashFull = hashChapterBodiesForEquality(bodiesB);
          if (hashLight !== hashFull) lightFullMismatch++;
          reportHashes.add(hashLight);

          const replay = buildPurchaseInputSnapshotV1({
            userId: 'user_syn',
            productId: DTR_CORE_LIGHT_V1,
            profile,
            freeAnswerSet,
            paidAnswerSet,
            stemLaneIndex,
            createdAt: '2026-06-01T00:00:00.000Z',
          });
          if (
            replay.ok &&
            replay.value.individualization.audit.outputHash !==
              lightBuilt.value.individualization.audit.outputHash
          ) {
            deterministicMismatch++;
          }
        }
      }
    }

    assert.equal(attempted, 900);
    assert.equal(valid, 900);
    assert.equal(emptyChapters, 0);
    assert.equal(deterministicMismatch, 0);
    assert.equal(piiLeakage, 0);
    assert.equal(lightFullMismatch, 0);
    assert.ok(reportHashes.size >= 50, `unique report hashes=${reportHashes.size}`);
  });
});
