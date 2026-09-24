import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import pg from 'pg';
import { hasAffiliateDisclosureV1, scanContentComplianceV1 } from './r5ComplianceControlPlaneContract';
import { M55_PROHIBITED_CLAIMS } from '../contracts/m55CommercialFunnelContract';

const MIGRATIONS = [
  '20260914000000_m55_creator_distribution_foundation_v1.sql',
  '20260919000000_m55_attribution_touch_schema_v1.sql',
  '20260920000000_m55_r5_attribution_admit_qualified_touch_v1.sql',
  '20260921000000_m55_r5_attribution_purchase_lock_v1.sql',
  '20260922000000_m55_r5_attribution_admit_acceptance_linearized_v1.sql',
  '20260923000000_m55_r5_attribution_purchase_lock_abuse_guards_v1.sql',
  '20260924000000_m55_r5_compliance_control_plane_v1.sql',
] as const;

const DENY_URL_PATTERNS = ['supabase.co', 'pooler.supabase.com', 'm55-soul', 'production', 'preview'] as const;
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function evaluateSafety(): { ok: true; url: string } | { ok: false; reason: string } {
  const rawUrl = process.env.M55_R5_TOUCH_SCHEMA_LOCAL_DATABASE_URL;
  if (!rawUrl) return { ok: false, reason: 'M55_R5_TOUCH_SCHEMA_LOCAL_DATABASE_URL is not set' };
  if (process.env.M55_R5_TOUCH_SCHEMA_ALLOW_DISPOSABLE_DB_MUTATION !== 'YES') {
    return { ok: false, reason: 'M55_R5_TOUCH_SCHEMA_ALLOW_DISPOSABLE_DB_MUTATION must be exactly YES' };
  }
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'database URL is not parseable' };
  }
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
  if (!LOOPBACK_HOSTS.has(hostname)) return { ok: false, reason: 'database host must be loopback only' };
  const lower = rawUrl.toLowerCase();
  for (const pattern of DENY_URL_PATTERNS) {
    if (lower.includes(pattern)) return { ok: false, reason: `denied pattern ${pattern}` };
  }
  return { ok: true, url: rawUrl };
}

const safety = evaluateSafety();

async function applyMigration(client: pg.Client, filename: string): Promise<void> {
  const sql = readFileSync(join(process.cwd(), 'supabase/migrations', filename), 'utf8');
  await client.query(sql);
}

async function insertCreator(client: pg.Client, suffix: string): Promise<string> {
  const clerkUserId = `creator_${suffix}`.slice(0, 128);
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
     ) values ($1, $2, $3, now(), '2026-09-13-v1', now(), 'ACTIVE')
     returning economic_identity_id`,
    [clerkUserId, application.rows[0].id, `cr_${suffix}`.slice(0, 40)],
  );
  return profile.rows[0].economic_identity_id as string;
}

async function insertLockedWinnerAttempt(
  client: pg.Client,
  suffix: string,
): Promise<{ creatorId: string; attemptId: string; snapshot: string }> {
  await client.query('reset role');
  const clerkUserId = `creator_${suffix}`.slice(0, 128);
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
     ) values ($1, $2, $3, now(), '2026-09-13-v1', now(), 'ACTIVE')
     returning id, economic_identity_id`,
    [clerkUserId, application.rows[0].id, `cr_${suffix}`.slice(0, 40)],
  );
  const creatorId = profile.rows[0].economic_identity_id as string;
  const link = await client.query(
    `insert into public.m55_creator_referral_links (
       creator_profile_id, creator_economic_identity_id, token_version, token_digest, ingest_state
     ) values ($1, $2, 'v1', $3, 'ACTIVE')
     returning id`,
    [profile.rows[0].id, creatorId, createHash('sha256').update(`token-${suffix}`).digest('hex')],
  );
  const buyerDigest = createHash('sha256').update(`buyer-${suffix}`).digest('hex');
  const now = await client.query(`select (extract(epoch from clock_timestamp()) * 1000)::bigint as ms`);
  const nowMs = Number(now.rows[0].ms);
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
    [buyer.rows[0].id, link.rows[0].id, creatorId, nowMs - 60_000, randomBytes(16), createHash('sha256').update(`fp-${suffix}`).digest('hex')],
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
  await client.query('reset role');
  const snapshot = await client.query(
    `select row_to_json(a)::text as snapshot from public.m55_r5_attribution_purchase_attempts a where purchase_attempt_id = $1`,
    [attemptId],
  );
  await client.query('set local role service_role');
  return { creatorId, attemptId, snapshot: snapshot.rows[0].snapshot as string };
}

async function selectAsTableOwner(
  client: pg.Client,
  sql: string,
  params: unknown[] = [],
) {
  await client.query('reset role');
  try {
    return await client.query(sql, params);
  } finally {
    await client.query('set local role service_role');
  }
}

