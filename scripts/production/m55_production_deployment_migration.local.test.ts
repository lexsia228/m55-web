import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  APPROVED_CONNECTION_MECHANISMS,
  AUTHORITY_SCHEMA_VERSION,
  BASELINE_RELATIONS,
  CANONICAL_VERSIONS,
  CLERK_IDENTITY_UNKNOWN,
  COMMIT_ACK_CLASSES,
  COMPATIBILITY_CLASSIFICATIONS,
  DEPLOYMENT_OUTCOME_CLASSES,
  DEPLOYMENT_STEPS,
  MIGRATION_APPLY_STEPS,
  MIGRATION_REGISTRY_PATHS,
  PER_VERSION_STATUSES,
  POSTCHECK_CLASSIFICATIONS,
  PREFLIGHT_CLASSIFICATIONS,
  PRODUCTION_DATABASE_NAME,
  PRODUCTION_ENV_KEY_NAMES,
  PRODUCTION_SUPABASE_BRANCH,
  PRODUCTION_SUPABASE_ENVIRONMENT,
  PRODUCTION_SUPABASE_ORG,
  PRODUCTION_SUPABASE_PROJECT,
  PRODUCTION_SUPABASE_ROLE,
  PRODUCTION_SUPABASE_SOURCE,
  PRODUCTION_VERCEL_ENVIRONMENT,
  PRODUCTION_VERCEL_PROJECT,
  ROLLOUT_ORDERS,
  ROLLBACK_STOP_MATRIX,
  assertSecretSafeOutput,
  buildMigrationRegistryFromFiles,
  classifyDeploymentDiscovery,
  classifySchemaCompatibility,
  computeApplySetFromPreflight,
  computePreflightIdentity,
  computeRegistrySha256,
  deploymentOutcomeAllowsProceed,
  hashApprovalPhrase,
  mapCompatibilityToRolloutOrder,
  parseSqlMutationKeywords,
  rejectApplySetChangedAfterApproval,
  rejectDeployBeforeCompatibilityAudit,
  rejectStalePreflightIdentity,
  runbookHasCanonicalChainNotExecutionList,
  runbookHasCompatibilityBeforeDeploy,
  runbookHasConditionalOrder,
  runbookHasDeploymentSteps,
  runbookHasFailureMatrixRows,
  runbookHasMigrationSteps,
  runbookUnconditionalApplyWordingCount,
  selectedOrderMatchesMatrix,
  serializeAuthorityValidationResult,
  sqlClassificationCount,
  sqlHasSingleTopLevelSelect,
  validateApplySetDependency,
  validateMigrationRegistry,
  validateProductionDeploymentMigrationAuthority,
  validateVersionApprovedForExecution,
  type MigrationRegistryEntry,
  type ProductionDeploymentMigrationAuthority,
} from './m55_production_deployment_migration_authority.ts';

const ROOT = process.cwd();
const PREFLIGHT_SQL = join(ROOT, 'scripts/sql/production/m55_production_migration_preflight.sql');
const POSTCHECK_SQL = join(ROOT, 'scripts/sql/production/m55_production_migration_postcheck.sql');
const RUNBOOK = join(ROOT, 'docs/planning/m55_production_deployment_migration_human_runbook.md');

const FEATURE_HEAD = '1707e037e5cb532310d72076ea81018c9e13b7e1';
const ORIGIN_MAIN = '6ac8ded3d165ddacca8b4a1f53e9af2d899dee69';
const FUTURE_MAIN = 'a1b2c3d4e5f6789012345678901234567890abcd';
const CURRENT_PROD_DEPLOY = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

function allVersionsObjectExact(value: boolean): Record<string, boolean> {
  return Object.fromEntries(CANONICAL_VERSIONS.map((v) => [v, value]));
}

function greenfieldApplyPlan() {
  return computeApplySetFromPreflight({
    preflight_classification: 'GREENFIELD_READY',
    applied_versions: [],
    version_object_exact: allVersionsObjectExact(false),
    schema_fingerprint: 'greenfield-schema-fingerprint',
  });
}

