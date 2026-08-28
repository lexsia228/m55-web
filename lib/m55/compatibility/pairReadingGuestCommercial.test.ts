import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  M55_FUNNEL_EVENTS,
  assertPrivacySafeFunnelPayload,
  buildPrivacySafeFunnelPayload,
  resetFunnelImpressionDedupeForTests,
  trackFunnelImpressionOnce,
} from '../privacySafeFunnelAnalytics';
import {
  PAIR_AXIS_FREE_RESULT_FRAGMENTS,
  TOPIC_IMMEDIATE_ACTIONS,
} from './pairReadingFragments.v1';
import {
  isCompleteCompatibilityGuestInput,
  isValidCompatibilityBirthDate,
} from './pairReadingGuestContract';
import {
  GUEST_TOPIC_BY_PAIR_AXIS,
  PAIR_AXIS_PAID_CHAPTER_MAPPING,
  TOPIC_PAID_CHAPTER_MAPPING,
  buildCompatibilityPublicResult,
} from './pairReadingGuestResult';
import type { CompatibilityCurrentContextAnswersV2 } from './currentContextContract.v2';
import type {
  PaidTopicId,
  PairAxisId,
  RelationStatusId,
  TemperatureId,
} from './pairReadingTypes';

const ROOT = join(import.meta.dirname, '../../..');
const FORWARD = { personA: '1982-02-28', personB: '1997-06-15' };
const REVERSE = { personA: FORWARD.personB, personB: FORWARD.personA };

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

function mustBuild(
  input = FORWARD,
  state?: {
    relationStatusId: RelationStatusId;
    paidTopicId: PaidTopicId;
    temperatureId: TemperatureId;
    pairAxisOverride?: PairAxisId;
  },
) {
  const outcome = buildCompatibilityPublicResult(
    input,
    state?.relationStatusId ?? 'R2',
    undefined,
    state,
  );
  if (!outcome.ok) assert.fail(outcome.message);
  return outcome.value;
}

describe('compatibility guest input', () => {
  it('requires both valid calendar dates and rejects future dates', () => {
    assert.equal(isCompleteCompatibilityGuestInput({ personA: '', personB: '' }), false);
    assert.equal(
      isCompleteCompatibilityGuestInput({ personA: '2000-02-29', personB: '' }),
      false,
    );
    assert.equal(isValidCompatibilityBirthDate('2001-02-29', '2026-07-13'), false);
    assert.equal(isValidCompatibilityBirthDate('2000-02-29', '2026-07-13'), true);
    assert.equal(isValidCompatibilityBirthDate('2026-07-14', '2026-07-13'), false);
    assert.equal(isValidCompatibilityBirthDate('1990-04-31', '2026-07-13'), false);
  });
});

