import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  M55_FUNNEL_EVENTS,
  assertPrivacySafeFunnelPayload,
  buildPrivacySafeFunnelPayload,
} from '../privacySafeFunnelAnalytics';
import {
  buildPaidCompatibilityReportV1,
  type PaidCompatibilityChapter,
  type PaidCompatibilityReportInput,
} from './buildPaidCompatibilityReportV1';
import {
  COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS,
  COMPATIBILITY_CURRENT_CONTEXT_STATE_COUNT,
  COMPATIBILITY_CURRENT_CONTEXT_VERSION,
  buildCompatibilityCurrentContextDisplay,
  isCompleteCompatibilityCurrentContext,
  type CompatibilityCurrentContextAnswers,
} from './currentContextContract.v1';
import { buildCompatibilityPublicResult } from './pairReadingGuestResult';

const ROOT = join(import.meta.dirname, '../../..');
const BASE_INPUT: Omit<PaidCompatibilityReportInput, 'currentContext'> = {
  pairAxisId: 'A3',
  paidTopicId: 'T2',
  relationStatusId: 'R3',
  temperatureId: 'E1',
  personAUsesFirstPerspective: true,
};

const CONTEXT_A: CompatibilityCurrentContextAnswers = {
  decisionPace: 'decide_later',
  disagreement: 'talk_now',
  distance: 'explain_space',
  expressionPace: 'words_soon',
  returnPattern: 'someone_reaches',
  focus: 'conversation_focus',
};
const CONTEXT_B: CompatibilityCurrentContextAnswers = {
  decisionPace: 'decide_later',
  disagreement: 'take_space',
  distance: 'go_quiet',
  expressionPace: 'words_later',
  returnPattern: 'return_is_hard',
  focus: 'return_focus',
};
const CONTEXT_C: CompatibilityCurrentContextAnswers = {
  decisionPace: 'decide_now',
  disagreement: 'one_carries',
  distance: 'space_is_hard',
  expressionPace: 'words_vary',
  returnPattern: 'time_restores',
  focus: 'next_step_focus',
};

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

function build(context: CompatibilityCurrentContextAnswers) {
  return buildPaidCompatibilityReportV1({ ...BASE_INPUT, currentContext: context });
}

function materialSignature(chapter: PaidCompatibilityChapter): string {
  return [
    chapter.scene,
    chapter.relationshipLoop.join('|'),
    chapter.resetSteps.join('|'),
    chapter.usablePhrase,
    chapter.smallExperiment,
  ].join('||');
}

function bodySnapshot(context: CompatibilityCurrentContextAnswers) {
  return build(context).chapters.map((chapter) => ({
    scene: chapter.scene,
    personAPerspective: chapter.personAPerspective,
    personBPerspective: chapter.personBPerspective,
    relationshipLoop: chapter.relationshipLoop,
    resetSteps: chapter.resetSteps,
    usablePhrase: chapter.usablePhrase,
    smallExperiment: chapter.smallExperiment,
    reflectionQuestion: chapter.reflectionQuestion,
  }));
}

function swapVisibleRoles(value: string): string {
  return value.replaceAll('A', '__A__').replaceAll('B', 'A').replaceAll('__A__', 'B');
}