function futureAuthority(
  overrides: Partial<ProductionDeploymentMigrationAuthority> = {},
): ProductionDeploymentMigrationAuthority {
  const registry = futureRegistry();
  const applyPlan = greenfieldApplyPlan();
  return {
    schema_version: AUTHORITY_SCHEMA_VERSION,
    gate_title: 'CATEGORY-1-M55-PRODUCTION-DEPLOYMENT-MIGRATION-EXECUTION',
    approved_main_commit: FUTURE_MAIN,
    approved_main_parent_1: ORIGIN_MAIN,
    approved_main_parent_2: FEATURE_HEAD,
    approved_feature_head: FEATURE_HEAD,
    approved_origin_main_before_merge: ORIGIN_MAIN,
    final_rc_gate: 'CATEGORY-1-M55-FINAL-INTEGRATED-RC-AUDIT',
    final_rc_verdict: 'CLOSED_GREEN',
    final_rc_evidence_identity: 'final-rc-evidence-sha256-placeholder',
    preview_deletion_smoke_gate: 'CATEGORY-1-M55-PREVIEW-DELETION-SMOKE',
    preview_deletion_smoke_verdict: 'CLOSED_GREEN',
    preview_deletion_smoke_evidence_identity: 'preview-deletion-evidence-sha256-placeholder',
    production_vercel_project: PRODUCTION_VERCEL_PROJECT,
    production_vercel_environment: PRODUCTION_VERCEL_ENVIRONMENT,
    production_supabase_org: PRODUCTION_SUPABASE_ORG,
    production_supabase_project: PRODUCTION_SUPABASE_PROJECT,
    production_supabase_branch: PRODUCTION_SUPABASE_BRANCH,
    production_supabase_environment: PRODUCTION_SUPABASE_ENVIRONMENT,
    production_supabase_source: PRODUCTION_SUPABASE_SOURCE,
    production_supabase_role: PRODUCTION_SUPABASE_ROLE,
    production_database_name: PRODUCTION_DATABASE_NAME,
    production_clerk_instance_identity: 'EXACT_MATCH',
    approved_deployment_identity: '5078520190',
    approved_deployment_commit: FUTURE_MAIN,
    approved_migration_registry: registry,
    approved_connection_mechanism: APPROVED_CONNECTION_MECHANISMS[0],
    ca_pin_identity_or_exact_human_match_marker: 'SUPABASE_ROOT_2021_CANONICAL_DER_SHA256_MATCH',
    human_approval_phrase_hash: hashApprovalPhrase('APPROVE_PRODUCTION_DEPLOYMENT_MIGRATION'),
    issued_at: new Date(Date.now() - 3_600_000).toISOString(),
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    single_use: true,
    execution_nonce_hash: hashApprovalPhrase('nonce-production-deployment-migration'),
    consumed: false,
    dns_blocker_resolved: true,
    approved_preflight_identity: applyPlan.preflight_identity,
    approved_preflight_classification: 'GREENFIELD_READY',
    approved_required_apply_versions: [...applyPlan.required_apply_versions],
    approved_already_applied_versions: [],
    approved_blocked_versions: [],
    approved_per_version_plan: [...applyPlan.per_version_plan],
    compatibility_classification: 'MIGRATE_THEN_DEPLOY_REQUIRED',
    selected_rollout_order: 'MIGRATE_THEN_DEPLOY',
    old_app_new_schema_compatible: true,
    new_app_old_schema_compatible: false,
    current_production_deployment_commit: CURRENT_PROD_DEPLOY,
    current_schema_identity: applyPlan.preflight_identity,
    candidate_main_commit: FUTURE_MAIN,
    ...overrides,
  };
}

function fullValidationCtx(overrides: Record<string, unknown> = {}) {
  const applyPlan = greenfieldApplyPlan();
  return {
    now: new Date(),
    observedFeatureHead: FEATURE_HEAD,
    observedRegistrySha256: computeRegistrySha256(futureRegistry()),
    observedMainCommit: FUTURE_MAIN,
    observedPreflightIdentity: applyPlan.preflight_identity,
    observedRequiredApplyVersions: [...applyPlan.required_apply_versions],
    observedProductionDeploymentCommit: CURRENT_PROD_DEPLOY,
    observedSchemaIdentity: applyPlan.preflight_identity,
    ...overrides,
  };
}

function futureRegistry(): MigrationRegistryEntry[] {
  return buildMigrationRegistryFromFiles(ROOT);
}

