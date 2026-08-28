import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPairFreeInsightSpecV2, type PairFreeInsightSpecV2 } from './pairFreeInsightSpecV2';
import { buildCompatibilityPublicResult } from './pairReadingGuestResult';
import type { PaidTopicId } from './pairReadingTypes';
import type { CompatibilityCurrentContextAnswers } from './currentContextContract.v1';
import type { CompatibilityCurrentContextAnswersV2 } from './currentContextContract.v2';
import { COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS } from './currentContextContract.v1';
import { buildPaidCompatibilityReportV1 } from './buildPaidCompatibilityReportV1';

const TEMPO: CompatibilityCurrentContextAnswers = {
  decisionPace: 'decide_now',
  disagreement: 'talk_now',
  distance: 'go_quiet',
  expressionPace: 'words_later',
  returnPattern: 'someone_reaches',
  focus: 'conversation_focus',
};

const SPACE: CompatibilityCurrentContextAnswers = {
  decisionPace: 'decide_later',
  disagreement: 'take_space',
  distance: 'go_quiet',
  expressionPace: 'words_later',
  returnPattern: 'return_is_hard',
  focus: 'return_focus',
};

const CARRIES: CompatibilityCurrentContextAnswers = {
  decisionPace: 'decide_now',
  disagreement: 'one_carries',
  distance: 'space_is_hard',
  expressionPace: 'words_vary',
  returnPattern: 'time_restores',
  focus: 'loop_focus',
};

const TEMPO_SWAPPED_POLES: CompatibilityCurrentContextAnswers = {
  decisionPace: 'decide_later',
  disagreement: 'talk_now',
  distance: 'explain_space',
  expressionPace: 'words_soon',
  returnPattern: 'someone_reaches',
  focus: 'next_step_focus',
};

const SIMILAR: CompatibilityCurrentContextAnswers = {
  decisionPace: 'decide_later',
  disagreement: 'talk_now',
  distance: 'explain_space',
  expressionPace: 'words_later',
  returnPattern: 'someone_reaches',
  focus: 'next_step_focus',
};

function insight(
  answers: CompatibilityCurrentContextAnswers,
  perspective = true,
) {
  return buildPairFreeInsightSpecV2({
    answers,
    pairAxisId: 'A2',
    personABirthDate: '1990-01-15',
    personBBirthDate: '1992-08-20',
    personAUsesFirstPerspective: perspective,
    focusLabel: '会話の進め方',
    relationStatusId: 'R3',
  });
}

function insightV2(
  answersV2: CompatibilityCurrentContextAnswersV2,
  relationStatusId: 'R3' | 'R6' = 'R3',
  perspective = true,
) {
  return buildPairFreeInsightSpecV2({
    answersV2,
    pairAxisId: 'A2',
    personABirthDate: '1990-01-15',
    personBBirthDate: '1992-08-20',
    personAUsesFirstPerspective: perspective,
    focusLabel: '会話の進め方',
    relationStatusId,
  });
}

const ESTABLISHED_BEHAVIORAL_V2: CompatibilityCurrentContextAnswersV2 = {
  expressionPace: 'words_later',
  decisionPace: 'decide_later',
  disagreement: 'talk_now',
  returnPattern: 'someone_reaches',
};

function insightVisibleText(spec: PairFreeInsightSpecV2): string {
  return [
    spec.betweenThem,
    spec.meshMoment,
    spec.mismatchEntry,
    spec.misreadLoop,
    spec.reset,
    spec.relationshipTriggerJa,
    spec.premiumContinuation,
  ].join('\n');
}

const DECISION_PACE_DEPENDENT = [
  /決める速さとの差/,
  /結論の置き方との差/,
  /その場で進めたい/,
  /結論を置く前に/,
  /決める速さが場面で変わる/,
  /決める速さの差が、読み取りのずれ/,
] as const;

const DISAGREEMENT_DEPENDENT = [
  /違いをその場の言葉で揃え/,
  /いったん間を取る動き/,
  /話題を引き取る動き/,
] as const;

