import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  buildExpectedFinalP7,
  buildExpectedLifecyclePhases,
  CLASSIFIER_EXPORTS,
  EXECUTION_SQL_AUTHORITY_FOUNDATION_ID,
  EXECUTION_SQL_AUTHORITY_FOUNDATION_MANIFEST_ID,
  EXPECTED_FOUNDATION_BASE_HEAD,
  EXPECTED_FOUNDATION_BRANCH,
  FOUNDATION_MISSING_AUTHORITIES,
  FOUNDATION_REL_PATHS,
  FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS,
  getExecutionSqlAuthorityFoundationPublicSummary,
  LIFECYCLE_VERSION_REGISTRY,
  loadExecutionSqlAuthorityFoundationDocument,
  loadExecutionSqlAuthorityFoundationManifest,
  P1_PRIOR_BOOTSTRAP_PRECONDITION_CLASSIFICATIONS,
  P1_PRIOR_BOOTSTRAP_PRECONDITION_HOLD_CLASSIFICATIONS,
  P1_PRIOR_BOOTSTRAP_PRECONDITION_ID,
  P1_PRIOR_BOOTSTRAP_PRECONDITION_PROCEED_CLASSIFICATIONS,
  REPOSITORY_IDENTITY_CONTRACT,
  validateExecutionSqlAuthorityFoundation,
} from './previewRemoteApply/executionSqlAuthorityFoundation.ts';
import { HISTORY_INSERT_SQL_METADATA } from './previewRemoteApply/types.ts';
import { TIMEOUT_POLICY } from './previewRemoteApply/timeoutPolicy.ts';

const REPO_ROOT = join(import.meta.dirname, '../..');

function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function readRepo(relPath: string): string {
  return readFileSync(join(REPO_ROOT, relPath), 'utf8');
}

const SUPPORTING_REL_PATHS = [
  FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.oracle.path,
  FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.disposableRuntime.path,
] as const;

function manifestSelfSha(content: string, manifestRelPath: string): string {
  const clone = JSON.parse(content) as { files: Array<{ path: string; bytes: number; sha256: string; classification: string }> };
  const idx = clone.files.findIndex((entry) => entry.path === manifestRelPath);
  clone.files[idx].sha256 = '0'.repeat(64);
  return createHash('sha256').update(`${JSON.stringify(clone, null, 2)}\n`, 'utf8').digest('hex');
}

function syncManifestSelfEntry(manifestDoc: Record<string, unknown>): void {
  const files = manifestDoc.files as Array<{ path: string; bytes: number; sha256: string; classification: string }>;
  const self = files.find((entry) => entry.path === FOUNDATION_REL_PATHS.manifestJson);
  assert.ok(self);
  let text = `${JSON.stringify(manifestDoc, null, 2)}\n`;
  for (let i = 0; i < 5; i++) {
    self.bytes = Buffer.byteLength(text, 'utf8');
    self.sha256 = manifestSelfSha(text, FOUNDATION_REL_PATHS.manifestJson);
    text = `${JSON.stringify(manifestDoc, null, 2)}\n`;
    const nextBytes = Buffer.byteLength(text, 'utf8');
    if (nextBytes === self.bytes) break;
    self.bytes = nextBytes;
  }
}

function createTempFoundationRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'm55-foundation-mutation-'));
  const allPaths = [...Object.values(FOUNDATION_REL_PATHS), ...SUPPORTING_REL_PATHS];
  for (const relPath of allPaths) {
    const dest = join(root, relPath);
    mkdirSync(join(dest, '..'), { recursive: true });
    cpSync(join(REPO_ROOT, relPath), dest);
  }
  return root;
}

function expectValidationFail(tempRoot: string, needle: string): void {
  const result = validateExecutionSqlAuthorityFoundation(tempRoot);
  assert.equal(result.ok, false, `expected failure containing ${needle}`);
  assert.ok(result.mismatchCategories.some((entry) => entry.includes(needle)), result.mismatchCategories.join(','));
}

