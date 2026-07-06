import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { REPLY_THEME_IDS } from './consultQuestionCatalog.v1';
import {
  WIZARD_ENTRY_CARD_DISPLAY,
  WIZARD_QUESTION_LABEL_DISPLAY,
  wizardQuestionLabelJa,
} from './consultReplyWizardDisplay.v1';

describe('consultReplyWizardDisplay.v1', () => {
  it('covers all reply themes with user-facing entry cards', () => {
    for (const themeId of REPLY_THEME_IDS) {
      const card = WIZARD_ENTRY_CARD_DISPLAY[themeId];
      assert.ok(card.label.length > 0);
      assert.ok(card.description.length > 0);
      assert.equal(card.label.includes('Ⅲ'), false);
      assert.equal(card.description.includes('章'), false);
    }
  });

  it('maps 20 wizard question labels without internal meta', () => {
    const labels = Object.values(WIZARD_QUESTION_LABEL_DISPLAY).filter(
      (label): label is string => typeof label === 'string',
    );
    assert.equal(labels.length, 20);
    for (const label of labels) {
      assert.equal(label.includes('Ⅲ無理'), false);
      assert.equal(label.includes('Ⅰ +'), false);
      assert.equal(label.includes('4章'), false);
    }
  });

  it('falls back to catalog label when wizard override is absent', () => {
    assert.equal(wizardQuestionLabelJa('work.priority', 'catalog fallback'), 'いま優先順位を決めたい');
    assert.equal(wizardQuestionLabelJa('unknown.id', 'catalog fallback'), 'catalog fallback');
  });
});
