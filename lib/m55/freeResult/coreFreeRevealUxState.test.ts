import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  FREE_REVEAL_TRANSITION_MS,
  isQuestionnaireCompleteForComposition,
  resolveInitialUxPhase,
  revealTransitionDurationMs,
  shouldHideResultDuringQuestionnaire,
  shouldShowHero,
  shouldShowIntro,
  shouldShowQuestionnaire,
  shouldShowRevealing,
  shouldShowResultSections,
  transitionOnIntroStart,
  transitionOnQuestionnaireComplete,
  transitionOnReanswer,
  transitionOnRevealComplete,
} from './coreFreeRevealUxState';

describe('core free reveal UX state', () => {
  it('starts at INTRO with DOB-ready flow', () => {
    assert.equal(resolveInitialUxPhase(), 'INTRO');
    assert.equal(shouldShowIntro('INTRO'), true);
    assert.equal(shouldShowHero('INTRO'), false);
    assert.equal(shouldHideResultDuringQuestionnaire('INTRO'), true);
  });

  it('intro start shows questionnaire and hides hero', () => {
    const phase = transitionOnIntroStart();
    assert.equal(phase, 'QUESTIONNAIRE');
    assert.equal(shouldShowQuestionnaire(phase), true);
    assert.equal(shouldShowHero(phase), false);
    assert.equal(shouldShowResultSections(phase), false);
  });

  it('questionnaire in progress keeps hero hidden', () => {
    assert.equal(shouldShowHero('QUESTIONNAIRE'), false);
    assert.equal(shouldHideResultDuringQuestionnaire('QUESTIONNAIRE'), true);
  });

  it('question 6 completion reaches REVEALING before RESULT', () => {
    const revealing = transitionOnQuestionnaireComplete();
    assert.equal(revealing, 'REVEALING');
    assert.equal(shouldShowRevealing(revealing), true);
    assert.equal(shouldShowHero(revealing), false);

    const result = transitionOnRevealComplete();
    assert.equal(result, 'RESULT');
    assert.equal(shouldShowHero(result), true);
    assert.equal(shouldShowResultSections(result), true);
  });

  it('composition only builds after RESULT with complete answers', () => {
    assert.equal(isQuestionnaireCompleteForComposition('QUESTIONNAIRE', true), false);
    assert.equal(isQuestionnaireCompleteForComposition('REVEALING', true), false);
    assert.equal(isQuestionnaireCompleteForComposition('RESULT', true), true);
    assert.equal(isQuestionnaireCompleteForComposition('RESULT', false), false);
  });

  it('re-answer returns to questionnaire and hides hero', () => {
    const phase = transitionOnReanswer();
    assert.equal(phase, 'QUESTIONNAIRE');
    assert.equal(shouldShowHero(phase), false);
    assert.equal(shouldShowQuestionnaire(phase), true);
  });

  it('reveal transition respects reduced motion', () => {
    assert.equal(revealTransitionDurationMs(true), 0);
    assert.equal(revealTransitionDurationMs(false), FREE_REVEAL_TRANSITION_MS);
  });
});
