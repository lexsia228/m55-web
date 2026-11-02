import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { describe, it } from 'node:test';
import pg from 'pg';

const { Client } = pg;

/** Human opt-in required before any destructive bootstrap (DROP SCHEMA). */
const M55_R8_INTEGRATION_ALLOW_DESTRUCTIVE_ENV = 'M55_R8_INTEGRATION_ALLOW_DESTRUCTIVE';
/** Expected disposable instance id; must match DB GUC `app.m55_r8_disposable_instance_id`. */
const M55_R8_INTEGRATION_INSTANCE_ID_ENV = 'M55_R8_INTEGRATION_INSTANCE_ID';
const M55_R8_DISPOSABLE_INSTANCE_GUC = 'app.m55_r8_disposable_instance_id';
const M55_R8_DISPOSABLE_DATABASE_NAME_PATTERN = /^m55_r8_disposable_[a-z0-9_]+$/;
const CONNECT_TIMEOUT_MS = 10_000;

const DATABASE_URL = process.env.M55_R8_INTEGRATION_DATABASE_URL ?? '';
const INTEGRATION_URL_CONFIGURED = DATABASE_URL.trim().length > 0;

type IntegrationEnvSlice = {
  M55_R8_INTEGRATION_ALLOW_DESTRUCTIVE?: string;
  M55_R8_INTEGRATION_DATABASE_URL?: string;
  M55_R8_INTEGRATION_INSTANCE_ID?: string;
};

type IntegrationGuardOk = {
  ok: true;
  connectionString: string;
  databaseName: string;
  expectedInstanceId: string;
};

type IntegrationGuardReject = { ok: false; reason: string };

function assessR8IntegrationDestructiveTargetV1(
  env: IntegrationEnvSlice,
): IntegrationGuardOk | IntegrationGuardReject {
  if (env.M55_R8_INTEGRATION_ALLOW_DESTRUCTIVE !== 'true') {
    return { ok: false, reason: 'destructive_opt_in_required' };
  }

  const instanceRaw = env.M55_R8_INTEGRATION_INSTANCE_ID?.trim() ?? '';
  if (!instanceRaw) {
    return { ok: false, reason: 'integration_instance_id_missing' };
  }
  if (!/^[a-zA-Z0-9._-]{8,128}$/.test(instanceRaw)) {
    return { ok: false, reason: 'integration_instance_id_invalid' };
  }

  const urlRaw = env.M55_R8_INTEGRATION_DATABASE_URL?.trim() ?? '';
  if (!urlRaw) {
    return { ok: false, reason: 'integration_database_url_missing' };
  }

  const parsed = parseR8IntegrationDatabaseUrlV1(urlRaw);
  if (!parsed.ok) {
    return parsed;
  }

  return {
    ok: true,
    connectionString: urlRaw,
    databaseName: parsed.databaseName,
    expectedInstanceId: instanceRaw,
  };
}

function parseR8IntegrationDatabaseUrlV1(
  raw: string,
): { ok: true; databaseName: string } | IntegrationGuardReject {
  if (raw.includes('\0')) {
    return { ok: false, reason: 'integration_database_url_malformed' };
  }
  if (raw.startsWith('/') || /\bhost\s*=\s*\//i.test(raw)) {
    return { ok: false, reason: 'unix_socket_forbidden' };
  }

  const lowered = raw.toLowerCase();
  if (lowered.includes('supabase') || lowered.includes('pooler')) {
    return { ok: false, reason: 'remote_host_pattern_forbidden' };
  }

  let url: URL;
  try {
    const normalized = raw.replace(/^postgres:\/\//i, 'postgresql://');
    if (!/^postgresql:\/\//i.test(normalized)) {
      return { ok: false, reason: 'integration_database_url_scheme_invalid' };
    }
    url = new URL(normalized);
  } catch {
    return { ok: false, reason: 'integration_database_url_unparseable' };
  }

  if (url.protocol !== 'postgresql:') {
    return { ok: false, reason: 'integration_database_url_scheme_invalid' };
  }

  const host = url.hostname;
  if (host === 'localhost' || host === '::1') {
    return { ok: false, reason: 'host_localhost_alias_forbidden' };
  }
  if (host !== '127.0.0.1') {
    return { ok: false, reason: 'host_must_be_127_0_0_1' };
  }

  if (!url.port) {
    return { ok: false, reason: 'port_required' };
  }
  const port = Number(url.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { ok: false, reason: 'port_invalid' };
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, '')).trim();
  if (!databaseName) {
    return { ok: false, reason: 'database_name_missing' };
  }
  if (!M55_R8_DISPOSABLE_DATABASE_NAME_PATTERN.test(databaseName)) {
    return { ok: false, reason: 'database_name_not_disposable_r8' };
  }

  if (url.hash.length > 0) {
    return { ok: false, reason: 'connection_url_fragment_forbidden' };
  }
  if (url.searchParams.size > 0) {
    return { ok: false, reason: 'connection_query_parameters_forbidden' };
  }

  return { ok: true, databaseName };
}

