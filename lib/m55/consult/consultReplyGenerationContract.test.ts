import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CONSULT_REPLY_GENERATION,
  CONSULT_REPLY_PROMPT_COMPLETION_REQUIREMENTS_JA,
  countConsultReplyBlocks,
  normalizeConsultReplyParagraphBreaks,
  validateConsultReplyCompleteness,
} from './consultReplyGenerationContract';

const SEND_ROUTE = join(process.cwd(), 'app/api/room/core/send/route.ts');
const SSOT = join(process.cwd(), 'docs/ssot/M55_PAID_DTR_PRODUCT_COPY_MASTER_v1.md');

function makeValidReply(charCount = 1300): string {
  const perBlock = Math.ceil(charCount / 4) + 50;
  const sentence = `${'保存版の傾向に沿って場面を整理する。'.repeat(Math.ceil(perBlock / 20))}。`;
  const block = sentence.slice(0, perBlock);
  return [block, block, block, block].join('\n\n');
}

function makeFiveBlockWorkReply(): string {
  const scene =
    '相手の返事を待つあいだ、次の作業に進みにくくなる場面が出やすいです。急いで全部を仕上げようとして、疲れがたまりやすい流れも見えます。今回は待ち時間の扱い方と、今日確認できる一歩だけを見ます。';
  const report =
    '保存版のⅡ章「構造を読む」では、勢いよく進めたあとに一段落ち着く流れが出やすいと書かれています。今の不安は、その流れの中で返事待ちが重なったときに出やすい反応として読めます。';
  const alt =
    '返事がない時間を、自分への否定として扱わなくてよい場面もあります。相手の都合や確認のタイミングがずれることも、必ずしもあなたの進め方だけの問題ではありません。';
  const aux =
    '返事がない時間が続くほど、自分を責めやすくなるサインが出やすいです。そこで一度手を止めて、今日は確認だけに絞ると負担が小さくなります。';
  const today =
    '今日やることは1つだけです。今進めている仕事について、相手が10秒で返せる確認を1つ送ってください。たとえば「ここまで進めています。方向だけ、OKか修正ありで教えてください」と聞いてみてください。';
  const pad = '相談文の具体語を戻しながら、保存版の傾向に沿って場面を整理します。';
  return [scene, report, alt, aux, today]
    .map((p) => `${p}${pad.repeat(8)}`)
    .join('\n\n');
}

