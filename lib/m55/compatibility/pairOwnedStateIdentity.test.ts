import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  questionsForRelationStage,
  type CompatibilityCurrentContextAnswersV2,
} from './currentContextContract.v2';
import { buildPairDisplayIdentity } from './pairDisplayIdentity';
import type { CompatibilityGuestJourneyV3 } from './pairReadingGuestContract';
import {
  classifyPairOwnedState,
  classifyPairPaidRelevantJourneyDelta,
  createRandomPairOwnedStateIdentity,
  isStrictUuidV4,
  parseOwnedReportIdentitySummariesFromReportsApi,
  resolveNextPairOwnedStateIdentity,
} from './pairOwnedStateIdentity';

const R2_CTX: CompatibilityCurrentContextAnswersV2 = {
  expressionPace: 'words_soon',
  contactPace: 'steady_contact',
};

function journey(
  personA = '1990-01-01',
  personB = '1992-02-02',
  relationStatusId: 'R2' | 'R3' = 'R2',
  answers: CompatibilityCurrentContextAnswersV2 = R2_CTX,
): CompatibilityGuestJourneyV3 {
  return {
    version: 'journey_v3',
    input: { personA, personB },
    relationStatusId,
    answers,
  };
}

const seq = (() => {
  const ids = [
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-8444-444444444444',
  ];
  let i = 0;
  return () => ids[i++ % ids.length];
})();

describe('pairOwnedStateIdentity lifecycle', () => {
  it('01 first completion creates two UUID v4 ids', () => {
    const next = resolveNextPairOwnedStateIdentity({
      previousIdentity: null,
      previousJourney: null,
      nextJourney: journey(),
      randomUuid: seq,
    });
    assert.ok(next);
    assert.ok(isStrictUuidV4(next!.pairIdentityId));
    assert.ok(isStrictUuidV4(next!.paidContextId));
  });

  it('02 exact revisit preserves both ids', () => {
    const prev = journey();
    const identity = createRandomPairOwnedStateIdentity(seq);
    const next = resolveNextPairOwnedStateIdentity({
      previousIdentity: identity,
      previousJourney: prev,
      nextJourney: prev,
      randomUuid: seq,
    });
    assert.deepEqual(next, identity);
  });

  it('03 nickname-only change preserves both ids', () => {
    const prev = journey();
    const withNick = {
      ...prev,
      displayIdentity: buildPairDisplayIdentity('Aさん', 'R2'),
    };
    const identity = createRandomPairOwnedStateIdentity(seq);
    const next = resolveNextPairOwnedStateIdentity({
      previousIdentity: identity,
      previousJourney: prev,
      nextJourney: withNick,
      randomUuid: seq,
    });
    assert.deepEqual(next, identity);
  });

  it('04 relation stage change rotates paid context only', () => {
    const prev = journey('1990-01-01', '1992-02-02', 'R2', R2_CTX);
    const r3Answers = Object.fromEntries(
      questionsForRelationStage('R3').map((question) => [
        question.questionId,
        question.choices[0].answerId,
      ]),
    ) as CompatibilityCurrentContextAnswersV2;
    const nextJ = journey('1990-01-01', '1992-02-02', 'R3', r3Answers);
    const identity = createRandomPairOwnedStateIdentity(seq);
    const next = resolveNextPairOwnedStateIdentity({
      previousIdentity: identity,
      previousJourney: prev,
      nextJourney: nextJ,
      randomUuid: seq,
    });
    assert.equal(next?.pairIdentityId, identity.pairIdentityId);
    assert.notEqual(next?.paidContextId, identity.paidContextId);
  });

  it('05 current-context answer change rotates paid context only', () => {
    const prev = journey();
    const nextJ = journey('1990-01-01', '1992-02-02', 'R2', {
      expressionPace: 'words_later',
      contactPace: 'steady_contact',
    });
    const identity = createRandomPairOwnedStateIdentity(seq);
    const next = resolveNextPairOwnedStateIdentity({
      previousIdentity: identity,
      previousJourney: prev,
      nextJourney: nextJ,
      randomUuid: seq,
    });
    assert.equal(next?.pairIdentityId, identity.pairIdentityId);
    assert.notEqual(next?.paidContextId, identity.paidContextId);
  });

  it('06 personB DOB change rotates both ids', () => {
    const prev = journey();
    const identity = createRandomPairOwnedStateIdentity(seq);
    const next = resolveNextPairOwnedStateIdentity({
      previousIdentity: identity,
      previousJourney: prev,
      nextJourney: journey('1990-01-01', '1993-03-03'),
      randomUuid: seq,
    });
    assert.notEqual(next?.pairIdentityId, identity.pairIdentityId);
    assert.notEqual(next?.paidContextId, identity.paidContextId);
  });

  it('07 personA DOB change rotates both ids', () => {
    const prev = journey();
    const identity = createRandomPairOwnedStateIdentity(seq);
    const next = resolveNextPairOwnedStateIdentity({
      previousIdentity: identity,
      previousJourney: prev,
      nextJourney: journey('1988-08-08', '1992-02-02'),
      randomUuid: seq,
    });
    assert.notEqual(next?.pairIdentityId, identity.pairIdentityId);
  });

  it('08 explicit reset creates fresh ids on next completion', () => {
    const prev = journey();
    const identity = createRandomPairOwnedStateIdentity(seq);
    const next = resolveNextPairOwnedStateIdentity({
      previousIdentity: identity,
      previousJourney: prev,
      nextJourney: prev,
      explicitContinuityReset: true,
      randomUuid: seq,
    });
    assert.notEqual(next?.pairIdentityId, identity.pairIdentityId);
  });
});

