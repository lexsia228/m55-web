import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPairFreeInsightSpecV2 } from './pairFreeInsightSpecV2';
import { buildCompatibilityPublicResult } from './pairReadingGuestResult';
import type { CompatibilityCurrentContextAnswers } from './currentContextContract.v1';
import { COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS } from './currentContextContract.v1';

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

const TEMPO_SWAPPED: CompatibilityCurrentContextAnswers = {
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

const PAIR_FIXTURES = [
  {
    id: 'R1',
    personA: '1983-02-28',
    personB: '1997-06-15',
    answers: TEMPO,
  },
  {
    id: 'R2',
    personA: '1990-01-05',
    personB: '1990-01-06',
    answers: TEMPO,
  },
  {
    id: 'R3',
    personA: '1955-03-01',
    personB: '1997-06-15',
    answers: SPACE,
  },
  {
    id: 'R4',
    personA: '1968-08-15',
    personB: '2001-09-30',
    answers: CARRIES,
  },
  {
    id: 'R5',
    personA: '1990-01-15',
    personB: '1992-08-20',
    answers: TEMPO_SWAPPED,
  },
] as const;

const ABSTRACT = /一定の間隔|接点の入口|基調の寄り|土台の接点|距離を整え/;
const BARNUM = [
  '実は繊細',
  '周囲に気を遣う',
  '自分の時間も必要',
  '本当は優しい',
  '内側では複雑',
];

function insight(
  answers: CompatibilityCurrentContextAnswers,
  personA = '1990-01-15',
  personB = '1992-08-20',
) {
  return buildPairFreeInsightSpecV2({
    answers,
    pairAxisId: 'A2',
    personABirthDate: personA,
    personBBirthDate: personB,
    personAUsesFirstPerspective: true,
    focusLabel: '会話の進め方',
    relationStatusId: 'R3',
  });
}

describe('pair free manifestation quality v4', () => {
  it('opens with the relationship behavior, not two personality profiles', () => {
    for (const fixture of PAIR_FIXTURES) {
      const spec = insight(fixture.answers, fixture.personA, fixture.personB);
      assert.match(spec.betweenThem, /^二人の間では/u);
      assert.doesNotMatch(spec.betweenThem, /^あなたは|^あなた側はX、相手側はY/u);
      assert.match(spec.betweenThem, /あなた側は/);
      assert.match(spec.betweenThem, /相手側は/);
      assert.match(spec.misreadLoop, /受け取りやすい|見えやすい/);
      assert.doesNotMatch(spec.betweenThem, ABSTRACT);
      assert.doesNotMatch(spec.relationshipTriggerJa, /あなたは/);
    }
  });

  it('keeps pair DOB materiality and relationship specificity across five fixtures', () => {
    const texts = PAIR_FIXTURES.map(
      (fixture) => insight(fixture.answers, fixture.personA, fixture.personB).betweenThem,
    );
    assert.equal(new Set(texts).size, PAIR_FIXTURES.length);
    const sameAnswersDifferentDob = [
      insight(TEMPO, '1983-02-28', '1997-06-15').betweenThem,
      insight(TEMPO, '1990-01-05', '1990-01-06').betweenThem,
    ];
    assert.notEqual(sameAnswersDifferentDob[0], sameAnswersDifferentDob[1]);
  });

  it('rejects generic compatibility copy, paraphrase, and Barnum in the primary loop', () => {
    const labels = COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS.flatMap((q) =>
      q.choices.map((choice) => choice.label),
    );
    for (const fixture of PAIR_FIXTURES) {
      const spec = insight(fixture.answers, fixture.personA, fixture.personB);
      const blob = `${spec.betweenThem}\n${spec.misreadLoop}`;
      for (const phrase of BARNUM) {
        assert.equal(blob.includes(phrase), false, phrase);
      }
      assert.doesNotMatch(spec.betweenThem, /相性が良い|運命|必ず/);
      let hits = 0;
      for (const label of labels) {
        if (label.length >= 6 && spec.betweenThem.includes(label)) hits += 1;
      }
      assert.equal(hits, 0, spec.betweenThem);
    }
  });

  it('keeps the A→B→A loop and a return action', () => {
    const spec = insight(SPACE, '1955-03-01', '1997-06-15');
    assert.match(spec.misreadLoop, /あなた/);
    assert.match(spec.misreadLoop, /相手/);
    assert.ok(spec.reset.length > 8);
    assert.match(spec.premiumContinuation, /六つの場面/);
  });

  it('guest overlay stays DOB-free in public copy while recording both births', () => {
    const result = buildCompatibilityPublicResult(
      { personA: '1983-02-28', personB: '1997-06-15' },
      'R3',
      undefined,
      undefined,
      TEMPO,
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.value.free.relationshipDynamic, /^二人の間では/u);
    assert.doesNotMatch(result.value.free.relationshipDynamic, /\d{4}-\d{2}-\d{2}/);
    const spec = insight(TEMPO, '1983-02-28', '1997-06-15');
    assert.equal(spec.aBirthEvidence, true);
    assert.equal(spec.bBirthEvidence, true);
    assert.equal(spec.independentAAnswerEvidence, false);
  });

  it('similar-pace answers still open on the relationship, not a first-mover role', () => {
    const spec = insight(SIMILAR);
    assert.match(spec.betweenThem, /^二人の間では/u);
    assert.doesNotMatch(spec.betweenThem, /先に動いて見えやすく/);
    assert.match(spec.betweenThem, /そのため二人の間では/);
  });
});
