import type { Client } from 'pg';

import {
  buildPairP5FulfillHistoryInsertBinding,
  PAIR_P5_FULFILL_MIGRATION_VERSION,
  PAIR_P5_FULFILL_PRE_APPLY_FULFILL_RPC_PROSRC_MD5,
  validatePairP5FulfillPostProbeResult,
  validatePairP5FulfillPriorProbeResult,
} from './pairP5FulfillStepAuthority.ts';
import { PAIR_P5_FULFILL_ORCHESTRATION_PROBE_SUITE } from './pairP5FulfillAuthorizationGatedRealExecutor.ts';
import { validatePairP5FunctionBodyCatalogProbeResult } from './pairP5IdentityAuthorizationGatedRealExecutor.ts';
import { HISTORY_INSERT_SQL_METADATA } from './types.ts';

export type PairP5FulfillDisposablePgApplyResult =
  | { readonly ok: true; readonly committed: true }
  | { readonly ok: false; readonly phase: string; readonly error: string };

export type PairP5FulfillDisposablePgApplyOptions = {
  /** After this many migration DDL statements, inject a hard failure (transaction rolls back). */
  readonly injectHardFailureAfterMutationStatements?: number;
};

export async function queryPairP5FulfillStructuralArtifactCounts(client: Client): Promise<{
  readonly migrationVersionRows: number;
}> {
  const migration = await client.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM supabase_migrations.schema_migrations WHERE version::text = $1`,
    [PAIR_P5_FULFILL_MIGRATION_VERSION],
  );
  return {
    migrationVersionRows: Number.parseInt(migration.rows[0]?.count ?? '0', 10),
  };
}

export async function assertPairP5FulfillStructuralArtifactsAbsent(client: Client): Promise<void> {
  const counts = await queryPairP5FulfillStructuralArtifactCounts(client);
  if (counts.migrationVersionRows !== 0) {
    throw new Error('HOLD_PAIR_P5_FULFILL_PARTIAL_HISTORY_AFTER_ROLLBACK');
  }
  const prosrc = await client.query<{ md5: string | null }>(
    `SELECT md5(p.prosrc) AS md5
     FROM pg_catalog.pg_proc p
     WHERE p.oid = to_regprocedure('public.m55_fulfill_compatibility_report_v1(uuid, text, text)')`,
  );
  const observed = prosrc.rows[0]?.md5 ?? null;
  if (observed !== PAIR_P5_FULFILL_PRE_APPLY_FULFILL_RPC_PROSRC_MD5) {
    throw new Error('HOLD_PAIR_P5_FULFILL_PARTIAL_PROSRC_AFTER_ROLLBACK');
  }
}

export async function executePairP5FulfillSingleTransactionOnPgClient(
  client: Client,
  repoRoot: string,
  options: PairP5FulfillDisposablePgApplyOptions = {},
): Promise<PairP5FulfillDisposablePgApplyResult> {
  const probes = PAIR_P5_FULFILL_ORCHESTRATION_PROBE_SUITE;
  const plan = buildPairP5FulfillHistoryInsertBinding(repoRoot);
  const statements = [...plan.statements];

  try {
    await client.query('BEGIN');
    const prior = await client.query(probes.priorProbeSql);
    if (!validatePairP5FulfillPriorProbeResult(prior).ok) {
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
    if (!validatePairP5FulfillPostProbeResult(post).ok) {
      await client.query('ROLLBACK');
      return { ok: false, phase: 'POST_PROBE', error: 'HOLD_PAIR_P5_PROBE_MISMATCH' };
    }
    const catalogProbeSql =
      probes.functionBodyCatalogProbeSql ??
      PAIR_P5_FULFILL_ORCHESTRATION_PROBE_SUITE.functionBodyCatalogProbeSql;
    if (catalogProbeSql === undefined) {
      await client.query('ROLLBACK');
      return { ok: false, phase: 'FUNCTION_BODY_CATALOG_PROBE', error: 'HOLD_PAIR_P5_FUNCTION_BODY_CATALOG_MISSING' };
    }
    const catalog = await client.query(catalogProbeSql);
    if (!validatePairP5FunctionBodyCatalogProbeResult(catalog).ok) {
      await client.query('ROLLBACK');
      return { ok: false, phase: 'FUNCTION_BODY_CATALOG_PROBE', error: 'HOLD_PAIR_P5_FUNCTION_BODY_CATALOG_MISMATCH' };
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
