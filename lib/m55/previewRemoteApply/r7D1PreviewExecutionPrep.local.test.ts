import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  R7_D1_D5_REMOTE_EXECUTION_AUTHORIZED,
  R7_D1_LOCAL_CODE_ONLY_PUBLIC_EXECUTOR_FORBIDDEN,
  R7_LIVE_BRIDGE_CLI_LIVE_TRANSPORT_FORBIDDEN,
  evaluateR7D1PreviewExecutionCodeOnlyPrepForWorkspace,
} from './r7D1D5LiveBridge.ts';
import {
  R7_D1_EXACT_CONTRACT_PINNED_SOURCE_SHA256,
  R7_D1_EXACT_CONTRACT_PINNED_NORMALIZED_COMPOSITE_SHA256,
  R7_D1_REAL_PG_OBSERVATION_PROVENANCE_ESTABLISHED_FOR_TRUSTED_REGISTRATION,
  registerTrustedCatalogQueryExecutionContextFromOwnedReadonlyCollector,
  deriveExactCatalogObservationQueryPlanDigestSha256,
} from './r7D1ExactCatalogContract.ts';
import {
  R7_D1_INDEPENDENTLY_REVIEWED_MANIFEST_IDENTITY_SHA256,
  R7_D1_POST_PATCH_CANDIDATE_DIGEST_NOT_EXTERNALLY_FROZEN,
  R7_D1_PUBLISHED_EXTERNAL_INDEPENDENT_REVIEW_ATTESTATION_SHA256,
  buildHistoricalExternalReviewManifestSnapshot206ee0d7,
  evaluateR7D1PreviewExecutionCodeOnlyPrep,
} from './r7D1LiveCandidateBinding.ts';
import { R7_PR249_FROZEN_REPO_ROOT } from './r7D1D5OfflinePlan.ts';
import {
  SESSION_POOLER_HOST,
  SESSION_POOLER_TLS_SERVER_NAME,
  TLS_TRUST_PROFILE,
  expectedConnectionUserForProjectRef,
} from './remoteConnectionAuthority.ts';
import { R7_PREVIEW_TARGET_PROJECT_REF } from './r7D1D5OfflinePlan.ts';
import {
  assertR7D1RealPgNetworkAccessAllowed,
  establishFreshReadOnlyPgSession,
  validateR7D1ExecutionPgClientConfigPreviewTargetBinding,
  wrapExecutionPgClientAsR7LiveBridgeSession,
} from './r7D1RealPgAdapter.ts';
import { FakeExecutionPgClient } from './remoteExecutionPgTransport.ts';

const REPO_ROOT = R7_PR249_FROZEN_REPO_ROOT;
const HEAD_SHA = 'a3e86bc8be5133dcd9278bd2f7112972663bb9a8';

