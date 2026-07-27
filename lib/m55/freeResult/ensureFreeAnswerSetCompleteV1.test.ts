import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ensureCompleteFreeAnswerSet,
  FREE_DEFAULT_PRIMARY_THEME_ANSWER_ID,
  isCompleteFreeAnswerSet,
  isCoreFiveAnswersComplete,
  withDefaultPrimaryTheme,
} from './ensureFreeAnswerSetCompleteV1';

const FIVE = {
  'free.start_style': 'free.start_style.map_first',
  'free.decision_style': 'free.decision_style.sort_first',
  'free.recovery_style': 'free.recovery_style.pause_short',
  'free.distance_style': 'free.distance_style.middle_steady',
  'free.change_style': 'free.change_style.observe_first',
} as const;

describe('ensureFreeAnswerSetCompleteV1', () => {
  it('treats five core answers as UI-complete without theme', () => {
    assert.equal(isCoreFiveAnswersComplete({ ...FIVE }), true);
    assert.equal(isCoreFiveAnswersComplete({ ...FIVE, 'free.start_style': '' }), false);
  });

  it('injects default primary theme without overwriting an existing choice', () => {
    const injected = withDefaultPrimaryTheme({ ...FIVE });
    assert.equal(injected['free.primary_theme'], FREE_DEFAULT_PRIMARY_THEME_ANSWER_ID);

    const kept = withDefaultPrimaryTheme({
      ...FIVE,
      'free.primary_theme': 'free.primary_theme.work',
    });
    assert.equal(kept['free.primary_theme'], 'free.primary_theme.work');
  });

  it('builds a complete set for composition/checkout from five answers', () => {
    const complete = ensureCompleteFreeAnswerSet({ ...FIVE });
    assert.ok(complete);
    assert.equal(isCompleteFreeAnswerSet(complete!), true);
    assert.equal(complete!['free.primary_theme'], FREE_DEFAULT_PRIMARY_THEME_ANSWER_ID);
    assert.equal(ensureCompleteFreeAnswerSet({ 'free.start_style': 'x' }), null);
  });
});