describe('consultReplyGenerationContract', () => {
  it('defines SSOT-aligned length constants', () => {
    assert.equal(CONSULT_REPLY_GENERATION.targetMinJa, 1200);
    assert.equal(CONSULT_REPLY_GENERATION.targetMaxJa, 1800);
    assert.equal(CONSULT_REPLY_GENERATION.minimumAcceptableJa, 1000);
    assert.equal(CONSULT_REPLY_GENERATION.hardUpperGuidanceJa, 2200);
    assert.equal(CONSULT_REPLY_GENERATION.outputHardCapJa, 2400);
    assert.equal(CONSULT_REPLY_GENERATION.openAiMaxTokens, 2400);
    assert.equal(CONSULT_REPLY_GENERATION.minBlockCount, 4);
    assert.equal(CONSULT_REPLY_GENERATION.maxBlockCount, 5);
  });

  it('accepts 4–5 block complete reply at target length', () => {
    const text = makeValidReply(1300);
    assert.ok(text.length >= 1200);
    assert.equal(countConsultReplyBlocks(text), 4);
    assert.deepEqual(validateConsultReplyCompleteness(text), { ok: true });
  });

  it('rejects truncation ellipsis before commit path', () => {
    const text = `${makeValidReply(1100).slice(0, 1099)}…`;
    const result = validateConsultReplyCompleteness(text);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'truncation_ellipsis');
  });

  it('rejects below minimum length unless safety/vague exempt', () => {
    const short = '短い。\n\n短い。\n\n短い。\n\n短い。';
    const result = validateConsultReplyCompleteness(short);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'below_minimum_length');
  });

  it('allows short safety refusal without minimum/block enforcement', () => {
    const refusal = 'この内容はこの相談では扱えません。専門家への相談をお勧めします。';
    assert.deepEqual(
      validateConsultReplyCompleteness(refusal, { exemptMinimumAndBlocks: true }),
      { ok: true },
    );
  });

  it('send route uses generation contract and skips clampOutput', () => {
    const src = readFileSync(SEND_ROUTE, 'utf8');
    assert.ok(src.includes('validateConsultReplyCompleteness'));
    assert.ok(src.includes('max_tokens: CONSULT_REPLY_GENERATION.openAiMaxTokens'));
    assert.equal(src.includes('clampOutput'), false);
    assert.equal(src.includes('700〜900'), false);
    assert.equal(src.includes('max_tokens: 800'), false);
    assert.ok(src.includes('completeness failed'));
    assert.ok(src.includes('CONSULT_REPLY_GENERATION_INCOMPLETE_USER_MESSAGE_JA'));
  });

  it('send route prompt constrains 今日の一手 to one action, not 1-3', () => {
    const src = readFileSync(SEND_ROUTE, 'utf8');
    assert.ok(src.includes('今日やることは1つだけです'), 'prompt must include single-action opener');
    assert.ok(src.includes('行動を1つだけ書く'), 'prompt must say 1 action only');
    assert.equal(src.includes('行動を1〜3個'), false, 'old multi-action rule must not be present');
    assert.equal(src.includes('末尾に保存版の章を読み返す問いを1文入れる'), false, 'saved-report CTA must not be inside today block');
  });

  it('send route prompt defines distinct section roles to prevent repetition', () => {
    const src = readFileSync(SEND_ROUTE, 'utf8');
    assert.ok(src.includes('今どこがしんどいか'), 'section 1 role defined');
    assert.ok(src.includes('保存版のどことつながるか'), 'section 2 role defined');
    assert.ok(src.includes('別の見方はないか'), 'section 3 role defined');
    assert.ok(src.includes('どのサインが出たら小さく区切るか'), 'section 4 role defined');
    assert.ok(src.includes('今日の1つの行動'), 'section 5 role defined');
  });

  it('send route prompt includes server completion requirements aligned with validator', () => {
    const src = readFileSync(SEND_ROUTE, 'utf8');
    assert.ok(src.includes('CONSULT_REPLY_PROMPT_COMPLETION_REQUIREMENTS_JA'));
    assert.ok(src.includes('必ず5段落に分ける'));
    assert.ok(src.includes('CONSULT_REPLY_GENERATION.minimumAcceptableJa'));
    assert.ok(src.includes('最終文は「。」で終えること'));
    assert.match(CONSULT_REPLY_PROMPT_COMPLETION_REQUIREMENTS_JA, /1,200〜1,800/);
    assert.match(CONSULT_REPLY_PROMPT_COMPLETION_REQUIREMENTS_JA, /2400文字超/);
    assert.match(CONSULT_REPLY_PROMPT_COMPLETION_REQUIREMENTS_JA, /今日やることは1つだけです/);
    assert.match(CONSULT_REPLY_PROMPT_COMPLETION_REQUIREMENTS_JA, /段落内では改行しない/);
    assert.match(CONSULT_REPLY_PROMPT_COMPLETION_REQUIREMENTS_JA, /最終文は必ず「。」で終える/);
    assert.equal(
      CONSULT_REPLY_PROMPT_COMPLETION_REQUIREMENTS_JA.includes('保存版の内容を再度読み返し'),
      true,
    );
  });

  it('send route normalizes paragraph breaks before completeness validation', () => {
    const src = readFileSync(SEND_ROUTE, 'utf8');
    assert.ok(src.includes('normalizeConsultReplyParagraphBreaks'));
    assert.ok(
      src.indexOf('normalizeConsultReplyParagraphBreaks') <
        src.indexOf('validateConsultReplyCompleteness'),
    );
  });

  it('accepts intended 5-block work-theme reply fixture at target length', () => {
    const text = makeFiveBlockWorkReply();
    assert.equal(countConsultReplyBlocks(text), 5);
    assert.ok(text.length >= CONSULT_REPLY_GENERATION.targetMinJa);
    assert.ok(text.length <= CONSULT_REPLY_GENERATION.outputHardCapJa);
    assert.ok(text.includes('今日やることは1つだけです'));
    assert.deepEqual(validateConsultReplyCompleteness(text), { ok: true });
  });

  it('normalizeConsultReplyParagraphBreaks repairs single-newline paragraph drift', () => {
    const drifted = [
      '段落1の1文目。段落1の2文目。',
      '段落2の1文目。段落2の2文目。',
      '段落3の1文目。段落3の2文目。',
      '段落4の1文目。段落4の2文目。',
    ].join('\n');
    const padded = `${drifted}${'保存版の傾向に沿って場面を整理する。'.repeat(80)}`;
    assert.equal(countConsultReplyBlocks(padded), 1);
    const repaired = normalizeConsultReplyParagraphBreaks(padded);
    assert.ok(countConsultReplyBlocks(repaired) >= CONSULT_REPLY_GENERATION.minBlockCount);
  });

  it('rejects insufficient blocks and incomplete sentence end', () => {
    const oneBlock = `${'保存版の傾向に沿って場面を整理する。'.repeat(120)}`;
    const blockResult = validateConsultReplyCompleteness(oneBlock);
    assert.equal(blockResult.ok, false);
    if (!blockResult.ok) assert.equal(blockResult.reason, 'insufficient_blocks');

    const noEnd = makeValidReply(1100).replace(/[。！？!?」』]+$/u, '');
    assert.ok(noEnd.length >= CONSULT_REPLY_GENERATION.minimumAcceptableJa);
    const endResult = validateConsultReplyCompleteness(noEnd);
    assert.equal(endResult.ok, false);
    if (!endResult.ok) assert.equal(endResult.reason, 'incomplete_sentence_end');
  });

  it('SSOT documents reply length contract in §7.2', () => {
    const doc = readFileSync(SSOT, 'utf8');
    assert.ok(doc.includes('### 7.2 相談返書 — reply generation contract'));
    assert.ok(doc.includes('1,200–1,800'));
    assert.ok(doc.includes('1,000'));
    assert.ok(doc.includes('2,200'));
    assert.ok(doc.includes('2,400'));
    assert.ok(doc.includes('Ⅰ「自分の形を知る」'));
  });
});