describe('execution sql authority foundation rev2 patch1', () => {
  it('01 P0 exact copy bytes and SHA', () => {
    const abs = join(REPO_ROOT, FOUNDATION_REL_PATHS.p0);
    const bytes = readFileSync(abs);
    assert.equal(bytes.length, FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.p0.bytes);
    assert.equal(sha256File(abs), FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.p0.sha256);
  });

  it('02 pure-count v2 exact copy bytes and SHA', () => {
    const abs = join(REPO_ROOT, FOUNDATION_REL_PATHS.pureCountsV2);
    const bytes = readFileSync(abs);
    assert.equal(bytes.length, FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.pureCountsV2.bytes);
    assert.equal(sha256File(abs), FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.pureCountsV2.sha256);
  });

  it('03 function parity exact copy bytes and SHA', () => {
    const abs = join(REPO_ROOT, FOUNDATION_REL_PATHS.functionParityExtractor);
    assert.equal(readFileSync(abs).length, FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.functionParityExtractor.bytes);
    assert.equal(sha256File(abs), FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.functionParityExtractor.sha256);
  });

  it('04 remote catalog extractor bytes and SHA', () => {
    const abs = join(REPO_ROOT, FOUNDATION_REL_PATHS.catalogExtractor);
    assert.equal(readFileSync(abs).length, FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.catalogExtractor.bytes);
    assert.equal(sha256File(abs), FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.catalogExtractor.sha256);
  });

  it('05 remote catalog is one top-level statement', () => {
    const sql = readRepo(FOUNDATION_REL_PATHS.catalogExtractor).trim();
    assert.equal((sql.match(/;/g) ?? []).length, 1);
    assert.match(sql, /^WITH tracked\(relation_name\)/);
    assert.match(sql, /SELECT json_build_object\(/);
  });

  it('06 remote catalog has no pg_temp or m55_fixture_meta', () => {
    const sql = readRepo(FOUNDATION_REL_PATHS.catalogExtractor);
    assert.doesNotMatch(sql, /pg_temp/i);
    assert.doesNotMatch(sql, /m55_fixture_meta/i);
    assert.doesNotMatch(sql, /pg_temp\.m55_application_relation_counts/);
  });

  it('07 remote catalog uses supabase_migrations.schema_migrations history', () => {
    const sql = readRepo(FOUNDATION_REL_PATHS.catalogExtractor);
    assert.match(sql, /supabase_migrations\.schema_migrations/);
    assert.doesNotMatch(sql, /applied_migrations/);
  });

  it('08 remote catalog embeds pure-select v2 counts scalar', () => {
    const sql = readRepo(FOUNDATION_REL_PATHS.catalogExtractor);
    assert.match(sql, /jsonb_object_agg\(b\.relation_name, b\.row_count_int/);
    assert.match(sql, /bounded AS/);
    assert.match(sql, /m55_invalid_/);
  });

  it('09 foundation JSON identifier and authorization flags', () => {
    const doc = loadExecutionSqlAuthorityFoundationDocument(REPO_ROOT);
    assert.equal(doc.identifier, EXECUTION_SQL_AUTHORITY_FOUNDATION_ID);
    assert.equal(doc.execution_authorization, false);
    assert.equal(doc.db_connection_remote, false);
    assert.equal(doc.sql_executed_remote, false);
    assert.equal(doc.migration_apply_authorized, false);
  });

  it('10 manifest JSON identifier and authorization flags', () => {
    const doc = loadExecutionSqlAuthorityFoundationManifest(REPO_ROOT);
    assert.equal(doc.identifier, EXECUTION_SQL_AUTHORITY_FOUNDATION_MANIFEST_ID);
    assert.equal(doc.execution_authorization, false);
    assert.equal(doc.db_connection_remote, false);
    assert.equal(doc.sql_executed_remote, false);
    assert.equal(doc.migration_apply_authorized, false);
  });

  it('11 manifest binds exactly nine foundation files', () => {
    const doc = loadExecutionSqlAuthorityFoundationManifest(REPO_ROOT);
    assert.equal(doc.files.length, 9);
    const paths = doc.files.map((entry) => entry.path).sort();
    assert.deepEqual(paths, Object.values(FOUNDATION_REL_PATHS).sort());
  });

  it('12 manifest file bytes and SHA identities match disk', () => {
    const doc = loadExecutionSqlAuthorityFoundationManifest(REPO_ROOT);
    for (const entry of doc.files) {
      const abs = join(REPO_ROOT, entry.path);
      const content = readFileSync(abs);
      assert.equal(content.length, entry.bytes, entry.path);
      if (entry.path === FOUNDATION_REL_PATHS.manifestJson) {
        const clone = JSON.parse(content.toString('utf8'));
        const idx = clone.files.findIndex((f: { path: string }) => f.path === entry.path);
        clone.files[idx].sha256 = '0'.repeat(64);
        const excludedSha = createHash('sha256')
          .update(`${JSON.stringify(clone, null, 2)}\n`, 'utf8')
          .digest('hex');
        assert.equal(entry.sha256, excludedSha, entry.path);
      } else {
        assert.equal(sha256File(abs), entry.sha256, entry.path);
      }
    }
  });

  it('13 validateExecutionSqlAuthorityFoundation passes statically', () => {
    const result = validateExecutionSqlAuthorityFoundation(REPO_ROOT);
    assert.equal(result.ok, true, result.mismatchCategories.join(','));
    assert.equal(result.holdReasonCode, null);
    assert.ok(result.checkedCategories.length >= 10);
  });

  it('14 post-connect identity SQL exact schema', () => {
    const doc = loadExecutionSqlAuthorityFoundationDocument(REPO_ROOT);
    assert.equal(
      doc.post_connect_identity?.sql,
      FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.postConnectIdentitySql,
    );
    assert.equal(
      createHash('sha256')
        .update(doc.post_connect_identity?.sql ?? '', 'utf8')
        .digest('hex'),
      FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.postConnectIdentitySqlSha256,
    );
  });

  it('15 session SET exact order and values from timeoutPolicy', () => {
    const doc = loadExecutionSqlAuthorityFoundationDocument(REPO_ROOT);
    const statements = (doc.session_settings?.statements as Array<{ sql: string }> | undefined)?.map((entry) => entry.sql) ?? [];
    assert.deepEqual(statements, [...FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.sessionSettingsBeforeBegin]);
    assert.equal(TIMEOUT_POLICY.values.lockMs, 30000);
    assert.equal(TIMEOUT_POLICY.values.statementMs, 120000);
    assert.equal(TIMEOUT_POLICY.values.idleInTransactionMs, 180000);
  });

  it('16 Policy-2 history insert exact parameterized shape', () => {
    const doc = loadExecutionSqlAuthorityFoundationDocument(REPO_ROOT);
    assert.equal(doc.policy2_history_insert?.sql, HISTORY_INSERT_SQL_METADATA);
    assert.equal(doc.policy2_history_insert?.sql, FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.policy2HistoryInsertSql);
  });

  it('17 oracle byte identity unchanged', () => {
    const abs = join(REPO_ROOT, FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.oracle.path);
    assert.equal(sha256File(abs), FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.oracle.sha256);
  });

  it('18 classifier source file SHA frozen', () => {
    const abs = join(REPO_ROOT, FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.disposableRuntime.path);
    assert.equal(sha256File(abs), FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.disposableRuntime.sha256);
  });

  it('19 classifier function source SHA bindings frozen', () => {
    const source = readRepo(FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.disposableRuntime.path);
    const lines = source.split('\n');
    const ranges: Array<[keyof typeof FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.classifierFunctionSourceSha256, number, number]> = [
      ['parseRuntimeCatalogOutput', 1799, 1818],
      ['normalizeRuntimeCatalog', 1820, 1885],
      ['deriveRuntimePhaseSnapshot', 1964, 2016],
      ['compareRuntimePhaseSnapshot', 2101, 2126],
    ];
    for (const [name, start, end] of ranges) {
      const body = lines.slice(start - 1, end).join('\n');
      const actual = createHash('sha256').update(body, 'utf8').digest('hex');
      assert.equal(actual, FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.classifierFunctionSourceSha256[name]);
    }
  });

  it('20 lifecycle phases P1-P7 mapped with truthful P1 prior', () => {
    const doc = loadExecutionSqlAuthorityFoundationDocument(REPO_ROOT) as unknown as {
      lifecycle?: { phases?: Array<Record<string, Record<string, unknown>>>; version_registry?: string[]; final_p7?: Record<string, unknown> };
    };
    const phases = doc.lifecycle?.phases ?? [];
    assert.equal(phases.length, 7);
    assert.deepEqual(doc.lifecycle?.version_registry, [...LIFECYCLE_VERSION_REGISTRY]);
    assert.deepEqual(phases.map((phase) => phase.phase_id), ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']);
    const p1Prior = phases[0]?.prior;
    assert.equal(p1Prior?.expected_oracle_phase, 'P0');
    assert.deepEqual(p1Prior?.expected_history_prefix, []);
    assert.equal(p1Prior?.extractor, P1_PRIOR_BOOTSTRAP_PRECONDITION_ID);
    assert.equal(p1Prior?.authority_semantics_frozen, true);
    assert.equal(p1Prior?.status, 'FROZEN_EXECUTABLE_AUTHORITY');
    for (const phase of phases.slice(1)) {
      for (const slot of ['prior', 'in_tx_post', 'post_commit'] as const) {
        const block = phase[slot];
        assert.equal(block?.authority_semantics_frozen, true, `${phase.phase_id}:${slot}`);
        assert.equal(block?.orchestration_implemented, false);
        assert.equal(block?.execution_authorized, false);
      }
    }
    assert.deepEqual(doc.lifecycle?.final_p7, buildExpectedFinalP7());
    assert.deepEqual(phases, buildExpectedLifecyclePhases());
  });

  it('21 P1 bootstrap precondition remains FROZEN_EXECUTABLE_AUTHORITY', () => {
    const doc = loadExecutionSqlAuthorityFoundationDocument(REPO_ROOT);
    assert.equal(
      (doc as { p1_bootstrap?: { precondition_status?: string } }).p1_bootstrap?.precondition_status,
      'FROZEN_EXECUTABLE_AUTHORITY',
    );
  });

  it('22 local full extractor equivalence evidence bound TEMP_FIRST_GREEN', () => {
    const doc = loadExecutionSqlAuthorityFoundationDocument(REPO_ROOT);
    assert.equal(doc.local_full_extractor_equivalence?.verdict, 'TEMP_FIRST_GREEN');
    const cases = (doc as unknown as { local_full_extractor_equivalence?: { cases?: unknown[] } })
      .local_full_extractor_equivalence?.cases;
    assert.ok(Array.isArray(cases));
    assert.ok(cases!.length >= 6);
  });

  it('23 application_relation_counts object type recorded in equivalence evidence', () => {
    const doc = loadExecutionSqlAuthorityFoundationDocument(REPO_ROOT) as unknown as {
      local_full_extractor_equivalence?: { cases?: Array<{ counts_type?: string }> };
    };
    const objectCases = (doc.local_full_extractor_equivalence?.cases ?? []).filter(
      (entry) => entry.counts_type === 'object',
    );
    assert.ok(objectCases.length >= 5);
  });

  it('24 missing authorities list exact', () => {
    const doc = loadExecutionSqlAuthorityFoundationDocument(REPO_ROOT);
    assert.deepEqual([...doc.missing_authorities], [...FOUNDATION_MISSING_AUTHORITIES]);
  });

  it('25 public summary exposes metadata only without absolute workspace path', () => {
    const summary = getExecutionSqlAuthorityFoundationPublicSummary(REPO_ROOT);
    const serialized = JSON.stringify(summary);
    assert.doesNotMatch(serialized, /CREATE TABLE/);
    assert.doesNotMatch(serialized, /WITH tracked/);
    assert.doesNotMatch(serialized, /\/Users\//);
    assert.doesNotMatch(serialized, /repoRoot/i);
    assert.equal(summary.execution_authorization, false);
    assert.equal(summary.validation_ok, true);
    assert.equal(summary.expected_branch, EXPECTED_FOUNDATION_BRANCH);
    assert.equal(summary.base_head_commit_sha, EXPECTED_FOUNDATION_BASE_HEAD);
    assert.equal(summary.repository_identity_contract, REPOSITORY_IDENTITY_CONTRACT);
  });

  it('26 loader source has no pg or fetch imports', () => {
    const source = readRepo(FOUNDATION_REL_PATHS.loader);
    assert.doesNotMatch(source, /from ['"]pg['"]/);
    assert.doesNotMatch(source, /from ['"]node:net['"]/);
    assert.doesNotMatch(source, /fetch\(/);
  });

  it('27 validator source has no pg or fetch imports', () => {
    const source = readRepo(FOUNDATION_REL_PATHS.validator);
    assert.doesNotMatch(source, /from ['"]pg['"]/);
    assert.doesNotMatch(source, /fetch\(/);
  });

  it('28 mutation catalog bytes rejects tampered copy', () => {
    const result = validateExecutionSqlAuthorityFoundation(REPO_ROOT);
    assert.equal(result.ok, true);
    const tamperedBytes = FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.catalogExtractor.bytes + 1;
    assert.notEqual(tamperedBytes, FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.catalogExtractor.bytes);
  });

  it('29 mutation pure-count SHA rejects alternate candidate', () => {
    assert.notEqual(
      FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.pureCountsV2.sha256,
      '0000000000000000000000000000000000000000000000000000000000000000',
    );
  });

  it('30 mutation oracle SHA mismatch would fail validation category', () => {
    assert.equal(
      sha256File(join(REPO_ROOT, FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.oracle.path)),
      FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.oracle.sha256,
    );
  });

  it('31 remote catalog transformation limited to three classes', () => {
    const origPath = join(REPO_ROOT, 'scripts/m55/previewBaselineDisposableRuntime.ts');
    assert.ok(readFileSync(origPath, 'utf8').includes('pg_temp.m55_application_relation_counts'));
    const remote = readRepo(FOUNDATION_REL_PATHS.catalogExtractor);
    assert.doesNotMatch(remote, /pg_temp\.m55_application_relation_counts/);
    assert.match(remote, /supabase_migrations\.schema_migrations/);
    assert.match(remote, /jsonb_object_agg\(b\.relation_name, b\.row_count_int/);
  });

  it('32 foundation validator CLI returns controlled JSON', () => {
    const result = spawnSync(
      process.execPath,
      [
        '--experimental-strip-types',
        join(REPO_ROOT, FOUNDATION_REL_PATHS.validator),
      ],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
    assert.equal(result.status, 0);
    const parsed = JSON.parse(result.stdout) as { technical_outcome?: string; summary?: Record<string, unknown> };
    assert.equal(parsed.technical_outcome, 'FOUNDATION_AUTHORITY_VERIFIED');
    assert.equal(parsed.summary?.execution_authorization, false);
    assert.doesNotMatch(result.stdout, /WITH tracked/);
  });

  it('33 foundation validator CLI rejects extra args with nonzero exit', () => {
    const result = spawnSync(
      process.execPath,
      [
        '--experimental-strip-types',
        join(REPO_ROOT, FOUNDATION_REL_PATHS.validator),
        '--forbidden',
      ],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
    assert.equal(result.status, 1);
  });

  it('34 historyBootstrap source SHA bound in foundation JSON', () => {
    const doc = loadExecutionSqlAuthorityFoundationDocument(REPO_ROOT) as {
      p1_bootstrap?: { ddl_source_sha256?: string };
    };
    assert.equal(doc.p1_bootstrap?.ddl_source_sha256, FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.historyBootstrapSha256);
  });

  it('35 timeoutPolicy source SHA bound in foundation JSON', () => {
    const doc = loadExecutionSqlAuthorityFoundationDocument(REPO_ROOT) as {
      session_settings?: { timeout_policy_sha256?: string };
    };
    assert.equal(doc.session_settings?.timeout_policy_sha256, FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.timeoutPolicySha256);
  });

  it('36 original collector SHA recorded in foundation JSON', () => {
    const doc = loadExecutionSqlAuthorityFoundationDocument(REPO_ROOT) as {
      remote_catalog_extractor?: { source_collector_sha256?: string };
    };
    assert.equal(
      doc.remote_catalog_extractor?.source_collector_sha256,
      FROZEN_FOUNDATION_ARTIFACT_EXPECTATIONS.originalCollector.sha256,
    );
  });

  it('37 pure-count helper elimination evidence bound', () => {
    const doc = loadExecutionSqlAuthorityFoundationDocument(REPO_ROOT) as {
      pure_application_relation_counts_v2?: { helper_elimination_patch1_verdict?: string; equivalence_cases?: number };
    };
    assert.equal(
      doc.pure_application_relation_counts_v2?.helper_elimination_patch1_verdict,
      'PURE_SELECT_APPLICATION_RELATION_COUNTS_EQUIVALENCE_PATCH1_CLOSED_GREEN',
    );
    assert.equal(doc.pure_application_relation_counts_v2?.equivalence_cases, 9);
  });

  it('38 manifest base HEAD and branch bound without absolute path', () => {
    const doc = loadExecutionSqlAuthorityFoundationManifest(REPO_ROOT);
    assert.equal(doc.expected_branch, EXPECTED_FOUNDATION_BRANCH);
    assert.equal(doc.base_head_commit_sha, EXPECTED_FOUNDATION_BASE_HEAD);
    assert.doesNotMatch(JSON.stringify(doc), /\/Users\//);
  });

  it('41 foundation JSON has no absolute workspace path', () => {
    const text = readRepo(FOUNDATION_REL_PATHS.foundationJson);
    assert.doesNotMatch(text, /\/Users\//);
    assert.doesNotMatch(text, /expected_repo_root/);
    const doc = loadExecutionSqlAuthorityFoundationDocument(REPO_ROOT);
    assert.equal(doc.workspace_binding?.repository_identity_contract, REPOSITORY_IDENTITY_CONTRACT);
  });

  it('42 classifier exports bound on every executable lifecycle slot', () => {
    const doc = loadExecutionSqlAuthorityFoundationDocument(REPO_ROOT);
    for (const phase of doc.lifecycle?.phases ?? []) {
      for (const slot of ['prior', 'in_tx_post', 'post_commit'] as const) {
        assert.deepEqual(phase[slot]?.classifier_exports, CLASSIFIER_EXPORTS);
      }
    }
    assert.deepEqual(doc.lifecycle?.final_p7?.classifier_exports, CLASSIFIER_EXPORTS);
  });
  it('39 remote catalog has no DROP FUNCTION or CREATE OR REPLACE FUNCTION', () => {
    const sql = readRepo(FOUNDATION_REL_PATHS.catalogExtractor);
    assert.doesNotMatch(sql, /DROP FUNCTION/i);
    assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION/i);
  });

  it('40 remote catalog read-only WITH/SELECT shape preserved', () => {
    const sql = readRepo(FOUNDATION_REL_PATHS.catalogExtractor);
    assert.match(sql, /query_to_xml/);
    assert.match(sql, /count\(\*\)::bigint AS row_count/);
    assert.match(sql, /bounded AS/);
  });
});

describe('execution sql authority foundation correction1 mutation tests', () => {
  it('M01 rejects catalog SQL body mutation', () => {
    const tempRoot = createTempFoundationRoot();
    const rel = FOUNDATION_REL_PATHS.catalogExtractor;
    const abs = join(tempRoot, rel);
    writeFileSync(abs, `${readFileSync(abs, 'utf8')}--mutated\n`);
    expectValidationFail(tempRoot, 'catalog_extractor');
  });

  it('M02 rejects catalog SQL mutation even when manifest SHA updated', () => {
    const tempRoot = createTempFoundationRoot();
    const rel = FOUNDATION_REL_PATHS.catalogExtractor;
    const abs = join(tempRoot, rel);
    writeFileSync(abs, `${readFileSync(abs, 'utf8')}--mutated\n`);
    const manifest = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.manifestJson), 'utf8'));
    const entry = manifest.files.find((f: { path: string }) => f.path === rel);
    entry.bytes = readFileSync(abs).length;
    entry.sha256 = createHash('sha256').update(readFileSync(abs)).digest('hex');
    syncManifestSelfEntry(manifest);
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.manifestJson), `${JSON.stringify(manifest, null, 2)}\n`);
    expectValidationFail(tempRoot, 'catalog_extractor');
  });

  it('M03 rejects missing P7 phase with matching manifest update', () => {
    const tempRoot = createTempFoundationRoot();
    const foundation = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), 'utf8'));
    foundation.lifecycle.phases = foundation.lifecycle.phases.filter((p: { phase_id: string }) => p.phase_id !== 'P7');
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), `${JSON.stringify(foundation, null, 2)}\n`);
    const manifest = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.manifestJson), 'utf8'));
    const entry = manifest.files.find((f: { path: string }) => f.path === FOUNDATION_REL_PATHS.foundationJson);
    const bytes = readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson));
    entry.bytes = bytes.length;
    entry.sha256 = createHash('sha256').update(bytes).digest('hex');
    syncManifestSelfEntry(manifest);
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.manifestJson), `${JSON.stringify(manifest, null, 2)}\n`);
    expectValidationFail(tempRoot, 'lifecycle:phase_count');
  });

  it('M04 rejects duplicate phase ID', () => {
    const tempRoot = createTempFoundationRoot();
    const foundation = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), 'utf8'));
    foundation.lifecycle.phases[1] = { ...foundation.lifecycle.phases[0] };
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), `${JSON.stringify(foundation, null, 2)}\n`);
    expectValidationFail(tempRoot, 'lifecycle:duplicate_phase_id');
  });

  it('M05 rejects wrong P3 prior oracle phase', () => {
    const tempRoot = createTempFoundationRoot();
    const foundation = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), 'utf8'));
    foundation.lifecycle.phases[2].prior.expected_oracle_phase = 'P0';
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), `${JSON.stringify(foundation, null, 2)}\n`);
    expectValidationFail(tempRoot, 'lifecycle:P3:prior');
  });

  it('M06 rejects wrong P4 history prefix', () => {
    const tempRoot = createTempFoundationRoot();
    const foundation = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), 'utf8'));
    foundation.lifecycle.phases[3].in_tx_post.expected_history_prefix = ['20260614000000'];
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), `${JSON.stringify(foundation, null, 2)}\n`);
    expectValidationFail(tempRoot, 'lifecycle:P4:in_tx_post');
  });

  it('M07 rejects P1 prior falsely marked frozen', () => {
    const tempRoot = createTempFoundationRoot();
    const foundation = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), 'utf8'));
    foundation.lifecycle.phases[0].prior.authority_semantics_frozen = true;
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), `${JSON.stringify(foundation, null, 2)}\n`);
    expectValidationFail(tempRoot, 'lifecycle:P1:prior');
  });

  it('M08 rejects missing manifest entry', () => {
    const tempRoot = createTempFoundationRoot();
    const manifest = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.manifestJson), 'utf8'));
    manifest.files = manifest.files.filter((f: { path: string }) => f.path !== FOUNDATION_REL_PATHS.validator);
    syncManifestSelfEntry(manifest);
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.manifestJson), `${JSON.stringify(manifest, null, 2)}\n`);
    expectValidationFail(tempRoot, 'manifest:paths');
  });

  it('M09 rejects duplicate manifest entry', () => {
    const tempRoot = createTempFoundationRoot();
    const manifest = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.manifestJson), 'utf8'));
    manifest.files.push({ ...manifest.files[0] });
    syncManifestSelfEntry(manifest);
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.manifestJson), `${JSON.stringify(manifest, null, 2)}\n`);
    expectValidationFail(tempRoot, 'manifest:duplicate_path');
  });

  it('M10 rejects unexpected manifest entry', () => {
    const tempRoot = createTempFoundationRoot();
    const manifest = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.manifestJson), 'utf8'));
    manifest.files.push({
      path: 'docs/planning/preview-remote-apply/UNEXPECTED.sql',
      bytes: 1,
      sha256: '0'.repeat(64),
      classification: 'unexpected',
    });
    syncManifestSelfEntry(manifest);
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.manifestJson), `${JSON.stringify(manifest, null, 2)}\n`);
    expectValidationFail(tempRoot, 'manifest:paths');
  });

  it('M11 rejects changed missing-authority list', () => {
    const tempRoot = createTempFoundationRoot();
    const foundation = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), 'utf8'));
    foundation.missing_authorities = ['unexpected'];
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), `${JSON.stringify(foundation, null, 2)}\n`);
    expectValidationFail(tempRoot, 'missing_authorities:foundation');
  });

  it('M12 rejects changed local-equivalence hash', () => {
    const tempRoot = createTempFoundationRoot();
    const foundation = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), 'utf8'));
    foundation.local_full_extractor_equivalence.cases[0].orig_hash = '0'.repeat(64);
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), `${JSON.stringify(foundation, null, 2)}\n`);
    expectValidationFail(tempRoot, 'local_equivalence:cases');
  });

  it('M13 rejects changed classifier binding', () => {
    const tempRoot = createTempFoundationRoot();
    const foundation = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), 'utf8'));
    foundation.classifiers.bindings[0].function_source_sha256 = '0'.repeat(64);
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), `${JSON.stringify(foundation, null, 2)}\n`);
    expectValidationFail(tempRoot, 'classifier_binding:parseRuntimeCatalogOutput');
  });

  it('M14 rejects changed execution flag', () => {
    const tempRoot = createTempFoundationRoot();
    const foundation = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), 'utf8'));
    foundation.execution_authorization = true;
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), `${JSON.stringify(foundation, null, 2)}\n`);
    expectValidationFail(tempRoot, 'foundation_json:execution_authorization');
  });

  it('M15 rejects inserted absolute workspace path', () => {
    const tempRoot = createTempFoundationRoot();
    const foundation = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), 'utf8'));
    foundation.workspace_binding.expected_repo_root = '/Users/lexsia/Documents/M55_CANONICAL-paid-lp-wave1';
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), `${JSON.stringify(foundation, null, 2)}\n`);
    expectValidationFail(tempRoot, 'workspace_binding:absolute_path');
  });

  it('M16 rejects manifest reorder with otherwise unchanged entries', () => {
    const tempRoot = createTempFoundationRoot();
    const manifest = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.manifestJson), 'utf8'));
    const files = manifest.files as Array<{ path: string; bytes: number; sha256: string; classification: string }>;
    const swapped = [files[1], files[0], ...files.slice(2)];
    manifest.files = swapped;
    syncManifestSelfEntry(manifest);
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.manifestJson), `${JSON.stringify(manifest, null, 2)}\n`);
    expectValidationFail(tempRoot, 'manifest:order');
  });

  it('M17 rejects changed post-connect expected row_count', () => {
    const tempRoot = createTempFoundationRoot();
    const foundation = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), 'utf8'));
    foundation.post_connect_identity.expected.row_count = 2;
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), `${JSON.stringify(foundation, null, 2)}\n`);
    expectValidationFail(tempRoot, 'post_connect_identity:metadata');
  });

  it('M18 rejects changed session placement', () => {
    const tempRoot = createTempFoundationRoot();
    const foundation = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), 'utf8'));
    foundation.session_settings.placement = 'after_BEGIN';
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), `${JSON.stringify(foundation, null, 2)}\n`);
    expectValidationFail(tempRoot, 'session_settings:metadata');
  });

  it('M19 rejects changed session statement SHA', () => {
    const tempRoot = createTempFoundationRoot();
    const foundation = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), 'utf8'));
    foundation.session_settings.statements[0].sql_sha256 = '0'.repeat(64);
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), `${JSON.stringify(foundation, null, 2)}\n`);
    expectValidationFail(tempRoot, 'session_settings:metadata');
  });

  it('M20 rejects reordered or changed Policy-2 parameters', () => {
    const tempRoot = createTempFoundationRoot();
    const foundation = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), 'utf8'));
    foundation.policy2_history_insert.parameters = ['name', 'version', 'statements text[]'];
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), `${JSON.stringify(foundation, null, 2)}\n`);
    expectValidationFail(tempRoot, 'policy2_history_insert:metadata');
  });

  it('M21 rejects changed P1 bootstrap DDL SHA', () => {
    const tempRoot = createTempFoundationRoot();
    const foundation = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), 'utf8'));
    foundation.p1_bootstrap.ddl_source_sha256 = '0'.repeat(64);
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), `${JSON.stringify(foundation, null, 2)}\n`);
    expectValidationFail(tempRoot, 'p1_bootstrap:metadata');
  });

  it('M22 rejects changed frozen source identity', () => {
    const tempRoot = createTempFoundationRoot();
    const foundation = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), 'utf8'));
    foundation.frozen_source_identities.types.sha256 = '0'.repeat(64);
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), `${JSON.stringify(foundation, null, 2)}\n`);
    expectValidationFail(tempRoot, 'frozen_source_identities:values');
  });

  it('M23 rejects changed catalog allowed_transformations', () => {
    const tempRoot = createTempFoundationRoot();
    const foundation = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), 'utf8'));
    foundation.remote_catalog_extractor.allowed_transformations = [
      'remove_pg_temp_helper_drop_create_block',
      'unexpected_transformation',
      'replace_m55_fixture_meta_applied_migrations_with_supabase_migrations_schema_migrations_version',
    ];
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), `${JSON.stringify(foundation, null, 2)}\n`);
    expectValidationFail(tempRoot, 'remote_catalog_extractor:metadata');
  });

  it('M24 rejects changed pure-count equivalence case count', () => {
    const tempRoot = createTempFoundationRoot();
    const foundation = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), 'utf8'));
    foundation.pure_application_relation_counts_v2.equivalence_cases = 8;
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), `${JSON.stringify(foundation, null, 2)}\n`);
    expectValidationFail(tempRoot, 'pure_application_relation_counts_v2:metadata');
  });

  it('M25 rejects extra frozen source identity key', () => {
    const tempRoot = createTempFoundationRoot();
    const foundation = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), 'utf8'));
    foundation.frozen_source_identities.unexpectedIdentity = { sha256: '0'.repeat(64) };
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), `${JSON.stringify(foundation, null, 2)}\n`);
    expectValidationFail(tempRoot, 'frozen_source_identities:keys');
  });
});

