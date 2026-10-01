import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { deriveAttributionBuyerSubjectLookupDigestV1 } from './r5TouchSchemaContract';
import { M55_R5_TOUCH_INGEST_MIGRATION_FILENAME } from './r5TouchIngestContract';
import { M55_R5_TOUCH_SCHEMA_MIGRATION_FILENAME } from './r5TouchSchemaContract';
import { M55_R5_PURCHASE_ATTEMPT_LOCK_MIGRATION_FILENAME } from './r5PurchaseAttemptLockContract';

type DisposablePgClient = {
  connect: () => Promise<void>;
  end: () => Promise<void>;
  query: (
    text: string,
    values?: unknown[],
  ) => Promise<{ rowCount: number | null; rows: Array<Record<string, unknown>> }>;
};

type DisposablePg = {
  Client: new (config: { connectionString: string }) => DisposablePgClient;
};

function loadPg(): DisposablePg {
  let dir = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    const candidate = join(dir, 'node_modules', 'pg');
    if (existsSync(candidate)) {
      return createRequire(join(dir, 'package.json'))('pg') as DisposablePg;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  const sibling = join(
    dirname(process.cwd()),
    'M55_WORKTREE-r5-attribution-runtime-s2',
    'package.json',
  );
  if (existsSync(join(dirname(sibling), 'node_modules', 'pg'))) {
    return createRequire(sibling)('pg') as DisposablePg;
  }
  throw new Error('pg module not found for disposable local proof');
}

const pg = loadPg();

const R4_MIGRATION = '20260914000000_m55_creator_distribution_foundation_v1.sql';
const S1_MIGRATION = M55_R5_TOUCH_SCHEMA_MIGRATION_FILENAME;
const S2_MIGRATION = M55_R5_TOUCH_INGEST_MIGRATION_FILENAME;
const S3A_MIGRATION = M55_R5_PURCHASE_ATTEMPT_LOCK_MIGRATION_FILENAME;
const S2B_MIGRATION = '20260922000000_m55_r5_attribution_admit_acceptance_linearized_v1.sql';
const S3B_MIGRATION = '20260922000001_m55_r5_finalize_pending_admission_hold_v1.sql';
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const DENY_URL_PATTERNS = [
  'supabase.co',
  'pooler.supabase.com',
  'm55-soul',
  'm55-soul-core',
  'production',
  'preview',
] as const;
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const REQUIRED_ROLES = ['anon', 'authenticated', 'service_role'] as const;

function redactDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return '<unparseable-url>';
  }
}

function evaluateLocalDatabaseSafety():
  | { ok: true; url: string; redactedTarget: string }
  | { ok: false; reason: string } {
  const rawUrl = process.env.M55_R5_TOUCH_SCHEMA_LOCAL_DATABASE_URL;
  const allowMutation = process.env.M55_R5_TOUCH_SCHEMA_ALLOW_DISPOSABLE_DB_MUTATION;
  if (!rawUrl) return { ok: false, reason: 'M55_R5_TOUCH_SCHEMA_LOCAL_DATABASE_URL is not set' };
  if (allowMutation !== 'YES') {
    return { ok: false, reason: 'M55_R5_TOUCH_SCHEMA_ALLOW_DISPOSABLE_DB_MUTATION must be exactly YES' };
  }
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'M55_R5_TOUCH_SCHEMA_LOCAL_DATABASE_URL is not parseable' };
  }
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
  if (!LOOPBACK_HOSTS.has(hostname)) {
    return { ok: false, reason: `database host must be loopback only; got ${hostname}` };
  }
  const lowerUrl = rawUrl.toLowerCase();
  for (const pattern of DENY_URL_PATTERNS) {
    if (lowerUrl.includes(pattern)) {
      return { ok: false, reason: `database URL contains denied pattern: ${pattern}` };
    }
  }
  const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, '')).toLowerCase();
  if (dbName.includes('production') || dbName.includes('preview')) {
    return { ok: false, reason: 'database name contains denied production/preview marker' };
  }
  return { ok: true, url: rawUrl, redactedTarget: redactDatabaseUrl(rawUrl) };
}

async function expectPgError(fn: () => Promise<unknown>, matcher: RegExp): Promise<void> {
  await assert.rejects(fn, matcher);
}

