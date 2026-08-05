import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSULT_QUESTION_CATALOG_V1,
  REPLY_THEME_IDS,
  REPLY_THEME_LABEL_JA,
  getQuestionsForTheme,
  resolveReplyQuestion,
} from './consultQuestionCatalog.v1';
import { composeReplyUserMessage } from './consultSendMessage';

const FORBIDDEN_TERMS = [
  '占い',
  '鑑定',
  '当たる',
  '運命',
  '金運',
  '未来予測',
  '診断',
  'タイプ',
  '正解',
  'おすすめ',
  '必ず',
  '絶対',
  '相談',
  '自由相談',
  'AI相談',
  '追加解析',
  'notification',
  'badge',
  'unread',
  'infinite',
  'spinner',
] as const;

const ASSISTANT_TEMPLATE_MARKERS = [
  'プレミアムレポートから見ると',
  '今日やることは1つだけです。',
  '5段落目',
  '段落目は',
] as const;

describe('consultQuestionCatalog.v1', () => {
  it('has 5 themes and 20 questions total', () => {
    assert.equal(REPLY_THEME_IDS.length, 5);
    assert.equal(CONSULT_QUESTION_CATALOG_V1.length, 20);
    for (const themeId of REPLY_THEME_IDS) {
      assert.equal(getQuestionsForTheme(themeId).length, 4);
    }
  });

  it('keeps reply_question_id unique', () => {
    const ids = CONSULT_QUESTION_CATALOG_V1.map((entry) => entry.reply_question_id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('uses polished tendency.lens label', () => {
    const lens = resolveReplyQuestion('tendency', 'tendency.lens');
    assert.ok(lens);
    assert.equal(lens!.labelJa, '別の見方で、少しほどいて読みたい');
  });

  it('does not contain assistant reply body templates in catalog fields', () => {
    for (const entry of CONSULT_QUESTION_CATALOG_V1) {
      const blob = [
        entry.labelJa,
        entry.output_intent,
        entry.grounding_target,
        entry.promptFocusAnchor,
        entry.forbidden_scope,
      ].join('\n');
      for (const marker of ASSISTANT_TEMPLATE_MARKERS) {
        assert.equal(blob.includes(marker), false, `${entry.reply_question_id} contains ${marker}`);
      }
      assert.ok(blob.length < 400, `${entry.reply_question_id} field blob suspiciously long`);
    }
  });

  it('keeps forbidden terms absent from user-facing labels and metadata', () => {
    for (const entry of CONSULT_QUESTION_CATALOG_V1) {
      const blob = [
        entry.labelJa,
        entry.output_intent,
        entry.grounding_target,
        entry.promptFocusAnchor,
        entry.themeLabelJa,
      ].join('\n');
      for (const term of FORBIDDEN_TERMS) {
        assert.equal(blob.includes(term), false, `${entry.reply_question_id} contains ${term}`);
      }
    }
  });

  it('compose length stays within 500 chars for all pairs', () => {
    for (const entry of CONSULT_QUESTION_CATALOG_V1) {
      const composed = composeReplyUserMessage(entry.themeLabelJa, entry.labelJa);
      assert.ok(composed.length <= 500, `${entry.reply_question_id} composed too long`);
      assert.equal(entry.themeLabelJa, REPLY_THEME_LABEL_JA[entry.reply_theme_id]);
    }
  });
});
