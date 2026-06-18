import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const WEBHOOK_ROUTE = join(process.cwd(), 'app/api/stripe/webhook/route.ts');
const MIGRATION = join(
  process.cwd(),
  'supabase/migrations/20260615000001_failed_fulfillments_user_ref_hash.sql'
);

function readWebhook(): string {
  return readFileSync(WEBHOOK_ROUTE, 'utf8');
}

function readMigration(): string {
  return readFileSync(MIGRATION, 'utf8');
}

function helperBody(src: string): string {
  const start = src.indexOf('async function insertFailedFulfillment');
  assert.ok(start >= 0, 'insertFailedFulfillment helper missing');
  const end = src.indexOf('\n/** charge.refunded', start);
  assert.ok(end > start, 'insertFailedFulfillment helper end missing');
  return src.slice(start, end);
}

function callSitesBlock(src: string): string {
  const helperStart = src.indexOf('async function insertFailedFulfillment');
  const beforeHelper = src.slice(0, helperStart);
  const afterHelper = src.slice(helperStart);
  const afterStart = afterHelper.indexOf('async function lookupCheckoutSessionForRefund');
  const afterBlock = afterHelper.slice(afterStart);
  return beforeHelper + afterBlock;
}

describe('failedFulfillmentsIdentifiability — migration contract', () => {
  it('adds nullable user_ref_hash without default or backfill', () => {
    const sql = readMigration();
    assert.match(sql, /ADD COLUMN IF NOT EXISTS user_ref_hash text NULL/);
    assert.doesNotMatch(sql, /DEFAULT/i);
    assert.doesNotMatch(sql, /UPDATE\s+public\.failed_fulfillments/i);
    assert.doesNotMatch(sql, /DELETE\s+FROM\s+public\.failed_fulfillments/i);
  });

  it('adds 16 lowercase hex CHECK with named constraint', () => {
    const sql = readMigration();
    assert.match(sql, /failed_fulfillments_user_ref_hash_format_check/);
    assert.match(sql, /user_ref_hash ~ '\^\[0-9a-f\]\{16\}\$'/);
  });

  it('adds partial index on user_ref_hash', () => {
    const sql = readMigration();
    assert.match(sql, /idx_failed_fulfillments_user_ref_hash/);
    assert.match(sql, /WHERE user_ref_hash IS NOT NULL/);
    assert.doesNotMatch(sql, /UNIQUE/i);
  });

  it('revokes anon/authenticated table privileges without REVOKE ALL', () => {
    const sql = readMigration();
    assert.match(
      sql,
      /REVOKE SELECT, INSERT, UPDATE, DELETE\s+ON TABLE public\.failed_fulfillments\s+FROM anon, authenticated/
    );
    assert.doesNotMatch(sql, /REVOKE ALL/i);
    assert.doesNotMatch(sql, /service_role/i);
    assert.doesNotMatch(sql, /ROW LEVEL SECURITY/i);
    assert.doesNotMatch(sql, /CREATE POLICY/i);
    assert.doesNotMatch(sql, /GRANT/i);
  });
});

describe('failedFulfillmentsIdentifiability — webhook helper', () => {
  it('inserts user_ref_hash and validates hash format before DB write', () => {
    const helper = helperBody(readWebhook());
    assert.match(helper, /user_ref_hash: userRefHash/);
    assert.match(helper, /USER_REF_HASH_RE\.test\(userRefHash\)/);
    assert.match(helper, /failed_fulfillments_validation_failed/);
    assert.match(helper, /error_code: 'INVALID_USER_REF_HASH'/);
    assert.doesNotMatch(helper, /throw new/);
  });

  it('imports hashUserIdForLedgerLog from existing export', () => {
    const src = readWebhook();
    assert.match(src, /import \{ hashUserIdForLedgerLog \} from '\.\.\/\.\.\/\.\.\/\.\.\/lib\/m55\/reply\/readReplyWalletProbe'/);
  });
});

