import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateConsultSendRequest } from './consultSendRequest.zod';

describe('consultSendRequest.zod', () => {
  it('accepts valid theme and question pair', () => {
    const result = validateConsultSendRequest({
      reply_theme_id: 'work',
      reply_question_id: 'work.priority',
      birthDate: '1983-02-28',
      nickname: 'Test',
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.ok(result.composedUserMessage.includes('【テーマ】'));
      assert.ok(result.composedUserMessage.includes('【質問】'));
      assert.equal(result.catalogEntry?.reply_question_id, 'work.priority');
    }
  });

  it('accepts theme-only without optional context', () => {
    const result = validateConsultSendRequest({
      reply_theme_id: 'work',
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.catalogEntry, null);
      assert.equal(result.composedUserMessage.includes('【質問】'), false);
      assert.equal(result.composedUserMessage.includes('【テーマ】'), true);
    }
  });

  it('accepts a short optional context with the selected theme', () => {
    const result = validateConsultSendRequest({
      reply_theme_id: 'fatigue',
      optional_context: '休むタイミングを整理したいです。',
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.catalogEntry, null);
      assert.ok(result.composedUserMessage.includes('休むタイミング'));
    }
  });

  it('rejects question selection combined with optional context', () => {
    const result = validateConsultSendRequest({
      reply_theme_id: 'work',
      reply_question_id: 'work.priority',
      optional_context: '補足',
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /同時に指定できません/);
  });

  it('rejects message field via strict schema', () => {
    const result = validateConsultSendRequest({
      reply_theme_id: 'work',
      reply_question_id: 'work.priority',
      message: '自由入力',
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 422);
      assert.match(result.error, /message/);
    }
  });

  it('rejects free_text field', () => {
    const result = validateConsultSendRequest({
      reply_theme_id: 'work',
      reply_question_id: 'work.priority',
      free_text: '自由入力',
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /free_text/);
  });

  it('rejects userMessage field', () => {
    const result = validateConsultSendRequest({
      reply_theme_id: 'work',
      reply_question_id: 'work.priority',
      userMessage: '自由入力',
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /userMessage/);
  });

  it('rejects body field', () => {
    const result = validateConsultSendRequest({
      reply_theme_id: 'work',
      reply_question_id: 'work.priority',
      body: '自由入力',
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /body/);
  });

  it('rejects unknown theme', () => {
    const result = validateConsultSendRequest({
      reply_theme_id: 'unknown',
      reply_question_id: 'work.priority',
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 422);
  });

  it('rejects unknown question', () => {
    const result = validateConsultSendRequest({
      reply_theme_id: 'work',
      reply_question_id: 'work.missing',
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /質問/);
  });

  it('rejects cross-theme question', () => {
    const result = validateConsultSendRequest({
      reply_theme_id: 'work',
      reply_question_id: 'relation.distance',
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /一致しません/);
  });
});
