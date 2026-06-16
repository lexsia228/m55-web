import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  runSupabaseRuntimeDnsProbe,
  type FetchFn,
  type LookupFn,
  type SupabaseRuntimeDnsProbeResult,
} from './supabaseRuntimeDnsProbe.ts';

const ROUTE = join(process.cwd(), 'app/api/diagnostics/supabase-dns-probe/route.ts');
const HELPER = join(process.cwd(), 'lib/m55/supabaseRuntimeDnsProbe.ts');

const CANONICAL_ENV = 'https://sbogwyzldjxxouhqtpnq.supabase.co';
const MISMATCH_ENV = 'https://jonlynrbfveaprncyrmv.supabase.co';

const FORBIDDEN_KEYS = [
  'url',
  'origin',
  'hostname',
  'host',
  'address',
  'addresses',
  'ip',
  'project_ref',
  'env_value',
  'headers',
  'body',
  'message',
  'stack',
  'details',
  'hint',
  'statusText',
  'authorization',
  'apikey',
  'token',
  'subject',
  'svix',
] as const;

const SECRET_FIXTURES = [
  `synthetic_payment_secret_${'x'.repeat(48)}`,
  `synthetic_auth_token_${'y'.repeat(64)}`,
  `synthetic_header_value_${'z'.repeat(32)}`,
  'apikey=supersecret',
  'user@example.com',
  'svix-signature=abc123',
] as const;

function assertNeverCalled(fn: LookupFn | FetchFn, label: string): LookupFn & FetchFn {
  const wrapped = (async () => {
    throw new Error(`${label}_SHOULD_NOT_BE_CALLED`);
  }) as LookupFn & FetchFn;
  return wrapped;
}

type BodyAccessTrap = {
  bodyGetterAccessCount: number;
  bodyMethodAccessCount: number;
  response: Response;
};

function createBodyAccessTrapResponse(status: number): BodyAccessTrap {
  const counts = { bodyGetterAccessCount: 0, bodyMethodAccessCount: 0 };
  const recordMethod = () => {
    counts.bodyMethodAccessCount += 1;
    throw new Error('BODY_METHOD_ACCESS_FORBIDDEN');
  };
  const response = {
    status,
    get body() {
      counts.bodyGetterAccessCount += 1;
      throw new Error('BODY_GETTER_ACCESS_FORBIDDEN');
    },
    text: recordMethod,
    json: recordMethod,
    arrayBuffer: recordMethod,
    blob: recordMethod,
    formData: recordMethod,
  } as unknown as Response;
  return {
    get bodyGetterAccessCount() {
      return counts.bodyGetterAccessCount;
    },
    get bodyMethodAccessCount() {
      return counts.bodyMethodAccessCount;
    },
    response,
  };
}

type HeadersAccessTrap = {
  headersGetterAccessCount: number;
  headersMethodAccessCount: number;
  response: Response;
};

function createHeadersAccessTrapResponse(status: number): HeadersAccessTrap {
  const counts = { headersGetterAccessCount: 0, headersMethodAccessCount: 0 };
  const hostileHeaders = {
    get() {
      counts.headersGetterAccessCount += 1;
      throw new Error('HEADERS_GETTER_ACCESS_FORBIDDEN');
    },
    getSetCookie() {
      counts.headersMethodAccessCount += 1;
      throw new Error('HEADERS_METHOD_ACCESS_FORBIDDEN');
    },
    forEach() {
      counts.headersMethodAccessCount += 1;
      throw new Error('HEADERS_METHOD_ACCESS_FORBIDDEN');
    },
    entries() {
      counts.headersMethodAccessCount += 1;
      throw new Error('HEADERS_METHOD_ACCESS_FORBIDDEN');
    },
    keys() {
      counts.headersMethodAccessCount += 1;
      throw new Error('HEADERS_METHOD_ACCESS_FORBIDDEN');
    },
    values() {
      counts.headersMethodAccessCount += 1;
      throw new Error('HEADERS_METHOD_ACCESS_FORBIDDEN');
    },
    has() {
      counts.headersMethodAccessCount += 1;
      throw new Error('HEADERS_METHOD_ACCESS_FORBIDDEN');
    },
    get append() {
      counts.headersMethodAccessCount += 1;
      throw new Error('HEADERS_METHOD_ACCESS_FORBIDDEN');
    },
  };
  const response = {
    status,
    get headers() {
      counts.headersGetterAccessCount += 1;
      return hostileHeaders as unknown as Headers;
    },
  } as unknown as Response;
  return {
    get headersGetterAccessCount() {
      return counts.headersGetterAccessCount;
    },
    get headersMethodAccessCount() {
      return counts.headersMethodAccessCount;
    },
    response,
  };
}