describe('current-context questionnaire contract', () => {
  it('freezes six exact questions with 3,3,3,3,3,5 options', () => {
    assert.equal(COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS.length, 6);
    assert.deepEqual(
      COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS.map((question) => question.choices.length),
      [3, 3, 3, 3, 3, 5],
    );
    assert.deepEqual(
      COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS.map((question) => question.question),
      [
        '二人で何かを決めるとき、今はどの形に近いですか？',
        '意見が違ったとき、二人の間では何が起きやすいですか？',
        'どちらかが少し距離を取りたいとき、今はどの形に近いですか？',
        '気持ちを言葉にするまでの速さは、二人の間でどう見えますか？',
        'すれ違ったあと、元の距離へ戻るときはどの形に近いですか？',
        '今、このレポートで特に整理したいことはどれですか？',
      ],
    );
    const questionIds = COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS.map(
      (question) => question.questionId,
    );
    const answerIds = COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS.flatMap(
      (question) => question.choices.map((choice) => choice.answerId),
    );
    assert.equal(new Set(questionIds).size, questionIds.length);
    assert.equal(new Set(answerIds).size, answerIds.length);
  });

  it('accepts all 1,215 complete states and fails closed on unknown input', () => {
    let validStates = 0;
    for (const q1 of COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS[0]!.choices) {
      for (const q2 of COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS[1]!.choices) {
        for (const q3 of COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS[2]!.choices) {
          for (const q4 of COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS[3]!.choices) {
            for (const q5 of COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS[4]!.choices) {
              for (const q6 of COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS[5]!.choices) {
                const state = {
                  decisionPace: q1.answerId,
                  disagreement: q2.answerId,
                  distance: q3.answerId,
                  expressionPace: q4.answerId,
                  returnPattern: q5.answerId,
                  focus: q6.answerId,
                };
                assert.equal(isCompleteCompatibilityCurrentContext(state), true);
                validStates += 1;
              }
            }
          }
        }
      }
    }
    assert.equal(validStates, COMPATIBILITY_CURRENT_CONTEXT_STATE_COUNT);
    assert.equal(isCompleteCompatibilityCurrentContext({ ...CONTEXT_A, focus: 'unknown' }), false);
    assert.equal(isCompleteCompatibilityCurrentContext({ ...CONTEXT_A, distance: '' }), false);
    assert.equal(isCompleteCompatibilityCurrentContext(null), false);
  });

  it('implements one-question navigation, answer retention, and no result auth wall', () => {
    const component = read('components/compatibility/CompatibilityGuestExperience.tsx');
    assert.match(component, /整理 \{questionIndex \+ 1\}\/\{questionTotal\}/);
    assert.match(component, /disabled=\{\(!selectedAnswer && !currentQuestion\.optional\) \|\| isPending\}/);
    assert.match(component, /setQuestionIndex\(\(current\) => Math\.max\(0, current - 1\)\)/);
    assert.match(component, /delete next\.focus/);
    assert.doesNotMatch(component, /useUser|SignedIn|SignInButton|auth wall/i);
  });

  it('shows trust strip, compressed questionnaire chrome, toolkit tiles, and aligned CTA', () => {
    const component = read('components/compatibility/CompatibilityGuestExperience.tsx');
    const css = read('components/compatibility/CompatibilityGuestExperience.module.css');
    assert.match(component, /回答するのはあなた一人です/);
    assert.match(component, /相手の本音や性格を当てるものではありません/);
    assert.match(component, /このあと、無料の読み解きまで進めます/);
    assert.match(component, /questionIndex === 0 \? styles\.questionPurpose : styles\.questionPurposeCompact/);
    assert.match(component, /同じ生年月日でも、今の距離や会話によって内容が変わります。/);
    assert.doesNotMatch(component, /質問 \{questionIndex \+ 1\}\/6/);
    assert.match(component, /二人それぞれの動き/);
    assert.match(component, /すれ違いが始まる場面/);
    assert.match(component, /場面から戻る手順/);
    assert.match(component, /そのまま使える一言/);
    assert.match(component, /今週一度だけ試すこと/);
    assert.match(component, /id="compatibility-mapped-chapters"/);
    // The bridge must not end on an anchor back to content the reader passed.
    assert.doesNotMatch(component, /href="#compatibility-mapped-chapters"/);
    assert.match(component, /loopSteps/);
    assert.match(component, /glanceLabel/);
    assert.match(component, /土台は生年月日、表れ方と連鎖は今の回答を重ねています。/);
    assert.doesNotMatch(component, /質問が重なったところ/);
    assert.doesNotMatch(component, /購入する|永久保存|ずっと見返せる|今だけ|人気/);
    assert.match(css, /transition: border-color 200ms ease, background-color 200ms ease/);
    assert.match(css, /prefers-reduced-motion: reduce/);
  });
});

