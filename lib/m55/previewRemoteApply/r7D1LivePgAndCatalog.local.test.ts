import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  FakeExecutionPgClient,
  type ExecutionPgClientConfig,
} from './remoteExecutionPgTransport.ts';
import {
  SESSION_POOLER_HOST,
  SESSION_POOLER_TLS_SERVER_NAME,
  TLS_TRUST_PROFILE,
  expectedConnectionUserForProjectRef,
} from './remoteConnectionAuthority.ts';
import {
  R7_D1_D5_REMOTE_EXECUTION_AUTHORIZED,
  R7_LIVE_BRIDGE_CLI_LIVE_TRANSPORT_FORBIDDEN,
  R7_D1_LOCAL_CODE_ONLY_PUBLIC_EXECUTOR_FORBIDDEN,
  extractD1StaticCatalogExpectation,
  extractD1SemanticCatalogExpectation,
  verifyD1PostCommitCatalogObservation,
  verifyD1FullCatalogSemanticParity,
  verifyD1TrustedCollectedCatalogParity,
  listMandatoryD1CatalogEvidenceCategories,
  verifyD1PriorCatalogObservation,
  verifyD1PinnedSourceAndNormalizedComposite,
  assessD1NameInventoryOnlyObservation,
  wrapExecutionPgClientAsR7LiveBridgeSession,
  assertR7D1RealPgNetworkAccessAllowed,
  createR7D1InjectedExecutionPgTransport,
  createR7LiveBridgeSessionFactoryFromPgTransport,
  R7_D1_REAL_PG_NETWORK_FORBIDDEN_IN_LOCAL_CODE_GATE,
  R7_D1_PINNED_SOURCE_SHA256,
  R7_D1_TRUSTED_CATALOG_VERIFICATION_UNAVAILABLE_IN_LOCAL_CODE_GATE,
  R7_D1_POST_PATCH_CANDIDATE_DIGEST_NOT_EXTERNALLY_FROZEN,
  observeR7D1LiveImplementationWorkspaceSixFileDigests,
  diffWorkspaceObservationAgainstIndependentlyReviewedManifest,
  validateR7D1LiveImplementationCandidateBinding,
  deriveDeterministicSixFileManifestIdentitySha256,
  R7_D1_INDEPENDENTLY_REVIEWED_SOURCE_COMMIT_SHA,
  buildHistoricalExternalReviewManifestSnapshot206ee0d7,
  R7_D1_LIVE_IMPLEMENTATION_CANDIDATE_BUNDLE_ID,
  executeR7DeltaStepLiveBridge,
  evaluateR7D1CodeOnlyInternalD1LifecyclePreflight,
  normalizePgQueryResult,
  normalizePgDdlEmptyResult,
  compareR7LiveBridgeSessionUnderlyingTransport,
  compareR7LiveBridgePhysicalBackendProof,
  R7_D1_TRUSTED_COLLECTOR_PROVENANCE,
  type R7D1CatalogObservationQueryKey,
} from './r7D1D5LiveBridge.ts';
import {
  R7_PREVIEW_TARGET_PROJECT_REF,
  R7_PR249_FROZEN_BRANCH,
  R7_PR249_FROZEN_REPO_ROOT,
} from './r7D1D5OfflinePlan.ts';
import {
  buildUnitTestAlignedExactCatalogQueryResults,
  R7_D1_EXACT_CATALOG_OBSERVATION_QUERY_PLAN,
  resolveBoundPreCatalogProofCategoryOutcomes,
  type R7D1ExactCatalogQueryKey,
} from './r7D1ExactCatalogContract.ts';
import {
  collectD1CatalogObservationFromReadonlySession,
  enterR7D1LocalDisposableCatalogProofScope,
  type R7D1CatalogObservationQuerySession,
} from './r7D1TrustedCatalogVerifier.ts';
import type { R7D1LiveImplementationCandidateBinding as ManifestBinding } from './r7D1LiveCandidateBinding.ts';
import {
  parseSecureStdinConnectionConfigWireV1,
  redactSecureStdinConnectionConfigForEvidence,
} from '../../../scripts/m55/runR7PreviewD1D5LiveBridge.ts';