async function expectError(client: pg.Client, fn: () => Promise<unknown>, matcher: RegExp): Promise<void> {
  await client.query('savepoint m55_r5_compliance_expect');
  try {
    await fn();
    assert.fail(`expected error matching ${matcher}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith('expected error matching')) throw error;
    assert.match(message, matcher);
  } finally {
    await client.query('rollback to savepoint m55_r5_compliance_expect');
  }
}

describe('r5ComplianceControlPlane.local — disclosure boundary', () => {
  it('rejects embedded PR tokens and accepts explicit disclosures', () => {
    for (const text of ['M55 PREMIUM REPORT を紹介します', 'PRODUCT REVIEWです', 'SPRING REPORT']) {
      assert.equal(hasAffiliateDisclosureV1(text), false, text);
      assert.equal(
        scanContentComplianceV1({ observationKind: 'PRESENT', bodyText: text }, M55_PROHIBITED_CLAIMS).reasonCode,
        'DISCLOSURE_MISSING',
      );
    }
    for (const text of ['PR｜M55を紹介します', '広告｜M55を紹介します', 'アフィリエイト｜M55を紹介します', '#ad M55を紹介します']) {
      assert.equal(
        scanContentComplianceV1({ observationKind: 'PRESENT', bodyText: text }, M55_PROHIBITED_CLAIMS).disposition,
        'AUTO_PASS',
      );
    }
  });
});

describe('r5ComplianceControlPlane.local — safety', () => {
  it('refuses non-disposable database targets', () => {
    if (!safety.ok) throw new Error(`SAFETY_REFUSAL: ${safety.reason}`);
  });
});

if (safety.ok) {
  const admin = new pg.Client({ connectionString: safety.url });
  before(async () => {
    await admin.connect();
    const roles = await admin.query(
      `select rolname from pg_roles where rolname = any($1::text[])`,
      [['anon', 'authenticated', 'service_role']],
    );
    if (roles.rowCount !== 3) throw new Error('SAFETY_REFUSAL: required roles are missing');
    for (const filename of MIGRATIONS) await applyMigration(admin, filename);
  });
  after(async () => {
    await admin.end();
  });

  describe('r5ComplianceControlPlane.local — control plane', () => {
    it('denies anon/authenticated and blocks service_role direct DML', async () => {
      await admin.query('begin');
      try {
        await admin.query('set local role anon');
        await expectError(admin, () => admin.query(`select * from public.m55_r5_compliance_contents`), /permission denied/i);
        await admin.query('set local role authenticated');
        await expectError(
          admin,
          () => admin.query(`select public.m55_r5_compliance_list_open_cases_v1()`),
          /permission denied/i,
        );
        await admin.query('set local role service_role');
        const listed = await admin.query(`select public.m55_r5_compliance_list_open_cases_v1() as queue`);
        assert.ok(listed.rows[0].queue);
        const creatorId = await insertCreator(admin, randomUUID());
        await expectError(
          admin,
          () => admin.query(
            `insert into public.m55_r5_compliance_decisions (
               creator_economic_identity_id, disposition, reason_code, rule_version, evidence_reference, reviewer_type, appeal_status
             ) values ($1, 'AUTO_HOLD', 'TEST', 'v1', 'x', 'MACHINE', 'NONE')`,
            [creatorId],
          ),
          /permission denied/i,
        );
        await expectError(
          admin,
          () => admin.query(`update public.m55_r5_compliance_cases set status = 'HOLD' where false`),
          /permission denied/i,
        );
        await expectError(
          admin,
          () => admin.query(
            `insert into public.m55_r5_compliance_content_snapshots (
               content_id, observation_kind, body_text, content_fingerprint, observed_version, disclosure_state, claim_scan_state
             ) values (gen_random_uuid(), 'PRESENT', 'x', repeat('a', 64), 1, 'PRESENT', 'CLEAN')`,
          ),
          /permission denied/i,
        );
        await expectError(
          admin,
          () => admin.query(
            `select public.m55_r5_compliance_record_decision_v1(
               $1, null, null, null, 'AUTO_CANCEL_OBJECTIVE', 'CONFIRMED_SELF_REFERRAL',
               'm55.r5.compliance.fraud_graph.v1', 'weak', 'MACHINE', 'NONE', false
             )`,
            [creatorId],
          ),
          /permission denied/i,
        );
        await expectError(
          admin,
          () => admin.query(`select public.m55_r5_compliance_reconcile_machine_exceptions_v1(gen_random_uuid())`),
          /permission denied/i,
        );
      } finally {
        await admin.query('rollback');
      }
    });

    it('keeps snapshots immutable, links appeals to adverse decisions, and appends corrections', async () => {
      await admin.query('begin');
      try {
        await admin.query('set local role service_role');
        const creatorId = await insertCreator(admin, randomUUID());
        const otherId = await insertCreator(admin, randomUUID());
        const recorded = await admin.query(
          `select public.m55_r5_compliance_record_content_v1(
             $1, null, 'web', 'https://example.com/post/1', 'PRESENT',
             '広告 アフィリエイトリンクを含みます。', 'PRESENT', 'CLEAN',
             'AUTO_HOLD', 'PROHIBITED_CLAIM_MATCH', 'm55.r5.compliance.content_scan.v1'
           ) as result`,
          [creatorId],
        );
        const contentId = recorded.rows[0].result.content_id as string;
        const adverseDecisionId = recorded.rows[0].result.decision_id as string;
        const firstSnapshot = recorded.rows[0].result.snapshot_id as string;
        const machineCase = await selectAsTableOwner(
          admin,
          `select case_id, status, creator_evidence, case_kind
           from public.m55_r5_compliance_cases
           where adverse_decision_id = $1 and case_kind = 'MACHINE_EXCEPTION'`,
          [adverseDecisionId],
        );
        assert.equal(machineCase.rowCount, 1);
        assert.equal(machineCase.rows[0].status, 'HOLD');
        assert.equal(machineCase.rows[0].creator_evidence, 'NO_CREATOR_EVIDENCE');
        const queue = await admin.query(`select public.m55_r5_compliance_list_open_cases_v1() as queue`);
        assert.match(JSON.stringify(queue.rows[0].queue), new RegExp(machineCase.rows[0].case_id));
        await admin.query('reset role');
        await expectError(
          admin,
          () => admin.query(`update public.m55_r5_compliance_content_snapshots set body_text = 'x' where snapshot_id = $1`, [firstSnapshot]),
          /IMMUTABLE_ROW/,
        );
        await admin.query('set local role service_role');
        await expectError(
          admin,
          () => admin.query(
            `select public.m55_r5_compliance_creator_case_v1(
               $1, 'OPEN_APPEAL', null, null, $2, null, 'appeal', 'creator evidence'
             )`,
            [creatorId, contentId],
          ),
          /ADVERSE_DECISION_REQUIRED/,
        );
        await expectError(
          admin,
          () => admin.query(
            `select public.m55_r5_compliance_creator_case_v1(
               $1, 'OPEN_DISCREPANCY', null, $2, $3, null, 'discrepancy', 'creator evidence'
             )`,
            [creatorId, adverseDecisionId, contentId],
          ),
          /ADVERSE_DECISION_FORBIDDEN/,
        );
        await expectError(
          admin,
          () => admin.query(
            `select public.m55_r5_compliance_creator_case_v1(
               $1, 'OPEN_APPEAL', null, $2, $3, null, 'appeal', 'caller scope'
             )`,
            [creatorId, adverseDecisionId, contentId],
          ),
          /APPEAL_SCOPE_FORBIDDEN/,
        );
        const appeal = await admin.query(
          `select public.m55_r5_compliance_creator_case_v1(
             $1, 'OPEN_APPEAL', null, $2, null, null, 'appeal', 'creator evidence'
           ) as result`,
          [creatorId, adverseDecisionId],
        );
        const caseId = appeal.rows[0].result.case_id as string;
        const machineEvidence = await selectAsTableOwner(
          admin,
          `select machine_evidence, case_kind, adverse_decision_id, content_id, purchase_attempt_id
           from public.m55_r5_compliance_cases where case_id = $1`,
          [caseId],
        );
        assert.equal(machineEvidence.rows[0].case_kind, 'APPEAL');
        assert.equal(machineEvidence.rows[0].adverse_decision_id, adverseDecisionId);
        assert.equal(machineEvidence.rows[0].content_id, contentId);
        assert.equal(machineEvidence.rows[0].purchase_attempt_id, null);
        await expectError(
          admin,
          () => admin.query(
            `select public.m55_r5_compliance_creator_case_v1(
               $1, 'OPEN_APPEAL', null, $2, null, null, 'appeal again', 'duplicate'
             )`,
            [creatorId, adverseDecisionId],
          ),
          /APPEAL_ALREADY_EXISTS/,
        );
        const coexistence = await selectAsTableOwner(
          admin,
          `select case_kind from public.m55_r5_compliance_cases
           where adverse_decision_id = $1 order by case_kind`,
          [adverseDecisionId],
        );
        assert.deepEqual(coexistence.rows.map((row) => row.case_kind), ['APPEAL', 'MACHINE_EXCEPTION']);
        assert.match(machineEvidence.rows[0].machine_evidence, /decision_id=/);
        assert.match(machineEvidence.rows[0].machine_evidence, /reason_code=PROHIBITED_CLAIM_MATCH/);
        assert.doesNotMatch(machineEvidence.rows[0].machine_evidence, /MACHINE_EVIDENCE_RETAINED/);
        await expectError(
          admin,
          () => admin.query(
            `select public.m55_r5_compliance_creator_case_v1(
               $1, 'OPEN_APPEAL', null, $2, null, null, 'appeal', 'other creator'
             )`,
            [otherId, adverseDecisionId],
          ),
          /ADVERSE_DECISION_NOT_OWNED/,
        );
        const discrepancy = await admin.query(
          `select public.m55_r5_compliance_creator_case_v1(
             $1, 'OPEN_DISCREPANCY', null, null, $2, null, 'discrepancy', 'creator evidence'
           ) as result`,
          [creatorId, contentId],
        );
        assert.equal(
          (await selectAsTableOwner(admin, `select machine_evidence from public.m55_r5_compliance_cases where case_id = $1`, [
            discrepancy.rows[0].result.case_id,
          ])).rows[0].machine_evidence,
          'NO_ADVERSE_DECISION',
        );
        await admin.query(
          `select public.m55_r5_compliance_creator_case_v1(
             $1, 'CORRECTION', $2, null, $3, null, 'appeal', 'added correction evidence'
           )`,
          [creatorId, caseId, contentId],
        );
        const events = await selectAsTableOwner(
          admin,
          `select event_kind from public.m55_r5_compliance_case_events where case_id = $1 order by created_at`,
          [caseId],
        );
        assert.deepEqual(events.rows.map((row) => row.event_kind), ['OPENED', 'CREATOR_CORRECTION']);
        const reviewer = createHash('sha256').update('reviewer').digest('hex');
        await admin.query(
          `select public.m55_r5_compliance_resolve_case_v1($1, $2, 'RESOLVE', 'RELEASE', 'human release')`,
          [caseId, reviewer],
        );
        await expectError(
          admin,
          () => admin.query(
            `select public.m55_r5_compliance_creator_case_v1(
               $1, 'CORRECTION', $2, null, $3, null, 'appeal', 'too late'
             )`,
            [creatorId, caseId, contentId],
          ),
          /CASE_TERMINAL/,
        );
      } finally {
        await admin.query('rollback');
      }
    });

    it('rejects prohibited case transitions and unknown reviewer actions', async () => {
      await admin.query('begin');
      try {
        await admin.query('set local role service_role');
        const creatorId = await insertCreator(admin, randomUUID());
        const opened = await admin.query(
          `select public.m55_r5_compliance_creator_case_v1(
             $1, 'OPEN_DISCREPANCY', null, null, null, null, 'discrepancy', 'creator evidence'
           ) as result`,
          [creatorId],
        );
        const caseId = opened.rows[0].result.case_id as string;
        const reviewer = createHash('sha256').update('reviewer').digest('hex');
        await expectError(
          admin,
          () => admin.query(
            `select public.m55_r5_compliance_resolve_case_v1($1, $2, 'UNKNOWN', 'KEEP_HOLD', 'bad')`,
            [caseId, reviewer],
          ),
          /CASE_ACTION_INVALID/,
        );
        await admin.query(
          `select public.m55_r5_compliance_resolve_case_v1($1, $2, 'RESOLVE', 'RELEASE', 'human release')`,
          [caseId, reviewer],
        );
        await expectError(
          admin,
          () => admin.query(
            `select public.m55_r5_compliance_resolve_case_v1($1, $2, 'KEEP_HOLD', 'KEEP_HOLD', 'rehold')`,
            [caseId, reviewer],
          ),
          /CASE_TERMINAL/,
        );
        await expectError(
          admin,
          () => admin.query(
            `select public.m55_r5_compliance_resolve_case_v1($1, $2, 'RESOLVE', 'RELEASE', 'again')`,
            [caseId, reviewer],
          ),
          /CASE_TERMINAL/,
        );
        const resolved = await selectAsTableOwner(
          admin,
          `select status, resolved_at from public.m55_r5_compliance_cases where case_id = $1`,
          [caseId],
        );
        assert.equal(resolved.rows[0].status, 'RESOLVED');
        assert.ok(resolved.rows[0].resolved_at);
      } finally {
        await admin.query('rollback');
      }
    });

    it('derives fraud decisions from persisted graph evidence and routes holds', async () => {
      await admin.query('begin');
      try {
        const attemptsBefore = await admin.query(`select count(*)::int as n from public.m55_r5_attribution_purchase_attempts`);
        const locked = await insertLockedWinnerAttempt(admin, randomUUID());
        const signature = await admin.query(
          `select pg_get_function_identity_arguments(p.oid) as args
           from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'm55_r5_compliance_decide_fraud_v1'`,
        );
        assert.equal(
          signature.rows[0].args,
          'p_creator_economic_identity_id uuid, p_purchase_attempt_id uuid, p_decision_required boolean',
        );
        await expectError(
          admin,
          () => admin.query(
            `select public.m55_r5_compliance_decide_fraud_v1($1, $2, true, 'CONFIRMED_SELF_REFERRAL', array['SAME_IP'], true, 'caller-proof')`,
            [locked.creatorId, locked.attemptId],
          ),
          /function|does not exist|does not match/i,
        );
        const incomplete = await admin.query(
          `select public.m55_r5_compliance_decide_fraud_v1($1, $2, true) as result`,
          [locked.creatorId, locked.attemptId],
        );
        assert.equal(incomplete.rows[0].result.disposition, 'AUTO_HOLD');
        assert.equal(incomplete.rows[0].result.forfeiture, false);
        const incompleteDecision = await selectAsTableOwner(
          admin,
          `select reason_code, evidence_reference, disposition from public.m55_r5_compliance_decisions where decision_id = $1`,
          [incomplete.rows[0].result.decision_id],
        );
        assert.equal(incompleteDecision.rows[0].reason_code, 'EVIDENCE_INCOMPLETE');
        assert.equal(incompleteDecision.rows[0].evidence_reference, `fraud_graph_scope:${locked.attemptId}`);
        assert.notEqual(incompleteDecision.rows[0].disposition, 'AUTO_CANCEL_OBJECTIVE');
        const recordEdge = async (
          relationClass: string,
          signal: string | null,
          objectiveReason: string | null,
          evidence: string,
        ) => {
          await admin.query(
            `select public.m55_r5_compliance_record_graph_edge_v1(
               $1::uuid, $2::uuid, 'CREATOR', $3::text, 'PURCHASE', $4::text, $5, $6, $7, $8
             )`,
            [
              locked.creatorId,
              locked.attemptId,
              String(locked.creatorId),
              String(locked.attemptId),
              relationClass,
              signal,
              objectiveReason,
              evidence,
            ],
          );
        };
        await recordEdge('HEURISTIC_RISK', 'SAME_IP', null, 'heuristic-a');
        await recordEdge('HEURISTIC_RISK', 'SAME_IP', null, 'heuristic-a');
        await recordEdge('HEURISTIC_RISK', 'SAME_IP', null, 'heuristic-b');
        const distinct = await selectAsTableOwner(
          admin,
          `select count(distinct risk_signal_class)::int as n
           from public.m55_r5_compliance_graph_edges
           where purchase_attempt_id = $1 and relation_class = 'HEURISTIC_RISK'`,
          [locked.attemptId],
        );
        assert.equal(distinct.rows[0].n, 1);
        const singleOptional = await admin.query(
          `select public.m55_r5_compliance_decide_fraud_v1($1, $2, false) as result`,
          [locked.creatorId, locked.attemptId],
        );
        assert.equal(singleOptional.rows[0].result.outcome, 'NO_DISPOSITION');
        const singleRequired = await admin.query(
          `select public.m55_r5_compliance_decide_fraud_v1($1, $2, true) as result`,
          [locked.creatorId, locked.attemptId],
        );
        assert.equal(singleRequired.rows[0].result.disposition, 'AUTO_HOLD');
        const singleDecision = await selectAsTableOwner(
          admin,
          `select reason_code from public.m55_r5_compliance_decisions where decision_id = $1`,
          [singleRequired.rows[0].result.decision_id],
        );
        assert.equal(singleDecision.rows[0].reason_code, 'SINGLE_HEURISTIC_SIGNAL_UNRESOLVED');
        const singleCase = await selectAsTableOwner(
          admin,
          `select count(*)::int as n from public.m55_r5_compliance_cases
           where adverse_decision_id = $1 and case_kind = 'MACHINE_EXCEPTION'`,
          [singleRequired.rows[0].result.decision_id],
        );
        assert.equal(singleCase.rows[0].n, 1);
        await recordEdge('HEURISTIC_RISK', 'SAME_DEVICE', null, 'heuristic-device');
        const multiple = await admin.query(
          `select public.m55_r5_compliance_decide_fraud_v1($1, $2, false) as result`,
          [locked.creatorId, locked.attemptId],
        );
        assert.equal(multiple.rows[0].result.disposition, 'AUTO_HOLD');
        const multipleDecision = await selectAsTableOwner(
          admin,
          `select reason_code, evidence_reference from public.m55_r5_compliance_decisions where decision_id = $1`,
          [multiple.rows[0].result.decision_id],
        );
        assert.equal(multipleDecision.rows[0].reason_code, 'MULTIPLE_HEURISTIC_RISK_SIGNALS');
        assert.equal(multipleDecision.rows[0].evidence_reference, `fraud_graph_scope:${locked.attemptId}`);
        await recordEdge('OBJECTIVE', null, 'CONFIRMED_CIRCULAR_ABUSE', 'objective-evidence-1');
        const objective = await admin.query(
          `select public.m55_r5_compliance_decide_fraud_v1($1, $2, false) as result`,
          [locked.creatorId, locked.attemptId],
        );
        assert.equal(objective.rows[0].result.disposition, 'AUTO_CANCEL_OBJECTIVE');
        assert.equal(objective.rows[0].result.forfeiture, true);
        const objectiveDecision = await selectAsTableOwner(
          admin,
          `select reason_code, evidence_reference from public.m55_r5_compliance_decisions where decision_id = $1`,
          [objective.rows[0].result.decision_id],
        );
        assert.equal(objectiveDecision.rows[0].reason_code, 'CONFIRMED_CIRCULAR_ABUSE');
        assert.equal(objectiveDecision.rows[0].evidence_reference, 'objective-evidence-1');
        const cancelCases = await selectAsTableOwner(
          admin,
          `select count(*)::int as n from public.m55_r5_compliance_cases
           where adverse_decision_id = $1 and case_kind = 'MACHINE_EXCEPTION'`,
          [objective.rows[0].result.decision_id],
        );
        assert.equal(cancelCases.rows[0].n, 0);
        const passed = await admin.query(
          `select public.m55_r5_compliance_record_content_v1(
             $1, null, 'web', 'https://example.com/post/pass', 'PRESENT',
             '広告 アフィリエイトリンクを含みます。', 'PRESENT', 'CLEAN',
             'AUTO_PASS', 'CONTENT_CHECKS_SATISFIED', 'm55.r5.compliance.content_scan.v1'
           ) as result`,
          [locked.creatorId],
        );
        assert.equal(passed.rows[0].result.machine_exception_case_id, null);
        await expectError(
          admin,
          () => admin.query(
            `select public.m55_r5_compliance_creator_case_v1(
               $1, 'OPEN_APPEAL', null, $2, null, null, 'appeal pass', 'creator evidence'
             )`,
            [locked.creatorId, passed.rows[0].result.decision_id],
          ),
          /DECISION_NOT_APPEALABLE/,
        );
        const queue = await admin.query(`select public.m55_r5_compliance_list_open_cases_v1() as queue`);
        assert.deepEqual(queue.rows[0].queue, []);
        const after = await selectAsTableOwner(
          admin,
          `select row_to_json(a)::text as snapshot from public.m55_r5_attribution_purchase_attempts a where purchase_attempt_id = $1`,
          [locked.attemptId],
        );
        assert.equal(after.rows[0].snapshot, locked.snapshot);
        const attemptsAfter = await selectAsTableOwner(
          admin,
          `select count(*)::int as n from public.m55_r5_attribution_purchase_attempts`,
        );
        assert.equal(attemptsAfter.rows[0].n, attemptsBefore.rows[0].n + 1);
      } finally {
        await admin.query('rollback');
      }
    });

    it('reconciles content and fraud machine exceptions and returns the review packet', async () => {
      await admin.query('begin');
      try {
        await admin.query('set local role service_role');
        const creatorId = await insertCreator(admin, randomUUID());
        const reviewer = createHash('sha256').update('reviewer-patch3').digest('hex');
        const held = await admin.query(
          `select public.m55_r5_compliance_record_content_v1(
             $1, null, 'web', 'https://example.com/post/hold', 'PRESENT',
             'M55 PREMIUM REPORT を紹介します', 'MISSING', 'CLEAN',
             'AUTO_HOLD', 'DISCLOSURE_MISSING', 'm55.r5.compliance.content_scan.v1'
           ) as result`,
          [creatorId],
        );
        const contentId = held.rows[0].result.content_id as string;
        const holdDecisionId = held.rows[0].result.decision_id as string;
        const machineCaseId = held.rows[0].result.machine_exception_case_id as string;
        const firstSnapshot = held.rows[0].result.snapshot_id as string;
        const passed = await admin.query(
          `select public.m55_r5_compliance_record_content_v1(
             $1, $2, 'web', 'https://example.com/post/hold', 'PRESENT',
             '広告｜M55を紹介します', 'PRESENT', 'CLEAN',
             'AUTO_PASS', 'CONTENT_CHECKS_SATISFIED', 'm55.r5.compliance.content_scan.v1'
           ) as result`,
          [creatorId, contentId],
        );
        assert.equal(passed.rows[0].result.machine_exception_case_id, null);
        const released = await selectAsTableOwner(
          admin,
          `select status, decision, decision_reason from public.m55_r5_compliance_cases where case_id = $1`,
          [machineCaseId],
        );
        assert.equal(released.rows[0].status, 'RESOLVED');
        assert.equal(released.rows[0].decision, 'AUTO_RELEASE');
        assert.equal(released.rows[0].decision_reason, 'CURRENT_CONTENT_SNAPSHOT_PASSED');
        const immutableDecision = await selectAsTableOwner(
          admin,
          `select disposition from public.m55_r5_compliance_decisions where decision_id = $1`,
          [holdDecisionId],
        );
        assert.equal(immutableDecision.rows[0].disposition, 'AUTO_HOLD');
        await admin.query('reset role');
        await expectError(
          admin,
          () => admin.query(`update public.m55_r5_compliance_content_snapshots set body_text = 'changed' where snapshot_id = $1`, [firstSnapshot]),
          /IMMUTABLE_ROW/,
        );
        await admin.query('set local role service_role');
        const resolutionEvents = await selectAsTableOwner(
          admin,
          `select event_kind, actor_ref from public.m55_r5_compliance_case_events
           where case_id = $1 and event_kind = 'RESOLUTION' order by created_at asc, event_id asc`,
          [machineCaseId],
        );
        assert.equal(resolutionEvents.rowCount, 1);
        assert.equal(resolutionEvents.rows[0].actor_ref, 'MACHINE');
        await admin.query(
          `select public.m55_r5_compliance_record_content_v1(
             $1, $2, 'web', 'https://example.com/post/hold', 'PRESENT',
             '広告｜M55を紹介します', 'PRESENT', 'CLEAN',
             'AUTO_PASS', 'CONTENT_CHECKS_SATISFIED', 'm55.r5.compliance.content_scan.v1'
           )`,
          [creatorId, contentId],
        );
        const stillOne = await selectAsTableOwner(
          admin,
          `select count(*)::int as n from public.m55_r5_compliance_case_events
           where case_id = $1 and event_kind = 'RESOLUTION'`,
          [machineCaseId],
        );
        assert.equal(stillOne.rows[0].n, 1);

        const kept = await admin.query(
          `select public.m55_r5_compliance_record_content_v1(
             $1, null, 'web', 'https://example.com/post/kept', 'PRESENT',
             '本文', 'MISSING', 'CLEAN', 'AUTO_HOLD', 'DISCLOSURE_MISSING', 'm55.r5.compliance.content_scan.v1'
           ) as result`,
          [creatorId],
        );
        await admin.query(
          `select public.m55_r5_compliance_resolve_case_v1($1, $2, 'KEEP_HOLD', 'KEEP_HOLD', 'human keep')`,
          [kept.rows[0].result.machine_exception_case_id, reviewer],
        );
        await admin.query(
          `select public.m55_r5_compliance_record_content_v1(
             $1, $2, 'web', 'https://example.com/post/kept', 'PRESENT',
             'PR｜修正しました', 'PRESENT', 'CLEAN', 'AUTO_PASS', 'CONTENT_CHECKS_SATISFIED', 'm55.r5.compliance.content_scan.v1'
           )`,
          [creatorId, kept.rows[0].result.content_id],
        );
        const keptRow = await selectAsTableOwner(
          admin,
          `select status, decision from public.m55_r5_compliance_cases where case_id = $1`,
          [kept.rows[0].result.machine_exception_case_id],
        );
        assert.equal(keptRow.rows[0].status, 'HOLD');
        assert.equal(keptRow.rows[0].decision, 'KEEP_HOLD');

        const correction = await admin.query(
          `select public.m55_r5_compliance_record_content_v1(
             $1, null, 'web', 'https://example.com/post/correct', 'PRESENT',
             '本文', 'MISSING', 'CLEAN', 'AUTO_HOLD', 'DISCLOSURE_MISSING', 'm55.r5.compliance.content_scan.v1'
           ) as result`,
          [creatorId],
        );
        await admin.query(
          `select public.m55_r5_compliance_resolve_case_v1($1, $2, 'KEEP_HOLD', 'REQUEST_CORRECTION', 'please correct')`,
          [correction.rows[0].result.machine_exception_case_id, reviewer],
        );
        await admin.query(
          `select public.m55_r5_compliance_record_content_v1(
             $1, $2, 'web', 'https://example.com/post/correct', 'PRESENT',
             '【広告】修正しました', 'PRESENT', 'CLEAN', 'AUTO_PASS', 'CONTENT_CHECKS_SATISFIED', 'm55.r5.compliance.content_scan.v1'
           )`,
          [creatorId, correction.rows[0].result.content_id],
        );
        const corrected = await selectAsTableOwner(
          admin,
          `select status, decision from public.m55_r5_compliance_cases where case_id = $1`,
          [correction.rows[0].result.machine_exception_case_id],
        );
        assert.equal(corrected.rows[0].status, 'RESOLVED');
        assert.equal(corrected.rows[0].decision, 'AUTO_RELEASE');

        const repeatFirst = await admin.query(
          `select public.m55_r5_compliance_record_content_v1(
             $1, null, 'web', 'https://example.com/post/repeat', 'PRESENT',
             '本文', 'MISSING', 'CLEAN', 'AUTO_HOLD', 'DISCLOSURE_MISSING', 'm55.r5.compliance.content_scan.v1'
           ) as result`,
          [creatorId],
        );
        const repeatSecond = await admin.query(
          `select public.m55_r5_compliance_record_content_v1(
             $1, $2, 'web', 'https://example.com/post/repeat', 'PRESENT',
             '本文の再掲', 'MISSING', 'CLEAN', 'AUTO_HOLD', 'DISCLOSURE_MISSING', 'm55.r5.compliance.content_scan.v1'
           ) as result`,
          [creatorId, repeatFirst.rows[0].result.content_id],
        );
        const superseded = await selectAsTableOwner(
          admin,
          `select status, decision, decision_reason from public.m55_r5_compliance_cases where case_id = $1`,
          [repeatFirst.rows[0].result.machine_exception_case_id],
        );
        assert.equal(superseded.rows[0].status, 'RESOLVED');
        assert.equal(superseded.rows[0].decision, 'SUPERSEDED_BY_NEW_MACHINE_DECISION');
        assert.equal(superseded.rows[0].decision_reason, 'NEWER_CONTENT_HOLD_DECISION');
        const openRepeat = await selectAsTableOwner(
          admin,
          `select count(*)::int as n from public.m55_r5_compliance_cases
           where content_id = $1 and case_kind = 'MACHINE_EXCEPTION' and status in ('OPEN', 'HOLD') and decision is null`,
          [repeatFirst.rows[0].result.content_id],
        );
        assert.equal(openRepeat.rows[0].n, 1);
        assert.equal(repeatSecond.rows[0].result.machine_exception_case_id == null, false);

        const locked = await insertLockedWinnerAttempt(admin, randomUUID());
        const recordEdge = async (signal: string | null, objective: string | null, evidence: string) => {
          await admin.query(
            `select public.m55_r5_compliance_record_graph_edge_v1(
               $1::uuid, $2::uuid, 'CREATOR', $3::text, 'PURCHASE', $4::text, $5, $6, $7, $8
             )`,
            [
              locked.creatorId,
              locked.attemptId,
              String(locked.creatorId),
              String(locked.attemptId),
              objective ? 'OBJECTIVE' : 'HEURISTIC_RISK',
              signal,
              objective,
              evidence,
            ],
          );
        };
        await recordEdge('SAME_IP', null, 'life-ip');
        const fraudHold = await admin.query(
          `select public.m55_r5_compliance_decide_fraud_v1($1, $2, true) as result`,
          [locked.creatorId, locked.attemptId],
        );
        assert.equal(fraudHold.rows[0].result.disposition, 'AUTO_HOLD');
        const appeal = await admin.query(
          `select public.m55_r5_compliance_creator_case_v1(
             $1, 'OPEN_APPEAL', null, $2, null, null, 'appeal hold', 'creator evidence'
           ) as result`,
          [locked.creatorId, fraudHold.rows[0].result.decision_id],
        );
        await recordEdge('SAME_DEVICE', null, 'life-device');
        const fraudHold2 = await admin.query(
          `select public.m55_r5_compliance_decide_fraud_v1($1, $2, false) as result`,
          [locked.creatorId, locked.attemptId],
        );
        assert.equal(fraudHold2.rows[0].result.disposition, 'AUTO_HOLD');
        const oldFraudCase = await selectAsTableOwner(
          admin,
          `select status, decision, decision_reason from public.m55_r5_compliance_cases where case_id = $1`,
          [fraudHold.rows[0].result.machine_exception_case_id],
        );
        assert.equal(oldFraudCase.rows[0].decision, 'SUPERSEDED_BY_NEW_MACHINE_DECISION');
        assert.equal(oldFraudCase.rows[0].decision_reason, 'NEWER_FRAUD_HOLD_DECISION');
        await recordEdge(null, 'CONFIRMED_SELF_REFERRAL', 'life-objective');
        const cancelled = await admin.query(
          `select public.m55_r5_compliance_decide_fraud_v1($1, $2, false) as result`,
          [locked.creatorId, locked.attemptId],
        );
        assert.equal(cancelled.rows[0].result.disposition, 'AUTO_CANCEL_OBJECTIVE');
        assert.equal(cancelled.rows[0].result.machine_exception_case_id ?? null, null);
        const objectiveCase = await selectAsTableOwner(
          admin,
          `select status, decision, decision_reason from public.m55_r5_compliance_cases where case_id = $1`,
          [fraudHold2.rows[0].result.machine_exception_case_id],
        );
        assert.equal(objectiveCase.rows[0].status, 'RESOLVED');
        assert.equal(objectiveCase.rows[0].decision, 'SUPERSEDED_BY_OBJECTIVE_DECISION');
        assert.equal(objectiveCase.rows[0].decision_reason, 'OBJECTIVE_INVALIDITY_CONFIRMED');
        const appealRow = await selectAsTableOwner(
          admin,
          `select status, case_kind from public.m55_r5_compliance_cases where case_id = $1`,
          [appeal.rows[0].result.case_id],
        );
        assert.equal(appealRow.rows[0].case_kind, 'APPEAL');
        assert.equal(appealRow.rows[0].status, 'OPEN');
        const cancelDecision = await selectAsTableOwner(
          admin,
          `select disposition from public.m55_r5_compliance_decisions where decision_id = $1`,
          [cancelled.rows[0].result.decision_id],
        );
        assert.equal(cancelDecision.rows[0].disposition, 'AUTO_CANCEL_OBJECTIVE');

        const queue = await admin.query(`select public.m55_r5_compliance_list_open_cases_v1() as queue`);
        const packet = (queue.rows[0].queue as Array<Record<string, any>>).find(
          (item) => item.case_id === repeatSecond.rows[0].result.machine_exception_case_id,
        );
        assert.ok(packet);
        assert.equal(packet.creator_economic_identity_id, creatorId);
        assert.equal(packet.content_id, repeatFirst.rows[0].result.content_id);
        assert.equal(packet.adverse_decision.decision_id, repeatSecond.rows[0].result.decision_id);
        assert.equal(packet.latest_content_snapshot.observed_version, 2);
        assert.equal(packet.latest_content_snapshot.body_text, undefined);
        assert.equal(JSON.stringify(packet).includes('body_text'), false);
        assert.ok(Array.isArray(packet.case_events));
        const orderedEvents = [...packet.case_events].sort((left, right) => {
          const byTime = String(left.created_at).localeCompare(String(right.created_at));
          return byTime === 0 ? String(left.event_id).localeCompare(String(right.event_id)) : byTime;
        });
        assert.deepEqual(packet.case_events, orderedEvents);
        const other = await insertLockedWinnerAttempt(admin, randomUUID());
        await admin.query(
          `select public.m55_r5_compliance_record_graph_edge_v1(
             $1::uuid, $2::uuid, 'CREATOR', $3::text, 'PURCHASE', $4::text, 'HEURISTIC_RISK', 'SAME_IP', null, 'other-scope-edge'
           )`,
          [other.creatorId, other.attemptId, String(other.creatorId), String(other.attemptId)],
        );
        const scopedQueue = await admin.query(`select public.m55_r5_compliance_list_open_cases_v1() as queue`);
        const fraudPacket = (scopedQueue.rows[0].queue as Array<Record<string, any>>).find(
          (item) => item.case_id === appeal.rows[0].result.case_id,
        );
        assert.ok(fraudPacket);
        assert.equal(fraudPacket.purchase_attempt_id, locked.attemptId);
        assert.ok(fraudPacket.fraud_graph_evidence.some((edge: { evidence_reference: string }) => edge.evidence_reference === 'life-objective'));
        assert.equal(JSON.stringify(fraudPacket.fraud_graph_evidence).includes('other-scope-edge'), false);
        assert.equal(JSON.stringify(queue.rows[0].queue).includes('commission_amount'), false);
        assert.equal(JSON.stringify(queue.rows[0].queue).includes('payable'), false);
      } finally {
        await admin.query('rollback');
      }
    });
  });
}
