import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CONSULT_REPLY_GENERATION,
  validateConsultReplyCompleteness,
} from './consultReplyGenerationContract';
import {
  buildConsultReplyLengthRepairUserMessage,
  CONSULT_REPLY_LENGTH_REPAIR_USER_PREFIX_JA,
  isConsultReplyLengthRepairable,
} from './consultReplyLengthRepair';

const SEND_ROUTE = join(process.cwd(), 'app/api/room/core/send/route.ts');

/** Production-like 931-char / 5-block short reply (below minimum, valid structure). */
function makeNonThemeShortReply(lengthTarget = 931): string {
  const pad = (base: string, n: number) => {
    let s = base;
    while (s.length < n) s += '相談文の具体語を戻しながら保存版の傾向に沿って整理します。';
    return `${s.slice(0, n - 1)}。`;
  };
  const blocks = [
    pad('相手の返事を待つあいだ次の作業に進みにくくなる場面が出やすいです', 180),
    pad('保存版のⅡ章では先を確かめてから動く傾向が返事待ちの不安を長引かせやすいと書かれています', 190),
    pad('少しほどくと返事がない時間を自分への否定として扱わなくてよい場面もあります', 185),
    pad('見直すときの目印として返事がない時間が続くほど自分を責めやすくなるサインが出やすいです', 185),
    pad('今日やることは1つだけです。今進めている仕事について相手が10秒で返せる確認を1つ送ってください', 191),
  ];
  let text = blocks.join('\n\n');
  if (text.length > lengthTarget) {
    text = text.slice(0, lengthTarget - 1) + '。';
  }
  return text;
}

describe('consultReplyLengthRepair', () => {
  it('only below_minimum_length is repairable', () => {
    assert.equal(isConsultReplyLengthRepairable('below_minimum_length'), true);
    assert.equal(isConsultReplyLengthRepairable('insufficient_blocks'), false);
    assert.equal(isConsultReplyLengthRepairable('truncation_ellipsis'), false);
    assert.equal(isConsultReplyLengthRepairable('exceeds_hard_cap'), false);
  });

  it('repair prompt enforces minimum and target band without filler guidance', () => {
    assert.ok(CONSULT_REPLY_LENGTH_REPAIR_USER_PREFIX_JA.includes('水増し'));
    assert.ok(
      CONSULT_REPLY_LENGTH_REPAIR_USER_PREFIX_JA.includes(
        String(CONSULT_REPLY_GENERATION.minimumAcceptableJa),
      ),
    );
    assert.ok(
      CONSULT_REPLY_LENGTH_REPAIR_USER_PREFIX_JA.includes(
        String(CONSULT_REPLY_GENERATION.targetMinJa),
      ),
    );
    assert.ok(
      CONSULT_REPLY_LENGTH_REPAIR_USER_PREFIX_JA.includes(
        String(CONSULT_REPLY_GENERATION.targetMaxJa),
      ),
    );
    assert.ok(CONSULT_REPLY_LENGTH_REPAIR_USER_PREFIX_JA.includes('今日やることは1つだけです。'));
  });

  it('buildConsultReplyLengthRepairUserMessage includes draft for model only', () => {
    const draft = makeNonThemeShortReply();
    const msg = buildConsultReplyLengthRepairUserMessage(draft);
    assert.ok(msg.includes('ドラフト（このまま保存不可）'));
    assert.ok(msg.endsWith(draft.trim()));
  });

  it('931-char non-theme fixture fails then expanded fixture passes completeness', () => {
    const short = makeNonThemeShortReply(931);
    assert.ok(short.length < CONSULT_REPLY_GENERATION.minimumAcceptableJa);
    const shortResult = validateConsultReplyCompleteness(short);
    assert.equal(shortResult.ok, false);
    if (!shortResult.ok) assert.equal(shortResult.reason, 'below_minimum_length');

    const expandBlock = (block: string) =>
      `${block} 相談文の具体語を各段落に戻し、保存版の傾向語をそのまま使って場面を深めます。`;
    const expanded = short
      .split('\n\n')
      .map(expandBlock)
      .join('\n\n');
    assert.ok(expanded.length >= CONSULT_REPLY_GENERATION.minimumAcceptableJa);
    assert.deepEqual(validateConsultReplyCompleteness(expanded), { ok: true });
  });

  it('send route wires bounded repair before RPC and logs redacted fields only', () => {
    const src = readFileSync(SEND_ROUTE, 'utf8');
    assert.ok(src.includes('attemptConsultReplyLengthRepair'));
    assert.ok(src.includes('finalizeConsultReplyWithOptionalRepair'));
    assert.ok(src.includes('retryAttempted'));
    assert.ok(src.includes('repairSucceeded'));
    const rpcIdx = src.indexOf("await db.rpc('m55_consult_reply_commit'");
    assert.ok(rpcIdx >= 0);
    assert.ok(src.indexOf('async function finalizeConsultReplyWithOptionalRepair') < rpcIdx);
    assert.ok(src.indexOf('function validateConsultReplyCompleteness') < 0);
    assert.ok(src.lastIndexOf('validateConsultReplyCompleteness(') < rpcIdx);
    const failLog = src.match(
      /\[room\/core\/send\] consult reply completeness failed[\s\S]*?\}\)\s*\)/,
    );
    assert.ok(failLog, 'completeness failure log block must exist');
    assert.equal(failLog![0].includes('content:'), false);
    assert.equal(failLog![0].includes('p_assistant_message'), false);
    assert.equal(failLog![0].includes('initialRaw'), false);
    assert.equal(failLog![0].includes('repairedText'), false);
    assert.equal(failLog![0].includes('userMessage'), false);
  });

  it('send route does not double-consume ticket on repair path', () => {
    const src = readFileSync(SEND_ROUTE, 'utf8');
    const repairSrc = readFileSync(
      join(process.cwd(), 'lib/m55/consult/consultReplyLengthRepair.ts'),
      'utf8',
    );
    const rpcCalls = src.match(/await db\.rpc\('m55_consult_reply_commit'/g) ?? [];
    assert.equal(rpcCalls.length, 1, 'exactly one RPC commit per request');
    assert.equal(repairSrc.includes('m55_consult_reply_commit'), false);
    assert.equal(repairSrc.includes('consumption_applied'), false);
    assert.equal(repairSrc.includes('reply_ticket_wallets'), false);
  });
});