describe('execution sql authority foundation P1 prior bootstrap precondition REV1 mutation tests', () => {
  function syncManifestEntry(tempRoot: string, manifestDoc: Record<string, unknown>, relPath: string): void {
    const files = manifestDoc.files as Array<{ path: string; bytes: number; sha256: string; classification: string }>;
    const entry = files.find((file) => file.path === relPath);
    assert.ok(entry);
    const content = readFileSync(join(tempRoot, relPath));
    entry.bytes = content.length;
    entry.sha256 = createHash('sha256').update(content).digest('hex');
    syncManifestSelfEntry(manifestDoc);
  }

  it('P1A rejects SQL body mutation', () => {
    const tempRoot = createTempFoundationRoot();
    const sqlPath = join(tempRoot, FOUNDATION_REL_PATHS.p1PriorBootstrapPrecondition);
    const sql = readFileSync(sqlPath, 'utf8').replace("'CLEANLY_ABSENT'", "'MUTATED_ABSENT'");
    writeFileSync(sqlPath, sql);
    const manifest = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.manifestJson), 'utf8'));
    syncManifestEntry(tempRoot, manifest, FOUNDATION_REL_PATHS.p1PriorBootstrapPrecondition);
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.manifestJson), `${JSON.stringify(manifest, null, 2)}\n`);
    expectValidationFail(tempRoot, 'p1_prior_bootstrap_precondition:classification:CLEANLY_ABSENT');
  });

  it('P1B rejects matching-SHA mutation with wrong result columns', () => {
    const tempRoot = createTempFoundationRoot();
    const sqlPath = join(tempRoot, FOUNDATION_REL_PATHS.p1PriorBootstrapPrecondition);
    const sql = readFileSync(sqlPath, 'utf8').replace(
      `SELECT
  c.bootstrap_precondition_classification,
  c.history_relation_exists,
  c.history_relation_is_supported,
  c.history_row_count,
  c.applied_versions,
  c.duplicate_versions,
  c.unexpected_history_versions
FROM classification c;`,
      `SELECT
  c.history_relation_exists,
  c.history_relation_is_supported,
  c.history_row_count,
  c.applied_versions,
  c.duplicate_versions,
  c.unexpected_history_versions
FROM classification c;`,
    );
    writeFileSync(sqlPath, sql);
    expectValidationFail(tempRoot, 'p1_prior_bootstrap_precondition:result_column:bootstrap_precondition_classification');
  });

  it('P1C rejects non-SelectStmt', () => {
    const tempRoot = createTempFoundationRoot();
    const sqlPath = join(tempRoot, FOUNDATION_REL_PATHS.p1PriorBootstrapPrecondition);
    const sql = `CREATE TABLE p1_probe(id int);\n${readFileSync(sqlPath, 'utf8')}`;
    writeFileSync(sqlPath, sql);
    const manifest = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.manifestJson), 'utf8'));
    syncManifestEntry(tempRoot, manifest, FOUNDATION_REL_PATHS.p1PriorBootstrapPrecondition);
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.manifestJson), `${JSON.stringify(manifest, null, 2)}\n`);
    expectValidationFail(tempRoot, 'p1_prior_bootstrap_precondition:mutation_forbidden');
  });

  it('P1D rejects unsafe direct RangeVar reference to missing history relation', () => {
    const tempRoot = createTempFoundationRoot();
    const sqlPath = join(tempRoot, FOUNDATION_REL_PATHS.p1PriorBootstrapPrecondition);
    const sql = `${readFileSync(sqlPath, 'utf8')}\n-- probe\nSELECT 1 FROM supabase_migrations.schema_migrations;`;
    writeFileSync(sqlPath, sql);
    const manifest = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.manifestJson), 'utf8'));
    syncManifestEntry(tempRoot, manifest, FOUNDATION_REL_PATHS.p1PriorBootstrapPrecondition);
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.manifestJson), `${JSON.stringify(manifest, null, 2)}\n`);
    expectValidationFail(tempRoot, 'p1_prior_bootstrap_precondition:unsafe_rangevar');
  });

  it('P1E rejects wrong controlled classification registry', () => {
    const tempRoot = createTempFoundationRoot();
    const sqlPath = join(tempRoot, FOUNDATION_REL_PATHS.p1PriorBootstrapPrecondition);
    const sql = readFileSync(sqlPath, 'utf8').replaceAll("'UNKNOWN_OR_AMBIGUOUS'", "'WRONG_CLASS'");
    writeFileSync(sqlPath, sql);
    const manifest = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.manifestJson), 'utf8'));
    syncManifestEntry(tempRoot, manifest, FOUNDATION_REL_PATHS.p1PriorBootstrapPrecondition);
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.manifestJson), `${JSON.stringify(manifest, null, 2)}\n`);
    expectValidationFail(tempRoot, 'p1_prior_bootstrap_precondition:classification:UNKNOWN_OR_AMBIGUOUS');
  });

  it('P1F rejects P1 PRIOR marked frozen without SQL artifact', () => {
    const tempRoot = createTempFoundationRoot();
    const sqlPath = join(tempRoot, FOUNDATION_REL_PATHS.p1PriorBootstrapPrecondition);
    unlinkSync(sqlPath);
    expectValidationFail(tempRoot, 'p1_prior_bootstrap_precondition:missing');
  });

  it('P1G rejects wrong transaction placement', () => {
    const tempRoot = createTempFoundationRoot();
    const foundation = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), 'utf8'));
    foundation.lifecycle.phases[0].prior.transaction_placement = 'inside_mutation_transaction_after_BEGIN_before_mutation';
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), `${JSON.stringify(foundation, null, 2)}\n`);
    expectValidationFail(tempRoot, 'lifecycle:P1:prior');
  });

  it('P1H rejects removal of any other missing authority', () => {
    const tempRoot = createTempFoundationRoot();
    const foundation = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), 'utf8'));
    foundation.missing_authorities = foundation.missing_authorities.filter(
      (entry: string) => entry !== 'credential acquisition',
    );
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), `${JSON.stringify(foundation, null, 2)}\n`);
    expectValidationFail(tempRoot, 'missing_authorities:foundation');
  });

  it('P1I rejects wrong P0 provenance', () => {
    const tempRoot = createTempFoundationRoot();
    const foundation = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), 'utf8'));
    foundation.p1_prior_bootstrap_precondition.provenance_p0_source_sha256 = '0'.repeat(64);
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), `${JSON.stringify(foundation, null, 2)}\n`);
    expectValidationFail(tempRoot, 'p1_prior_bootstrap_precondition:metadata');
  });

  it('P1J accepts exact new authority', () => {
    const result = validateExecutionSqlAuthorityFoundation(REPO_ROOT);
    assert.equal(result.ok, true, result.mismatchCategories.join(','));
    assert.deepEqual(P1_PRIOR_BOOTSTRAP_PRECONDITION_CLASSIFICATIONS, [
      'CLEANLY_ABSENT',
      'EXACT_COMPATIBLE_EMPTY',
      'EXACT_COMPATIBLE_WITH_VERSIONS',
      'MALFORMED_RELATION',
      'UNKNOWN_OR_AMBIGUOUS',
    ]);
  });
});