const RETURN_PATTERN_DEPENDENT = [
  /戻るきっかけの見え方/,
  /自然に戻ったあとの温度差/,
  /戻る入口の重さ/,
] as const;

function dependentClaimCount(text: string, patterns: readonly RegExp[]): number {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

const R6_FUTURE_INTENT = /長く一緒にいることを考える|考える段階/;

describe('pair free insight NO_OBSERVATION handling', () => {
  it('keeps partial NO_OBSERVATION cases safe without behavioral fallback', () => {
    const cases = [
      {
        label: 'decisionPace',
        answers: {
          ...ESTABLISHED_BEHAVIORAL_V2,
          decisionPace: 'no_shared_decision_yet' as const,
        },
        dependent: DECISION_PACE_DEPENDENT,
        gap: 'decisionPace' as const,
      },
      {
        label: 'disagreement',
        answers: {
          ...ESTABLISHED_BEHAVIORAL_V2,
          disagreement: 'no_disagreement_yet' as const,
        },
        dependent: DISAGREEMENT_DEPENDENT,
        gap: 'disagreement' as const,
      },
      {
        label: 'returnPattern',
        answers: {
          ...ESTABLISHED_BEHAVIORAL_V2,
          returnPattern: 'no_misalignment_return_yet' as const,
        },
        dependent: RETURN_PATTERN_DEPENDENT,
        gap: 'returnPattern' as const,
      },
      {
        label: 'all-three',
        answers: {
          expressionPace: 'words_later' as const,
          decisionPace: 'no_shared_decision_yet' as const,
          disagreement: 'no_disagreement_yet' as const,
          returnPattern: 'no_misalignment_return_yet' as const,
        },
        dependent: [
          ...DECISION_PACE_DEPENDENT,
          ...DISAGREEMENT_DEPENDENT,
          ...RETURN_PATTERN_DEPENDENT,
        ],
        gap: null,
      },
    ] as const;

    for (const testCase of cases) {
      const spec = insightV2(testCase.answers, 'R3');
      const visible = insightVisibleText(spec);
      assert.equal(dependentClaimCount(visible, testCase.dependent), 0, testCase.label);
      if (testCase.gap === 'decisionPace') {
        assert.doesNotMatch(spec.meshMoment, /決める速さ|結論の置/u, testCase.label);
      }
      if (testCase.gap) {
        assert.deepEqual(spec.observationGapQuestionIds, [testCase.gap], testCase.label);
        assert.equal(spec.evidenceQuestionIds.includes(testCase.gap), false, testCase.label);
      } else {
        assert.deepEqual(
          spec.observationGapQuestionIds,
          ['decisionPace', 'disagreement', 'returnPattern'],
          testCase.label,
        );
        assert.equal(spec.evidenceQuestionIds.length, 1, testCase.label);
        assert.equal(spec.evidenceQuestionIds[0], 'expressionPace', testCase.label);
      }
      const again = insightV2(testCase.answers, 'R3');
      assert.deepEqual(spec, again, testCase.label);
    }
  });

  it('rejects silent legacy coercion for explicit NO_OBSERVATION decisionPace', () => {
    const behavioral = insightV2(ESTABLISHED_BEHAVIORAL_V2);
    const wouldBeVaries = insightV2({
      ...ESTABLISHED_BEHAVIORAL_V2,
      decisionPace: 'decide_varies',
    });
    const noObs = insightV2({
      ...ESTABLISHED_BEHAVIORAL_V2,
      decisionPace: 'no_shared_decision_yet',
    });
    assert.notEqual(noObs.mismatchEntry, behavioral.mismatchEntry);
    assert.notEqual(noObs.mismatchEntry, wouldBeVaries.mismatchEntry);
    assert.match(noObs.mismatchEntry, /まだ二人で何かを決める場面がない/);
    assert.match(noObs.id, /no_shared_decision_yet/);
    assert.doesNotMatch(noObs.id, /:decide_varies:/);
  });

  it('keeps paid V2 display path safe for NO_OBSERVATION without editing paid builder', () => {
    const snapshot = buildPaidCompatibilityReportV1({
      pairAxisId: 'A2',
      paidTopicId: 'T3',
      relationStatusId: 'R3',
      temperatureId: 'E0',
      personAUsesFirstPerspective: true,
      currentContextV2: {
        expressionPace: 'words_later',
        decisionPace: 'no_shared_decision_yet',
        disagreement: 'talk_now',
        returnPattern: 'someone_reaches',
      },
      personABirthDate: '1990-01-15',
      personBBirthDate: '1992-08-20',
    });
    assert.ok(snapshot.currentContext);
    assert.match(snapshot.currentContext.currentExpression, /まだ|観察|出来事/);
    assert.doesNotMatch(snapshot.currentContext.currentExpression, /その場で進めたい/);
  });

  it('uses current R6 relationship context without future-intent phrasing', () => {
    const spec = insightV2(ESTABLISHED_BEHAVIORAL_V2, 'R6');
    const visible = insightVisibleText(spec);
    assert.doesNotMatch(visible, R6_FUTURE_INTENT);
    assert.match(spec.betweenThem, /長い付き合い|結婚|一緒にいる/);
  });
});

describe('pair free insight R5 distance stance', () => {
  const R5_NOT_CONSIDERING: CompatibilityCurrentContextAnswersV2 = {
    reapproachReadiness: 'not_considering_reapproach',
    distance: 'go_quiet',
    expressionPace: 'words_later',
  };
  const R5_REAPPROACH_FORBIDDEN = /もう一度近づく|再接近を考える|近づきたい|再接近の前提/u;
  const R5_TOPICS = ['T1', 'T2', 'T3', 'T4', 'T5'] as const satisfies readonly PaidTopicId[];

  it('accepts not_considering_reapproach without reapproach-intent claims', () => {
    const spec = buildPairFreeInsightSpecV2({
      answersV2: R5_NOT_CONSIDERING,
      pairAxisId: 'A2',
      personABirthDate: '1990-01-15',
      personBBirthDate: '1992-08-20',
      personAUsesFirstPerspective: true,
      focusLabel: '今の距離感',
      relationStatusId: 'R5',
    });
    const visible = insightVisibleText(spec);
    assert.doesNotMatch(visible, /もう一度近づく|再接近を考える|近づくことを考える/u);
    assert.match(visible, /今は近づくことを考えていない|いまの距離/);
    for (const paidTopicId of R5_TOPICS) {
      const guest = buildCompatibilityPublicResult(
        { personA: '1990-01-15', personB: '1992-08-20' },
        'R5',
        R5_NOT_CONSIDERING,
        {
          relationStatusId: 'R5',
          paidTopicId,
          temperatureId: 'E0',
        },
      );
      assert.equal(guest.ok, true, paidTopicId);
      if (!guest.ok) return;
      const context = guest.value.currentContext;
      assert.ok(context, paidTopicId);
      assert.doesNotMatch(context.currentExpression, /もう一度近づく|再接近を考える/u, paidTopicId);
      assert.doesNotMatch(context.readingGuide ?? '', /再接近/u, paidTopicId);
      assert.doesNotMatch(
        guest.value.free.relationshipDynamic,
        /もう一度近づく|再接近を考える/u,
        paidTopicId,
      );
      assert.doesNotMatch(
        guest.value.free.immediateAction.situation,
        R5_REAPPROACH_FORBIDDEN,
        paidTopicId,
      );
      assert.match(context.immediateAction, /今は近づくことを考えていない/, paidTopicId);
    }
  });
});

describe('pair free insight quality v2', () => {
  it('builds a relationship loop that requires both sides', () => {
    const spec = insight(TEMPO);
    assert.match(spec.betweenThem, /二人|間/);
    assert.match(spec.misreadLoop, /あなた|相手/);
    assert.ok(spec.misreadLoop.includes('あなた') && spec.misreadLoop.includes('相手'));
    assert.doesNotMatch(spec.betweenThem, /あなたは慎重で、相手は直感的/);
    assert.doesNotMatch(spec.reset, /必ず|運命|診断/);
  });

  it('swaps あなた/相手 on A/B perspective flip while keeping the same interaction', () => {
    const forward = insight(TEMPO, true);
    const swapped = insight(TEMPO, false);
    assert.equal(forward.interactionId, swapped.interactionId);
    assert.equal(forward.meshMoment, swapped.meshMoment);
    assert.notEqual(forward.misreadLoop, swapped.misreadLoop);
    assert.ok(forward.misreadLoop.includes('あなた'));
    assert.ok(swapped.misreadLoop.includes('相手'));
  });

  it('varies across tempo, space, carry, swapped-pole, and similar-pace fixtures', () => {
    const texts = [TEMPO, SPACE, CARRIES, TEMPO_SWAPPED_POLES, SIMILAR].map(
      (answers) => insight(answers).betweenThem,
    );
    assert.equal(new Set(texts).size, 5);
    for (const text of texts) {
      assert.equal((text.match(/二人の間では/g) ?? []).length, 2, text);
      assert.match(text, /^二人の間では/u);
      assert.match(text, /あなた側は/);
      assert.match(text, /相手側は/);
    }
  });

  it('does not assign a generic first-mover role when both sides share a slow tempo', () => {
    const spec = insight(SIMILAR);
    assert.doesNotMatch(spec.betweenThem, /先に動いて見えやすく/);
    assert.match(spec.betweenThem, /あなた側は/);
    assert.match(spec.betweenThem, /相手側は/);
    assert.match(spec.betweenThem, /そのため二人の間では/);
    assert.equal((spec.betweenThem.match(/二人の間では/g) ?? []).length, 2);
    assert.match(spec.betweenThem, /^二人の間では/u);
  });

  it('guest public result overlays synthesis onto free current context only', () => {
    const result = buildCompatibilityPublicResult(
      { personA: '1990-01-15', personB: '1992-08-20' },
      'R3',
      undefined,
      undefined,
      TEMPO,
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const context = result.value.currentContext;
    assert.ok(context);
    assert.equal(context.relationshipLoopSteps.length, 3);
    assert.match(context.currentExpression, /二人|速度|間|側/);
    assert.match(result.value.free.relationshipDynamic, /二人|速度|間|側/);
    const labels = COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS.flatMap((q) =>
      q.choices.map((c) => c.label),
    );
    let hits = 0;
    for (const label of labels) {
      if (label.length >= 6 && context.currentExpression.includes(label)) hits += 1;
    }
    assert.equal(hits, 0);
  });

  it('same answers with different A/B birth signatures change the relationship reading', () => {
    const left = buildCompatibilityPublicResult(
      { personA: '1983-02-28', personB: '1997-06-15' },
      'R3',
      undefined,
      undefined,
      TEMPO,
    );
    const right = buildCompatibilityPublicResult(
      { personA: '1990-01-05', personB: '1990-01-06' },
      'R3',
      undefined,
      undefined,
      TEMPO,
    );
    assert.equal(left.ok && right.ok, true);
    if (!left.ok || !right.ok) return;
    assert.notEqual(
      left.value.free.relationshipDynamic,
      right.value.free.relationshipDynamic,
    );
    assert.match(left.value.free.relationshipDynamic, /生まれの基調|土台/);
    assert.match(right.value.free.relationshipDynamic, /生まれの基調|土台/);
  });

  it('records both birth signatures and does not fabricate independent A/B answers', () => {
    const spec = insight(TEMPO);
    assert.equal(spec.aBirthEvidence, true);
    assert.equal(spec.bBirthEvidence, true);
    assert.equal(spec.pairAnswerEvidence, true);
    assert.equal(spec.independentAAnswerEvidence, false);
    assert.equal(spec.independentBAnswerEvidence, false);
    assert.doesNotMatch(spec.betweenThem, /\d{4}-\d{2}-\d{2}/);
    assert.doesNotMatch(spec.misreadLoop, /\d{4}-\d{2}-\d{2}/);
  });
});