function collectKeys(value: unknown, keys: Set<string> = new Set(), depth = 0): Set<string> {
  if (depth > 8 || value === null || typeof value !== 'object') {
    return keys;
  }
  for (const key of Object.keys(value as Record<string, unknown>)) {
    keys.add(key);
    collectKeys((value as Record<string, unknown>)[key], keys, depth + 1);
  }
  return keys;
}

function assertSafeResult(result: SupabaseRuntimeDnsProbeResult): void {
  const serialized = JSON.stringify(result);
  for (const key of FORBIDDEN_KEYS) {
    assert.equal(Object.prototype.hasOwnProperty.call(result, key), false, `forbidden key ${key}`);
  }
  for (const fixture of SECRET_FIXTURES) {
    assert.doesNotMatch(serialized, new RegExp(fixture.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.doesNotMatch(serialized, /sbogwyzldjxxouhqtpnq/);
  assert.doesNotMatch(serialized, /https:\/\//);
  assert.equal(result.response_body_read, false);
  assert.equal(result.secret_material_used, false);
  assert.equal(result.diagnostic, 'supabase_runtime_dns_probe_v1');
  assert.equal(result.runtime, 'nodejs');
}

function assertExactSchema(result: SupabaseRuntimeDnsProbeResult): void {
  const keys = [...collectKeys(result)].sort();
  assert.deepEqual(keys, [
    'branch_guard_ok',
    'canonical_origin_match',
    'diagnostic',
    'dns_error_code',
    'dns_error_errno',
    'dns_error_name',
    'dns_lookup_attempted',
    'dns_lookup_ok',
    'dns_result_count',
    'env_parse_ok',
    'env_present',
    'fetch_cause_code',
    'fetch_cause_errno',
    'fetch_cause_name',
    'fetch_error_code',
    'fetch_error_errno',
    'fetch_error_name',
    'fetch_message_class',
    'https_probe_attempted',
    'https_response_received',
    'https_status_class',
    'https_status_code',
    'preview_guard_ok',
    'response_body_read',
    'runtime',
    'secret_material_used',
    'timeout_or_abort',
  ]);
}

describe('supabaseRuntimeDnsProbe — guards', () => {
  it('1. preview guard false skips lookup and fetch', async () => {
    const lookupFn = assertNeverCalled(assertNeverCalled as unknown as LookupFn, 'lookup');
    const fetchFn = assertNeverCalled(lookupFn as unknown as FetchFn, 'fetch');
    const result = await runSupabaseRuntimeDnsProbe(
      { envValue: CANONICAL_ENV, isPreview: false, branchMatches: true },
      { lookupFn, fetchFn },
    );
    assert.equal(result.preview_guard_ok, false);
    assert.equal(result.branch_guard_ok, true);
    assert.equal(result.dns_lookup_attempted, false);
    assert.equal(result.https_probe_attempted, false);
    assertSafeResult(result);
  });

  it('2. branch guard false skips lookup and fetch', async () => {
    const lookupFn = assertNeverCalled(assertNeverCalled as unknown as LookupFn, 'lookup');
    const fetchFn = assertNeverCalled(lookupFn as unknown as FetchFn, 'fetch');
    const result = await runSupabaseRuntimeDnsProbe(
      { envValue: CANONICAL_ENV, isPreview: true, branchMatches: false },
      { lookupFn, fetchFn },
    );
    assert.equal(result.preview_guard_ok, true);
    assert.equal(result.branch_guard_ok, false);
    assert.equal(result.dns_lookup_attempted, false);
    assert.equal(result.https_probe_attempted, false);
    assertSafeResult(result);
  });
});

describe('supabaseRuntimeDnsProbe — env handling', () => {
  it('3. env missing skips lookup and fetch', async () => {
    const lookupFn = assertNeverCalled(assertNeverCalled as unknown as LookupFn, 'lookup');
    const fetchFn = assertNeverCalled(lookupFn as unknown as FetchFn, 'fetch');
    const result = await runSupabaseRuntimeDnsProbe(
      { envValue: undefined, isPreview: true, branchMatches: true },
      { lookupFn, fetchFn },
    );
    assert.equal(result.env_present, false);
    assert.equal(result.dns_lookup_attempted, false);
    assertSafeResult(result);
  });

  it('4. malformed env skips lookup and fetch', async () => {
    const lookupFn = assertNeverCalled(assertNeverCalled as unknown as LookupFn, 'lookup');
    const fetchFn = assertNeverCalled(lookupFn as unknown as FetchFn, 'fetch');
    const result = await runSupabaseRuntimeDnsProbe(
      { envValue: 'not-a-valid-url', isPreview: true, branchMatches: true },
      { lookupFn, fetchFn },
    );
    assert.equal(result.env_present, true);
    assert.equal(result.env_parse_ok, false);
    assert.equal(result.dns_lookup_attempted, false);
    assertSafeResult(result);
  });

  it('5. canonical mismatch skips lookup and fetch', async () => {
    const lookupFn = assertNeverCalled(assertNeverCalled as unknown as LookupFn, 'lookup');
    const fetchFn = assertNeverCalled(lookupFn as unknown as FetchFn, 'fetch');
    const result = await runSupabaseRuntimeDnsProbe(
      { envValue: MISMATCH_ENV, isPreview: true, branchMatches: true },
      { lookupFn, fetchFn },
    );
    assert.equal(result.canonical_origin_match, false);
    assert.equal(result.dns_lookup_attempted, false);
    assertSafeResult(result);
  });

  it('6. canonical exact match allows internal progression without URL output', async () => {
    let lookupCalled = false;
    const lookupFn: LookupFn = async () => {
      lookupCalled = true;
      return [{ address: '127.0.0.1', family: 4 }];
    };
    const fetchFn: FetchFn = async () =>
      new Response(null, { status: 401, statusText: 'Unauthorized' });
    const result = await runSupabaseRuntimeDnsProbe(
      { envValue: CANONICAL_ENV, isPreview: true, branchMatches: true },
      { lookupFn, fetchFn },
    );
    assert.equal(result.canonical_origin_match, true);
    assert.equal(lookupCalled, true);
    assertSafeResult(result);
  });
});

describe('supabaseRuntimeDnsProbe — DNS lookup', () => {
  it('7. DNS success attempts HTTPS and omits address values', async () => {
    const lookupFn: LookupFn = async () => [
      { address: '203.0.113.10', family: 4 },
      { address: '2001:db8::1', family: 6 },
    ];
    const fetchFn: FetchFn = async () => new Response(null, { status: 401 });
    const result = await runSupabaseRuntimeDnsProbe(
      { envValue: CANONICAL_ENV, isPreview: true, branchMatches: true },
      { lookupFn, fetchFn },
    );
    assert.equal(result.dns_lookup_ok, true);
    assert.equal(result.dns_result_count, 2);
    assert.equal(result.https_probe_attempted, true);
    assertSafeResult(result);
  });

  it('8. DNS ENOTFOUND does not attempt HTTPS and redacts raw message', async () => {
    const lookupFn: LookupFn = async () => {
      throw Object.assign(new Error('lookup failed'), { code: 'ENOTFOUND', errno: -3008 });
    };
    const fetchFn = assertNeverCalled(assertNeverCalled as unknown as FetchFn, 'fetch');
    const result = await runSupabaseRuntimeDnsProbe(
      { envValue: CANONICAL_ENV, isPreview: true, branchMatches: true },
      { lookupFn, fetchFn },
    );
    assert.equal(result.dns_lookup_ok, false);
    assert.equal(result.dns_error_code, 'ENOTFOUND');
    assert.equal(result.dns_error_errno, -3008);
    assert.equal(result.https_probe_attempted, false);
    assertSafeResult(result);
  });

  it('9. DNS EAI_AGAIN is classified exactly', async () => {
    const lookupFn: LookupFn = async () => {
      throw Object.assign(new Error('temporary failure'), { code: 'EAI_AGAIN', errno: -3001 });
    };
    const fetchFn = assertNeverCalled(assertNeverCalled as unknown as FetchFn, 'fetch');
    const result = await runSupabaseRuntimeDnsProbe(
      { envValue: CANONICAL_ENV, isPreview: true, branchMatches: true },
      { lookupFn, fetchFn },
    );
    assert.equal(result.dns_error_code, 'EAI_AGAIN');
    assert.equal(result.https_probe_attempted, false);
    assertSafeResult(result);
  });

  it('10. unknown DNS error is redacted and never throws', async () => {
    const lookupFn: LookupFn = async () => {
      throw Object.assign(new Error('mystery dns failure'), {
        code: 'EUNKNOWN_DNS',
        errno: 99999,
      });
    };
    const fetchFn = assertNeverCalled(assertNeverCalled as unknown as FetchFn, 'fetch');
    const result = await runSupabaseRuntimeDnsProbe(
      { envValue: CANONICAL_ENV, isPreview: true, branchMatches: true },
      { lookupFn, fetchFn },
    );
    assert.equal(result.dns_error_code, null);
    assert.equal(result.dns_error_errno, null);
    assert.equal(result.https_probe_attempted, false);
    assertSafeResult(result);
  });

  it('11. hostile DNS error getter never throws and does not leak', async () => {
    const lookupFn: LookupFn = async () => {
      throw new Proxy(Object.assign(new Error('hostile'), { code: 'ENOTFOUND' }), {
        get(target, prop, receiver) {
          if (prop === 'stack' || prop === 'message') {
            throw new Error('getter_failed');
          }
          return Reflect.get(target, prop, receiver);
        },
      });
    };
    const fetchFn = assertNeverCalled(assertNeverCalled as unknown as FetchFn, 'fetch');
    const result = await runSupabaseRuntimeDnsProbe(
      { envValue: CANONICAL_ENV, isPreview: true, branchMatches: true },
      { lookupFn, fetchFn },
    );
    assert.equal(result.dns_lookup_ok, false);
    assertSafeResult(result);
  });
});

describe('supabaseRuntimeDnsProbe — HTTPS reachability', () => {
  const successLookup: LookupFn = async () => [{ address: '203.0.113.10', family: 4 }];

  it('12. HTTPS 401 is reachable with CLIENT_ERROR and body unread', async () => {
    const fetchFn: FetchFn = async () => new Response(null, { status: 401 });
    const result = await runSupabaseRuntimeDnsProbe(
      { envValue: CANONICAL_ENV, isPreview: true, branchMatches: true },
      { lookupFn: successLookup, fetchFn },
    );
    assert.equal(result.https_response_received, true);
    assert.equal(result.https_status_class, 'CLIENT_ERROR');
    assert.equal(result.https_status_code, 401);
    assertSafeResult(result);
  });

  it('13. HTTPS 404 is CLIENT_ERROR', async () => {
    const fetchFn: FetchFn = async () => new Response(null, { status: 404 });
    const result = await runSupabaseRuntimeDnsProbe(
      { envValue: CANONICAL_ENV, isPreview: true, branchMatches: true },
      { lookupFn: successLookup, fetchFn },
    );
    assert.equal(result.https_status_class, 'CLIENT_ERROR');
    assert.equal(result.https_status_code, 404);
    assertSafeResult(result);
  });

  it('14. HTTPS 500 is SERVER_ERROR', async () => {
    const fetchFn: FetchFn = async () => new Response(null, { status: 500 });
    const result = await runSupabaseRuntimeDnsProbe(
      { envValue: CANONICAL_ENV, isPreview: true, branchMatches: true },
      { lookupFn: successLookup, fetchFn },
    );
    assert.equal(result.https_status_class, 'SERVER_ERROR');
    assert.equal(result.https_status_code, 500);
    assertSafeResult(result);
  });

  it('15. redirect 302 is REDIRECTION with manual redirect and no second fetch', async () => {
    let fetchCount = 0;
    const fetchFn: FetchFn = async () => {
      fetchCount += 1;
      return new Response(null, { status: 302, headers: { Location: 'https://elsewhere.invalid/' } });
    };
    const result = await runSupabaseRuntimeDnsProbe(
      { envValue: CANONICAL_ENV, isPreview: true, branchMatches: true },
      { lookupFn: successLookup, fetchFn },
    );
    assert.equal(fetchCount, 1);
    assert.equal(result.https_status_class, 'REDIRECTION');
    assert.equal(result.https_status_code, 302);
    assertSafeResult(result);
  });

  it('16. fetch ENOTFOUND maps to FETCH_DNS_ERROR', async () => {
    const fetchFn: FetchFn = async () => {
      throw Object.assign(new TypeError('fetch failed'), {
        cause: { code: 'ENOTFOUND', errno: -3008 },
      });
    };
    const result = await runSupabaseRuntimeDnsProbe(
      { envValue: CANONICAL_ENV, isPreview: true, branchMatches: true },
      { lookupFn: successLookup, fetchFn },
    );
    assert.equal(result.https_response_received, false);
    assert.equal(result.fetch_message_class, 'FETCH_DNS_ERROR');
    assert.equal(result.fetch_cause_code, 'ENOTFOUND');
    assertSafeResult(result);
  });

  it('17. fetch connect error maps to FETCH_CONNECT_ERROR', async () => {
    const fetchFn: FetchFn = async () => {
      throw Object.assign(new TypeError('fetch failed'), {
        cause: { code: 'ECONNREFUSED', errno: -61 },
      });
    };
    const result = await runSupabaseRuntimeDnsProbe(
      { envValue: CANONICAL_ENV, isPreview: true, branchMatches: true },
      { lookupFn: successLookup, fetchFn },
    );
    assert.equal(result.fetch_message_class, 'FETCH_CONNECT_ERROR');
    assert.equal(result.fetch_cause_code, 'ECONNREFUSED');
    assertSafeResult(result);
  });

  it('18. fetch timeout/AbortError sets timeout_or_abort=true', async () => {
    const fetchFn: FetchFn = async () => {
      throw Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' });
    };
    const result = await runSupabaseRuntimeDnsProbe(
      { envValue: CANONICAL_ENV, isPreview: true, branchMatches: true },
      { lookupFn: successLookup, fetchFn, fetchTimeoutMs: 5 },
    );
    assert.equal(result.fetch_message_class, 'FETCH_ABORTED');
    assert.equal(result.timeout_or_abort, true);
    assertSafeResult(result);
  });

  it('25. does not read response body on HTTPS reachable probe path', async () => {
    const bodyTrap = createBodyAccessTrapResponse(401);
    const fetchFn: FetchFn = async () => bodyTrap.response;
    const result = await runSupabaseRuntimeDnsProbe(
      { envValue: CANONICAL_ENV, isPreview: true, branchMatches: true },
      { lookupFn: successLookup, fetchFn },
    );
    assert.equal(bodyTrap.bodyGetterAccessCount, 0);
    assert.equal(bodyTrap.bodyMethodAccessCount, 0);
    assert.equal(result.https_response_received, true);
    assert.equal(result.https_status_class, 'CLIENT_ERROR');
    assert.equal(result.https_status_code, 401);
    assert.equal(result.response_body_read, false);
    assertSafeResult(result);
  });

  it('26. does not read response headers on HTTPS reachable probe path', async () => {
    const headersTrap = createHeadersAccessTrapResponse(404);
    const fetchFn: FetchFn = async () => headersTrap.response;
    const result = await runSupabaseRuntimeDnsProbe(
      { envValue: CANONICAL_ENV, isPreview: true, branchMatches: true },
      { lookupFn: successLookup, fetchFn },
    );
    assert.equal(headersTrap.headersGetterAccessCount, 0);
    assert.equal(headersTrap.headersMethodAccessCount, 0);
    assert.equal(result.https_response_received, true);
    assert.equal(result.https_status_class, 'CLIENT_ERROR');
    assert.equal(result.https_status_code, 404);
    assert.equal(result.response_body_read, false);
    assertSafeResult(result);
  });
});

describe('supabaseRuntimeDnsProbe — schema and redaction', () => {
  it('19. successful completed probe uses exact fixed schema', async () => {
    const lookupFn: LookupFn = async () => [{ address: '203.0.113.10', family: 4 }];
    const fetchFn: FetchFn = async () => new Response(null, { status: 401 });
    const result = await runSupabaseRuntimeDnsProbe(
      { envValue: CANONICAL_ENV, isPreview: true, branchMatches: true },
      { lookupFn, fetchFn },
    );
    assertExactSchema(result);
    assertSafeResult(result);
  });

  it('20. forbidden key scan finds none in serialized output', async () => {
    const lookupFn: LookupFn = async () => {
      throw Object.assign(new Error('lookup failed'), { code: 'ENOTFOUND', errno: -3008 });
    };
    const fetchFn = assertNeverCalled(assertNeverCalled as unknown as FetchFn, 'fetch');
    const result = await runSupabaseRuntimeDnsProbe(
      { envValue: CANONICAL_ENV, isPreview: true, branchMatches: true },
      { lookupFn, fetchFn },
    );
    const keys = collectKeys(result);
    for (const forbidden of FORBIDDEN_KEYS) {
      assert.equal(keys.has(forbidden), false, forbidden);
    }
    assertSafeResult(result);
  });

  it('21. secret-shaped fixtures are absent from output', async () => {
    const lookupFn: LookupFn = async () => [{ address: '203.0.113.10', family: 4 }];
    const fetchFn: FetchFn = async () => new Response(null, { status: 401 });
    const poisonedEnv = `${CANONICAL_ENV}?apikey=${encodeURIComponent(SECRET_FIXTURES[3])}`;
    const result = await runSupabaseRuntimeDnsProbe(
      { envValue: poisonedEnv, isPreview: true, branchMatches: true },
      { lookupFn, fetchFn },
    );
    assertSafeResult(result);
  });
});

describe('supabaseRuntimeDnsProbe — route source contract', () => {
  it('22. route source contract is GET-only nodejs force-dynamic without Supabase client or logging', () => {
    const routeSrc = readFileSync(ROUTE, 'utf8');
    const helperSrc = readFileSync(HELPER, 'utf8');
    assert.match(routeSrc, /export const runtime = 'nodejs'/);
    assert.match(routeSrc, /export const dynamic = 'force-dynamic'/);
    assert.match(routeSrc, /export async function GET\(/);
    assert.doesNotMatch(routeSrc, /export async function POST/);
    assert.doesNotMatch(routeSrc, /createClient/);
    assert.doesNotMatch(routeSrc, /m55_account_deletion_process_v1/);
    assert.doesNotMatch(routeSrc, /console\./);
    assert.doesNotMatch(helperSrc, /console\./);
    assert.match(routeSrc, /VERCEL_ENV === 'preview'/);
    assert.match(routeSrc, /VERCEL_GIT_COMMIT_REF === APPROVED_BRANCH/);
    assert.match(routeSrc, /status: 404/);
    assert.match(routeSrc, /status: 200/);
    assert.doesNotMatch(routeSrc, /req\.|NextRequest|searchParams|cookies\(/);
  });

  it('23. completed probe route policy returns 200 JSON', () => {
    const routeSrc = readFileSync(ROUTE, 'utf8');
    assert.match(routeSrc, /return NextResponse\.json\(result/);
    assert.match(routeSrc, /status: 200/);
  });

  it('24. guard failure route policy returns 404', () => {
    const routeSrc = readFileSync(ROUTE, 'utf8');
    assert.match(routeSrc, /NOT_FOUND_BODY/);
    assert.match(routeSrc, /status: 404/);
  });
});
