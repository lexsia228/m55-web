import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPairFreeInsightSpecV2 } from './pairFreeInsightSpecV2';
import type { CompatibilityCurrentContextAnswers } from './currentContextContract.v1';

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

const HARD_RETURN: CompatibilityCurrentContextAnswers = {
  decisionPace: 'decide_varies',
  disagreement: 'talk_now',
  distance: 'space_is_hard',
  expressionPace: 'words_vary',
  returnPattern: 'return_is_hard',
  focus: 'return_focus',
};

export const PAIR_V5_FIXTURES = [
  { id: 'R1', personA: '1983-02-28', personB: '1997-06-15', answers: TEMPO, focus: '会話の進め方' },
  { id: 'R2', personA: '1990-01-05', personB: '1990-01-06', answers: TEMPO, focus: '会話の進め方' },
  { id: 'R3', personA: '1955-03-01', personB: '1997-06-15', answers: SPACE, focus: '距離の取り方' },
  { id: 'R4', personA: '1968-08-15', personB: '2001-09-30', answers: CARRIES, focus: '残った一点' },
  { id: 'R5', personA: '1990-01-15', personB: '1992-08-20', answers: TEMPO_SWAPPED, focus: '次の一歩' },
  { id: 'R6', personA: '1982-02-28', personB: '1983-02-28', answers: SIMILAR, focus: '静かな時間' },
  { id: 'R7', personA: '1968-08-15', personB: '1997-06-15', answers: HARD_RETURN, focus: '戻る入口' },
] as const;

const BANNED = /接点の入口|基調の寄り|輪郭を掴|tempo mismatch|pair difference|結論を出す速度/;

function insight(fixture: (typeof PAIR_V5_FIXTURES)[number]) {
  return buildPairFreeInsightSpecV2({
    answers: fixture.answers,
    pairAxisId: 'A2',
    personABirthDate: fixture.personA,
    personBBirthDate: fixture.personB,
    personAUsesFirstPerspective: true,
    focusLabel: fixture.focus,
  });
}

function completeCopy(fixture: (typeof PAIR_V5_FIXTURES)[number]): string {
  const spec = insight(fixture);
  return [
    spec.betweenThem,
    spec.mismatchEntry,
    spec.misreadLoop,
    spec.reset,
    spec.premiumContinuation,
  ].join('\n');
}

describe('pair free commercial copy v5', () => {
  it('covers seven complete readings without engineering jargon', () => {
    const blobs = PAIR_V5_FIXTURES.map((fixture) => completeCopy(fixture));
    assert.equal(new Set(blobs).size, 7);
    const triggers = PAIR_V5_FIXTURES.map((fixture) => insight(fixture).relationshipTriggerJa);
    assert.equal(new Set(triggers).size, 7, 'pair opening hits must not collapse across fixtures');
    for (const fixture of PAIR_V5_FIXTURES) {
      const spec = insight(fixture);
      const blob = completeCopy(fixture);
      assert.match(spec.betweenThem, /^二人の間では/u);
      assert.match(spec.betweenThem, /あなた側は/);
      assert.match(spec.betweenThem, /相手側は/);
      assert.match(spec.betweenThem, /そのため二人の間では/);
      assert.match(spec.betweenThem, /土台/);
      assert.match(spec.misreadLoop, /受け取りやすい|見えやすい/);
      assert.ok(spec.reset.length > 8);
      assert.match(spec.premiumContinuation, /六つの場面/);
      assert.doesNotMatch(blob, BANNED);
      assert.doesNotMatch(blob, /相手は.{1,12}と思っている/);
      assert.doesNotMatch(blob, /本当は.{1,12}したい/);
    }
  });

  it('does not restates the same tempo mechanic as 終わった plus 結論を出す速度', () => {
    const r1 = insight(PAIR_V5_FIXTURES[0]!);
    const hitHasFinished = /終わった/.test(r1.relationshipTriggerJa);
    const consequenceHasPace = /結論を出す速度/.test(r1.betweenThem);
    assert.equal(hitHasFinished && consequenceHasPace, false);
  });
});
