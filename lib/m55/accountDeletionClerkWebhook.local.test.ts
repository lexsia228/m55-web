import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  KNOWN_RPC_ERROR_CODES,
  SVIX_NON_2XX_TRIGGERS_RETRY,
  USER_REF_HASH_RE,
  isRpcSuccess,
  isValidClerkUserId,
  isValidSvixId,
  listMissingSvixHeaders,
  parseKnownRpcFailure,
  rpcFailureResponseKey,
} from './accountDeletionClerkWebhookContract';
import { hashUserIdForLedgerLog } from './reply/readReplyWalletProbe';

const ROUTE = join(process.cwd(), 'app/api/clerk/webhook/route.ts');
const CONTRACT = join(process.cwd(), 'lib/m55/accountDeletionClerkWebhookContract.ts');
const MIDDLEWARE = join(process.cwd(), 'middleware.ts');

function readRoute(): string {
  return readFileSync(ROUTE, 'utf8');
}

function readContract(): string {
  return readFileSync(CONTRACT, 'utf8');
}

function routeSourceWithoutComments(src: string): string {
  return src
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
}

function postHandlerBody(src: string): string {
  const start = src.indexOf('export async function POST');
  const end = src.indexOf('\n}', start);
  assert.ok(start >= 0, 'POST handler missing');
  assert.ok(end > start, 'POST handler end missing');
  return src.slice(start, end);
}

describe('accountDeletionClerkWebhook — delivery contract', () => {
  it('documents non-2xx as Svix retry trigger', () => {
    assert.equal(SVIX_NON_2XX_TRIGGERS_RETRY, true);
    const src = readContract();
    assert.match(src, /only 2xx is success/);
    assert.match(src, /non-2xx \(including 400\) triggers retry/);
  });
});

describe('accountDeletionClerkWebhook — route export surface', () => {
  const FORBIDDEN_ROUTE_EXPORT_PATTERNS = [
    /export\s+(?:async\s+)?function\s+GET\b/,
    /export\s+(?:async\s+)?function\s+PUT\b/,
    /export\s+(?:async\s+)?function\s+PATCH\b/,
    /export\s+(?:async\s+)?function\s+DELETE\b/,
    /export\s+(?:async\s+)?function\s+HEAD\b/,
    /export\s+(?:async\s+)?function\s+OPTIONS\b/,
    /export const SVIX_/,
    /export const KNOWN_RPC_/,
    /export const USER_REF_/,
    /export function listMissing/,
    /export function isValid/,
    /export function isRpc/,
    /export function parseKnown/,
    /export function rpcFailure/,
  ];

  it('allows only POST runtime and dynamic exports', () => {
    const src = routeSourceWithoutComments(readRoute());
    assert.match(src, /export const runtime = 'nodejs'/);
    assert.match(src, /export const dynamic = 'force-dynamic'/);
    assert.match(src, /export async function POST\b/);
    const exportMatches = src.match(/^export\s+/gm) ?? [];
    assert.equal(exportMatches.length, 3, `unexpected export count: ${exportMatches.length}`);
    for (const pattern of FORBIDDEN_ROUTE_EXPORT_PATTERNS) {
      assert.doesNotMatch(src, pattern);
    }
  });

  it('imports helpers from accountDeletionClerkWebhookContract', () => {
    const src = readRoute();
    assert.match(src, /from '\.\.\/\.\.\/\.\.\/\.\.\/lib\/m55\/accountDeletionClerkWebhookContract'/);
    assert.doesNotMatch(src, /export function listMissingSvixHeaders/);
    assert.doesNotMatch(src, /export const SVIX_HEADER_NAMES/);
  });
});