function assertR8IntegrationPreConnectGuardV1(env: IntegrationEnvSlice): IntegrationGuardOk {
  const assessment = assessR8IntegrationDestructiveTargetV1(env);
  if (!assessment.ok) {
    throw new Error(assessment.reason);
  }
  return assessment;
}

type R8IntegrationIdentityQueryClient = Pick<pg.Client, 'query'>;

async function verifyR8IntegrationDatabaseIdentityBeforeDestructiveSqlV1(
  client: R8IntegrationIdentityQueryClient,
  expected: { databaseName: string; expectedInstanceId: string },
): Promise<void> {
  const { rows: dbRows } = await client.query<{ db: string }>('select current_database() as db');
  const observedDb = dbRows[0]?.db;
  if (observedDb !== expected.databaseName) {
    throw new Error('integration_database_identity_mismatch');
  }

  const { rows: idRows } = await client.query<{ instance_id: string | null }>(
    `select nullif(trim(current_setting($1, true)), '') as instance_id`,
    [M55_R8_DISPOSABLE_INSTANCE_GUC],
  );
  const observedId = idRows[0]?.instance_id;
  if (!observedId) {
    throw new Error('integration_instance_identifier_missing');
  }
  if (observedId !== expected.expectedInstanceId) {
    throw new Error('integration_instance_identifier_mismatch');
  }
}

/** Identity gate must pass before any destructive bootstrap SQL runs. */
async function runDestructiveIntegrationBootstrapV1(
  client: R8IntegrationIdentityQueryClient,
  guard: IntegrationGuardOk,
  bootstrap: (c: pg.Client) => Promise<void> = bootstrapSchema,
): Promise<void> {
  await verifyR8IntegrationDatabaseIdentityBeforeDestructiveSqlV1(client, {
    databaseName: guard.databaseName,
    expectedInstanceId: guard.expectedInstanceId,
  });
  await bootstrap(client as pg.Client);
}

const VERIFIED_SOURCE = 'verified-stripe-balance-v1';
const VERIFIED_EVIDENCE_DIGEST = '0123456789abcdef'.repeat(4);

const SHARED_STRIPE_SCOPE = 'acct_shared_liquidity_v1';
const SHARED_ECONOMIC_CANON = `STRIPE:${SHARED_STRIPE_SCOPE}:JPY:AVAILABLE`;

async function applySql(client: pg.Client, relativePath: string): Promise<void> {
  const sql = readFileSync(join(process.cwd(), relativePath), 'utf8');
  await client.query(sql);
}

async function bootstrapSchema(client: pg.Client): Promise<void> {
  await client.query('drop schema if exists public cascade; create schema public;');
  await client.query(
    `create role anon nologin; create role authenticated nologin; create role service_role nologin superuser;`,
  );
  await applySql(client, 'docs/planning/M55_R8_SETTLEMENT_EXECUTION_SCHEMA_PROPOSAL_2026-10-30.sql');
  await applySql(client, 'docs/planning/M55_R8_SETTLEMENT_DB_INTEGRATION_R6_SCHEMA_MIRROR.sql');
  await applySql(client, 'docs/planning/M55_R8_SETTLEMENT_DB_INTEGRATION_R6_CHAIN_FIXTURE.sql');
}