describe('compatibility free authority', () => {
  it('covers A1-A4 and T1-T5 with concrete free fragments', () => {
    for (const axis of ['A1', 'A2', 'A3', 'A4'] as const) {
      const authority = PAIR_AXIS_FREE_RESULT_FRAGMENTS[axis];
      assert.ok(authority.overlap.length > 20);
      assert.ok(authority.difference.length > 20);
      assert.ok(authority.perspectiveOne.length > 10);
      assert.ok(authority.perspectiveTwo.length > 10);
      assert.ok(authority.dynamicOutcome.length > 20);
    }
    for (const topic of ['T1', 'T2', 'T3', 'T4', 'T5'] as const) {
      const immediate = TOPIC_IMMEDIATE_ACTIONS[topic];
      assert.ok(immediate.situation.length > 10);
      assert.match(immediate.action, /決めて|確認して|記録して/);
      assert.doesNotMatch(immediate.action, /必ず|改善|良くなる|縮まる|解決/);
    }
  });

  it('is deterministic and contains one executable action', () => {
    const first = mustBuild();
    const second = mustBuild();
    assert.deepEqual(first, second);
    assert.ok(first.free.overlap);
    assert.ok(first.free.difference);
    assert.ok(first.free.relationshipDynamic);
    assert.deepEqual(Object.keys(first.free.immediateAction).sort(), ['action', 'situation']);
    assert.match(first.free.immediateAction.action, /決めて|確認して|記録して/);
  });

  it('preserves relationship semantics and swaps person perspectives', () => {
    const forward = mustBuild();
    const reverse = mustBuild(REVERSE);
    assert.deepEqual(forward.free.semanticKeys, reverse.free.semanticKeys);
    assert.equal(forward.free.overlap, reverse.free.overlap);
    assert.equal(forward.free.difference, reverse.free.difference);
    assert.equal(forward.free.perspectives.personA, reverse.free.perspectives.personB);
    assert.equal(forward.free.perspectives.personB, reverse.free.perspectives.personA);
  });

  it('covers representative R1-R6, E0-E5, boundaries, same DOB and every matrix axis/topic', () => {
    const statuses = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'] as const;
    const temperatures = ['E0', 'E1', 'E2', 'E3', 'E4', 'E5'] as const;
    const topics = ['T1', 'T2', 'T3', 'T4', 'T5'] as const;
    const axes = ['A1', 'A2', 'A3', 'A4'] as const;
    const pairs = [
      { personA: '1990-01-10', personB: '1990-01-10' },
      { personA: '2000-02-29', personB: '1999-07-15' },
      { personA: '1990-01-31', personB: '1990-02-01' },
    ];
    for (let index = 0; index < 6; index += 1) {
      const value = mustBuild(pairs[index % pairs.length], {
        relationStatusId: statuses[index]!,
        paidTopicId: topics[index % topics.length]!,
        temperatureId: temperatures[index]!,
        pairAxisOverride: axes[index % axes.length]!,
      });
      assert.equal(value.allChapters.length, 6);
    }
  });

  it('contains no judgment, prediction, ranking, diagnosis, or one-sided blame', () => {
    const visible = JSON.stringify(mustBuild());
    assert.doesNotMatch(
      visible,
      /相性点数|%|ランキング|運命の相手|結婚する|別れる未来|診断です|Aが原因|Bが問題|一方だけ/,
    );
  });
});

describe('compatibility guest NO_OBSERVATION propagation', () => {
  const R3_NO_OBS_DECISION: CompatibilityCurrentContextAnswersV2 = {
    expressionPace: 'words_later',
    decisionPace: 'no_shared_decision_yet',
    disagreement: 'talk_now',
    returnPattern: 'someone_reaches',
  };

  const R6_NO_OBS_RETURN: CompatibilityCurrentContextAnswersV2 = {
    expressionPace: 'words_soon',
    decisionPace: 'decide_later',
    disagreement: 'take_space',
    returnPattern: 'no_misalignment_return_yet',
  };

  it('builds R3 guest result without legacy conversion when decisionPace is NO_OBSERVATION', () => {
    const outcome = buildCompatibilityPublicResult(
      FORWARD,
      'R3',
      R3_NO_OBS_DECISION,
    );
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    const context = outcome.value.currentContext;
    assert.ok(context);
    assert.match(context.currentExpression, /まだ|観察|出来事/);
    assert.doesNotMatch(context.currentExpression, /その場で進めたい|結論を置く前に/);
    assert.doesNotMatch(outcome.value.free.relationshipDynamic, /その場で進めたい|結論を置く前に/);
    assert.doesNotMatch(
      JSON.stringify(outcome.value),
      /decide_varies|take_space|time_restores/,
    );
  });

  it('builds R6 guest result without legacy conversion when returnPattern is NO_OBSERVATION', () => {
    const outcome = buildCompatibilityPublicResult(
      FORWARD,
      'R6',
      R6_NO_OBS_RETURN,
    );
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    const context = outcome.value.currentContext;
    assert.ok(context);
    assert.match(context.currentExpression, /まだ|観察|出来事/);
    assert.doesNotMatch(context.currentExpression, /戻るきっかけ|自然に戻ったあと/);
    assert.doesNotMatch(outcome.value.free.relationshipDynamic, /戻るきっかけ|自然に戻ったあと/);
  });
});

