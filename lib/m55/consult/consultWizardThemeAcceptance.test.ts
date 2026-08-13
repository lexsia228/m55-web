import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  REPLY_THEME_IDS,
  REPLY_THEME_LABEL_JA,
  getQuestionsForTheme,
} from './consultQuestionCatalog.v1';
import { isKnownConsultTheme, resolveConsultReplyPartByTheme } from './consultReplyThemePartMap';
import { validateConsultSendRequest } from './consultSendRequest.zod';
import { PAID_DTR_CONSULT_REPLY } from '../paidDtrProductCopy';

const OWNER_BODY = { birthDate: '1990-01-01', nickname: 'テスト' };

describe('consult wizard theme acceptance', () => {
  it('accepts every selectable theme with a supplement (observed 422 regression)', () => {
    for (const themeId of REPLY_THEME_IDS) {
      const result = validateConsultSendRequest({
        reply_theme_id: themeId,
        optional_context: 'いま優先に焦点を置きたい',
        ...OWNER_BODY,
      });
      assert.equal(result.ok, true, `${themeId} must be accepted with a supplement`);
      if (result.ok) {
        assert.match(result.composedUserMessage, /^【テーマ】/);
        assert.ok(result.composedUserMessage.includes(REPLY_THEME_LABEL_JA[themeId]));
      }
    }
  });

  it('accepts every selectable theme with no supplement', () => {
    for (const themeId of REPLY_THEME_IDS) {
      const result = validateConsultSendRequest({ reply_theme_id: themeId, ...OWNER_BODY });
      assert.equal(result.ok, true, `${themeId} must be accepted theme-only`);
    }
  });

  it('accepts every catalog question for its theme', () => {
    for (const themeId of REPLY_THEME_IDS) {
      for (const entry of getQuestionsForTheme(themeId)) {
        const result = validateConsultSendRequest({
          reply_theme_id: themeId,
          reply_question_id: entry.reply_question_id,
          ...OWNER_BODY,
        });
        assert.equal(result.ok, true, `${entry.reply_question_id} must be accepted`);
      }
    }
  });

  it('treats every reply-v1 theme label as known', () => {
    for (const themeId of REPLY_THEME_IDS) {
      assert.ok(
        isKnownConsultTheme(REPLY_THEME_LABEL_JA[themeId]),
        `${REPLY_THEME_LABEL_JA[themeId]} must be a known theme`,
      );
    }
  });

  it('keeps pre-reply-v1 stored theme labels valid', () => {
    for (const legacyLabel of PAID_DTR_CONSULT_REPLY.themeExamplesJa) {
      assert.ok(isKnownConsultTheme(legacyLabel), `${legacyLabel} must stay valid`);
    }
  });

  it('rejects labels outside the catalog', () => {
    assert.equal(isKnownConsultTheme('なんでも相談'), false);
    assert.equal(isKnownConsultTheme(''), false);
  });

  it('cites the chapter each theme actually reads from', () => {
    const expected: Record<(typeof REPLY_THEME_IDS)[number], string> = {
      work: 'Ⅱ',
      relation: 'Ⅲ',
      fatigue: 'Ⅳ',
      tendency: 'Ⅰ',
      report: 'Ⅰ',
    };
    for (const themeId of REPLY_THEME_IDS) {
      const part = resolveConsultReplyPartByTheme(REPLY_THEME_LABEL_JA[themeId]);
      assert.equal(part.roman, expected[themeId], `${themeId} chapter citation`);
    }
  });

  it('still rejects a theme id that is not in the catalog', () => {
    const result = validateConsultSendRequest({ reply_theme_id: 'anything', ...OWNER_BODY });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 422);
  });
});
