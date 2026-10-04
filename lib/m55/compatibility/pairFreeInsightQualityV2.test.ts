import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPairFreeInsightSpecV2, type PairFreeInsightSpecV2 } from './pairFreeInsightSpecV2';
import { buildCompatibilityPublicResult } from './pairReadingGuestResult';
import type { PaidTopicId } from './pairReadingTypes';
import type { CompatibilityCurrentContextAnswers } from './currentContextContract.v1';
import type { CompatibilityCurrentContextAnswersV2 } from './currentContextContract.v2';
import { COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS } from './currentContextContract.v1';
import { buildPaidCompatibilityReportV1 } from './buildPaidCompatibilityReportV1';
import { projectCompatibilityFreeNarrativeV1 } from '../narrative/projectCompatibilityFreeNarrativeV1';

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

function sentencesJa(text: string): string[] {
  return text
    .split('。')
    .map((part) => part.trim())
    .filter((part) => part.length >= 8);
}

function sharedSentences(left: string, right: string): string[] {
  const other = new Set(sentencesJa(right));
  return sentencesJa(left).filter((sentence) => other.has(sentence));
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
    assert.match(spec.relationshipTriggerJa, /日常の用事が一段落したあと/);
    assert.doesNotMatch(
      [
        spec.evidenceSupportJa,
        spec.currentExpressionJa,
        spec.betweenThem,
        ...spec.relationshipSequenceJa,
        spec.freeDepthAngleJa,
      ].join('\n'),
      /長く一緒にいる|いま一緒にいる時間|一緒にいる時間が長くなっても/,
    );
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
  it('builds a dyadic relationship loop without fabricated side assignment', () => {
    const spec = insight(TEMPO);
    assert.match(spec.betweenThem, /二人|間/);
    assert.match(spec.misreadLoop, /同じ型が続く|区別しにくい/u);
    assert.doesNotMatch(spec.misreadLoop, /片方が|もう片方/u);
    assert.doesNotMatch(spec.betweenThem, /あなたは慎重で、相手は直感的/);
    assert.doesNotMatch(spec.reset, /必ず|運命|診断/);
  });

  it('keeps the same dyadic misread on A/B perspective flip while birth cues can differ', () => {
    const forward = insight(TEMPO, true);
    const swapped = insight(TEMPO, false);
    assert.equal(forward.interactionId, swapped.interactionId);
    assert.equal(forward.meshMoment, swapped.meshMoment);
    assert.equal(forward.misreadLoop, swapped.misreadLoop);
    assert.match(forward.misreadLoop, /同じ型が続く|区別しにくい/u);
  });

  it('varies across tempo, space, carry, swapped-pole, and similar-pace fixtures', () => {
    const specs = [TEMPO, SPACE, CARRIES, TEMPO_SWAPPED_POLES, SIMILAR].map((answers) =>
      insight(answers),
    );
    const fingerprints = specs.map((spec) => `${spec.betweenThem}|${spec.currentExpressionJa}`);
    assert.equal(new Set(fingerprints).size, 5);
    for (const spec of specs) {
      assert.match(spec.betweenThem, /^二人の間では/u);
      assert.match(spec.relationshipTriggerJa, /二人のあいだ/u);
      assert.match(`${spec.relationshipTriggerJa}\n${spec.evidenceSupportJa}`, /言葉|区切|沈黙|間/u);
      assert.notEqual(spec.betweenThem, spec.currentExpressionJa);
      assert.notEqual(spec.relationshipTriggerJa, spec.evidenceSupportJa);
      assert.notEqual(spec.relationshipTriggerJa, spec.betweenThem);
      assert.equal(sharedSentences(spec.relationshipTriggerJa, spec.betweenThem).length, 0);
      assert.equal(sharedSentences(spec.evidenceSupportJa, spec.betweenThem).length, 0);
      assert.equal(sharedSentences(spec.currentExpressionJa, spec.mismatchEntry).length, 0);
    }
  });

  it('does not assign a generic first-mover role when both sides share a slow tempo', () => {
    const spec = insight(SIMILAR);
    assert.doesNotMatch(spec.betweenThem, /先に動いて見えやすく/);
    assert.doesNotMatch(spec.currentExpressionJa, /先に動いて見えやすく/);
    assert.match(spec.betweenThem, /^二人の間では/);
    assert.notEqual(spec.betweenThem, spec.currentExpressionJa);
    assert.notEqual(spec.relationshipTriggerJa, spec.evidenceSupportJa);
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
    assert.notEqual(context.currentExpression, result.value.free.relationshipDynamic);
    const labels = COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS.flatMap((q) =>
      q.choices.map((c) => c.label),
    );
    let hits = 0;
    for (const label of labels) {
      if (label.length >= 6 && context.currentExpression.includes(label)) hits += 1;
    }
    assert.equal(hits, 0);
  });

  it('wires relationshipDynamic to betweenThem and currentExpression to currentExpressionJa', () => {
    const spec = insight(TEMPO);
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
    assert.equal(result.value.free.relationshipDynamic, spec.betweenThem);
    assert.equal(context.currentExpression, spec.currentExpressionJa);
    assert.notEqual(result.value.free.relationshipDynamic, context.currentExpression);
    assert.match(result.value.free.relationshipDynamic, /^二人の間では/u);
    assert.match(context.currentExpression, /いまの会話では/u);
    assert.notEqual(spec.relationshipTriggerJa, spec.evidenceSupportJa);
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

  it('established R3 guest loop leads with axis overlap and manual exposes both movement patterns', () => {
    const result = buildCompatibilityPublicResult(
      { personA: '1990-01-15', personB: '1992-08-20' },
      'R3',
      ESTABLISHED_BEHAVIORAL_V2,
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const context = result.value.currentContext;
    assert.ok(context);
    assert.notEqual(context.relationshipLoopSteps[0], result.value.free.overlap);
    assert.notEqual(context.relationshipLoopSteps[1], result.value.free.difference);
    assert.notEqual(context.relationshipLoopSteps[0], result.value.free.difference);
    const spec = insightV2(ESTABLISHED_BEHAVIORAL_V2);
    for (const step of context.relationshipLoopSteps) {
      assert.notEqual(step, result.value.free.overlap);
      assert.notEqual(step, result.value.free.difference);
      assert.notEqual(step, spec.mismatchEntry);
    }
    assert.equal(new Set(context.relationshipLoopSteps).size, 3);
    assert.notEqual(spec.relationshipTriggerJa, spec.evidenceSupportJa);
    assert.notEqual(spec.evidenceSupportJa, spec.betweenThem);
    assert.match(spec.relationshipTriggerJa, /言葉/);
    assert.match(spec.relationshipTriggerJa, /結論|区切/);
    assert.match(spec.evidenceSupportJa, /戻|声|間/);
    assert.doesNotMatch(
      [
        spec.relationshipTriggerJa,
        spec.evidenceSupportJa,
        spec.currentExpressionJa,
        spec.mismatchEntry,
        spec.betweenThem,
        ...spec.relationshipSequenceJa,
        spec.freeDepthAngleJa,
      ].join('\n'),
      /相手は本当は|と思っている|必ず|片方が|もう片方|話を閉じた側|次の用事へ移る側/,
    );
  });
});

const DECISION_PACES = ['decide_now', 'decide_later', 'decide_varies'] as const;
const EXPRESSION_PACES = ['words_soon', 'words_later', 'words_vary'] as const;
const DISAGREEMENTS = ['talk_now', 'take_space', 'one_carries'] as const;
const RETURN_PATTERNS = ['someone_reaches', 'time_restores', 'return_is_hard'] as const;
const ESTABLISHED_STAGES = ['R3', 'R6'] as const;

const ESTABLISHED_BANNED = [
  /まま.{0,24}まま/u,
  /ところで話を閉じ/u,
  /そのとき.{0,40}一方で/u,
  /話が終わった時刻/u,
  /話を閉じた時刻/u,
  /片方が/u,
  /もう片方/u,
  /話を閉じた側/u,
  /次の用事へ移る側/u,
  /相手は本当は/u,
  /相手には.{0,24}(と思われる|薄さ)/u,
  /同じタイミングに揃いにくい/u,
  /短い声が戻ったあと/u,
  /話の温度が揃う/u,
  /あとに残るのは意見の中身より/u,
  /戻る入口が重いと、空白のあとに.*ことです/u,
  /の取り方に残る/u,
  /の読み分けに残る/u,
  /残るかどうかに残る/u,
] as const;

const RETURN_JOB_EXPECTATIONS = {
  someone_reaches: {
    support: /合図|入口|つなぐ/u,
    sequence2: /かけ直した|続き始める/u,
  },
  time_restores: {
    support: /距離|自然に戻|時間がたつ/u,
    sequence2: /時間を置いた|距離が自然/u,
  },
  return_is_hard: {
    support: /手がかり|戻りにくさ/u,
    sequence2: /戻るまでに間|戻る入口が重/u,
  },
} as const;

const PACE_JOB_EXPECTATIONS: Record<
  string,
  { hero: RegExp; current: RegExp; mismatch: RegExp; sequence1: RegExp }
> = {
  'decide_now:words_soon': {
    hero: /区切りと言葉が同じ場面で出る/u,
    current: /区切りと言葉が同じ場面で同時に出ている/u,
    mismatch: /一区切りとみなす|同時に見える/u,
    sequence1: /この場面で同時に出ている/u,
  },
  'decide_now:words_later': {
    hero: /区切りはその場で置かれる一方、その区切りを言葉にするのはあとからになる/u,
    current: /その区切りを言葉にするのはあとからになっている/u,
    mismatch: /区切りだけが先|説明をどこまで/u,
    sequence1: /あとに控えている/u,
  },
  'decide_now:words_vary': {
    hero: /区切りはその場で置かれる一方、言葉になるタイミングは場面で変わる/u,
    current: /言葉になるタイミングが場面で変わっている/u,
    mismatch: /タイミング|出方|場面/u,
    sequence1: /その場で区切りは置かれ、言葉になるタイミングは場面によって変わる/u,
  },
  'decide_later:words_soon': {
    hero: /言葉は先に出る一方、区切りはまだ置かれない/u,
    current: /言葉は先に出ており、区切りはまだ置かれていない/u,
    mismatch: /言葉だけが先|説明の途中/u,
    sequence1: /言葉はすでに出ており、区切りを置くのはまだあとになっている/u,
  },
  'decide_later:words_later': {
    hero: /区切りを置くにも、言葉にするにも、時間がかかる/u,
    current: /どちらも時間をかけて進んでいる/u,
    mismatch: /考える時間/u,
    sequence1: /どちらもかかっている/u,
  },
  'decide_later:words_vary': {
    hero: /決めるまで時間を置きやすく、言葉になるタイミングは場面で変わる/u,
    current: /決めるまで時間を置く一方、言葉になるタイミングがその場面で変わっている/u,
    mismatch: /時間を置|タイミング|場面/u,
    sequence1: /決めるまで時間を置き、言葉になるタイミングは場面によって変わる/u,
  },
  'decide_varies:words_soon': {
    hero: /言葉はすぐ出るが、いつ結論を置くかはその場面で変わる/u,
    current: /いつ結論を置くかはその場面で変わっている/u,
    mismatch: /場面の変化/u,
    sequence1: /言葉はすぐ出て、いつ区切りを置くかは場面によって変わる/u,
  },
  'decide_varies:words_later': {
    hero: /言葉は遅れて出る一方、決めるタイミングはその場面で変わる/u,
    current: /言葉は遅れて出ており、決めるタイミングがその場面で変わっている/u,
    mismatch: /決めるタイミング|遅れ/u,
    sequence1: /説明は遅れて届き/u,
  },
  'decide_varies:words_vary': {
    hero: /決めるタイミングも言葉になるタイミングも、その場面ごとに変わる/u,
    current: /決めるタイミングと言葉になるタイミングが、その場面ごとに異なっている/u,
    mismatch: /タイミング|日の違い/u,
    sequence1: /話の途中では、決めるタイミングも言葉になるタイミングも、場面ごとに変わる/u,
  },
};

const DECISION_TIMING_VARIES_BY_SCENE =
  /決めるタイミング[\s\S]{0,40}場面(?:ごと|で)[\s\S]{0,12}(?:変わる|異な)/u;
const EXPRESSION_TIMING_VARIES_BY_SCENE =
  /言葉になるタイミング[\s\S]{0,40}場面(?:ごと|で)[\s\S]{0,12}(?:変わる|異な)/u;
const FIXED_DUAL_TIMING = '決めるタイミングも言葉になるタイミングも、いつも同じです。';

const CONCLUSION_JOB_EXPECTATIONS = {
  talk_now: /一区切りとみなす/u,
  take_space: /途中と読むかここで終わった/u,
  one_carries: /話題を引き取って流れを先へ進める/u,
} as const;

const PUBLIC_DOB_CUE = /生まれの基調|週のリズム|始め方|区切りの置き方|返す速さ|予定の追い方/u;

function sentenceCountJa(text: string): number {
  return text
    .split('。')
    .map((part) => part.trim())
    .filter((part) => part.length > 0).length;
}

const R6_STAGE_ECHO = /長く一緒にいる|いま一緒にいる時間|一緒にいる時間が長くなっても/u;

type SemanticAtom =
  | 'decision_expression_timing'
  | 'disagreement_continuation'
  | 'return_reentry'
  | 'silence_pause'
  | 'birth_modulation'
  | 'repeated_misread'
  | 'other';

function classifySemanticAtom(text: string): SemanticAtom {
  if (/生まれの基調|週のリズム|始め方がずれ|区切りの置き方が違|返す速さ|予定の追い方/u.test(text)) {
    return 'birth_modulation';
  }
  if (/同じ型|薄れやすい|持ち越され|区別が薄れ/u.test(text)) return 'repeated_misread';
  if (/違いが出|言葉を重ね|話題を引き取|止ま/u.test(text)) return 'disagreement_continuation';
  if (/前の一言|引きずられ|残った一点|戻る合図/u.test(text)) return 'return_reentry';
  if (/戻|再開|短い声|空白/u.test(text)) return 'return_reentry';
  if (/沈黙|静けさ|間が/u.test(text)) return 'silence_pause';
  if (/区切り|結論|言葉.*先|追いつく|整う/u.test(text)) return 'decision_expression_timing';
  return 'other';
}

function establishedGeneratedBlob(spec: PairFreeInsightSpecV2): string {
  return [
    spec.relationshipTriggerJa,
    spec.evidenceSupportJa,
    spec.currentExpressionJa,
    spec.mismatchEntry,
    spec.misreadLoop,
    spec.betweenThem,
    ...spec.relationshipSequenceJa,
    spec.freeDepthAngleJa,
  ].join('\n');
}

const MALFORMED_RETURN_JOIN = /(?:入る|再開する|続きやすい)あと/u;
const R6_SCENE_CONDITION = /日常の用事/gu;
const ONE_CARRIES_MARKERS = /話題を引き取る|流れが先へ続く|先へ進んだ話題/gu;

function establishedMajorJobs(spec: PairFreeInsightSpecV2): Record<string, string> {
  return {
    hero: spec.relationshipTriggerJa,
    support: spec.evidenceSupportJa,
    current: spec.currentExpressionJa,
    mismatch: spec.mismatchEntry,
    misread: spec.misreadLoop,
    sequence0: spec.relationshipSequenceJa[0]!,
    sequence1: spec.relationshipSequenceJa[1]!,
    sequence2: spec.relationshipSequenceJa[2]!,
    conclusion: spec.betweenThem,
    manual: spec.freeDepthAngleJa,
    mesh: spec.meshMoment,
  };
}

function heroPaceObservation(triggerJa: string): string {
  const withoutStage = triggerJa.replace(/^日常の用事が一段落したあと、/u, '');
  const firstSentence = withoutStage.split('。').map((part) => part.trim()).find(Boolean) ?? '';
  return firstSentence;
}

function currentObservation(currentJa: string): string {
  return currentJa.replace(/^いまの会話では、/u, '').replace(/。$/u, '');
}

function assertUnlockedSequence1Semantics(paceKey: string, sequence1: string): void {
  const fixedDualTiming = '決めるタイミングも言葉になるタイミングも、いつも同じです。';
  const deferredBoundary = /区切りを置くのはまだあと|決めるまで時間を置/u;
  const boundaryInScene = /その場で区切りは置かれ/u;
  const expressionVaries = /言葉になるタイミングは場面によって変わる/u;
  const decisionVaries = /いつ区切りを置くかは場面によって変わる|決めるタイミングも言葉になるタイミングも、場面によって変わる/u;
  if (paceKey === 'decide_now:words_vary') {
    assert.match(sequence1, boundaryInScene, 'boundary occurs in the current scene');
    assert.match(sequence1, expressionVaries, 'expression timing varies by scene');
    assert.doesNotMatch(sequence1, /時点が動く/u);
    assert.doesNotMatch(fixedDualTiming, expressionVaries);
  } else if (paceKey === 'decide_later:words_soon') {
    assert.match(sequence1, /言葉はすでに出ており/u, 'expression is already out');
    assert.match(sequence1, /区切りを置くのはまだあと/u, 'boundary is deferred');
    assert.doesNotMatch(sequence1, /区切りの時点はまだ来ていない/u);
    assert.doesNotMatch('区切りはその場で置かれ、言葉はまだ出ていない。', deferredBoundary);
  } else if (paceKey === 'decide_later:words_vary') {
    assert.match(sequence1, /決めるまで時間を置/u, 'decision is deferred');
    assert.match(sequence1, expressionVaries, 'expression timing varies by scene');
    assert.doesNotMatch(sequence1, /説明の出る時点はこの場面で違う/u);
    assert.doesNotMatch(fixedDualTiming, expressionVaries);
  } else if (paceKey === 'decide_varies:words_soon') {
    assert.match(sequence1, /言葉はすぐ出て/u, 'expression comes promptly');
    assert.match(sequence1, /いつ区切りを置くかは場面によって変わる/u, 'decision timing varies by scene');
    assert.doesNotMatch(sequence1, /結論の時点はこの場面で動く/u);
    assert.doesNotMatch('いつ区切りを置くかも、いつも同じです。', decisionVaries);
  } else if (paceKey === 'decide_varies:words_vary') {
    assert.match(sequence1, DECISION_TIMING_VARIES_BY_SCENE, 'sequence1 decision timing varies by scene');
    assert.match(sequence1, EXPRESSION_TIMING_VARIES_BY_SCENE, 'sequence1 expression timing varies by scene');
    assert.doesNotMatch(sequence1, /この場面ごとに動いている/u);
    assert.doesNotMatch(fixedDualTiming, DECISION_TIMING_VARIES_BY_SCENE);
    assert.doesNotMatch(fixedDualTiming, EXPRESSION_TIMING_VARIES_BY_SCENE);
    assert.doesNotMatch(fixedDualTiming, /話の途中では、決めるタイミングも言葉になるタイミングも、場面ごとに変わる/u);
  }
}

describe('pair free established matrix patch-5 mismatch consistency', () => {
  it('passes grammar, factual consistency, semantic jobs, and R6 conditioning across all established combinations', () => {
    let checked = 0;
    let grammarFailures = 0;
    let duplicateFailures = 0;
    let r6Failures = 0;
    let groundingFailures = 0;
    let returnJobFailures = 0;
    let factualConsistencyFailures = 0;
    let currentMismatchFailures = 0;
    let mismatchSequence1Failures = 0;
    let sequence1ConclusionFailures = 0;
    for (const relationStatusId of ESTABLISHED_STAGES) {
      for (const decisionPace of DECISION_PACES) {
        for (const expressionPace of EXPRESSION_PACES) {
          for (const disagreement of DISAGREEMENTS) {
            for (const returnPattern of RETURN_PATTERNS) {
              const spec = insightV2(
                { decisionPace, expressionPace, disagreement, returnPattern },
                relationStatusId,
              );
              const jobs = establishedMajorJobs(spec);
              const blob = Object.values(jobs).join('\n');
              const paceKey = `${decisionPace}:${expressionPace}`;
              const paceExpect = PACE_JOB_EXPECTATIONS[paceKey]!;
              const returnExpect = RETURN_JOB_EXPECTATIONS[returnPattern];
              const heroCore = heroPaceObservation(spec.relationshipTriggerJa);
              const currentCore = currentObservation(spec.currentExpressionJa);

              for (const banned of ESTABLISHED_BANNED) {
                if (banned.test(blob)) groundingFailures += 1;
                assert.doesNotMatch(blob, banned, `${relationStatusId}:${decisionPace}:${expressionPace}`);
              }
              if (MALFORMED_RETURN_JOIN.test(blob)) {
                grammarFailures += 1;
                assert.fail(`malformed return join ${relationStatusId}:${decisionPace}:${expressionPace}`);
              }
              assert.notEqual(spec.mismatchEntry, spec.misreadLoop, 'mismatch-misread');
              assert.notEqual(jobs.support, jobs.sequence2, 'support-sequence2');
              assert.match(jobs.support, returnExpect.support, 'support return job');
              assert.match(jobs.sequence2, returnExpect.sequence2, 'sequence2 return job');

              assert.match(heroCore, paceExpect.hero, 'hero pace job');
              assert.match(currentCore, paceExpect.current, 'current pace job');
              assert.match(spec.mismatchEntry, paceExpect.mismatch, 'mismatch pace job');
              assert.match(jobs.sequence1, paceExpect.sequence1, 'sequence1 pace job');
              assertUnlockedSequence1Semantics(paceKey, jobs.sequence1);
              if (paceKey === 'decide_varies:words_vary') {
                assert.match(heroCore, DECISION_TIMING_VARIES_BY_SCENE, 'decision timing varies by scene');
                assert.match(heroCore, EXPRESSION_TIMING_VARIES_BY_SCENE, 'expression timing varies by scene');
                assert.match(currentCore, DECISION_TIMING_VARIES_BY_SCENE, 'current decision timing varies');
                assert.match(currentCore, EXPRESSION_TIMING_VARIES_BY_SCENE, 'current expression timing varies');
                assert.doesNotMatch(FIXED_DUAL_TIMING, DECISION_TIMING_VARIES_BY_SCENE);
                assert.doesNotMatch(FIXED_DUAL_TIMING, EXPRESSION_TIMING_VARIES_BY_SCENE);
                assert.doesNotMatch(FIXED_DUAL_TIMING, paceExpect.hero);
                assert.doesNotMatch(FIXED_DUAL_TIMING, paceExpect.current);
              }
              if (decisionPace === 'decide_varies') {
                assert.doesNotMatch(blob, /結論を置く日と置かない日|区切る日と置く日|入れ替わる/u);
              }
              if (decisionPace === 'decide_later' && expressionPace === 'words_later') {
                assert.doesNotMatch(blob, /区切りを置く前に言葉|言葉のあとに区切り|区切りのあとに言葉/u);
              }
              const sequence1Core = jobs.sequence1.replace(/。$/u, '');
              const mismatchCore = spec.mismatchEntry.replace(/。$/u, '');
              assert.notEqual(heroCore, currentCore, 'hero-current');
              assert.notEqual(heroCore, sequence1Core, 'hero-sequence1');
              assert.notEqual(currentCore, sequence1Core, 'current-sequence1');
              assert.notEqual(currentCore, mismatchCore, 'current-mismatch');
              assert.notEqual(mismatchCore, sequence1Core, 'mismatch-sequence1');

              assert.match(jobs.conclusion, CONCLUSION_JOB_EXPECTATIONS[disagreement], 'conclusion job');
              assert.doesNotMatch(jobs.conclusion, paceExpect.hero, 'conclusion-not-hero-pace');
              assert.doesNotMatch(jobs.conclusion, paceExpect.current, 'conclusion-not-current-pace');
              assert.doesNotMatch(jobs.conclusion, paceExpect.sequence1, 'conclusion-not-sequence1-pace');
              assert.doesNotMatch(jobs.conclusion, /違いのあと/u, 'conclusion-not-sequence-transition');

              const jobValues = Object.values(jobs);
              for (let i = 0; i < jobValues.length; i += 1) {
                for (let j = i + 1; j < jobValues.length; j += 1) {
                  if (jobValues[i] === jobValues[j]) {
                    duplicateFailures += 1;
                    assert.fail(`exact duplicate jobs ${i}/${j} ${decisionPace}:${expressionPace}`);
                  }
                }
              }
              if (relationStatusId === 'R6') {
                const sceneCount = blob.match(R6_SCENE_CONDITION)?.length ?? 0;
                if (sceneCount !== 1) r6Failures += 1;
                assert.equal(sceneCount, 1, `${decisionPace}:${expressionPace}`);
                assert.match(spec.relationshipTriggerJa, /日常の用事が一段落したあと/);
                const stageEchoCount = blob.match(new RegExp(R6_STAGE_ECHO.source, 'gu'))?.length ?? 0;
                assert.equal(stageEchoCount, 0, `${decisionPace}:${expressionPace}`);
              }
              const heroAtom = classifySemanticAtom(heroCore);
              const sequence0Atom = classifySemanticAtom(spec.relationshipSequenceJa[0]!);
              const mismatchAtom = classifySemanticAtom(spec.mismatchEntry);
              const misreadAtom = classifySemanticAtom(spec.misreadLoop);
              assert.notEqual(heroAtom, sequence0Atom, `hero-sequence0 ${decisionPace}:${expressionPace}`);
              assert.notEqual(mismatchAtom, misreadAtom, `mismatch-misread-atom ${decisionPace}:${expressionPace}`);
              assert.notEqual(spec.freeDepthAngleJa, spec.currentExpressionJa, `manual-current ${decisionPace}:${expressionPace}`);
              assert.notEqual(spec.freeDepthAngleJa, spec.mismatchEntry, `manual-mismatch ${decisionPace}:${expressionPace}`);
              if (disagreement === 'one_carries') {
                const markerHits = [
                  spec.mismatchEntry,
                  spec.misreadLoop,
                  spec.relationshipSequenceJa[0]!,
                  spec.freeDepthAngleJa,
                ]
                  .join('\n')
                  .match(ONE_CARRIES_MARKERS)?.length ?? 0;
                assert.ok(markerHits <= 2, `one_carries concentration ${decisionPace}:${expressionPace}`);
              }
              checked += 1;
            }
          }
        }
      }
    }
    assert.equal(checked, 162);
    assert.equal(grammarFailures, 0);
    assert.equal(duplicateFailures, 0);
    assert.equal(r6Failures, 0);
    assert.equal(groundingFailures, 0);
    assert.equal(returnJobFailures, 0);
    assert.equal(factualConsistencyFailures, 0);
    assert.equal(currentMismatchFailures, 0);
    assert.equal(mismatchSequence1Failures, 0);
    assert.equal(sequence1ConclusionFailures, 0);
  });

  it('keeps primary DOB text materiality on a primary recognition surface, not conclusion only', () => {
    const answers = {
      decisionPace: 'decide_now' as const,
      expressionPace: 'words_later' as const,
      disagreement: 'talk_now' as const,
      returnPattern: 'someone_reaches' as const,
    };
    const far = insightV2(answers, 'R3', true);
    const near = buildPairFreeInsightSpecV2({
      answersV2: answers,
      pairAxisId: 'A2',
      personABirthDate: '1990-01-05',
      personBBirthDate: '1990-01-06',
      personAUsesFirstPerspective: true,
      focusLabel: '会話の進め方',
      relationStatusId: 'R3',
    });
    const primaryFar = `${far.relationshipTriggerJa}|${far.evidenceSupportJa}|${far.currentExpressionJa}`;
    const primaryNear = `${near.relationshipTriggerJa}|${near.evidenceSupportJa}|${near.currentExpressionJa}`;
    assert.notEqual(primaryFar, primaryNear);
    assert.match(primaryFar, PUBLIC_DOB_CUE);
    assert.doesNotMatch(primaryFar, /stemDelta|lunarAligned|dayBand|season3/u);
  });

  it('keeps rendered primary DOB text materiality on openingHit projection', () => {
    const answers = {
      decisionPace: 'decide_now' as const,
      expressionPace: 'words_later' as const,
      disagreement: 'talk_now' as const,
      returnPattern: 'someone_reaches' as const,
    };
    const farSpec = buildPairFreeInsightSpecV2({
      answersV2: answers,
      pairAxisId: 'A2',
      personABirthDate: '1990-01-15',
      personBBirthDate: '1992-08-20',
      personAUsesFirstPerspective: true,
      focusLabel: '会話の進め方',
      relationStatusId: 'R3',
    });
    const nearSpec = buildPairFreeInsightSpecV2({
      answersV2: answers,
      pairAxisId: 'A2',
      personABirthDate: '1990-01-05',
      personBBirthDate: '1990-01-06',
      personAUsesFirstPerspective: true,
      focusLabel: '会話の進め方',
      relationStatusId: 'R3',
    });
    const farOpening = projectCompatibilityFreeNarrativeV1({ spec: farSpec }).openingHit.text;
    const nearOpening = projectCompatibilityFreeNarrativeV1({ spec: nearSpec }).openingHit.text;
    assert.notEqual(farOpening, nearOpening);
    assert.match(farOpening, PUBLIC_DOB_CUE);
    assert.doesNotMatch(farOpening, /stemDelta|lunarAligned|dayBand|season3/u);
  });

  it('limits established opening projection expansion to R3 and R6', () => {
    const answers = {
      decisionPace: 'decide_now' as const,
      expressionPace: 'words_later' as const,
      disagreement: 'talk_now' as const,
      returnPattern: 'someone_reaches' as const,
    };
    const r3Opening = projectCompatibilityFreeNarrativeV1({ spec: insightV2(answers, 'R3') }).openingHit
      .text;
    const r6Opening = projectCompatibilityFreeNarrativeV1({ spec: insightV2(answers, 'R6') }).openingHit
      .text;
    assert.ok(sentenceCountJa(r3Opening) >= 3);
    assert.ok(sentenceCountJa(r6Opening) >= 3);

    const r1Spec = buildPairFreeInsightSpecV2({
      answersV2: { expressionPace: 'words_later', approachIntent: 'wait_for_signal' },
      pairAxisId: 'A2',
      personABirthDate: '1990-01-15',
      personBBirthDate: '1992-08-20',
      personAUsesFirstPerspective: true,
      focusLabel: '会話の進め方',
      relationStatusId: 'R1',
    });
    const r2Spec = buildPairFreeInsightSpecV2({
      answersV2: { expressionPace: 'words_later', contactPace: 'light_contact' },
      pairAxisId: 'A2',
      personABirthDate: '1990-01-15',
      personBBirthDate: '1992-08-20',
      personAUsesFirstPerspective: true,
      focusLabel: '会話の進め方',
      relationStatusId: 'R2',
    });
    assert.ok(
      sentenceCountJa(projectCompatibilityFreeNarrativeV1({ spec: r1Spec }).openingHit.text) <= 2,
    );
    assert.ok(
      sentenceCountJa(projectCompatibilityFreeNarrativeV1({ spec: r2Spec }).openingHit.text) <= 2,
    );
  });

  it('removes partner-attributed private interpretation from R2 mismatch copy', () => {
    const spec = buildPairFreeInsightSpecV2({
      answersV2: { expressionPace: 'words_later', contactPace: 'light_contact' },
      pairAxisId: 'A2',
      personABirthDate: '1990-01-15',
      personBBirthDate: '1992-08-20',
      personAUsesFirstPerspective: true,
      focusLabel: '会話の進め方',
      relationStatusId: 'R2',
    });
    assert.doesNotMatch(spec.mismatchEntry, /相手には|関心の薄さ/u);
  });
});
