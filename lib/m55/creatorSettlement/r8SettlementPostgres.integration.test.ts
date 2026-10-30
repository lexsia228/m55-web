import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { describe, it } from 'node:test';
import pg from 'pg';

const { Client } = pg;

const DATABASE_URL = process.env.M55_R8_INTEGRATION_DATABASE_URL ?? '';
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

describe('R8 settlement postgres integration', { skip: !DATABASE_URL }, () => {
  it('serializes shared liquidity, validates idempotency, R6 chains, and rollback', async () => {
    const admin = new Client({ connectionString: DATABASE_URL });
    await admin.connect();
    try {
      await bootstrapSchema(admin);

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

      const clientA = new Client({ connectionString: DATABASE_URL });
      const clientB = new Client({ connectionString: DATABASE_URL });
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

describe('R8 settlement postgres integration (skipped)', { skip: !!DATABASE_URL }, () => {
  it('documents skip when M55_R8_INTEGRATION_DATABASE_URL is unset', () => {
    assert.ok(true);
  });
});
