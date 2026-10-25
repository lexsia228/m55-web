import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PAIR_P5_CHECKOUT_HUMAN_PREVIEW_APPLY_AUTHORIZATION_GRANTED,
  isPairP5CheckoutHumanPreviewApplyAuthorizationGranted,
} from './previewRemoteApply/pairP5CheckoutLiveExecutionAuthority.ts';
import {
  PAIR_P5_CHECKOUT_POST_PROBE_SQL,
  PAIR_P5_CHECKOUT_POST_PROBE_SQL_SHA256_LITERAL,
  PAIR_P5_CHECKOUT_STEP_ID,
  PAIR_P5_CHECKOUT_MIGRATION_SHA256,
} from './previewRemoteApply/pairP5CheckoutStepAuthority.ts';
import {
  issuePairP5TestOnlyOperationalCheckoutDedicatedReceiptForTestsOnly,
  readPairP5DedicatedReceiptGitProvenance,
  registerPairP5HumanPreviewApplyAuthorizationForTestsOnly,
  registerPairP5TestAttestationTrustAnchorForTestsOnly,
  resetPairP5HumanPreviewApplyAuthorizationRegistryForTestsOnly,
} from './previewRemoteApply/pairP5DedicatedTargetBindingReceipt.ts';
import { generatePairP5HumanAttestationTestKeyMaterialForTestsOnly } from './previewRemoteApply/pairP5HumanPreviewUiAttestation.ts';
import {
  buildPairP5ExpectedAuthorizationBindingForTestsOnly,
  isPairP5LiveCredentialAcquisitionAuthorized,
  pairP5LiveSingleStdinDualPgClientExerciseForTestsOnly,
} from './previewRemoteApply/pairP5IdentityAuthorizationGatedRealExecutor.ts';
import {
  PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
  PAIR_P5_EXPECTED_HEAD_COMMIT_SHA,
  PAIR_P5_EXPECTED_REPO_ROOT,
} from './previewRemoteApply/pairP5IdentityStepAuthority.ts';
import {
  SESSION_POOLER_HOST,
  SESSION_POOLER_HOST_FINGERPRINT_SHA256,
  expectedConnectionUserForProjectRef,
} from './previewRemoteApply/remoteConnectionAuthority.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPOSITORY_FACTS_SOURCE } from './previewRemoteApply/types.ts';
import { createHash } from 'node:crypto';

const TARGET = {
  organization: 'm55-preview',
  project: 'm55-soul-preview',
  databaseTier: 'Primary Database',
  projectRef: PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
  hostFingerprintSha256: SESSION_POOLER_HOST_FINGERPRINT_SHA256,
};

const REPOSITORY = {
  repoRoot: PAIR_P5_EXPECTED_REPO_ROOT,
  branch: 'feat/m55-pair-p5-owned-state-identity-v1',
  headCommitSha: PAIR_P5_EXPECTED_HEAD_COMMIT_SHA,
  treeSha: PAIR_P5_EXPECTED_HEAD_COMMIT_SHA,
  trackedWorktreeClean: true,
  indexEmpty: true,
  factsSource: REPOSITORY_FACTS_SOURCE,
};

function issueOperationalCheckoutFixture() {
  resetPairP5HumanPreviewApplyAuthorizationRegistryForTestsOnly();
  const authId = 'HUMAN_P5_2_CHECKOUT_STDIN_ONCE_FIXTURE_001';
  registerPairP5HumanPreviewApplyAuthorizationForTestsOnly({
    authorizationId: authId,
    purpose: 'LIVE_MUTATION',
    selectedStep: PAIR_P5_CHECKOUT_STEP_ID,
    migrationSourceSha256: PAIR_P5_CHECKOUT_MIGRATION_SHA256,
    previewProjectRef: PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
  });
  const key = generatePairP5HumanAttestationTestKeyMaterialForTestsOnly('TEST_CHECKOUT_STDIN_ONCE_KEY');
  registerPairP5TestAttestationTrustAnchorForTestsOnly({
    trustKeyId: key.trustKeyId,
    publicKeySpkiDerBase64: key.publicKeySpkiDerBase64,
    status: 'ACTIVE',
  });
  const git = readPairP5DedicatedReceiptGitProvenance(PAIR_P5_EXPECTED_REPO_ROOT);
  const issued = issuePairP5TestOnlyOperationalCheckoutDedicatedReceiptForTestsOnly({
    injectedGit: git,
    humanAuthorizationId: authId,
    trustAnchors: [
      {
        trustKeyId: key.trustKeyId,
        publicKeySpkiDerBase64: key.publicKeySpkiDerBase64,
        status: 'ACTIVE',
      },
    ],
    privateKeyPkcs8DerBase64: key.privateKeyPkcs8DerBase64,
    trustKeyId: key.trustKeyId,
    attestationId: 'INDEPENDENT_PREVIEW_UI_WITNESS_CHECKOUT_STDIN_ONCE_001',
  });
  assert.equal(issued.ok, true);
  if (!issued.ok) {
    throw new Error('fixture receipt issuance failed');
  }
  return issued.receipt;
}

