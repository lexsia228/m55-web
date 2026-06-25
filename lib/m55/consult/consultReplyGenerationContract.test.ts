import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CONSULT_REPLY_GENERATION,
  countConsultReplyBlocks,
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
