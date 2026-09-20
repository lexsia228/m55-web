import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import pg from 'pg';
import { computeQualifiedTouchPayloadFingerprintV1 } from './r5TouchPayloadFingerprint';
import { M55_R5_TOUCH_INGEST_MIGRATION_FILENAME } from './r5TouchIngestContract';
import { M55_R5_TOUCH_SCHEMA_MIGRATION_FILENAME } from './r5TouchSchemaContract';

const R4_MIGRATION = '20260914000000_m55_creator_distribution_foundation_v1.sql';
const S1_MIGRATION = M55_R5_TOUCH_SCHEMA_MIGRATION_FILENAME;
const S2_MIGRATION = M55_R5_TOUCH_INGEST_MIGRATION_FILENAME;

const DENY_URL_PATTERNS = [
  'supabase.co',
  'pooler.supabase.com',
  'm55-soul',
  'm55-soul-core',
  'production',
  'preview',
] as const;

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

type LocalDatabaseSafetyEvaluation =
  | { ok: true; url: string; redactedTarget: string }
  | { ok: false; reason: string };

function redactDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return '<unparseable-url>';
  }
}

function evaluateLocalDatabaseSafety(): LocalDatabaseSafetyEvaluation {
  const rawUrl = process.env.M55_R5_TOUCH_SCHEMA_LOCAL_DATABASE_URL;
  const allowMutation = process.env.M55_R5_TOUCH_SCHEMA_ALLOW_DISPOSABLE_DB_MUTATION;

  if (!rawUrl) {
    return { ok: false, reason: 'M55_R5_TOUCH_SCHEMA_LOCAL_DATABASE_URL is not set' };
  }
  if (allowMutation !== 'YES') {
    return {
      ok: false,
      reason: 'M55_R5_TOUCH_SCHEMA_ALLOW_DISPOSABLE_DB_MUTATION must be exactly YES',
    };
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

  return {
    ok: true,
    url: rawUrl,
    redactedTarget: redactDatabaseUrl(rawUrl),
  };
}

function sha256LowerHex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function uniqueTouchKeyBytes(): Buffer {
  return randomBytes(16);
}

async function applyMigration(client: pg.Client, filename: string): Promise<void> {
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

async function insertCreatorFixture(
  client: pg.Client,
  suffix: string,
  status = 'ACTIVE',
): Promise<{
  profileId: string;
  economicIdentityId: string;
  clerkUserId: string;
  linkId: string;
  tokenDigest: string;
}> {
  const clerkUserId = `creator_${suffix}`.slice(0, 128);
  const application = await client.query(
    `insert into public.m55_creator_applications (
       clerk_user_id, application_source, age_18_plus_attested, japan_resident_attested,
       content_focus_safe, terms_version, terms_accepted_at, status
     ) values ($1, 'PUBLIC_APPLICATION', true, true, 'test focus', '2026-09-13-v1', now(), 'APPROVED_PENDING_ACTIVATION')
     returning id`,
    [clerkUserId],
  );
  const applicationId = application.rows[0].id as string;
  const profile = await client.query(
    `insert into public.m55_creator_profiles (
       clerk_user_id, originating_application_id, creator_code, first_final_approved_at,
       terms_version, terms_accepted_at, status
     ) values ($1, $2, $3, now(), '2026-09-13-v1', now(), $4)
     returning id, economic_identity_id`,
    [clerkUserId, applicationId, `cr_${suffix}`.slice(0, 40), status],
  );
  const tokenDigest = sha256LowerHex(`token-${suffix}-${randomUUID()}`);
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
    tokenDigest,
  };
}

async function callCreateRpc(
  client: pg.Client,
  args: {
    cookieId: Buffer | null;
    newId: Buffer;
    tokenDigest: string;
    action: string;
    directDigest: string | null;
  },
): Promise<{ outcome: string; continuationIdHex: string }> {
  const result = await client.query(
    `select public.m55_r5_attribution_create_touch_continuation_v1($1, $2, $3, 'v1', $4, $5) as payload`,
    [args.cookieId, args.newId, args.tokenDigest, args.action, args.directDigest],
  );
  const payload = result.rows[0].payload as Record<string, unknown>;
  return {
    outcome: payload.outcome as string,
    continuationIdHex: payload.continuation_id_hex as string,
  };
}

async function callAdmitRpc(
  client: pg.Client,
  args: {
    continuationId: Buffer;
    buyerDigest: string;
    action: string;
    touchKey: Buffer;
    touchAtMs: number;
    fingerprint: string;
  },
): Promise<string> {
  const result = await client.query(
    `select public.m55_r5_attribution_admit_qualified_touch_v1($1, $2, $3, $4, $5, $6, 'v1', 'v1') as payload`,
    [
      args.continuationId,
      args.buyerDigest,
      args.action,
      args.touchKey,
      args.touchAtMs,
      args.fingerprint,
    ],
  );
  const payload = result.rows[0].payload as Record<string, unknown>;
  return payload.outcome as string;
}

const S2_LOCAL_TEST_SOURCE = readFileSync(
  join(process.cwd(), 'lib/m55/attribution/r5TouchIngestSecurity.local.test.ts'),
  'utf8',
);

describe('r5TouchIngestSecurity.local — harness isolation (static)', () => {
  it('does not import the S1 local test module', () => {
    assert.doesNotMatch(
      S2_LOCAL_TEST_SOURCE,
      /from\s+['"]\.\/r5TouchSchemaSecurity\.local\.test['"]/,
    );
  });

  it('registers exactly one top-level before hook in this execution unit', () => {
    assert.equal((S2_LOCAL_TEST_SOURCE.match(/\bbefore\s*\(/g) ?? []).length, 1);
  });

  it('has a singular R4 migration apply path', () => {
    assert.equal(
      (S2_LOCAL_TEST_SOURCE.match(/applyMigration\s*\(\s*adminClient\s*,\s*R4_MIGRATION\s*\)/g) ?? [])
        .length,
      1,
    );
  });
});

const safety = evaluateLocalDatabaseSafety();

if (!safety.ok) {
  describe('r5TouchIngestSecurity.local — safety refusal', () => {
    it('refuses mutation-capable proof when safety predicate fails', () => {
      throw new Error(`SAFETY_REFUSAL: ${safety.reason}`);
    });
  });
} else {
  const adminClient = new pg.Client({ connectionString: safety.url });

  before(async () => {
    await adminClient.connect();
    if (!(await adminClient.query(`select to_regclass('public.m55_creator_profiles')`)).rows[0].to_regclass) {
      await applyMigration(adminClient, R4_MIGRATION);
    }
    if (!(await adminClient.query(`select to_regclass('public.m55_creator_referral_links')`)).rows[0].to_regclass) {
      await applyMigration(adminClient, S1_MIGRATION);
    }
    if (!(await adminClient.query(`select to_regclass('public.m55_r5_attribution_touch_continuations')`)).rows[0].to_regclass) {
      await applyMigration(adminClient, S2_MIGRATION);
    }
  });

  after(async () => {
    await adminClient.end();
  });

  describe('r5TouchIngestSecurity.local — create continuation RPC', () => {
    it('creates INTENT_CREATED and reuses active cookie binding', async () => {
      const fixture = await insertCreatorFixture(adminClient, `create-${randomUUID()}`);
      const continuationId = randomBytes(16);
      const created = await callCreateRpc(adminClient, {
        cookieId: null,
        newId: continuationId,
        tokenDigest: fixture.tokenDigest,
        action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        directDigest: null,
      });
      assert.equal(created.outcome, 'INTENT_CREATED');

      const reused = await callCreateRpc(adminClient, {
        cookieId: continuationId,
        newId: randomBytes(16),
        tokenDigest: fixture.tokenDigest,
        action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        directDigest: null,
      });
      assert.equal(reused.outcome, 'INTENT_REUSED');
      assert.equal(reused.continuationIdHex, continuationId.toString('hex'));
    });

    it('mints fresh continuation when cookie row is consumed', async () => {
      const fixture = await insertCreatorFixture(adminClient, `consumed-${randomUUID()}`);
      const continuationId = randomBytes(16);
      await callCreateRpc(adminClient, {
        cookieId: null,
        newId: continuationId,
        tokenDigest: fixture.tokenDigest,
        action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        directDigest: null,
      });

      const buyerDigest = sha256LowerHex(`buyer-${randomUUID()}`);
      const touchKey = uniqueTouchKeyBytes();
      const touchAtMs = 1_700_000_000_444;
      const fingerprint = computeQualifiedTouchPayloadFingerprintV1({
        qualifiedActionKind: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        tokenVersion: 'v1',
        tokenDigest: fixture.tokenDigest,
        qualifiedTouchAtMs: touchAtMs,
        trackingContractVersion: 'v1',
        attributionPolicyVersion: 'v1',
      });
      assert.equal(
        await callAdmitRpc(adminClient, {
          continuationId,
          buyerDigest,
          action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
          touchKey,
          touchAtMs,
          fingerprint,
        }),
        'INSERTED',
      );

      const consumedRow = await adminClient.query(
        `select consumed_at, touch_event_key_bytes, qualified_touch_at_ms, payload_fingerprint
         from public.m55_r5_attribution_touch_continuations
         where continuation_id = $1`,
        [continuationId],
      );
      assert.ok(consumedRow.rows[0].consumed_at);
      assert.ok(consumedRow.rows[0].touch_event_key_bytes);
      assert.ok(consumedRow.rows[0].qualified_touch_at_ms);
      assert.ok(consumedRow.rows[0].payload_fingerprint);

      const freshId = randomBytes(16);
      const created = await callCreateRpc(adminClient, {
        cookieId: continuationId,
        newId: freshId,
        tokenDigest: fixture.tokenDigest,
        action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        directDigest: null,
      });
      assert.equal(created.outcome, 'INTENT_CREATED');
      assert.equal(created.continuationIdHex, freshId.toString('hex'));
    });

    it('mints fresh continuation when cookie row is expired and leaves historical row untouched', async () => {
      const fixture = await insertCreatorFixture(adminClient, `expired-${randomUUID()}`);
      const expiredContinuationId = randomBytes(16);
      const expiredInsert = await adminClient.query(
        `insert into public.m55_r5_attribution_touch_continuations (
           continuation_id, token_version, token_digest, qualified_action_kind,
           direct_buyer_subject_lookup_digest, created_at
         ) values ($1, 'v1', $2, 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION', null, now() - interval '20 minutes')
         returning continuation_id, created_at, expires_at, consumed_at`,
        [expiredContinuationId, fixture.tokenDigest],
      );
      const expiredSnapshot = expiredInsert.rows[0] as {
        created_at: Date;
        expires_at: Date;
        consumed_at: Date | null;
      };
      assert.equal(expiredSnapshot.consumed_at, null);
      assert.ok(expiredSnapshot.expires_at <= new Date());

      const freshId = randomBytes(16);
      const created = await callCreateRpc(adminClient, {
        cookieId: expiredContinuationId,
        newId: freshId,
        tokenDigest: fixture.tokenDigest,
        action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        directDigest: null,
      });
      assert.equal(created.outcome, 'INTENT_CREATED');
      assert.equal(created.continuationIdHex, freshId.toString('hex'));

      const historicalRow = await adminClient.query(
        `select created_at, expires_at, consumed_at
         from public.m55_r5_attribution_touch_continuations
         where continuation_id = $1`,
        [expiredContinuationId],
      );
      assert.equal(historicalRow.rows[0].consumed_at, null);
      assert.equal(
        new Date(historicalRow.rows[0].created_at as Date).toISOString(),
        new Date(expiredSnapshot.created_at).toISOString(),
      );
      assert.equal(
        new Date(historicalRow.rows[0].expires_at as Date).toISOString(),
        new Date(expiredSnapshot.expires_at).toISOString(),
      );
    });

    it('mints supplied continuation when cookie id is stale and absent from storage', async () => {
      const fixture = await insertCreatorFixture(adminClient, `stale-cookie-${randomUUID()}`);
      const staleCookieId = randomBytes(16);
      const freshId = randomBytes(16);
      const absent = await adminClient.query(
        `select 1 from public.m55_r5_attribution_touch_continuations where continuation_id = $1`,
        [staleCookieId],
      );
      assert.equal(absent.rowCount, 0);

      const created = await callCreateRpc(adminClient, {
        cookieId: staleCookieId,
        newId: freshId,
        tokenDigest: fixture.tokenDigest,
        action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        directDigest: null,
      });
      assert.equal(created.outcome, 'INTENT_CREATED');
      assert.equal(created.continuationIdHex, freshId.toString('hex'));
    });
  });

  describe('r5TouchIngestSecurity.local — admit RPC', () => {
    it('completes PREAUTH authenticated admission with buyer-bound touch and consumed continuation', async () => {
      const fixture = await insertCreatorFixture(adminClient, `preauth-${randomUUID()}`);
      const continuationId = randomBytes(16);
      await callCreateRpc(adminClient, {
        cookieId: null,
        newId: continuationId,
        tokenDigest: fixture.tokenDigest,
        action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        directDigest: null,
      });

      const preauthRow = await adminClient.query(
        `select qualified_action_kind, direct_buyer_subject_lookup_digest, consumed_at
         from public.m55_r5_attribution_touch_continuations
         where continuation_id = $1`,
        [continuationId],
      );
      assert.equal(
        preauthRow.rows[0].qualified_action_kind,
        'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
      );
      assert.equal(preauthRow.rows[0].direct_buyer_subject_lookup_digest, null);
      assert.equal(preauthRow.rows[0].consumed_at, null);

      const buyerDigest = sha256LowerHex(`buyer-${randomUUID()}`);
      const touchKey = uniqueTouchKeyBytes();
      const touchAtMs = 1_700_000_000_555;
      const fingerprint = computeQualifiedTouchPayloadFingerprintV1({
        qualifiedActionKind: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        tokenVersion: 'v1',
        tokenDigest: fixture.tokenDigest,
        qualifiedTouchAtMs: touchAtMs,
        trackingContractVersion: 'v1',
        attributionPolicyVersion: 'v1',
      });

      assert.equal(
        await callAdmitRpc(adminClient, {
          continuationId,
          buyerDigest,
          action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
          touchKey,
          touchAtMs,
          fingerprint,
        }),
        'INSERTED',
      );

      const continuationAfter = await adminClient.query(
        `select consumed_at, qualified_action_kind, direct_buyer_subject_lookup_digest
         from public.m55_r5_attribution_touch_continuations
         where continuation_id = $1`,
        [continuationId],
      );
      assert.ok(continuationAfter.rows[0].consumed_at);
      assert.equal(
        continuationAfter.rows[0].qualified_action_kind,
        'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
      );
      assert.equal(continuationAfter.rows[0].direct_buyer_subject_lookup_digest, null);

      const touchRow = await adminClient.query(
        `select t.qualified_action_kind, t.buyer_subject_id, b.clerk_subject_lookup_digest
         from public.m55_creator_qualified_touches as t
         join public.m55_attribution_buyer_subjects as b on b.id = t.buyer_subject_id
         where t.touch_event_key_bytes = $1`,
        [touchKey],
      );
      assert.equal(touchRow.rowCount, 1);
      assert.equal(
        touchRow.rows[0].qualified_action_kind,
        'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
      );
      assert.equal(touchRow.rows[0].clerk_subject_lookup_digest, buyerDigest);
    });

    it('inserts DIRECT touch and converges exact retry', async () => {
      const fixture = await insertCreatorFixture(adminClient, `direct-${randomUUID()}`);
      const buyerDigest = sha256LowerHex(`buyer-${randomUUID()}`);
      const continuationId = randomBytes(16);
      await callCreateRpc(adminClient, {
        cookieId: null,
        newId: continuationId,
        tokenDigest: fixture.tokenDigest,
        action: 'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK',
        directDigest: buyerDigest,
      });

      const touchKey = uniqueTouchKeyBytes();
      const touchAtMs = 1_700_000_000_111;
      const fingerprint = computeQualifiedTouchPayloadFingerprintV1({
        qualifiedActionKind: 'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK',
        tokenVersion: 'v1',
        tokenDigest: fixture.tokenDigest,
        qualifiedTouchAtMs: touchAtMs,
        trackingContractVersion: 'v1',
        attributionPolicyVersion: 'v1',
      });

      const inserted = await callAdmitRpc(adminClient, {
        continuationId,
        buyerDigest,
        action: 'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK',
        touchKey,
        touchAtMs,
        fingerprint,
      });
      assert.equal(inserted, 'INSERTED');

      const converged = await callAdmitRpc(adminClient, {
        continuationId,
        buyerDigest,
        action: 'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK',
        touchKey,
        touchAtMs,
        fingerprint,
      });
      assert.equal(converged, 'CONVERGED');
    });

    it('converges a legally bound unconsumed continuation without rewriting consumed_at or the touch triple', async () => {
      const fixture = await insertCreatorFixture(adminClient, `bound-null-${randomUUID()}`);
      const buyerDigest = sha256LowerHex(`buyer-${randomUUID()}`);
      const continuationId = randomBytes(16);
      await callCreateRpc(adminClient, {
        cookieId: null,
        newId: continuationId,
        tokenDigest: fixture.tokenDigest,
        action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        directDigest: null,
      });

      const touchKey = uniqueTouchKeyBytes();
      const touchAtMs = 1_700_000_000_666;
      const fingerprint = computeQualifiedTouchPayloadFingerprintV1({
        qualifiedActionKind: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        tokenVersion: 'v1',
        tokenDigest: fixture.tokenDigest,
        qualifiedTouchAtMs: touchAtMs,
        trackingContractVersion: 'v1',
        attributionPolicyVersion: 'v1',
      });

      await adminClient.query(
        `update public.m55_r5_attribution_touch_continuations
         set touch_event_key_bytes = $2,
             qualified_touch_at_ms = $3,
             payload_fingerprint = $4
         where continuation_id = $1`,
        [continuationId, touchKey, touchAtMs, fingerprint],
      );

      const buyer = await adminClient.query(
        `insert into public.m55_attribution_buyer_subjects (
           clerk_subject_lookup_digest, identity_state
         ) values ($1, 'ACTIVE')
         returning id`,
        [buyerDigest],
      );
      await adminClient.query(
        `insert into public.m55_creator_qualified_touches (
           buyer_subject_id, creator_referral_link_id, creator_economic_identity_id,
           tracking_lane, qualified_touch_at_ms, touch_event_key_bytes, payload_fingerprint,
           qualified_action_kind, tracking_contract_version, attribution_policy_version
         ) values ($1, $2, $3, 'CREATOR', $4, $5, $6, $7, 'v1', 'v1')`,
        [
          buyer.rows[0].id,
          fixture.linkId,
          fixture.economicIdentityId,
          touchAtMs,
          touchKey,
          fingerprint,
          'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        ],
      );

      const before = await adminClient.query(
        `select consumed_at, token_digest, qualified_action_kind,
                encode(touch_event_key_bytes, 'hex') as touch_hex,
                qualified_touch_at_ms, payload_fingerprint
         from public.m55_r5_attribution_touch_continuations
         where continuation_id = $1`,
        [continuationId],
      );
      assert.equal(before.rows[0].consumed_at, null);
      assert.equal(before.rows[0].touch_hex, touchKey.toString('hex'));

      assert.equal(
        await callAdmitRpc(adminClient, {
          continuationId,
          buyerDigest,
          action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
          touchKey: uniqueTouchKeyBytes(),
          touchAtMs: 1_700_000_000_777,
          fingerprint: 'c'.repeat(64),
        }),
        'CONVERGED',
      );

      const after = await adminClient.query(
        `select consumed_at, token_digest, qualified_action_kind,
                encode(touch_event_key_bytes, 'hex') as touch_hex,
                qualified_touch_at_ms, payload_fingerprint
         from public.m55_r5_attribution_touch_continuations
         where continuation_id = $1`,
        [continuationId],
      );
      assert.equal(after.rows[0].consumed_at, null);
      assert.equal(after.rows[0].token_digest, before.rows[0].token_digest);
      assert.equal(after.rows[0].qualified_action_kind, before.rows[0].qualified_action_kind);
      assert.equal(after.rows[0].touch_hex, before.rows[0].touch_hex);
      assert.equal(Number(after.rows[0].qualified_touch_at_ms), Number(before.rows[0].qualified_touch_at_ms));
      assert.equal(after.rows[0].payload_fingerprint, before.rows[0].payload_fingerprint);
    });

    it('converges historical retry after link retirement and creator suspension', async () => {
      const fixture = await insertCreatorFixture(adminClient, `hist-${randomUUID()}`);
      const buyerDigest = sha256LowerHex(`buyer-${randomUUID()}`);
      const continuationId = randomBytes(16);
      await callCreateRpc(adminClient, {
        cookieId: null,
        newId: continuationId,
        tokenDigest: fixture.tokenDigest,
        action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        directDigest: null,
      });
      const touchKey = uniqueTouchKeyBytes();
      const touchAtMs = 1_700_000_000_222;
      const fingerprint = computeQualifiedTouchPayloadFingerprintV1({
        qualifiedActionKind: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        tokenVersion: 'v1',
        tokenDigest: fixture.tokenDigest,
        qualifiedTouchAtMs: touchAtMs,
        trackingContractVersion: 'v1',
        attributionPolicyVersion: 'v1',
      });
      assert.equal(
        await callAdmitRpc(adminClient, {
          continuationId,
          buyerDigest,
          action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
          touchKey,
          touchAtMs,
          fingerprint,
        }),
        'INSERTED',
      );

      await adminClient.query(
        `update public.m55_creator_referral_links
         set ingest_state = 'RETIRED_OR_REVOKED', retired_at = now()
         where id = $1`,
        [fixture.linkId],
      );
      await adminClient.query(
        `update public.m55_creator_profiles set status = 'SUSPENDED' where id = $1`,
        [fixture.profileId],
      );

      assert.equal(
        await callAdmitRpc(adminClient, {
          continuationId,
          buyerDigest,
          action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
          touchKey,
          touchAtMs,
          fingerprint,
        }),
        'CONVERGED',
      );
    });

    it('converges historical retry when buyer subject is DELETED', async () => {
      const fixture = await insertCreatorFixture(adminClient, `deleted-${randomUUID()}`);
      const buyerDigest = sha256LowerHex(`buyer-${randomUUID()}`);
      const continuationId = randomBytes(16);
      await callCreateRpc(adminClient, {
        cookieId: null,
        newId: continuationId,
        tokenDigest: fixture.tokenDigest,
        action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        directDigest: null,
      });
      const touchKey = uniqueTouchKeyBytes();
      const touchAtMs = 1_700_000_000_333;
      const fingerprint = computeQualifiedTouchPayloadFingerprintV1({
        qualifiedActionKind: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        tokenVersion: 'v1',
        tokenDigest: fixture.tokenDigest,
        qualifiedTouchAtMs: touchAtMs,
        trackingContractVersion: 'v1',
        attributionPolicyVersion: 'v1',
      });
      assert.equal(
        await callAdmitRpc(adminClient, {
          continuationId,
          buyerDigest,
          action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
          touchKey,
          touchAtMs,
          fingerprint,
        }),
        'INSERTED',
      );
      await adminClient.query(
        `update public.m55_attribution_buyer_subjects
         set identity_state = 'DELETED', deleted_at = now()
         where clerk_subject_lookup_digest = $1`,
        [buyerDigest],
      );
      assert.equal(
        await callAdmitRpc(adminClient, {
          continuationId,
          buyerDigest,
          action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
          touchKey,
          touchAtMs,
          fingerprint,
        }),
        'CONVERGED',
      );
    });

    it('rejects historical retry with different buyer digest', async () => {
      const fixture = await insertCreatorFixture(adminClient, `buyer-mismatch-${randomUUID()}`);
      const buyerDigest = sha256LowerHex(`buyer-${randomUUID()}`);
      const continuationId = randomBytes(16);
      await callCreateRpc(adminClient, {
        cookieId: null,
        newId: continuationId,
        tokenDigest: fixture.tokenDigest,
        action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        directDigest: null,
      });
      const touchKey = uniqueTouchKeyBytes();
      const touchAtMs = 1_700_000_000_444;
      const fingerprint = computeQualifiedTouchPayloadFingerprintV1({
        qualifiedActionKind: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        tokenVersion: 'v1',
        tokenDigest: fixture.tokenDigest,
        qualifiedTouchAtMs: touchAtMs,
        trackingContractVersion: 'v1',
        attributionPolicyVersion: 'v1',
      });
      await callAdmitRpc(adminClient, {
        continuationId,
        buyerDigest,
        action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        touchKey,
        touchAtMs,
        fingerprint,
      });
      await expectPgError(
        () =>
          callAdmitRpc(adminClient, {
            continuationId,
            buyerDigest: sha256LowerHex(`other-${randomUUID()}`),
            action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
            touchKey,
            touchAtMs,
            fingerprint,
          }),
        /CONTINUATION_BUYER_MISMATCH/,
      );
    });

    it('rejects new ingest for DELETED buyer subject', async () => {
      const fixture = await insertCreatorFixture(adminClient, `new-deleted-${randomUUID()}`);
      const buyerDigest = sha256LowerHex(`buyer-${randomUUID()}`);
      await adminClient.query(
        `insert into public.m55_attribution_buyer_subjects (
           clerk_subject_lookup_digest, identity_state
         ) values ($1, 'ACTIVE')`,
        [buyerDigest],
      );
      await adminClient.query(
        `update public.m55_attribution_buyer_subjects
         set identity_state = 'DELETED'
         where clerk_subject_lookup_digest = $1`,
        [buyerDigest],
      );
      const deletedState = await adminClient.query(
        `select identity_state, deleted_at
         from public.m55_attribution_buyer_subjects
         where clerk_subject_lookup_digest = $1`,
        [buyerDigest],
      );
      assert.equal(deletedState.rows[0].identity_state, 'DELETED');
      assert.ok(deletedState.rows[0].deleted_at);
      const continuationId = randomBytes(16);
      await callCreateRpc(adminClient, {
        cookieId: null,
        newId: continuationId,
        tokenDigest: fixture.tokenDigest,
        action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        directDigest: null,
      });
      const touchKey = uniqueTouchKeyBytes();
      const touchAtMs = 1_700_000_000_555;
      const fingerprint = computeQualifiedTouchPayloadFingerprintV1({
        qualifiedActionKind: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        tokenVersion: 'v1',
        tokenDigest: fixture.tokenDigest,
        qualifiedTouchAtMs: touchAtMs,
        trackingContractVersion: 'v1',
        attributionPolicyVersion: 'v1',
      });
      await expectPgError(
        () =>
          callAdmitRpc(adminClient, {
            continuationId,
            buyerDigest,
            action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
            touchKey,
            touchAtMs,
            fingerprint,
          }),
        /BUYER_SUBJECT_DELETED/,
      );
    });

    it('rejects new ingest for inactive link and creator', async () => {
      const inactiveLink = await insertCreatorFixture(adminClient, `inactive-link-${randomUUID()}`);
      await adminClient.query(
        `update public.m55_creator_referral_links
         set ingest_state = 'RETIRED_OR_REVOKED', retired_at = now()
         where id = $1`,
        [inactiveLink.linkId],
      );
      const continuationId = randomBytes(16);
      await callCreateRpc(adminClient, {
        cookieId: null,
        newId: continuationId,
        tokenDigest: inactiveLink.tokenDigest,
        action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        directDigest: null,
      });
      const touchKey = uniqueTouchKeyBytes();
      const touchAtMs = 1_700_000_000_666;
      const fingerprint = computeQualifiedTouchPayloadFingerprintV1({
        qualifiedActionKind: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        tokenVersion: 'v1',
        tokenDigest: inactiveLink.tokenDigest,
        qualifiedTouchAtMs: touchAtMs,
        trackingContractVersion: 'v1',
        attributionPolicyVersion: 'v1',
      });
      await expectPgError(
        () =>
          callAdmitRpc(adminClient, {
            continuationId,
            buyerDigest: sha256LowerHex(`buyer-${randomUUID()}`),
            action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
            touchKey,
            touchAtMs,
            fingerprint,
          }),
        /LINK_NOT_ACTIVE_FOR_NEW_TOUCH/,
      );

      const inactiveCreator = await insertCreatorFixture(
        adminClient,
        `inactive-creator-${randomUUID()}`,
        'SUSPENDED',
      );
      const continuationId2 = randomBytes(16);
      await callCreateRpc(adminClient, {
        cookieId: null,
        newId: continuationId2,
        tokenDigest: inactiveCreator.tokenDigest,
        action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        directDigest: null,
      });
      await expectPgError(
        () =>
          callAdmitRpc(adminClient, {
            continuationId: continuationId2,
            buyerDigest: sha256LowerHex(`buyer-${randomUUID()}`),
            action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
            touchKey: uniqueTouchKeyBytes(),
            touchAtMs: 1_700_000_000_777,
            fingerprint: computeQualifiedTouchPayloadFingerprintV1({
              qualifiedActionKind: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
              tokenVersion: 'v1',
              tokenDigest: inactiveCreator.tokenDigest,
              qualifiedTouchAtMs: 1_700_000_000_777,
              trackingContractVersion: 'v1',
              attributionPolicyVersion: 'v1',
            }),
          }),
        /CREATOR_NOT_ACTIVE_FOR_NEW_TOUCH/,
      );
    });

    it('rejects same event key with changed payload and allows second touch on same link', async () => {
      const fixture = await insertCreatorFixture(adminClient, `payload-${randomUUID()}`);
      const buyerDigest = sha256LowerHex(`buyer-${randomUUID()}`);
      const touchKey = uniqueTouchKeyBytes();
      const touchAtMs = 1_700_000_000_888;
      const fingerprint = computeQualifiedTouchPayloadFingerprintV1({
        qualifiedActionKind: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        tokenVersion: 'v1',
        tokenDigest: fixture.tokenDigest,
        qualifiedTouchAtMs: touchAtMs,
        trackingContractVersion: 'v1',
        attributionPolicyVersion: 'v1',
      });

      const continuationA = randomBytes(16);
      await callCreateRpc(adminClient, {
        cookieId: null,
        newId: continuationA,
        tokenDigest: fixture.tokenDigest,
        action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        directDigest: null,
      });
      await callAdmitRpc(adminClient, {
        continuationId: continuationA,
        buyerDigest,
        action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        touchKey,
        touchAtMs,
        fingerprint,
      });

      const continuationB = randomBytes(16);
      await callCreateRpc(adminClient, {
        cookieId: null,
        newId: continuationB,
        tokenDigest: fixture.tokenDigest,
        action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        directDigest: null,
      });
      await expectPgError(
        () =>
          callAdmitRpc(adminClient, {
            continuationId: continuationB,
            buyerDigest,
            action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
            touchKey,
            touchAtMs,
            fingerprint: sha256LowerHex('different-payload'),
          }),
        /TOUCH_KEY_PAYLOAD_MISMATCH/,
      );

      const continuationC = randomBytes(16);
      await callCreateRpc(adminClient, {
        cookieId: null,
        newId: continuationC,
        tokenDigest: fixture.tokenDigest,
        action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        directDigest: null,
      });
      const secondKey = uniqueTouchKeyBytes();
      const secondAtMs = 1_700_000_000_999;
      const secondFingerprint = computeQualifiedTouchPayloadFingerprintV1({
        qualifiedActionKind: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        tokenVersion: 'v1',
        tokenDigest: fixture.tokenDigest,
        qualifiedTouchAtMs: secondAtMs,
        trackingContractVersion: 'v1',
        attributionPolicyVersion: 'v1',
      });
      assert.equal(
        await callAdmitRpc(adminClient, {
          continuationId: continuationC,
          buyerDigest,
          action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
          touchKey: secondKey,
          touchAtMs: secondAtMs,
          fingerprint: secondFingerprint,
        }),
        'INSERTED',
      );
    });

    it('converges concurrent retry that minted a different unused candidate', async () => {
      const fixture = await insertCreatorFixture(adminClient, `race-${randomUUID()}`);
      const buyerDigest = sha256LowerHex(`buyer-${randomUUID()}`);
      const continuationId = randomBytes(16);
      await callCreateRpc(adminClient, {
        cookieId: null,
        newId: continuationId,
        tokenDigest: fixture.tokenDigest,
        action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        directDigest: null,
      });
      const action = 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION';
      const candidateA = {
        continuationId,
        buyerDigest,
        action,
        touchKey: uniqueTouchKeyBytes(),
        touchAtMs: 1_700_000_001_111,
        fingerprint: computeQualifiedTouchPayloadFingerprintV1({
          qualifiedActionKind: action,
          tokenVersion: 'v1',
          tokenDigest: fixture.tokenDigest,
          qualifiedTouchAtMs: 1_700_000_001_111,
          trackingContractVersion: 'v1',
          attributionPolicyVersion: 'v1',
        }),
      };
      const candidateB = {
        continuationId,
        buyerDigest,
        action,
        touchKey: uniqueTouchKeyBytes(),
        touchAtMs: 1_700_000_001_222,
        fingerprint: computeQualifiedTouchPayloadFingerprintV1({
          qualifiedActionKind: action,
          tokenVersion: 'v1',
          tokenDigest: fixture.tokenDigest,
          qualifiedTouchAtMs: 1_700_000_001_222,
          trackingContractVersion: 'v1',
          attributionPolicyVersion: 'v1',
        }),
      };
      const clientA = new pg.Client({ connectionString: safety.url });
      const clientB = new pg.Client({ connectionString: safety.url });
      await clientA.connect();
      await clientB.connect();
      try {
        const settled = await Promise.allSettled([
          callAdmitRpc(clientA, candidateA),
          callAdmitRpc(clientB, candidateB),
        ]);
        const outcomes = settled.map((entry) => {
          if (entry.status !== 'fulfilled') {
            const reason = entry.reason instanceof Error ? entry.reason.message : String(entry.reason);
            throw new Error(`concurrent admit failed: ${reason}`);
          }
          return entry.value;
        });
        assert.deepEqual([...outcomes].sort(), ['CONVERGED', 'INSERTED']);
        const touches = await adminClient.query(
          `select count(*)::int as count
           from public.m55_creator_qualified_touches
           where creator_referral_link_id = $1`,
          [fixture.linkId],
        );
        assert.equal(touches.rows[0].count, 1);
      } finally {
        await clientA.end();
        await clientB.end();
      }
    });

    it('rolls back failed admit without partial buyer subject mutation', async () => {
      const fixture = await insertCreatorFixture(adminClient, `rollback-${randomUUID()}`);
      const buyerDigest = sha256LowerHex(`buyer-${randomUUID()}`);
      const continuationId = randomBytes(16);
      await callCreateRpc(adminClient, {
        cookieId: null,
        newId: continuationId,
        tokenDigest: fixture.tokenDigest,
        action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
        directDigest: null,
      });
      const beforeCount = await adminClient.query(
        `select count(*)::int as count from public.m55_attribution_buyer_subjects where clerk_subject_lookup_digest = $1`,
        [buyerDigest],
      );
      assert.equal(beforeCount.rows[0].count, 0);
      await expectPgError(
        () =>
          callAdmitRpc(adminClient, {
            continuationId,
            buyerDigest,
            action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
            touchKey: uniqueTouchKeyBytes(),
            touchAtMs: 1_700_000_001_000,
            fingerprint: 'not-a-valid-fingerprint',
          }),
        /INVALID_INPUT/,
      );
      const afterCount = await adminClient.query(
        `select count(*)::int as count from public.m55_attribution_buyer_subjects where clerk_subject_lookup_digest = $1`,
        [buyerDigest],
      );
      assert.equal(afterCount.rows[0].count, 0);
    });
  });

  describe('r5TouchIngestSecurity.local — privilege model', () => {
    it('denies anon/authenticated execute on admit RPC', async () => {
      const anon = new pg.Client({ connectionString: safety.url });
      await anon.connect();
      try {
        await anon.query('set role anon');
        await expectPgError(
          () =>
            anon.query(
              `select public.m55_r5_attribution_admit_qualified_touch_v1($1,$2,$3,$4,$5,$6,'v1','v1')`,
              [randomBytes(16), 'a'.repeat(64), 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION', randomBytes(16), 1, 'a'.repeat(64)],
            ),
          /permission denied|must be owner|insufficient_privilege/i,
        );
      } finally {
        await anon.query('reset role');
        await anon.end();
      }
    });

    it('allows service_role execute on create RPC', async () => {
      const fixture = await insertCreatorFixture(adminClient, `svc-${randomUUID()}`);
      const service = new pg.Client({ connectionString: safety.url });
      await service.connect();
      try {
        await service.query('set role service_role');
        const result = await service.query(
          `select public.m55_r5_attribution_create_touch_continuation_v1($1,$2,$3,'v1',$4,$5) as payload`,
          [
            null,
            randomBytes(16),
            fixture.tokenDigest,
            'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
            null,
          ],
        );
        const payload = result.rows[0].payload as Record<string, unknown>;
        assert.equal(payload.outcome, 'INTENT_CREATED');
      } finally {
        await service.query('reset role');
        await service.end();
      }
    });
  });
}

async function expectPgError(fn: () => Promise<unknown>, matcher: RegExp): Promise<void> {
  try {
    await fn();
    assert.fail(`expected error matching ${matcher}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert.match(message, matcher);
  }
}