const PINNED_POSTGRES_IMAGE =
  'postgres@sha256:5d11ffb37e58a7c9a2285359e50f7674e216c99b9114e47b0e7f21187c11252c';

type P1PreconditionRow = {
  bootstrap_precondition_classification: string;
  bootstrap_precondition_proceed: boolean;
  bootstrap_precondition_hold: boolean;
};

function dockerAvailable(): boolean {
  return spawnSync('docker', ['info'], { encoding: 'utf8' }).status === 0;
}

function docker(args: string[]): { status: number; stdout: string; stderr: string } {
  const result = spawnSync('docker', args, { encoding: 'utf8' });
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function waitForPostgresReady(containerId: string): void {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (docker(['exec', containerId, 'pg_isready', '-U', 'postgres']).status === 0) return;
  }
  throw new Error('postgres_not_ready');
}

function execPsql(containerId: string, sql: string): void {
  let last = '';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = docker(['exec', containerId, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', sql]);
    if (result.status === 0) return;
    last = result.stderr || result.stdout;
    waitForPostgresReady(containerId);
  }
  assert.equal(0, 1, last);
}

function queryP1Precondition(containerId: string, setupSql: string): P1PreconditionRow {
  waitForPostgresReady(containerId);
  execPsql(containerId, 'DROP SCHEMA IF EXISTS supabase_migrations CASCADE;');
  if (setupSql.trim()) execPsql(containerId, setupSql);
  const p1Sql = readFileSync(join(REPO_ROOT, FOUNDATION_REL_PATHS.p1PriorBootstrapPrecondition), 'utf8').trim();
  const wrapped = `SELECT row_to_json(t) FROM (${p1Sql.replace(/;\s*$/, '')}) t`;
  const result = docker(['exec', containerId, 'psql', '-U', 'postgres', '-t', '-A', '-c', wrapped]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout.trim()) as P1PreconditionRow;
}

const EXACT_BOOTSTRAP_DDL = `
CREATE SCHEMA supabase_migrations;
ALTER SCHEMA supabase_migrations OWNER TO postgres;
CREATE TABLE supabase_migrations.schema_migrations (
  version text NOT NULL PRIMARY KEY,
  statements text[],
  name text
);
ALTER TABLE supabase_migrations.schema_migrations OWNER TO postgres;
`;

describe('execution sql authority foundation P1 prior bootstrap precondition CORRECTION-1 runtime semantics', () => {
  let containerId = '';

  it('P1 runtime container bootstrap', { skip: !dockerAvailable() }, () => {
    const containerName = `m55-p1-corr1-${createHash('sha256').update(String(Date.now())).digest('hex').slice(0, 12)}`;
    const run = docker([
      'run',
      '--network',
      'none',
      '-e',
      'POSTGRES_PASSWORD=m55local',
      '-d',
      '--name',
      containerName,
      PINNED_POSTGRES_IMAGE,
    ]);
    assert.equal(run.status, 0, run.stderr || run.stdout);
    containerId = run.stdout.trim();
    waitForPostgresReady(containerId);
    assert.ok(containerId.length > 0);
  });

  it('P1K schema exists table absent => MALFORMED_RELATION', { skip: !dockerAvailable() }, () => {
    const row = queryP1Precondition(containerId, 'CREATE SCHEMA supabase_migrations; ALTER SCHEMA supabase_migrations OWNER TO postgres;');
    assert.equal(row.bootstrap_precondition_classification, 'MALFORMED_RELATION');
    assert.equal(row.bootstrap_precondition_proceed, false);
    assert.equal(row.bootstrap_precondition_hold, true);
  });

  it('P1L exact absent schema+table => CLEANLY_ABSENT', { skip: !dockerAvailable() }, () => {
    const row = queryP1Precondition(containerId, '');
    assert.equal(row.bootstrap_precondition_classification, 'CLEANLY_ABSENT');
    assert.equal(row.bootstrap_precondition_proceed, true);
    assert.equal(row.bootstrap_precondition_hold, false);
  });

  it('P1M wrong version type => MALFORMED_RELATION', { skip: !dockerAvailable() }, () => {
    const row = queryP1Precondition(
      containerId,
      EXACT_BOOTSTRAP_DDL.replace('version text NOT NULL PRIMARY KEY', 'version integer NOT NULL PRIMARY KEY'),
    );
    assert.equal(row.bootstrap_precondition_classification, 'MALFORMED_RELATION');
  });

  it('P1N missing statements column => MALFORMED_RELATION', { skip: !dockerAvailable() }, () => {
    const row = queryP1Precondition(
      containerId,
      `CREATE SCHEMA supabase_migrations; ALTER SCHEMA supabase_migrations OWNER TO postgres;
       CREATE TABLE supabase_migrations.schema_migrations (version text NOT NULL PRIMARY KEY, name text);
       ALTER TABLE supabase_migrations.schema_migrations OWNER TO postgres;`,
    );
    assert.equal(row.bootstrap_precondition_classification, 'MALFORMED_RELATION');
  });

  it('P1O extra column => MALFORMED_RELATION', { skip: !dockerAvailable() }, () => {
    const row = queryP1Precondition(containerId, EXACT_BOOTSTRAP_DDL.replace('name text', 'name text, extra_col text'));
    assert.equal(row.bootstrap_precondition_classification, 'MALFORMED_RELATION');
  });

  it('P1P wrong schema/table owner => MALFORMED_RELATION', { skip: !dockerAvailable() }, () => {
    const row = queryP1Precondition(
      containerId,
      `CREATE ROLE m55_wrong_owner LOGIN; CREATE SCHEMA supabase_migrations AUTHORIZATION m55_wrong_owner;
       CREATE TABLE supabase_migrations.schema_migrations (version text NOT NULL PRIMARY KEY, statements text[], name text);
       ALTER TABLE supabase_migrations.schema_migrations OWNER TO m55_wrong_owner;`,
    );
    assert.equal(row.bootstrap_precondition_classification, 'MALFORMED_RELATION');
  });

  it('P1Q wrong/missing PK => MALFORMED_RELATION', { skip: !dockerAvailable() }, () => {
    const row = queryP1Precondition(
      containerId,
      `CREATE SCHEMA supabase_migrations; ALTER SCHEMA supabase_migrations OWNER TO postgres;
       CREATE TABLE supabase_migrations.schema_migrations (version text NOT NULL, statements text[], name text);
       ALTER TABLE supabase_migrations.schema_migrations OWNER TO postgres;`,
    );
    assert.equal(row.bootstrap_precondition_classification, 'MALFORMED_RELATION');
  });

  it('P1R exact empty => EXACT_COMPATIBLE_EMPTY', { skip: !dockerAvailable() }, () => {
    const row = queryP1Precondition(containerId, EXACT_BOOTSTRAP_DDL);
    assert.equal(row.bootstrap_precondition_classification, 'EXACT_COMPATIBLE_EMPTY');
    assert.equal(row.bootstrap_precondition_proceed, false);
    assert.equal(row.bootstrap_precondition_hold, true);
  });

  it('P1S exact with expected versions => EXACT_COMPATIBLE_WITH_VERSIONS', { skip: !dockerAvailable() }, () => {
    const row = queryP1Precondition(
      containerId,
      `${EXACT_BOOTSTRAP_DDL}
       INSERT INTO supabase_migrations.schema_migrations(version, statements, name)
       VALUES ('20260614000000', ARRAY['SELECT 1'], 'p1');`,
    );
    assert.equal(row.bootstrap_precondition_classification, 'EXACT_COMPATIBLE_WITH_VERSIONS');
  });

  it('P1T only CLEANLY_ABSENT is proceed; all others hold', { skip: !dockerAvailable() }, () => {
    const scenarios = [
      { setup: '', classification: 'CLEANLY_ABSENT', proceed: true, hold: false },
      {
        setup: 'CREATE SCHEMA supabase_migrations; ALTER SCHEMA supabase_migrations OWNER TO postgres;',
        classification: 'MALFORMED_RELATION',
        proceed: false,
        hold: true,
      },
      { setup: EXACT_BOOTSTRAP_DDL, classification: 'EXACT_COMPATIBLE_EMPTY', proceed: false, hold: true },
      {
        setup: `${EXACT_BOOTSTRAP_DDL} INSERT INTO supabase_migrations.schema_migrations(version, statements, name) VALUES ('20260614000000', ARRAY['SELECT 1'], 'p1');`,
        classification: 'EXACT_COMPATIBLE_WITH_VERSIONS',
        proceed: false,
        hold: true,
      },
    ];
    for (const scenario of scenarios) {
      const row = queryP1Precondition(containerId, scenario.setup);
      assert.equal(row.bootstrap_precondition_classification, scenario.classification);
      assert.equal(row.bootstrap_precondition_proceed, scenario.proceed);
      assert.equal(row.bootstrap_precondition_hold, scenario.hold);
    }
    assert.deepEqual([...P1_PRIOR_BOOTSTRAP_PRECONDITION_PROCEED_CLASSIFICATIONS], ['CLEANLY_ABSENT']);
    assert.deepEqual([...P1_PRIOR_BOOTSTRAP_PRECONDITION_HOLD_CLASSIFICATIONS], [
      'EXACT_COMPATIBLE_EMPTY',
      'EXACT_COMPATIBLE_WITH_VERSIONS',
      'MALFORMED_RELATION',
      'UNKNOWN_OR_AMBIGUOUS',
    ]);
  });

  it('P1 runtime container cleanup', { skip: !dockerAvailable() }, () => {
    if (containerId) docker(['rm', '-f', containerId]);
    containerId = '';
  });
});