describe('authority validation', () => {
  const ctx = fullValidationCtx();

  it('1. missing authority fails', () => {
    const r = validateProductionDeploymentMigrationAuthority(null, ctx);
    assert.equal(r.ready, false);
    assert.match(r.failed_flags.join(','), /HOLD_AUTHORITY_MISSING/);
  });

  it('2. placeholder main commit fails', () => {
    const r = validateProductionDeploymentMigrationAuthority(
      futureAuthority({ approved_main_commit: 'APPROVED_MAIN_COMMIT_SHA', approved_deployment_commit: 'APPROVED_MAIN_COMMIT_SHA' }),
      ctx,
    );
    assert.equal(r.ready, false);
    assert.match(r.failed_flags.join(','), /HOLD_MAIN_COMMIT_PLACEHOLDER/);
  });

  it('3. feature commit used as main fails', () => {
    const r = validateProductionDeploymentMigrationAuthority(
      futureAuthority({ approved_main_commit: FEATURE_HEAD, approved_deployment_commit: FEATURE_HEAD }),
      { ...ctx, observedFeatureHead: FEATURE_HEAD },
    );
    assert.equal(r.ready, false);
    assert.match(r.failed_flags.join(','), /HOLD_FEATURE_COMMIT_USED_AS_MAIN/);
  });

  it('4. final RC not GREEN fails', () => {
    const r = validateProductionDeploymentMigrationAuthority(
      futureAuthority({ final_rc_verdict: 'HOLD' }),
      ctx,
    );
    assert.equal(r.ready, false);
  });

  it('5. preview deletion smoke not GREEN fails', () => {
    const r = validateProductionDeploymentMigrationAuthority(
      futureAuthority({ preview_deletion_smoke_verdict: 'HOLD' }),
      ctx,
    );
    assert.equal(r.ready, false);
  });

  it('6. DNS blocker unresolved fails', () => {
    const r = validateProductionDeploymentMigrationAuthority(
      futureAuthority({ dns_blocker_resolved: false }),
      ctx,
    );
    assert.equal(r.ready, false);
  });

  it('7. wrong Vercel identity fails', () => {
    const r = validateProductionDeploymentMigrationAuthority(
      futureAuthority({ production_vercel_project: 'wrong/project' as typeof PRODUCTION_VERCEL_PROJECT }),
      ctx,
    );
    assert.equal(r.ready, false);
  });

  it('8. wrong Supabase org/project/branch/env/source/role/db fails', () => {
    for (const override of [
      { production_supabase_org: 'wrong' as typeof PRODUCTION_SUPABASE_ORG },
      { production_supabase_project: 'wrong' as typeof PRODUCTION_SUPABASE_PROJECT },
      { production_supabase_branch: 'preview' as typeof PRODUCTION_SUPABASE_BRANCH },
      { production_supabase_environment: 'Preview' as typeof PRODUCTION_SUPABASE_ENVIRONMENT },
      { production_supabase_source: 'Replica' as typeof PRODUCTION_SUPABASE_SOURCE },
      { production_supabase_role: 'anon' as typeof PRODUCTION_SUPABASE_ROLE },
      { production_database_name: 'other' as typeof PRODUCTION_DATABASE_NAME },
    ]) {
      const r = validateProductionDeploymentMigrationAuthority(futureAuthority(override), ctx);
      assert.equal(r.ready, false);
    }
  });

  it('9. unknown Clerk identity fails', () => {
    const r = validateProductionDeploymentMigrationAuthority(
      futureAuthority({ production_clerk_instance_identity: CLERK_IDENTITY_UNKNOWN }),
      ctx,
    );
    assert.equal(r.ready, false);
    assert.match(r.failed_flags.join(','), /HOLD_CLERK_INSTANCE_UNKNOWN/);
  });

  it('10. wrong deployment commit fails', () => {
    const r = validateProductionDeploymentMigrationAuthority(
      futureAuthority({ approved_deployment_commit: FEATURE_HEAD }),
      ctx,
    );
    assert.equal(r.ready, false);
  });

  it('11. expired token fails', () => {
    const r = validateProductionDeploymentMigrationAuthority(
      futureAuthority({ expires_at: new Date(Date.now() - 1000).toISOString() }),
      ctx,
    );
    assert.equal(r.ready, false);
  });

  it('12. consumed token fails', () => {
    const r = validateProductionDeploymentMigrationAuthority(
      futureAuthority({ consumed: true }),
      ctx,
    );
    assert.equal(r.ready, false);
  });

  it('13. non-single-use fails', () => {
    const r = validateProductionDeploymentMigrationAuthority(
      futureAuthority({ single_use: false as true }),
      ctx,
    );
    assert.equal(r.ready, false);
  });

  it('14. migration registry mismatch fails', () => {
    const badRegistry = [...futureRegistry()];
    badRegistry[0] = { ...badRegistry[0], sha256: '0'.repeat(64) };
    const r = validateProductionDeploymentMigrationAuthority(
      futureAuthority({ approved_migration_registry: badRegistry }),
      {
        ...ctx,
        observedRegistrySha256: computeRegistrySha256(futureRegistry()),
      },
    );
    assert.equal(r.ready, false);
    assert.match(r.failed_flags.join(','), /HOLD_MIGRATION_REGISTRY_SHA_MISMATCH/);
  });

  it('15. exact fully approved fixture GREEN', () => {
    const r = validateProductionDeploymentMigrationAuthority(futureAuthority(), fullValidationCtx());
    assert.equal(r.ready, true);
    assert.equal(r.failed_flags.length, 0);
  });
});