async function applyMigration(client: DisposablePgClient, filename: string): Promise<void> {
  const sql = readFileSync(join(process.cwd(), 'supabase/migrations', filename), 'utf8');
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function ensurePgcrypto(client: DisposablePgClient): Promise<void> {
  await client.query('create schema if not exists extensions');
  const existing = await client.query(
    `select n.nspname
     from pg_extension e
     join pg_namespace n on n.oid = e.extnamespace
     where e.extname = 'pgcrypto'`,
  );
  if (existing.rowCount === 0) {
    await client.query('create extension pgcrypto with schema extensions');
  } else if (existing.rows[0].nspname !== 'extensions') {
    await client.query(`
      create or replace function extensions.digest(bytea, text)
      returns bytea
      language sql
      immutable
      as $fn$ select public.digest($1, $2) $fn$
    `);
  }
  await client.query('grant usage on schema extensions to service_role');
  await client.query('grant execute on function extensions.digest(bytea, text) to service_role');
}

async function requiredRolesExist(client: DisposablePgClient): Promise<boolean> {
  const result = await client.query(`select rolname from pg_roles where rolname = any($1::text[])`, [
    REQUIRED_ROLES,
  ]);
  return result.rowCount === REQUIRED_ROLES.length;
}

function fingerprint(label: string): string {
  return createHash('sha256').update(label).digest('hex');
}

async function insertCreator(
  client: DisposablePgClient,
  suffix: string,
  status = 'ACTIVE',
): Promise<{ profileId: string; economicIdentityId: string; clerkUserId: string; linkId: string }> {
  const clerkUserId = `user_creator_${suffix}`.slice(0, 128);
  const application = await client.query(
    `insert into public.m55_creator_applications (
       clerk_user_id, application_source, age_18_plus_attested, japan_resident_attested,
       content_focus_safe, terms_version, terms_accepted_at, status
     ) values ($1, 'PUBLIC_APPLICATION', true, true, 'test focus', '2026-09-13-v1', now(), 'APPROVED_PENDING_ACTIVATION')
     returning id`,
    [clerkUserId],
  );
  const profile = await client.query(
    `insert into public.m55_creator_profiles (
       clerk_user_id, originating_application_id, creator_code, first_final_approved_at,
       terms_version, terms_accepted_at, status
     ) values ($1, $2, $3, now(), '2026-09-13-v1', now(), $4)
     returning id, economic_identity_id`,
    [clerkUserId, application.rows[0].id, `cr_${suffix}`.slice(0, 40), status],
  );
  const tokenDigest = fingerprint(`token-${suffix}`);
  const link = await client.query(
    `insert into public.m55_creator_referral_links (
       creator_profile_id, creator_economic_identity_id, token_version, token_digest, ingest_state
     ) values ($1, $2, 'v1', $3, 'ACTIVE')
     returning id`,
    [profile.rows[0].id, profile.rows[0].economic_identity_id, tokenDigest],
  );
  return {
    profileId: profile.rows[0].id as string,
    economicIdentityId: profile.rows[0].economic_identity_id as string,
    clerkUserId,
    linkId: link.rows[0].id as string,
  };
}

async function insertTouch(
  client: DisposablePgClient,
  args: {
    buyerSubjectId: string;
    linkId: string;
    economicIdentityId: string;
    touchAtMs: number;
    touchKey?: Buffer;
    recordedAtMs?: number;
  },
): Promise<{ id: string; touchKey: Buffer }> {
  const touchKey = args.touchKey ?? randomBytes(16);
  const recordedAtSql =
    args.recordedAtMs === undefined
      ? 'default'
      : `to_timestamp($7::numeric / 1000.0)`;
  const values = [
    args.buyerSubjectId,
    args.linkId,
    args.economicIdentityId,
    args.touchAtMs,
    touchKey,
    fingerprint(touchKey.toString('hex')),
  ];
  if (args.recordedAtMs !== undefined) {
    values.push(args.recordedAtMs);
  }
  const result = await client.query(
    `insert into public.m55_creator_qualified_touches (
       buyer_subject_id, creator_referral_link_id, creator_economic_identity_id,
       tracking_lane, qualified_touch_at_ms, touch_event_key_bytes, payload_fingerprint,
       qualified_action_kind, tracking_contract_version, attribution_policy_version,
       recorded_at
     ) values ($1, $2, $3, 'CREATOR', $4, $5, $6, 'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK', 'v1', 'v1', ${recordedAtSql})
     returning id`,
    values,
  );
  return { id: result.rows[0].id as string, touchKey };
}

async function callResolve(
  client: DisposablePgClient,
  args: {
    clerkUserId: string;
    product?: string;
    repurchaseLane?: boolean;
    generation?: number;
    successorReason?: string | null;
  },
): Promise<Record<string, unknown>> {
  const digest = deriveAttributionBuyerSubjectLookupDigestV1(args.clerkUserId);
  const result = await client.query(
    `select public.m55_r5_attribution_resolve_purchase_attempt_v1($1,$2,$3,$4,$5,$6,$7) as payload`,
    [
      digest,
      args.clerkUserId,
      args.product ?? 'M55_PREMIUM_REPORT_LIGHT',
      args.repurchaseLane ?? false,
      args.generation ?? 0,
      args.successorReason ?? null,
      null,
    ],
  );
  return result.rows[0].payload as Record<string, unknown>;
}

async function currentServerMs(client: DisposablePgClient): Promise<number> {
  const result = await client.query(
    `select floor(extract(epoch from clock_timestamp()) * 1000)::bigint as ms`,
  );
  return Number(result.rows[0].ms);
}

async function waitUntilPastCutoff(
  client: DisposablePgClient,
  cutoff: number,
  timeoutMs = 5_000,
): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const now = await currentServerMs(client);
    if (now > cutoff) return;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  const final = await currentServerMs(client);
  assert.ok(final > cutoff, `timed out waiting for server ms > ${cutoff}; got ${final}`);
}

async function callFinalize(
  client: DisposablePgClient,
  attemptId: string,
  sessionId: string,
  expiresAtMs = 1_800_000_000_000,
  options?: { skipBarrierWait?: boolean },
): Promise<Record<string, unknown>> {
  if (!options?.skipBarrierWait) {
    const row = await client.query(
      `select cutoff_at_ms from public.m55_r5_purchase_attempts_v1 where id = $1`,
      [attemptId],
    );
    await waitUntilPastCutoff(client, Number(row.rows[0].cutoff_at_ms));
  }
  const result = await client.query(
    `select public.m55_r5_attribution_finalize_lock_and_bind_checkout_session_v1($1,$2,$3) as payload`,
    [attemptId, sessionId, expiresAtMs],
  );
  return result.rows[0].payload as Record<string, unknown>;
}

async function buyerSubjectId(client: DisposablePgClient, clerkUserId: string): Promise<string> {
  const digest = deriveAttributionBuyerSubjectLookupDigestV1(clerkUserId);
  const row = await client.query(
    `select id from public.m55_attribution_buyer_subjects where clerk_subject_lookup_digest = $1`,
    [digest],
  );
  return row.rows[0].id as string;
}

const SOURCE = readFileSync(
  join(process.cwd(), 'lib/m55/attribution/r5PurchaseAttemptLockSecurity.local.test.ts'),
  'utf8',
);