describe('same-pair current-context variance', () => {
  it('is deterministic for the same DOB authority and same answers', () => {
    const first = build(CONTEXT_A);
    const second = build(CONTEXT_A);
    assert.deepEqual(first, second);
    assert.equal(JSON.stringify(first), JSON.stringify(second));
    assert.equal(first.currentContext?.questionnaireContractVersion, COMPATIBILITY_CURRENT_CONTEXT_VERSION);
  });

  it('materially changes at least four of six chapters for A, B, and C', () => {
    for (const [left, right] of [
      [build(CONTEXT_A), build(CONTEXT_B)],
      [build(CONTEXT_A), build(CONTEXT_C)],
      [build(CONTEXT_B), build(CONTEXT_C)],
    ] as const) {
      const changed = left.chapters.filter(
        (chapter, index) =>
          materialSignature(chapter) !== materialSignature(right.chapters[index]!),
      );
      assert.ok(changed.length >= 4);
      assert.notDeepEqual(
        left.chapters.map((chapter) => chapter.usablePhrase),
        right.chapters.map((chapter) => chapter.usablePhrase),
      );
      assert.notDeepEqual(
        left.chapters.map((chapter) => chapter.smallExperiment),
        right.chapters.map((chapter) => chapter.smallExperiment),
      );
    }
  });

  it('keeps the DOB baseline stable while expression, loop, and action change', () => {
    const pair = { personA: '1992-04-11', personB: '1994-09-23' };
    const a = buildCompatibilityPublicResult(pair, 'R3', undefined, undefined, CONTEXT_A);
    const b = buildCompatibilityPublicResult(pair, 'R3', undefined, undefined, CONTEXT_B);
    if (!a.ok || !b.ok) assert.fail('same-pair fixtures must build');
    assert.equal(a.value.free.overlap, b.value.free.overlap);
    assert.equal(a.value.free.difference, b.value.free.difference);
    assert.notEqual(
      a.value.currentContext?.currentExpression,
      b.value.currentContext?.currentExpression,
    );
    assert.notEqual(
      a.value.currentContext?.relationshipLoop,
      b.value.currentContext?.relationshipLoop,
    );
    assert.notEqual(
      a.value.currentContext?.relationshipLoopSteps,
      b.value.currentContext?.relationshipLoopSteps,
    );
    assert.notEqual(
      a.value.currentContext?.glanceLabel,
      b.value.currentContext?.glanceLabel,
    );
    assert.notEqual(
      a.value.currentContext?.immediateAction,
      b.value.currentContext?.immediateAction,
    );
  });

  it('exposes deterministic glance labels and three relationship loop steps', () => {
    const displayA = buildCompatibilityCurrentContextDisplay(CONTEXT_A);
    const displayB = buildCompatibilityCurrentContextDisplay(CONTEXT_B);
    const displayC = buildCompatibilityCurrentContextDisplay(CONTEXT_C);
    for (const display of [displayA, displayB, displayC]) {
      assert.equal(display.relationshipLoopSteps.length, 3);
      assert.ok(display.glanceLabel.length > 0);
      assert.equal(
        display.relationshipLoop,
        display.relationshipLoopSteps.map((step) => step.replace(/。$/u, '')).join('。') + '。',
      );
    }
    assert.deepEqual(
      buildCompatibilityCurrentContextDisplay(CONTEXT_A),
      buildCompatibilityCurrentContextDisplay(CONTEXT_A),
    );
    assert.notEqual(displayA.glanceLabel, displayB.glanceLabel);
    assert.notEqual(displayA.glanceLabel, displayC.glanceLabel);
    assert.notEqual(displayB.glanceLabel, displayC.glanceLabel);
    assert.notDeepEqual(displayA.relationshipLoopSteps, displayB.relationshipLoopSteps);
    assert.notDeepEqual(displayA.relationshipLoopSteps, displayC.relationshipLoopSteps);
  });

  it('uses Q6 only for reading emphasis, never for six chapter bodies', () => {
    const distance = { ...CONTEXT_A, focus: 'distance_focus' } as const;
    const conversation = { ...CONTEXT_A, focus: 'conversation_focus' } as const;
    assert.deepEqual(bodySnapshot(distance), bodySnapshot(conversation));
    assert.notDeepEqual(
      build(distance).highlightedChapterKeys,
      build(conversation).highlightedChapterKeys,
    );
    assert.notEqual(
      buildCompatibilityCurrentContextDisplay(distance).readingGuide,
      buildCompatibilityCurrentContextDisplay(conversation).readingGuide,
    );
  });
});

describe('current-context order safety and compatibility', () => {
  it('preserves context semantics and swaps A/B perspectives', () => {
    const forward = build(CONTEXT_B);
    const reverse = buildPaidCompatibilityReportV1({
      ...BASE_INPUT,
      personAUsesFirstPerspective: false,
      currentContext: CONTEXT_B,
    });
    assert.deepEqual(forward.currentContext, reverse.currentContext);
    assert.equal(forward.recurringLoop, reverse.recurringLoop);
    for (let index = 0; index < 6; index += 1) {
      const a = forward.chapters[index]!;
      const b = reverse.chapters[index]!;
      assert.equal(a.personAPerspective, swapVisibleRoles(b.personBPerspective));
      assert.equal(a.personBPerspective, swapVisibleRoles(b.personAPerspective));
      assert.deepEqual(a.relationshipLoop, b.relationshipLoop.map(swapVisibleRoles));
    }
  });

  it('keeps old snapshots readable through optional current-context fields', () => {
    const legacy = buildPaidCompatibilityReportV1(BASE_INPUT);
    assert.equal(legacy.currentContext, undefined);
    assert.deepEqual(legacy.highlightedChapterKeys, ['ch_pair_gap', 'ch_topic_deep']);
    assert.equal(legacy.chapters.length, 6);
    const reader = read('components/compatibility/PaidCompatibilityReportReader.tsx');
    assert.match(reader, /snapshot\.currentContext\?/);
  });

  it('covers same DOB, swapped, leap-day, and representative pair boundaries', () => {
    const pairs = [
      { personA: '1990-01-10', personB: '1990-01-10' },
      { personA: '2000-02-29', personB: '1999-07-15' },
      { personA: '1990-01-31', personB: '1990-02-01' },
    ];
    for (const pair of pairs) {
      const forward = buildCompatibilityPublicResult(pair, 'R3', undefined, undefined, CONTEXT_C);
      const reverse = buildCompatibilityPublicResult(
        { personA: pair.personB, personB: pair.personA },
        'R3',
        undefined,
        undefined,
        CONTEXT_C,
      );
      assert.equal(forward.ok, true);
      assert.equal(reverse.ok, true);
    }
  });
});