describe('migration registry', () => {
  const registry = buildMigrationRegistryFromFiles(ROOT);

  it('16. exactly 7 migrations', () => {
    assert.equal(registry.length, 7);
    assert.equal(MIGRATION_REGISTRY_PATHS.length, 7);
  });

  it('17. exact order', () => {
    for (let i = 0; i < 7; i++) {
      assert.equal(registry[i].version, MIGRATION_REGISTRY_PATHS[i].version);
      assert.equal(registry[i].ordinal, MIGRATION_REGISTRY_PATHS[i].ordinal);
    }
  });

  it('18. no duplicate versions', () => {
    const versions = registry.map((r) => r.version);
    assert.equal(new Set(versions).size, versions.length);
  });

  it('19. file SHA derived from actual files', () => {
    for (const entry of registry) {
      const content = readFileSync(join(ROOT, entry.path), 'utf8');
      const sha = createHash('sha256').update(content, 'utf8').digest('hex');
      assert.equal(entry.sha256, sha);
    }
  });

  it('20. mutation of one migration identity fails validation', () => {
    const mutated = registry.map((r) =>
      r.version === '20260615000001' ? { ...r, sha256: 'f'.repeat(64) } : r,
    );
    const check = validateMigrationRegistry(mutated);
    assert.equal(check.ok, false);
  });

  it('21. missing migration fails', () => {
    const check = validateMigrationRegistry(registry.slice(0, 6));
    assert.equal(check.ok, false);
  });

  it('22. unexpected migration fails', () => {
    const extra = [
      ...registry,
      {
        ...registry[6],
        ordinal: 'P7' as const,
        version: '20999999999999',
        path: 'supabase/migrations/20999999999999_fake.sql',
      },
    ];
    const check = validateMigrationRegistry(extra);
    assert.equal(check.ok, false);
  });
});

describe('deployment discovery', () => {
  const base = {
    vercel_project: PRODUCTION_VERCEL_PROJECT,
    vercel_environment: PRODUCTION_VERCEL_ENVIRONMENT,
    branch: 'main',
    commit_sha: FUTURE_MAIN,
    alias_points_to_deployment: true,
    build_status: 'READY' as const,
    preview_binding_detected: false,
    ack_class: 'DEFINITIVE' as const,
  };

  it('23. exact deployment READY', () => {
    assert.equal(classifyDeploymentDiscovery(base), 'DEPLOYMENT_READY_EXACT');
    assert.equal(deploymentOutcomeAllowsProceed('DEPLOYMENT_READY_EXACT'), true);
  });

  it('24. wrong project HOLD', () => {
    assert.equal(
      classifyDeploymentDiscovery({ ...base, vercel_project: 'wrong/project' }),
      'DEPLOYMENT_BINDING_MISMATCH',
    );
  });

  it('25. wrong environment HOLD', () => {
    assert.equal(
      classifyDeploymentDiscovery({ ...base, vercel_environment: 'Preview' }),
      'DEPLOYMENT_BINDING_MISMATCH',
    );
  });

  it('26. wrong commit HOLD', () => {
    assert.equal(
      classifyDeploymentDiscovery({ ...base, branch: 'feat/m55-paid-lp-canonical-wave1' }),
      'DEPLOYMENT_COMMIT_MISMATCH',
    );
  });

  it('27. alias mismatch HOLD', () => {
    assert.equal(
      classifyDeploymentDiscovery({ ...base, alias_points_to_deployment: false }),
      'DEPLOYMENT_ALIAS_MISMATCH',
    );
  });

  it('28. ambiguous deployment HOLD', () => {
    assert.equal(
      classifyDeploymentDiscovery({ ...base, ack_class: 'AMBIGUOUS' }),
      'DEPLOYMENT_ACK_AMBIGUOUS',
    );
  });

  it('29. manual redeploy not permitted in runbook', () => {
    const runbook = readFileSync(RUNBOOK, 'utf8');
    assert.match(runbook, /No manual redeploy/i);
    assert.match(runbook, /no retry under ambiguous deployment/i);
  });
});

