// @ts-nocheck
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  BASELINE_FILENAME,
  CANONICAL_MIGRATIONS,
  WORKSPACE_DIR_BASENAME,
  HARNESS_REVISION,
  EXECUTE_LOCAL_DISABLED_ERROR,
  FUTURE_EXECUTION_REQUIREMENTS,
  PSQL_EXECUTABLE,
  parseFixtureFlags,
  extractHostFromDatabaseTarget,
  assessRemoteDatabaseTarget,
  buildPsqlSpawnArgs,
  buildFixturePhases,
  buildFixturePlan,
  spawnCommand,
  runDisposableFixtureHarness,
  buildWorkspace,
  EXECUTION_ORACLE_REVISION,
  EXPECTED_BASELINE_ARTIFACT_SHA256,
  EXPECTED_MATRIX_ARTIFACT_SHA256,
  EXPECTED_MANIFEST_ARTIFACT_SHA256,
  FIXTURE_META_SCHEMA,
  FIXTURE_META_RELATION,
  PATHS,
  deriveExecutionOracle,
  buildExecutionOracle,
  verifyExecutionOracle,
  FAILED_FULFILLMENTS_USER_REF_HASH_FORMAT_CHECK_CONSTRAINT_FINGERPRINT,
  FAILED_FULFILLMENTS_USER_REF_HASH_FORMAT_CHECK_CONSTRAINT_FINGERPRINT_STALE_PRETTY_FALSE,
  CLERK_WEBHOOK_EVENTS_P3_CONSTRAINT_FINGERPRINTS,
  CLERK_WEBHOOK_EVENTS_P3_CONSTRAINT_FINGERPRINTS_STALE_PRETTY_FALSE,
  M55_ACCOUNT_DELETION_PROCESS_V1_P4_FUNCTION_CONFIG_FINGERPRINT,
  M55_ACCOUNT_DELETION_PROCESS_V1_P4_FUNCTION_CONFIG_FINGERPRINT_STALE_EMPTY_PROCONFIG,
  M55_ACCOUNT_DELETION_PROCESS_V1_P4_FUNCTION_CONFIG_PROCONFIG,
  sha256File,
  stableStringify,
} from '../../scripts/m55/previewBaselineTool.ts';

const REPO_ROOT = process.cwd();

function makeWorkspace(): string {
  const parent = mkdtempSync(join(tmpdir(), `${WORKSPACE_DIR_BASENAME}-fixture-test-`));
  const root = join(parent, `${WORKSPACE_DIR_BASENAME}-ws`);
  buildWorkspace(REPO_ROOT, root);
  return parent;
}

describe('previewBaselineDisposableFixture — flag parsing', () => {
  it('1. no-argument harness performs side-effect-free dry-run', () => {
    const { exitCode, payload } = runDisposableFixtureHarness(REPO_ROOT, parseFixtureFlags([]));
    assert.equal(exitCode, 0);
    assert.equal(payload.ok, true);
    assert.equal(payload.mode, 'dry-run');
    assert.equal(payload.workspace_materialized, false);
    assert.equal(payload.would_execute_db, false);
    assert.equal(payload.execution_authorized, false);
    assert.deepEqual(payload.spawn_commands, []);
  });

  it('1b. default argv enables dry-run without execute', () => {
    const flags = parseFixtureFlags([]);
    assert.equal(flags.dryRun, true);
    assert.equal(flags.executeLocal, false);
    assert.equal(flags.plan, false);
  });

  it('2. --plan sets plan flag', () => {
    const flags = parseFixtureFlags(['--plan']);
    assert.equal(flags.plan, true);
    assert.equal(flags.executeLocal, false);
  });

  it('3. --execute-local requires explicit flag', () => {
    const flags = parseFixtureFlags(['--execute-local', '--database-url', 'postgresql://localhost/postgres']);
    assert.equal(flags.executeLocal, true);
    assert.equal(flags.dryRun, false);
  });

  it('4. --verify-local-target parses verify mode', () => {
    const flags = parseFixtureFlags(['--verify-local-target', '--database-url', 'postgresql://127.0.0.1/postgres']);
    assert.equal(flags.verifyLocalTarget, true);
    assert.equal(flags.executeLocal, false);
  });

  it('5. --database-url=value form is parsed', () => {
    const flags = parseFixtureFlags(['--database-url=postgresql://localhost/db']);
    assert.equal(flags.databaseUrl, 'postgresql://localhost/db');
  });

  it('6. --repo-root and --workspace-root parse', () => {
    const flags = parseFixtureFlags(['--repo-root', '/tmp/repo', '--workspace-root', '/tmp/ws']);
    assert.equal(flags.repoRoot, '/tmp/repo');
    assert.equal(flags.workspaceRoot, '/tmp/ws');
  });
});

describe('previewBaselineDisposableFixture — remote guard allowlist', () => {
  it('7. localhost target is allowed', () => {
    const verdict = assessRemoteDatabaseTarget('postgresql://localhost:5432/postgres');
    assert.equal(verdict.allowed, true);
    assert.equal(verdict.host, 'localhost');
  });

  it('8. 127.0.0.1 target is allowed', () => {
    const verdict = assessRemoteDatabaseTarget('postgresql://127.0.0.1:5432/postgres');
    assert.equal(verdict.allowed, true);
  });

  it('9. ::1 target is allowed', () => {
    const verdict = assessRemoteDatabaseTarget('postgresql://[::1]:5432/postgres');
    assert.equal(verdict.allowed, true);
    assert.equal(verdict.host, '::1');
  });

  it('10. extractHostFromDatabaseTarget handles postgres URL', () => {
    assert.equal(extractHostFromDatabaseTarget('postgresql://localhost/mydb'), 'localhost');
  });

  it('11. empty target is rejected', () => {
    const verdict = assessRemoteDatabaseTarget('   ');
    assert.equal(verdict.allowed, false);
    assert.equal(verdict.reason, 'empty_database_target');
  });
});

describe('previewBaselineDisposableFixture — remote guard rejections', () => {
  it('12. supabase.co host is rejected', () => {
    const verdict = assessRemoteDatabaseTarget('postgresql://abcdef.supabase.co:5432/postgres');
    assert.equal(verdict.allowed, false);
    assert.match(verdict.reason, /remote_host_pattern/);
  });

  it('13. db.project.supabase.co host is rejected', () => {
    const verdict = assessRemoteDatabaseTarget('postgresql://db.abcdef.supabase.co:5432/postgres');
    assert.equal(verdict.allowed, false);
  });

  it('14. pooler substring is rejected', () => {
    const verdict = assessRemoteDatabaseTarget('postgresql://aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres');
    assert.equal(verdict.allowed, false);
  });

  it('15. credentialed postgres URL is rejected', () => {
    const verdict = assessRemoteDatabaseTarget('postgres://postgres:secret@localhost:5432/postgres');
    assert.equal(verdict.allowed, false);
    assert.equal(verdict.reason, 'credentialed_database_url_forbidden');
  });

  it('16. service_role JWT in target is rejected', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.sig';
    const verdict = assessRemoteDatabaseTarget(`postgresql://localhost/postgres?apikey=${jwt}`);
    assert.equal(verdict.allowed, false);
    assert.equal(verdict.reason, 'service_role_jwt_forbidden');
  });

  it('17. non-local remote host is rejected', () => {
    const verdict = assessRemoteDatabaseTarget('postgresql://example.com:5432/postgres');
    assert.equal(verdict.allowed, false);
    assert.equal(verdict.reason, 'host_not_in_local_allowlist');
  });

  it('18. harness rejects remote target before plan build', () => {
    const result = runDisposableFixtureHarness(REPO_ROOT, {
      dryRun: true,
      plan: false,
      verifyLocalTarget: false,
      executeLocal: false,
      databaseUrl: 'postgresql://db.foo.supabase.co/postgres',
      workspaceRoot: undefined,
      repoRoot: REPO_ROOT,
    });
    assert.equal(result.exitCode, 1);
    assert.equal(result.payload.error, 'remote_database_target_rejected');
  });
});

