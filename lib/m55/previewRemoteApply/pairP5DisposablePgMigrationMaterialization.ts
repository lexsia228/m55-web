import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { Client } from 'pg';

import { buildRoleBootstrapSql } from '../../../scripts/m55/previewBaselineDisposableRuntime.ts';
import { splitAndTrim } from '../transactionNormalized/splitAndTrim.ts';
import { PAIR_P5_POST_IDENTITY_HISTORY_VERSIONS } from './pairP5IdentityStepAuthority.ts';
import { HISTORY_INSERT_SQL_METADATA } from './types.ts';

export type PairP5MigrationSqlArtifact = {
  readonly version: string;
  readonly migrationName: string;
  readonly absolutePath: string;
};

export function resolvePairP5MigrationSqlArtifact(
  repoRoot: string,
  version: string,
): PairP5MigrationSqlArtifact {
  if (version === '20260614000000') {
    return {
      version,
      migrationName: 'preview_production_aligned_baseline_p1',
      absolutePath: join(
        repoRoot,
        'docs/planning/preview-baseline/migrations/20260614000000_preview_production_aligned_baseline_p1.sql',
      ),
    };
  }
  const migrationsDir = join(repoRoot, 'supabase/migrations');
  const filename = readdirSync(migrationsDir).find((entry) => entry.startsWith(`${version}_`));
  if (!filename) {
    throw new Error(`MISSING_PAIR_P5_MIGRATION_ARTIFACT:${version}`);
  }
  const migrationName = filename.slice(version.length + 1).replace(/\.sql$/u, '');
  return { version, migrationName, absolutePath: join(migrationsDir, filename) };
}

export function readPairP5MigrationNormalizedStatements(
  repoRoot: string,
  version: string,
): readonly string[] {
  const artifact = resolvePairP5MigrationSqlArtifact(repoRoot, version);
  return splitAndTrim(readFileSync(artifact.absolutePath, 'utf8'));
}

export async function applyPairP5RecordedMigration(
  client: Client,
  repoRoot: string,
  version: string,
): Promise<void> {
  const artifact = resolvePairP5MigrationSqlArtifact(repoRoot, version);
  const statements = readPairP5MigrationNormalizedStatements(repoRoot, version);
  await client.query('BEGIN');
  for (const statement of statements) {
    await client.query(statement);
  }
  await client.query(HISTORY_INSERT_SQL_METADATA, [artifact.version, statements, artifact.migrationName]);
  await client.query('COMMIT');
}

export async function materializePairP5PostIdentityPreviewHistory(
  client: Client,
  repoRoot: string,
): Promise<void> {
  await bootstrapPairP5DisposablePgSupabasePrerequisites(client);
  await client.query(`
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version text NOT NULL PRIMARY KEY,
  statements text[],
  name text
);
`);
  for (const version of PAIR_P5_POST_IDENTITY_HISTORY_VERSIONS) {
    await applyPairP5RecordedMigration(client, repoRoot, version);
  }
}

export const PAIR_P5_POST_IDENTITY_HISTORY_VERSION_COUNT =
  PAIR_P5_POST_IDENTITY_HISTORY_VERSIONS.length;

const PAIR_P5_DISPOSABLE_PG_EXTENSIONS_BOOTSTRAP_SQL = `
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, service_role, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO service_role;
`;

export async function bootstrapPairP5DisposablePgSupabasePrerequisites(client: Client): Promise<void> {
  await client.query(buildRoleBootstrapSql());
  await client.query(PAIR_P5_DISPOSABLE_PG_EXTENSIONS_BOOTSTRAP_SQL);
}