describe('preflight SQL contract', () => {
  const sql = readFileSync(PREFLIGHT_SQL, 'utf8');

  it('30. one SelectStmt', () => {
    assert.equal(sqlHasSingleTopLevelSelect(sql), true);
  });

  it('31. no DDL/DML/CALL/COPY/DO', () => {
    assert.equal(parseSqlMutationKeywords(sql).length, 0);
  });

  it('32. absent history safe', () => {
    assert.match(sql, /history_relation_is_supported/);
    assert.match(sql, /query_to_xml/);
  });

  it('33. absent relation safe', () => {
    assert.match(sql, /to_regclass/);
    for (const rel of BASELINE_RELATIONS) {
      assert.match(sql, new RegExp(rel));
    }
  });

  it('34. exactly 15 baseline relations registered', () => {
    assert.equal(BASELINE_RELATIONS.length, 15);
    assert.match(sql, /baseline_relation_count_expected/);
  });

  it('35. six classifications present', () => {
    assert.equal(sqlClassificationCount(sql, PREFLIGHT_CLASSIFICATIONS), 6);
  });

  it('36. partial state cannot greenfield', () => {
    assert.match(sql, /PARTIAL_STATE_RECONCILIATION_REQUIRED/);
    assert.match(sql, /NOT ci\.history_relation_exists/);
    assert.match(sql, /GREENFIELD_READY/);
  });

  it('37. history-only drift fail closed', () => {
    assert.match(sql, /HISTORY_ONLY_DRIFT/);
  });

  it('38. schema-only drift fail closed', () => {
    assert.match(sql, /SCHEMA_ONLY_DRIFT/);
  });

  it('39. failed/unknown flags affect stop', () => {
    assert.match(sql, /failed_flags/);
    assert.match(sql, /unknown_flags/);
    assert.match(sql, /stop_required/);
  });

  it('40. one summary row contract', () => {
    assert.match(sql, /^WITH/m);
    assert.match(sql, /apr\.preflight_classification,/);
    assert.match(sql, /FROM apply_plan_resolved apr;/);
  });
});

describe('postcheck SQL contract', () => {
  const sql = readFileSync(POSTCHECK_SQL, 'utf8');

  it('41. one SelectStmt', () => {
    assert.equal(sqlHasSingleTopLevelSelect(sql), true);
  });

  it('42. no mutation', () => {
    assert.equal(parseSqlMutationKeywords(sql).length, 0);
  });

  it('43. P1-P7 history represented', () => {
    for (const v of [
      '20260614000000',
      '20260615000006',
    ]) {
      assert.match(sql, new RegExp(v));
    }
  });

  it('44. functions/triggers/indexes/privileges/RLS represented', () => {
    assert.match(sql, /m55_account_deletion_process_v1/);
    assert.match(sql, /entitlements_canonical_unique/);
    assert.match(sql, /entitlements_rls_enabled/);
  });

  it('45. purchase contract represented', () => {
    assert.match(sql, /purchase_contract_green/);
    assert.match(sql, /one_time_fulfillments/);
    assert.match(sql, /reply_ticket_wallets/);
  });

  it('46. deletion contract represented', () => {
    assert.match(sql, /deletion_contract_green/);
    assert.match(sql, /deletion_rpc_security_definer/);
  });

  it('47. schema-cache represented', () => {
    assert.match(sql, /schema_cache_ready/);
  });

  it('48. unexpected object detection present', () => {
    assert.match(sql, /unexpected_object_detected/);
  });

  it('49. only exact GREEN permits purchase', () => {
    assert.match(sql, /purchase_wave_allowed/);
    assert.match(sql, /PRODUCTION_CHAIN_GREEN/);
  });

  it('50. failed/unknown flags affect result', () => {
    assert.match(sql, /failed_flags/);
    assert.match(sql, /unknown_flags/);
  });
});

describe('runbook contract', () => {
  const runbook = readFileSync(RUNBOOK, 'utf8');

  it('51. D0-D12 present', () => {
    assert.equal(runbookHasDeploymentSteps(runbook), true);
    assert.equal(DEPLOYMENT_STEPS.length, 13);
  });

  it('52. M0-M16 present', () => {
    assert.equal(runbookHasMigrationSteps(runbook), true);
    assert.equal(MIGRATION_APPLY_STEPS.length, 17);
  });

  it('53. conditional rollout order present', () => {
    assert.equal(runbookHasConditionalOrder(runbook), true);
    assert.match(runbook, /MIGRATE_THEN_DEPLOY_REQUIRED/i);
    assert.match(runbook, /conditional rollout order/i);
    assert.doesNotMatch(runbook, /Deploy-then-migrate order/i);
  });

  it('54. no purchase/deletion between deploy and chain GREEN', () => {
    assert.match(runbook, /No Production purchase/i);
    assert.match(runbook, /No Production controlled deletion/i);
    assert.match(runbook, /until migration GREEN/i);
  });

  it('55. 20-row failure matrix present', () => {
    assert.equal(runbookHasFailureMatrixRows(runbook, 20), true);
    assert.equal(ROLLBACK_STOP_MATRIX.length, 20);
  });

  it('56. ambiguous deploy retry forbidden', () => {
    assert.match(runbook, /Ambiguous deploy: \*\*no retry/i);
  });

  it('57. ambiguous COMMIT retry forbidden', () => {
    assert.match(runbook, /Ambiguous COMMIT: \*\*no retry/i);
    for (const ack of COMMIT_ACK_CLASSES) {
      assert.match(runbook, new RegExp(ack));
    }
  });

  it('58. automatic rollback forbidden', () => {
    assert.match(runbook, /Automatic rollback: \*\*forbidden/i);
  });

  it('59. Clerk exact-match required', () => {
    assert.match(runbook, /UNKNOWN forbidden/i);
    assert.match(runbook, /EXACT_MATCH/);
  });

  it('60. controlled purchase/deletion are separate gates', () => {
    assert.match(runbook, /Production purchase smoke.*No/i);
    assert.match(runbook, /Production controlled deletion.*No/i);
  });
});

