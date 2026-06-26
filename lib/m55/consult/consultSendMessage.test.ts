import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildConsultUserAnchors,
  buildThemeOnlyConsultMessage,
  parseConsultUserMessage,
  validateConsultSendInput,
} from './consultSendMessage';

const SEND_ROUTE = join(process.cwd(), 'app/api/room/core/send/route.ts');
const CONSULT_ROOM = join(process.cwd(), 'components/dtr/ConsultRoom.tsx');

describe('consultSendMessage', () => {
  it('parses theme-only composed message', () => {
    const msg = buildThemeOnlyConsultMessage('仕事・これからの進め方');
    const parsed = parseConsultUserMessage(msg);
    assert.equal(parsed.theme, '仕事・これからの進め方');
    assert.equal(parsed.freeBody, '');
    assert.equal(parsed.isThemeOnly, true);
  });

  it('parses theme plus free body', () => {
    const msg = `【テーマ】疲れたときの戻り方\n\n今日は休むタイミングが分からず、疲れが抜けません。`;
    const parsed = parseConsultUserMessage(msg);
    assert.equal(parsed.theme, '疲れたときの戻り方');
    assert.ok(parsed.freeBody.includes('疲れが抜けません'));
    assert.equal(parsed.isThemeOnly, false);
  });

  it('accepts valid theme-only send without minimum body length', () => {
    const msg = buildThemeOnlyConsultMessage('お金・生活・疲れの整え方');
    const result = validateConsultSendInput(msg);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.parsed.isThemeOnly, true);
  });

  it('rejects missing theme', () => {
    const result = validateConsultSendInput('相談文だけです。');
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, 'テーマを選択してください。');
  });

  it('rejects unknown theme', () => {
    const result = validateConsultSendInput('【テーマ】存在しないテーマ');
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, '有効なテーマを選択してください。');
  });

  it('rejects combined content over max', () => {
    const longBody = 'あ'.repeat(490);
    const msg = `【テーマ】仕事・これからの進め方\n\n${longBody}`;
    const result = validateConsultSendInput(msg);
    assert.equal(result.ok, false);
  });

  it('theme-only anchors include non-defect instruction and theme description', () => {
    const parsed = parseConsultUserMessage(buildThemeOnlyConsultMessage('仕事・これからの進め方'));
    const anchors = buildConsultUserAnchors(parsed);
    assert.ok(anchors.includes('テーマのみ — 有効'));
    assert.ok(anchors.includes('自由記述を空欄にしています'));
    assert.ok(anchors.includes('「相談内容がありません」と返さず'));
    assert.match(anchors, /テーマの見方:/);
    assert.match(anchors, /主章候補:/);
  });

  it('body-present anchors keep user detail and theme frame', () => {
    const parsed = parseConsultUserMessage(
      '【テーマ】疲れたときの戻り方\n\n休むタイミングが分かりません。',
    );
    const anchors = buildConsultUserAnchors(parsed);
    assert.ok(anchors.includes('ユーザー原文'));
    assert.ok(anchors.includes('休むタイミング'));
    assert.ok(anchors.includes('テーマの見方:'));
    assert.equal(anchors.includes('テーマのみ'), false);
  });

  it('send route uses consultSendMessage validation and theme-only anchors', () => {
    const src = readFileSync(SEND_ROUTE, 'utf8');
    assert.ok(src.includes('validateConsultSendInput'));
    assert.ok(src.includes('buildConsultUserAnchors'));
    assert.equal(src.includes('INPUT_MIN'), false);
    assert.ok(src.includes('from \'../../../../../lib/m55/consult/consultSendMessage\''));
  });

  it('ConsultRoom allows theme-only send without body minimum', () => {
    const src = readFileSync(CONSULT_ROOM, 'utf8');
    assert.ok(src.includes('テーマだけでも返書を作れます'));
    assert.ok(src.includes('空欄でも大丈夫'));
    assert.ok(src.includes('送信内容（選んだテーマを含む）'));
    assert.equal(src.includes('isUnderMin'), false);
    assert.equal(src.includes('INPUT_MIN'), false);
    assert.equal(src.includes('10〜500'), false);
    assert.equal(src.includes('10文字'), false);
  });
});
