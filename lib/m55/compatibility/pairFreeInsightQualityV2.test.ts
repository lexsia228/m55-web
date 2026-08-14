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
  });
}

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
      assert.equal((text.match(/二人の間では/g) ?? []).length, 1, text);
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
    assert.equal((spec.betweenThem.match(/二人の間では/g) ?? []).length, 1);
  });

  it('guest public result overlays synthesis onto free current context only', () => {
    const result = buildCompatibilityPublicResult(
      { personA: '1990-01-15', personB: '1992-08-20' },
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
      undefined,
      TEMPO,
    );
    const right = buildCompatibilityPublicResult(
      { personA: '1990-01-05', personB: '1990-01-06' },
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