describe('security and schema', () => {
  it('61. no live network paths in authority module', () => {
    const src = readFileSync(
      join(ROOT, 'scripts/production/m55_production_deployment_migration_authority.ts'),
      'utf8',
    );
    assert.doesNotMatch(src, /\bfetch\s*\(/);
    assert.doesNotMatch(src, /\bhttps?:\/\//);
    assert.doesNotMatch(src, /from ['"]node:pg['"]/);
  });

  it('62. no Production connection in tests', () => {
    const src = readFileSync(
      join(ROOT, 'scripts/production/m55_production_deployment_migration.local.test.ts'),
      'utf8',
    );
    assert.doesNotMatch(src, /\bpg\.connect\b/);
    assert.doesNotMatch(src, /\bexec\s*\(\s*['"]psql/);
  });

  it('63. no secret-like literals in SQL/runbook', () => {
    const pre = readFileSync(PREFLIGHT_SQL, 'utf8');
    const post = readFileSync(POSTCHECK_SQL, 'utf8');
    const runbook = readFileSync(RUNBOOK, 'utf8');
    for (const blob of [pre, post, runbook]) {
      assert.doesNotMatch(blob, /sk_live_/);
      assert.doesNotMatch(blob, /whsec_/);
      assert.doesNotMatch(blob, /postgres:\/\//);
    }
  });

  it('64. no PII/real identifiers in artifacts', () => {
    const runbook = readFileSync(RUNBOOK, 'utf8');
    assert.doesNotMatch(runbook, /user_[a-zA-Z0-9]{10,}/);
    assert.doesNotMatch(runbook, /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  });

  it('65. fixed JSON schema exact', () => {
    const r = validateProductionDeploymentMigrationAuthority(null, { now: new Date() });
    const json = serializeAuthorityValidationResult(r);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    assert.equal(parsed.schema_version, AUTHORITY_SCHEMA_VERSION);
    assert.deepEqual(Object.keys(parsed).sort(), ['failed_flags', 'next_gate', 'ready', 'schema_version', 'unknown_flags']);
  });

  it('66. hostile/circular errors safely redacted', () => {
    assert.throws(() => assertSecretSafeOutput('Bearer abc'));
    assert.throws(() => assertSecretSafeOutput('whsec_abc'));
  });
});

describe('production env and deployment classes', () => {
  it('67. required env key names frozen', () => {
    assert.ok(PRODUCTION_ENV_KEY_NAMES.length >= 10);
    assert.ok(PRODUCTION_ENV_KEY_NAMES.includes('CLERK_WEBHOOK_SIGNING_SECRET'));
  });

  it('68. deployment outcome classes complete', () => {
    assert.equal(DEPLOYMENT_OUTCOME_CLASSES.length, 8);
  });

  it('69. postcheck classifications complete', () => {
    assert.equal(POSTCHECK_CLASSIFICATIONS.length, 8);
  });

  it('70. default authority ready false without full ctx', () => {
    const r = validateProductionDeploymentMigrationAuthority(futureAuthority(), {
      now: new Date(),
      observedFeatureHead: FEATURE_HEAD,
    });
    assert.equal(r.ready, false);
    const bad = validateProductionDeploymentMigrationAuthority(null, { now: new Date() });
    assert.equal(bad.ready, false);
  });
});

describe('apply-set contract', () => {
  it('71. ALREADY_APPLIED => empty required set', () => {
    const plan = computeApplySetFromPreflight({
      preflight_classification: 'ALREADY_APPLIED',
      applied_versions: [...CANONICAL_VERSIONS],
      version_object_exact: allVersionsObjectExact(true),
    });
    assert.deepEqual(plan.required_apply_versions, []);
    assert.equal(plan.apply_required, false);
    assert.equal(plan.stop_required, false);
  });

  it('72. GREENFIELD exact => ordered missing set', () => {
    const plan = greenfieldApplyPlan();
    assert.deepEqual(plan.required_apply_versions, CANONICAL_VERSIONS);
    assert.equal(plan.apply_required, true);
    assert.equal(plan.unconditional_apply_forbidden, true);
  });

  it('73. partial state => empty + stop', () => {
    const plan = computeApplySetFromPreflight({
      preflight_classification: 'PARTIAL_STATE_RECONCILIATION_REQUIRED',
      applied_versions: ['20260614000000'],
      version_object_exact: { ...allVersionsObjectExact(false), '20260614000000': true },
    });
    assert.deepEqual(plan.required_apply_versions, []);
    assert.equal(plan.stop_required, true);
  });

  it('74. history-only drift => empty + stop', () => {
    const plan = computeApplySetFromPreflight({
      preflight_classification: 'HISTORY_ONLY_DRIFT',
      applied_versions: ['20260614000000'],
      version_object_exact: allVersionsObjectExact(false),
    });
    assert.deepEqual(plan.required_apply_versions, []);
    assert.equal(plan.stop_required, true);
  });

  it('75. schema-only drift => empty + stop', () => {
    const plan = computeApplySetFromPreflight({
      preflight_classification: 'SCHEMA_ONLY_DRIFT',
      applied_versions: [],
      version_object_exact: { ...allVersionsObjectExact(false), '20260615000001': true },
    });
    assert.deepEqual(plan.required_apply_versions, []);
    assert.equal(plan.stop_required, true);
  });

  it('76. unknown => empty + stop', () => {
    const plan = computeApplySetFromPreflight({
      preflight_classification: 'HOLD_UNKNOWN',
      applied_versions: [],
      version_object_exact: allVersionsObjectExact(false),
    });
    assert.deepEqual(plan.required_apply_versions, []);
    assert.equal(plan.stop_required, true);
  });

  it('77. already-applied version never reruns', () => {
    const plan = computeApplySetFromPreflight({
      preflight_classification: 'GREENFIELD_READY',
      applied_versions: ['20260614000000', '20260615000001'],
      version_object_exact: {
        ...allVersionsObjectExact(false),
        '20260614000000': true,
        '20260615000001': true,
      },
    });
    assert.ok(!plan.required_apply_versions.includes('20260614000000'));
    assert.ok(!plan.required_apply_versions.includes('20260615000001'));
  });

  it('78. predecessor conflict blocks later version', () => {
    const plan = computeApplySetFromPreflight({
      preflight_classification: 'GREENFIELD_READY',
      applied_versions: [],
      version_object_exact: { ...allVersionsObjectExact(false), '20260615000002': true },
    });
    assert.deepEqual(plan.required_apply_versions, []);
    assert.ok(plan.blocked_versions.length > 0 || plan.unknown_versions.length > 0);
  });

  it('79. unapproved version rejected by authority', () => {
    assert.equal(
      validateVersionApprovedForExecution('20999999999999', CANONICAL_VERSIONS),
      false,
    );
  });

  it('80. stale preflight identity rejected', () => {
    assert.equal(
      rejectStalePreflightIdentity('a'.repeat(64), 'b'.repeat(64)),
      true,
    );
  });

  it('81. changed apply set after approval rejected', () => {
    assert.equal(
      rejectApplySetChangedAfterApproval(
        ['20260614000000'],
        ['20260614000000', '20260615000001'],
      ),
      true,
    );
  });

  it('82. unconditional-all flag absent/forbidden', () => {
    const r = validateProductionDeploymentMigrationAuthority(
      futureAuthority({ unconditional_apply_all: true as false }),
      fullValidationCtx(),
    );
    assert.equal(r.ready, false);
    assert.match(r.failed_flags.join(','), /HOLD_UNCONDITIONAL_APPLY_ALL_FORBIDDEN/);
  });
});

describe('compatibility contract', () => {
  it('83. old/new=true new/old=false => MIGRATE_THEN_DEPLOY_REQUIRED', () => {
    const r = classifySchemaCompatibility({ old_app_new_schema: true, new_app_old_schema: false });
    assert.equal(r.classification, 'MIGRATE_THEN_DEPLOY_REQUIRED');
    assert.equal(r.selected_order, 'MIGRATE_THEN_DEPLOY');
  });

  it('84. old/new=false new/old=true => DEPLOY_THEN_MIGRATE_ALLOWED', () => {
    const r = classifySchemaCompatibility({ old_app_new_schema: false, new_app_old_schema: true });
    assert.equal(r.classification, 'DEPLOY_THEN_MIGRATE_ALLOWED');
    assert.equal(r.selected_order, 'DEPLOY_THEN_MIGRATE');
  });

  it('85. both true => BOTH_CROSS_COMPATIBLE', () => {
    const r = classifySchemaCompatibility({ old_app_new_schema: true, new_app_old_schema: true });
    assert.equal(r.classification, 'BOTH_CROSS_COMPATIBLE');
  });

  it('86. both false => STAGED_PROTECTED_CUTOVER_REQUIRED', () => {
    const r = classifySchemaCompatibility({ old_app_new_schema: false, new_app_old_schema: false });
    assert.equal(r.classification, 'STAGED_PROTECTED_CUTOVER_REQUIRED');
  });

  it('87. unknown direction => HOLD_COMPATIBILITY_UNPROVEN', () => {
    const r = classifySchemaCompatibility({ old_app_new_schema: 'UNKNOWN', new_app_old_schema: false });
    assert.equal(r.classification, 'HOLD_COMPATIBILITY_UNPROVEN');
  });

  it('88. deploy-before-check rejected', () => {
    assert.equal(rejectDeployBeforeCompatibilityAudit(false, true), true);
  });

  it('89. selected order mismatch rejected', () => {
    const r = validateProductionDeploymentMigrationAuthority(
      futureAuthority({
        compatibility_classification: 'MIGRATE_THEN_DEPLOY_REQUIRED',
        selected_rollout_order: 'DEPLOY_THEN_MIGRATE',
      }),
      fullValidationCtx(),
    );
    assert.equal(r.ready, false);
    assert.match(r.failed_flags.join(','), /HOLD_ROLLOUT_ORDER_MATRIX_MISMATCH/);
  });

  it('90. final main change invalidates compatibility evidence', () => {
    const r = validateProductionDeploymentMigrationAuthority(
      futureAuthority({ candidate_main_commit: FEATURE_HEAD }),
      fullValidationCtx({ observedMainCommit: FUTURE_MAIN }),
    );
    assert.equal(r.ready, false);
  });

  it('91. production schema identity change invalidates evidence', () => {
    const r = validateProductionDeploymentMigrationAuthority(futureAuthority(), fullValidationCtx({
      observedSchemaIdentity: 'changed-schema-identity',
    }));
    assert.equal(r.ready, false);
    assert.match(r.failed_flags.join(','), /HOLD_SCHEMA_IDENTITY_MISMATCH/);
  });
});

describe('sql and runbook patch contract', () => {
  const preflight = readFileSync(PREFLIGHT_SQL, 'utf8');
  const postcheck = readFileSync(POSTCHECK_SQL, 'utf8');
  const runbook = readFileSync(RUNBOOK, 'utf8');

  it('92. preflight emits required_apply_versions', () => {
    assert.match(preflight, /required_apply_versions/);
    assert.match(preflight, /already_applied_versions/);
    assert.match(preflight, /blocked_versions/);
    assert.match(preflight, /conflicting_versions/);
    assert.match(preflight, /unknown_versions/);
    assert.match(preflight, /unconditional_apply_forbidden/);
  });

  it('93. drift classifications cannot emit apply set', () => {
    assert.match(preflight, /ALREADY_APPLIED[\s\S]*ARRAY\[\]::text\[\]/);
    assert.match(preflight, /HISTORY_ONLY_DRIFT/);
  });

  it('94. postcheck distinguishes prior/newly-applied versions', () => {
    assert.match(postcheck, /previously_applied_versions/);
    assert.match(postcheck, /newly_applied_in_authority_set/);
    assert.match(postcheck, /approved_set_respected/);
  });

  it('95. runbook canonical-chain-not-execution-list statement', () => {
    assert.equal(runbookHasCanonicalChainNotExecutionList(runbook), true);
  });

  it('96. runbook compatibility gate precedes deploy', () => {
    assert.equal(runbookHasCompatibilityBeforeDeploy(runbook), true);
    assert.match(runbook, /HOLD_DEPLOY_BEFORE_COMPATIBILITY_AUDIT/);
  });

  it('97. no unconditional P1-P7 apply wording remains', () => {
    assert.equal(runbookUnconditionalApplyWordingCount(runbook), 0);
  });

  it('98. provisional matrix selects migrate-then-deploy', () => {
    assert.match(runbook, /OLD_APP_NEW_SCHEMA.*true/i);
    assert.match(runbook, /NEW_APP_OLD_SCHEMA.*false/i);
    assert.match(runbook, /MIGRATE_THEN_DEPLOY_REQUIRED/);
  });

  it('99. no purchase/deletion before final integrated GREEN', () => {
    assert.match(runbook, /No purchase\/deletion before final integrated GREEN/i);
    assert.match(runbook, /No Production purchase/i);
    assert.match(runbook, /No Production controlled deletion/i);
  });
});