async function seedFundingSource(
  client: pg.Client,
  opts?: { digest?: string; scopeRef?: string; segment?: 'AVAILABLE' | 'PENDING' },
): Promise<string> {
  const scopeRef = opts?.scopeRef ?? 'acct_test_platform';
  const segment = opts?.segment ?? 'AVAILABLE';
  const digest = opts?.digest ?? VERIFIED_EVIDENCE_DIGEST;
  const economicCanonKey = `STRIPE:${scopeRef}:JPY:${segment}`;
  const fundingSourceId = randomUUID();
  await client.query(
    `insert into public.m55_r8_platform_liquidity_funding_sources_v1 (
      funding_source_id, proof_kind, verified_evidence_digest, stripe_platform_scope_ref,
      balance_currency_code, balance_segment, economic_canon_key
    ) values ($1, 'STRIPE_BALANCE_SNAPSHOT', $2, $3, 'JPY', $4, $5)`,
    [fundingSourceId, digest, scopeRef, segment, economicCanonKey],
  );
  return fundingSourceId;
}

async function seedCoverage(
  client: pg.Client,
  fundingSourceId: string,
  availableJpy: number,
): Promise<string> {
  const coverageId = randomUUID();
  await client.query(
    `insert into public.m55_r8_platform_liquidity_coverage_v1 (
      coverage_snapshot_id, funding_source_id, observed_at, available_jpy, coverage_ratio_bps, source_label, proof_kind
    ) values ($1, $2, now(), $3, 10000, $4, 'STRIPE_BALANCE_SNAPSHOT')`,
    [coverageId, fundingSourceId, availableJpy, VERIFIED_SOURCE],
  );
  return coverageId;
}

async function seedBankDayForStandardDue(client: pg.Client, cutoff: string): Promise<void> {
  const due = await client.query(`select public.m55_r8_standard_payout_due_utc_v1($1::timestamptz) as due`, [cutoff]);
  const ymd = await client.query(`select y,m,d from public.m55_r8_jst_ymd_v1($1::timestamptz)`, [
    (due.rows[0].due as Date).toISOString(),
  ]);
  const { y, m, d } = ymd.rows[0];
  await client.query(
    `insert into public.m55_r8_japanese_bank_calendar_days_v1 (jst_year,jst_month,jst_day,classification)
     values ($1,$2,$3,'BUSINESS') on conflict do nothing`,
    [y, m, d],
  );
}

async function lockBatch(
  client: pg.Client,
  args: {
    creatorId: string;
    cutoff: string;
    batchKey: string;
    feeKey: string;
    coverageId: string;
    asOf: string;
  },
): Promise<Record<string, unknown>> {
  const { rows } = await client.query(
    `select public.m55_r8_lock_payout_batch_v1($1::uuid,$2::timestamptz,$3::text,$4::text,$5::bigint,$6::uuid,$7::timestamptz,$8::timestamptz) as result`,
    [args.creatorId, args.cutoff, args.batchKey, args.feeKey, 0, args.coverageId, null, args.asOf],
  );
  return rows[0].result as Record<string, unknown>;
}

async function sumActiveReservationsForEconomicCanon(client: pg.Client, economicCanonKey: string): Promise<number> {
  const { rows } = await client.query(
    `select coalesce(sum(r.reserved_net_jpy),0)::bigint as total
     from public.m55_r8_platform_liquidity_reservations_v1 as r
     join public.m55_r8_platform_liquidity_coverage_v1 as c
       on c.coverage_snapshot_id = r.coverage_snapshot_id
     join public.m55_r8_platform_liquidity_funding_sources_v1 as fs
       on fs.funding_source_id = c.funding_source_id
     where r.released_at is null and fs.economic_canon_key = $1`,
    [economicCanonKey],
  );
  return Number(rows[0].total);
}

