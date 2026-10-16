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
  evaluateR7D1ProductionLiveBridgeEligibility,
  extractD1StaticCatalogExpectation,
  verifyD1PostCommitCatalogObservation,
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
  observeR7D1LiveImplementationWorkspaceSixFileDigests,
  diffWorkspaceObservationAgainstIndependentlyReviewedManifest,
  validateR7D1LiveImplementationCandidateBinding,
  deriveDeterministicSixFileManifestIdentitySha256,
  R7_D1_FEATURE_BASE_COMMIT_SHA,
  R7_D1_LIVE_IMPLEMENTATION_CANDIDATE_BUNDLE_ID,
  executeR7DeltaStepLiveBridge,
  normalizePgQueryResult,
  normalizePgDdlEmptyResult,
  compareR7LiveBridgeSessionUnderlyingTransport,
} from './r7D1D5LiveBridge.ts';
import {
  R7_PREVIEW_TARGET_PROJECT_REF,
  R7_PR249_FROZEN_BRANCH,
  R7_PR249_FROZEN_REPO_ROOT,
} from './r7D1D5OfflinePlan.ts';
import type { R7D1LiveImplementationCandidateBinding as ManifestBinding } from './r7D1LiveCandidateBinding.ts';

const REPO_ROOT = R7_PR249_FROZEN_REPO_ROOT;
const HEAD_SHA = R7_D1_FEATURE_BASE_COMMIT_SHA;

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

  it('tri-state underlying transport relation (M2)', () => {
    const client = new FakeExecutionPgClient(TEST_PG_CONFIG);
    const a = wrapExecutionPgClientAsR7LiveBridgeSession(client);
    const b = wrapExecutionPgClientAsR7LiveBridgeSession(client);
    assert.equal(compareR7LiveBridgeSessionUnderlyingTransport(a, b), 'known_same');
    const c = { async connect() {}, async query() { return { rows: [], rowCount: 0 }; }, async begin() {}, async beginReadOnly() {}, async commit() { return { responseClass: 'DEFINITIVE_COMMIT_ACK' as const }; }, async rollback() { return { acknowledged: true }; }, async close() {} };
    assert.equal(compareR7LiveBridgeSessionUnderlyingTransport(a, c), 'unknown');
  });

  it('verifies pinned D1 source SHA offline', () => {
    assert.equal(verifyD1PinnedSourceAndNormalizedComposite(REPO_ROOT).ok, true);
    assert.equal(R7_D1_PINNED_SOURCE_SHA256.length, 64);
  });

  it('name inventory cannot imply verified catalog (R03)', () => {
    const expectation = extractD1StaticCatalogExpectation(REPO_ROOT);
    assert.equal(assessD1NameInventoryOnlyObservation(expectation).ok, false);
    assert.equal(verifyD1PostCommitCatalogObservation(expectation, {
      anchorTableCount: expectation.tables.length,
      tablesPresent: [...expectation.tables],
      functionsPresent: [...expectation.functions],
      triggersPresent: [...expectation.triggers],
      explicitIndexesPresent: [...expectation.explicitIndexes],
      rlsEnabledTablesPresent: [...expectation.rlsEnabledTables],
    }).ok, false);
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

  it('manifest identity must match derived checksum (M1)', () => {
    const observed = observeR7D1LiveImplementationWorkspaceSixFileDigests(REPO_ROOT, HEAD_SHA);
    assert.equal(observed.ok, true);
    if (!observed.ok) return;
    const derived = deriveDeterministicSixFileManifestIdentitySha256(observed.observation.fileSha256ByRelativePath);
    assert.ok(derived);
    const forged: ManifestBinding = {
      bundleId: R7_D1_LIVE_IMPLEMENTATION_CANDIDATE_BUNDLE_ID,
      declaredCandidateIdentitySha256: 'f'.repeat(64),
      repositoryRoot: R7_PR249_FROZEN_REPO_ROOT,
      branch: R7_PR249_FROZEN_BRANCH,
      fileSha256ByRelativePath: { ...observed.observation.fileSha256ByRelativePath },
    };
    assert.equal(diffWorkspaceObservationAgainstIndependentlyReviewedManifest(observed.observation, forged).ok, false);
    const aligned: ManifestBinding = {
      ...forged,
      declaredCandidateIdentitySha256: derived!,
    };
    assert.equal(diffWorkspaceObservationAgainstIndependentlyReviewedManifest(observed.observation, aligned).ok, true);
    assert.equal(validateR7D1LiveImplementationCandidateBinding(REPO_ROOT, R7_PR249_FROZEN_BRANCH, HEAD_SHA, aligned).ok, false);
  });

  it('public executeR7DeltaStepLiveBridge holds before connect (B1/B2)', async () => {
    const client = new FakeExecutionPgClient(TEST_PG_CONFIG);
    const session = wrapExecutionPgClientAsR7LiveBridgeSession(client);
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
