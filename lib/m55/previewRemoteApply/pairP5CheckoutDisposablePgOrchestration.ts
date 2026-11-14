import type { Client } from 'pg';

import {
  buildPairP5CheckoutHistoryInsertBinding,
  PAIR_P5_CHECKOUT_MIGRATION_VERSION,
  PAIR_P5_CHECKOUT_ORCHESTRATION_PROBE_SUITE,
  validatePairP5CheckoutPostProbeResult,
  validatePairP5CheckoutPriorProbeResult,
} from './pairP5CheckoutStepAuthority.ts';
import { HISTORY_INSERT_SQL_METADATA } from './types.ts';

export type PairP5CheckoutDisposablePgApplyResult =
  | { readonly ok: true; readonly committed: true }
  | { readonly ok: false; readonly phase: string; readonly error: string };

export type PairP5CheckoutDisposablePgApplyOptions = {
  readonly skipTxnSentinelFirstStatement?: boolean;
  /** After this many migration DDL statements, inject a hard failure (transaction rolls back). */
  readonly injectHardFailureAfterMutationStatements?: number;
};

const CHECKOUT_RESERVATION_RPC_NAMES = [
  'm55_reserve_compatibility_checkout_v1',
  'm55_classify_pending_checkout_context_v1',
  'm55_acquire_compatibility_checkout_create_slot_v1',
  'm55_cas_attach_compatibility_checkout_session_v1',
  'm55_cas_release_compatibility_checkout_expired_v1',
] as const;

const CHECKOUT_ADDITIVE_COLUMNS = ['checkout_origin_frozen', 'stripe_create_first_attempt_at'] as const;

export async function queryPairP5CheckoutStructuralArtifactCounts(client: Client): Promise<{
  readonly migrationVersionRows: number;
  readonly checkoutColumnCount: number;
  readonly pendingTupleIndexCount: number;
  readonly reservationRpcCount: number;
}> {
  const migration = await client.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM supabase_migrations.schema_migrations WHERE version::text = $1`,
    [PAIR_P5_CHECKOUT_MIGRATION_VERSION],
  );
  const columns = await client.query<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM pg_catalog.pg_attribute a
     JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
     JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'compatibility_purchase_contexts'
       AND c.relkind = 'r'
       AND a.attname = ANY ($1::text[])
       AND a.attnum > 0
       AND NOT a.attisdropped`,
    [CHECKOUT_ADDITIVE_COLUMNS],
  );
  const index = await client.query<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM pg_catalog.pg_class c
     JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'compatibility_purchase_contexts_pending_tuple_uidx'
       AND c.relkind = 'i'`,
  );
  const rpcs = await client.query<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM pg_catalog.pg_proc p
     JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = ANY ($1::text[])`,
    [CHECKOUT_RESERVATION_RPC_NAMES],
  );
  return {
    migrationVersionRows: Number.parseInt(migration.rows[0]?.count ?? '0', 10),
    checkoutColumnCount: Number.parseInt(columns.rows[0]?.count ?? '0', 10),
    pendingTupleIndexCount: Number.parseInt(index.rows[0]?.count ?? '0', 10),
    reservationRpcCount: Number.parseInt(rpcs.rows[0]?.count ?? '0', 10),
  };
}

export async function assertPairP5CheckoutStructuralArtifactsAbsent(client: Client): Promise<void> {
  const counts = await queryPairP5CheckoutStructuralArtifactCounts(client);
  if (counts.migrationVersionRows !== 0) {
    throw new Error('HOLD_PAIR_P5_CHECKOUT_PARTIAL_HISTORY_AFTER_ROLLBACK');
  }
  if (counts.checkoutColumnCount !== 0) {
    throw new Error('HOLD_PAIR_P5_CHECKOUT_PARTIAL_COLUMNS_AFTER_ROLLBACK');
  }
  if (counts.pendingTupleIndexCount !== 0) {
    throw new Error('HOLD_PAIR_P5_CHECKOUT_PARTIAL_INDEX_AFTER_ROLLBACK');
  }
  if (counts.reservationRpcCount !== 0) {
    throw new Error('HOLD_PAIR_P5_CHECKOUT_PARTIAL_RPC_AFTER_ROLLBACK');
  }
}

export async function executePairP5CheckoutSingleTransactionOnPgClient(
  client: Client,
  repoRoot: string,
  options: PairP5CheckoutDisposablePgApplyOptions = {},
): Promise<PairP5CheckoutDisposablePgApplyResult> {
  const probes = PAIR_P5_CHECKOUT_ORCHESTRATION_PROBE_SUITE;
  const plan = buildPairP5CheckoutHistoryInsertBinding(repoRoot);
  const statements = [...plan.statements];
  if (options.skipTxnSentinelFirstStatement === true) {
    statements.shift();
  }

  try {
    await client.query('BEGIN');
    const prior = await client.query(probes.priorProbeSql);
    if (!validatePairP5CheckoutPriorProbeResult(prior).ok) {
      await client.query('ROLLBACK');
      return { ok: false, phase: 'PRIOR_PROBE', error: 'HOLD_PAIR_P5_PROBE_MISMATCH' };
    }
    let mutationStatementsExecuted = 0;
    for (const statement of statements) {
      await client.query(statement);
      mutationStatementsExecuted += 1;
      if (
        options.injectHardFailureAfterMutationStatements !== undefined &&
        mutationStatementsExecuted === options.injectHardFailureAfterMutationStatements
      ) {
        await client.query('SELECT (1 / 0)::int');
      }
    }
    await client.query(HISTORY_INSERT_SQL_METADATA, [plan.version, plan.statements, plan.name]);
    const post = await client.query(probes.postProbeSql);
    if (!validatePairP5CheckoutPostProbeResult(post).ok) {
      await client.query('ROLLBACK');
      return { ok: false, phase: 'POST_PROBE', error: 'HOLD_PAIR_P5_PROBE_MISMATCH' };
    }
    await client.query('COMMIT');
    return { ok: true, committed: true };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore secondary rollback failure
    }
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, phase: 'MUTATION', error: message };
  }
}

export async function countSchemaMigrationVersion(client: Client, version: string): Promise<number> {
  const result = await client.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM supabase_migrations.schema_migrations WHERE version::text = $1`,
    [version],
  );
  return Number.parseInt(result.rows[0]?.count ?? '0', 10);
}

/** @deprecated Prefer assertPairP5CheckoutStructuralArtifactsAbsent */
export async function assertPairP5CheckoutAbsentAfterRollback(client: Client): Promise<void> {
  await assertPairP5CheckoutStructuralArtifactsAbsent(client);
}