describe('r7D1 Preview execution prep (code-only)', () => {
  it('observes current six-file digests as local-only — not historical review manifest', () => {
    const prep = evaluateR7D1PreviewExecutionCodeOnlyPrepForWorkspace(REPO_ROOT, HEAD_SHA);
    assert.equal('holdReasonCode' in prep && prep.holdReasonCode, 'HOLD_PREVIEW_EXECUTION_NOT_AUTHORIZED');
    if (!('prepObservationComplete' in prep)) return;
    assert.equal(prep.candidateLocalObservation.label, 'LOCAL_WORKSPACE_OBSERVATION_PENDING_INDEPENDENT_REVIEW');
    assert.equal(prep.candidateLocalObservation.allPathsMatchHistoricalReview206ee0d7, false);
    assert.notEqual(
      prep.candidateLocalObservation.manifestIdentitySha256,
      R7_D1_INDEPENDENTLY_REVIEWED_MANIFEST_IDENTITY_SHA256,
    );
    assert.equal(prep.externalIndependentReviewAttestationSha256, null);
    assert.equal(prep.humanExecutionAuthorizationIssuedByThisPrep, false);
    assert.equal(prep.previewD1ApplyAuthorized, false);
    assert.equal(prep.realPgProvenanceEstablished, false);
    assert.equal(prep.pinnedMigrationSourceSha256, R7_D1_EXACT_CONTRACT_PINNED_SOURCE_SHA256);
    assert.equal(
      prep.pinnedNormalizedStatementStreamSha256,
      R7_D1_EXACT_CONTRACT_PINNED_NORMALIZED_COMPOSITE_SHA256,
    );
    assert.equal(prep.pinnedD1SourceIntegrityOk, true);
    assert.equal(R7_D1_POST_PATCH_CANDIDATE_DIGEST_NOT_EXTERNALLY_FROZEN, true);
    assert.equal(R7_D1_PUBLISHED_EXTERNAL_INDEPENDENT_REVIEW_ATTESTATION_SHA256, null);
  });

  it('rejects treating historical 206ee0d7 manifest as current workspace proof', () => {
    const historical = buildHistoricalExternalReviewManifestSnapshot206ee0d7();
    assert.equal(historical.declaredCandidateIdentitySha256, R7_D1_INDEPENDENTLY_REVIEWED_MANIFEST_IDENTITY_SHA256);
    const prep = evaluateR7D1PreviewExecutionCodeOnlyPrepForWorkspace(REPO_ROOT, HEAD_SHA);
    if (!('candidateLocalObservation' in prep)) return;
    assert.equal(prep.candidateLocalObservation.allPathsMatchHistoricalReview206ee0d7, false);
  });

  it('cannot establish readonly_pg_verified trusted context without real PG provenance flag', () => {
    assert.equal(R7_D1_REAL_PG_OBSERVATION_PROVENANCE_ESTABLISHED_FOR_TRUSTED_REGISTRATION, false);
    const forged = registerTrustedCatalogQueryExecutionContextFromOwnedReadonlyCollector(
      { forged: true },
      deriveExactCatalogObservationQueryPlanDigestSha256(),
      'readonly_pg_verified',
    );
    assert.equal(forged, null);
  });

  it('holds network connect and readonly session establishment in local code-only gate', async () => {
    assert.equal(assertR7D1RealPgNetworkAccessAllowed().ok, false);
    const client = new FakeExecutionPgClient({
      host: SESSION_POOLER_HOST,
      port: 5432,
      database: 'postgres',
      user: expectedConnectionUserForProjectRef(R7_PREVIEW_TARGET_PROJECT_REF),
      password: 'redacted',
      sslmode: 'require',
      tlsCaPem: 'TEST',
      tlsTrustProfile: TLS_TRUST_PROFILE,
      tlsServerName: SESSION_POOLER_TLS_SERVER_NAME,
      connectionTimeoutMillis: 1000,
    });
    const session = wrapExecutionPgClientAsR7LiveBridgeSession(client);
    await assert.rejects(() => session.connect(), /HOLD_LIVE_NETWORK_CONNECT_FORBIDDEN/);
    const readonly = await establishFreshReadOnlyPgSession(session);
    assert.equal(readonly.ok, false);
    if (readonly.ok) return;
    assert.equal(readonly.holdReasonCode, 'HOLD_LIVE_NETWORK_CONNECT_FORBIDDEN');
  });

  it('rejects off-profile execution pg config without connecting', () => {
    const bad = validateR7D1ExecutionPgClientConfigPreviewTargetBinding({
      host: 'evil.example',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: 'redacted',
      sslmode: 'require',
      tlsCaPem: 'TEST',
      tlsTrustProfile: TLS_TRUST_PROFILE,
      tlsServerName: SESSION_POOLER_TLS_SERVER_NAME,
      connectionTimeoutMillis: 1000,
    });
    assert.equal(bad.ok, false);
    const good = validateR7D1ExecutionPgClientConfigPreviewTargetBinding({
      host: SESSION_POOLER_HOST,
      port: 5432,
      database: 'postgres',
      user: expectedConnectionUserForProjectRef(R7_PREVIEW_TARGET_PROJECT_REF),
      password: 'redacted',
      sslmode: 'require',
      tlsCaPem: 'TEST',
      tlsTrustProfile: TLS_TRUST_PROFILE,
      tlsServerName: SESSION_POOLER_TLS_SERVER_NAME,
      connectionTimeoutMillis: 1000,
    });
    assert.equal(good.ok, true);
  });

  it('fails closed when gate observation claims remote execution authorized', () => {
    const hold = evaluateR7D1PreviewExecutionCodeOnlyPrep(REPO_ROOT, HEAD_SHA, {
      remoteExecutionAuthorized: true,
      cliLiveTransportForbidden: R7_LIVE_BRIDGE_CLI_LIVE_TRANSPORT_FORBIDDEN,
      localCodeOnlyPublicExecutorForbidden: R7_D1_LOCAL_CODE_ONLY_PUBLIC_EXECUTOR_FORBIDDEN,
    });
    assert.equal('holdReasonCode' in hold && hold.holdReasonCode, 'HOLD_AUTHORIZATION_GATE');
  });

  it('documents closed execution gates for prep wrapper', () => {
    assert.equal(R7_D1_D5_REMOTE_EXECUTION_AUTHORIZED, false);
    assert.equal(R7_LIVE_BRIDGE_CLI_LIVE_TRANSPORT_FORBIDDEN, true);
    assert.equal(R7_D1_LOCAL_CODE_ONLY_PUBLIC_EXECUTOR_FORBIDDEN, true);
  });
});