describe('accountDeletionClerkWebhook — route static contract', () => {
  it('uses nodejs runtime and force-dynamic', () => {
    const src = readRoute();
    assert.match(src, /export const runtime = 'nodejs'/);
    assert.match(src, /export const dynamic = 'force-dynamic'/);
  });

  it('imports verifyWebhook from @clerk/nextjs/webhooks', () => {
    const src = readRoute();
    assert.match(src, /import \{ verifyWebhook \} from '@clerk\/nextjs\/webhooks'/);
  });

  it('does not read request body before verifyWebhook', () => {
    const body = postHandlerBody(readRoute());
    assert.doesNotMatch(body, /req\.text\(/);
    assert.doesNotMatch(body, /req\.json\(/);
  });

  it('prechecks svix headers before verifyWebhook and env read order', () => {
    const body = postHandlerBody(readRoute());
    const contract = readContract();
    const headerCheck = body.indexOf('listMissingSvixHeaders');
    const envCheck = body.indexOf('CLERK_WEBHOOK_SIGNING_SECRET');
    const verifyCall = body.indexOf('verifyWebhook');
    assert.ok(headerCheck >= 0 && envCheck > headerCheck && verifyCall > envCheck);
    assert.match(contract, /'svix-id'/);
    assert.match(contract, /'svix-timestamp'/);
    assert.match(contract, /'svix-signature'/);
    assert.match(contract, /SVIX_HEADER_NAMES/);
  });

  it('passes explicit signingSecret into verifyWebhook', () => {
    const body = postHandlerBody(readRoute());
    assert.match(body, /verifyWebhook\(req, \{ signingSecret \}\)/);
  });

  it('returns missing_signature before verifyWebhook on header gap', () => {
    const body = postHandlerBody(readRoute());
    const missingBlock = body.slice(
      body.indexOf('listMissingSvixHeaders'),
      body.indexOf('CLERK_WEBHOOK_SIGNING_SECRET')
    );
    assert.match(missingBlock, /missing_signature/);
    assert.match(missingBlock, /status: 400/);
    assert.doesNotMatch(missingBlock, /verifyWebhook/);
    assert.doesNotMatch(missingBlock, /getSupabaseAdmin/);
  });

  it('returns webhook_not_configured before verifyWebhook when env missing', () => {
    const body = postHandlerBody(readRoute());
    const envBlock = body.slice(
      body.indexOf('CLERK_WEBHOOK_SIGNING_SECRET'),
      body.indexOf('verifyWebhook')
    );
    assert.match(envBlock, /webhook_not_configured/);
    assert.match(envBlock, /status: 503/);
    assert.doesNotMatch(envBlock, /verifyWebhook/);
    assert.doesNotMatch(envBlock, /getSupabaseAdmin/);
  });

  it('maps invalid signature to 400 without raw Error logging', () => {
    const body = postHandlerBody(readRoute());
    assert.match(body, /invalid_signature/);
    assert.match(body, /stage: 'verify_signature'/);
    assert.doesNotMatch(body, /console\.error\([^)]*err/);
  });

  it('ignores unsupported events with 200 and no RPC', () => {
    const body = postHandlerBody(readRoute());
    const ignoredBlock = body.slice(
      body.indexOf("evt.type !== USER_DELETED_EVENT"),
      body.indexOf('isValidClerkUserId')
    );
    assert.match(ignoredBlock, /received: true/);
    assert.match(ignoredBlock, /status: 200/);
    assert.doesNotMatch(ignoredBlock, /\.rpc\(/);
  });

  it('stores hash in userRefHash and passes exact RPC args without inline helper call', () => {
    const body = postHandlerBody(readRoute());
    assert.match(body, /const userRefHash = hashUserIdForLedgerLog\(clerkUserId\)/);
    assert.match(body, /p_user_ref_hash: userRefHash/);
    assert.doesNotMatch(body, /p_user_ref_hash: hashUserIdForLedgerLog/);
    assert.match(body, /m55_account_deletion_process_v1/);
    assert.match(body, /p_svix_id: svixId/);
    assert.match(body, /p_event_type: evt\.type/);
    assert.match(body, /p_clerk_user_id: clerkUserId/);
  });

  it('rejects invalid Svix ID before getSupabaseAdmin in POST scope', () => {
    const body = postHandlerBody(readRoute());
    const svixBlock = body.slice(
      body.indexOf('isValidSvixId'),
      body.indexOf('const userRefHash')
    );
    assert.match(svixBlock, /extract_svix_id/);
    assert.match(svixBlock, /invalid_payload/);
    assert.match(svixBlock, /status: 400/);
    assert.doesNotMatch(svixBlock, /getSupabaseAdmin/);
    assert.doesNotMatch(svixBlock, /\.rpc\(/);
  });

  it('rejects invalid hash before getSupabaseAdmin in POST scope', () => {
    const body = postHandlerBody(readRoute());
    const hashBlock = body.slice(
      body.indexOf('USER_REF_HASH_RE.test'),
      body.indexOf('getSupabaseAdmin')
    );
    assert.match(hashBlock, /invalid_rpc_input/);
    assert.match(hashBlock, /status: 500/);
    assert.match(hashBlock, /stage: 'hash'/);
    assert.doesNotMatch(hashBlock, /getSupabaseAdmin/);
    assert.doesNotMatch(hashBlock, /\.rpc\(/);
  });

  it('does not write ledger or cleanup tables from route', () => {
    const src = readRoute();
    assert.doesNotMatch(src, /clerk_webhook_events/);
    assert.doesNotMatch(src, /DELETE FROM/i);
    assert.doesNotMatch(src, /INSERT INTO/i);
    assert.doesNotMatch(src, /UPDATE public\./i);
  });

  it('uses getSupabaseAdmin service-role path only', () => {
    const src = readRoute();
    assert.match(src, /getSupabaseAdmin/);
    assert.doesNotMatch(src, /createClient\(/);
    assert.doesNotMatch(src, /NEXT_PUBLIC_SUPABASE_ANON/);
  });

  it('does not log raw clerk id hash or svix id', () => {
    const body = postHandlerBody(readRoute());
    const logCalls = body.match(/logSafe(?:Warn|Error)?\(\{[^}]+\}\)/g) ?? [];
    assert.ok(logCalls.length > 0, 'log calls missing');
    for (const call of logCalls) {
      assert.doesNotMatch(call, /clerkUserId/);
      assert.doesNotMatch(call, /svixId/);
      assert.doesNotMatch(call, /user_ref_hash/);
      assert.doesNotMatch(call, /hashUserIdForLedgerLog/);
      assert.doesNotMatch(call, /userRefHash/);
      assert.doesNotMatch(call, /rpcData/);
      assert.doesNotMatch(call, /evt\.data/);
      if (!call.includes("stage: 'ignored'")) {
        assert.doesNotMatch(call, /evt\./);
      }
    }
    assert.doesNotMatch(body, /console\.(info|warn|error)\([^)]*err/);
    assert.doesNotMatch(body, /console\.(info|warn|error)\([^)]*error/);
    assert.doesNotMatch(body, /console\.(info|warn|error)\([^)]*data/);
  });

  it('does not reference stripe_events or stripe webhook tables', () => {
    const src = readRoute();
    assert.doesNotMatch(src, /stripe_events/i);
    assert.doesNotMatch(src, /stripe_processed_events/i);
  });
});

describe('accountDeletionClerkWebhook — middleware public route', () => {
  it('adds /api/clerk/webhook to isPublicRoute', () => {
    const src = readFileSync(MIDDLEWARE, 'utf8');
    assert.match(src, /'\/api\/clerk\/webhook'/);
  });
});

describe('accountDeletionClerkWebhook — header precheck helpers', () => {
  it('detects each missing svix header', () => {
    const cases: Array<{ id: string | null; ts: string | null; sig: string | null }> = [
      { id: null, ts: '1', sig: 'a' },
      { id: 'id', ts: '', sig: 'a' },
      { id: 'id', ts: '1', sig: null },
    ];
    for (const c of cases) {
      const hdrs = {
        get: (name: string) => {
          if (name === 'svix-id') return c.id;
          if (name === 'svix-timestamp') return c.ts;
          if (name === 'svix-signature') return c.sig;
          return null;
        },
      };
      assert.ok(listMissingSvixHeaders(hdrs).length > 0);
    }
  });

  it('accepts all three svix headers present', () => {
    const hdrs = {
      get: (name: string) => (name.startsWith('svix-') ? 'present' : null),
    };
    assert.deepEqual(listMissingSvixHeaders(hdrs), []);
  });
});

describe('accountDeletionClerkWebhook — payload validation helpers', () => {
  it('rejects non-string empty and whitespace-padded user IDs', () => {
    assert.equal(isValidClerkUserId(null), false);
    assert.equal(isValidClerkUserId(undefined), false);
    assert.equal(isValidClerkUserId(123), false);
    assert.equal(isValidClerkUserId(''), false);
    assert.equal(isValidClerkUserId(' user_abc'), false);
    assert.equal(isValidClerkUserId('user_abc '), false);
    assert.equal(isValidClerkUserId('user_abc'), true);
  });

  it('accepts Clerk user ID up to 128 chars and rejects 129 chars', () => {
    assert.equal(isValidClerkUserId('a'.repeat(128)), true);
    assert.equal(isValidClerkUserId('a'.repeat(129)), false);
  });
});

describe('accountDeletionClerkWebhook — Svix ID validation helpers', () => {
  it('rejects null empty padded and overlong Svix IDs', () => {
    assert.equal(isValidSvixId(null), false);
    assert.equal(isValidSvixId(''), false);
    assert.equal(isValidSvixId(' msg_abc'), false);
    assert.equal(isValidSvixId('msg_abc '), false);
    assert.equal(isValidSvixId('a'.repeat(129)), false);
  });

  it('accepts trim-aligned Svix ID up to 128 chars', () => {
    assert.equal(isValidSvixId('msg_abc'), true);
    assert.equal(isValidSvixId('a'.repeat(128)), true);
  });
});

describe('accountDeletionClerkWebhook — hash output validation', () => {
  it('defines USER_REF_HASH_RE as lowercase 16 hex', () => {
    assert.deepEqual(USER_REF_HASH_RE, /^[0-9a-f]{16}$/);
    const body = postHandlerBody(readRoute());
    assert.match(body, /USER_REF_HASH_RE\.test\(userRefHash\)/);
  });

  it('accepts valid hashUserIdForLedgerLog output', () => {
    const hash = hashUserIdForLedgerLog('user_test_clerk_id');
    assert.match(hash, USER_REF_HASH_RE);
    assert.equal(hash.length, 16);
  });

  it('rejects uppercase short long and non-hex hash shapes', () => {
    assert.equal(USER_REF_HASH_RE.test('ABCDEF0123456789'), false);
    assert.equal(USER_REF_HASH_RE.test('abcdef012345678'), false);
    assert.equal(USER_REF_HASH_RE.test('abcdef01234567890'), false);
    assert.equal(USER_REF_HASH_RE.test('ghijklmnop012345'), false);
  });
});

describe('accountDeletionClerkWebhook — RPC result validator', () => {
  it('accepts only ok=true and status=succeeded', () => {
    assert.equal(isRpcSuccess({ ok: true, status: 'succeeded' }), true);
    assert.equal(isRpcSuccess({ ok: true, status: 'failed' }), false);
    assert.equal(isRpcSuccess({ ok: false, status: 'succeeded' }), false);
    assert.equal(isRpcSuccess(null), false);
    assert.equal(isRpcSuccess('x'), false);
    assert.equal(isRpcSuccess({ ok: true }), false);
  });

  it('parses known RPC failures only with exact shape', () => {
    for (const code of KNOWN_RPC_ERROR_CODES) {
      assert.equal(parseKnownRpcFailure({ ok: false, status: 'failed', error_code: code }), code);
    }
    assert.equal(parseKnownRpcFailure({ ok: false, status: 'failed', error_code: 'OTHER' }), null);
    assert.equal(parseKnownRpcFailure({ ok: false, status: 'failed' }), null);
    assert.equal(parseKnownRpcFailure({ ok: true, status: 'failed', error_code: 'INVALID_INPUT' }), null);
    assert.equal(parseKnownRpcFailure(null), null);
    assert.equal(parseKnownRpcFailure('bad'), null);
  });

  it('maps known RPC failures to 500 response keys including INVALID_INPUT and INVALID_EVENT_TYPE', () => {
    assert.equal(rpcFailureResponseKey('INVALID_INPUT'), 'invalid_input');
    assert.equal(rpcFailureResponseKey('INVALID_EVENT_TYPE'), 'invalid_event_type');
    assert.equal(rpcFailureResponseKey('INVALID_PROCESSING_STATE'), 'processing_conflict');
    assert.equal(rpcFailureResponseKey('LEDGER_CLAIM_FAILED'), 'ledger_claim_failed');
    assert.equal(rpcFailureResponseKey('CLEANUP_FAILED'), 'cleanup_failed');
    assert.equal(rpcFailureResponseKey('VERIFICATION_FAILED'), 'verification_failed');
    assert.equal(rpcFailureResponseKey('UNKNOWN'), 'invalid_rpc_result');
  });

  it('routes malformed RPC results to invalid_rpc_result', () => {
    const body = postHandlerBody(readRoute());
    assert.match(body, /invalid_rpc_result/);
    assert.match(body, /INVALID_RPC_RESULT/);
    assert.match(body, /stage: 'rpc_result'/);
  });

  it('routes Supabase transport errors to upstream_error without raw error logging', () => {
    const body = postHandlerBody(readRoute());
    assert.match(body, /upstream_error/);
    assert.match(body, /stage: 'rpc_transport'/);
    assert.match(body, /error_code: 'UPSTREAM_ERROR'/);
    assert.doesNotMatch(body, /error\.message/);
    assert.doesNotMatch(body, /console\.error\([^)]*error/);
  });

  it('maps known RPC failures to HTTP 500 in route handler', () => {
    const body = postHandlerBody(readRoute());
    const failureBlock = body.slice(body.indexOf('parseKnownRpcFailure'));
    assert.match(failureBlock, /status: 500/);
    assert.doesNotMatch(failureBlock, /status: 400/);
  });
});

describe('accountDeletionClerkWebhook — HTTP status matrix copy', () => {
  const routeMatrix: Array<{ label: string; pattern: RegExp; status: RegExp }> = [
    { label: 'missing_signature', pattern: /missing_signature/, status: /status: 400/ },
    { label: 'invalid_signature', pattern: /invalid_signature/, status: /status: 400/ },
    { label: 'invalid_payload', pattern: /invalid_payload/, status: /status: 400/ },
    { label: 'invalid_rpc_input', pattern: /invalid_rpc_input/, status: /status: 500/ },
    { label: 'webhook_not_configured', pattern: /webhook_not_configured/, status: /status: 503/ },
    { label: 'ignored_event', pattern: /received: true/, status: /status: 200/ },
    { label: 'rpc_succeeded', pattern: /stage: 'rpc_succeeded'/, status: /status: 200/ },
    { label: 'upstream_error', pattern: /upstream_error/, status: /status: 500/ },
    { label: 'invalid_rpc_result', pattern: /invalid_rpc_result/, status: /status: 500/ },
    { label: 'known_failure_via_rpcFailureResponseKey', pattern: /rpcFailureResponseKey\(knownFailure\)/, status: /status: 500/ },
  ];

  for (const row of routeMatrix) {
    it(`route includes ${row.label} response contract`, () => {
      const body = postHandlerBody(readRoute());
      assert.match(body, row.pattern);
      assert.match(body, row.status);
    });
  }

  const contractFailureKeys = [
    'invalid_input',
    'invalid_event_type',
    'processing_conflict',
    'ledger_claim_failed',
    'cleanup_failed',
    'verification_failed',
  ];

  for (const key of contractFailureKeys) {
    it(`contract maps known RPC failure to ${key}`, () => {
      assert.match(readContract(), new RegExp(`'${key}'`));
    });
  }
});