describe('R8 settlement postgres integration', { skip: !INTEGRATION_URL_CONFIGURED }, () => {
  it('serializes shared liquidity, validates idempotency, R6 chains, and rollback', async () => {
    const guard = assertR8IntegrationPreConnectGuardV1({
      M55_R8_INTEGRATION_ALLOW_DESTRUCTIVE: process.env[M55_R8_INTEGRATION_ALLOW_DESTRUCTIVE_ENV],
      M55_R8_INTEGRATION_DATABASE_URL: process.env.M55_R8_INTEGRATION_DATABASE_URL,
      M55_R8_INTEGRATION_INSTANCE_ID: process.env[M55_R8_INTEGRATION_INSTANCE_ID_ENV],
    });

    const admin = new Client({
      connectionString: guard.connectionString,
      connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    });
    try {
      await admin.connect();
    } catch {
      throw new Error('integration_database_connection_failed');
    }
    try {
      await runDestructiveIntegrationBootstrapV1(admin, guard);

      const creatorA = randomUUID();
      const creatorB = randomUUID();
      const originA = randomUUID();
      const originB = randomUUID();
      const profileA = randomUUID();
      const profileB = randomUUID();
      const cutoff = new Date(Date.now() - 86_400_000).toISOString();
      const payableAt = new Date(Date.now() - 3 * 86_400_000).toISOString();

      await admin.query(`select public.m55_r8_test_seed_r6_payable_chain_v1($1,$2,$3,$4,$5::timestamptz)`, [
        originA,
        creatorA,
        profileA,
        25_000,
        payableAt,
      ]);
      await admin.query(`select public.m55_r8_test_seed_r6_payable_chain_v1($1,$2,$3,$4,$5::timestamptz)`, [
        originB,
        creatorB,
        profileB,
        25_000,
        payableAt,
      ]);

      const fundingSourceId = await seedFundingSource(admin, { scopeRef: SHARED_STRIPE_SCOPE });
      const coverageId = await seedCoverage(admin, fundingSourceId, 30_000);
      await seedBankDayForStandardDue(admin, cutoff);
      const asOf = new Date().toISOString();

      const batchKeyA = `batch-shared:${creatorA.slice(0, 8)}`;
      const feeKeyA = `fee:${batchKeyA}`;

      let successCreator = creatorA;
      let successBatchKey = batchKeyA;
      let successFeeKey = feeKeyA;

      const clientA = new Client({
        connectionString: guard.connectionString,
        connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
      });
      const clientB = new Client({
        connectionString: guard.connectionString,
        connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
      });
      await clientA.connect();
      await clientB.connect();
      try {
        const [first, second] = await Promise.all([
          lockBatch(clientA, {
            creatorId: creatorA,
            cutoff,
            batchKey: batchKeyA,
            feeKey: feeKeyA,
            coverageId,
            asOf,
          }),
          lockBatch(clientB, {
            creatorId: creatorB,
            cutoff,
            batchKey: `batch-shared:${creatorB.slice(0, 8)}`,
            feeKey: `fee:batch-shared:${creatorB.slice(0, 8)}`,
            coverageId,
            asOf,
          }),
        ]);

        const successes = [first, second].filter((r) => r.ok === true);
        const holds = [first, second].filter((r) => r.ok === false);
        assert.ok(successes.length >= 1);
        assert.ok(holds.length >= 1);
        assert.ok(holds.some((r) => r.reason === 'INSUFFICIENT_CASH_COVERAGE'));

        const reservedTotal = await sumActiveReservationsForEconomicCanon(admin, SHARED_ECONOMIC_CANON);
        assert.ok(reservedTotal <= 30_000);

        const aSucceeded = first.ok === true;
        successCreator = aSucceeded ? creatorA : creatorB;
        successBatchKey = aSucceeded ? batchKeyA : `batch-shared:${creatorB.slice(0, 8)}`;
        successFeeKey = aSucceeded ? feeKeyA : `fee:batch-shared:${creatorB.slice(0, 8)}`;
      } finally {
        await clientA.end();
        await clientB.end();
      }

      const replay = await lockBatch(admin, {
        creatorId: successCreator,
        cutoff,
        batchKey: successBatchKey,
        feeKey: successFeeKey,
        coverageId,
        asOf: new Date().toISOString(),
      });
      assert.equal(replay.ok, true);
      assert.equal(replay.created, false);

      const wrongCreator = await lockBatch(admin, {
        creatorId: creatorA === successCreator ? creatorB : creatorA,
        cutoff,
        batchKey: successBatchKey,
        feeKey: successFeeKey,
        coverageId,
        asOf: new Date().toISOString(),
      });
      assert.equal(wrongCreator.ok, false);
      assert.equal(wrongCreator.reason, 'DUPLICATE_IDEMPOTENCY_CONFLICT');

      const wrongFee = await lockBatch(admin, {
        creatorId: successCreator,
        cutoff,
        batchKey: successBatchKey,
        feeKey: `${successFeeKey}:changed`,
        coverageId,
        asOf: new Date().toISOString(),
      });
      assert.equal(wrongFee.ok, false);
      assert.equal(wrongFee.reason, 'DUPLICATE_IDEMPOTENCY_CONFLICT');

      const secondKey = `${successBatchKey}:retry2`;
      const duplicateAlloc = await lockBatch(admin, {
        creatorId: successCreator,
        cutoff,
        batchKey: secondKey,
        feeKey: `fee:${secondKey}`,
        coverageId,
        asOf: new Date().toISOString(),
      });
      assert.equal(duplicateAlloc.ok, false);
      assert.equal(duplicateAlloc.reason, 'COMMISSION_ALREADY_ALLOCATED');

      const originAdjusted = randomUUID();
      const creatorC = randomUUID();
      const profileC = randomUUID();
      const adjustedPayableAt = new Date(Date.now() - 5 * 86_400_000).toISOString();
      await admin.query(`select public.m55_r8_test_seed_r6_payable_chain_v1($1,$2,$3,$4,$5::timestamptz)`, [
        originAdjusted,
        creatorC,
        profileC,
        30_000,
        adjustedPayableAt,
      ]);
      await admin.query(`select public.m55_r8_test_seed_r6_adjusted_payable_v1($1,$2,$3,$4,$5::timestamptz)`, [
        originAdjusted,
        creatorC,
        profileC,
        20_000,
        new Date(Date.now() - 86_400_000).toISOString(),
      ]);

      const fundingSourceC = await seedFundingSource(admin);
      const coverageC = await seedCoverage(admin, fundingSourceC, 500_000);
      await seedBankDayForStandardDue(admin, cutoff);
      const lockAdjusted = await lockBatch(admin, {
        creatorId: creatorC,
        cutoff,
        batchKey: `batch:${creatorC.slice(0, 8)}`,
        feeKey: `fee:batch:${creatorC.slice(0, 8)}`,
        coverageId: coverageC,
        asOf: new Date().toISOString(),
      });
      assert.equal(lockAdjusted.ok, true);
      const bundle = lockAdjusted.bundle as Record<string, unknown>;
      const instruction = bundle.instruction as Record<string, unknown>;
      assert.equal(instruction.settlementPayableJpy, 20_000);

      await admin.query('begin');
      const rollbackFunding = await seedFundingSource(admin, {
        scopeRef: 'acct_rollback_fixture',
        digest: 'ff'.repeat(32),
      });
      await admin.query(
        `insert into public.m55_r8_platform_liquidity_coverage_v1 (
          coverage_snapshot_id, funding_source_id, observed_at, available_jpy, coverage_ratio_bps, source_label, proof_kind
        ) values ($1, $2, now(), 500000, 10000, 'rollback-fixture-verified', 'STRIPE_BALANCE_SNAPSHOT')`,
        [randomUUID(), rollbackFunding],
      );
      await admin.query('rollback');
      const { rows: covCount } = await admin.query(
        `select count(*)::int as c from public.m55_r8_platform_liquidity_coverage_v1 where source_label = 'rollback-fixture-verified'`,
      );
      assert.equal(covCount[0].c, 0);

      const { rows: tzRows } = await admin.query(`show timezone`);
      await admin.query(`set timezone to 'UTC'`);
      const utcDue = await admin.query(
        `select public.m55_r8_standard_payout_due_utc_v1('2026-01-31 14:59:59.999+00'::timestamptz) as due`,
      );
      await admin.query(`set timezone to '${tzRows[0].TimeZone}'`);
      const dueUtc = utcDue.rows[0].due as Date;
      const ymd = await admin.query(`select y,m,d from public.m55_r8_jst_ymd_v1($1::timestamptz)`, [
        dueUtc.toISOString(),
      ]);
      assert.equal(Number(ymd.rows[0].m), 2);
      assert.equal(Number(ymd.rows[0].d), 15);

      const creatorD = randomUUID();
      const profileD = randomUUID();
      const originD = randomUUID();
      await admin.query(`select public.m55_r8_test_seed_r6_payable_chain_v1($1,$2,$3,$4,$5::timestamptz)`, [
        originD,
        creatorD,
        profileD,
        25_000,
        payableAt,
      ]);
      const duplicateCanonFundingId = await seedFundingSource(admin, {
        scopeRef: SHARED_STRIPE_SCOPE,
        digest: 'ab'.repeat(32),
      });
      const altSnapshotId = await seedCoverage(admin, duplicateCanonFundingId, 30_000);
      const crossSnapshot = await lockBatch(admin, {
        creatorId: creatorD,
        cutoff,
        batchKey: `batch-alt:${creatorD.slice(0, 8)}`,
        feeKey: `fee:batch-alt:${creatorD.slice(0, 8)}`,
        coverageId: altSnapshotId,
        asOf: new Date().toISOString(),
      });
      assert.equal(crossSnapshot.ok, false);
      assert.equal(crossSnapshot.reason, 'INSUFFICIENT_CASH_COVERAGE');

      const creatorPostCutoff = randomUUID();
      const profilePostCutoff = randomUUID();
      const originPostCutoff = randomUUID();
      const afterCutoffPayable = new Date(Date.now() - 12 * 3_600_000).toISOString();
      await admin.query(`select public.m55_r8_test_seed_r6_payable_chain_v1($1,$2,$3,$4,$5::timestamptz)`, [
        originPostCutoff,
        creatorPostCutoff,
        profilePostCutoff,
        25_000,
        afterCutoffPayable,
      ]);
      const postCutoffFunding = await seedFundingSource(admin, { scopeRef: 'acct_post_cutoff_only' });
      const postCutoffCoverage = await seedCoverage(admin, postCutoffFunding, 500_000);
      await seedBankDayForStandardDue(admin, cutoff);
      const lockPostCutoffOnly = await lockBatch(admin, {
        creatorId: creatorPostCutoff,
        cutoff,
        batchKey: `batch:post-cutoff:${creatorPostCutoff.slice(0, 8)}`,
        feeKey: `fee:post-cutoff:${creatorPostCutoff.slice(0, 8)}`,
        coverageId: postCutoffCoverage,
        asOf: new Date().toISOString(),
      });
      assert.equal(lockPostCutoffOnly.ok, false);
      assert.equal(lockPostCutoffOnly.reason, 'NO_ELIGIBLE_COMMISSIONS');

      const creatorHold = randomUUID();
      const profileHold = randomUUID();
      const originHold = randomUUID();
      await admin.query(`select public.m55_r8_test_seed_r6_payable_chain_v1($1,$2,$3,$4,$5::timestamptz)`, [
        originHold,
        creatorHold,
        profileHold,
        25_000,
        payableAt,
      ]);
      await admin.query(`select public.m55_r8_test_seed_r6_hold_after_date_v1($1,$2,$3,$4::timestamptz)`, [
        originHold,
        creatorHold,
        profileHold,
        new Date(Date.now() - 12 * 3_600_000).toISOString(),
      ]);
      const holdFunding = await seedFundingSource(admin, { scopeRef: 'acct_hold_after_cutoff' });
      const holdCoverage = await seedCoverage(admin, holdFunding, 500_000);
      const lockHold = await lockBatch(admin, {
        creatorId: creatorHold,
        cutoff,
        batchKey: `batch:hold:${creatorHold.slice(0, 8)}`,
        feeKey: `fee:hold:${creatorHold.slice(0, 8)}`,
        coverageId: holdCoverage,
        asOf: new Date().toISOString(),
      });
      assert.equal(lockHold.ok, false);
      assert.equal(lockHold.reason, 'NO_ELIGIBLE_COMMISSIONS');

      const creatorPending = randomUUID();
      const profilePending = randomUUID();
      const originPending = randomUUID();
      await admin.query(`select public.m55_r8_test_seed_r6_payable_chain_v1($1,$2,$3,$4,$5::timestamptz)`, [
        originPending,
        creatorPending,
        profilePending,
        25_000,
        payableAt,
      ]);
      const pendingFunding = await seedFundingSource(admin, {
        scopeRef: 'acct_pending_balance',
        segment: 'PENDING',
      });
      const pendingCoverage = await seedCoverage(admin, pendingFunding, 500_000);
      await seedBankDayForStandardDue(admin, cutoff);
      const lockPending = await lockBatch(admin, {
        creatorId: creatorPending,
        cutoff,
        batchKey: `batch:pending:${creatorPending.slice(0, 8)}`,
        feeKey: `fee:pending:${creatorPending.slice(0, 8)}`,
        coverageId: pendingCoverage,
        asOf: new Date().toISOString(),
      });
      assert.equal(lockPending.ok, false);
      assert.equal(lockPending.reason, 'INSUFFICIENT_CASH_COVERAGE');
    } finally {
      await admin.end();
    }
  });
});