describe('pairOwnedStateIdentity classifier', () => {
  const pairId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const ctxA = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const ctxB = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const report1 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

  it('12 exact pair+context => exact_owned', () => {
    const result = classifyPairOwnedState({
      currentIdentity: {
        version: 'pair_owned_state_identity_v1',
        pairIdentityId: pairId,
        paidContextId: ctxA,
      },
      reportsPayload: {
        available: true,
        reports: [{ id: report1, pairIdentityId: pairId, paidContextId: ctxA }],
      },
    });
    assert.deepEqual(result, { kind: 'exact_owned', reportId: report1 });
  });

  it('13 same pair different context => same_pair_new_context', () => {
    const result = classifyPairOwnedState({
      currentIdentity: {
        version: 'pair_owned_state_identity_v1',
        pairIdentityId: pairId,
        paidContextId: ctxB,
      },
      reportsPayload: {
        available: true,
        reports: [{ id: report1, pairIdentityId: pairId, paidContextId: ctxA }],
      },
    });
    assert.equal(result.kind, 'same_pair_new_context');
  });

  it('14 different pair => new_pair', () => {
    const result = classifyPairOwnedState({
      currentIdentity: {
        version: 'pair_owned_state_identity_v1',
        pairIdentityId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        paidContextId: ctxA,
      },
      reportsPayload: {
        available: true,
        reports: [{ id: report1, pairIdentityId: pairId, paidContextId: ctxA }],
      },
    });
    assert.equal(result.kind, 'new_pair');
  });

  it('17 malformed current ids => unknown', () => {
    const result = classifyPairOwnedState({
      currentIdentity: {
        version: 'pair_owned_state_identity_v1',
        pairIdentityId: 'not-a-uuid',
        paidContextId: ctxA,
      },
      reportsPayload: { available: true, reports: [] },
    });
    assert.equal(result.kind, 'unknown');
  });

  it('18 malformed report identity fields => unknown', () => {
    const parsed = parseOwnedReportIdentitySummariesFromReportsApi({
      available: true,
      reports: [{ id: report1, pairIdentityId: 'bad', paidContextId: ctxA }],
    });
    assert.equal(parsed, null);
  });

  it('19 unavailable reports => unknown', () => {
    const result = classifyPairOwnedState({
      currentIdentity: {
        version: 'pair_owned_state_identity_v1',
        pairIdentityId: pairId,
        paidContextId: ctxA,
      },
      reportsPayload: { available: false, reports: [] },
    });
    assert.equal(result.kind, 'unknown');
  });

  it('20 legacy null-link never auto-matches exact owned', () => {
    const result = classifyPairOwnedState({
      currentIdentity: {
        version: 'pair_owned_state_identity_v1',
        pairIdentityId: pairId,
        paidContextId: ctxA,
      },
      reportsPayload: {
        available: true,
        reports: [{ id: report1, pairIdentityId: null, paidContextId: null }],
      },
    });
    assert.equal(result.kind, 'new_pair');
  });

  it('27 partial-null identity list remains readable as legacy unbound', () => {
    const parsed = parseOwnedReportIdentitySummariesFromReportsApi({
      available: true,
      reports: [{ id: report1, pairIdentityId: pairId, paidContextId: null }],
    });
    assert.ok(parsed?.available);
    assert.deepEqual(parsed?.reports[0], {
      id: report1,
      pairIdentityId: null,
      paidContextId: null,
    });
  });
});

describe('pairPaidRelevantJourneyDelta', () => {
  it('classifies identical journeys', () => {
    const j = journey();
    assert.equal(classifyPairPaidRelevantJourneyDelta(j, j), 'identical');
  });
});
