import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { describe, it } from 'node:test';
import pg from 'pg';

const { Client } = pg;

const DATABASE_URL = process.env.M55_R8_INTEGRATION_DATABASE_URL ?? '';
const VERIFIED_SOURCE = 'verified-stripe-balance-v1';

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
  await applySql(client, 'docs/planning/M55_R8_SETTLEMENT_DB_INTEGRATION_FIXTURE.sql');
  await applySql(client, 'docs/planning/M55_R8_SETTLEMENT_DB_INTEGRATION_R6_CHAIN_FIXTURE.sql');
}

async function seedCoverage(client: pg.Client, availableJpy: number): Promise<string> {
  const coverageId = randomUUID();
  await client.query(
    `insert into public.m55_r8_platform_liquidity_coverage_v1 (
      coverage_snapshot_id, observed_at, available_jpy, coverage_ratio_bps, source_label, proof_kind
    ) values ($1, now(), $2, 10000, $3, 'STRIPE_BALANCE_SNAPSHOT')`,
    [coverageId, availableJpy, VERIFIED_SOURCE],
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

async function sumActiveReservations(client: pg.Client, coverageId: string): Promise<number> {
  const { rows } = await client.query(
    `select coalesce(sum(reserved_net_jpy),0)::bigint as total
     from public.m55_r8_platform_liquidity_reservations_v1
     where released_at is null and coverage_snapshot_id = $1`,
    [coverageId],
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
      const cutoff = new Date(Date.now() + 86_400_000).toISOString();
      const payableAt = new Date(Date.now() - 2 * 86_400_000).toISOString();

      await admin.query(`select public.m55_r8_test_seed_r6_payable_chain_v1($1,$2,$3,$4::timestamptz)`, [
        originA,
        creatorA,
        25_000,
        payableAt,
      ]);
      await admin.query(`select public.m55_r8_test_seed_r6_payable_chain_v1($1,$2,$3,$4::timestamptz)`, [
        originB,
        creatorB,
        25_000,
        payableAt,
      ]);

      const coverageId = await seedCoverage(admin, 30_000);
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

        const reservedTotal = await sumActiveReservations(admin, coverageId);
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
      const adjustedPayableAt = new Date(Date.now() - 5 * 86_400_000).toISOString();
      await admin.query(`select public.m55_r8_test_seed_r6_payable_chain_v1($1,$2,$3,$4::timestamptz)`, [
        originAdjusted,
        creatorC,
        30_000,
        adjustedPayableAt,
      ]);
      await admin.query(`select public.m55_r8_test_seed_r6_adjusted_payable_v1($1,$2,20000,$3::timestamptz)`, [
        originAdjusted,
        creatorC,
        new Date(Date.now() - 86_400_000).toISOString(),
      ]);

      const coverageC = await seedCoverage(admin, 500_000);
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
      await admin.query(
        `insert into public.m55_r8_platform_liquidity_coverage_v1 (
          coverage_snapshot_id, observed_at, available_jpy, coverage_ratio_bps, source_label, proof_kind
        ) values ($1, now(), 500000, 10000, 'rollback-fixture-verified', 'STRIPE_BALANCE_SNAPSHOT')`,
        [randomUUID()],
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
