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
  classifyRpcTransportFailure,
  classifyFetchTransportRejection,
  formatSafeFetchTransportObservationForLog,
  formatSafeRpcTransportFailureForLog,
  parseKnownRpcFailure,
  rpcFailureResponseKey,
  type SafeFetchTransportObservation,
} from './accountDeletionClerkWebhookContract.ts';
import {
  createObservingFetch,
  withAccountDeletionSupabaseClientObservation,
} from './accountDeletionSupabaseClient.ts';
import { hashUserIdForLedgerLog } from './reply/readReplyWalletProbe.ts';

const ROUTE = join(process.cwd(), 'app/api/clerk/webhook/route.ts');
const CONTRACT = join(process.cwd(), 'lib/m55/accountDeletionClerkWebhookContract.ts');
const HELPER = join(process.cwd(), 'lib/m55/accountDeletionSupabaseClient.ts');
const SUPABASE_ADMIN = join(process.cwd(), 'lib/supabaseAdmin.ts');
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
    assert.doesNotMatch(missingBlock, /withAccountDeletionSupabaseClientObservation/);
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
    assert.doesNotMatch(envBlock, /withAccountDeletionSupabaseClientObservation/);
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

  it('rejects invalid Svix ID before dedicated Supabase helper in POST scope', () => {
    const body = postHandlerBody(readRoute());
    const svixBlock = body.slice(
      body.indexOf('isValidSvixId'),
      body.indexOf('const userRefHash')
    );
    assert.match(svixBlock, /extract_svix_id/);
    assert.match(svixBlock, /invalid_payload/);
    assert.match(svixBlock, /status: 400/);
    assert.doesNotMatch(svixBlock, /withAccountDeletionSupabaseClientObservation/);
    assert.doesNotMatch(svixBlock, /\.rpc\(/);
  });

  it('rejects invalid hash before dedicated Supabase helper in POST scope', () => {
    const body = postHandlerBody(readRoute());
    const hashBlock = body.slice(
      body.indexOf('USER_REF_HASH_RE.test'),
      body.indexOf('withAccountDeletionSupabaseClientObservation')
    );
    assert.match(hashBlock, /invalid_rpc_input/);
    assert.match(hashBlock, /status: 500/);
    assert.match(hashBlock, /stage: 'hash'/);
    assert.doesNotMatch(hashBlock, /withAccountDeletionSupabaseClientObservation/);
    assert.doesNotMatch(hashBlock, /\.rpc\(/);
  });

  it('does not write ledger or cleanup tables from route', () => {
    const src = readRoute();
    assert.doesNotMatch(src, /clerk_webhook_events/);
    assert.doesNotMatch(src, /DELETE FROM/i);
    assert.doesNotMatch(src, /INSERT INTO/i);
    assert.doesNotMatch(src, /UPDATE public\./i);
  });

  it('uses dedicated account-deletion Supabase helper only for RPC', () => {
    const src = readRoute();
    assert.match(src, /withAccountDeletionSupabaseClientObservation/);
    assert.doesNotMatch(src, /getSupabaseAdmin/);
    assert.doesNotMatch(src, /createClient\(/);
    assert.doesNotMatch(src, /NEXT_PUBLIC_SUPABASE_ANON/);
  });

  it('does not log raw clerk id hash or svix id outside rpc_transport classifier logs', () => {
    const body = postHandlerBody(readRoute());
    const logCalls = body.match(/logSafe(?:Warn|Error)?\(\{[^}]+\}\)/g) ?? [];
    assert.ok(logCalls.length > 0, 'log calls missing');
    for (const call of logCalls) {
      assert.doesNotMatch(call, /clerkUserId/);
      if (!call.includes("stage: 'rpc_transport'")) {
        assert.doesNotMatch(call, /svixId/);
        assert.doesNotMatch(call, /svix_id:/);
      }
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
    assert.match(body, /transportObservation/);
    assert.match(body, /formatSafeFetchTransportObservationForLog/);
    assert.match(body, /classifyRpcTransportFailure/);
    assert.match(body, /formatSafeRpcTransportFailureForLog/);
    assert.doesNotMatch(body, /error\.message/);
    assert.doesNotMatch(body, /console\.error\([^)]*error/);
    const transportBlocks = body.split("stage: 'rpc_transport'");
    for (const block of transportBlocks.slice(1)) {
      assert.doesNotMatch(block.slice(0, 600), /clerkUserId/);
      assert.doesNotMatch(block.slice(0, 600), /p_clerk_user_id/);
      assert.doesNotMatch(block.slice(0, 600), /data\.id/);
    }
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

const SECRET_SAMPLES = {
  serviceRole:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service_role_secret_sample',
  bearer: 'Bearer sk_live_sample_token_value',
  clerkSignature: 'v1,sample_svix_signature_value_abcdef',
  pii: 'user@example.com',
};

function classifierOutputText(input: unknown, options?: Parameters<typeof classifyRpcTransportFailure>[1]): string {
  return JSON.stringify(classifyRpcTransportFailure(input, options));
}

describe('accountDeletionClerkWebhook — rpc transport classifier', () => {
  it('classifies PGRST202 as POSTGREST_STRUCTURED_ERROR', () => {
    const out = classifyRpcTransportFailure({
      name: 'PostgrestError',
      code: 'PGRST202',
      message: 'function not found in schema cache',
      status: 404,
    });
    assert.equal(out.message_class, 'POSTGREST_STRUCTURED_ERROR');
    assert.equal(out.postgrest_code, 'PGRST202');
    assert.equal(out.error_code, 'PGRST202');
    assert.equal(out.request_dispatched, true);
    assert.equal(out.response_received, true);
  });

  it('classifies ENOTFOUND as FETCH_DNS_ERROR', () => {
    const out = classifyRpcTransportFailure({ name: 'FetchError', code: 'ENOTFOUND' });
    assert.equal(out.message_class, 'FETCH_DNS_ERROR');
    assert.equal(out.cause_code, 'ENOTFOUND');
  });

  it('classifies ECONNREFUSED as FETCH_CONNECT_ERROR', () => {
    const out = classifyRpcTransportFailure({
      name: 'FetchError',
      cause: { code: 'ECONNREFUSED', errno: -61 },
    });
    assert.equal(out.message_class, 'FETCH_CONNECT_ERROR');
    assert.equal(out.cause_code, 'ECONNREFUSED');
    assert.equal(out.cause_errno, -61);
  });

  it('classifies ETIMEDOUT as FETCH_CONNECT_ERROR not FETCH_ABORTED', () => {
    const input = {
      name: 'FetchError',
      cause: { code: 'ETIMEDOUT', errno: -60 },
      message: 'connect ETIMEDOUT secret-host:443',
    };
    const out = classifyRpcTransportFailure(input);
    assert.equal(out.message_class, 'FETCH_CONNECT_ERROR');
    assert.equal(out.cause_code, 'ETIMEDOUT');
    assert.equal(out.cause_errno, -60);
    assert.equal(out.timeout_or_abort, null);
    const serialized = classifierOutputText(input);
    assert.doesNotMatch(serialized, /secret-host/);
    assert.doesNotMatch(serialized, /ETIMEDOUT secret/);
  });

  it('classifies UNABLE_TO_VERIFY_LEAF_SIGNATURE as FETCH_TLS_ERROR', () => {
    const out = classifyRpcTransportFailure({
      name: 'FetchError',
      cause: { code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' },
    });
    assert.equal(out.message_class, 'FETCH_TLS_ERROR');
    assert.equal(out.cause_code, 'UNABLE_TO_VERIFY_LEAF_SIGNATURE');
  });

  it('classifies AbortError as FETCH_ABORTED', () => {
    const out = classifyRpcTransportFailure({ name: 'AbortError', code: 'ABORT_ERR' });
    assert.equal(out.message_class, 'FETCH_ABORTED');
    assert.equal(out.timeout_or_abort, true);
  });

  it('classifies unknown input as UNKNOWN_TRANSPORT_ERROR without raw text', () => {
    const out = classifyRpcTransportFailure('upstream secret failure text');
    assert.equal(out.message_class, 'UNKNOWN_TRANSPORT_ERROR');
    const serialized = classifierOutputText('upstream secret failure text');
    assert.doesNotMatch(serialized, /secret failure/);
    assert.doesNotMatch(serialized, /REDACTED_UNCLASSIFIED/);
  });

  it('never emits secret substrings from hostile error payloads', () => {
    const hostile = {
      name: 'FetchError',
      code: 'SECRET_NOT_ALLOWLISTED',
      message: SECRET_SAMPLES.serviceRole,
      details: SECRET_SAMPLES.bearer,
      hint: SECRET_SAMPLES.clerkSignature,
      cause: {
        code: 'SECRET_NOT_ALLOWLISTED',
        message: SECRET_SAMPLES.pii,
      },
    };
    const out = classifyRpcTransportFailure(hostile);
    assert.equal(out.message_class, 'UNKNOWN_TRANSPORT_ERROR');
    const logPayload = formatSafeRpcTransportFailureForLog(out);
    const combined = JSON.stringify({ ...logPayload, stage: 'rpc_transport' });
    for (const sample of Object.values(SECRET_SAMPLES)) {
      assert.doesNotMatch(combined, new RegExp(sample.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  });

  it('does not throw for null, primitive, circular object, or hostile getter', () => {
    assert.doesNotThrow(() => classifyRpcTransportFailure(null));
    assert.doesNotThrow(() => classifyRpcTransportFailure(42));
    const circular: Record<string, unknown> = { name: 'FetchError', code: 'ECONNRESET' };
    circular.self = circular;
    assert.doesNotThrow(() => classifyRpcTransportFailure(circular));
    const hostileGetter = {
      get message() {
        throw new Error('hostile');
      },
      name: 'FetchError',
      code: 'ECONNRESET',
    };
    assert.doesNotThrow(() => classifyRpcTransportFailure(hostileGetter));
    assert.equal(classifyRpcTransportFailure(hostileGetter).message_class, 'FETCH_CONNECT_ERROR');
  });

  it('keeps RPC name and argument keys unchanged in route', () => {
    const body = postHandlerBody(readRoute());
    assert.match(body, /m55_account_deletion_process_v1/);
    assert.match(body, /p_svix_id:/);
    assert.match(body, /p_event_type:/);
    assert.match(body, /p_clerk_user_id:/);
    assert.match(body, /p_user_ref_hash:/);
  });

  it('does not introduce retry or replay constructs in route', () => {
    const body = routeSourceWithoutComments(readRoute());
    assert.doesNotMatch(body, /\bretry\b/i);
    assert.doesNotMatch(body, /\breplay\b/i);
  });

  it('passes RPC result status into classifier without statusText', () => {
    const body = postHandlerBody(readRoute());
    assert.match(body, /status: rpcStatus/);
    assert.match(body, /responseStatus: rpcResult\.status/);
    assert.doesNotMatch(body, /statusText/);
  });
});

describe('accountDeletionClerkWebhook — rpc transport response status context', () => {
  it('classifies empty-code error with responseStatus=500 as SUPABASE_AUTH_OR_API_ERROR', () => {
    const input = {
      message: 'TypeError: fetch failed',
      details: 'stack redacted',
      hint: '',
      code: '',
    };
    const out = classifyRpcTransportFailure(input, {
      requestDispatched: true,
      responseStatus: 500,
    });
    assert.equal(out.message_class, 'SUPABASE_AUTH_OR_API_ERROR');
    assert.equal(out.error_status, 500);
    assert.equal(out.response_received, true);
    const logPayload = formatSafeRpcTransportFailureForLog(out);
    const combined = JSON.stringify(logPayload);
    assert.doesNotMatch(combined, /TypeError/);
    assert.doesNotMatch(combined, /stack redacted/);
    assert.doesNotMatch(combined, /statusText/);
  });

  it('classifies responseStatus=401 as SUPABASE_AUTH_OR_API_ERROR', () => {
    const out = classifyRpcTransportFailure(
      { message: 'JWT invalid', code: '', details: '', hint: '' },
      { responseStatus: 401 },
    );
    assert.equal(out.message_class, 'SUPABASE_AUTH_OR_API_ERROR');
    assert.equal(out.error_status, 401);
  });

  it('classifies responseStatus=403 as SUPABASE_AUTH_OR_API_ERROR', () => {
    const out = classifyRpcTransportFailure(
      { message: 'Forbidden', code: '', details: '', hint: '' },
      { responseStatus: 403 },
    );
    assert.equal(out.message_class, 'SUPABASE_AUTH_OR_API_ERROR');
    assert.equal(out.error_status, 403);
  });

  it('treats responseStatus=0 as no HTTP response with UNKNOWN unless stronger cause', () => {
    const out = classifyRpcTransportFailure(
      { message: 'FetchError: failed', code: '', details: '', hint: '' },
      { responseStatus: 0 },
    );
    assert.equal(out.message_class, 'UNKNOWN_TRANSPORT_ERROR');
    assert.equal(out.error_status, null);
    assert.equal(out.response_received, false);
  });

  it('rejects numeric string responseStatus', () => {
    const out = classifyRpcTransportFailure(
      { message: 'upstream', code: '', details: '', hint: '' },
      { responseStatus: '500' },
    );
    assert.equal(out.error_status, null);
    assert.equal(out.message_class, 'UNKNOWN_TRANSPORT_ERROR');
  });

  for (const invalidStatus of [99, 600, 500.5, NaN, Infinity]) {
    it(`rejects invalid responseStatus=${String(invalidStatus)}`, () => {
      const out = classifyRpcTransportFailure(
        { message: 'upstream', code: '', details: '', hint: '' },
        { responseStatus: invalidStatus },
      );
      assert.equal(out.error_status, null);
    });
  }

  it('preserves PGRST202 precedence with responseStatus=404', () => {
    const out = classifyRpcTransportFailure(
      { code: 'PGRST202', message: 'function not found', details: '', hint: null },
      { responseStatus: 404 },
    );
    assert.equal(out.message_class, 'POSTGREST_STRUCTURED_ERROR');
    assert.equal(out.postgrest_code, 'PGRST202');
    assert.equal(out.error_status, 404);
  });

  it('preserves ENOTFOUND precedence with responseStatus=0 and response_received=false', () => {
    const out = classifyRpcTransportFailure(
      { name: 'FetchError', code: 'ENOTFOUND' },
      { responseStatus: 0 },
    );
    assert.equal(out.message_class, 'FETCH_DNS_ERROR');
    assert.equal(out.cause_code, 'ENOTFOUND');
    assert.equal(out.response_received, false);
  });

  it('does not classify HTTP 200 status alone as SUPABASE_AUTH_OR_API_ERROR', () => {
    const out = classifyRpcTransportFailure(
      { message: 'unexpected body', code: '', details: '', hint: '' },
      { responseStatus: 200 },
    );
    assert.equal(out.message_class, 'UNKNOWN_TRANSPORT_ERROR');
    assert.equal(out.error_status, 200);
  });

  it('does not throw for hostile responseStatus getter', () => {
    const hostileContext = {
      get responseStatus() {
        throw new Error('hostile status getter');
      },
    };
    assert.doesNotThrow(() =>
      classifyRpcTransportFailure(
        { name: 'FetchError', code: 'ECONNRESET' },
        hostileContext,
      ),
    );
    const out = classifyRpcTransportFailure(
      { name: 'FetchError', code: 'ECONNRESET' },
      hostileContext,
    );
    assert.equal(out.message_class, 'FETCH_CONNECT_ERROR');
    const serialized = JSON.stringify(formatSafeRpcTransportFailureForLog(out));
    assert.doesNotMatch(serialized, /hostile/);
  });

  it('never emits secret substrings from response status context fixtures', () => {
    const input = {
      message: SECRET_SAMPLES.bearer,
      details: SECRET_SAMPLES.serviceRole,
      hint: SECRET_SAMPLES.clerkSignature,
      code: '',
    };
    const out = classifyRpcTransportFailure(input, { responseStatus: 500 });
    const combined = JSON.stringify(formatSafeRpcTransportFailureForLog(out));
    for (const sample of Object.values(SECRET_SAMPLES)) {
      assert.doesNotMatch(combined, new RegExp(sample.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    assert.doesNotMatch(combined, /statusText/);
    assert.doesNotMatch(combined, /Authorization/);
  });
});

function fetchObservationText(input: unknown): string {
  return JSON.stringify(classifyFetchTransportRejection(input));
}

describe('accountDeletionClerkWebhook — fetch transport rejection classifier', () => {
  it('classifies cause.code=ENOTFOUND as FETCH_DNS_ERROR with response_received=false', () => {
    const out = classifyFetchTransportRejection({
      name: 'TypeError',
      cause: { code: 'ENOTFOUND', errno: -3008 },
    });
    assert.equal(out.transport_event, 'fetch_rejected');
    assert.equal(out.message_class, 'FETCH_DNS_ERROR');
    assert.equal(out.cause_code, 'ENOTFOUND');
    assert.equal(out.response_received, false);
    assert.equal(out.request_dispatched, true);
    assert.equal(out.runtime, 'nodejs');
  });

  it('classifies cause.code=EAI_AGAIN as FETCH_DNS_ERROR', () => {
    const out = classifyFetchTransportRejection({
      name: 'FetchError',
      cause: { code: 'EAI_AGAIN' },
    });
    assert.equal(out.message_class, 'FETCH_DNS_ERROR');
    assert.equal(out.cause_code, 'EAI_AGAIN');
  });

  it('classifies cause.code=ECONNREFUSED as FETCH_CONNECT_ERROR', () => {
    const out = classifyFetchTransportRejection({
      name: 'TypeError',
      cause: { code: 'ECONNREFUSED', errno: -61 },
    });
    assert.equal(out.message_class, 'FETCH_CONNECT_ERROR');
    assert.equal(out.cause_code, 'ECONNREFUSED');
    assert.equal(out.cause_errno, -61);
  });

  it('classifies cause.code=ETIMEDOUT as FETCH_CONNECT_ERROR with timeout_or_abort null', () => {
    const out = classifyFetchTransportRejection({
      name: 'FetchError',
      cause: { code: 'ETIMEDOUT', errno: -60 },
      message: 'connect ETIMEDOUT secret-host:443',
    });
    assert.equal(out.message_class, 'FETCH_CONNECT_ERROR');
    assert.equal(out.cause_code, 'ETIMEDOUT');
    assert.equal(out.timeout_or_abort, null);
    const serialized = fetchObservationText({
      name: 'FetchError',
      cause: { code: 'ETIMEDOUT', errno: -60 },
      message: 'connect ETIMEDOUT secret-host:443',
    });
    assert.doesNotMatch(serialized, /secret-host/);
  });

  it('classifies UNABLE_TO_VERIFY_LEAF_SIGNATURE as FETCH_TLS_ERROR', () => {
    const out = classifyFetchTransportRejection({
      name: 'FetchError',
      cause: { code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' },
    });
    assert.equal(out.message_class, 'FETCH_TLS_ERROR');
    assert.equal(out.cause_code, 'UNABLE_TO_VERIFY_LEAF_SIGNATURE');
  });

  it('classifies AbortError and ABORT_ERR as FETCH_ABORTED', () => {
    const byName = classifyFetchTransportRejection({ name: 'AbortError', code: 'ABORT_ERR' });
    assert.equal(byName.message_class, 'FETCH_ABORTED');
    assert.equal(byName.timeout_or_abort, true);
    const byCode = classifyFetchTransportRejection({ name: 'TypeError', code: 'ABORT_ERR' });
    assert.equal(byCode.message_class, 'FETCH_ABORTED');
    assert.equal(byCode.error_code, 'ABORT_ERR');
  });

  it('classifies unknown message-only error as UNKNOWN_TRANSPORT_ERROR without unsafe fields', () => {
    const out = classifyFetchTransportRejection({
      message: SECRET_SAMPLES.bearer,
      details: SECRET_SAMPLES.serviceRole,
    });
    assert.equal(out.message_class, 'UNKNOWN_TRANSPORT_ERROR');
    const logPayload = formatSafeFetchTransportObservationForLog(out);
    const combined = JSON.stringify(logPayload);
    assert.doesNotMatch(combined, /Bearer/);
    assert.doesNotMatch(combined, /service_role/);
    assert.doesNotMatch(combined, /"message":/);
    assert.doesNotMatch(combined, /"details":/);
  });

  it('does not throw for hostile getter, proxy, or circular fetch rejection input', () => {
    const circular: Record<string, unknown> = { name: 'FetchError', code: 'ECONNRESET' };
    circular.self = circular;
    assert.doesNotThrow(() => classifyFetchTransportRejection(circular));
    const hostileGetter = {
      get message() {
        throw new Error('hostile');
      },
      name: 'FetchError',
      cause: { code: 'ECONNRESET' },
    };
    assert.doesNotThrow(() => classifyFetchTransportRejection(hostileGetter));
    assert.equal(classifyFetchTransportRejection(hostileGetter).message_class, 'FETCH_CONNECT_ERROR');
  });

  it('never emits secret-shaped fixtures from fetch observation formatter', () => {
    const hostile = {
      name: 'FetchError',
      message: SECRET_SAMPLES.serviceRole,
      cause: {
        code: 'SECRET_NOT_ALLOWLISTED',
        message: SECRET_SAMPLES.pii,
      },
    };
    const out = classifyFetchTransportRejection(hostile);
    const combined = JSON.stringify(formatSafeFetchTransportObservationForLog(out));
    for (const sample of Object.values(SECRET_SAMPLES)) {
      assert.doesNotMatch(combined, new RegExp(sample.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    assert.doesNotMatch(combined, /Authorization/);
    assert.doesNotMatch(combined, /svix-signature/);
    assert.doesNotMatch(combined, /https:\/\//);
  });
});

describe('accountDeletionClerkWebhook — dedicated supabase client helper', () => {
  const priorUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const priorKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  function restoreEnv(): void {
    if (priorUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = priorUrl;
    }
    if (priorKey === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = priorKey;
    }
  }

  it('rethrows the exact same fetch rejection reference from observing fetch', async () => {
    const original = Object.assign(new TypeError('fetch failed'), {
      cause: { code: 'ECONNREFUSED', errno: -61 },
    });
    const prior = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw original;
    }) as typeof fetch;
    try {
      let caughtViaWrapper: unknown;
      const wrapper = createObservingFetch(() => undefined, () => undefined);
      try {
        await wrapper('https://example.invalid', { method: 'GET' });
      } catch (thrown) {
        caughtViaWrapper = thrown;
      }
      assert.equal(caughtViaWrapper, original);
    } finally {
      globalThis.fetch = prior;
    }
  });

  it('records only the first sanitized rejection observation', async () => {
    const observations: string[] = [];
    let rejectionCount = 0;
    const prior = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw Object.assign(new TypeError('fetch failed'), {
        cause: { code: rejectionCount === 0 ? 'ENOTFOUND' : 'ECONNREFUSED' },
      });
    }) as typeof fetch;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.invalid';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    try {
      const { transportObservation, fetchRejectionCount } =
        await withAccountDeletionSupabaseClientObservation(async (client) =>
          (client as any).rpc('m55_account_deletion_process_v1', {
            p_svix_id: 'msg_test',
            p_event_type: 'user.deleted',
            p_clerk_user_id: 'user_test',
            p_user_ref_hash: '0123456789abcdef',
          }),
        );
      if (transportObservation) {
        observations.push(transportObservation.message_class);
      }
      assert.equal(fetchRejectionCount, 1);
      assert.equal(transportObservation?.message_class, 'FETCH_DNS_ERROR');
      assert.equal(observations.length, 1);
    } finally {
      globalThis.fetch = prior;
      restoreEnv();
    }
  });

  it('returns no transport observation on successful fetch', async () => {
    const prior = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ ok: true, status: 'succeeded' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.invalid';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    try {
      const { transportObservation, fetchRejectionCount } =
        await withAccountDeletionSupabaseClientObservation(async (client) =>
          (client as any).rpc('m55_account_deletion_process_v1', {
            p_svix_id: 'msg_test',
            p_event_type: 'user.deleted',
            p_clerk_user_id: 'user_test',
            p_user_ref_hash: '0123456789abcdef',
          }),
        );
      assert.equal(transportObservation, null);
      assert.equal(fetchRejectionCount, 0);
    } finally {
      globalThis.fetch = prior;
      restoreEnv();
    }
  });

  it('keeps concurrent helper invocations isolated', async () => {
    const prior = globalThis.fetch;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.invalid';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    try {
      const captured: {
        dns: SafeFetchTransportObservation | null;
        connect: SafeFetchTransportObservation | null;
      } = { dns: null, connect: null };
      let dnsRejections = 0;
      let connectRejections = 0;

      globalThis.fetch = (async () => {
        throw Object.assign(new TypeError('fetch failed'), {
          cause: { code: 'ENOTFOUND' },
        });
      }) as typeof fetch;
      const dnsFetch = createObservingFetch(
        (observation) => {
          captured.dns = observation;
        },
        () => {
          dnsRejections += 1;
        },
      );
      globalThis.fetch = (async () => {
        throw Object.assign(new TypeError('fetch failed'), {
          cause: { code: 'ECONNREFUSED' },
        });
      }) as typeof fetch;
      const connectFetch = createObservingFetch(
        (observation) => {
          captured.connect = observation;
        },
        () => {
          connectRejections += 1;
        },
      );

      await Promise.all([
        dnsFetch('https://example.invalid').catch(() => undefined),
        connectFetch('https://example.invalid').catch(() => undefined),
      ]);

      assert.equal(captured.dns?.message_class, 'FETCH_DNS_ERROR');
      assert.equal(captured.connect?.message_class, 'FETCH_CONNECT_ERROR');
      assert.equal(dnsRejections, 1);
      assert.equal(connectRejections, 1);
    } finally {
      globalThis.fetch = prior;
      restoreEnv();
    }
  });

  it('does not retain stale observation after a later successful invocation', async () => {
    const prior = globalThis.fetch;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.invalid';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    try {
      globalThis.fetch = (async () => {
        throw Object.assign(new TypeError('fetch failed'), {
          cause: { code: 'ENOTFOUND' },
        });
      }) as typeof fetch;
      const failed = await withAccountDeletionSupabaseClientObservation(async (client) =>
        (client as any).rpc('m55_account_deletion_process_v1', {
          p_svix_id: 'msg_fail',
          p_event_type: 'user.deleted',
          p_clerk_user_id: 'user_fail',
          p_user_ref_hash: '0123456789abcdef',
        }),
      );
      assert.equal(failed.transportObservation?.message_class, 'FETCH_DNS_ERROR');

      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ ok: true, status: 'succeeded' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })) as typeof fetch;
      const succeeded = await withAccountDeletionSupabaseClientObservation(async (client) =>
        (client as any).rpc('m55_account_deletion_process_v1', {
          p_svix_id: 'msg_ok',
          p_event_type: 'user.deleted',
          p_clerk_user_id: 'user_ok',
          p_user_ref_hash: '0123456789abcdef',
        }),
      );
      assert.equal(succeeded.transportObservation, null);
      assert.equal(succeeded.fetchRejectionCount, 0);
    } finally {
      globalThis.fetch = prior;
      restoreEnv();
    }
  });

  it('does not log from fetch wrapper source', () => {
    const helperSrc = readFileSync(HELPER, 'utf8');
    assert.doesNotMatch(helperSrc, /console\.(info|warn|error|log)/);
    assert.doesNotMatch(helperSrc, /AsyncLocalStorage/);
    assert.doesNotMatch(helperSrc, /input\.headers|init\.headers|JSON\.stringify\(input/);
  });

  it('leaves lib/supabaseAdmin.ts unchanged and route off shared singleton', () => {
    const adminSrc = readFileSync(SUPABASE_ADMIN, 'utf8');
    assert.match(adminSrc, /let _admin/);
    assert.match(readRoute(), /withAccountDeletionSupabaseClientObservation/);
    assert.doesNotMatch(readRoute(), /getSupabaseAdmin/);
  });
});
