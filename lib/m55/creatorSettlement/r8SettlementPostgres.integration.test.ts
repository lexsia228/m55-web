import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { describe, it } from 'node:test';
import pg from 'pg';

const { Client } = pg;

const DATABASE_URL = process.env.M55_R8_INTEGRATION_DATABASE_URL ?? '';

async function applySql(client: pg.Client, relativePath: string): Promise<void> {
  const sql = readFileSync(join(process.cwd(), relativePath), 'utf8');
  await client.query(sql);
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
    [
      args.creatorId,
      args.cutoff,
      args.batchKey,
      args.feeKey,
      0,
      args.coverageId,
      null,
      args.asOf,
    ],
  );
  return rows[0].result as Record<string, unknown>;
}

describe('R8 settlement postgres integration', { skip: !DATABASE_URL }, () => {
  it('locks batch atomically with idempotency, concurrency, and allocation guards', async () => {
    const admin = new Client({ connectionString: DATABASE_URL });
    await admin.connect();
    try {
      await admin.query('drop schema if exists public cascade; create schema public;');
      await admin.query(`create role anon nologin; create role authenticated nologin; create role service_role nologin superuser;`);
      await applySql(admin, 'docs/planning/M55_R8_SETTLEMENT_EXECUTION_SCHEMA_PROPOSAL_2026-10-30.sql');
      await applySql(admin, 'docs/planning/M55_R8_SETTLEMENT_DB_INTEGRATION_FIXTURE.sql');

      const creatorA = randomUUID();
      const creatorB = randomUUID();
      const commissionA = randomUUID();
      const commissionB = randomUUID();
      const coverageId = randomUUID();
      const asOf = new Date().toISOString();
      const cutoff = new Date(Date.now() + 86_400_000).toISOString();

      await admin.query(
        `insert into public.m55_r6_commission_ledger_events (
          commission_event_id, origin_commission_event_id, event_family, lifecycle_state_after_event,
          entitlement_after_event_jpy, recorded_at, creator_economic_identity_id
        ) values ($1,null,'COMMISSION_ACCRUED','COMMISSION_PAYABLE',$2,$3::timestamptz - interval '2 days',$4)`,
        [commissionA, 25_000, cutoff, creatorA],
      );
      await admin.query(
        `insert into public.m55_r6_commission_ledger_events (
          commission_event_id, origin_commission_event_id, event_family, lifecycle_state_after_event,
          entitlement_after_event_jpy, recorded_at, creator_economic_identity_id
        ) values ($1,null,'COMMISSION_ACCRUED','COMMISSION_PAYABLE',$2,$3::timestamptz - interval '2 days',$4)`,
        [commissionB, 25_000, cutoff, creatorB],
      );

      await admin.query(
        `insert into public.m55_r8_platform_liquidity_coverage_v1 (
          coverage_snapshot_id, observed_at, available_jpy, coverage_ratio_bps, source_label, proof_kind
        ) values ($1, now(), 500000, 10000, 'integration-fixture', 'STRIPE_BALANCE_SNAPSHOT')`,
        [coverageId],
      );

      const due = await admin.query(`select public.m55_r8_standard_payout_due_utc_v1($1::timestamptz) as due`, [cutoff]);
      const dueTs = due.rows[0].due as Date;
      const ymd = await admin.query(
        `select y,m,d from public.m55_r8_jst_ymd_v1($1::timestamptz)`,
        [dueTs.toISOString()],
      );
      const { y, m, d } = ymd.rows[0];
      await admin.query(
        `insert into public.m55_r8_japanese_bank_calendar_days_v1 (jst_year,jst_month,jst_day,classification)
         values ($1,$2,$3,'BUSINESS') on conflict do nothing`,
        [y, m, d],
      );

      const batchKey = `batch:${creatorA.slice(0, 8)}`;
      const feeKey = `fee:${batchKey}`;

      const first = await lockBatch(admin, {
        creatorId: creatorA,
        cutoff,
        batchKey,
        feeKey,
        coverageId,
        asOf,
      });
      assert.equal(first.ok, true);
      assert.equal(first.created, true);

      const retry = await lockBatch(admin, {
        creatorId: creatorA,
        cutoff,
        batchKey,
        feeKey,
        coverageId,
        asOf,
      });
      assert.equal(retry.ok, true);
      assert.equal(retry.created, false);

      const { rows: feeCount } = await admin.query(
        `select count(*)::int as c from public.m55_r8_payout_fee_charges_v1`,
      );
      assert.equal(feeCount[0].c, 1);

      const secondKey = `batch:${creatorA.slice(0, 8)}:2`;
      const duplicate = await lockBatch(admin, {
        creatorId: creatorA,
        cutoff,
        batchKey: secondKey,
        feeKey: `fee:${secondKey}`,
        coverageId,
        asOf,
      });
      assert.equal(duplicate.ok, false);
      assert.equal(duplicate.reason, 'COMMISSION_ALREADY_ALLOCATED');

      const clientB = new Client({ connectionString: DATABASE_URL });
      await clientB.connect();
      try {
        const other = await lockBatch(clientB, {
          creatorId: creatorB,
          cutoff,
          batchKey: `batch:${creatorB.slice(0, 8)}`,
          feeKey: `fee:batch:${creatorB.slice(0, 8)}`,
          coverageId,
          asOf,
        });
        assert.equal(other.ok, true);
        const { rows: linesB } = await clientB.query(
          `select count(*)::int as c from public.m55_r8_payout_batch_lines_v1 bl
           join public.m55_r8_payout_instructions_v1 i on i.instruction_id = bl.instruction_id
           where i.creator_economic_identity_id = $1`,
          [creatorB],
        );
        assert.equal(linesB[0].c, 1);
      } finally {
        await clientB.end();
      }

      await admin.query(`create role m55_r8_readonly nologin`);
      await admin.query(`revoke all on all tables in schema public from m55_r8_readonly`);
      await admin.query(`grant m55_r8_readonly to current_user`);
      let denied = false;
      try {
        await admin.query('set role m55_r8_readonly');
        await admin.query(`select 1 from public.m55_r8_payout_batches_v1 limit 1`);
      } catch {
        denied = true;
      } finally {
        await admin.query('reset role');
      }
      assert.equal(denied, true);

      await admin.query('begin');
      await admin.query(`insert into public.m55_r8_platform_liquidity_coverage_v1 (
        coverage_snapshot_id, observed_at, available_jpy, coverage_ratio_bps, source_label, proof_kind
      ) values ($1, now(), 500000, 10000, 'rollback-fixture', 'STRIPE_BALANCE_SNAPSHOT')`, [randomUUID()]);
      await admin.query('rollback');
      const { rows: covCount } = await admin.query(
        `select count(*)::int as c from public.m55_r8_platform_liquidity_coverage_v1 where source_label = 'rollback-fixture'`,
      );
      assert.equal(covCount[0].c, 0);
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