describe('r5PurchaseAttemptLockSecurity.local — harness isolation (static)', () => {
  it('does not import sibling local test modules', () => {
    assert.doesNotMatch(SOURCE, /r5TouchSchemaSecurity\.local\.test/);
    assert.doesNotMatch(SOURCE, /r5TouchIngestSecurity\.local\.test/);
  });

  it('registers exactly one top-level before hook', () => {
    assert.equal((SOURCE.match(/\bbefore\s*\(/g) ?? []).length, 1);
  });
});

const safety = evaluateLocalDatabaseSafety();

if (!safety.ok) {
  describe('r5PurchaseAttemptLockSecurity.local — safety refusal', () => {
    it('refuses mutation-capable proof when safety predicate fails', () => {
      throw new Error(`SAFETY_REFUSAL: ${safety.reason}`);
    });
  });
} else {
  const adminClient = new pg.Client({ connectionString: safety.url });

  before(async () => {
    await adminClient.connect();
    if (!(await requiredRolesExist(adminClient))) {
      throw new Error('SAFETY_REFUSAL: required roles anon/authenticated/service_role are missing');
    }
    await ensurePgcrypto(adminClient);
    if (!(await adminClient.query(`select to_regclass('public.m55_creator_profiles')`)).rows[0].to_regclass) {
      await applyMigration(adminClient, R4_MIGRATION);
    }
    if (!(await adminClient.query(`select to_regclass('public.m55_creator_referral_links')`)).rows[0].to_regclass) {
      await applyMigration(adminClient, S1_MIGRATION);
    }
    if (
      !(await adminClient.query(`select to_regclass('public.m55_r5_attribution_touch_continuations')`))
        .rows[0].to_regclass
    ) {
      await applyMigration(adminClient, S2_MIGRATION);
    }
    if (!(await adminClient.query(`select to_regclass('public.m55_r5_purchase_attempts_v1')`)).rows[0].to_regclass) {
      await applyMigration(adminClient, S3A_MIGRATION);
    }
    if (
      !(await adminClient.query(
        `select 1 from pg_proc where proname = 'm55_r5_attribution_qualified_touch_payload_fingerprint_v1'`,
      )).rowCount
    ) {
      await applyMigration(adminClient, S2B_MIGRATION);
    }
    const finalizeProc = await adminClient.query(
      `select prosrc from pg_proc where proname = 'm55_r5_attribution_finalize_lock_and_bind_checkout_session_v1'`,
    );
    const finalizeProcSrc = finalizeProc.rows[0]?.prosrc as string | undefined;
    if (!finalizeProcSrc?.includes('PENDING_ADMISSION_RETRY_HOLD')) {
      await applyMigration(adminClient, S3B_MIGRATION);
    }
  });

  after(async () => {
    await adminClient.end();
  });

  describe('r5PurchaseAttemptLockSecurity.local — digest and subject', () => {
    it('rejects raw/digest mismatch', async () => {
      await expectPgError(
        () =>
          adminClient.query(
            `select public.m55_r5_attribution_resolve_purchase_attempt_v1($1,$2,'M55_PREMIUM_REPORT_LIGHT',false,0,null,null)`,
            ['a'.repeat(64), `user_mismatch_${randomUUID()}`.slice(0, 128)],
          ),
        /BUYER_SUBJECT_DIGEST_MISMATCH/,
      );
    });

    it('SQL digest equals TS digest vectors', async () => {
      const clerkUserId = `user_digest_${randomUUID()}`.slice(0, 128);
      const ts = deriveAttributionBuyerSubjectLookupDigestV1(clerkUserId);
      const sql = await adminClient.query(
        `select public.m55_r5_attribution_clerk_lookup_digest_v1($1) as digest`,
        [clerkUserId],
      );
      assert.equal(sql.rows[0].digest, ts);
    });

    it('upserts ACTIVE buyer subject and fails closed on DELETED', async () => {
      const clerkUserId = `user_buyer_${randomUUID()}`.slice(0, 128);
      const first = await callResolve(adminClient, { clerkUserId });
      const subjectId = await buyerSubjectId(adminClient, clerkUserId);
      const state = await adminClient.query(
        `select identity_state from public.m55_attribution_buyer_subjects where id = $1`,
        [subjectId],
      );
      assert.equal(state.rows[0].identity_state, 'ACTIVE');
      assert.equal(typeof first.purchase_attempt_id, 'string');
      await adminClient.query(
        `update public.m55_attribution_buyer_subjects set identity_state = 'DELETED' where id = $1`,
        [subjectId],
      );
      await expectPgError(
        () => callResolve(adminClient, { clerkUserId, product: 'M55_PREMIUM_REPORT_FULL' }),
        /BUYER_SUBJECT_DELETED/,
      );
    });
  });

  describe('r5PurchaseAttemptLockSecurity.local — generation', () => {
    it('creates generation 0, converges, and reuses UNFINALIZED orphans', async () => {
      const clerkUserId = `user_gen_${randomUUID()}`.slice(0, 128);
      const a = await callResolve(adminClient, { clerkUserId, generation: 0 });
      const b = await callResolve(adminClient, { clerkUserId, generation: 99 });
      assert.equal(a.finalization_state, 'UNFINALIZED');
      assert.equal(a.purchase_attempt_id, b.purchase_attempt_id);
      assert.equal(a.cutoff_at_ms, b.cutoff_at_ms);
    });

    it('rejects generation > max+1 and retry minting', async () => {
      const clerkUserId = `user_jump_${randomUUID()}`.slice(0, 128);
      const created = await callResolve(adminClient, { clerkUserId });
      await callFinalize(adminClient, created.purchase_attempt_id as string, `cs_${randomUUID()}`);
      await expectPgError(
        () => callResolve(adminClient, { clerkUserId, generation: 5 }),
        /INVALID_SCOPE_GENERATION/,
      );
      await expectPgError(
        () =>
          callResolve(adminClient, {
            clerkUserId,
            generation: 1,
            successorReason: 'SAME_ATTEMPT_RETRY',
          }),
        /INVALID_SUCCESSOR_REASON/,
      );
    });

    it('mints expiry and cancel successors at max+1 and refuses stale generation load', async () => {
      const clerkUserId = `user_succ_${randomUUID()}`.slice(0, 128);
      const gen0 = await callResolve(adminClient, { clerkUserId });
      await callFinalize(adminClient, gen0.purchase_attempt_id as string, `cs_${randomUUID()}`);
      const expiry = await callResolve(adminClient, {
        clerkUserId,
        generation: 1,
        successorReason: 'CONFIRMED_EXPIRY',
      });
      assert.notEqual(expiry.purchase_attempt_id, gen0.purchase_attempt_id);
      await callFinalize(adminClient, expiry.purchase_attempt_id as string, `cs_${randomUUID()}`);
      const cancel = await callResolve(adminClient, {
        clerkUserId,
        generation: 2,
        successorReason: 'CONFIRMED_CANCEL',
      });
      assert.notEqual(cancel.purchase_attempt_id, expiry.purchase_attempt_id);
      const stale = await callResolve(adminClient, { clerkUserId, generation: 0 });
      assert.equal(stale.purchase_attempt_id, cancel.purchase_attempt_id);
    });
  });

  describe('r5PurchaseAttemptLockSecurity.local — lock decisions', () => {
    it('locks NONE without a qualified touch and one lock per attempt', async () => {
      const clerkUserId = `user_none_${randomUUID()}`.slice(0, 128);
      const attempt = await callResolve(adminClient, { clerkUserId });
      const finalized = await callFinalize(
        adminClient,
        attempt.purchase_attempt_id as string,
        `cs_${randomUUID()}`,
      );
      assert.equal(finalized.decision_kind, 'NONE');
      assert.equal(finalized.lock_denial_reason_code, 'NO_QUALIFIED_TOUCH');
      const count = await adminClient.query(
        `select count(*)::int as count from public.m55_r5_attribution_locks_v1 where purchase_attempt_id = $1`,
        [attempt.purchase_attempt_id],
      );
      assert.equal(count.rows[0].count, 1);
    });

    it('accepts the 30-day half-open inside bound and excludes the upper bound', async () => {
      const buyerId = `user_win_${randomUUID()}`.slice(0, 128);
      const creator = await insertCreator(adminClient, `win-${randomUUID()}`);
      const insideAttempt = await callResolve(adminClient, { clerkUserId: buyerId });
      const buyerSub = await buyerSubjectId(adminClient, buyerId);
      const cutoff = Number(insideAttempt.cutoff_at_ms);
      const insideTouch = await insertTouch(adminClient, {
        buyerSubjectId: buyerSub,
        linkId: creator.linkId,
        economicIdentityId: creator.economicIdentityId,
        touchAtMs: cutoff,
        recordedAtMs: cutoff,
      });
      const winner = await callFinalize(
        adminClient,
        insideAttempt.purchase_attempt_id as string,
        `cs_${randomUUID()}`,
      );
      assert.equal(winner.decision_kind, 'CREATOR_WINNER');
      const lock = await adminClient.query(
        `select winner_qualified_touch_id, winner_creator_economic_identity_id,
                winner_qualified_touch_at_ms, winner_touch_event_key_bytes, locked_at_ms, lock_expires_at_ms
         from public.m55_r5_attribution_locks_v1 where purchase_attempt_id = $1`,
        [insideAttempt.purchase_attempt_id],
      );
      assert.equal(lock.rows[0].winner_qualified_touch_id, insideTouch.id);
      assert.equal(lock.rows[0].winner_creator_economic_identity_id, creator.economicIdentityId);
      assert.equal(Number(lock.rows[0].winner_qualified_touch_at_ms), cutoff);
      assert.equal(Number(lock.rows[0].locked_at_ms), cutoff);
      assert.equal(Number(lock.rows[0].lock_expires_at_ms), 1_800_000_000_000);
      assert.deepEqual(lock.rows[0].winner_touch_event_key_bytes, insideTouch.touchKey);

      const expiredBuyer = `user_exp_${randomUUID()}`.slice(0, 128);
      const expiredAttempt = await callResolve(adminClient, {
        clerkUserId: expiredBuyer,
        product: 'M55_PREMIUM_REPORT_FULL',
      });
      const expiredSub = await buyerSubjectId(adminClient, expiredBuyer);
      const expiredCutoff = Number(expiredAttempt.cutoff_at_ms);
      await insertTouch(adminClient, {
        buyerSubjectId: expiredSub,
        linkId: creator.linkId,
        economicIdentityId: creator.economicIdentityId,
        touchAtMs: expiredCutoff - WINDOW_MS,
        recordedAtMs: expiredCutoff - WINDOW_MS,
      });
      const expired = await callFinalize(
        adminClient,
        expiredAttempt.purchase_attempt_id as string,
        `cs_${randomUUID()}`,
      );
      assert.equal(expired.decision_kind, 'NONE');
      assert.equal(expired.lock_denial_reason_code, 'WINDOW_EXPIRED');
    });

    it('selects last-qualified touch and exact bytea tie-break', async () => {
      const buyerId = `user_tie_${randomUUID()}`.slice(0, 128);
      const older = await insertCreator(adminClient, `older-${randomUUID()}`);
      const newer = await insertCreator(adminClient, `newer-${randomUUID()}`);
      const attempt = await callResolve(adminClient, { clerkUserId: buyerId });
      const subjectId = await buyerSubjectId(adminClient, buyerId);
      const cutoff = Number(attempt.cutoff_at_ms);
      await insertTouch(adminClient, {
        buyerSubjectId: subjectId,
        linkId: older.linkId,
        economicIdentityId: older.economicIdentityId,
        touchAtMs: cutoff - 10,
        recordedAtMs: cutoff - 10,
      });
      const lowKey = Buffer.alloc(16);
      randomBytes(15).copy(lowKey, 1);
      const highKey = Buffer.from(lowKey);
      highKey[0] = 1;
      const low = await insertTouch(adminClient, {
        buyerSubjectId: subjectId,
        linkId: newer.linkId,
        economicIdentityId: newer.economicIdentityId,
        touchAtMs: cutoff,
        touchKey: lowKey,
        recordedAtMs: cutoff,
      });
      await insertTouch(adminClient, {
        buyerSubjectId: subjectId,
        linkId: older.linkId,
        economicIdentityId: older.economicIdentityId,
        touchAtMs: cutoff,
        touchKey: highKey,
        recordedAtMs: cutoff,
      });
      const decided = await callFinalize(
        adminClient,
        attempt.purchase_attempt_id as string,
        `cs_${randomUUID()}`,
      );
      assert.equal(decided.decision_kind, 'CREATOR_WINNER');
      const lock = await adminClient.query(
        `select winner_qualified_touch_id from public.m55_r5_attribution_locks_v1 where purchase_attempt_id = $1`,
        [attempt.purchase_attempt_id],
      );
      assert.equal(lock.rows[0].winner_qualified_touch_id, low.id);
    });

    it('applies self-referral, circular, non-circular, and inactive creator outcomes', async () => {
      const selfBuyer = await insertCreator(adminClient, `self-${randomUUID()}`);
      const selfAttempt = await callResolve(adminClient, { clerkUserId: selfBuyer.clerkUserId });
      const selfSubject = await buyerSubjectId(adminClient, selfBuyer.clerkUserId);
      const selfCutoff = Number(selfAttempt.cutoff_at_ms);
      await insertTouch(adminClient, {
        buyerSubjectId: selfSubject,
        linkId: selfBuyer.linkId,
        economicIdentityId: selfBuyer.economicIdentityId,
        touchAtMs: selfCutoff,
        recordedAtMs: selfCutoff,
      });
      const selfLock = await callFinalize(
        adminClient,
        selfAttempt.purchase_attempt_id as string,
        `cs_${randomUUID()}`,
      );
      assert.equal(selfLock.lock_denial_reason_code, 'SELF_REFERRAL');

      const creatorA = await insertCreator(adminClient, `circA-${randomUUID()}`);
      const creatorB = await insertCreator(adminClient, `circB-${randomUUID()}`);
      const circAttempt = await callResolve(adminClient, { clerkUserId: creatorB.clerkUserId });
      const bSubject = await buyerSubjectId(adminClient, creatorB.clerkUserId);
      const circCutoff = Number(circAttempt.cutoff_at_ms);
      await insertTouch(adminClient, {
        buyerSubjectId: bSubject,
        linkId: creatorA.linkId,
        economicIdentityId: creatorA.economicIdentityId,
        touchAtMs: circCutoff,
        recordedAtMs: circCutoff,
      });
      const aDigest = deriveAttributionBuyerSubjectLookupDigestV1(creatorA.clerkUserId);
      await adminClient.query(
        `insert into public.m55_attribution_buyer_subjects (clerk_subject_lookup_digest, identity_state)
         values ($1, 'ACTIVE')`,
        [aDigest],
      );
      const aSubject = await buyerSubjectId(adminClient, creatorA.clerkUserId);
      await insertTouch(adminClient, {
        buyerSubjectId: aSubject,
        linkId: creatorB.linkId,
        economicIdentityId: creatorB.economicIdentityId,
        touchAtMs: circCutoff - 1,
        recordedAtMs: circCutoff - 1,
      });
      const circular = await callFinalize(
        adminClient,
        circAttempt.purchase_attempt_id as string,
        `cs_${randomUUID()}`,
      );
      assert.equal(circular.lock_denial_reason_code, 'CIRCULAR_ABUSE');

      const ordinaryBuyer = `user_ok_${randomUUID()}`.slice(0, 128);
      const ordinaryAttempt = await callResolve(adminClient, { clerkUserId: ordinaryBuyer });
      const ordinarySubject = await buyerSubjectId(adminClient, ordinaryBuyer);
      const ordinaryCutoff = Number(ordinaryAttempt.cutoff_at_ms);
      await insertTouch(adminClient, {
        buyerSubjectId: ordinarySubject,
        linkId: creatorA.linkId,
        economicIdentityId: creatorA.economicIdentityId,
        touchAtMs: ordinaryCutoff,
        recordedAtMs: ordinaryCutoff,
      });
      const ordinary = await callFinalize(
        adminClient,
        ordinaryAttempt.purchase_attempt_id as string,
        `cs_${randomUUID()}`,
      );
      assert.equal(ordinary.decision_kind, 'CREATOR_WINNER');

      const inactive = await insertCreator(adminClient, `inact-${randomUUID()}`, 'SUSPENDED');
      const inactiveBuyer = `user_inact_${randomUUID()}`.slice(0, 128);
      const inactiveAttempt = await callResolve(adminClient, { clerkUserId: inactiveBuyer });
      const inactiveSubject = await buyerSubjectId(adminClient, inactiveBuyer);
      const inactiveCutoff = Number(inactiveAttempt.cutoff_at_ms);
      await insertTouch(adminClient, {
        buyerSubjectId: inactiveSubject,
        linkId: inactive.linkId,
        economicIdentityId: inactive.economicIdentityId,
        touchAtMs: inactiveCutoff,
        recordedAtMs: inactiveCutoff,
      });
      const inactiveLock = await callFinalize(
        adminClient,
        inactiveAttempt.purchase_attempt_id as string,
        `cs_${randomUUID()}`,
      );
      assert.equal(inactiveLock.lock_denial_reason_code, 'CREATOR_NOT_ACTIVE');
    });

    it('does not let a later touch mutate an existing lock', async () => {
      const buyerId = `user_late_${randomUUID()}`.slice(0, 128);
      const creator = await insertCreator(adminClient, `late-${randomUUID()}`);
      const laterCreator = await insertCreator(adminClient, `later-${randomUUID()}`);
      const attempt = await callResolve(adminClient, { clerkUserId: buyerId });
      const subjectId = await buyerSubjectId(adminClient, buyerId);
      const lateCutoff = Number(attempt.cutoff_at_ms);
      const first = await insertTouch(adminClient, {
        buyerSubjectId: subjectId,
        linkId: creator.linkId,
        economicIdentityId: creator.economicIdentityId,
        touchAtMs: lateCutoff - 5,
        recordedAtMs: lateCutoff - 5,
      });
      await callFinalize(adminClient, attempt.purchase_attempt_id as string, `cs_${randomUUID()}`);
      await insertTouch(adminClient, {
        buyerSubjectId: subjectId,
        linkId: laterCreator.linkId,
        economicIdentityId: laterCreator.economicIdentityId,
        touchAtMs: Number(attempt.cutoff_at_ms),
      });
      const lock = await adminClient.query(
        `select winner_qualified_touch_id from public.m55_r5_attribution_locks_v1 where purchase_attempt_id = $1`,
        [attempt.purchase_attempt_id],
      );
      assert.equal(lock.rows[0].winner_qualified_touch_id, first.id);
    });

    it('keeps a durable touch eligible when event time is <= cutoff even if persistence is after cutoff', async () => {
      const buyerId = `user_persist_after_${randomUUID()}`.slice(0, 128);
      const creator = await insertCreator(adminClient, `persist-after-${randomUUID()}`);
      const attempt = await callResolve(adminClient, { clerkUserId: buyerId });
      const subjectId = await buyerSubjectId(adminClient, buyerId);
      const cutoff = Number(attempt.cutoff_at_ms);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const touch = await insertTouch(adminClient, {
        buyerSubjectId: subjectId,
        linkId: creator.linkId,
        economicIdentityId: creator.economicIdentityId,
        touchAtMs: cutoff,
      });
      const persisted = await adminClient.query(
        `select floor(extract(epoch from recorded_at) * 1000)::bigint as rec_ms
         from public.m55_creator_qualified_touches where id = $1`,
        [touch.id],
      );
      assert.ok(
        Number(persisted.rows[0].rec_ms) >= cutoff,
        'this proof requires wall-clock persistence at or after cutoff',
      );
      const finalized = await callFinalize(
        adminClient,
        attempt.purchase_attempt_id as string,
        `cs_${randomUUID()}`,
      );
      assert.equal(finalized.decision_kind, 'CREATOR_WINNER');
      assert.equal(finalized.lock_denial_reason_code, null);
      const lock = await adminClient.query(
        `select winner_qualified_touch_id from public.m55_r5_attribution_locks_v1 where purchase_attempt_id = $1`,
        [attempt.purchase_attempt_id],
      );
      assert.equal(lock.rows[0].winner_qualified_touch_id, touch.id);
    });

    it('excludes a durable touch whose qualified_touch_at_ms is after cutoff', async () => {
      const buyerId = `user_event_after_${randomUUID()}`.slice(0, 128);
      const creator = await insertCreator(adminClient, `event-after-${randomUUID()}`);
      const attempt = await callResolve(adminClient, { clerkUserId: buyerId });
      const subjectId = await buyerSubjectId(adminClient, buyerId);
      const cutoff = Number(attempt.cutoff_at_ms);
      await insertTouch(adminClient, {
        buyerSubjectId: subjectId,
        linkId: creator.linkId,
        economicIdentityId: creator.economicIdentityId,
        touchAtMs: cutoff + 1,
        recordedAtMs: cutoff,
      });
      const finalized = await callFinalize(
        adminClient,
        attempt.purchase_attempt_id as string,
        `cs_${randomUUID()}`,
      );
      assert.equal(finalized.decision_kind, 'NONE');
      assert.equal(finalized.lock_denial_reason_code, 'NO_QUALIFIED_TOUCH');
    });

    it('proves recorded_at DEFAULT clock_timestamp differs from transaction_timestamp without money authority', async () => {
      const buyerId = `user_clock_default_${randomUUID()}`.slice(0, 128);
      const creator = await insertCreator(adminClient, `clock-default-${randomUUID()}`);
      const attempt = await callResolve(adminClient, { clerkUserId: buyerId });
      const subjectId = await buyerSubjectId(adminClient, buyerId);
      const second = new pg.Client({ connectionString: safety.url });
      await second.connect();
      try {
        await second.query('BEGIN');
        const txnStart = await second.query(
          `select floor(extract(epoch from transaction_timestamp()) * 1000)::bigint as ms`,
        );
        const txnStartMs = Number(txnStart.rows[0].ms);
        await new Promise((resolve) => setTimeout(resolve, 10));
        const touchKey = randomBytes(16);
        const inserted = await second.query(
          `insert into public.m55_creator_qualified_touches (
             buyer_subject_id, creator_referral_link_id, creator_economic_identity_id,
             tracking_lane, qualified_touch_at_ms, touch_event_key_bytes, payload_fingerprint,
             qualified_action_kind, tracking_contract_version, attribution_policy_version
           ) values ($1, $2, $3, 'CREATOR', $4, $5, $6, 'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK', 'v1', 'v1')
           returning floor(extract(epoch from recorded_at) * 1000)::bigint as rec_ms`,
          [
            subjectId,
            creator.linkId,
            creator.economicIdentityId,
            Number(attempt.cutoff_at_ms),
            touchKey,
            fingerprint(touchKey.toString('hex')),
          ],
        );
        const recMs = Number(inserted.rows[0].rec_ms);
        assert.ok(
          recMs > txnStartMs,
          `clock_timestamp default must exceed transaction_timestamp (${txnStartMs}); got ${recMs}`,
        );
        await second.query('ROLLBACK');
      } finally {
        try {
          await second.query('ROLLBACK');
        } catch {
          // already rolled back or closed
        }
        await second.end();
      }
    });

    it('does not treat post-cutoff reciprocal evidence as CIRCULAR_ABUSE', async () => {
      const creatorA = await insertCreator(adminClient, `postcircA-${randomUUID()}`);
      const creatorB = await insertCreator(adminClient, `postcircB-${randomUUID()}`);
      const attempt = await callResolve(adminClient, { clerkUserId: creatorB.clerkUserId });
      const bSubject = await buyerSubjectId(adminClient, creatorB.clerkUserId);
      const cutoff = Number(attempt.cutoff_at_ms);
      await insertTouch(adminClient, {
        buyerSubjectId: bSubject,
        linkId: creatorA.linkId,
        economicIdentityId: creatorA.economicIdentityId,
        touchAtMs: cutoff,
        recordedAtMs: cutoff,
      });
      const aDigest = deriveAttributionBuyerSubjectLookupDigestV1(creatorA.clerkUserId);
      await adminClient.query(
        `insert into public.m55_attribution_buyer_subjects (clerk_subject_lookup_digest, identity_state)
         values ($1, 'ACTIVE')`,
        [aDigest],
      );
      const aSubject = await buyerSubjectId(adminClient, creatorA.clerkUserId);
      await insertTouch(adminClient, {
        buyerSubjectId: aSubject,
        linkId: creatorB.linkId,
        economicIdentityId: creatorB.economicIdentityId,
        touchAtMs: cutoff + 1,
        recordedAtMs: cutoff,
      });
      const finalized = await callFinalize(
        adminClient,
        attempt.purchase_attempt_id as string,
        `cs_${randomUUID()}`,
      );
      assert.equal(finalized.decision_kind, 'CREATOR_WINNER');
      assert.equal(finalized.lock_denial_reason_code, null);
    });
  });

  describe('r5PurchaseAttemptLockSecurity.local — lock expiry', () => {
    it('rejects lock_expires_at_ms equal to or before cutoff', async () => {
      const clerkUserId = `user_expiry_${randomUUID()}`.slice(0, 128);
      const attempt = await callResolve(adminClient, { clerkUserId });
      const cutoff = Number(attempt.cutoff_at_ms);
      await expectPgError(
        () =>
          callFinalize(
            adminClient,
            attempt.purchase_attempt_id as string,
            `cs_${randomUUID()}`,
            cutoff,
            { skipBarrierWait: true },
          ),
        /LOCK_EXPIRY_NOT_AFTER_CUTOFF/,
      );
      await expectPgError(
        () =>
          callFinalize(
            adminClient,
            attempt.purchase_attempt_id as string,
            `cs_${randomUUID()}`,
            cutoff - 1,
            { skipBarrierWait: true },
          ),
        /LOCK_EXPIRY_NOT_AFTER_CUTOFF/,
      );
      const accepted = await callFinalize(
        adminClient,
        attempt.purchase_attempt_id as string,
        `cs_${randomUUID()}`,
        cutoff + 1,
      );
      assert.equal(accepted.finalization_state, 'FINALIZED');
    });
  });

  describe('r5PurchaseAttemptLockSecurity.local — denial shape invariants', () => {
    it('rejects invalid NONE and CREATOR_WINNER denial shapes on direct insert', async () => {
      const clerkUserId = `user_shape_${randomUUID()}`.slice(0, 128);
      const attempt = await callResolve(adminClient, { clerkUserId });
      const cutoff = Number(attempt.cutoff_at_ms);
      const expires = cutoff + 1000;
      await expectPgError(
        () =>
          adminClient.query(
            `insert into public.m55_r5_attribution_locks_v1 (
               purchase_attempt_id, decision_kind, locked_at_ms, lock_expires_at_ms,
               lock_denial_reason_code
             ) values ($1, 'NONE', $2, $3, null)`,
            [attempt.purchase_attempt_id, cutoff, expires],
          ),
        /check constraint/i,
      );
      await expectPgError(
        () =>
          adminClient.query(
            `insert into public.m55_r5_attribution_locks_v1 (
               purchase_attempt_id, decision_kind, locked_at_ms, lock_expires_at_ms,
               lock_denial_reason_code
             ) values ($1, 'NONE', $2, $3, 'UNKNOWN_REASON')`,
            [attempt.purchase_attempt_id, cutoff, expires],
          ),
        /check constraint/i,
      );
      await expectPgError(
        () =>
          adminClient.query(
            `insert into public.m55_r5_attribution_locks_v1 (
               purchase_attempt_id, decision_kind, locked_at_ms, lock_expires_at_ms,
               lock_denial_reason_code
             ) values ($1, 'CREATOR_WINNER', $2, $3, 'NO_QUALIFIED_TOUCH')`,
            [attempt.purchase_attempt_id, cutoff, expires],
          ),
        /check constraint/i,
      );
    });
  });

  describe('r5PurchaseAttemptLockSecurity.local — immutability and binding', () => {
    it('rejects lock and binding UPDATE/DELETE', async () => {
      const clerkUserId = `user_imm_${randomUUID()}`.slice(0, 128);
      const attempt = await callResolve(adminClient, { clerkUserId });
      await callFinalize(adminClient, attempt.purchase_attempt_id as string, `cs_${randomUUID()}`);
      await expectPgError(
        () =>
          adminClient.query(
            `update public.m55_r5_attribution_locks_v1 set lock_denial_reason_code = 'NO_QUALIFIED_TOUCH' where purchase_attempt_id = $1`,
            [attempt.purchase_attempt_id],
          ),
        /ATTRIBUTION_LOCK_IMMUTABLE/,
      );
      await expectPgError(
        () =>
          adminClient.query(`delete from public.m55_r5_attribution_locks_v1 where purchase_attempt_id = $1`, [
            attempt.purchase_attempt_id,
          ]),
        /ATTRIBUTION_LOCK_IMMUTABLE/,
      );
      await expectPgError(
        () =>
          adminClient.query(
            `update public.m55_r5_purchase_attempt_provider_bindings_v1 set stripe_checkout_session_id = 'cs_x' where purchase_attempt_id = $1`,
            [attempt.purchase_attempt_id],
          ),
        /PROVIDER_BINDING_IMMUTABLE/,
      );
      await expectPgError(
        () =>
          adminClient.query(
            `delete from public.m55_r5_purchase_attempt_provider_bindings_v1 where purchase_attempt_id = $1`,
            [attempt.purchase_attempt_id],
          ),
        /PROVIDER_BINDING_IMMUTABLE/,
      );
    });

    it('converges same session and rejects a different session or duplicate session id', async () => {
      const clerkUserId = `user_bind_${randomUUID()}`.slice(0, 128);
      const attempt = await callResolve(adminClient, { clerkUserId });
      const sessionId = `cs_${randomUUID()}`;
      const first = await callFinalize(adminClient, attempt.purchase_attempt_id as string, sessionId);
      const second = await callFinalize(adminClient, attempt.purchase_attempt_id as string, sessionId);
      assert.equal(first.purchase_attempt_id, second.purchase_attempt_id);
      await expectPgError(
        () => callFinalize(adminClient, attempt.purchase_attempt_id as string, `cs_${randomUUID()}`),
        /CONFLICTING_FINALIZATION/,
      );
      const other = await callResolve(adminClient, {
        clerkUserId,
        product: 'M55_PREMIUM_REPORT_FULL',
      });
      await expectPgError(
        () => callFinalize(adminClient, other.purchase_attempt_id as string, sessionId),
        /CONFLICTING_SESSION_BINDING/,
      );
    });

    it('fails closed when lock and binding are split', async () => {
      const clerkUserId = `user_corr_${randomUUID()}`.slice(0, 128);
      const lockOnly = await callResolve(adminClient, { clerkUserId });
      await adminClient.query(
        `insert into public.m55_r5_attribution_locks_v1 (
           purchase_attempt_id, decision_kind, locked_at_ms, lock_expires_at_ms, lock_denial_reason_code
         ) values ($1, 'NONE', $2, $3, 'NO_QUALIFIED_TOUCH')`,
        [lockOnly.purchase_attempt_id, lockOnly.cutoff_at_ms, 1_800_000_000_000],
      );
      await expectPgError(
        () => callFinalize(adminClient, lockOnly.purchase_attempt_id as string, `cs_${randomUUID()}`),
        /FINALIZATION_STATE_CORRUPT/,
      );

      const bindOnly = await callResolve(adminClient, {
        clerkUserId: `user_corr2_${randomUUID()}`.slice(0, 128),
      });
      await adminClient.query(
        `insert into public.m55_r5_purchase_attempt_provider_bindings_v1 (
           purchase_attempt_id, stripe_checkout_session_id
         ) values ($1, $2)`,
        [bindOnly.purchase_attempt_id, `cs_${randomUUID()}`],
      );
      await expectPgError(
        () => callFinalize(adminClient, bindOnly.purchase_attempt_id as string, `cs_${randomUUID()}`),
        /FINALIZATION_STATE_CORRUPT/,
      );
    });
  });

  describe('r5PurchaseAttemptLockSecurity.local — pending admission HOLD', () => {
    async function insertUnfinalizedAttemptWithCutoff(
      clerkUserId: string,
      cutoffMs: number,
    ): Promise<string> {
      const digest = deriveAttributionBuyerSubjectLookupDigestV1(clerkUserId);
      const buyer = await adminClient.query(
        `insert into public.m55_attribution_buyer_subjects (clerk_subject_lookup_digest, identity_state)
         values ($1, 'ACTIVE')
         returning id`,
        [digest],
      );
      const inserted = await adminClient.query(
        `insert into public.m55_r5_purchase_attempts_v1 (
           buyer_subject_id, creator_cash_product_key, repurchase_lane, scope_generation, cutoff_at_ms
         ) values ($1, 'M55_PREMIUM_REPORT_LIGHT', false, 0, $2)
         returning id`,
        [buyer.rows[0].id, cutoffMs],
      );
      return inserted.rows[0].id as string;
    }

    it('HOLDs at global boundary with zero candidate and writes no lock or binding', async () => {
      const clerkUserId = `user_hold_zero_${randomUUID()}`.slice(0, 128);
      const futureCutoff = (await currentServerMs(adminClient)) + 5_000;
      const attemptId = await insertUnfinalizedAttemptWithCutoff(clerkUserId, futureCutoff);
      await expectPgError(
        () =>
          callFinalize(adminClient, attemptId, `cs_${randomUUID()}`, 1_800_000_000_000, {
            skipBarrierWait: true,
          }),
        /PENDING_ADMISSION_RETRY_HOLD/,
      );
      const locks = await adminClient.query(
        `select count(*)::int as count from public.m55_r5_attribution_locks_v1 where purchase_attempt_id = $1`,
        [attemptId],
      );
      const bindings = await adminClient.query(
        `select count(*)::int as count from public.m55_r5_purchase_attempt_provider_bindings_v1 where purchase_attempt_id = $1`,
        [attemptId],
      );
      assert.equal(locks.rows[0].count, 0);
      assert.equal(bindings.rows[0].count, 0);
    });

    it('HOLDs at global boundary even when a qualifying candidate already exists', async () => {
      const buyerId = `user_hold_candidate_${randomUUID()}`.slice(0, 128);
      const creator = await insertCreator(adminClient, `hold-${randomUUID()}`);
      const futureCutoff = (await currentServerMs(adminClient)) + 5_000;
      const attemptId = await insertUnfinalizedAttemptWithCutoff(buyerId, futureCutoff);
      const digest = deriveAttributionBuyerSubjectLookupDigestV1(buyerId);
      const subjectRow = await adminClient.query(
        `select id from public.m55_attribution_buyer_subjects where clerk_subject_lookup_digest = $1`,
        [digest],
      );
      const subjectId = subjectRow.rows[0].id as string;
      await insertTouch(adminClient, {
        buyerSubjectId: subjectId,
        linkId: creator.linkId,
        economicIdentityId: creator.economicIdentityId,
        touchAtMs: futureCutoff - 1,
      });
      await expectPgError(
        () =>
          callFinalize(adminClient, attemptId, `cs_${randomUUID()}`, 1_800_000_000_000, {
            skipBarrierWait: true,
          }),
        /PENDING_ADMISSION_RETRY_HOLD/,
      );
      const locks = await adminClient.query(
        `select count(*)::int as count from public.m55_r5_attribution_locks_v1 where purchase_attempt_id = $1`,
        [attemptId],
      );
      assert.equal(locks.rows[0].count, 0);
    });

    it('finalizes after boundary and rejects later touch supersede', async () => {
      const buyerId = `user_post_boundary_${randomUUID()}`.slice(0, 128);
      const creator = await insertCreator(adminClient, `post-${randomUUID()}`);
      const laterCreator = await insertCreator(adminClient, `later-${randomUUID()}`);
      const attempt = await callResolve(adminClient, { clerkUserId: buyerId });
      const attemptId = attempt.purchase_attempt_id as string;
      const cutoff = Number(attempt.cutoff_at_ms);
      const subjectId = await buyerSubjectId(adminClient, buyerId);
      const first = await insertTouch(adminClient, {
        buyerSubjectId: subjectId,
        linkId: creator.linkId,
        economicIdentityId: creator.economicIdentityId,
        touchAtMs: cutoff - 1,
      });
      const finalized = await callFinalize(adminClient, attemptId, `cs_${randomUUID()}`);
      assert.equal(finalized.decision_kind, 'CREATOR_WINNER');
      await insertTouch(adminClient, {
        buyerSubjectId: subjectId,
        linkId: laterCreator.linkId,
        economicIdentityId: laterCreator.economicIdentityId,
        touchAtMs: cutoff + 1,
      });
      const lock = await adminClient.query(
        `select winner_qualified_touch_id from public.m55_r5_attribution_locks_v1 where purchase_attempt_id = $1`,
        [attemptId],
      );
      assert.equal(lock.rows[0].winner_qualified_touch_id, first.id);
    });

    it('HOLDs when buyer advisory lock is busy and writes no lock or binding', async () => {
      const buyerId = `user_busy_b_${randomUUID()}`.slice(0, 128);
      const attempt = await callResolve(adminClient, { clerkUserId: buyerId });
      const attemptId = attempt.purchase_attempt_id as string;
      const digest = deriveAttributionBuyerSubjectLookupDigestV1(buyerId);
      const holder = new pg.Client({ connectionString: safety.url });
      await holder.connect();
      try {
        await holder.query('BEGIN');
        await holder.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [
          `m55_r5_attr_buyer_subject:${digest}`,
        ]);
        await waitUntilPastCutoff(adminClient, Number(attempt.cutoff_at_ms));
        await expectPgError(
          () => callFinalize(adminClient, attemptId, `cs_${randomUUID()}`, 1_800_000_000_000),
          /PENDING_ADMISSION_RETRY_HOLD/,
        );
        const locks = await adminClient.query(
          `select count(*)::int as count from public.m55_r5_attribution_locks_v1 where purchase_attempt_id = $1`,
          [attemptId],
        );
        const bindings = await adminClient.query(
          `select count(*)::int as count from public.m55_r5_purchase_attempt_provider_bindings_v1 where purchase_attempt_id = $1`,
          [attemptId],
        );
        assert.equal(locks.rows[0].count, 0);
        assert.equal(bindings.rows[0].count, 0);
        await holder.query('ROLLBACK');
      } finally {
        try {
          await holder.query('ROLLBACK');
        } catch {
          // already rolled back
        }
        await holder.end();
      }
    });

    it('HOLDs when winner creator advisory lock is busy during circular evaluation', async () => {
      const creatorA = await insertCreator(adminClient, `holdA-${randomUUID()}`);
      const creatorB = await insertCreator(adminClient, `holdB-${randomUUID()}`);
      const attempt = await callResolve(adminClient, { clerkUserId: creatorB.clerkUserId });
      const attemptId = attempt.purchase_attempt_id as string;
      const cutoff = Number(attempt.cutoff_at_ms);
      const bSubject = await buyerSubjectId(adminClient, creatorB.clerkUserId);
      await insertTouch(adminClient, {
        buyerSubjectId: bSubject,
        linkId: creatorA.linkId,
        economicIdentityId: creatorA.economicIdentityId,
        touchAtMs: cutoff - 1,
      });
      const aDigest = deriveAttributionBuyerSubjectLookupDigestV1(creatorA.clerkUserId);
      await adminClient.query(
        `insert into public.m55_attribution_buyer_subjects (clerk_subject_lookup_digest, identity_state)
         values ($1, 'ACTIVE') on conflict do nothing`,
        [aDigest],
      );
      const aSubject = await buyerSubjectId(adminClient, creatorA.clerkUserId);
      await insertTouch(adminClient, {
        buyerSubjectId: aSubject,
        linkId: creatorB.linkId,
        economicIdentityId: creatorB.economicIdentityId,
        touchAtMs: cutoff - 2,
      });
      const holder = new pg.Client({ connectionString: safety.url });
      await holder.connect();
      try {
        await holder.query('BEGIN');
        await holder.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [
          `m55_r5_attr_buyer_subject:${aDigest}`,
        ]);
        await waitUntilPastCutoff(adminClient, cutoff);
        await expectPgError(
          () => callFinalize(adminClient, attemptId, `cs_${randomUUID()}`, 1_800_000_000_000),
          /PENDING_ADMISSION_RETRY_HOLD/,
        );
        const locks = await adminClient.query(
          `select count(*)::int as count from public.m55_r5_attribution_locks_v1 where purchase_attempt_id = $1`,
          [attemptId],
        );
        assert.equal(locks.rows[0].count, 0);
        await holder.query('ROLLBACK');
      } finally {
        try {
          await holder.query('ROLLBACK');
        } catch {
          // already rolled back
        }
        await holder.end();
      }
    });
  });

  describe('r5PurchaseAttemptLockSecurity.local — privilege model', () => {
    it('denies anon/authenticated table and RPC access and allows service_role', async () => {
      for (const role of ['anon', 'authenticated'] as const) {
        const roleClient = new pg.Client({ connectionString: safety.url });
        await roleClient.connect();
        try {
          await roleClient.query(`set role ${role}`);
          await expectPgError(
            () => roleClient.query(`select 1 from public.m55_r5_purchase_attempts_v1 limit 1`),
            /permission denied/i,
          );
          await expectPgError(
            () =>
              roleClient.query(
                `select public.m55_r5_attribution_resolve_purchase_attempt_v1($1,$2,'M55_PREMIUM_REPORT_LIGHT',false,0,null,null)`,
                ['a'.repeat(64), 'user_x'],
              ),
            /permission denied/i,
          );
        } finally {
          await roleClient.end();
        }
      }

      const clerkUserId = `user_svc_${randomUUID()}`.slice(0, 128);
      const service = new pg.Client({ connectionString: safety.url });
      await service.connect();
      try {
        await service.query('set role service_role');
        const payload = await callResolve(service, { clerkUserId });
        assert.equal(payload.finalization_state, 'UNFINALIZED');
      } finally {
        await service.query('reset role');
        await service.end();
      }
    });
  });
}
