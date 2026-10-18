import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROUTE = join(process.cwd(), 'app/api/creator/application/route.ts');
const NOTIFIER = join(process.cwd(), 'lib/m55/creatorDistribution/applicationNotificationEmail.ts');

const SAMPLE_APP_ID = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
const OTHER_APP_ID = 'b2c3d4e5-f6a7-4890-b123-456789abcdef';
const SYNTH_TO = 'ops-notify@example.test';
const SYNTH_FROM = 'notifications@example.test';
const SYNTH_KEY = 're_synthetic_test_key_only';

type NotifierModule = typeof import('./applicationNotificationEmail.ts');

let notifier: NotifierModule;

before(async () => {
  notifier = await import('./applicationNotificationEmail.ts');
});

function enabledEnv(overrides: Record<string, string> = {}) {
  return {
    enabled: 'true',
    notifyTo: SYNTH_TO,
    notifyFrom: SYNTH_FROM,
    resendApiKey: SYNTH_KEY,
    ...overrides,
  };
}

describe('creator application notification — config fail-closed', () => {
  beforeEach(() => {
    notifier.resetCreatorApplicationNotifyDedupeForTests();
  });

  it('is disabled unless M55_CREATOR_NOTIFY_ENABLED is exactly true', async () => {
    const fetchCalls: unknown[] = [];
    const fetchImpl = async (...args: unknown[]) => {
      fetchCalls.push(args);
      return { ok: true };
    };

    assert.equal(
      await notifier.sendCreatorApplicationNotification(SAMPLE_APP_ID, {
        env: enabledEnv({ enabled: 'false' }),
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
      'disabled',
    );
    assert.equal(
      await notifier.sendCreatorApplicationNotification(SAMPLE_APP_ID, {
        env: enabledEnv({ enabled: '1' }),
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
      'disabled',
    );
    assert.equal(fetchCalls.length, 0);
  });

  it('is disabled when recipient, sender, or API key is missing or invalid', async () => {
    const fetchImpl = async () => ({ ok: true });
    assert.equal(
      await notifier.sendCreatorApplicationNotification(SAMPLE_APP_ID, {
        env: enabledEnv({ notifyTo: '' }),
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
      'disabled',
    );
    assert.equal(
      await notifier.sendCreatorApplicationNotification(SAMPLE_APP_ID, {
        env: enabledEnv({ notifyFrom: 'not-an-email' }),
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
      'disabled',
    );
    assert.equal(
      await notifier.sendCreatorApplicationNotification(SAMPLE_APP_ID, {
        env: enabledEnv({ resendApiKey: '' }),
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
      'disabled',
    );
  });

  it('skips non-UUID application ids', async () => {
    const fetchCalls: unknown[] = [];
    const fetchImpl = async (...args: unknown[]) => {
      fetchCalls.push(args);
      return { ok: true };
    };
    assert.equal(
      await notifier.sendCreatorApplicationNotification('caller-supplied-id', {
        env: enabledEnv(),
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
      'skipped',
    );
    assert.equal(fetchCalls.length, 0);
  });
});

describe('creator application notification — delivery contract', () => {
  beforeEach(() => {
    notifier.resetCreatorApplicationNotifyDedupeForTests();
  });

  it('uses fixed Resend URL, idempotency key, and privacy-safe payload', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;
    const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedInit = init;
      return { ok: true };
    };

    const result = await notifier.sendCreatorApplicationNotification(SAMPLE_APP_ID, {
      env: enabledEnv(),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    assert.equal(result, 'sent');
    assert.equal(capturedUrl, 'https://api.resend.com/emails');
    assert.equal(capturedInit?.method, 'POST');
    const headers = capturedInit?.headers as Record<string, string>;
    assert.equal(headers.Authorization, `Bearer ${SYNTH_KEY}`);
    assert.equal(headers['Idempotency-Key'], notifier.creatorApplicationIdempotencyKey(SAMPLE_APP_ID));
    const body = JSON.parse(String(capturedInit?.body));
    assert.deepEqual(body, notifier.buildCreatorApplicationResendPayload(SYNTH_FROM, SYNTH_TO));
    assert.equal(body.subject, notifier.CREATOR_APPLICATION_NOTIFY_SUBJECT);
    assert.equal(body.text, notifier.CREATOR_APPLICATION_NOTIFY_BODY);
    assert.doesNotMatch(body.text, new RegExp(SAMPLE_APP_ID, 'i'));
    assert.doesNotMatch(body.text, /@/);
    assert.match(body.text, /https:\/\/m-55\.jp\/internal\/creator-review/);
  });

  it('returns failed on non-success HTTP without throwing', async () => {
    const fetchImpl = async () => ({ ok: false, status: 502 });
    assert.equal(
      await notifier.sendCreatorApplicationNotification(SAMPLE_APP_ID, {
        env: enabledEnv(),
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
      'failed',
    );
  });

  it('returns failed on fetch rejection without throwing', async () => {
    const fetchImpl = async () => {
      throw new Error('network_down');
    };
    const result = await notifier.sendCreatorApplicationNotification(SAMPLE_APP_ID, {
      env: enabledEnv(),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    assert.equal(result, 'failed');
  });

  it('allows a later attempt after a failed send', async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      if (calls === 1) return { ok: false, status: 502 };
      return { ok: true };
    };
    assert.equal(
      await notifier.sendCreatorApplicationNotification(SAMPLE_APP_ID, {
        env: enabledEnv(),
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
      'failed',
    );
    assert.equal(
      await notifier.sendCreatorApplicationNotification(SAMPLE_APP_ID, {
        env: enabledEnv(),
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
      'sent',
    );
    assert.equal(calls, 2);
  });

  it('skips duplicate sends within success TTL after a successful send', async () => {
    let calls = 0;
    const now = 1_700_000_000_000;
    const fetchImpl = async () => {
      calls += 1;
      return { ok: true };
    };
    const deps = {
      env: enabledEnv(),
      fetchImpl: fetchImpl as unknown as typeof fetch,
      nowMs: () => now,
    };
    assert.equal(await notifier.sendCreatorApplicationNotification(SAMPLE_APP_ID, deps), 'sent');
    assert.equal(await notifier.sendCreatorApplicationNotification(SAMPLE_APP_ID, deps), 'skipped');
    assert.equal(calls, 1);
  });

  it('allows a new attempt after success TTL expires', async () => {
    let calls = 0;
    let now = 1_700_000_000_000;
    const fetchImpl = async () => {
      calls += 1;
      return { ok: true };
    };
    const deps = {
      env: enabledEnv(),
      fetchImpl: fetchImpl as unknown as typeof fetch,
      nowMs: () => now,
    };
    assert.equal(await notifier.sendCreatorApplicationNotification(SAMPLE_APP_ID, deps), 'sent');
    now += notifier.CREATOR_APPLICATION_NOTIFY_SUCCESS_CACHE_TTL_MS + 1;
    assert.equal(await notifier.sendCreatorApplicationNotification(SAMPLE_APP_ID, deps), 'sent');
    assert.equal(calls, 2);
  });

  it('coalesces concurrent in-flight sends for the same application id', async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 25));
      return { ok: true };
    };
    const deps = {
      env: enabledEnv(),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    };
    const [a, b] = await Promise.all([
      notifier.sendCreatorApplicationNotification(SAMPLE_APP_ID, deps),
      notifier.sendCreatorApplicationNotification(SAMPLE_APP_ID, deps),
    ]);
    assert.equal(a, 'sent');
    assert.equal(b, 'sent');
    assert.equal(calls, 1);
  });

  it('evicts oldest success-cache entries when max size is exceeded', async () => {
    notifier.setCreatorApplicationNotifySuccessCacheMaxForTests(1);
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return { ok: true };
    };
    const deps = {
      env: enabledEnv(),
      fetchImpl: fetchImpl as unknown as typeof fetch,
      nowMs: () => 1_700_000_000_000,
    };
    assert.equal(await notifier.sendCreatorApplicationNotification(SAMPLE_APP_ID, deps), 'sent');
    assert.equal(await notifier.sendCreatorApplicationNotification(OTHER_APP_ID, deps), 'sent');
    assert.equal(await notifier.sendCreatorApplicationNotification(SAMPLE_APP_ID, deps), 'sent');
    assert.equal(calls, 3);
  });

  it('keeps idempotency key stable for the same application id', () => {
    const a = notifier.creatorApplicationIdempotencyKey(SAMPLE_APP_ID);
    const b = notifier.creatorApplicationIdempotencyKey(SAMPLE_APP_ID);
    assert.equal(a, b);
    assert.match(a, /^m55-creator-new-application\//);
  });
});

describe('creator application notification — after() registration', () => {
  beforeEach(() => {
    notifier.resetCreatorApplicationNotifyDedupeForTests();
  });

  it('registers a callback whose returned promise stays pending until fake fetch resolves', async () => {
    let fetchResolved = false;
    const fetchImpl = async () => {
      await new Promise((r) => setTimeout(r, 20));
      fetchResolved = true;
      return { ok: true };
    };
    let captured: (() => Promise<void>) | undefined;
    const fakeAfter = (fn: () => void | Promise<void>) => {
      captured = async () => {
        await fn();
      };
    };
    const prevFetch = globalThis.fetch;
    globalThis.fetch = fetchImpl as unknown as typeof fetch;
    try {
      process.env.M55_CREATOR_NOTIFY_ENABLED = 'true';
      process.env.M55_CREATOR_NOTIFY_TO = SYNTH_TO;
      process.env.M55_CREATOR_NOTIFY_FROM = SYNTH_FROM;
      process.env.RESEND_API_KEY = SYNTH_KEY;
      notifier.registerCreatorApplicationNotificationAfterSuccess(SAMPLE_APP_ID, fakeAfter);
      assert.ok(captured);
      const pending = captured!();
      assert.equal(fetchResolved, false);
      await pending;
    } finally {
      globalThis.fetch = prevFetch;
      delete process.env.M55_CREATOR_NOTIFY_ENABLED;
      delete process.env.M55_CREATOR_NOTIFY_TO;
      delete process.env.M55_CREATOR_NOTIFY_FROM;
      delete process.env.RESEND_API_KEY;
    }
    assert.equal(fetchResolved, true);
  });

  it('does not throw when after registration fails', () => {
    const throwingAfter = () => {
      throw new Error('after_unavailable');
    };
    assert.doesNotThrow(() => {
      notifier.registerCreatorApplicationNotificationAfterSuccess(SAMPLE_APP_ID, throwingAfter);
    });
  });
});

describe('creator application notification — route wiring (source-only)', () => {
  const routeSrc = readFileSync(ROUTE, 'utf8');
  const postHandler = routeSrc.slice(routeSrc.indexOf('export async function POST'));
  const notifierSrc = readFileSync(NOTIFIER, 'utf8');

  it('registers notification only after submitCreatorApplication success path', () => {
    const successBlock = postHandler.slice(postHandler.indexOf('let id: string;'));
    assert.match(successBlock, /registerCreatorApplicationNotificationAfterSuccess\(id, after\)/);
    const reacceptBlock = postHandler.slice(0, postHandler.indexOf('const parsed = applicationInput'));
    assert.doesNotMatch(reacceptBlock, /registerCreatorApplicationNotificationAfterSuccess\(id, after\)/);
  });

  it('separates RPC submission catch from notification registration catch', () => {
    const submitCatch = postHandler.indexOf("return NextResponse.json({ error: 'APPLICATION_NOT_ACCEPTED' }");
    const notifyTry = postHandler.indexOf('registerCreatorApplicationNotificationAfterSuccess(id, after)');
    assert.ok(submitCatch > 0 && notifyTry > submitCatch);
    assert.match(routeSrc, /try \{\s*id = await submitCreatorApplication/);
    assert.match(routeSrc, /try \{\s*registerCreatorApplicationNotificationAfterSuccess/);
  });

  it('imports after synchronously in the route handler module', () => {
    assert.match(routeSrc, /import \{ after, NextResponse \} from 'next\/server'/);
    assert.doesNotMatch(notifierSrc, /import\('next\/server'\)/);
  });

  it('does not hardcode recipient or secrets in checked-in source', () => {
    assert.doesNotMatch(notifierSrc, /lexsia228@gmail\.com/);
    assert.doesNotMatch(notifierSrc, /re_[a-zA-Z0-9]{10,}/);
    assert.match(notifierSrc, /M55_CREATOR_NOTIFY_TO/);
    assert.match(notifierSrc, /M55_CREATOR_NOTIFY_FROM/);
    assert.match(notifierSrc, /RESEND_API_KEY/);
    assert.match(notifierSrc, /M55_CREATOR_NOTIFY_ENABLED/);
  });
});