describe('compatibility paid bridge', () => {
  it('uses explicit axis/topic mappings and all actual six chapters', () => {
    assert.deepEqual(new Set(Object.values(PAIR_AXIS_PAID_CHAPTER_MAPPING)), new Set(['ch_pair_gap']));
    assert.deepEqual(new Set(Object.values(TOPIC_PAID_CHAPTER_MAPPING)), new Set(['ch_topic_deep']));
    assert.deepEqual(GUEST_TOPIC_BY_PAIR_AXIS, { A1: 'T3', A2: 'T4', A3: 'T2', A4: 'T1' });
    const result = mustBuild();
    assert.equal(result.mappedChapters.length, 2);
    assert.deepEqual(
      result.mappedChapters.map((chapter) => chapter.chapterId),
      ['ch_pair_gap', 'ch_topic_deep'],
    );
    assert.equal(result.allChapters.length, 6);
    assert.equal(result.allChapters[5]?.chapterId, 'ch_about');
  });

  it('describes only implemented paid deliverables and uses no opaque relevance score', () => {
    const source = read('components/compatibility/CompatibilityGuestExperience.tsx');
    assert.match(source, /場面から戻る手順/);
    assert.match(source, /そのまま使える一言/);
    assert.match(source, /今週一度だけ試すこと/);
    assert.match(source, /あとで振り返る一問/);
    assert.doesNotMatch(source, /relevance|recommendation/);
    assert.doesNotMatch(source, /PurchaseButton|checkout|\/api\/purchase/);
  });
});

describe('compatibility privacy and runtime wiring', () => {
  it('returns no DOB or internal deterministic proof fields', () => {
    const serialized = JSON.stringify(mustBuild());
    assert.equal(serialized.includes(FORWARD.personA), false);
    assert.equal(serialized.includes(FORWARD.personB), false);
    assert.doesNotMatch(serialized, /hash|fingerprint|generationMeta|laneId|teaserId|reportId/i);
  });

  it('does not persist or render internal proof fields and does not log', () => {
    const component = read('components/compatibility/CompatibilityGuestExperience.tsx');
    const action = read('app/synastry/actions.ts');
    const builder = read('lib/m55/compatibility/pairReadingGuestResult.ts');
    assert.doesNotMatch(component, /localStorage|inputHash|outputHash|pairHash|dobHash|proofHash/i);
    assert.doesNotMatch(action + builder, /console\.|logger|log\(/);
    assert.match(component, /sessionStorage\.setItem\(COMPATIBILITY_GUEST_SESSION_KEY/);
  });

  it('uses the analytics allowlist and requested compatibility events', () => {
    const payload = buildPrivacySafeFunnelPayload(
      'compatibility_guest',
      '2026-07-13T00:00:00.000Z',
    );
    assert.deepEqual(Object.keys(payload).sort(), ['eventVersion', 'occurredAt', 'surface']);
    assertPrivacySafeFunnelPayload(payload);
    assert.equal(M55_FUNNEL_EVENTS.compatibilityInputView, 'm55_compatibility_input_view');
    assert.equal(
      M55_FUNNEL_EVENTS.compatibilityFreeResultView,
      'm55_compatibility_free_result_view',
    );
    assert.equal(M55_FUNNEL_EVENTS.compatibilityActionView, 'm55_compatibility_action_view');
    assert.equal(
      M55_FUNNEL_EVENTS.compatibilityPaidBridgeView,
      'm55_compatibility_paid_bridge_view',
    );
    assert.equal(
      M55_FUNNEL_EVENTS.compatibilityPaidBridgeClick,
      'm55_compatibility_paid_bridge_click',
    );
    assert.throws(() =>
      assertPrivacySafeFunnelPayload({
        ...payload,
        resultHash: 'forbidden',
      }),
    );
  });

  it('dedupes Strict Mode impressions and keeps result before bridge/auth', () => {
    resetFunnelImpressionDedupeForTests();
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.compatibilityFreeResultView,
      'compatibility_guest',
      'strict-mode-test',
    );
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.compatibilityFreeResultView,
      'compatibility_guest',
      'strict-mode-test',
    );
    const component = read('components/compatibility/CompatibilityGuestExperience.tsx');
    const route = read('app/synastry/page.tsx');
    const middleware = read('middleware.ts');
    assert.ok(component.indexOf('resultHeader') < component.indexOf('paidBridge'));
    assert.doesNotMatch(component + route, /useUser|SignedIn|SignInButton|auth wall/i);
    assert.match(middleware, /'\/synastry'/);
  });
});