describe('current-context privacy, safety, and funnel', () => {
  it('stores display-ready output but no raw answer IDs or DOB in snapshots', () => {
    const serialized = JSON.stringify(build(CONTEXT_B));
    for (const question of COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS) {
      for (const choice of question.choices) {
        assert.equal(serialized.includes(choice.answerId), false);
      }
      assert.equal(serialized.includes(`"${question.questionId}":`), false);
    }
    assert.doesNotMatch(serialized, /\d{4}-\d{2}-\d{2}|dob|birth|hash|clerk|user.?id/i);
    assert.match(serialized, /compatibility_current_context_v1/);
  });

  it('contains no mind-reading, diagnosis, prediction, scores, guarantees, or pressure', () => {
    const visible = JSON.stringify([
      build(CONTEXT_A),
      build(CONTEXT_B),
      build(CONTEXT_C),
    ]);
    assert.doesNotMatch(
      visible,
      /相手の本音|相手の気持ちを反映|二人とも回答|診断|予測|必ず|絶対|運命|soulmate|今だけ|残りわずか|人気/,
    );
    assert.doesNotMatch(visible, /相性%|一致率|ランキング|confidence|回答スコア/);
  });

  it('uses the six required three-field analytics events with Strict Mode dedupe transport', () => {
    const expected = [
      M55_FUNNEL_EVENTS.compatibilityQuestionnaireView,
      M55_FUNNEL_EVENTS.compatibilityQuestionnaireStart,
      M55_FUNNEL_EVENTS.compatibilityQuestionnaireComplete,
      M55_FUNNEL_EVENTS.compatibilityPersonalizedResultView,
      M55_FUNNEL_EVENTS.compatibilityPersonalizedPaidBridgeView,
      M55_FUNNEL_EVENTS.compatibilityPersonalizedPaidBridgeClick,
    ];
    assert.deepEqual(expected, [
      'm55_compatibility_questionnaire_view',
      'm55_compatibility_questionnaire_start',
      'm55_compatibility_questionnaire_complete',
      'm55_compatibility_personalized_result_view',
      'm55_compatibility_personalized_paid_bridge_view',
      'm55_compatibility_personalized_paid_bridge_click',
    ]);
    const payload = buildPrivacySafeFunnelPayload(
      'compatibility_guest',
      '2026-07-13T00:00:00.000Z',
    );
    assert.deepEqual(Object.keys(payload).sort(), ['eventVersion', 'occurredAt', 'surface']);
    assertPrivacySafeFunnelPayload(payload);
    assert.throws(() => assertPrivacySafeFunnelPayload({ ...payload, answerId: 'forbidden' }));
  });

  it('keeps raw answers in same-tab storage only and removes result input DOM', () => {
    const component = read('components/compatibility/CompatibilityGuestExperience.tsx');
    const action = read('app/synastry/actions.ts');
    assert.match(component, /sessionStorage\.setItem/);
    assert.match(component, /sessionStorage\.removeItem/);
    assert.doesNotMatch(component, /localStorage/);
    assert.doesNotMatch(component, /value=\{choice\.answerId\}|data-answer|data-question/);
    assert.match(component, /phase === 'dob'/);
    assert.doesNotMatch(action, /console\.|logger|log\(/);
  });

  it('has no random or current-time dependency in personalization builders', () => {
    const contract = read('lib/m55/compatibility/currentContextContract.v1.ts');
    const paid = read('lib/m55/compatibility/buildPaidCompatibilityReportV1.ts');
    assert.doesNotMatch(contract + paid, /Math\.random|Date\.now|new Date|crypto\.randomUUID/);
  });
});
