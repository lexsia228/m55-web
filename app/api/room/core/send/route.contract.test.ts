import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SEND_ROUTE = join(process.cwd(), 'app/api/room/core/send/route.ts');

describe('room/core/send route contract', () => {
  it('uses strict consult send request schema instead of raw message body', () => {
    const src = readFileSync(SEND_ROUTE, 'utf8');
    assert.ok(src.includes('validateConsultSendRequest'));
    assert.equal(src.includes('validateConsultSendInput'), false);
    assert.equal(src.includes('body.message'), false);
    assert.ok(src.includes('composedUserMessage'));
    assert.ok(src.includes('catalogEntry'));
  });

  it('does not use CONSULT_BODY_PRESENT path from send route', () => {
    const src = readFileSync(SEND_ROUTE, 'utf8');
    assert.equal(src.includes('CONSULT_BODY_PRESENT'), false);
    assert.equal(src.includes('isThemeOnly'), false);
  });

  it('keeps ticket consumption on RPC success only', () => {
    const src = readFileSync(SEND_ROUTE, 'utf8');
    const postIndex = src.indexOf('export async function POST');
    assert.ok(postIndex >= 0);
    const postBody = src.slice(postIndex);
    const rpcIndex = postBody.indexOf("await db.rpc('m55_consult_reply_commit'");
    const safetyIndex = postBody.indexOf('classifyM55AiSafetyInput(userMessage');
    const validateIndex = postBody.indexOf('validateConsultSendRequest(body)');
    const groundingIndex = postBody.indexOf('buildConsultReportContextFromEnvelope');
    assert.ok(rpcIndex > safetyIndex);
    assert.ok(rpcIndex > validateIndex);
    assert.ok(rpcIndex > groundingIndex);
  });

  it('passes catalog entry into system prompt builder', () => {
    const src = readFileSync(SEND_ROUTE, 'utf8');
    assert.ok(src.includes('buildSystemPrompt(reportContext, userMessage, catalogEntry)'));
    assert.ok(src.includes('ConsultQuestionCatalogEntry'));
  });
});