describe('R8 settlement postgres integration (skipped)', { skip: INTEGRATION_URL_CONFIGURED }, () => {
  it('documents skip when M55_R8_INTEGRATION_DATABASE_URL is unset', () => {
    assert.ok(true);
  });
});

describe('R8 settlement postgres integration destructive guard (static)', () => {
  const validUrl =
    'postgresql://postgres:static_fixture_only@127.0.0.1:15432/m55_r8_disposable_static_fixture';
  const validInstance = 'static-fixture-01';

  it('rejects without destructive opt-in', () => {
    const v = assessR8IntegrationDestructiveTargetV1({
      M55_R8_INTEGRATION_DATABASE_URL: validUrl,
      M55_R8_INTEGRATION_INSTANCE_ID: validInstance,
    });
    assert.equal(v.ok, false);
    if (!v.ok) assert.equal(v.reason, 'destructive_opt_in_required');
  });

  it('rejects remote supabase host pattern in URL string', () => {
    const v = assessR8IntegrationDestructiveTargetV1({
      M55_R8_INTEGRATION_ALLOW_DESTRUCTIVE: 'true',
      M55_R8_INTEGRATION_DATABASE_URL:
        'postgresql://postgres:x@db.abcdefghijklmnop.supabase.co:5432/m55_r8_disposable_remote',
      M55_R8_INTEGRATION_INSTANCE_ID: validInstance,
    });
    assert.equal(v.ok, false);
    if (!v.ok) assert.equal(v.reason, 'remote_host_pattern_forbidden');
  });

  it('rejects localhost hostname alias', () => {
    const v = assessR8IntegrationDestructiveTargetV1({
      M55_R8_INTEGRATION_ALLOW_DESTRUCTIVE: 'true',
      M55_R8_INTEGRATION_DATABASE_URL:
        'postgresql://postgres:x@localhost:5432/m55_r8_disposable_alias',
      M55_R8_INTEGRATION_INSTANCE_ID: validInstance,
    });
    assert.equal(v.ok, false);
    if (!v.ok) assert.equal(v.reason, 'host_localhost_alias_forbidden');
  });

  it('rejects non-disposable database name', () => {
    const v = assessR8IntegrationDestructiveTargetV1({
      M55_R8_INTEGRATION_ALLOW_DESTRUCTIVE: 'true',
      M55_R8_INTEGRATION_DATABASE_URL: 'postgresql://postgres:x@127.0.0.1:5432/postgres',
      M55_R8_INTEGRATION_INSTANCE_ID: validInstance,
    });
    assert.equal(v.ok, false);
    if (!v.ok) assert.equal(v.reason, 'database_name_not_disposable_r8');
  });

  it('rejects missing instance identifier', () => {
    const v = assessR8IntegrationDestructiveTargetV1({
      M55_R8_INTEGRATION_ALLOW_DESTRUCTIVE: 'true',
      M55_R8_INTEGRATION_DATABASE_URL: validUrl,
    });
    assert.equal(v.ok, false);
    if (!v.ok) assert.equal(v.reason, 'integration_instance_id_missing');
  });

  it('allows structurally valid disposable target (not a live DB pass)', () => {
    const v = assessR8IntegrationDestructiveTargetV1({
      M55_R8_INTEGRATION_ALLOW_DESTRUCTIVE: 'true',
      M55_R8_INTEGRATION_DATABASE_URL: validUrl,
      M55_R8_INTEGRATION_INSTANCE_ID: validInstance,
    });
    assert.equal(v.ok, true);
    if (v.ok) {
      assert.equal(v.databaseName, 'm55_r8_disposable_static_fixture');
      assert.equal(v.expectedInstanceId, validInstance);
    }
  });

  it('pre-connect guard throws on invalid instance identifier format', () => {
    assert.throws(
      () =>
        assertR8IntegrationPreConnectGuardV1({
          M55_R8_INTEGRATION_ALLOW_DESTRUCTIVE: 'true',
          M55_R8_INTEGRATION_DATABASE_URL: validUrl,
          M55_R8_INTEGRATION_INSTANCE_ID: 'short',
        }),
      /integration_instance_id_invalid/,
    );
  });

  it('rejects any query parameter on integration URL', () => {
    const v = assessR8IntegrationDestructiveTargetV1({
      M55_R8_INTEGRATION_ALLOW_DESTRUCTIVE: 'true',
      M55_R8_INTEGRATION_DATABASE_URL: `${validUrl}?sslmode=disable`,
      M55_R8_INTEGRATION_INSTANCE_ID: validInstance,
    });
    assert.equal(v.ok, false);
    if (!v.ok) assert.equal(v.reason, 'connection_query_parameters_forbidden');
  });

  it('rejects URL hash fragment', () => {
    const v = parseR8IntegrationDatabaseUrlV1(`${validUrl}#fragment`);
    assert.equal(v.ok, false);
    if (!v.ok) assert.equal(v.reason, 'connection_url_fragment_forbidden');
  });
});