const REPO_ROOT = R7_PR249_FROZEN_REPO_ROOT;
const HEAD_SHA = R7_D1_INDEPENDENTLY_REVIEWED_SOURCE_COMMIT_SHA;
const EXTERNAL_ATTESTATION_SHA = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function createFakeCatalogObservationQuerySession(
  resultsByKey: Partial<Record<R7D1ExactCatalogQueryKey, readonly Record<string, unknown>[]>>,
): R7D1CatalogObservationQuerySession {
  return {
    async query(sql: string) {
      for (const entry of R7_D1_EXACT_CATALOG_OBSERVATION_QUERY_PLAN) {
        if (sql.trim() === entry.sql.trim()) {
          if (!Object.prototype.hasOwnProperty.call(resultsByKey, entry.key)) {
            throw new Error('FAKE_CATALOG_SESSION_MISSING_OBSERVATION_KEY');
          }
          const rows = resultsByKey[entry.key] ?? [];
          return { rows, rowCount: rows.length };
        }
      }
      throw new Error('FAKE_CATALOG_SESSION_UNEXPECTED_SQL');
    },
  };
}

async function collectTrustedFromMockQuerySession(repoRoot: string) {
  const scope = enterR7D1LocalDisposableCatalogProofScope();
  try {
    return await collectD1CatalogObservationFromReadonlySession(
      createFakeCatalogObservationQuerySession(
        buildUnitTestAlignedExactCatalogQueryResults(repoRoot, 'POST_READONLY'),
      ),
      repoRoot,
      'POST_READONLY',
    );
  } finally {
    scope.exit();
  }
}

const TEST_PG_CONFIG: ExecutionPgClientConfig = {
  host: SESSION_POOLER_HOST,
  port: 5432,
  database: 'postgres',
  user: expectedConnectionUserForProjectRef(R7_PREVIEW_TARGET_PROJECT_REF),
  password: 'redacted-test-only',
  sslmode: 'require',
  tlsCaPem: 'TEST_CA_PEM',
  tlsTrustProfile: TLS_TRUST_PROFILE,
  tlsServerName: SESSION_POOLER_TLS_SERVER_NAME,
  connectionTimeoutMillis: 1000,
};

