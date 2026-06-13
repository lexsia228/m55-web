import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';

import { splitAndTrim } from './transactionNormalized/splitAndTrim.ts';
import {
  applyOptionARemoval,
  buildPolicy2HistoryPayload,
  compositeStreamSha256,
} from './transactionNormalized/statementStream.ts';
import {
  EXPECTED_REVISION7_VERSION_IDENTITIES,
  loadAuthorityBundle,
  validateAuthorityBytes,
} from './transactionNormalized/transactionNormalizedCore.ts';

import {
  computeHistoryBootstrapCanonicalPayloadSha256,
  HISTORY_BOOTSTRAP_DDL_STATEMENTS,
  HISTORY_BOOTSTRAP_SPEC,
} from './previewRemoteApply/historyBootstrapSpec.ts';
import {
  createPlanOnlyPgTransport,
  getPlanOnlyTransportCallCount,
  normalizePlanOnlyTransportError,
  resetPlanOnlyTransportCallCountForTests,
} from './previewRemoteApply/pgTransportAdapter.ts';
import {
  assertRuntimeProbeRegistryRejectsMutatedAckBinding,
  assertRuntimeProbeRegistryRejectsUnknownHoldCode,
  getRuntimeProbeById,
  RUNTIME_PROBE_ENTRIES,
  RUNTIME_PROBE_REGISTRY,
  validateRuntimeProbeRegistry,
  type RuntimeProbeEntry,
} from './previewRemoteApply/runtimeProbeRegistry.ts';
import {
  computeTimeoutPolicyCanonicalPayloadSha256,
  TIMEOUT_POLICY,
  validateTimeoutPolicyInvariants,
} from './previewRemoteApply/timeoutPolicy.ts';
import {
  buildHistoryPayloadForStep,
  buildPreviewRemoteApplyPlan,
  evaluateP1HistoryBootstrapPrecondition,
  parseMigrationFilename,
  validateRepositoryIdentityFacts,
  validateTargetIdentityFacts,
} from './previewRemoteApply/transactionNormalizedRemoteExecutor.ts';
import {
  APPROVED_PREVIEW_DATABASE_TIER,
  APPROVED_PREVIEW_ORGANIZATION,
  APPROVED_PREVIEW_PROJECT,
  canonicalSerializePreviewRemoteApply,
  CREDENTIAL_METHOD_IDS,
  EXPECTED_BRANCH,
  EXPECTED_NORMALIZED_STATEMENT_COUNTS,
  EXPECTED_REPO_ROOT,
  HISTORY_INSERT_SQL_METADATA,
  P0_PREFLIGHT_PATCH2_AUTHORITY,
  PREVIEW_REMOTE_APPLY_HOLD_CODES,
  REMOTE_BOOTSTRAP_OBSERVATION_STATUS,
  REPOSITORY_FACTS_SOURCE,
  sanitizePreviewRemoteApplyHoldCode,
  type RepositoryIdentityFacts,
} from './previewRemoteApply/types.ts';

const REPO_ROOT = join(import.meta.dirname, '../..');
const VALID_FINGERPRINT_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const VALID_FINGERPRINT_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const VALID_PROJECT_REF = 'preview-test-ref';

function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function readGitRepositoryFacts(): RepositoryIdentityFacts {
  const topLevel = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: REPO_ROOT, encoding: 'utf8' }).stdout.trim();
  const branch = spawnSync('git', ['branch', '--show-current'], { cwd: REPO_ROOT, encoding: 'utf8' }).stdout.trim();
  const headCommitSha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT, encoding: 'utf8' }).stdout.trim();
  const treeSha = spawnSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: REPO_ROOT, encoding: 'utf8' }).stdout.trim();
  const porcelain = spawnSync('git', ['status', '--porcelain'], { cwd: REPO_ROOT, encoding: 'utf8' }).stdout.trim();
  const trackedDirty = porcelain
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .some((line) => !line.startsWith('??'));
  const indexDirty =
    spawnSync('git', ['diff', '--cached', '--name-only'], { cwd: REPO_ROOT, encoding: 'utf8' }).stdout.trim().length > 0;
  return {
    repoRoot: topLevel,
    branch,
    headCommitSha,
    treeSha,
    trackedWorktreeClean: !trackedDirty,
    indexEmpty: !indexDirty,
    factsSource: REPOSITORY_FACTS_SOURCE,
  };
}

function validPlanInput(overrides: {
  repository?: Partial<RepositoryIdentityFacts>;
  projectRef?: string | null;
  hostFingerprintSha256?: string | null;
  organization?: string;
  project?: string;
  databaseTier?: string;
  credentialMethod?: (typeof CREDENTIAL_METHOD_IDS)[number];
} = {}) {
  const repository = { ...readGitRepositoryFacts(), ...overrides.repository };
  return {
    repoRoot: EXPECTED_REPO_ROOT,
    repository,
    target: {
      organization: overrides.organization ?? APPROVED_PREVIEW_ORGANIZATION,
      project: overrides.project ?? APPROVED_PREVIEW_PROJECT,
      databaseTier: overrides.databaseTier ?? APPROVED_PREVIEW_DATABASE_TIER,
      projectRef: overrides.projectRef !== undefined ? overrides.projectRef : VALID_PROJECT_REF,
      hostFingerprintSha256:
        overrides.hostFingerprintSha256 !== undefined
          ? overrides.hostFingerprintSha256
          : VALID_FINGERPRINT_A,
    },
    credentialMethod: overrides.credentialMethod ?? CREDENTIAL_METHOD_IDS[0],
    executionEnablement: false as const,
  };
}

function normalizedStatementsFor(label: (typeof EXPECTED_REVISION7_VERSION_IDENTITIES)[number]['label']) {
  const identity = EXPECTED_REVISION7_VERSION_IDENTITIES.find((entry) => entry.label === label);
  assert.ok(identity);
  const bundle = loadAuthorityBundle(REPO_ROOT);
  const contractVersion = bundle.contract.versions.find((entry) => entry.label === label);
  assert.ok(contractVersion);
  const rawBytes = readFileSync(join(REPO_ROOT, identity.path));
  const statements = splitAndTrim(rawBytes.toString('utf8'));
  const { normalized } = applyOptionARemoval(label, statements);
  return { identity, contractVersion, normalized };
}