describe('previewBaselineDisposableFixture — P1-P7 plan / dry-run', () => {
  let parent = '';
  let workspaceRoot = '';

  it('19. buildFixturePhases returns seven phases P1-P7', () => {
    parent = makeWorkspace();
    workspaceRoot = join(parent, `${WORKSPACE_DIR_BASENAME}-ws`);
    const phases = buildFixturePhases(workspaceRoot);
    assert.equal(phases.length, 7);
    assert.deepEqual(
      phases.map((p) => p.phase),
      ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']
    );
  });

  it('20. first phase is baseline P1 migration', () => {
    const phases = buildFixturePhases(workspaceRoot);
    assert.equal(phases[0].migration_filename, BASELINE_FILENAME);
    assert.equal(phases[0].state_from, 'P0');
    assert.equal(phases[0].state_to, 'P1');
  });

  it('21. canonical phases align with CANONICAL_MIGRATIONS', () => {
    const phases = buildFixturePhases(workspaceRoot);
    for (let i = 0; i < CANONICAL_MIGRATIONS.length; i += 1) {
      const phase = phases[i + 1];
      const canonical = CANONICAL_MIGRATIONS[i];
      assert.equal(phase.migration_version, canonical.version);
      assert.equal(phase.state_from, canonical.stateFrom);
      assert.equal(phase.state_to, canonical.stateTo);
    }
  });

  it('22. dry-run plan does not execute DB', () => {
    const plan = buildFixturePlan(REPO_ROOT, {
      mode: 'dry-run',
      workspaceRoot,
      databaseUrl: 'postgresql://localhost/postgres',
    });
    assert.equal(plan.would_execute_db, false);
    assert.deepEqual(plan.spawn_commands, []);
  });

  it('23. plan mode includes assessed local database target', () => {
    const plan = buildFixturePlan(REPO_ROOT, {
      mode: 'plan',
      workspaceRoot,
      databaseUrl: 'postgresql://127.0.0.1/postgres',
    });
    assert.equal(plan.database_target_assessed, true);
    assert.equal(plan.database_target_allowed, true);
  });

  it('24. harness dry-run returns ok payload without DB execution', () => {
    const result = runDisposableFixtureHarness(REPO_ROOT, {
      dryRun: true,
      plan: false,
      verifyLocalTarget: false,
      executeLocal: false,
      databaseUrl: undefined,
      workspaceRoot,
      repoRoot: REPO_ROOT,
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.payload.ok, true);
    assert.equal((result.payload.plan as { would_execute_db: boolean }).would_execute_db, false);
  });

  it('25. harness plan mode returns seven migrations', () => {
    const result = runDisposableFixtureHarness(REPO_ROOT, {
      dryRun: true,
      plan: true,
      verifyLocalTarget: false,
      executeLocal: false,
      databaseUrl: 'postgresql://localhost/postgres',
      workspaceRoot,
      repoRoot: REPO_ROOT,
    });
    assert.equal(result.exitCode, 0);
    const plan = result.payload.plan as { migration_count: number };
    assert.equal(plan.migration_count, 7);
  });

  it('26. harness revision constant is pinned', () => {
    const plan = buildFixturePlan(REPO_ROOT, { mode: 'plan', workspaceRoot });
    assert.equal(plan.harness_revision, HARNESS_REVISION);
  });
});

describe('previewBaselineDisposableFixture — command arrays / spawn safety', () => {
  it('27. buildPsqlSpawnArgs uses psql executable first', () => {
    const args = buildPsqlSpawnArgs('postgresql://localhost/db', '/tmp/m.sql');
    assert.equal(args[0], PSQL_EXECUTABLE);
    assert.equal(args.includes('-f'), true);
    assert.equal(args.at(-1), '/tmp/m.sql');
  });

  it('28. buildPsqlSpawnArgs passes database URL as separate argv element', () => {
    const url = 'postgresql://localhost/db';
    const args = buildPsqlSpawnArgs(url, '/tmp/m.sql');
    assert.ok(args.includes(url));
    assert.equal(args.filter((part) => part === url).length, 1);
  });

  it('29. execute-local plan never authorizes DB execution in Revision-2', () => {
    const parent = makeWorkspace();
    const workspaceRoot = join(parent, `${WORKSPACE_DIR_BASENAME}-ws`);
    const plan = buildFixturePlan(REPO_ROOT, {
      mode: 'execute-local',
      workspaceRoot,
      databaseUrl: 'postgresql://localhost/postgres',
    });
    assert.equal(plan.execution_authorized, false);
    assert.equal(plan.would_execute_db, false);
    assert.deepEqual(plan.spawn_commands, []);
    assert.equal(plan.target_assessment_allowed, true);
    rmSync(parent, { recursive: true, force: true });
  });

  it('30. spawnCommand returns structured outcome without shell', () => {
    const outcome = spawnCommand(['echo', 'fixture-safe']);
    assert.equal(outcome.command[0], 'echo');
    assert.equal(outcome.command[1], 'fixture-safe');
    assert.equal(outcome.status, 0);
    assert.match(outcome.stdout.trim(), /fixture-safe/);
  });

  it('31. spawnCommand propagates non-zero status', () => {
    const outcome = spawnCommand(['sh', '-c', 'exit 3']);
    assert.notEqual(outcome.status, 0);
  });
});

describe('previewBaselineDisposableFixture — execute flag guards', () => {
  it('32. execute-local is fail-closed with exact Revision-2 error', () => {
    const result = runDisposableFixtureHarness(REPO_ROOT, {
      dryRun: false,
      plan: false,
      verifyLocalTarget: false,
      executeLocal: true,
      databaseUrl: 'postgresql://localhost/postgres',
      workspaceRoot: undefined,
      repoRoot: REPO_ROOT,
    });
    assert.equal(result.exitCode, 1);
    assert.equal(result.payload.error, EXECUTE_LOCAL_DISABLED_ERROR);
  });

  it('33. verify-local-target without database URL fails closed', () => {
    const result = runDisposableFixtureHarness(REPO_ROOT, {
      dryRun: true,
      plan: false,
      verifyLocalTarget: true,
      executeLocal: false,
      databaseUrl: undefined,
      workspaceRoot: undefined,
      repoRoot: REPO_ROOT,
    });
    assert.equal(result.exitCode, 1);
    assert.equal(result.payload.error, 'verify-local-target_requires_database_url');
  });

  it('34. verify-local-target accepts local URL without DB calls', () => {
    const parent = makeWorkspace();
    const workspaceRoot = join(parent, `${WORKSPACE_DIR_BASENAME}-ws`);
    const result = runDisposableFixtureHarness(REPO_ROOT, {
      dryRun: true,
      plan: false,
      verifyLocalTarget: true,
      executeLocal: false,
      databaseUrl: 'postgresql://localhost/postgres',
      workspaceRoot,
      repoRoot: REPO_ROOT,
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.payload.database_target_verified, true);
    rmSync(parent, { recursive: true, force: true });
  });

  it('35. execute-local rejects before remote guard when disabled', () => {
    const result = runDisposableFixtureHarness(REPO_ROOT, {
      dryRun: false,
      plan: false,
      verifyLocalTarget: false,
      executeLocal: true,
      databaseUrl: 'postgres://user:pass@127.0.0.1/postgres',
      workspaceRoot: undefined,
      repoRoot: REPO_ROOT,
    });
    assert.equal(result.exitCode, 1);
    assert.equal(result.payload.error, EXECUTE_LOCAL_DISABLED_ERROR);
  });
});

describe('previewBaselineDisposableFixture — no DB in non-execute modes', () => {
  it('36. dry-run payload never sets executed_migrations', () => {
    const parent = makeWorkspace();
    const workspaceRoot = join(parent, `${WORKSPACE_DIR_BASENAME}-ws`);
    const result = runDisposableFixtureHarness(REPO_ROOT, {
      dryRun: true,
      plan: true,
      verifyLocalTarget: false,
      executeLocal: false,
      databaseUrl: 'postgresql://localhost/postgres',
      workspaceRoot,
      repoRoot: REPO_ROOT,
    });
    assert.equal('executed_migrations' in result.payload, false);
    rmSync(parent, { recursive: true, force: true });
  });

  it('37. plan migration paths exist on disk', () => {
    const parent = makeWorkspace();
    const workspaceRoot = join(parent, `${WORKSPACE_DIR_BASENAME}-ws`);
    const plan = buildFixturePlan(REPO_ROOT, { mode: 'plan', workspaceRoot });
    for (const phase of plan.phases) {
      assert.ok(existsSync(phase.migration_absolute_path), phase.phase);
    }
    rmSync(parent, { recursive: true, force: true });
  });

  it('38. phase sequence numbers are monotonic', () => {
    const parent = makeWorkspace();
    const workspaceRoot = join(parent, `${WORKSPACE_DIR_BASENAME}-ws`);
    const plan = buildFixturePlan(REPO_ROOT, { mode: 'plan', workspaceRoot });
    for (let i = 0; i < plan.phases.length; i += 1) {
      assert.equal(plan.phases[i].sequence, i + 1);
    }
    rmSync(parent, { recursive: true, force: true });
  });

  it('39. last phase ends at P7', () => {
    const parent = makeWorkspace();
    const workspaceRoot = join(parent, `${WORKSPACE_DIR_BASENAME}-ws`);
    const plan = buildFixturePlan(REPO_ROOT, { mode: 'plan', workspaceRoot });
    assert.equal(plan.phases[6].phase, 'P7');
    assert.equal(plan.phases[6].state_to, 'P7');
    rmSync(parent, { recursive: true, force: true });
  });

  it('40. harness strategy matches preview baseline chain', () => {
    const parent = makeWorkspace();
    const workspaceRoot = join(parent, `${WORKSPACE_DIR_BASENAME}-ws`);
    const plan = buildFixturePlan(REPO_ROOT, { mode: 'dry-run', workspaceRoot });
    assert.equal(plan.strategy, 'PREVIEW_ONLY_BASELINE_PLUS_ORIGINAL_CANONICAL_CHAIN');
    rmSync(parent, { recursive: true, force: true });
  });
});

describe('previewBaselineDisposableFixture — Revision-6 execution gate', () => {
  it('41. harness revision constant is Revision-6', () => {
    assert.equal(HARNESS_REVISION, 'PREVIEW-BASELINE-DISPOSABLE-FIXTURE-v1-REVISION-7');
    assert.equal(EXECUTE_LOCAL_DISABLED_ERROR, 'local_execution_not_authorized_in_revision_7');
  });

  it('41b. legacy harness revision constant remains Revision-7', () => {
    assert.equal(HARNESS_REVISION, 'PREVIEW-BASELINE-DISPOSABLE-FIXTURE-v1-REVISION-7');
    assert.equal(EXECUTE_LOCAL_DISABLED_ERROR, 'local_execution_not_authorized_in_revision_7');
  });

  it('42. successful plan always sets execution_authorized false', () => {
    const parent = makeWorkspace();
    const workspaceRoot = join(parent, `${WORKSPACE_DIR_BASENAME}-ws`);
    const plan = buildFixturePlan(REPO_ROOT, {
      mode: 'plan',
      workspaceRoot,
      databaseUrl: 'postgresql://localhost/postgres',
    });
    assert.equal(plan.execution_authorized, false);
    assert.equal(plan.would_execute_db, false);
    assert.deepEqual(plan.spawn_commands, []);
    rmSync(parent, { recursive: true, force: true });
  });

  it('43. target assessment allowed does not imply execution authorization', () => {
    const parent = makeWorkspace();
    const workspaceRoot = join(parent, `${WORKSPACE_DIR_BASENAME}-ws`);
    const plan = buildFixturePlan(REPO_ROOT, {
      mode: 'plan',
      workspaceRoot,
      databaseUrl: 'postgresql://127.0.0.1/postgres',
    });
    assert.equal(plan.target_assessment_allowed, true);
    assert.equal(plan.execution_authorized, false);
    rmSync(parent, { recursive: true, force: true });
  });

  it('44. default plan does not materialize workspace', () => {
    const plan = buildFixturePlan(REPO_ROOT, {
      mode: 'plan',
      databaseUrl: 'postgresql://localhost/postgres',
    });
    assert.equal(plan.workspace_materialized, false);
    assert.equal(existsSync(join(plan.workspace_root, '.m55-preview-baseline-workspace.json')), false);
  });

  it('45. repeated dry-run harness creates no workspace directory', () => {
    const plan1 = buildFixturePlan(REPO_ROOT, { mode: 'dry-run' });
    const plan2 = buildFixturePlan(REPO_ROOT, { mode: 'dry-run' });
    assert.equal(plan1.workspace_materialized, false);
    assert.equal(plan2.workspace_materialized, false);
    assert.equal(existsSync(plan1.workspace_root), false);
  });

  it('46. future execution requirements registry is complete', () => {
    const parent = makeWorkspace();
    const workspaceRoot = join(parent, `${WORKSPACE_DIR_BASENAME}-ws`);
    const plan = buildFixturePlan(REPO_ROOT, { mode: 'plan', workspaceRoot });
    assert.equal(plan.future_execution_requirements.length, FUTURE_EXECUTION_REQUIREMENTS.length);
    assert.deepEqual(plan.future_execution_requirements, FUTURE_EXECUTION_REQUIREMENTS);
    assert.ok(plan.future_execution_requirements.includes('gen_random_uuid_callable'));
    assert.ok(plan.future_execution_requirements.includes('dedicated_disposable_database_identity'));
    rmSync(parent, { recursive: true, force: true });
  });
});

describe('previewBaselineDisposableFixture — execution oracle Revision-1', () => {
  function loadOracle() {
    return deriveExecutionOracle(REPO_ROOT).oracleObject;
  }

  it('47. derive verifies Revision-7 source artifact SHAs', () => {
    const oracle = loadOracle();
    assert.equal(oracle.source_matrix_sha256, EXPECTED_MATRIX_ARTIFACT_SHA256);
    assert.equal(oracle.source_manifest_sha256, EXPECTED_MANIFEST_ARTIFACT_SHA256);
    assert.equal(oracle.source_baseline_sha256, EXPECTED_BASELINE_ARTIFACT_SHA256);
    assert.equal(Object.keys(oracle.canonical_migration_shas as object).length, 6);
  });

  it('48. oracle has exact P0-P7 phases with ordered history prefixes', () => {
    const phases = loadOracle().phases as { phase: string; history_prefix: string[] }[];
    assert.equal(phases.length, 8);
    assert.deepEqual(
      phases.map((p) => p.phase),
      ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']
    );
    assert.deepEqual(phases[0].history_prefix, []);
    assert.deepEqual(phases[1].history_prefix, ['20260614000000']);
    assert.deepEqual(phases[7].history_prefix, [
      '20260614000000',
      '20260615000001',
      '20260615000002',
      '20260615000003',
      '20260615000004',
      '20260615000005',
      '20260615000006',
    ]);
  });

  it('49. oracle generation is deterministic', () => {
    const a = deriveExecutionOracle(REPO_ROOT);
    const b = deriveExecutionOracle(REPO_ROOT);
    assert.equal(a.oracleJson, b.oracleJson);
    assert.equal(a.oracleSha256, b.oracleSha256);
  });

  it('50. verifyExecutionOracle is non-mutating', () => {
    buildExecutionOracle(REPO_ROOT);
    const path = join(REPO_ROOT, PATHS.executionOracle);
    const before = readFileSync(path, 'utf8');
    verifyExecutionOracle(REPO_ROOT);
    const after = readFileSync(path, 'utf8');
    assert.equal(before, after);
  });

  it('51. P2 delta includes failed_fulfillments.user_ref_hash semantics', () => {
    const p2 = (loadOracle().phases as Record<string, unknown>[])[2];
    assert.ok(
      (p2.columns_present as string[]).includes(
        'public|failed_fulfillments|user_ref_hash|7|text|Y|D0|'
      )
    );
    assert.ok(
      (p2.constraints_present as string[]).some((item) =>
        item.includes('failed_fulfillments_user_ref_hash_format_check')
      )
    );
    assert.ok(
      (p2.indexes_present as string[]).some((item) =>
        item.includes('idx_failed_fulfillments_user_ref_hash')
      )
    );
  });

  it('52. P3 delta includes clerk_webhook_events ledger contract', () => {
    const p3 = (loadOracle().phases as Record<string, unknown>[])[3];
    assert.ok((p3.relations_present as string[]).includes('clerk_webhook_events'));
    assert.ok(
      (p3.relation_security as string[]).some((item) => item.includes('clerk_webhook_events|rls|true'))
    );
    assert.ok(
      (p3.indexes_present as string[]).includes(
        'public|clerk_webhook_events|clerk_webhook_events_pkey|CREATE UNIQUE INDEX clerk_webhook_events_pkey ON public.clerk_webhook_events USING btree (svix_id)|true'
      )
    );
    const clerkColumns = (p3.columns_present as string[]).filter((item) =>
      item.startsWith('public|clerk_webhook_events|')
    );
    assert.equal(clerkColumns.length, 9);
    assert.ok(clerkColumns.every((item) => item.split('|').length === 8));
  });

  it('53. P4 delta includes m55_account_deletion_process_v1 without runtime parity claim', () => {
    const p4 = (loadOracle().phases as Record<string, unknown>[])[4];
    assert.ok((p4.functions_present as string[]).includes('public.m55_account_deletion_process_v1'));
    assert.ok(
      (p4.runtime_required_assertions as string[]).includes(
        'm55_account_deletion_process_v1_pg_get_functiondef_not_compared'
      )
    );
  });

  it('54. P5 removes entitlements legacy policy and tightens privileges', () => {
    const phases = loadOracle().phases as Record<string, unknown>[];
    assert.equal((phases[1].policies as string[]).length, 1);
    const p5 = phases[5];
    assert.equal((p5.policies as string[]).length, 0);
    const p5Priv = p5.privileges as string[];
    assert.ok(
      p5Priv.some(
        (item) =>
          item.startsWith('priv.entitlements.anon.') && item.endsWith('|0')
      )
    );
    assert.ok(p5Priv.some((item) => item === 'priv.entitlements.service_role.SELECT|1'));
  });

  it('55. P6 enforces dtr partial unique and global unique absence', () => {
    const p6 = (loadOracle().phases as Record<string, unknown>[])[6];
    const delta = p6.expected_delta_from_previous as Record<string, string>;
    assert.equal(delta.global_unique_absent, 'dtr_report_snapshots_user_product_key');
    assert.equal(delta.partial_unique_present, 'dtr_report_snapshots_one_visible_per_user_product_uq');
  });

  it('56. P7 removes duplicate entitlements unique indexes', () => {
    const p7 = (loadOracle().phases as Record<string, unknown>[])[7];
    const delta = p7.expected_delta_from_previous as Record<string, unknown>;
    assert.deepEqual(delta.duplicate_indexes_removed, [
      'entitlements_user_product_uq',
      'uq_entitlements_user_product',
    ]);
  });

  it('57. runtime snapshot hashes are null and status NOT_RUN for all phases', () => {
    for (const phase of loadOracle().phases as Record<string, unknown>[]) {
      assert.equal(phase.runtime_snapshot_hash, null);
      assert.equal(phase.runtime_validation_status, 'NOT_RUN');
      assert.match(String(phase.oracle_contract_hash), /^[a-f0-9]{64}$/);
    }
  });

  it('58. function parity contract uses character length authority', () => {
    const contract = loadOracle().function_parity_contract as {
      length_authority: string;
      functions: { definition_character_length: number; classification: string }[];
    };
    assert.equal(contract.length_authority, 'definition_character_length');
    assert.equal(contract.functions.length, 2);
    assert.ok(contract.functions.every((fn) => fn.classification === 'RUNTIME_REQUIRED'));
  });

  it('59. fixture metadata is outside public schema', () => {
    const meta = loadOracle().fixture_metadata_contract as {
      schema: string;
      relation: string;
      not_in_public_schema: boolean;
    };
    assert.equal(meta.schema, FIXTURE_META_SCHEMA);
    assert.equal(meta.relation, FIXTURE_META_RELATION);
    assert.equal(meta.not_in_public_schema, true);
  });

  it('60. connection contract accepts unix socket and TCP loopback', () => {
    const contract = loadOracle().connection_contract as {
      unix_socket_allowed: boolean;
      tcp_loopback_allowed: boolean;
      server_addr_acceptance: { unix_socket: null; tcp_loopback: string[] };
    };
    assert.equal(contract.unix_socket_allowed, true);
    assert.equal(contract.tcp_loopback_allowed, true);
    assert.equal(contract.server_addr_acceptance.unix_socket, null);
    assert.deepEqual(contract.server_addr_acceptance.tcp_loopback, ['127.0.0.1', '::1']);
    assert.equal(assessRemoteDatabaseTarget('postgresql://localhost/postgres').allowed, true);
    assert.equal(assessRemoteDatabaseTarget('postgresql://127.0.0.1/postgres').allowed, true);
  });

  it('61. credentials are not serialized in oracle JSON', () => {
    const json = deriveExecutionOracle(REPO_ROOT).oracleJson;
    assert.ok(!json.includes('postgres://user:pass@'));
    assert.ok(!/PGPASSWORD\s*=\s*["'][^"']+["']/.test(json));
    assert.ok(!/"password"\s*:\s*"[^"]+"/.test(json));
    const parsed = JSON.parse(json);
    assert.equal(parsed.connection_contract.credentials_in_logged_url_forbidden, true);
    assert.deepEqual(parsed.connection_contract.ephemeral_password_env_allowed, ['PGPASSWORD']);
  });

  it('62. tampered oracle bytes fail verify without self-repair', () => {
    buildExecutionOracle(REPO_ROOT);
    const path = join(REPO_ROOT, PATHS.executionOracle);
    const original = readFileSync(path, 'utf8');
    writeFileSync(path, original.replace('"phase": "P7"', '"phase": "PX"'), 'utf8');
    assert.throws(() => verifyExecutionOracle(REPO_ROOT), /execution_oracle_byte_mismatch/);
    writeFileSync(path, original, 'utf8');
    verifyExecutionOracle(REPO_ROOT);
  });

  it('63. oracle revision constant is pinned', () => {
    assert.equal(loadOracle().oracle_revision, EXECUTION_ORACLE_REVISION);
  });

  it('64. P1 retains STATIC_EXACT and RUNTIME_REQUIRED assertion classes', () => {
    const p1 = (loadOracle().phases as Record<string, unknown>[])[1];
    assert.ok((p1.static_exact_assertions as string[]).includes('relations_count_15'));
    assert.ok((p1.runtime_required_assertions as string[]).includes('pg_get_functiondef_parity_pending'));
  });

  it('65. state contracts are phase-local, unique, and cumulative without future leakage', () => {
    const phases = loadOracle().phases as Record<string, unknown>[];
    const expectedPresenceCounts = [0, 0, 1, 2, 3, 3, 3, 3];
    const expectedAbsenceCounts = [10, 10, 7, 6, 5, 5, 5, 5];
    phases.forEach((phase, index) => {
      const phaseId = String(phase.phase);
      const presence = phase.state_specific_presence as { state: string; object: string }[];
      const absence = phase.state_specific_absence as { state: string; object: string }[];
      assert.equal(presence.length, expectedPresenceCounts[index]);
      assert.equal(absence.length, expectedAbsenceCounts[index]);
      assert.ok(presence.every((item) => item.state === phaseId));
      assert.ok(absence.every((item) => item.state === phaseId));
      assert.equal(new Set(presence.map((item) => item.object)).size, presence.length);
      assert.equal(new Set(absence.map((item) => item.object)).size, absence.length);
    });
  });

  it('66. tracked catalog present/absent arrays are exact complements', () => {
    const phases = loadOracle().phases as Record<string, unknown>[];
    for (const pair of [
      ['relations_present', 'relations_absent'],
      ['columns_present', 'columns_absent'],
      ['constraints_present', 'constraints_absent'],
      ['indexes_present', 'indexes_absent'],
      ['functions_present', 'functions_absent'],
    ] as const) {
      const universe = new Set<string>(
        phases.flatMap((phase) => phase[pair[0]] as string[])
      );
      for (const phase of phases) {
        const present = phase[pair[0]] as string[];
        const absent = phase[pair[1]] as string[];
        assert.equal(new Set(present).size, present.length);
        assert.equal(new Set(absent).size, absent.length);
        assert.equal(present.some((item) => absent.includes(item)), false);
        assert.deepEqual(new Set([...present, ...absent]), universe);
      }
    }
  });

  it('67. every oracle column fingerprint uses the Revision-7 eight-field format', () => {
    for (const phase of loadOracle().phases as Record<string, unknown>[]) {
      for (const item of [
        ...(phase.columns_present as string[]),
        ...(phase.columns_absent as string[]),
      ]) {
        const parts = item.split('|');
        assert.equal(parts.length, 8);
        assert.match(parts[3], /^[1-9][0-9]*$/);
      }
    }
  });

  it('68. P1 and P2 explicitly keep clerk_webhook_events absent until P3', () => {
    const phases = loadOracle().phases as Record<string, unknown>[];
    assert.ok((phases[1].relations_absent as string[]).includes('clerk_webhook_events'));
    assert.ok((phases[2].relations_absent as string[]).includes('clerk_webhook_events'));
    assert.equal((phases[3].relations_absent as string[]).includes('clerk_webhook_events'), false);
  });

  it('69. oracle revision is PATCH-1 after phase-state and fingerprint closure', () => {
    assert.equal(
      loadOracle().oracle_revision,
      'PREVIEW-BASELINE-EXECUTION-ORACLE-v1-PATCH-1'
    );
  });

  const REQUIRED_RUNTIME_CANONICAL =
    FAILED_FULFILLMENTS_USER_REF_HASH_FORMAT_CHECK_CONSTRAINT_FINGERPRINT;

  function p2Phase() {
    return (loadOracle().phases as Record<string, unknown>[]).find((phase) => phase.phase === 'P2');
  }

  function phasesFromP2ThroughP7() {
    return (loadOracle().phases as Record<string, unknown>[]).filter((phase) =>
      ['P2', 'P3', 'P4', 'P5', 'P6', 'P7'].includes(String(phase.phase))
    );
  }

  it('70. P2 expected constraint fingerprint equals runtime canonical form', () => {
    assert.equal(
      FAILED_FULFILLMENTS_USER_REF_HASH_FORMAT_CHECK_CONSTRAINT_FINGERPRINT,
      REQUIRED_RUNTIME_CANONICAL
    );
    const present = p2Phase()?.constraints_present as string[];
    assert.ok(present.includes(REQUIRED_RUNTIME_CANONICAL));
  });

  it('71. source_columns tail is exactly user_ref_hash', () => {
    const parts = REQUIRED_RUNTIME_CANONICAL.split('|');
    assert.equal(parts.at(-2), 'user_ref_hash');
    assert.equal(parts.at(-1), '');
    assert.equal(parts.at(-5), ' ');
    assert.equal(parts.at(-6), ' ');
    assert.equal(parts.at(-7), ' ');
  });

  it('72. stale pretty=false fingerprint absent from P2 constraints_present', () => {
    const present = p2Phase()?.constraints_present as string[];
    assert.equal(
      present.filter((item) => item === FAILED_FULFILLMENTS_USER_REF_HASH_FORMAT_CHECK_CONSTRAINT_FINGERPRINT_STALE_PRETTY_FALSE)
        .length,
      0
    );
  });

  it('73. stale pretty=false fingerprint absent from P2 constraints_absent', () => {
    const absent = p2Phase()?.constraints_absent as string[];
    assert.equal(
      absent.filter((item) => item === FAILED_FULFILLMENTS_USER_REF_HASH_FORMAT_CHECK_CONSTRAINT_FINGERPRINT_STALE_PRETTY_FALSE)
        .length,
      0
    );
  });

  it('74. corrected fingerprint occurs exactly once in P2 through P7', () => {
    for (const phase of phasesFromP2ThroughP7()) {
      const present = phase.constraints_present as string[];
      assert.equal(
        present.filter((item) => item === REQUIRED_RUNTIME_CANONICAL).length,
        1,
        `phase ${String(phase.phase)}`
      );
    }
  });

  it('75. mutation back to pretty=false is not accepted as canonical', () => {
    assert.notEqual(
      FAILED_FULFILLMENTS_USER_REF_HASH_FORMAT_CHECK_CONSTRAINT_FINGERPRINT,
      FAILED_FULFILLMENTS_USER_REF_HASH_FORMAT_CHECK_CONSTRAINT_FINGERPRINT_STALE_PRETTY_FALSE
    );
    for (const phase of phasesFromP2ThroughP7()) {
      const present = phase.constraints_present as string[];
      assert.equal(present.includes(FAILED_FULFILLMENTS_USER_REF_HASH_FORMAT_CHECK_CONSTRAINT_FINGERPRINT_STALE_PRETTY_FALSE), false);
    }
  });

  it('76. mutation removing source_columns fails canonical contract', () => {
    const withoutSourceColumns = REQUIRED_RUNTIME_CANONICAL.replace('|user_ref_hash|', '');
    assert.notEqual(withoutSourceColumns, REQUIRED_RUNTIME_CANONICAL);
    for (const phase of phasesFromP2ThroughP7()) {
      const present = phase.constraints_present as string[];
      assert.equal(present.includes(withoutSourceColumns), false);
    }
  });

  it('77. present/absent complement remains exact for constraints in P2', () => {
    const phase = p2Phase();
    const present = phase?.constraints_present as string[];
    const absent = phase?.constraints_absent as string[];
    const universe = new Set(
      (loadOracle().phases as Record<string, unknown>[]).flatMap(
        (entry) => entry.constraints_present as string[]
      )
    );
    assert.equal(present.some((item) => absent.includes(item)), false);
    assert.deepEqual(new Set([...present, ...absent]), universe);
    assert.equal(present.filter((item) => item === REQUIRED_RUNTIME_CANONICAL).length, 1);
    assert.equal(absent.includes(REQUIRED_RUNTIME_CANONICAL), false);
  });

  function p3Phase() {
    return (loadOracle().phases as Record<string, unknown>[]).find((phase) => phase.phase === 'P3');
  }

  function phasesFromP3ThroughP7() {
    return (loadOracle().phases as Record<string, unknown>[]).filter((phase) =>
      ['P3', 'P4', 'P5', 'P6', 'P7'].includes(String(phase.phase))
    );
  }

  it('78. P3 clerk_webhook_events uses exact five canonical constraint fingerprints', () => {
    const present = p3Phase()?.constraints_present as string[];
    for (const fp of CLERK_WEBHOOK_EVENTS_P3_CONSTRAINT_FINGERPRINTS) {
      assert.ok(present.includes(fp), `missing ${fp.split('|')[2]}`);
    }
  });

  it('79. P3 source_columns tails are exact for all five clerk constraints', () => {
    const expected = {
      clerk_webhook_events_attempt_count_check: 'attempt_count',
      clerk_webhook_events_deletion_subject_id_check: 'deletion_subject_id',
      clerk_webhook_events_error_code_check: 'error_code',
      clerk_webhook_events_pkey: 'svix_id',
      clerk_webhook_events_status_check: 'status',
    };
    for (const fp of CLERK_WEBHOOK_EVENTS_P3_CONSTRAINT_FINGERPRINTS) {
      const name = fp.split('|')[2];
      const parts = fp.split('|');
      assert.equal(parts.at(-2), expected[name]);
      assert.equal(parts.at(-1), '');
    }
  });

  it('80. P3 non-FK metadata placeholders are single space for all five', () => {
    for (const fp of CLERK_WEBHOOK_EVENTS_P3_CONSTRAINT_FINGERPRINTS) {
      const parts = fp.split('|');
      assert.equal(parts.at(-5), ' ');
      assert.equal(parts.at(-6), ' ');
      assert.equal(parts.at(-7), ' ');
    }
  });

  it('81. stale pretty=false clerk fingerprints absent from P3 present and absent', () => {
    const present = p3Phase()?.constraints_present as string[];
    const absent = p3Phase()?.constraints_absent as string[];
    for (const stale of CLERK_WEBHOOK_EVENTS_P3_CONSTRAINT_FINGERPRINTS_STALE_PRETTY_FALSE) {
      assert.equal(present.includes(stale), false);
      assert.equal(absent.includes(stale), false);
    }
  });

  it('82. P3 constraints_absent remains empty', () => {
    assert.deepEqual(p3Phase()?.constraints_absent as string[], []);
  });

  it('83. each canonical clerk fingerprint occurs exactly once in P3 through P7', () => {
    for (const phase of phasesFromP3ThroughP7()) {
      const present = phase.constraints_present as string[];
      for (const fp of CLERK_WEBHOOK_EVENTS_P3_CONSTRAINT_FINGERPRINTS) {
        assert.equal(
          present.filter((item) => item === fp).length,
          1,
          `phase ${String(phase.phase)} ${fp.split('|')[2]}`
        );
      }
    }
  });

  it('84. mutation to pretty=false clerk fingerprints is rejected', () => {
    const present = p3Phase()?.constraints_present as string[];
    for (const stale of CLERK_WEBHOOK_EVENTS_P3_CONSTRAINT_FINGERPRINTS_STALE_PRETTY_FALSE) {
      assert.equal(present.includes(stale), false);
    }
  });

  it('85. mutation removing clerk source_columns tail is rejected', () => {
    const present = p3Phase()?.constraints_present as string[];
    for (const fp of CLERK_WEBHOOK_EVENTS_P3_CONSTRAINT_FINGERPRINTS) {
      const mutated = fp.replace(/\|[^|]+\|$/, '||');
      assert.notEqual(mutated, fp);
      assert.equal(present.includes(mutated), false);
    }
  });

  it('86. mutation using empty metadata placeholders is rejected', () => {
    const present = p3Phase()?.constraints_present as string[];
    for (const fp of CLERK_WEBHOOK_EVENTS_P3_CONSTRAINT_FINGERPRINTS) {
      const mutated = fp.replace('| | | |', '|||||');
      assert.notEqual(mutated, fp);
      assert.equal(present.includes(mutated), false);
    }
  });

  const FROZEN_P0_P3_ORACLE_CONTRACT_HASHES = {
    P0: '85ac8761006ba1f9bf1f1cbfcd7940f81e21fb393eb50d1289ac31fd894f6792',
    P1: '77ba63b64fee47ca9b6deec00bb76f90fe239f6b236994116afdf8be9735fc0c',
    P2: '6bc6fef759709ae8212c47c364fe34b9af6eb4e751633e128d222293e2af44b8',
    P3: 'a37c214b6722e86e0235a37dbef2274edc271e4736f400b1cda512aeda7768b2',
  } as const;

  const FROZEN_P0_P3_FUNCTION_CONFIG = {
    P0: [] as string[],
    P1: [
      'public|m55_consult_reply_commit|true|v|u|[\n  "search_path=public"\n]\n|search_path=public',
      'public|m55_reply_generate_commit|true|v|u|[\n  "search_path=public"\n]\n|search_path=public',
    ],
    P2: [
      'public|m55_consult_reply_commit|true|v|u|[\n  "search_path=public"\n]\n|search_path=public',
      'public|m55_reply_generate_commit|true|v|u|[\n  "search_path=public"\n]\n|search_path=public',
    ],
    P3: [
      'public|m55_consult_reply_commit|true|v|u|[\n  "search_path=public"\n]\n|search_path=public',
      'public|m55_reply_generate_commit|true|v|u|[\n  "search_path=public"\n]\n|search_path=public',
    ],
  } as const;

  function p4Phase() {
    return (loadOracle().phases as Record<string, unknown>[]).find((phase) => phase.phase === 'P4');
  }

  function phasesFromP4ThroughP7() {
    return (loadOracle().phases as Record<string, unknown>[]).filter((phase) =>
      ['P4', 'P5', 'P6', 'P7'].includes(String(phase.phase))
    );
  }

  function otherP4FunctionConfigEntries(phase: Record<string, unknown>) {
    return (phase.function_config as string[]).filter(
      (item) => !item.startsWith('public|m55_account_deletion_process_v1|')
    );
  }

  it('87. P2 present contract and failed_fulfillments fingerprint remain frozen', () => {
    const p2 = p2Phase();
    const present = p2?.constraints_present as string[];
    assert.equal(present.filter((item) => item.includes('clerk_webhook_events')).length, 0);
    assert.equal(
      present.filter((item) => item === FAILED_FULFILLMENTS_USER_REF_HASH_FORMAT_CHECK_CONSTRAINT_FINGERPRINT)
        .length,
      1
    );
    assert.equal(
      present.includes(FAILED_FULFILLMENTS_USER_REF_HASH_FORMAT_CHECK_CONSTRAINT_FINGERPRINT_STALE_PRETTY_FALSE),
      false
    );
    assert.deepEqual(p2?.static_exact_assertions, [
      'failed_fulfillments_user_ref_hash_column',
      'failed_fulfillments_user_ref_hash_format_check',
      'idx_failed_fulfillments_user_ref_hash_partial',
      'failed_fulfillments_anon_authenticated_dml_revoked',
    ]);
  });

  it('88. P4 m55_account_deletion_process_v1 uses exact canonical function_config fingerprint', () => {
    const present = p4Phase()?.function_config as string[];
    assert.ok(present.includes(M55_ACCOUNT_DELETION_PROCESS_V1_P4_FUNCTION_CONFIG_FINGERPRINT));
  });

  it('89. P4 proconfig serialized field uses stableStringify contract', () => {
    const expectedProconfig = stableStringify([...M55_ACCOUNT_DELETION_PROCESS_V1_P4_FUNCTION_CONFIG_PROCONFIG]);
    const parts = M55_ACCOUNT_DELETION_PROCESS_V1_P4_FUNCTION_CONFIG_FINGERPRINT.split('|');
    assert.equal(parts[5], expectedProconfig);
    assert.equal(expectedProconfig, '[\n  "search_path=public, pg_temp"\n]\n');
  });

  it('90. P4 search_path fingerprint field remains search_path=public, pg_temp', () => {
    const parts = M55_ACCOUNT_DELETION_PROCESS_V1_P4_FUNCTION_CONFIG_FINGERPRINT.split('|');
    assert.equal(parts[6], 'search_path=public, pg_temp');
  });

  it('91. stale empty-proconfig fingerprint absent from P4 through P7', () => {
    for (const phase of phasesFromP4ThroughP7()) {
      const present = phase.function_config as string[];
      assert.equal(
        present.includes(M55_ACCOUNT_DELETION_PROCESS_V1_P4_FUNCTION_CONFIG_FINGERPRINT_STALE_EMPTY_PROCONFIG),
        false,
        `phase ${String(phase.phase)}`
      );
    }
  });

  it('92. canonical deletion-process fingerprint occurs exactly once in P4 through P7', () => {
    for (const phase of phasesFromP4ThroughP7()) {
      const present = phase.function_config as string[];
      assert.equal(
        present.filter((item) => item === M55_ACCOUNT_DELETION_PROCESS_V1_P4_FUNCTION_CONFIG_FINGERPRINT).length,
        1,
        `phase ${String(phase.phase)}`
      );
    }
  });

  it('93. other two P4 function_config entries remain byte-identical', () => {
    const expectedOthers = [
      'public|m55_consult_reply_commit|true|v|u|[\n  "search_path=public"\n]\n|search_path=public',
      'public|m55_reply_generate_commit|true|v|u|[\n  "search_path=public"\n]\n|search_path=public',
    ];
    assert.deepEqual(otherP4FunctionConfigEntries(p4Phase()!), expectedOthers);
  });

  it('94. P0 through P3 function_config arrays remain unchanged', () => {
    for (const [phase, expected] of Object.entries(FROZEN_P0_P3_FUNCTION_CONFIG)) {
      const entry = (loadOracle().phases as Record<string, unknown>[]).find((item) => item.phase === phase);
      assert.deepEqual(entry?.function_config, expected, `phase ${phase}`);
    }
  });

  it('95. P0 through P3 oracle contract hashes remain unchanged', () => {
    for (const [phase, expectedHash] of Object.entries(FROZEN_P0_P3_ORACLE_CONTRACT_HASHES)) {
      const entry = (loadOracle().phases as Record<string, unknown>[]).find((item) => item.phase === phase);
      assert.equal(entry?.oracle_contract_hash, expectedHash, `phase ${phase}`);
    }
  });

  it('96. mutation back to empty proconfig fingerprint is rejected', () => {
    const present = p4Phase()?.function_config as string[];
    assert.equal(
      present.includes(M55_ACCOUNT_DELETION_PROCESS_V1_P4_FUNCTION_CONFIG_FINGERPRINT_STALE_EMPTY_PROCONFIG),
      false
    );
  });

  it('97. mutation changing search_path text is rejected', () => {
    const present = p4Phase()?.function_config as string[];
    const mutated = M55_ACCOUNT_DELETION_PROCESS_V1_P4_FUNCTION_CONFIG_FINGERPRINT.replace(
      'search_path=public, pg_temp',
      'search_path=public'
    );
    assert.notEqual(mutated, M55_ACCOUNT_DELETION_PROCESS_V1_P4_FUNCTION_CONFIG_FINGERPRINT);
    assert.equal(present.includes(mutated), false);
  });

  it('98. mutation removing trailing LF from stableStringify output is rejected', () => {
    const present = p4Phase()?.function_config as string[];
    const trimmedProconfig = stableStringify([
      ...M55_ACCOUNT_DELETION_PROCESS_V1_P4_FUNCTION_CONFIG_PROCONFIG,
    ]).replace(/\n$/, '');
    const mutated = [
      'public',
      'm55_account_deletion_process_v1',
      'true',
      'v',
      'u',
      trimmedProconfig,
      'search_path=public, pg_temp',
    ].join('|');
    assert.notEqual(mutated, M55_ACCOUNT_DELETION_PROCESS_V1_P4_FUNCTION_CONFIG_FINGERPRINT);
    assert.equal(present.includes(mutated), false);
  });

  it('99. canonical migration 20260615000003 SHA remains unchanged', () => {
    const migration = CANONICAL_MIGRATIONS.find((item) => item.version === '20260615000003');
    assert.ok(migration);
    assert.equal(
      sha256File(join(REPO_ROOT, migration.sourcePath)),
      '25597665f594dfef6c60fb5af500e70105535c786f85c3c3b4f817c1da82567c'
    );
  });
});

describe('previewBaselineDisposableFixture — P5 privilege expectation semantics', () => {
  function loadOracle() {
    return deriveExecutionOracle(REPO_ROOT).oracleObject;
  }

  const P5_ENTITLEMENT_RELATIONS = ['entitlements', 'entitlement_rights'] as const;
  const P5_API_ROLES = ['PUBLIC', 'anon', 'authenticated'] as const;
  const P5_ALL_PRIVILEGES = [
    'SELECT',
    'INSERT',
    'UPDATE',
    'DELETE',
    'REFERENCES',
    'TRIGGER',
    'TRUNCATE',
  ] as const;
  const P5_SERVICE_ROLE_CORE = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] as const;
  const P5_SERVICE_ROLE_PRESERVED = ['REFERENCES', 'TRIGGER', 'TRUNCATE'] as const;
  const CAPTURED_P5_ACTUAL_PRIVILEGES_PATH =
    '/Users/lexsia/Downloads/M55_P5_PRIVILEGES_DELTA/p5.privileges.actual.txt';

  const phases = () => loadOracle().phases as Record<string, unknown>[];
  const phase = (id: string) => phases().find((item) => item.phase === id);
  const p4Priv = () => phase('P4')!.privileges as string[];
  const p5Priv = () => phase('P5')!.privileges as string[];

  it('100. P5 PUBLIC/anon/authenticated all seven cells are |0 on both relations', () => {
    for (const relation of P5_ENTITLEMENT_RELATIONS) {
      for (const role of P5_API_ROLES) {
        for (const privilege of P5_ALL_PRIVILEGES) {
          assert.equal(
            p5Priv().includes(`priv.${relation}.${role}.${privilege}|0`),
            true,
            `${relation}.${role}.${privilege}`
          );
        }
      }
    }
  });

  it('101. P5 service_role SELECT/INSERT/UPDATE/DELETE are |1', () => {
    for (const relation of P5_ENTITLEMENT_RELATIONS) {
      for (const privilege of P5_SERVICE_ROLE_CORE) {
        assert.equal(
          p5Priv().includes(`priv.${relation}.service_role.${privilege}|1`),
          true,
          `${relation}.service_role.${privilege}`
        );
      }
    }
  });

  it('102. P5 service_role REFERENCES/TRIGGER/TRUNCATE preserve exact P4 values', () => {
    for (const relation of P5_ENTITLEMENT_RELATIONS) {
      for (const privilege of P5_SERVICE_ROLE_PRESERVED) {
        const cell = `priv.${relation}.service_role.${privilege}`;
        const p4Value = p4Priv().find((item) => item.startsWith(`${cell}|`));
        const p5Value = p5Priv().find((item) => item.startsWith(`${cell}|`));
        assert.ok(p4Value, cell);
        assert.equal(p5Value, p4Value, cell);
      }
    }
  });

  it('103. frozen P4 state preserves all six service_role cells at |1', () => {
    for (const relation of P5_ENTITLEMENT_RELATIONS) {
      for (const privilege of P5_SERVICE_ROLE_PRESERVED) {
        assert.equal(
          p5Priv().includes(`priv.${relation}.service_role.${privilege}|1`),
          true,
          `${relation}.service_role.${privilege}`
        );
      }
    }
  });

  it('104. exact P5 privileges multiset equals captured diagnostic actual array', () => {
    const captured = readFileSync(CAPTURED_P5_ACTUAL_PRIVILEGES_PATH, 'utf8')
      .trim()
      .split('\n')
      .sort();
    const expected = [...p5Priv()].sort();
    assert.deepEqual(expected, captured);
  });

  it('105. P5 privilege count remains 448 with no duplicates', () => {
    const present = p5Priv();
    assert.equal(present.length, 448);
    assert.equal(new Set(present).size, 448);
  });

  it('106. P6 and P7 inherit the corrected P5 privilege state', () => {
    const p5 = [...p5Priv()].sort();
    assert.deepEqual([...(phase('P6')!.privileges as string[])].sort(), p5);
    assert.deepEqual([...(phase('P7')!.privileges as string[])].sort(), p5);
  });

  it('107. P0 through P4 privilege arrays remain unchanged', () => {
    const frozen = Object.fromEntries(
      ['P0', 'P1', 'P2', 'P3', 'P4'].map((id) => [id, phase(id)?.privileges])
    );
    buildExecutionOracle(REPO_ROOT);
    const rebuilt = phases();
    for (const id of ['P0', 'P1', 'P2', 'P3', 'P4']) {
      assert.deepEqual(rebuilt.find((item) => item.phase === id)?.privileges, frozen[id], id);
    }
  });

  it('108. P0 through P4 oracle contract hashes remain unchanged', () => {
    for (const [id, expectedHash] of Object.entries({
      P0: '85ac8761006ba1f9bf1f1cbfcd7940f81e21fb393eb50d1289ac31fd894f6792',
      P1: '77ba63b64fee47ca9b6deec00bb76f90fe239f6b236994116afdf8be9735fc0c',
      P2: '6bc6fef759709ae8212c47c364fe34b9af6eb4e751633e128d222293e2af44b8',
      P3: 'a37c214b6722e86e0235a37dbef2274edc271e4736f400b1cda512aeda7768b2',
      P4: 'dd80ce8029453c787ad4d645b5902038cb48b19c775f9ceff0d018fa59cead5b',
    })) {
      assert.equal(phase(id)?.oracle_contract_hash, expectedHash, id);
    }
  });

  it('109. mutation forcing preserved service_role cells to |0 is absent', () => {
    for (const relation of P5_ENTITLEMENT_RELATIONS) {
      for (const privilege of P5_SERVICE_ROLE_PRESERVED) {
        assert.equal(
          p5Priv().includes(`priv.${relation}.service_role.${privilege}|0`),
          false,
          `${relation}.service_role.${privilege}`
        );
      }
    }
  });

  it('110. unrelated relation privileges remain exact P4 values', () => {
    const unrelated = p5Priv().filter(
      (item) =>
        !item.startsWith('priv.entitlements.') && !item.startsWith('priv.entitlement_rights.')
    );
    const p4Unrelated = p4Priv().filter(
      (item) =>
        !item.startsWith('priv.entitlements.') && !item.startsWith('priv.entitlement_rights.')
    );
    assert.deepEqual([...unrelated].sort(), [...p4Unrelated].sort());
  });

  it('111. canonical P5 migration SHA remains unchanged', () => {
    const migration = CANONICAL_MIGRATIONS.find((item) => item.version === '20260615000004');
    assert.ok(migration);
    assert.equal(
      sha256File(join(REPO_ROOT, migration.sourcePath)),
      '40d865c874152c49706ea1fbf2eb9bb873d2d629aa758ff77877dcc25967492d'
    );
  });
});

describe('previewBaselineDisposableFixture — P6 catalog name-array type canonicalization', () => {
  const migrationPath = join(
    REPO_ROOT,
    'supabase/migrations/20260615000005_m55_dtr_visible_report_uniqueness_v1.sql'
  );
  const migration = () => readFileSync(migrationPath, 'utf8');
  const entry = CANONICAL_MIGRATIONS.find((item) => item.version === '20260615000005');

  it('112. P6 canonical migration registry identity is synchronized', () => {
    assert.ok(entry);
    assert.equal(entry.version, '20260615000005');
    assert.equal(
      entry.sourcePath,
      'supabase/migrations/20260615000005_m55_dtr_visible_report_uniqueness_v1.sql'
    );
    assert.equal(sha256File(migrationPath), entry.sha256);
    assert.equal(entry.byteLength, 18265);
  });

  it('113. P6 attname aggregations cast to text exactly seven times', () => {
    const matches = migration().match(/array_agg\(a\.attname::text ORDER BY/g) ?? [];
    assert.equal(matches.length, 7);
  });

  it('114. P6 relname aggregations cast to text exactly four times', () => {
    const matches = migration().match(/array_agg\(ic\.relname::text ORDER BY/g) ?? [];
    assert.equal(matches.length, 4);
  });

  it('115. P6 conname aggregations cast to text exactly two times', () => {
    const matches = migration().match(/array_agg\(con\.conname::text ORDER BY/g) ?? [];
    assert.equal(matches.length, 2);
  });

  it('116. P6 has no uncast attname/relname/conname array aggregations', () => {
    const sql = migration();
    assert.equal(/array_agg\(a\.attname ORDER BY/.test(sql), false);
    assert.equal(/array_agg\(ic\.relname ORDER BY/.test(sql), false);
    assert.equal(/array_agg\(con\.conname ORDER BY/.test(sql), false);
  });

  it('117. P6 has no direct name[] vs text[] comparison path', () => {
    const sql = migration();
    assert.equal(/name\[\]\s*=\s*text\[\]/.test(sql), false);
    assert.equal(/name\[\]\s+IS DISTINCT FROM\s+text\[\]/.test(sql), false);
  });

  it('118. P6 DROP target and mutation semantics remain unchanged', () => {
    const sql = migration();
    assert.match(sql, /DROP CONSTRAINT dtr_report_snapshots_user_product_key;/);
    assert.match(sql, /dtr_report_snapshots_one_visible_per_user_product_uq/);
    assert.equal(/INSERT\s+INTO\s+public\.dtr_report_snapshots\b/i.test(sql), false);
  });

  it('119. P6 migration 000005 SHA remains unchanged', () => {
    const p6 = CANONICAL_MIGRATIONS.find((item) => item.version === '20260615000005');
    assert.ok(p6);
    assert.equal(
      sha256File(join(REPO_ROOT, p6.sourcePath)),
      'b283aa73ea4b004c006229dfc6afec222b44ea71422b34cb7a3fa3f46862d8f6'
    );
  });

  it('120. mutation removing one required attname cast fails cast contract', () => {
    const mutated = migration().replace('array_agg(a.attname::text ORDER BY k.ord)', 'array_agg(a.attname ORDER BY k.ord)', 1);
    assert.notEqual(mutated, migration());
    assert.equal(/array_agg\(a\.attname ORDER BY/.test(mutated), true);
    assert.equal((mutated.match(/array_agg\(a\.attname::text ORDER BY/g) ?? []).length, 6);
  });
});

describe('previewBaselineDisposableFixture — P7 catalog name-array type canonicalization', () => {
  const migrationPath = join(
    REPO_ROOT,
    'supabase/migrations/20260615000006_m55_entitlements_unique_index_cleanup_v1.sql'
  );
  const migration = () => readFileSync(migrationPath, 'utf8');
  const entry = CANONICAL_MIGRATIONS.find((item) => item.version === '20260615000006');

  it('121. P7 canonical migration registry identity is synchronized', () => {
    assert.ok(entry);
    assert.equal(entry.version, '20260615000006');
    assert.equal(
      entry.sourcePath,
      'supabase/migrations/20260615000006_m55_entitlements_unique_index_cleanup_v1.sql'
    );
    assert.equal(sha256File(migrationPath), entry.sha256);
    assert.equal(entry.byteLength, 15577);
  });

  it('122. P7 attname aggregations cast to text exactly eight times', () => {
    assert.equal((migration().match(/array_agg\(a\.attname::text ORDER BY/g) ?? []).length, 8);
  });

  it('123. P7 relname aggregations cast to text exactly four times', () => {
    assert.equal((migration().match(/array_agg\(ic\.relname::text ORDER BY/g) ?? []).length, 4);
  });

  it('124. P7 conname aggregations cast to text exactly two times', () => {
    assert.equal((migration().match(/array_agg\(con\.conname::text ORDER BY/g) ?? []).length, 2);
  });

  it('125. P7 has no uncast attname/relname/conname array aggregations', () => {
    const sql = migration();
    assert.equal(/array_agg\(a\.attname ORDER BY/.test(sql), false);
    assert.equal(/array_agg\(ic\.relname ORDER BY/.test(sql), false);
    assert.equal(/array_agg\(con\.conname ORDER BY/.test(sql), false);
  });

  it('126. P7 has no direct name[] vs text[] comparison path', () => {
    const sql = migration();
    assert.equal(/name\[\]\s*=\s*text\[\]/.test(sql), false);
    assert.equal(/name\[\]\s+IS DISTINCT FROM\s+text\[\]/.test(sql), false);
  });

  it('127. P7 DROP targets and canonical constraint remain unchanged', () => {
    const sql = migration();
    assert.match(sql, /DROP INDEX public\.entitlements_user_product_uq;/);
    assert.match(sql, /DROP INDEX public\.uq_entitlements_user_product;/);
    assert.match(sql, /entitlements_user_id_product_id_key/);
    assert.equal(/INSERT\s+INTO\s+public\.entitlements\b/i.test(sql), false);
  });

  it('128. P6 migration SHA remains unchanged', () => {
    const p6 = CANONICAL_MIGRATIONS.find((item) => item.version === '20260615000005');
    assert.ok(p6);
    assert.equal(
      sha256File(join(REPO_ROOT, p6.sourcePath)),
      'b283aa73ea4b004c006229dfc6afec222b44ea71422b34cb7a3fa3f46862d8f6'
    );
  });

  it('129. mutation removing one required attname cast fails cast contract', () => {
    const mutated = migration().replace('array_agg(a.attname::text ORDER BY k.ord)', 'array_agg(a.attname ORDER BY k.ord)', 1);
    assert.notEqual(mutated, migration());
    assert.equal((mutated.match(/array_agg\(a\.attname::text ORDER BY/g) ?? []).length, 7);
  });

  it('130. mutation altering DROP target fails contract', () => {
    const mutated = migration().replace(
      'DROP INDEX public.uq_entitlements_user_product;',
      'DROP INDEX public.wrong_index;'
    );
    assert.notEqual(mutated, migration());
    assert.doesNotMatch(mutated, /DROP INDEX public\.uq_entitlements_user_product;/);
  });
});