describe('r7D1 live PG adapter and trusted catalog (local code-only)', () => {
  it('documents fail-closed global authorization flags', () => {
    assert.equal(R7_D1_D5_REMOTE_EXECUTION_AUTHORIZED, false);
    assert.equal(R7_LIVE_BRIDGE_CLI_LIVE_TRANSPORT_FORBIDDEN, true);
    assert.equal(R7_D1_REAL_PG_NETWORK_FORBIDDEN_IN_LOCAL_CODE_GATE, true);
    assert.equal(R7_D1_TRUSTED_CATALOG_VERIFICATION_UNAVAILABLE_IN_LOCAL_CODE_GATE, true);
    assert.equal(R7_D1_LOCAL_CODE_ONLY_PUBLIC_EXECUTOR_FORBIDDEN, true);
    assert.equal(R7_D1_POST_PATCH_CANDIDATE_DIGEST_NOT_EXTERNALLY_FROZEN, true);
  });

  it('forbids ambient pg network with no caller bypass', () => {
    const denied = assertR7D1RealPgNetworkAccessAllowed();
    assert.equal(denied.ok, false);
  });

  it('rejects injected transport factory in local gate (B2)', () => {
    assert.throws(() => createR7D1InjectedExecutionPgTransport({}));
    const factory = createR7LiveBridgeSessionFactoryFromPgTransport(
      { createClient: () => new FakeExecutionPgClient(TEST_PG_CONFIG) },
      TEST_PG_CONFIG,
    );
    assert.equal(factory.ok, false);
  });

  it('wrapExecutionPgClientAsR7LiveBridgeSession connect is forbidden (B2)', async () => {
    const client = new FakeExecutionPgClient(TEST_PG_CONFIG);
    const session = wrapExecutionPgClientAsR7LiveBridgeSession(client);
    await assert.rejects(() => session.connect());
    assert.equal(client.calls.includes('connect'), false);
  });

  it('strict wire normalization rejects exotic cell types (R04/R07)', () => {
    assert.throws(() =>
      normalizePgQueryResult({
        rows: [{ version: new Date() }],
        rowCount: 1,
      }),
    );
  });

  it('normalizes DDL empty rowCount null to zero (H2)', () => {
    const ddl = normalizePgDdlEmptyResult({ rows: [], rowCount: null });
    assert.equal(ddl.rowCount, 0);
    assert.equal(ddl.rows.length, 0);
  });

  it('wrapped pg sessions cannot prove physical backend distinctness (EXR-03)', () => {
    const client = new FakeExecutionPgClient(TEST_PG_CONFIG);
    const a = wrapExecutionPgClientAsR7LiveBridgeSession(client);
    const b = wrapExecutionPgClientAsR7LiveBridgeSession(client);
    assert.equal(compareR7LiveBridgeSessionUnderlyingTransport(a, b), 'unknown');
    assert.equal(compareR7LiveBridgePhysicalBackendProof(a, b), 'unknown');
    const c = {
      async connect() {},
      async query() {
        return { rows: [], rowCount: 0 };
      },
      async begin() {},
      async beginReadOnly() {},
      async commit() {
        return { responseClass: 'DEFINITIVE_COMMIT_ACK' as const };
      },
      async rollback() {
        return { acknowledged: true };
      },
      async close() {},
    };
    assert.equal(compareR7LiveBridgeSessionUnderlyingTransport(a, c), 'unknown');
  });

  it('verifies pinned D1 source SHA offline', () => {
    assert.equal(verifyD1PinnedSourceAndNormalizedComposite(REPO_ROOT).ok, true);
    assert.equal(R7_D1_PINNED_SOURCE_SHA256.length, 64);
  });

  it('name inventory cannot imply verified catalog (R03)', () => {
    const expectation = extractD1StaticCatalogExpectation(REPO_ROOT);
    assert.equal(assessD1NameInventoryOnlyObservation(expectation).ok, false);
    const nameObservation = {
      anchorTableCount: expectation.tables.length,
      tablesPresent: [...expectation.tables],
      functionsPresent: [...expectation.functions],
      triggersPresent: [...expectation.triggers],
      explicitIndexesPresent: [...expectation.explicitIndexes],
      rlsEnabledTablesPresent: [...expectation.rlsEnabledTables],
    };
    assert.equal(verifyD1PostCommitCatalogObservation(REPO_ROOT, nameObservation).ok, false);
    const forged = verifyD1FullCatalogSemanticParity(expectation, nameObservation, {
      supabaseMigrationVersion: expectation.migrationVersion,
      categoryStatus: Object.fromEntries(
        listMandatoryD1CatalogEvidenceCategories().map((c) => [c, 'pass' as const]),
      ),
    });
    assert.equal(forged.ok, false);
    assert.equal(
      verifyD1PriorCatalogObservation(expectation, {
        anchorTableCount: 0,
        tablesPresent: [],
        functionsPresent: [],
        triggersPresent: [],
        explicitIndexesPresent: [],
        rlsEnabledTablesPresent: [],
      }).ok,
      false,
    );
  });

  it('manifest requires external attestation and rejects forged identity (EXR-05)', () => {
    const observed = observeR7D1LiveImplementationWorkspaceSixFileDigests(REPO_ROOT, HEAD_SHA);
    assert.equal(observed.ok, true);
    if (!observed.ok) return;
    const derived = deriveDeterministicSixFileManifestIdentitySha256(observed.observation.fileSha256ByRelativePath);
    assert.ok(derived);
    const alignedWithoutAttestation: ManifestBinding = {
      bundleId: R7_D1_LIVE_IMPLEMENTATION_CANDIDATE_BUNDLE_ID,
      declaredCandidateIdentitySha256: derived!,
      repositoryRoot: R7_PR249_FROZEN_REPO_ROOT,
      branch: R7_PR249_FROZEN_BRANCH,
      fileSha256ByRelativePath: { ...observed.observation.fileSha256ByRelativePath },
    };
    assert.equal(
      diffWorkspaceObservationAgainstIndependentlyReviewedManifest(observed.observation, alignedWithoutAttestation).ok,
      false,
    );
    const aligned: ManifestBinding = {
      ...alignedWithoutAttestation,
      externalIndependentReviewAttestationSha256: EXTERNAL_ATTESTATION_SHA,
    };
    assert.equal(
      diffWorkspaceObservationAgainstIndependentlyReviewedManifest(observed.observation, aligned).ok,
      false,
    );
    const bindingHold = validateR7D1LiveImplementationCandidateBinding(
      REPO_ROOT,
      R7_PR249_FROZEN_BRANCH,
      HEAD_SHA,
      aligned,
    );
    assert.equal(bindingHold.ok, false);
    if (!bindingHold.ok) {
      assert.equal(bindingHold.holdReasonCode, 'HOLD_AUTHORIZATION_GATE');
    }
  });

  it('historical external review snapshot diverges from post-patch workspace (EXR-05)', () => {
    const observed = observeR7D1LiveImplementationWorkspaceSixFileDigests(REPO_ROOT, HEAD_SHA);
    assert.equal(observed.ok, true);
    if (!observed.ok) return;
    const reviewed = buildHistoricalExternalReviewManifestSnapshot206ee0d7();
    const diff = diffWorkspaceObservationAgainstIndependentlyReviewedManifest(observed.observation, reviewed);
    assert.equal(diff.ok, false);
  });

  it('disposable mock collector does not register immutable PRE proof', async () => {
    const scope = enterR7D1LocalDisposableCatalogProofScope();
    try {
      const collected = await collectD1CatalogObservationFromReadonlySession(
        createFakeCatalogObservationQuerySession(
          buildUnitTestAlignedExactCatalogQueryResults(REPO_ROOT, 'PRE_READONLY'),
        ),
        REPO_ROOT,
        'PRE_READONLY',
      );
      assert.equal(collected.ok, true);
      if (!collected.ok) return;
      assert.equal(collected.trusted.observationProvenanceTier, 'local_code_only_mock');
      assert.equal(
        resolveBoundPreCatalogProofCategoryOutcomes(collected.trusted.observationDigestSha256),
        null,
      );
    } finally {
      scope.exit();
    }
  });

  it('trusted collector rejects incomplete query payloads (EXR-01)', async () => {
    const scope = enterR7D1LocalDisposableCatalogProofScope();
    try {
      const partial = await collectD1CatalogObservationFromReadonlySession(
        createFakeCatalogObservationQuerySession({
          TABLES: [{ name: 'm55_r5_compliance_contents' }],
        }),
        REPO_ROOT,
        'POST_READONLY',
      );
      assert.equal(partial.ok, false);
    } finally {
      scope.exit();
    }
  });

  it('trusted collector decode cannot reach VERIFIED while runtime categories remain unobserved (EXR-02)', async () => {
    const built = await collectTrustedFromMockQuerySession(REPO_ROOT);
    assert.equal(built.ok, true);
    if (!built.ok) return;
    const verified = verifyD1TrustedCollectedCatalogParity(REPO_ROOT, built.trusted);
    assert.equal(verified.ok, false);
    if (!verified.ok) {
      assert.ok(verified.pendingCategories && verified.pendingCategories.length > 0);
    }
  });

  it('rejects caller-forged trusted catalog observation even with all-pass category maps (H01)', async () => {
    const built = await collectTrustedFromMockQuerySession(REPO_ROOT);
    assert.equal(built.ok, true);
    if (!built.ok) return;
    const forged = {
      provenance: R7_D1_TRUSTED_COLLECTOR_PROVENANCE,
      observationProvenanceTier: 'readonly_pg_verified' as const,
      observationDigestSha256: built.trusted.observationDigestSha256,
      nameObservation: built.trusted.nameObservation,
      supabaseMigrationVersion: built.trusted.supabaseMigrationVersion,
      categoryOutcomes: Object.fromEntries(
        listMandatoryD1CatalogEvidenceCategories().map((c) => [c, 'pass' as const]),
      ),
    };
    assert.equal(verifyD1TrustedCollectedCatalogParity(REPO_ROOT, forged).ok, false);
  });

  it('documents code-only internal D1 lifecycle preflight without DB access', () => {
    const preflight = evaluateR7D1CodeOnlyInternalD1LifecyclePreflight(REPO_ROOT);
    assert.equal(preflight.ok, false);
    assert.equal(preflight.pinnedStatementCount, 63);
    assert.equal(preflight.allExecutionGatesClosed, true);
    assert.ok(preflight.stagesValidated.includes('POST_COMMIT_READONLY_VERIFICATION'));
  });

  it('secure stdin parser rejects off-profile Preview target (EXR-06)', () => {
    const hostile = parseSecureStdinConnectionConfigWireV1({
      wireVersion: 'SECURE_STDIN_CONNECTION_CONFIG_v1',
      host: 'evil.example',
      port: 5432,
      database: 'postgres',
      user: 'u',
      password: 'secret',
      sslmode: 'require',
      tlsTrustProfile: TLS_TRUST_PROFILE,
      tlsServerName: SESSION_POOLER_TLS_SERVER_NAME,
    });
    assert.equal(hostile.ok, false);
    const pinned = parseSecureStdinConnectionConfigWireV1({
      wireVersion: 'SECURE_STDIN_CONNECTION_CONFIG_v1',
      host: SESSION_POOLER_HOST,
      port: 5432,
      database: 'postgres',
      user: expectedConnectionUserForProjectRef(R7_PREVIEW_TARGET_PROJECT_REF),
      password: 'secret',
      sslmode: 'require',
      tlsTrustProfile: TLS_TRUST_PROFILE,
      tlsServerName: SESSION_POOLER_TLS_SERVER_NAME,
    });
    assert.equal(pinned.ok, true);
    if (pinned.ok) {
      const redacted = redactSecureStdinConnectionConfigForEvidence(pinned.config);
      assert.equal(redacted.password, '[REDACTED]');
    }
  });

  it('public executeR7DeltaStepLiveBridge holds before connect (B1/B2)', async () => {
    const client = new FakeExecutionPgClient(TEST_PG_CONFIG);
    const evidence = await executeR7DeltaStepLiveBridge({
      repoRoot: REPO_ROOT,
      branch: R7_PR249_FROZEN_BRANCH,
      headCommitSha: HEAD_SHA,
      stepId: 'D1',
      reviewedCandidateBinding: null,
      humanAuthorization: null,
      offlineManifestExecutionAuthorized: true,
      remoteExecutionAuthorized: true,
      targetObserved: {
        organizationSlug: 'preview-org',
        projectName: 'preview-project',
        projectRef: R7_PREVIEW_TARGET_PROJECT_REF,
        databaseName: 'postgres',
        host: SESSION_POOLER_HOST,
        hostFingerprintSha256: 'abc',
        port: 5432,
        sslmode: 'require',
        connectionUser: 'u',
        credentialMethod: 'SECURE_STDIN_CONNECTION_CONFIG_v1',
        tlsTrustProfile: TLS_TRUST_PROFILE,
      },
    });
    assert.equal(client.calls.includes('connect'), false);
    assert.equal(evidence.holdReasonCode, 'HOLD_LIVE_NETWORK_CONNECT_FORBIDDEN');
  });
});