describe('R8 settlement postgres integration identity verify (mocked, no network)', () => {
  const guardFixture: IntegrationGuardOk = {
    ok: true,
    connectionString:
      'postgresql://postgres:static_fixture_only@127.0.0.1:15432/m55_r8_disposable_static_fixture',
    databaseName: 'm55_r8_disposable_static_fixture',
    expectedInstanceId: 'static-fixture-01',
  };

  function mockIdentityClient(responses: {
    currentDatabase: string;
    instanceId: string | null;
  }): R8IntegrationIdentityQueryClient {
    return {
      query: async (text: string) => {
        if (text.includes('current_database()')) {
          return { rows: [{ db: responses.currentDatabase }] };
        }
        if (text.includes('current_setting')) {
          return { rows: [{ instance_id: responses.instanceId }] };
        }
        throw new Error('unexpected_mock_query');
      },
    };
  }

  it('rejects integration_database_identity_mismatch', async () => {
    await assert.rejects(
      () =>
        verifyR8IntegrationDatabaseIdentityBeforeDestructiveSqlV1(
          mockIdentityClient({ currentDatabase: 'postgres', instanceId: guardFixture.expectedInstanceId }),
          {
            databaseName: guardFixture.databaseName,
            expectedInstanceId: guardFixture.expectedInstanceId,
          },
        ),
      /integration_database_identity_mismatch/,
    );
  });

  it('rejects integration_instance_identifier_missing', async () => {
    await assert.rejects(
      () =>
        verifyR8IntegrationDatabaseIdentityBeforeDestructiveSqlV1(
          mockIdentityClient({ currentDatabase: guardFixture.databaseName, instanceId: null }),
          {
            databaseName: guardFixture.databaseName,
            expectedInstanceId: guardFixture.expectedInstanceId,
          },
        ),
      /integration_instance_identifier_missing/,
    );
  });

  it('rejects integration_instance_identifier_mismatch', async () => {
    await assert.rejects(
      () =>
        verifyR8IntegrationDatabaseIdentityBeforeDestructiveSqlV1(
          mockIdentityClient({
            currentDatabase: guardFixture.databaseName,
            instanceId: 'other-instance-id',
          }),
          {
            databaseName: guardFixture.databaseName,
            expectedInstanceId: guardFixture.expectedInstanceId,
          },
        ),
      /integration_instance_identifier_mismatch/,
    );
  });

  it('does not call bootstrapSchema when identity verification fails', async () => {
    let bootstrapInvoked = false;
    await assert.rejects(
      () =>
        runDestructiveIntegrationBootstrapV1(
          mockIdentityClient({ currentDatabase: 'postgres', instanceId: guardFixture.expectedInstanceId }),
          guardFixture,
          async () => {
            bootstrapInvoked = true;
          },
        ),
      /integration_database_identity_mismatch/,
    );
    assert.equal(bootstrapInvoked, false);
  });

  it('integration Client uses connectionString only (no alternate host env keys in this file)', () => {
    const src = readFileSync(join(process.cwd(), 'lib/m55/creatorSettlement/r8SettlementPostgres.integration.test.ts'), 'utf8');
    assert.doesNotMatch(src, /process\.env\.(PGHOST|PGPORT|PGDATABASE|DATABASE_URL)\b/);
    assert.match(src, /connectionString:\s*guard\.connectionString/);
  });
});