describe('failedFulfillmentsIdentifiability — call site contracts', () => {
  it('missing_client_reference_id uses null metadata and null hash', () => {
    const block = callSitesBlock(readWebhook());
    const idx = block.indexOf("'missing_client_reference_id'");
    assert.ok(idx >= 0);
    const snippet = block.slice(idx - 120, idx + 120);
    assert.match(snippet, /insertFailedFulfillment\([^)]*null,\s*null\)/);
    assert.doesNotMatch(snippet, /session\.metadata/);
  });

  it('product_mismatch stores productId only with user hash', () => {
    const block = callSitesBlock(readWebhook());
    const idx = block.indexOf("'product_mismatch'");
    assert.ok(idx >= 0);
    const snippet = block.slice(idx - 160, idx + 80);
    assert.match(snippet, /\{ productId \}/);
    assert.match(snippet, /hashUserIdForLedgerLog\(userId\)/);
    assert.doesNotMatch(snippet, /session\.metadata/);
  });

  it('payment_status_not_paid stores payment_status only with user hash', () => {
    const block = callSitesBlock(readWebhook());
    const idx = block.indexOf("'payment_status_not_paid'");
    assert.ok(idx >= 0);
    const snippet = block.slice(idx - 80, idx + 200);
    assert.match(snippet, /payment_status: result\.detail/);
    assert.match(snippet, /hashUserIdForLedgerLog\(userId\)/);
    assert.doesNotMatch(snippet, /session\.metadata/);
  });

  it('fulfill_* paths use null metadata and required hash', () => {
    const block = callSitesBlock(readWebhook());
    const idx = block.indexOf('`fulfill_${result.reason}`');
    assert.ok(idx >= 0, 'fulfill_* call site missing');
    const snippet = block.slice(idx - 80, idx + 160);
    assert.match(snippet, /null,\s*hashUserIdForLedgerLog\(userId\)/);
    assert.doesNotMatch(snippet, /session\.metadata/);
  });

  it('internal_processing_failed keeps literal reason and null metadata', () => {
    const block = callSitesBlock(readWebhook());
    const idx = block.indexOf("'internal_processing_failed'");
    assert.ok(idx >= 0);
    const snippet = block.slice(idx - 80, idx + 120);
    assert.match(snippet, /'internal_processing_failed'/);
    assert.match(snippet, /null,\s*hashUserIdForLedgerLog\(userId\)/);
    assert.doesNotMatch(snippet, /detail:/);
    assert.doesNotMatch(snippet, /reason:/);
  });

  it('revoke_failed uses null metadata and hash from OTF user_id', () => {
    const block = callSitesBlock(readWebhook());
    const idx = block.indexOf("'revoke_failed'");
    assert.ok(idx >= 0);
    const snippet = block.slice(idx - 120, idx + 120);
    assert.match(snippet, /'revoke_failed',\s*null,\s*hashUserIdForLedgerLog\(userId\)/);
    assert.doesNotMatch(snippet, /payment_intent_id/);
    assert.doesNotMatch(snippet, /error:/);
  });

  it('stripe_events_insert_failed uses null metadata', () => {
    const block = callSitesBlock(readWebhook());
    const idx = block.indexOf("'stripe_events_insert_failed'");
    assert.ok(idx >= 0);
    const snippet = block.slice(idx - 200, idx + 120);
    assert.match(snippet, /'stripe_events_insert_failed',\s*null,/);
    assert.doesNotMatch(snippet, /\{ error:/);
  });

  it('failed fulfillment calls do not spread session.metadata', () => {
    const block = callSitesBlock(readWebhook());
    assert.doesNotMatch(block, /\.\.\.\(session\.metadata/);
    assert.doesNotMatch(block, /session\.metadata \?\? null/);
  });

  it('does not persist profile metadata keys in failed fulfillment payloads', () => {
    const block = callSitesBlock(readWebhook());
    for (const key of [
      'profileNickname',
      'profileBirthDate',
      'profileBirthTime',
      'profileBirthplace',
      'profileTimezone',
      'profileCountry',
    ]) {
      assert.equal(block.includes(key), false, `forbidden profile key in failed lane: ${key}`);
    }
  });

  it('does not pass raw Clerk ID into insertFailedFulfillment hash argument position', () => {
    const src = readWebhook();
    const calls = [...src.matchAll(/insertFailedFulfillment\([\s\S]*?\);/g)].map((m) => m[0]);
    assert.ok(calls.length >= 7, 'expected failed fulfillment call sites');
    for (const call of calls) {
      assert.doesNotMatch(call, /hashUserIdForLedgerLog\(session\.client_reference_id/);
      assert.doesNotMatch(call, /,\s*userId\s*\)/);
      assert.doesNotMatch(call, /,\s*clientReferenceId\s*\)/);
    }
  });
});