function validStdinBytes(): Buffer {
  const pem = readFileSync(
    join(
      PAIR_P5_EXPECTED_REPO_ROOT,
      'lib/m55/previewRemoteApply.remoteExecutionCredentialAndTransport.local.test.ts',
    ),
    'utf8',
  );
  const pemMatch = pem.match(
    /const SUPABASE_ROOT_2021_CA_PEM = `([\s\S]*?)`;/,
  );
  if (pemMatch === null) {
    throw new Error('SUPABASE_ROOT_2021_CA_PEM fixture missing');
  }
  return Buffer.from(
    JSON.stringify({
      host: SESSION_POOLER_HOST,
      port: 5432,
      database: 'postgres',
      user: expectedConnectionUserForProjectRef(PAIR_P5_APPROVED_PREVIEW_PROJECT_REF),
      password: 'stdin-once-test-password',
      sslmode: 'require',
      tlsCaPem: pemMatch[1],
    }),
    'utf8',
  );
}

describe('pairP5 live stdin-once credential bundle', () => {
  it('pins strengthened checkout POST probe SQL SHA256', () => {
    const digest = createHash('sha256').update(PAIR_P5_CHECKOUT_POST_PROBE_SQL, 'utf8').digest('hex');
    assert.equal(digest, PAIR_P5_CHECKOUT_POST_PROBE_SQL_SHA256_LITERAL);
  });

  it('checkout Human APPLY is not static true; operational receipt satisfies gate', () => {
    assert.equal(PAIR_P5_CHECKOUT_HUMAN_PREVIEW_APPLY_AUTHORIZATION_GRANTED, false);
    assert.equal(isPairP5CheckoutHumanPreviewApplyAuthorizationGranted(), false);
    const receipt = issueOperationalCheckoutFixture();
    const input = {
      repoRoot: PAIR_P5_EXPECTED_REPO_ROOT,
      repository: REPOSITORY,
      repositoryFactsProvenance: 'GIT_READ_ONLY_OBSERVED' as const,
      target: TARGET,
      selectedStep: PAIR_P5_CHECKOUT_STEP_ID,
      dedicatedTargetBindingReceipt: receipt,
    };
    assert.equal(isPairP5CheckoutHumanPreviewApplyAuthorizationGranted(input), true);
  });

  it('acquires secure stdin once and builds mutation and fresh readonly PG clients', async () => {
    assert.equal(
      isPairP5LiveCredentialAcquisitionAuthorized(),
      true,
      'stdin-once regression requires operational live credential wiring to be authorized',
    );
    const executionInput = {
      repoRoot: PAIR_P5_EXPECTED_REPO_ROOT,
      repository: REPOSITORY,
      repositoryFactsProvenance: 'GIT_READ_ONLY_OBSERVED' as const,
      target: TARGET,
      selectedStep: PAIR_P5_CHECKOUT_STEP_ID,
    };
    let stdinReads = 0;
    const result = await pairP5LiveSingleStdinDualPgClientExerciseForTestsOnly({
      binding: buildPairP5ExpectedAuthorizationBindingForTestsOnly(executionInput),
      credentialDeps: {
        readBytes: () => {
          stdinReads += 1;
          return validStdinBytes();
        },
      },
    });
    assert.equal(result.ok, true);
    if (!result.ok) {
      throw new Error('unexpected hold');
    }
    assert.equal(result.credentialAcquisitionProbeCount, 1);
    assert.equal(stdinReads, 1);
  });

  it('cleans up shared bundle after stdin acquire when PG client config build fails', async () => {
    assert.equal(isPairP5LiveCredentialAcquisitionAuthorized(), true);
    const executionInput = {
      repoRoot: PAIR_P5_EXPECTED_REPO_ROOT,
      repository: REPOSITORY,
      repositoryFactsProvenance: 'GIT_READ_ONLY_OBSERVED' as const,
      target: TARGET,
      selectedStep: PAIR_P5_CHECKOUT_STEP_ID,
    };
    const binding = buildPairP5ExpectedAuthorizationBindingForTestsOnly(executionInput);
    const bindingHostMismatch = { ...binding, host: 'pair-p5-stdin-once-cleanup-host-mismatch.invalid' };
    let stdinReads = 0;
    const result = await pairP5LiveSingleStdinDualPgClientExerciseForTestsOnly({
      binding: bindingHostMismatch,
      credentialDeps: {
        readBytes: () => {
          stdinReads += 1;
          return validStdinBytes();
        },
      },
    });
    assert.equal(result.ok, false);
    if (result.ok) {
      throw new Error('expected config hold after single stdin acquire');
    }
    assert.equal(stdinReads, 1);
  });
});
