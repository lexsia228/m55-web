import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import pg from 'pg';
import { M55_R5_TOUCH_INGEST_MIGRATION_FILENAME } from './r5TouchIngestContract';
import { M55_R5_TOUCH_SCHEMA_MIGRATION_FILENAME } from './r5TouchSchemaContract';
import { M55_R5_PURCHASE_LOCK_MIGRATION_FILENAME } from './r5PurchaseAttemptContract';

const R4_MIGRATION = '20260914000000_m55_creator_distribution_foundation_v1.sql';
const S1_MIGRATION = M55_R5_TOUCH_SCHEMA_MIGRATION_FILENAME;
const S2_MIGRATION = M55_R5_TOUCH_INGEST_MIGRATION_FILENAME;
const R5B_MIGRATION = M55_R5_PURCHASE_LOCK_MIGRATION_FILENAME;

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

type SafetyEvaluation =
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

function evaluateLocalDatabaseSafety(): SafetyEvaluation {
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

async function tableExists(client: pg.Client, tableName: string): Promise<boolean> {
  const result = await client.query(
    `select 1 from information_schema.tables where table_schema = 'public' and table_name = $1`,
    [tableName],
  );
  return result.rowCount === 1;
}

function sha256LowerHex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
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

async function expectPgErrorPreservingTx(
  client: pg.Client,
  fn: () => Promise<unknown>,
  matcher: RegExp,
): Promise<void> {
  await client.query('savepoint m55_r5b_expect_err');
  try {
    await expectPgError(fn, matcher);
  } finally {
    await client.query('rollback to savepoint m55_r5b_expect_err');
  }
}

async function currentEpochMs(client: pg.Client): Promise<number> {
  const result = await client.query(
    `select floor(extract(epoch from clock_timestamp()) * 1000)::bigint as ms`,
  );
  return Number(result.rows[0].ms);
}

async function getAuthorityEpochMs(client: pg.Client): Promise<number> {
  const result = await client.query(
    `select creator_status_history_authority_epoch_ms as epoch
     from public.m55_r5_attribution_control_constants
     where singleton = true`,
  );
  return Number(result.rows[0].epoch);
}

async function insertCreator(
  client: pg.Client,
  suffix: string,
  status = 'ACTIVE',
  termsVersion = '2026-09-13-v1',
): Promise<{ profileId: string; economicIdentityId: string; linkId: string }> {
  const clerkUserId = `creator_${suffix}`.slice(0, 128);
  const application = await client.query(
    `insert into public.m55_creator_applications (
       clerk_user_id, application_source, age_18_plus_attested, japan_resident_attested,
       content_focus_safe, terms_version, terms_accepted_at, status
     ) values ($1, 'PUBLIC_APPLICATION', true, true, 'test focus', $2, now(), 'APPROVED_PENDING_ACTIVATION')
     returning id`,
    [clerkUserId, termsVersion],
  );
  const profile = await client.query(
    `insert into public.m55_creator_profiles (
       clerk_user_id, originating_application_id, creator_code, first_final_approved_at,
       terms_version, terms_accepted_at, status
     ) values ($1, $2, $3, now(), $4, now(), $5)
     returning id, economic_identity_id`,
    [clerkUserId, application.rows[0].id, `cr_${suffix}`.slice(0, 40), termsVersion, status],
  );
  const link = await client.query(
    `insert into public.m55_creator_referral_links (
       creator_profile_id, creator_economic_identity_id, token_version, token_digest, ingest_state
     ) values ($1, $2, 'v1', $3, 'ACTIVE')
     returning id`,
    [profile.rows[0].id, profile.rows[0].economic_identity_id, sha256LowerHex(`token-${suffix}`)],
  );
  return {
    profileId: profile.rows[0].id as string,
    economicIdentityId: profile.rows[0].economic_identity_id as string,
    linkId: link.rows[0].id as string,
  };
}

async function setupLockedWinnerWithBinding(
  client: pg.Client,
  suffix: string,
  existingCreator?: { profileId: string; economicIdentityId: string; linkId: string },
): Promise<{
  attemptId: string;
  sessionId: string;
  paymentIntentId: string;
  creator: { profileId: string; economicIdentityId: string; linkId: string };
}> {
  const creator = existingCreator ?? (await insertCreator(client, suffix, 'ACTIVE', '2026-09-13-v1'));
  const buyerDigest = sha256LowerHex(`buyer-${suffix}`);
  const nowMs = await currentEpochMs(client);
  const buyer = await client.query(
    `insert into public.m55_attribution_buyer_subjects (clerk_subject_lookup_digest, identity_state)
     values ($1, 'ACTIVE') returning id`,
    [buyerDigest],
  );
  await client.query(
    `insert into public.m55_creator_qualified_touches (
       buyer_subject_id, creator_referral_link_id, creator_economic_identity_id,
       tracking_lane, qualified_touch_at_ms, touch_event_key_bytes, payload_fingerprint,
       qualified_action_kind, tracking_contract_version, attribution_policy_version
     ) values ($1, $2, $3, 'CREATOR', $4, $5, $6, 'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK', 'v1', 'v1')`,
    [
      buyer.rows[0].id,
      creator.linkId,
      creator.economicIdentityId,
      nowMs - 60_000,
      randomBytes(16),
      sha256LowerHex(`fp-${suffix}`),
    ],
  );
  await client.query('set local role service_role');
  const locked = await client.query(
    `select public.m55_r5_attribution_lock_purchase_attempt_v1(
       $1, 'dtr_core_light_v1', 'M55_PREMIUM_REPORT_LIGHT', 'FIRST_ELIGIBLE_PAID',
       $2, $3, $3, null, 'v1', 'v1'
     ) as payload`,
    [buyerDigest, `scope-${suffix}`, nowMs],
  );
  assert.equal(locked.rows[0].payload.outcome, 'LOCKED_WINNER');
  const attemptId = locked.rows[0].payload.purchase_attempt_id as string;
  const sessionId = `cs_${suffix}`;
  const paymentIntentId = `pi_${suffix}`;
  await client.query(
    `select public.m55_r5_attribution_bind_checkout_session_v1($1, $2, $3, $4) as payload`,
    [attemptId, sessionId, paymentIntentId, nowMs + 3_600_000],
  );
  return { attemptId, sessionId, paymentIntentId, creator };
}

async function recordCanonicalPayment(
  client: pg.Client,
  eventId: string,
  paymentIntentId: string,
  canonicalMs: number,
  sessionId: string,
  metadataAttemptId: string | null = null,
): Promise<pg.QueryResult> {
  return client.query(
    `select public.m55_r5_attribution_record_canonical_payment_v1(
       $1, $2, $3, $4, $5
     ) as payload`,
    [eventId, paymentIntentId, canonicalMs, sessionId, metadataAttemptId],
  );
}

const safety = evaluateLocalDatabaseSafety();

describe('r5PurchaseLockSecurity.local — environment identity', () => {
  it('uses disposable loopback only', () => {
    if (!safety.ok) {
      throw new Error(`SAFETY_REFUSAL: ${safety.reason}`);
    }
    assert.match(safety.redactedTarget, /localhost|127\.0\.0\.1|::1/);
    assert.doesNotMatch(safety.redactedTarget, /supabase\.co|preview|production/i);
  });
});

if (!safety.ok) {
  describe('r5PurchaseLockSecurity.local — skipped without disposable PG', () => {
    it('refuses when safety predicate fails', () => {
      throw new Error(`SAFETY_REFUSAL: ${safety.reason}`);
    });
  });
} else {
  const adminClient = new pg.Client({ connectionString: safety.url });

  before(async () => {
    await adminClient.connect();
    const roles = await adminClient.query(
      `select rolname from pg_roles where rolname = any($1::text[])`,
      [REQUIRED_ROLES],
    );
    if (roles.rowCount !== REQUIRED_ROLES.length) {
      throw new Error('SAFETY_REFUSAL: required roles anon/authenticated/service_role are missing');
    }
    if (!(await tableExists(adminClient, 'm55_creator_profiles'))) {
      await applyMigration(adminClient, R4_MIGRATION);
    }
    if (!(await tableExists(adminClient, 'm55_creator_referral_links'))) {
      await applyMigration(adminClient, S1_MIGRATION);
    }
    if (!(await tableExists(adminClient, 'm55_r5_attribution_touch_continuations'))) {
      await applyMigration(adminClient, S2_MIGRATION);
    }
    if (!(await tableExists(adminClient, 'm55_r5_attribution_purchase_attempts'))) {
      await applyMigration(adminClient, R5B_MIGRATION);
    }
  });

  after(async () => {
    await adminClient.end();
  });

  describe('r5PurchaseLockSecurity.local — required cases', () => {
    it('persists PI_LOOKUP_ZERO / MULTIPLE / SESSION_NOT_PAYMENT HOLDs and converges identical retry', async () => {
      await adminClient.query('begin');
      try {
        await adminClient.query('set local role service_role');
        const eventId = `evt_zero_${randomUUID()}`;
        const piId = `pi_zero_${randomUUID()}`;
        const created = Date.now();
        const zero = await adminClient.query(
          `select public.m55_r5_attribution_record_canonical_payment_hold_v1(
             $1, $2, $3, null, null, null, 'PI_LOOKUP_ZERO', 'PROVIDER_ZERO'
           ) as payload`,
          [eventId, piId, created],
        );
        assert.equal(zero.rows[0].payload.outcome, 'HOLD_RECONCILE');
        const retry = await adminClient.query(
          `select public.m55_r5_attribution_record_canonical_payment_hold_v1(
             $1, $2, $3, null, null, null, 'PI_LOOKUP_ZERO', 'PROVIDER_ZERO'
           ) as payload`,
          [eventId, piId, created],
        );
        assert.equal(retry.rows[0].payload.outcome, 'CONVERGED');
        const multiple = await adminClient.query(
          `select public.m55_r5_attribution_record_canonical_payment_hold_v1(
             $1, $2, $3, null, null, null, 'PI_LOOKUP_MULTIPLE', 'PROVIDER_MULTIPLE'
           ) as payload`,
          [`evt_multi_${randomUUID()}`, `pi_multi_${randomUUID()}`, created],
        );
        assert.equal(multiple.rows[0].payload.outcome, 'HOLD_RECONCILE');
        const notPayment = await adminClient.query(
          `select public.m55_r5_attribution_record_canonical_payment_hold_v1(
             $1, $2, $3, null, null, null, 'SESSION_NOT_PAYMENT', 'PROVIDER_NOT_ATTEMPTED'
           ) as payload`,
          [`evt_np_${randomUUID()}`, `pi_np_${randomUUID()}`, created],
        );
        assert.equal(notPayment.rows[0].payload.outcome, 'HOLD_RECONCILE');
      } finally {
        await adminClient.query('rollback');
      }
    });

    it('raises HOLD_PAYLOAD_CONFLICT on conflicting same-event HOLD and does not overwrite', async () => {
      await adminClient.query('begin');
      try {
        await adminClient.query('set local role service_role');
        const eventId = `evt_conflict_${randomUUID()}`;
        const piId = `pi_conflict_${randomUUID()}`;
        const created = Date.now();
        await adminClient.query(
          `select public.m55_r5_attribution_record_canonical_payment_hold_v1(
             $1, $2, $3, null, null, null, 'PI_LOOKUP_ZERO', 'PROVIDER_ZERO'
           ) as payload`,
          [eventId, piId, created],
        );
        await expectPgErrorPreservingTx(
          adminClient,
          () =>
            adminClient.query(
              `select public.m55_r5_attribution_record_canonical_payment_hold_v1(
                 $1, $2, $3, null, null, null, 'PI_LOOKUP_MULTIPLE', 'PROVIDER_MULTIPLE'
               ) as payload`,
              [eventId, piId, created],
            ),
          /HOLD_PAYLOAD_CONFLICT/,
        );
        const row = await adminClient.query(
          `select reason_code from public.m55_r5_attribution_canonical_payment_holds where stripe_canonical_event_id = $1`,
          [eventId],
        );
        assert.equal(row.rows[0].reason_code, 'PI_LOOKUP_ZERO');
      } finally {
        await adminClient.query('rollback');
      }
    });

    it('forbids HOLD and evidence coexistence for the same event or PI', async () => {
      await adminClient.query('begin');
      try {
        await adminClient.query('set local role service_role');
        const eventId = `evt_mutex_${randomUUID()}`;
        const piId = `pi_mutex_${randomUUID()}`;
        await adminClient.query(
          `select public.m55_r5_attribution_record_canonical_payment_hold_v1(
             $1, $2, $3, null, null, null, 'PI_LOOKUP_ZERO', 'PROVIDER_ZERO'
           ) as payload`,
          [eventId, piId, Date.now()],
        );
        await expectPgErrorPreservingTx(
          adminClient,
          () =>
            adminClient.query(
              `insert into public.m55_r5_attribution_canonical_payment_evidence (
                 purchase_attempt_id, stripe_canonical_event_id, payment_intent_id,
                 canonical_event_created_at_ms, creator_status_effective_at_payment,
                 preliminary_r5b_eligibility
               ) values ($1, $2, $3, $4, 'NOT_APPLICABLE', 'NONE')`,
              [randomUUID(), eventId, piId, Date.now()],
            ),
          /HOLD_EVIDENCE_MUTUAL_EXCLUSION|foreign key/i,
        );
      } finally {
        await adminClient.query('rollback');
      }
    });

    it('locks NONE when ACTIVE creator terms are stale and records OBJECTIVE_DENIAL at payment', async () => {
      await adminClient.query('begin');
      try {
        const suffix = randomUUID().slice(0, 8);
        const creator = await insertCreator(adminClient, suffix, 'ACTIVE', 'stale-terms');
        const buyerDigest = sha256LowerHex(`buyer-${suffix}`);
        const buyer = await adminClient.query(
          `insert into public.m55_attribution_buyer_subjects (clerk_subject_lookup_digest, identity_state)
           values ($1, 'ACTIVE') returning id`,
          [buyerDigest],
        );
        await adminClient.query(
          `insert into public.m55_creator_qualified_touches (
             buyer_subject_id, creator_referral_link_id, creator_economic_identity_id,
             tracking_lane, qualified_touch_at_ms, touch_event_key_bytes, payload_fingerprint,
             qualified_action_kind, tracking_contract_version, attribution_policy_version
           ) values ($1, $2, $3, 'CREATOR', $4, $5, $6, 'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK', 'v1', 'v1')`,
          [
            buyer.rows[0].id,
            creator.linkId,
            creator.economicIdentityId,
            Date.now(),
            randomBytes(16),
            sha256LowerHex(`fp-${suffix}`),
          ],
        );
        await adminClient.query('set local role service_role');
        const locked = await adminClient.query(
          `select public.m55_r5_attribution_lock_purchase_attempt_v1(
             $1, 'dtr_core_light_v1', 'M55_PREMIUM_REPORT_LIGHT', 'FIRST_ELIGIBLE_PAID',
             $2, $3, $3, null, 'v1', 'v1'
           ) as payload`,
          [buyerDigest, `scope-${suffix}`, Date.now()],
        );
        assert.equal(locked.rows[0].payload.outcome, 'LOCKED_NONE');
      } finally {
        await adminClient.query('rollback');
      }
    });

    it('uses TRIGGER effective-time at Event.created for terms reacceptance, not current profile row', async () => {
      await adminClient.query('begin');
      try {
        const suffix = randomUUID().slice(0, 8);
        const creator = await insertCreator(adminClient, suffix, 'ACTIVE', '2026-09-13-v1');
        const initialEvent = await adminClient.query(
          `select effective_at_ms
           from public.m55_creator_profile_eligibility_events
           where creator_profile_id = $1 and reason_code = 'TRIGGER'
           order by eligibility_event_seq asc
           limit 1`,
          [creator.profileId],
        );
        const initialEffectiveMs = Number(initialEvent.rows[0].effective_at_ms);
        const setupBefore = await setupLockedWinnerWithBinding(adminClient, `${suffix}-before`, creator);
        const setupAfter = await setupLockedWinnerWithBinding(adminClient, `${suffix}-after`, creator);
        await adminClient.query(
          `update public.m55_creator_profiles
           set terms_version = 'stale-after-lock-v1', terms_accepted_at = clock_timestamp()
           where id = $1`,
          [creator.profileId],
        );
        const staleEvent = await adminClient.query(
          `select effective_at_ms, terms_version
           from public.m55_creator_profile_eligibility_events
           where creator_profile_id = $1 and reason_code = 'TRIGGER'
           order by eligibility_event_seq desc
           limit 1`,
          [creator.profileId],
        );
        const staleEffectiveMs = Number(staleEvent.rows[0].effective_at_ms);
        assert.equal(staleEvent.rows[0].terms_version, 'stale-after-lock-v1');
        assert.ok(staleEffectiveMs > initialEffectiveMs);
        const canonicalBeforeReacceptMs = staleEffectiveMs - 1;
        assert.ok(canonicalBeforeReacceptMs > initialEffectiveMs);
        await adminClient.query('set local role service_role');
        const beforeReaccept = await recordCanonicalPayment(
          adminClient,
          `evt_terms_before_${randomUUID()}`,
          setupBefore.paymentIntentId,
          canonicalBeforeReacceptMs,
          setupBefore.sessionId,
          setupBefore.attemptId,
        );
        assert.equal(beforeReaccept.rows[0].payload.outcome, 'RECORDED');
        const evidenceBefore = await adminClient.query(
          `select preliminary_r5b_eligibility, creator_status_effective_at_payment
           from public.m55_r5_attribution_canonical_payment_evidence
           where payment_intent_id = $1`,
          [setupBefore.paymentIntentId],
        );
        assert.equal(evidenceBefore.rows[0].preliminary_r5b_eligibility, 'CREATOR_CASH');
        assert.equal(evidenceBefore.rows[0].creator_status_effective_at_payment, 'ACTIVE');
        const afterReaccept = await recordCanonicalPayment(
          adminClient,
          `evt_terms_after_${randomUUID()}`,
          setupAfter.paymentIntentId,
          staleEffectiveMs + 1,
          setupAfter.sessionId,
          setupAfter.attemptId,
        );
        assert.equal(afterReaccept.rows[0].payload.outcome, 'RECORDED');
        const evidenceAfter = await adminClient.query(
          `select preliminary_r5b_eligibility, creator_status_effective_at_payment
           from public.m55_r5_attribution_canonical_payment_evidence
           where payment_intent_id = $1`,
          [setupAfter.paymentIntentId],
        );
        assert.equal(evidenceAfter.rows[0].preliminary_r5b_eligibility, 'OBJECTIVE_DENIAL');
        assert.equal(evidenceAfter.rows[0].creator_status_effective_at_payment, 'ACTIVE_TERMS_STALE');
      } finally {
        await adminClient.query('rollback');
      }
    });

    it('holds PRE_EPOCH_STATUS when canonical Event.created is before authority epoch', async () => {
      await adminClient.query('begin');
      try {
        const suffix = randomUUID().slice(0, 8);
        const { attemptId, sessionId, paymentIntentId } =
          await setupLockedWinnerWithBinding(adminClient, suffix);
        const epochMs = await getAuthorityEpochMs(adminClient);
        await adminClient.query('set local role service_role');
        const recorded = await recordCanonicalPayment(
          adminClient,
          `evt_pre_epoch_${randomUUID()}`,
          paymentIntentId,
          epochMs - 1,
          sessionId,
          attemptId,
        );
        assert.equal(recorded.rows[0].payload.outcome, 'HOLD_RECONCILE');
        assert.equal(recorded.rows[0].payload.reason_code, 'PRE_EPOCH_STATUS');
        const hold = await adminClient.query(
          `select reason_code, provider_correlation_state
           from public.m55_r5_attribution_canonical_payment_holds
           where payment_intent_id = $1`,
          [paymentIntentId],
        );
        assert.equal(hold.rows[0].reason_code, 'PRE_EPOCH_STATUS');
        assert.equal(hold.rows[0].provider_correlation_state, 'PROVIDER_VERIFIED');
      } finally {
        await adminClient.query('rollback');
      }
    });

    it('holds SAME_MS_STATUS_COLLISION when eligibility effective_at_ms equals canonical Event.created', async () => {
      await adminClient.query('begin');
      try {
        const suffix = randomUUID().slice(0, 8);
        const creator = await insertCreator(adminClient, suffix, 'ACTIVE', '2026-09-13-v1');
        const triggerEvent = await adminClient.query(
          `select effective_at_ms
           from public.m55_creator_profile_eligibility_events
           where creator_profile_id = $1 and reason_code = 'TRIGGER'
           order by eligibility_event_seq asc
           limit 1`,
          [creator.profileId],
        );
        const collisionMs = Number(triggerEvent.rows[0].effective_at_ms);
        const buyerDigest = sha256LowerHex(`buyer-collision-${suffix}`);
        const buyer = await adminClient.query(
          `insert into public.m55_attribution_buyer_subjects (clerk_subject_lookup_digest, identity_state)
           values ($1, 'ACTIVE') returning id`,
          [buyerDigest],
        );
        await adminClient.query(
          `insert into public.m55_creator_qualified_touches (
             buyer_subject_id, creator_referral_link_id, creator_economic_identity_id,
             tracking_lane, qualified_touch_at_ms, touch_event_key_bytes, payload_fingerprint,
             qualified_action_kind, tracking_contract_version, attribution_policy_version
           ) values ($1, $2, $3, 'CREATOR', $4, $5, $6, 'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK', 'v1', 'v1')`,
          [
            buyer.rows[0].id,
            creator.linkId,
            creator.economicIdentityId,
            collisionMs - 60_000,
            randomBytes(16),
            sha256LowerHex(`fp-collision-${suffix}`),
          ],
        );
        await adminClient.query('set local role service_role');
        const locked = await adminClient.query(
          `select public.m55_r5_attribution_lock_purchase_attempt_v1(
             $1, 'dtr_core_light_v1', 'M55_PREMIUM_REPORT_LIGHT', 'FIRST_ELIGIBLE_PAID',
             $2, $3, $3, null, 'v1', 'v1'
           ) as payload`,
          [buyerDigest, `scope-collision-${suffix}`, collisionMs],
        );
        assert.equal(locked.rows[0].payload.outcome, 'LOCKED_WINNER');
        const attemptId = locked.rows[0].payload.purchase_attempt_id as string;
        const sessionId = `cs_collision_${suffix}`;
        const paymentIntentId = `pi_collision_${suffix}`;
        await adminClient.query(
          `select public.m55_r5_attribution_bind_checkout_session_v1($1, $2, $3, $4) as payload`,
          [attemptId, sessionId, paymentIntentId, collisionMs + 3_600_000],
        );
        const recorded = await recordCanonicalPayment(
          adminClient,
          `evt_same_ms_${randomUUID()}`,
          paymentIntentId,
          collisionMs,
          sessionId,
          attemptId,
        );
        assert.equal(recorded.rows[0].payload.outcome, 'HOLD_RECONCILE');
        assert.equal(recorded.rows[0].payload.reason_code, 'SAME_MS_STATUS_COLLISION');
        const hold = await adminClient.query(
          `select reason_code from public.m55_r5_attribution_canonical_payment_holds where payment_intent_id = $1`,
          [paymentIntentId],
        );
        assert.equal(hold.rows[0].reason_code, 'SAME_MS_STATUS_COLLISION');
      } finally {
        await adminClient.query('rollback');
      }
    });

    it('creates one INITIAL_ROW_SNAPSHOT and rejects a duplicate by frozen uniqueness', async () => {
      await adminClient.query('begin');
      try {
        const suffix = randomUUID().slice(0, 8);
        const epochMs = await getAuthorityEpochMs(adminClient);
        const clerkUserId = `creator_snapshot_${suffix}`.slice(0, 128);
        const application = await adminClient.query(
          `insert into public.m55_creator_applications (
             clerk_user_id, application_source, age_18_plus_attested, japan_resident_attested,
             content_focus_safe, terms_version, terms_accepted_at, status
           ) values ($1, 'PUBLIC_APPLICATION', true, true, 'test focus', '2026-09-13-v1', now(), 'APPROVED_PENDING_ACTIVATION')
           returning id`,
          [clerkUserId],
        );
        const profile = await adminClient.query(
          `insert into public.m55_creator_profiles (
             clerk_user_id, originating_application_id, creator_code, first_final_approved_at,
             terms_version, terms_accepted_at, status, created_at
           ) values ($1, $2, $3, now(), '2026-09-13-v1', now(), 'ACTIVE', to_timestamp($4::double precision / 1000.0))
           returning id, economic_identity_id`,
          [
            clerkUserId,
            application.rows[0].id,
            `cr_snap_${suffix}`.slice(0, 40),
            epochMs - 3_600_000,
          ],
        );
        const profileId = profile.rows[0].id as string;
        const economicIdentityId = profile.rows[0].economic_identity_id as string;
        await adminClient.query(`select public.m55_r5_eligibility_history_epoch_backfill_v1()`);
        const snapshots = await adminClient.query(
          `select event_id, reason_code, effective_at_ms
           from public.m55_creator_profile_eligibility_events
           where creator_profile_id = $1 and reason_code = 'INITIAL_ROW_SNAPSHOT'`,
          [profileId],
        );
        assert.equal(snapshots.rowCount, 1);
        assert.equal(Number(snapshots.rows[0].effective_at_ms), epochMs);
        await expectPgErrorPreservingTx(
          adminClient,
          () =>
            adminClient.query(
              `insert into public.m55_creator_profile_eligibility_events (
                 creator_profile_id, creator_economic_identity_id, profile_status, terms_version,
                 terms_accepted_at_ms, effective_at_ms, reason_code
               ) values ($1, $2, 'ACTIVE', '2026-09-13-v1', $3, $3, 'INITIAL_ROW_SNAPSHOT')`,
              [profileId, economicIdentityId, epochMs],
            ),
          /duplicate key|unique/i,
        );
      } finally {
        await adminClient.query('rollback');
      }
    });

    it('denies service_role direct eligibility INSERT and control-constant mutation; revokes backfill execute', async () => {
      await adminClient.query('begin');
      try {
        await adminClient.query('set local role service_role');
        await expectPgErrorPreservingTx(
          adminClient,
          () =>
            adminClient.query(
              `insert into public.m55_creator_profile_eligibility_events (
                 creator_profile_id, creator_economic_identity_id, profile_status, terms_version,
                 terms_accepted_at_ms, effective_at_ms, reason_code
               ) values ($1, $2, 'ACTIVE', '2026-09-13-v1', 1, 1, 'INITIAL_ROW_SNAPSHOT')`,
              [randomUUID(), randomUUID()],
            ),
          /permission denied/i,
        );
        await expectPgErrorPreservingTx(
          adminClient,
          () =>
            adminClient.query(
              `update public.m55_r5_attribution_control_constants set required_creator_terms_version = '2026-09-13-v1'`,
            ),
          /CONTROL_CONSTANTS_IMMUTABLE|permission denied/i,
        );
        const exec = await adminClient.query(
          `select has_function_privilege('service_role', 'public.m55_r5_eligibility_history_epoch_backfill_v1()', 'EXECUTE') as allowed`,
        );
        assert.equal(exec.rows[0].allowed, false);
      } finally {
        await adminClient.query('rollback');
      }
    });

    it('HOLD persists independently of stripe_events insert failure (source-read 500 remains in webhook)', async () => {
      const webhook = readFileSync(join(process.cwd(), 'app/api/stripe/webhook/route.ts'), 'utf8');
      assert.match(webhook, /callRecordCanonicalPaymentHoldRpcV1/);
      assert.match(webhook, /insertPaymentIntentSucceededStripeEventV1/);
      const handler = webhook.slice(webhook.indexOf('async function handlePaymentIntentSucceededR5b'));
      assert.match(handler, /status: 500/);
    });
  });
}