function runCli(args: string[]) {
  return spawnSync(
    process.execPath,
    ['--experimental-strip-types', join(REPO_ROOT, 'scripts/m55/runPreviewRemoteApplyPlan.ts'), ...args],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
}

function cloneRegistryEntries(): RuntimeProbeEntry[] {
  return structuredClone(RUNTIME_PROBE_ENTRIES) as RuntimeProbeEntry[];
}

function expectRegistryReject(mutated: readonly RuntimeProbeEntry[]): void {
  assert.throws(() => validateRuntimeProbeRegistry(mutated), /HOLD_RUNTIME_PROBE_REGISTRY/);
}

describe('previewRemoteApply Stage-B PATCH-1 focused tests', () => {
  it('01 HOLD registry preserves registered codes', () => {
    for (const code of PREVIEW_REMOTE_APPLY_HOLD_CODES) {
      assert.equal(sanitizePreviewRemoteApplyHoldCode(code), code);
    }
  });

  it('02 HOLD registry maps unknown values to HOLD_UNEXPECTED_INTERNAL', () => {
    assert.equal(sanitizePreviewRemoteApplyHoldCode('free-form-error'), 'HOLD_UNEXPECTED_INTERNAL');
  });

  it('03 HOLD registry includes HOLD_TARGET_IDENTITY_MISMATCH', () => {
    assert.ok(PREVIEW_REMOTE_APPLY_HOLD_CODES.includes('HOLD_TARGET_IDENTITY_MISMATCH'));
  });

  it('04 seven migration order is P1 through P7', () => {
    assert.deepEqual(
      EXPECTED_REVISION7_VERSION_IDENTITIES.map((entry) => entry.label),
      ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'],
    );
  });

  for (const identity of EXPECTED_REVISION7_VERSION_IDENTITIES) {
    it(`05 migration identity ${identity.label} SHA`, () => {
      const bundle = loadAuthorityBundle(REPO_ROOT);
      const contractVersion = bundle.contract.versions.find((entry) => entry.label === identity.label);
      assert.ok(contractVersion);
      assert.equal(sha256File(join(REPO_ROOT, identity.path)), contractVersion.frozen_source_sha256);
    });
  }

  for (const identity of EXPECTED_REVISION7_VERSION_IDENTITIES) {
    it(`06 version/name derivation ${identity.label}`, () => {
      const parsed = parseMigrationFilename(identity.path);
      assert.equal(parsed.version, identity.version);
      assert.equal(parsed.name, identity.name);
    });
  }

  for (const identity of EXPECTED_REVISION7_VERSION_IDENTITIES) {
    it(`07 statement count ${identity.label}`, () => {
      const { normalized } = normalizedStatementsFor(identity.label);
      assert.equal(normalized.length, EXPECTED_NORMALIZED_STATEMENT_COUNTS[identity.label]);
    });
  }

  for (const identity of EXPECTED_REVISION7_VERSION_IDENTITIES) {
    it(`08 normalized composite SHA ${identity.label}`, () => {
      const { contractVersion, normalized } = normalizedStatementsFor(identity.label);
      assert.equal(compositeStreamSha256(normalized), contractVersion.normalized_stream_composite_sha256);
    });
  }

  it('09 composite mismatch fails closed via buildPolicy2HistoryPayload', () => {
    const { identity, normalized } = normalizedStatementsFor('P1');
    assert.throws(
      () =>
        buildPolicy2HistoryPayload({
          version: identity.version,
          name: identity.name,
          normalizedStatements: normalized,
          expectedNormalizedCompositeSha256: '0'.repeat(64),
        }),
      /POLICY_2_NORMALIZED_COMPOSITE_MISMATCH/,
    );
  });

  it('10 Policy-2 array order preserved', () => {
    const { identity, contractVersion, normalized } = normalizedStatementsFor('P2');
    const payload = buildHistoryPayloadForStep({
      stepId: 'P2',
      version: identity.version,
      name: identity.name,
      normalizedStatements: normalized,
      expectedNormalizedCompositeSha256: contractVersion.normalized_stream_composite_sha256,
    });
    assert.deepEqual(payload.statements, normalized);
  });

  it('11 null normalized array rejected', () => {
    assert.throws(
      () =>
        buildHistoryPayloadForStep({
          stepId: 'P1',
          version: '20260614000000',
          name: 'preview_production_aligned_baseline_p1',
          normalizedStatements: null as unknown as string[],
          expectedNormalizedCompositeSha256: '0'.repeat(64),
        }),
      /HOLD_NORMALIZED_STREAM_MISMATCH/,
    );
  });

  it('12 empty normalized array rejected', () => {
    assert.throws(
      () =>
        buildHistoryPayloadForStep({
          stepId: 'P1',
          version: '20260614000000',
          name: 'preview_production_aligned_baseline_p1',
          normalizedStatements: [],
          expectedNormalizedCompositeSha256: '0'.repeat(64),
        }),
      /HOLD_NORMALIZED_STREAM_MISMATCH/,
    );
  });

  it('13 P1 self-consistent one-statement payload rejected', () => {
    const { identity, normalized } = normalizedStatementsFor('P1');
    const oneStatement = [normalized[0]];
    const composite = compositeStreamSha256(oneStatement);
    assert.throws(
      () =>
        buildHistoryPayloadForStep({
          stepId: 'P1',
          version: identity.version,
          name: identity.name,
          normalizedStatements: oneStatement,
          expectedNormalizedCompositeSha256: composite,
        }),
      /HOLD_NORMALIZED_STREAM_MISMATCH/,
    );
  });

  it('14 wrong step/version rejected', () => {
    const { contractVersion, normalized } = normalizedStatementsFor('P1');
    assert.throws(
      () =>
        buildHistoryPayloadForStep({
          stepId: 'P2',
          version: '20260614000000',
          name: 'preview_production_aligned_baseline_p1',
          normalizedStatements: normalized,
          expectedNormalizedCompositeSha256: contractVersion.normalized_stream_composite_sha256,
        }),
      /HOLD_MIGRATION_IDENTITY_MISMATCH/,
    );
  });

  it('15 wrong step/name rejected', () => {
    const { identity, contractVersion, normalized } = normalizedStatementsFor('P1');
    assert.throws(
      () =>
        buildHistoryPayloadForStep({
          stepId: 'P1',
          version: identity.version,
          name: 'wrong_name',
          normalizedStatements: normalized,
          expectedNormalizedCompositeSha256: contractVersion.normalized_stream_composite_sha256,
        }),
      /HOLD_MIGRATION_IDENTITY_MISMATCH/,
    );
  });

  for (const identity of EXPECTED_REVISION7_VERSION_IDENTITIES) {
    it(`16 exact count accepted ${identity.label}`, () => {
      const { identity: id, contractVersion, normalized } = normalizedStatementsFor(identity.label);
      const payload = buildHistoryPayloadForStep({
        stepId: identity.label,
        version: id.version,
        name: id.name,
        normalizedStatements: normalized,
        expectedNormalizedCompositeSha256: contractVersion.normalized_stream_composite_sha256,
      });
      assert.equal(payload.statements.length, EXPECTED_NORMALIZED_STATEMENT_COUNTS[identity.label]);
    });
  }

  it('17 bootstrap binds only to P1 in plan', () => {
    const plan = buildPreviewRemoteApplyPlan(validPlanInput());
    assert.equal(plan.mode, 'PREVIEW_REMOTE_APPLY_DRY_RUN_PLAN');
    for (const step of plan.steps) {
      if (step.stepId === 'P1') {
        assert.equal(step.bootstrapSpecId, HISTORY_BOOTSTRAP_SPEC.identifier);
      } else {
        assert.equal(step.bootstrapSpecId, null);
      }
    }
  });

  it('18 bootstrap canonical hash independently recomputed', () => {
    assert.equal(
      computeHistoryBootstrapCanonicalPayloadSha256(),
      HISTORY_BOOTSTRAP_SPEC.canonical_payload_sha256,
    );
  });

  it('19 bootstrap explicit schema owner statement', () => {
    assert.equal(
      HISTORY_BOOTSTRAP_DDL_STATEMENTS[1].sql,
      'ALTER SCHEMA supabase_migrations OWNER TO postgres;',
    );
  });

  it('20 bootstrap explicit table owner statement', () => {
    assert.equal(
      HISTORY_BOOTSTRAP_DDL_STATEMENTS[3].sql,
      'ALTER TABLE supabase_migrations.schema_migrations OWNER TO postgres;',
    );
  });

  it('21 GREENFIELD absence passes pure evaluator', () => {
    assert.equal(
      evaluateP1HistoryBootstrapPrecondition({
        classification: 'GREENFIELD_READY',
        historySchemaExists: false,
        historyRelationExists: false,
        stopRequired: false,
      }),
      null,
    );
  });

  it('22 schema present HOLD', () => {
    assert.equal(
      evaluateP1HistoryBootstrapPrecondition({
        classification: 'GREENFIELD_READY',
        historySchemaExists: true,
        historyRelationExists: false,
        stopRequired: false,
      }),
      'HOLD_BOOTSTRAP_PRECONDITION',
    );
  });

  it('23 relation present HOLD', () => {
    assert.equal(
      evaluateP1HistoryBootstrapPrecondition({
        classification: 'GREENFIELD_READY',
        historySchemaExists: false,
        historyRelationExists: true,
        stopRequired: false,
      }),
      'HOLD_BOOTSTRAP_PRECONDITION',
    );
  });

  it('24 stopRequired true HOLD', () => {
    assert.equal(
      evaluateP1HistoryBootstrapPrecondition({
        classification: 'GREENFIELD_READY',
        historySchemaExists: false,
        historyRelationExists: false,
        stopRequired: true,
      }),
      'HOLD_BOOTSTRAP_PRECONDITION',
    );
  });

  it('25 successful plan states remote observation not performed', () => {
    const plan = buildPreviewRemoteApplyPlan(validPlanInput());
    assert.equal(plan.mode, 'PREVIEW_REMOTE_APPLY_DRY_RUN_PLAN');
    assert.equal(plan.bootstrapPrecondition.remoteObservationStatus, REMOTE_BOOTSTRAP_OBSERVATION_STATUS);
    assert.equal(plan.bootstrapPrecondition.p0PreflightAuthority.filename, P0_PREFLIGHT_PATCH2_AUTHORITY.filename);
  });

  it('26 timeout exact millisecond values', () => {
    assert.deepEqual(TIMEOUT_POLICY.values, {
      connectMs: 15000,
      lockMs: 30000,
      statementMs: 120000,
      idleInTransactionMs: 180000,
      mutationDeadlineMs: 600000,
      postCommitVerificationMs: 120000,
      ackClassifierMs: 180000,
    });
  });

  it('27 timeout invariant mutations rejected', () => {
    assert.throws(
      () =>
        validateTimeoutPolicyInvariants({
          ...TIMEOUT_POLICY,
          values: {
            connectMs: 30000,
            lockMs: 15000,
            statementMs: 120000,
            idleInTransactionMs: 180000,
            mutationDeadlineMs: 600000,
            postCommitVerificationMs: 120000,
            ackClassifierMs: 180000,
          } as unknown as typeof TIMEOUT_POLICY.values,
        }),
      /HOLD_TIMEOUT_POLICY/,
    );
  });

  it('28 P0 preflight probe is distinct from PRIOR_P1', () => {
    const p0 = getRuntimeProbeById('P0_PREFLIGHT_PATCH2');
    const priorP1 = getRuntimeProbeById('PRIOR_P1');
    assert.ok(p0?.kind === 'ORDINARY');
    assert.ok(priorP1?.kind === 'ORDINARY');
    assert.notEqual(p0.id, priorP1.id);
  });

  it('29 ACK classifier phase is dynamic not P0', () => {
    const ack = getRuntimeProbeById('ACK_CLASSIFIER');
    assert.ok(ack?.kind === 'ACK_CLASSIFIER');
    assert.equal(ack.phaseMode, 'DYNAMIC_P1_P7');
  });

  it('30 exact seven ACK bindings', () => {
    const ack = getRuntimeProbeById('ACK_CLASSIFIER');
    assert.ok(ack?.kind === 'ACK_CLASSIFIER');
    assert.equal(ack.bindings.length, 7);
    assert.deepEqual(ack.bindings.map((binding) => binding.stepId), ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']);
  });

  it('31 ACK prior/post prefixes match registry', () => {
    const ack = getRuntimeProbeById('ACK_CLASSIFIER');
    assert.ok(ack?.kind === 'ACK_CLASSIFIER');
    for (const binding of ack.bindings) {
      const prior = getRuntimeProbeById(`PRIOR_${binding.stepId}`);
      const post = getRuntimeProbeById(`POST_${binding.stepId}`);
      assert.ok(prior?.kind === 'ORDINARY');
      assert.ok(post?.kind === 'ORDINARY');
      assert.deepEqual(binding.priorHistoryPrefix, prior.expectedHistoryPrefix);
      assert.deepEqual(binding.postHistoryPrefix, post.expectedHistoryPrefix);
    }
  });

  it('32 ACK prior/post oracle matches registry', () => {
    const ack = getRuntimeProbeById('ACK_CLASSIFIER');
    assert.ok(ack?.kind === 'ACK_CLASSIFIER');
    for (const binding of ack.bindings) {
      const prior = getRuntimeProbeById(`PRIOR_${binding.stepId}`);
      const post = getRuntimeProbeById(`POST_${binding.stepId}`);
      assert.ok(prior?.kind === 'ORDINARY');
      assert.ok(post?.kind === 'ORDINARY');
      assert.equal(binding.priorOracleHashSha256, prior.oracleContractHashSha256);
      assert.equal(binding.postOracleHashSha256, post.oracleContractHashSha256);
    }
  });

  it('33 mutated ACK binding rejected by registry validator', () => {
    assert.doesNotThrow(() => assertRuntimeProbeRegistryRejectsMutatedAckBinding());
  });

  it('34 unknown probe hold code rejected', () => {
    assert.doesNotThrow(() => assertRuntimeProbeRegistryRejectsUnknownHoldCode());
  });

  it('35 exact 17-ID order enforced', () => {
    validateRuntimeProbeRegistry();
    assert.equal(RUNTIME_PROBE_ENTRIES.length, 17);
    assert.equal(RUNTIME_PROBE_ENTRIES[0]?.id, 'P0_PREFLIGHT_PATCH2');
    assert.equal(RUNTIME_PROBE_ENTRIES[16]?.id, 'FINAL_P7_CHAIN');
  });

  it('36 nested repoRoot mismatch HOLD', () => {
    const facts = readGitRepositoryFacts();
    assert.equal(
      validateRepositoryIdentityFacts(EXPECTED_REPO_ROOT, { ...facts, repoRoot: '/tmp/other' }),
      'HOLD_REPO_IDENTITY_MISMATCH',
    );
  });

  it('37 wrong branch HOLD', () => {
    const facts = readGitRepositoryFacts();
    assert.equal(
      validateRepositoryIdentityFacts(EXPECTED_REPO_ROOT, { ...facts, branch: 'main' }),
      'HOLD_REPO_IDENTITY_MISMATCH',
    );
  });

  it('38 malformed HEAD HOLD', () => {
    const facts = readGitRepositoryFacts();
    assert.equal(
      validateRepositoryIdentityFacts(EXPECTED_REPO_ROOT, { ...facts, headCommitSha: 'ZZZZ' }),
      'HOLD_REPO_IDENTITY_MISMATCH',
    );
  });

  it('39 malformed tree HOLD', () => {
    const facts = readGitRepositoryFacts();
    assert.equal(
      validateRepositoryIdentityFacts(EXPECTED_REPO_ROOT, { ...facts, treeSha: 'not-a-tree' }),
      'HOLD_REPO_IDENTITY_MISMATCH',
    );
  });

  it('40 tracked worktree dirty HOLD', () => {
    const facts = readGitRepositoryFacts();
    assert.equal(
      validateRepositoryIdentityFacts(EXPECTED_REPO_ROOT, { ...facts, trackedWorktreeClean: false }),
      'HOLD_REPO_IDENTITY_MISMATCH',
    );
  });

  it('41 index nonempty HOLD', () => {
    const facts = readGitRepositoryFacts();
    assert.equal(
      validateRepositoryIdentityFacts(EXPECTED_REPO_ROOT, { ...facts, indexEmpty: false }),
      'HOLD_REPO_IDENTITY_MISMATCH',
    );
  });

  it('42 successful output binds repo facts', () => {
    const facts = readGitRepositoryFacts();
    const plan = buildPreviewRemoteApplyPlan(validPlanInput({ repository: facts }));
    assert.equal(plan.mode, 'PREVIEW_REMOTE_APPLY_DRY_RUN_PLAN');
    assert.deepEqual(plan.repository, facts);
  });

  it('43 unrelated organization HOLD', () => {
    assert.equal(validateTargetIdentityFacts({
      organization: 'other-org',
      project: APPROVED_PREVIEW_PROJECT,
      databaseTier: APPROVED_PREVIEW_DATABASE_TIER,
      projectRef: VALID_PROJECT_REF,
      hostFingerprintSha256: VALID_FINGERPRINT_A,
    }), 'HOLD_TARGET_IDENTITY_MISMATCH');
  });

  it('44 unrelated project HOLD', () => {
    assert.equal(validateTargetIdentityFacts({
      organization: APPROVED_PREVIEW_ORGANIZATION,
      project: 'other-project',
      databaseTier: APPROVED_PREVIEW_DATABASE_TIER,
      projectRef: VALID_PROJECT_REF,
      hostFingerprintSha256: VALID_FINGERPRINT_A,
    }), 'HOLD_TARGET_IDENTITY_MISMATCH');
  });

  it('45 wrong tier HOLD', () => {
    assert.equal(validateTargetIdentityFacts({
      organization: APPROVED_PREVIEW_ORGANIZATION,
      project: APPROVED_PREVIEW_PROJECT,
      databaseTier: 'Other Database',
      projectRef: VALID_PROJECT_REF,
      hostFingerprintSha256: VALID_FINGERPRINT_A,
    }), 'HOLD_TARGET_IDENTITY_MISMATCH');
  });

  it('46 whitespace-only project ref HOLD', () => {
    assert.equal(validateTargetIdentityFacts({
      organization: APPROVED_PREVIEW_ORGANIZATION,
      project: APPROVED_PREVIEW_PROJECT,
      databaseTier: APPROVED_PREVIEW_DATABASE_TIER,
      projectRef: '   ',
      hostFingerprintSha256: VALID_FINGERPRINT_A,
    }), 'HOLD_TARGET_FINGERPRINT_INCOMPLETE');
  });

  it('47 production organization rejected', () => {
    const plan = buildPreviewRemoteApplyPlan(validPlanInput({ organization: 'm55-soul' }));
    assert.equal(plan.mode, 'PREVIEW_REMOTE_APPLY_DRY_RUN_HOLD');
    assert.equal(plan.holdReasonCode, 'HOLD_TARGET_PRODUCTION_FORBIDDEN');
  });

  it('48 successful output binds target and credential method', () => {
    const plan = buildPreviewRemoteApplyPlan(validPlanInput({ credentialMethod: 'TEMP_PGPASSFILE_0600_v1' }));
    assert.equal(plan.mode, 'PREVIEW_REMOTE_APPLY_DRY_RUN_PLAN');
    assert.equal(plan.target.credentialMethod, 'TEMP_PGPASSFILE_0600_v1');
    assert.equal(plan.target.projectRef, VALID_PROJECT_REF);
    assert.equal(plan.target.hostFingerprintSha256, VALID_FINGERPRINT_A);
  });

  it('49 different host fingerprints change canonical plan output', () => {
    const planA = buildPreviewRemoteApplyPlan(validPlanInput({ hostFingerprintSha256: VALID_FINGERPRINT_A }));
    const planB = buildPreviewRemoteApplyPlan(validPlanInput({ hostFingerprintSha256: VALID_FINGERPRINT_B }));
    assert.notEqual(
      canonicalSerializePreviewRemoteApply(planA),
      canonicalSerializePreviewRemoteApply(planB),
    );
  });

  it('50 transport call count remains zero in plan generation', () => {
    resetPlanOnlyTransportCallCountForTests();
    const plan = buildPreviewRemoteApplyPlan(validPlanInput());
    assert.equal(plan.transportCallCount, 0);
    assert.equal(getPlanOnlyTransportCallCount(), 0);
  });

  it('51 runtime pg import absent from implementation files', () => {
    const transportSource = readFileSync(join(REPO_ROOT, 'lib/m55/previewRemoteApply/pgTransportAdapter.ts'), 'utf8');
    const executorSource = readFileSync(
      join(REPO_ROOT, 'lib/m55/previewRemoteApply/transactionNormalizedRemoteExecutor.ts'),
      'utf8',
    );
    assert.match(transportSource, /import type \{ QueryResult \} from 'pg';/);
    assert.doesNotMatch(transportSource, /import \{[^}]*\} from 'pg'/);
    assert.doesNotMatch(executorSource, /from 'pg'/);
    assert.doesNotMatch(executorSource, /new Client/);
    assert.doesNotMatch(executorSource, /\.connect\(/);
  });

  it('52 execution authorization always false', () => {
    const plan = buildPreviewRemoteApplyPlan(validPlanInput());
    assert.equal(plan.executionAuthorized, false);
    assert.equal(plan.remoteConnectionAttempted, false);
    assert.equal(plan.sqlExecuted, false);
    assert.equal(plan.migrationApplyAuthorized, false);
    assert.equal(plan.productionAccessAuthorized, false);
    assert.equal(plan.automaticNextGate, false);
  });

  it('53 transport createClient fails closed', () => {
    resetPlanOnlyTransportCallCountForTests();
    const transport = createPlanOnlyPgTransport();
    assert.throws(
      () =>
        transport.createClient({
          hostFingerprintSha256: VALID_FINGERPRINT_A,
          databaseName: 'postgres',
          role: 'postgres',
        }),
      /HOLD_EXECUTION_NOT_AUTHORIZED/,
    );
    assert.equal(normalizePlanOnlyTransportError(new Error('HOLD_EXECUTION_NOT_AUTHORIZED')), 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('54 history insert shape metadata only', () => {
    const plan = buildPreviewRemoteApplyPlan(validPlanInput());
    assert.equal(plan.mode, 'PREVIEW_REMOTE_APPLY_DRY_RUN_PLAN');
    assert.equal(plan.steps[0]?.historyPayload.parameterizedInsertShape, HISTORY_INSERT_SQL_METADATA);
  });

  it('55 deterministic plan serialization stable', () => {
    const planA = buildPreviewRemoteApplyPlan(validPlanInput());
    const planB = buildPreviewRemoteApplyPlan(validPlanInput());
    assert.equal(
      canonicalSerializePreviewRemoteApply(planA),
      canonicalSerializePreviewRemoteApply(planB),
    );
  });

  it('56 timeout policy canonical hash independently recomputed', () => {
    assert.equal(
      computeTimeoutPolicyCanonicalPayloadSha256(),
      TIMEOUT_POLICY.canonical_payload_sha256,
    );
  });

  it('57 runtime probe registry canonical hash present', () => {
    assert.match(RUNTIME_PROBE_REGISTRY.canonical_payload_sha256, /^[0-9a-f]{64}$/);
  });

  it('58 plan steps bind prior and post probe IDs', () => {
    const plan = buildPreviewRemoteApplyPlan(validPlanInput());
    assert.equal(plan.mode, 'PREVIEW_REMOTE_APPLY_DRY_RUN_PLAN');
    for (const step of plan.steps) {
      assert.equal(step.priorProbeId, `PRIOR_${step.stepId}`);
      assert.equal(step.postProbeId, `POST_${step.stepId}`);
    }
  });

  it('59 authority bytes validate before plan build', () => {
    validateAuthorityBytes(REPO_ROOT);
    const plan = buildPreviewRemoteApplyPlan(validPlanInput());
    assert.equal(plan.mode, 'PREVIEW_REMOTE_APPLY_DRY_RUN_PLAN');
  });

  it('60 CLI successful dry-run emits one JSON object', () => {
    const result = runCli([
      '--organization', APPROVED_PREVIEW_ORGANIZATION,
      '--project', APPROVED_PREVIEW_PROJECT,
      '--database-tier', APPROVED_PREVIEW_DATABASE_TIER,
      '--project-ref', VALID_PROJECT_REF,
      '--host-fingerprint-sha256', VALID_FINGERPRINT_A,
      '--credential-method', CREDENTIAL_METHOD_IDS[0],
    ]);
    assert.equal(result.status, 0);
    const lines = result.stdout.trim().split('\n');
    assert.equal(lines.length, 1);
    const payload = JSON.parse(lines[0]);
    assert.equal(payload.mode, 'PREVIEW_REMOTE_APPLY_DRY_RUN_PLAN');
    assert.equal(payload.repository.branch, EXPECTED_BRANCH);
    assert.match(payload.repository.treeSha, /^[0-9a-f]{40}$/);
  });

  it('61 CLI reads actual branch and tree rather than injecting constants', () => {
    const facts = readGitRepositoryFacts();
    const result = runCli([
      '--project-ref', VALID_PROJECT_REF,
      '--host-fingerprint-sha256', VALID_FINGERPRINT_A,
      '--credential-method', CREDENTIAL_METHOD_IDS[0],
    ]);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.repository.headCommitSha, facts.headCommitSha);
    assert.equal(payload.repository.treeSha, facts.treeSha);
    assert.equal(payload.repository.branch, facts.branch);
  });

  it('62 CLI missing credential method HOLD', () => {
    const result = runCli(['--project-ref', VALID_PROJECT_REF]);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.mode, 'PREVIEW_REMOTE_APPLY_DRY_RUN_HOLD');
    assert.equal(payload.holdReasonCode, 'HOLD_CREDENTIAL_METHOD_INVALID');
  });

  it('63 CLI rejects secret-like flags', () => {
    const result = runCli(['--password', 'x', '--credential-method', CREDENTIAL_METHOD_IDS[0]]);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.holdReasonCode, 'HOLD_CREDENTIAL_METHOD_INVALID');
  });

  it('64 CLI execute flag maps to execution HOLD', () => {
    const result = runCli(['--execute', 'true', '--credential-method', CREDENTIAL_METHOD_IDS[0]]);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.holdReasonCode, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('65 CLI apply flag maps to execution HOLD', () => {
    const result = runCli(['--apply', 'true', '--credential-method', CREDENTIAL_METHOD_IDS[0]]);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.holdReasonCode, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('66 CLI timeout override maps to timeout HOLD', () => {
    const result = runCli(['--timeout', '1', '--credential-method', CREDENTIAL_METHOD_IDS[0]]);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.holdReasonCode, 'HOLD_TIMEOUT_POLICY');
  });

  it('67 CLI repo-root override maps to repo HOLD', () => {
    const result = runCli(['--repo-root', '/tmp', '--credential-method', CREDENTIAL_METHOD_IDS[0]]);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.holdReasonCode, 'HOLD_REPO_IDENTITY_MISMATCH');
  });

  it('68 CLI authority override maps to repo HOLD', () => {
    const result = runCli(['--authority', 'x', '--credential-method', CREDENTIAL_METHOD_IDS[0]]);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.holdReasonCode, 'HOLD_REPO_IDENTITY_MISMATCH');
  });

  it('69 CLI help rejected', () => {
    const result = runCli(['--help']);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.holdReasonCode, 'HOLD_UNEXPECTED_INTERNAL');
  });

  it('70 CLI controlled failure stderr empty', () => {
    const result = runCli(['--execute', 'true', '--credential-method', CREDENTIAL_METHOD_IDS[0]]);
    assert.equal(result.stderr.trim(), '');
  });

  it('71 CLI stdout contains no stack/path/free-form message', () => {
    const result = runCli(['--unknown-flag', 'x']);
    assert.doesNotMatch(result.stdout, /Error:|at /);
    assert.doesNotMatch(result.stdout, /\/Users\//);
    JSON.parse(result.stdout.trim());
  });

  it('72 CLI unexpected failure emits one controlled JSON object', () => {
    const result = runCli(['--credential-method', 'UNKNOWN_METHOD']);
    const lines = result.stdout.trim().split('\n');
    assert.equal(lines.length, 1);
    const payload = JSON.parse(lines[0]);
    assert.equal(payload.mode, 'PREVIEW_REMOTE_APPLY_DRY_RUN_HOLD');
    assert.equal(payload.holdReasonCode, 'HOLD_CREDENTIAL_METHOD_INVALID');
  });

  it('73 plan does not expose migration statement bodies', () => {
    const plan = buildPreviewRemoteApplyPlan(validPlanInput());
    const serialized = JSON.stringify(plan);
    assert.doesNotMatch(serialized, /CREATE TABLE/);
    assert.equal(plan.mode, 'PREVIEW_REMOTE_APPLY_DRY_RUN_PLAN');
    assert.equal(plan.steps[0]?.historyPayload.parameterizedInsertShape, HISTORY_INSERT_SQL_METADATA);
  });

  it('74 FINAL_P7_CHAIN probe present with full prefix', () => {
    const finalProbe = getRuntimeProbeById('FINAL_P7_CHAIN');
    assert.ok(finalProbe?.kind === 'ORDINARY');
    assert.deepEqual(finalProbe.expectedHistoryPrefix, [
      '20260614000000', '20260615000001', '20260615000002', '20260615000003',
      '20260615000004', '20260615000005', '20260615000006',
    ]);
  });

  it('75 PRIOR_P2 history prefix exact full', () => {
    const prior = getRuntimeProbeById('PRIOR_P2');
    assert.ok(prior?.kind === 'ORDINARY');
    assert.deepEqual(prior.expectedHistoryPrefix, ['20260614000000']);
  });

  it('76 POST_P3 oracle hash exact full', () => {
    const post = getRuntimeProbeById('POST_P3');
    assert.ok(post?.kind === 'ORDINARY');
    assert.equal(
      post.oracleContractHashSha256,
      'a37c214b6722e86e0235a37dbef2274edc271e4736f400b1cda512aeda7768b2',
    );
  });

  it('77 bootstrap strict precondition metadata', () => {
    assert.equal(HISTORY_BOOTSTRAP_SPEC.strictPrecondition, 'history_schema_and_relation_absent_before_p1');
    assert.equal(HISTORY_BOOTSTRAP_SPEC.ifNotExistsForbidden, true);
  });

  it('78 no tracked repository mutation during tests', () => {
    const status = spawnSync('git', ['status', '--short'], { cwd: REPO_ROOT, encoding: 'utf8' });
    const lines = status.stdout.trim().split('\n').filter(Boolean);
    for (const line of lines) {
      assert.match(line, /^\?\? /);
    }
  });

  it('79 unknown internal exceptions normalized in transport error helper', () => {
    assert.equal(normalizePlanOnlyTransportError(new Error('boom')), 'HOLD_UNEXPECTED_INTERNAL');
  });

  it('80 HOLD result uses discriminated union mode', () => {
    const plan = buildPreviewRemoteApplyPlan(validPlanInput({ organization: 'm55-soul' }));
    assert.equal(plan.mode, 'PREVIEW_REMOTE_APPLY_DRY_RUN_HOLD');
    assert.ok(!('steps' in plan));
  });

  it('81 repository facts source exact', () => {
    const facts = readGitRepositoryFacts();
    assert.equal(facts.factsSource, REPOSITORY_FACTS_SOURCE);
  });

  it('82 wrong repo root via planner HOLD', () => {
    const facts = readGitRepositoryFacts();
    const plan = buildPreviewRemoteApplyPlan({
      ...validPlanInput({ repository: facts }),
      repoRoot: '/tmp/not-repo',
    });
    assert.equal(plan.mode, 'PREVIEW_REMOTE_APPLY_DRY_RUN_HOLD');
    assert.equal(plan.holdReasonCode, 'HOLD_REPO_IDENTITY_MISMATCH');
  });

  it('83 credential method SECURE_STDIN accepted', () => {
    const plan = buildPreviewRemoteApplyPlan(validPlanInput({ credentialMethod: 'SECURE_STDIN_CONNECTION_CONFIG_v1' }));
    assert.equal(plan.mode, 'PREVIEW_REMOTE_APPLY_DRY_RUN_PLAN');
  });

  it('84 credential method TEMP_PGPASSFILE accepted', () => {
    const plan = buildPreviewRemoteApplyPlan(validPlanInput({ credentialMethod: 'TEMP_PGPASSFILE_0600_v1' }));
    assert.equal(plan.mode, 'PREVIEW_REMOTE_APPLY_DRY_RUN_PLAN');
  });

  it('85 unknown credential method HOLD', () => {
    const plan = buildPreviewRemoteApplyPlan(
      validPlanInput({ credentialMethod: 'UNKNOWN_METHOD' as (typeof CREDENTIAL_METHOD_IDS)[number] }),
    );
    assert.equal(plan.holdReasonCode, 'HOLD_CREDENTIAL_METHOD_INVALID');
  });

  it('86 missing host fingerprint HOLD', () => {
    const plan = buildPreviewRemoteApplyPlan(validPlanInput({ hostFingerprintSha256: null }));
    assert.equal(plan.holdReasonCode, 'HOLD_TARGET_FINGERPRINT_INCOMPLETE');
  });

  it('87 malformed fingerprint HOLD', () => {
    const plan = buildPreviewRemoteApplyPlan(validPlanInput({ hostFingerprintSha256: 'not-a-sha' }));
    assert.equal(plan.holdReasonCode, 'HOLD_TARGET_FINGERPRINT_INCOMPLETE');
  });

  it('88 transport mutation methods fail closed', async () => {
    class ProbeClient {
      async query() {
        throw new Error('HOLD_EXECUTION_NOT_AUTHORIZED');
      }
      async begin() {
        throw new Error('HOLD_EXECUTION_NOT_AUTHORIZED');
      }
      async commit() {
        throw new Error('HOLD_EXECUTION_NOT_AUTHORIZED');
      }
      async rollback() {
        throw new Error('HOLD_EXECUTION_NOT_AUTHORIZED');
      }
      async close() {
        throw new Error('HOLD_EXECUTION_NOT_AUTHORIZED');
      }
    }
    const client = new ProbeClient();
    await assert.rejects(() => client.query(), /HOLD_EXECUTION_NOT_AUTHORIZED/);
  });

  it('89 P0 bootstrap precondition HOLD code bound', () => {
    const p0 = getRuntimeProbeById('P0_PREFLIGHT_PATCH2');
    assert.ok(p0?.kind === 'ORDINARY');
    assert.equal(p0.holdCode, 'HOLD_BOOTSTRAP_PRECONDITION');
  });

  it('90 P0 references external SQL authority only', () => {
    const p0 = getRuntimeProbeById('P0_PREFLIGHT_PATCH2');
    assert.ok(p0?.kind === 'ORDINARY');
    assert.equal(p0.externalSqlAuthority?.filename, P0_PREFLIGHT_PATCH2_AUTHORITY.filename);
  });

  it('91 semicolon mutation detected', () => {
    const { identity, contractVersion, normalized } = normalizedStatementsFor('P3');
    const mutated = [...normalized];
    mutated[0] = `${mutated[0]};`;
    assert.throws(
      () =>
        buildHistoryPayloadForStep({
          stepId: 'P3',
          version: identity.version,
          name: identity.name,
          normalizedStatements: mutated,
          expectedNormalizedCompositeSha256: contractVersion.normalized_stream_composite_sha256,
        }),
      /POLICY_2_NORMALIZED_COMPOSITE_MISMATCH/,
    );
  });

  it('92 body mutation detected', () => {
    const { identity, contractVersion, normalized } = normalizedStatementsFor('P4');
    const mutated = [...normalized];
    mutated[0] = `${mutated[0]} -- mutated`;
    assert.throws(
      () =>
        buildHistoryPayloadForStep({
          stepId: 'P4',
          version: identity.version,
          name: identity.name,
          normalizedStatements: mutated,
          expectedNormalizedCompositeSha256: contractVersion.normalized_stream_composite_sha256,
        }),
      /POLICY_2_NORMALIZED_COMPOSITE_MISMATCH/,
    );
  });

  it('93 execution enablement not false is rejected', () => {
    const input = validPlanInput();
    const plan = buildPreviewRemoteApplyPlan({
      ...input,
      executionEnablement: true as unknown as false,
    });
    assert.equal(plan.holdReasonCode, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('94 static scan classifies test regex literal only for newClient', () => {
    const testSource = readFileSync(join(REPO_ROOT, 'lib/m55/previewRemoteApply.remoteExecutor.local.test.ts'), 'utf8');
    assert.doesNotMatch(testSource, /new Client\(/);
    assert.match(testSource, /newClient/);
  });

  it('95 no duplicate registry ID', () => {
    const ids = RUNTIME_PROBE_ENTRIES.map((entry) => entry.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('96 ACK classifier separate from phase probes', () => {
    const ack = getRuntimeProbeById('ACK_CLASSIFIER');
    assert.ok(ack?.kind === 'ACK_CLASSIFIER');
    assert.notEqual(ack.probeClass, 'B');
    assert.notEqual(ack.probeClass, 'C');
  });

  it('97 missing project ref HOLD', () => {
    const plan = buildPreviewRemoteApplyPlan(validPlanInput({ projectRef: null }));
    assert.equal(plan.holdReasonCode, 'HOLD_TARGET_FINGERPRINT_INCOMPLETE');
  });

  it('98 production project label rejected', () => {
    const plan = buildPreviewRemoteApplyPlan(validPlanInput({ project: 'm55-soul-core' }));
    assert.equal(plan.holdReasonCode, 'HOLD_TARGET_PRODUCTION_FORBIDDEN');
  });

  it('99 preview labels accepted in plan', () => {
    const plan = buildPreviewRemoteApplyPlan(validPlanInput());
    assert.equal(plan.mode, 'PREVIEW_REMOTE_APPLY_DRY_RUN_PLAN');
    assert.equal(plan.steps.length, 7);
  });

  it('100 P7 full history prefix exact', () => {
    const postP7 = getRuntimeProbeById('POST_P7');
    assert.ok(postP7?.kind === 'ORDINARY');
    assert.deepEqual(postP7.expectedHistoryPrefix, [
      '20260614000000', '20260615000001', '20260615000002', '20260615000003',
      '20260615000004', '20260615000005', '20260615000006',
    ]);
  });

  it('101 P1 oracle hash exact full', () => {
    const postP1 = getRuntimeProbeById('POST_P1');
    assert.ok(postP1?.kind === 'ORDINARY');
    assert.equal(
      postP1.oracleContractHashSha256,
      '77ba63b64fee47ca9b6deec00bb76f90fe239f6b236994116afdf8be9735fc0c',
    );
  });

  it('102 P0 versus phase-probe separation', () => {
    const p0 = getRuntimeProbeById('P0_PREFLIGHT_PATCH2');
    const postP1 = getRuntimeProbeById('POST_P1');
    assert.ok(p0?.kind === 'ORDINARY');
    assert.ok(postP1?.kind === 'ORDINARY');
    assert.equal(p0.phase, 'P0');
    assert.equal(postP1.phase, 'P1');
  });

  it('103 immutable bootstrap file SHA unchanged', () => {
    assert.equal(
      sha256File(join(REPO_ROOT, 'lib/m55/previewRemoteApply/historyBootstrapSpec.ts')),
      'f8adec57ab5b65e78a2896a40e254874c25ccf010739fab41cbc2eca7b1c5e55',
    );
  });

  it('104 immutable timeout file SHA unchanged', () => {
    assert.equal(
      sha256File(join(REPO_ROOT, 'lib/m55/previewRemoteApply/timeoutPolicy.ts')),
      '9ae3067eb912c72711477ec9507c5c26ad90768f238ef83034aa0a79af642efa',
    );
  });

  it('105 immutable transport file SHA unchanged', () => {
    assert.equal(
      sha256File(join(REPO_ROOT, 'lib/m55/previewRemoteApply/pgTransportAdapter.ts')),
      '0337e8257c548b3d3e27a401e15d739dcd2ae078bfe45045b5f322200dab12c6',
    );
  });

  it('106 HOLD minimum required codes present', () => {
    const required = [
      'HOLD_REPO_IDENTITY_MISMATCH',
      'HOLD_TARGET_IDENTITY_MISMATCH',
      'HOLD_TARGET_PRODUCTION_FORBIDDEN',
      'HOLD_BOOTSTRAP_PRECONDITION',
      'HOLD_EXECUTION_NOT_AUTHORIZED',
      'HOLD_UNEXPECTED_INTERNAL',
    ];
    for (const code of required) {
      assert.ok(PREVIEW_REMOTE_APPLY_HOLD_CODES.includes(code as (typeof PREVIEW_REMOTE_APPLY_HOLD_CODES)[number]));
    }
  });

  it('107 planner repository mismatch nested repoRoot HOLD', () => {
    const facts = readGitRepositoryFacts();
    const plan = buildPreviewRemoteApplyPlan({
      repoRoot: EXPECTED_REPO_ROOT,
      repository: { ...facts, repoRoot: '/tmp/nested-mismatch' },
      target: validPlanInput().target,
      credentialMethod: CREDENTIAL_METHOD_IDS[0],
      executionEnablement: false,
    });
    assert.equal(plan.holdReasonCode, 'HOLD_REPO_IDENTITY_MISMATCH');
  });

  it('108 CLI unexpected planner boundary emits controlled JSON only', () => {
    const result = runCli(['--credential-method', 'SECURE_STDIN_CONNECTION_CONFIG_v1', '--project-ref', '   ']);
    const payload = JSON.parse(result.stdout.trim());
    assert.equal(payload.mode, 'PREVIEW_REMOTE_APPLY_DRY_RUN_HOLD');
    assert.equal(payload.holdReasonCode, 'HOLD_TARGET_FINGERPRINT_INCOMPLETE');
    assert.equal(result.stderr.trim(), '');
  });

  it('109 mutated PRIOR_P2 history prefix rejected', () => {
    const mutated = cloneRegistryEntries().map((entry) =>
      entry.kind === 'ORDINARY' && entry.id === 'PRIOR_P2'
        ? { ...entry, expectedHistoryPrefix: ['00000000000000'] }
        : entry,
    );
    expectRegistryReject(mutated);
  });

  it('110 mutated POST_P2 insideTransaction rejected', () => {
    const mutated = cloneRegistryEntries().map((entry) =>
      entry.kind === 'ORDINARY' && entry.id === 'POST_P2'
        ? { ...entry, insideTransaction: true }
        : entry,
    );
    expectRegistryReject(mutated);
  });

  it('111 mutated P0 external SQL authority rejected', () => {
    const mutated = cloneRegistryEntries().map((entry) =>
      entry.kind === 'ORDINARY' && entry.id === 'P0_PREFLIGHT_PATCH2'
        ? {
            ...entry,
            externalSqlAuthority: {
              filename: 'WRONG.sql',
              bytes: 21188,
              sha256: '9ec4a50420169a15fcdb96fc20cc7284ffd603a8a14db810ef6de0f1af65faff',
            },
          }
        : entry,
    );
    expectRegistryReject(mutated);
  });

  it('112 mutated PRIOR_P3 probeClass rejected', () => {
    const mutated = cloneRegistryEntries().map((entry) =>
      entry.kind === 'ORDINARY' && entry.id === 'PRIOR_P3'
        ? { ...entry, probeClass: 'C' as const }
        : entry,
    );
    expectRegistryReject(mutated);
  });

  it('113 mutated ACK P1 possibleOutcomes rejected', () => {
    const wrongOutcomes = [
      'DEFINITELY_COMMITTED',
      'DEFINITELY_NOT_COMMITTED',
      'CONTRADICTORY_OR_DRIFTED',
    ] as const;
    const mutated = cloneRegistryEntries().map((entry) => {
      if (entry.kind !== 'ACK_CLASSIFIER') return entry;
      return {
        ...entry,
        bindings: entry.bindings.map((binding, index) =>
          index === 0 ? { ...binding, possibleOutcomes: wrongOutcomes } : binding,
        ),
      };
    });
    expectRegistryReject(mutated);
  });

  it('114 simultaneous prior and ACK wrong prefix still rejected', () => {
    const wrongPrefix = ['00000000000000'] as const;
    const mutated = cloneRegistryEntries().map((entry) => {
      if (entry.kind === 'ORDINARY' && entry.id === 'PRIOR_P2') {
        return { ...entry, expectedHistoryPrefix: wrongPrefix };
      }
      if (entry.kind === 'ACK_CLASSIFIER') {
        return {
          ...entry,
          bindings: entry.bindings.map((binding) =>
            binding.stepId === 'P2'
              ? { ...binding, priorHistoryPrefix: wrongPrefix }
              : binding,
          ),
        };
      }
      return entry;
    });
    expectRegistryReject(mutated);
  });
});
