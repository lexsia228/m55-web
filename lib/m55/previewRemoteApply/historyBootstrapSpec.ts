import { createHash } from 'node:crypto';

import { canonicalSerializePreviewRemoteApply } from './types.ts';

export const M55_PREVIEW_REMOTE_APPLY_HISTORY_BOOTSTRAP_SPEC_V1 =
  'M55_PREVIEW_REMOTE_APPLY_HISTORY_BOOTSTRAP_SPEC_v1' as const;

export const HISTORY_BOOTSTRAP_CANONICAL_SERIALIZATION =
  'm55.canonical_json.sorted_keys_utf8_no_whitespace.v1' as const;

export type HistoryBootstrapDdlStatement = {
  readonly ordinal: number;
  readonly sql: string;
};

export const HISTORY_BOOTSTRAP_DDL_STATEMENTS: readonly HistoryBootstrapDdlStatement[] = [
  {
    ordinal: 1,
    sql: 'CREATE SCHEMA supabase_migrations;',
  },
  {
    ordinal: 2,
    sql: 'ALTER SCHEMA supabase_migrations OWNER TO postgres;',
  },
  {
    ordinal: 3,
    sql:
      'CREATE TABLE supabase_migrations.schema_migrations (' +
      'version text NOT NULL PRIMARY KEY, ' +
      'statements text[], ' +
      'name text' +
      ');',
  },
  {
    ordinal: 4,
    sql: 'ALTER TABLE supabase_migrations.schema_migrations OWNER TO postgres;',
  },
] as const;

export type HistoryBootstrapSpec = {
  readonly identifier: typeof M55_PREVIEW_REMOTE_APPLY_HISTORY_BOOTSTRAP_SPEC_V1;
  readonly schemaName: 'supabase_migrations';
  readonly tableName: 'schema_migrations';
  readonly relation: 'supabase_migrations.schema_migrations';
  readonly strictPrecondition: 'history_schema_and_relation_absent_before_p1';
  readonly owner: 'postgres';
  readonly ifNotExistsForbidden: true;
  readonly separateBootstrapCommitForbidden: true;
  readonly historyOnlyMutationForbidden: true;
  readonly grants: readonly [];
  readonly canonicalSerialization: typeof HISTORY_BOOTSTRAP_CANONICAL_SERIALIZATION;
  readonly ddlStatements: readonly HistoryBootstrapDdlStatement[];
  readonly canonical_payload_sha256: string;
};

function buildCanonicalBootstrapPayload(): Omit<HistoryBootstrapSpec, 'canonical_payload_sha256'> {
  return {
    identifier: M55_PREVIEW_REMOTE_APPLY_HISTORY_BOOTSTRAP_SPEC_V1,
    schemaName: 'supabase_migrations',
    tableName: 'schema_migrations',
    relation: 'supabase_migrations.schema_migrations',
    strictPrecondition: 'history_schema_and_relation_absent_before_p1',
    owner: 'postgres',
    ifNotExistsForbidden: true,
    separateBootstrapCommitForbidden: true,
    historyOnlyMutationForbidden: true,
    grants: [],
    canonicalSerialization: HISTORY_BOOTSTRAP_CANONICAL_SERIALIZATION,
    ddlStatements: HISTORY_BOOTSTRAP_DDL_STATEMENTS,
  };
}

export function computeHistoryBootstrapCanonicalPayloadSha256(): string {
  const payload = buildCanonicalBootstrapPayload();
  return createHash('sha256')
    .update(Buffer.from(canonicalSerializePreviewRemoteApply(payload), 'utf8'))
    .digest('hex');
}

export const HISTORY_BOOTSTRAP_SPEC: HistoryBootstrapSpec = {
  ...buildCanonicalBootstrapPayload(),
  canonical_payload_sha256: computeHistoryBootstrapCanonicalPayloadSha256(),
};
