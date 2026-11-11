import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { spawnSync } from 'node:child_process';
import {
  CONSULT_ADVISORY_LOCK_SQL,
  CONSULT_CATALOG_SQL,
  PAIR_CONSULT_EXACT_VERSION,
  PAIR_CONSULT_WORKTREE,
  consultConfirmationPhrase,
  evaluateConsultTransportBinding,
  evaluatePairConsultExactVersionIdentity,
  classifyConsultTransportEvidence,
  consultControllingTerminalAvailable,
  consultLiveMutationPermitted,
  executePairConsultExactVersionPreview,
  executePairConsultHumanOperatedPreview,
  executePairConsultLocalFakeTransport,
  interpretConsultTransportProfile,
  projectConsultExecutionTruth,
  readLastLocalFakeTransportTrace,
  gitBlobSha1,
  loadFrozenConsultMigrationBytes,
  observeConsultGitIdentity,
  observeConsultOperationalIdentity,
  simulatePairConsultExactVersion,
  type ConsultCatalogDefect,
  type ConsultOperationalObservation,
} from './previewRemoteApply/pairConsultExactVersionPreviewExecutor.ts';
import {
  APPROVED_PREVIEW_PROJECT_REF,
  EXPECTED_PORT,
  EXPECTED_SSLMODE,
  SESSION_POOLER_HOST,
  SESSION_POOLER_TLS_SERVER_NAME,
  TLS_TRUST_PROFILE,
  expectedConnectionUserForProjectRef,
} from './previewRemoteApply/remoteConnectionAuthority.ts';
import {
  type ExecutionPgClient,
} from './previewRemoteApply/remoteExecutionPgTransport.ts';

const ROOT = process.cwd();
const PASSWORD = 'secret-password-must-not-leak';
const PINNED_CA = `-----BEGIN CERTIFICATE-----
MIIDxDCCAqygAwIBAgIUbLxMod62P2ktCiAkxnKJwtE9VPYwDQYJKoZIhvcNAQEL
BQAwazELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5l
dyBDYXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJh
c2UgUm9vdCAyMDIxIENBMB4XDTIxMDQyODEwNTY1M1oXDTMxMDQyNjEwNTY1M1ow
azELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5ldyBD
YXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJhc2Ug
Um9vdCAyMDIxIENBMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqQXW
QyHOB+qR2GJobCq/CBmQ40G0oDmCC3mzVnn8sv4XNeWtE5XcEL0uVih7Jo4Dkx1Q
DmGHBH1zDfgs2qXiLb6xpw/CKQPypZW1JssOTMIfQppNQ87K75Ya0p25Y3ePS2t2
GtvHxNjUV6kjOZjEn2yWEcBdpOVCUYBVFBNMB4YBHkNRDa/+S4uywAoaTWnCJLUi
cvTlHmMw6xSQQn1UfRQHk50DMCEJ7Cy1RxrZJrkXXRP3LqQL2ijJ6F4yMfh+Gyb4
O4XajoVj/+R4GwywKYrrS8PrSNtwxr5StlQO8zIQUSMiq26wM8mgELFlS/32Uclt
NaQ1xBRizkzpZct9DwIDAQABo2AwXjALBgNVHQ8EBAMCAQYwHQYDVR0OBBYEFKjX
uXY32CztkhImng4yJNUtaUYsMB8GA1UdIwQYMBaAFKjXuXY32CztkhImng4yJNUt
aUYsMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAB8spzNn+4VU
tVxbdMaX+39Z50sc7uATmus16jmmHjhIHz+l/9GlJ5KqAMOx26mPZgfzG7oneL2b
VW+WgYUkTT3XEPFWnTp2RJwQao8/tYPXWEJDc0WVQHrpmnWOFKU/d3MqBgBm5y+6
jB81TU/RG2rVerPDWP+1MMcNNy0491CTL5XQZ7JfDJJ9CCmXSdtTl4uUQnSuv/Qx
Cea13BX2ZgJc7Au30vihLhub52De4P/4gonKsNHYdbWjg7OWKwNv/zitGDVDB9Y2
CMTyZKG3XEu5Ghl1LEnI3QmEKsqaCLv12BnVjbkSeZsMnevJPs1Ye6TjjJwdik5P
o/bKiIz+Fq8=
-----END CERTIFICATE-----`;
const WRONG_CA = `-----BEGIN CERTIFICATE-----
MIIDETCCAfmgAwIBAgIUPAk3c9/lYYXGY5R7JtuKMBVwAScwDQYJKoZIhvcNAQEL
BQAwGDEWMBQGA1UEAwwNV3JvbmcgVGVzdCBDQTAeFw0yNjA2MTQxNjM3NDNaFw0z
NjA2MTExNjM3NDNaMBgxFjAUBgNVBAMMDVdyb25nIFRlc3QgQ0EwggEiMA0GCSqG
SIb3DQEBAQUAA4IBDwAwggEKAoIBAQCltgVXhJltZKNgcFTK5j8fNFcsz2BJhIMO
wchmgWzAZBcp+5CxIY6bsPT+9oeFupfzHeuCiWM4c/ZJlhkDMkBEv8fEoZPLd/L0
5VRmMknVK0RbpN6w0PQISbsS5GCzdgRdzFrq4FnzIeTYW11n530s0cLVr1C3+GnT
+WDp8cLcdKQTzMH/uXQbN+YRP0C2PopK1MOjLBOeT9t41ffnrUEkYC7DOrAHUIFa
NU7AJYSoD0iH1TyKpB+bBTHRPchgUSlELq/G+sYeznSV1RbczxZLxwdeHXDIX1qZ
wMBJqkac/ayDBUU6SQvL+wY2zSW1MGctQbrK0WDBF8Y2/vDW9OQXAgMBAAGjUzBR
MB0GA1UdDgQWBBTi1PFyXGkk2tCroiHeO/1xUNSEzjAfBgNVHSMEGDAWgBTi1PFy
XGkk2tCroiHeO/1xUNSEzjAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUA
A4IBAQBE/VpkfVl37MYOav5F25uvwpEGL35t1NUOiF7N8vRSHJFO6DmrzOPVedWo
SoBjFHr4qP11Wwr3C9bcHBM3tc4pMJEY4YmiJQuruih3W58zbZtjT4Zzygno/c5r
B4CY8bH0xWBot7C/jayyHsYtyNWYLXJZm0mDgKPODebzV7zrRvJH8DQvhQDRXasA
+QJXm5KlM5N8g9rqwqtpf5nTd6InwDUBi+gXLjkXEbTvWN1GKIG8zMnsJLGQByAV
R4uxffsd7onCccnROGbd5vnmLhgdKAKysxYomt6rhd31hd0Xi8iRbFi8rzyJy2ay
fdJkFVMUgUwJpuwtSvE0xFycF6Di
-----END CERTIFICATE-----`;

function bytes(): Buffer {
  return loadFrozenConsultMigrationBytes(ROOT);
}

function countingClient(): ExecutionPgClient & { readonly calls: string[] } {
  const calls: string[] = [];
  const boom = (name: string) => async () => {
    calls.push(name);
    throw new Error(PASSWORD);
  };
  return {
    calls,
    connect: boom('connect'),
    query: boom('query'),
    begin: boom('begin'),
    commit: boom('commit'),
    rollback: boom('rollback'),
    close: boom('close'),
    getConnectionState: () => 'open',
    markUnusable: () => undefined,
  };
}

describe('Pair consult exact-version executor PATCH-2', () => {
  it('accepts the frozen blob and ignores unrelated local versions', () => {
    const sql = bytes();
    const identity = evaluatePairConsultExactVersionIdentity({
      projectRef: APPROVED_PREVIEW_PROJECT_REF,
      sqlBytes: sql,
      localOnlyVersions: ['20260306000000', '20260614000000', PAIR_CONSULT_EXACT_VERSION.version],
    });
    assert.equal(identity.ok, true);
    assert.equal(gitBlobSha1(sql), PAIR_CONSULT_EXACT_VERSION.gitBlobSha1);
  });

  it('makes zero remote calls without GO and with a forged GO string', async () => {
    const client = countingClient();
    const missing = await executePairConsultExactVersionPreview({ client, liveHumanGo: null });
    const forged = await executePairConsultExactVersionPreview({
      client,
      liveHumanGo: 'M55-HUMAN-PAIR-P5-1-PREVIEW-APPLY-GO-REQUIRED',
    });
    assert.equal(missing.disposition, 'AUTHORIZATION_BLOCKED');
    assert.equal(missing.reason, 'AUTHORIZATION_ABSENT');
    assert.equal(forged.disposition, 'AUTHORIZATION_BLOCKED');
    assert.equal(forged.reason, 'FORGED_AUTHORIZATION_STRING');
    assert.equal(missing.liveExecutionReady, false);
    assert.equal(missing.runtimeApplied, false);
    assert.deepEqual(client.calls, []);
    assert.equal(JSON.stringify(missing).includes(PASSWORD), false);
    assert.equal(JSON.stringify(forged).includes(PASSWORD), false);
  });

  it('stops before connect when branch, project user, host, or TLS does not bind', async () => {
    const sql = bytes();
    const cases = [
      { claimedBranch: 'feat/m55-paid-lp-canonical-wave1', tlsCaPem: PINNED_CA, reason: 'BRANCH_MISMATCH' },
      { claimedHead: 'not-a-valid-head', tlsCaPem: PINNED_CA, reason: 'HEAD_UNBOUND' },
      { claimedWorktree: '/tmp/other-worktree', tlsCaPem: PINNED_CA, reason: 'WORKTREE_MISMATCH' },
      { connectionUser: 'postgres', tlsCaPem: PINNED_CA, reason: 'CONNECTION_USER_NOT_PROJECT_BOUND' },
      { host: 'db.hsdxixvoijuujhpyxgdo.supabase.co', tlsCaPem: PINNED_CA, reason: 'POOLER_HOST_MISMATCH' },
      { tlsCaPem: WRONG_CA, reason: 'TLS_CA_NOT_PINNED' },
    ] as const;
    for (const scenario of cases) {
      const result = await simulatePairConsultExactVersion({
        sqlBytes: sql,
        localOnlyVersions: [PAIR_CONSULT_EXACT_VERSION.version],
        scenario,
      });
      assert.equal(result.disposition, 'TARGET_BINDING_STOP', scenario.reason);
      assert.equal(result.reason, scenario.reason);
      assert.equal(result.querySequence.includes('CONNECT'), false);
      assert.equal(result.evidence.transportBound, false);
    }
    const boundUser = expectedConnectionUserForProjectRef(APPROVED_PREVIEW_PROJECT_REF);
    const observedHead = observeConsultGitIdentity(ROOT);
    assert.equal(observedHead.ok, true);
    if (!observedHead.ok) return;
    assert.equal(
      evaluateConsultTransportBinding({
        host: SESSION_POOLER_HOST,
        port: EXPECTED_PORT,
        database: 'postgres',
        user: boundUser,
        sslmode: EXPECTED_SSLMODE,
        tlsTrustProfile: TLS_TRUST_PROFILE,
        tlsServerName: SESSION_POOLER_TLS_SERVER_NAME,
        tlsCaPem: PINNED_CA,
        claimedProjectRef: APPROVED_PREVIEW_PROJECT_REF,
        claimedBranch: PAIR_CONSULT_EXACT_VERSION.branch,
        claimedHead: observedHead.head,
        claimedWorktree: PAIR_CONSULT_WORKTREE,
      }).ok,
      true,
    );
  });

  it('stops when the simulation connection fails before BEGIN', async () => {
    const result = await simulatePairConsultExactVersion({
      sqlBytes: bytes(),
      localOnlyVersions: [PAIR_CONSULT_EXACT_VERSION.version],
      scenario: { tlsCaPem: PINNED_CA, failConnect: true },
    });
    assert.equal(result.disposition, 'PRE_BEGIN_STOP');
    assert.equal(result.reason, 'CONNECT_FAILED');
    assert.equal(result.querySequence.includes('BEGIN'), false);
    assert.equal(result.commitAttempts, 0);
  });

  it('passes the local contract only as simulation, including a fresh post-commit connection', async () => {
    const result = await simulatePairConsultExactVersion({
      sqlBytes: bytes(),
      localOnlyVersions: ['20260306000000', PAIR_CONSULT_EXACT_VERSION.version],
      scenario: { tlsCaPem: PINNED_CA },
    });
    assert.equal(result.disposition, 'LOCAL_SIMULATION_CONTRACT_PASS');
    assert.equal(result.localContractPass, true);
    assert.equal(result.catalogGreen, false);
    assert.equal(result.runtimeApplied, false);
    assert.equal(result.commitAttempts, 1);
    assert.equal(result.commitResponseClass, 'DEFINITIVE_COMMIT_ACK');
    assert.equal(result.querySequence.filter((step) => step === 'COMMIT').length, 1);
    assert.ok(result.querySequence.includes('POST_COMMIT_CONNECT'));
    assert.equal(result.evidence.postConnectDistinguishesPreview, false);
    assert.equal(JSON.stringify(result).includes(PASSWORD), false);
  });

  it('holds catalog defects and a failed independent post-commit connection without retrying COMMIT', async () => {
    const sql = bytes();
    const defects = ['fk', 'unique', 'index', 'function', 'privilege', 'query_fail', 'history'] as const;
    for (const catalogDefect of defects) {
      const result = await simulatePairConsultExactVersion({
        sqlBytes: sql,
        localOnlyVersions: [PAIR_CONSULT_EXACT_VERSION.version],
        scenario: { tlsCaPem: PINNED_CA, catalogDefect },
      });
      assert.equal(result.disposition, 'LOCAL_SIMULATION_CATALOG_HOLD', catalogDefect);
      assert.equal(result.localContractPass, false);
      assert.equal(result.commitAttempts, 1);
      assert.equal(result.commitResponseClass, 'DEFINITIVE_COMMIT_ACK');
      assert.equal(result.querySequence.filter((step) => step === 'COMMIT').length, 1);
    }
    const disconnected = await simulatePairConsultExactVersion({
      sqlBytes: sql,
      localOnlyVersions: [PAIR_CONSULT_EXACT_VERSION.version],
      scenario: { tlsCaPem: PINNED_CA, postCommitFailConnect: true },
    });
    assert.equal(disconnected.disposition, 'LOCAL_SIMULATION_CATALOG_HOLD');
    assert.equal(disconnected.reason, 'POST_COMMIT_CONNECT_FAILED');
    assert.equal(disconnected.commitResponseClass, 'DEFINITIVE_COMMIT_ACK');
    assert.equal(disconnected.querySequence.filter((step) => step === 'COMMIT').length, 1);
  });

  it('does not retry when the commit acknowledgement is lost', async () => {
    const result = await simulatePairConsultExactVersion({
      sqlBytes: bytes(),
      localOnlyVersions: [PAIR_CONSULT_EXACT_VERSION.version],
      scenario: { tlsCaPem: PINNED_CA, commit: 'THROW' },
    });
    assert.equal(result.disposition, 'COMMIT_ACK_UNCERTAIN');
    assert.equal(result.commitAttempts, 1);
    assert.equal(result.retryForbidden, true);
    assert.equal(result.querySequence.includes('POST_COMMIT_CONNECT'), false);
    assert.equal(result.querySequence.filter((step) => step === 'COMMIT' || step === 'COMMIT_THROWN').length, 1);
  });

  it('rejects another project and another SQL blob before any connection', async () => {
    const sql = bytes();
    assert.equal(
      evaluatePairConsultExactVersionIdentity({
        projectRef: 'hsdxixvoijuujhpyxgdo',
        sqlBytes: sql,
        localOnlyVersions: [PAIR_CONSULT_EXACT_VERSION.version],
      }).ok,
      false,
    );
    const otherProject = await simulatePairConsultExactVersion({
      sqlBytes: sql,
      localOnlyVersions: [PAIR_CONSULT_EXACT_VERSION.version],
      scenario: { claimedProjectRef: 'hsdxixvoijuujhpyxgdo', tlsCaPem: PINNED_CA },
    });
    assert.equal(otherProject.disposition, 'IDENTITY_REJECTED');
    assert.equal(otherProject.reason, 'PROJECT_REF_MISMATCH');
    assert.equal(otherProject.querySequence.includes('CONNECT'), false);
    const otherBlob = await simulatePairConsultExactVersion({
      sqlBytes: Buffer.from('not the migration'),
      localOnlyVersions: [PAIR_CONSULT_EXACT_VERSION.version],
      scenario: { tlsCaPem: PINNED_CA },
    });
    assert.equal(otherBlob.disposition, 'IDENTITY_REJECTED');
    assert.equal(otherBlob.reason, 'GIT_BLOB_MISMATCH');
    assert.equal(otherBlob.querySequence.includes('CONNECT'), false);
  });

  it('stops before BEGIN when the version, history, or objects are already unsafe', async () => {
    const sql = bytes();
    const present = await simulatePairConsultExactVersion({
      sqlBytes: sql,
      localOnlyVersions: [PAIR_CONSULT_EXACT_VERSION.version],
      scenario: { tlsCaPem: PINNED_CA, versionAlreadyPresent: true },
    });
    assert.equal(present.disposition, 'PRE_BEGIN_STOP');
    assert.equal(present.reason, 'VERSION_ALREADY_PRESENT');
    assert.equal(present.querySequence.includes('BEGIN'), false);
    assert.equal(present.commitAttempts, 0);
    const duplicate = await simulatePairConsultExactVersion({
      sqlBytes: sql,
      localOnlyVersions: [PAIR_CONSULT_EXACT_VERSION.version],
      scenario: { tlsCaPem: PINNED_CA, baselineVersions: ['20260614000000', '20260614000000'] },
    });
    assert.equal(duplicate.reason, 'HISTORY_DUPLICATE');
    assert.equal(duplicate.querySequence.includes('BEGIN'), false);
    const malformed = await simulatePairConsultExactVersion({
      sqlBytes: sql,
      localOnlyVersions: [PAIR_CONSULT_EXACT_VERSION.version],
      scenario: { tlsCaPem: PINNED_CA, baselineVersions: ['not-a-version'] },
    });
    assert.equal(malformed.reason, 'HISTORY_MALFORMED');
    const objects = await simulatePairConsultExactVersion({
      sqlBytes: sql,
      localOnlyVersions: [PAIR_CONSULT_EXACT_VERSION.version],
      scenario: { tlsCaPem: PINNED_CA, objectsAlreadyPresent: true },
    });
    assert.equal(objects.reason, 'OBJECTS_ALREADY_PRESENT');
    assert.equal(objects.querySequence.includes('BEGIN'), false);
  });

  it('does not mutate when BEGIN fails and rolls back a statement failure', async () => {
    const sql = bytes();
    const begin = await simulatePairConsultExactVersion({
      sqlBytes: sql,
      localOnlyVersions: [PAIR_CONSULT_EXACT_VERSION.version],
      scenario: { tlsCaPem: PINNED_CA, failBegin: true },
    });
    assert.equal(begin.disposition, 'PRE_BEGIN_STOP');
    assert.equal(begin.reason, 'BEGIN_FAILED');
    assert.equal(begin.commitAttempts, 0);
    assert.equal(begin.querySequence.includes('COMMIT'), false);
    const rolled = await simulatePairConsultExactVersion({
      sqlBytes: sql,
      localOnlyVersions: [PAIR_CONSULT_EXACT_VERSION.version],
      scenario: { tlsCaPem: PINNED_CA, failOnStatement: true },
    });
    assert.equal(rolled.disposition, 'ROLLED_BACK');
    assert.equal(rolled.commitAttempts, 0);
    assert.equal(rolled.querySequence.includes('COMMIT'), false);
    assert.equal(rolled.querySequence.includes('ROLLBACK'), true);
    const uncertain = await simulatePairConsultExactVersion({
      sqlBytes: sql,
      localOnlyVersions: [PAIR_CONSULT_EXACT_VERSION.version],
      scenario: { tlsCaPem: PINNED_CA, failOnStatement: true, rollbackAcknowledged: false },
    });
    assert.equal(uncertain.disposition, 'ROLLBACK_UNCERTAIN');
    assert.equal(uncertain.commitAttempts, 0);
    assert.equal(uncertain.querySequence.includes('COMMIT'), false);
  });

  it('selects only the target version inside one transaction and one history insert', async () => {
    const sql = bytes();
    const unrelated = ['20260306000000', '20260614000000'];
    const identity = evaluatePairConsultExactVersionIdentity({
      projectRef: PAIR_CONSULT_EXACT_VERSION.projectRef,
      sqlBytes: sql,
      localOnlyVersions: [PAIR_CONSULT_EXACT_VERSION.version, ...unrelated],
    });
    assert.equal(identity.ok, true);
    if (identity.ok) {
      const joined = identity.statements.join('\n');
      for (const version of unrelated) assert.equal(joined.includes(version), false);
      assert.equal(identity.statements.some((statement) => /^\s*(select|perform)\b/i.test(statement) && statement.includes('m55_backfill_compatibility_included_reply_threads_v1')), false);
    }
    const result = await simulatePairConsultExactVersion({
      sqlBytes: sql,
      localOnlyVersions: [PAIR_CONSULT_EXACT_VERSION.version, ...unrelated],
      scenario: { tlsCaPem: PINNED_CA },
    });
    assert.equal(result.disposition, 'LOCAL_SIMULATION_CONTRACT_PASS');
    assert.equal(result.runtimeApplied, false);
    assert.equal(result.catalogGreen, false);
    assert.equal(result.catalogContractMatched, true);
    assert.equal(result.evidence.catalogSql, 'POSTGRES_CATALOG');
    assert.equal(result.querySequence.filter((step) => step === 'BEGIN').length, 1);
    assert.equal(result.querySequence.filter((step) => step === 'HISTORY_INSERT').length, 1);
    assert.equal(result.querySequence.filter((step) => step === 'COMMIT').length, 1);
    assert.equal(result.historyInsert?.version, PAIR_CONSULT_EXACT_VERSION.version);
    assert.equal(result.historyInsert?.name, PAIR_CONSULT_EXACT_VERSION.name);
    assert.equal(CONSULT_CATALOG_SQL.join('\n').includes('consult_catalog_contract'), false);
    assert.equal(CONSULT_CATALOG_SQL.some((sql) => sql.includes('pg_constraint')), true);
    assert.equal(CONSULT_CATALOG_SQL.some((sql) => sql.includes('pg_index')), true);
    assert.equal(CONSULT_CATALOG_SQL.some((sql) => sql.includes('pg_proc')), true);
    assert.equal(CONSULT_CATALOG_SQL.some((sql) => sql.includes('pg_class')), true);
  });

  it('holds an in-transaction conflict and a post-commit close failure without a second commit', async () => {
    const sql = bytes();
    const conflict = await simulatePairConsultExactVersion({
      sqlBytes: sql,
      localOnlyVersions: [PAIR_CONSULT_EXACT_VERSION.version],
      scenario: { tlsCaPem: PINNED_CA, versionAppearsAfterBegin: true },
    });
    assert.equal(conflict.disposition, 'ROLLED_BACK');
    assert.equal(conflict.commitAttempts, 0);
    assert.equal(conflict.querySequence.filter((step) => step === 'COMMIT').length, 0);
    const closed = await simulatePairConsultExactVersion({
      sqlBytes: sql,
      localOnlyVersions: [PAIR_CONSULT_EXACT_VERSION.version],
      scenario: { tlsCaPem: PINNED_CA, postCommitCloseFails: true },
    });
    assert.equal(closed.disposition, 'LOCAL_SIMULATION_CLEANUP_HOLD');
    assert.equal(closed.commitResponseClass, 'DEFINITIVE_COMMIT_ACK');
    assert.equal(closed.querySequence.filter((step) => step === 'COMMIT').length, 1);
    assert.equal(closed.runtimeApplied, false);
  });

  it('rejects boolean, P5 attestation, and secret-bearing live input with zero calls', async () => {
    const client = countingClient();
    const booleanGo = await executePairConsultExactVersionPreview({
      client,
      liveHumanGo: null,
      authorized: true,
      password: PASSWORD,
    });
    const p5 = await executePairConsultExactVersionPreview({
      client,
      liveHumanGo: null,
      password: PASSWORD,
      presentedAuthorization: { schemaId: 'M55_PAIR_P5_HUMAN_PREVIEW_UI_ATTESTATION_v1' },
    });
    assert.equal(booleanGo.reason, 'FORGED_AUTHORIZATION_BOOLEAN');
    assert.equal(p5.reason, 'P5_ATTESTATION_NOT_CONSULT_AUTHORIZATION');
    assert.deepEqual(client.calls, []);
    assert.equal(JSON.stringify(booleanGo).includes(PASSWORD), false);
    assert.equal(JSON.stringify(p5).includes(PASSWORD), false);
    assert.equal(observeConsultGitIdentity(ROOT).ok, true);
  });

  it('refuses unapproved live execution from the runner', () => {
    const planned = spawnSync('npx', ['tsx', 'scripts/m55/runPreviewPairConsultExactVersionExecution.ts'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(planned.status, 0);
    const body = JSON.parse(planned.stdout) as { mode: string; live: boolean; liveExecutionReady: boolean; gitBlobSha1: string };
    assert.equal(body.mode, 'PLAN_ONLY');
    assert.equal(body.live, false);
    assert.equal(body.liveExecutionReady, false);
    assert.equal(body.gitBlobSha1, PAIR_CONSULT_EXACT_VERSION.gitBlobSha1);
    assert.equal(planned.stdout.includes(PASSWORD), false);
    const live = spawnSync('npx', ['tsx', 'scripts/m55/runPreviewPairConsultExactVersionExecution.ts', '--live'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(live.status, 2);
    assert.match(live.stderr, /AUTHORIZATION_BLOCKED/);
    assert.equal(live.stdout.includes(PASSWORD), false);
    const simulated = spawnSync('npx', ['tsx', 'scripts/m55/runPreviewPairConsultExactVersionExecution.ts', '--simulate'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(simulated.status, 2);
    const simulation = JSON.parse(simulated.stdout) as { mode: string; disposition: string; runtimeApplied: boolean; catalogGreen: boolean };
    assert.equal(simulation.mode, 'LOCAL_SIMULATION');
    assert.equal(simulation.disposition, 'TARGET_BINDING_STOP');
    assert.equal(simulation.runtimeApplied, false);
    assert.equal(simulation.catalogGreen, false);
  });

  it('keeps the human-operated path closed without a terminal, confirmation, or clean source', async () => {
    const observed = observeConsultOperationalIdentity(ROOT);
    assert.equal(observed.ok, true);
    if (observed.ok) {
      assert.equal(observed.sourceClean, false);
      assert.equal(observed.branch, PAIR_CONSULT_EXACT_VERSION.branch);
      assert.equal(observed.migrationBlobSha1, PAIR_CONSULT_EXACT_VERSION.gitBlobSha1);
    }
    let confirmed = 0;
    let secrets = 0;
    let created = 0;
    const closed = await executePairConsultLocalFakeTransport({
      repoRoot: ROOT,
      isControllingTerminal: () => true,
      readConfirmation: async () => {
        confirmed += 1;
        return 'no';
      },
      readCredentialBytes: () => {
        secrets += 1;
        return Buffer.from(PASSWORD);
      },
    });
    assert.equal(closed.disposition, 'AUTHORIZATION_BLOCKED');
    assert.equal(closed.reason, 'UNREVIEWED_SOURCE');
    assert.equal(confirmed, 0);
    assert.equal(secrets, 0);
    assert.equal(created, 0);
    assert.equal(JSON.stringify(closed).includes(PASSWORD), false);
    const quiet = await executePairConsultLocalFakeTransport({
      repoRoot: ROOT,
      yes: true,
      isControllingTerminal: () => true,
      observe: () => cleanObservation(),
    });
    let prompt = '';
    const incomplete = await executePairConsultLocalFakeTransport({
      repoRoot: ROOT,
      isControllingTerminal: () => true,
      observe: () => cleanObservation(),
      readConfirmation: async () => 'yes',
      writePrompt: (text) => {
        prompt = text;
      },
      readCredentialBytes: () => {
        secrets += 1;
        return Buffer.from(PASSWORD);
      },
    });
    assert.equal(prompt.includes(PASSWORD), false);
    assert.equal(prompt.includes(PAIR_CONSULT_EXACT_VERSION.projectRef), true);
    assert.equal(prompt.includes('environment=preview'), true);
    const nonInteractive = await executePairConsultLocalFakeTransport({
      repoRoot: ROOT,
      isControllingTerminal: () => false,
      observe: () => cleanObservation(),
      readConfirmation: async () => {
        confirmed += 1;
        return consultConfirmationPhrase('a'.repeat(40));
      },
    });
    assert.equal(quiet.reason, 'FORGED_AUTHORIZATION');
    assert.equal(incomplete.reason, 'CONFIRMATION_MISMATCH');
    assert.equal(nonInteractive.reason, 'NONINTERACTIVE');
    assert.equal(confirmed, 0);
    assert.equal(secrets, 0);
  });

  it('refuses the wrong target and drives one fake-transport transaction without a runtime claim', async () => {
    const sql = bytes();
    const identity = evaluatePairConsultExactVersionIdentity({
      projectRef: PAIR_CONSULT_EXACT_VERSION.projectRef,
      sqlBytes: sql,
      localOnlyVersions: [PAIR_CONSULT_EXACT_VERSION.version],
    });
    assert.equal(identity.ok, true);
    if (!identity.ok) return;
    const wrongHost = await runOperated({
      credential: { host: 'db.hsdxixvoijuujhpyxgdo.supabase.co' },
    });
    assert.equal(wrongHost.result.reason, 'POOLER_HOST_MISMATCH');
    assert.equal(wrongHost.clients.length, 0);
    assert.equal(wrongHost.credentialReads, 1);
    assert.equal(JSON.stringify(wrongHost.result).includes(PASSWORD), false);
    const wrongUser = await runOperated({ credential: { user: 'postgres' } });
    assert.equal(wrongUser.result.reason, 'CONNECTION_USER_NOT_PROJECT_BOUND');
    assert.equal(wrongUser.clients.length, 0);
    const badSecret = await runOperated({ credentialText: `{${PASSWORD}}` });
    assert.equal(badSecret.result.reason, 'CREDENTIAL_REJECTED');
    assert.equal(badSecret.clients.length, 0);
    const present = await runOperated({ scenario: { versionAlreadyPresent: true } });
    assert.equal(present.result.reason, 'VERSION_ALREADY_PRESENT');
    assert.equal(present.result.querySequence.includes('BEGIN'), false);
    const conflict = await runOperated({ scenario: { versionAppearsAfterBegin: true } });
    assert.equal(conflict.result.disposition, 'ROLLED_BACK');
    assert.equal(conflict.result.commitAttempts, 0);
    assert.equal(conflict.result.querySequence.includes('ADVISORY_LOCK'), true);
    const begin = await runOperated({ failBegin: true });
    assert.equal(begin.result.reason, 'BEGIN_FAILED');
    assert.equal(begin.result.querySequence.includes('COMMIT'), false);
    const rolled = await runOperated({ failStatement: true });
    assert.equal(rolled.result.disposition, 'ROLLED_BACK');
    assert.equal(rolled.result.querySequence.includes('COMMIT'), false);
    const uncertainRollback = await runOperated({ failStatement: true, rollbackAcknowledged: false });
    assert.equal(uncertainRollback.result.disposition, 'ROLLBACK_UNCERTAIN');
    assert.equal(uncertainRollback.result.commitAttempts, 0);
    const uncertainCommit = await runOperated({ transportLossOnCommit: true });
    assert.equal(uncertainCommit.result.disposition, 'COMMIT_ACK_UNCERTAIN');
    assert.equal(uncertainCommit.result.commitAttempts, 1);
    assert.equal(uncertainCommit.result.querySequence.filter((step) => step === 'COMMIT_THROWN').length, 1);
    assert.equal(uncertainCommit.result.querySequence.includes('POST_COMMIT_CONNECT'), false);
    assert.equal(uncertainCommit.clients.length, 1);
    const passed = await runOperated({});
    assert.equal(passed.result.disposition, 'LOCAL_TRANSPORT_CONTRACT_PASS');
    assert.equal(passed.result.runtimeApplied, false);
    assert.equal(passed.result.transactionCommitted, false);
    assert.equal(passed.result.transportEvidence, 'TEST_INJECTED');
    assert.equal(passed.result.catalogGreen, false);
    assert.equal(passed.result.catalogRuntimeVerified, false);
    assert.equal(passed.result.catalogContractMatched, true);
    assert.equal(passed.result.querySequence.filter((step) => step === 'COMMIT').length, 1);
    assert.equal(passed.result.querySequence.includes('POST_COMMIT_CONNECT'), true);
    assert.equal(passed.clients.length, 2);
    assert.equal(passed.clients[1]?.calls.includes('commit'), false);
    assert.equal(passed.clients[0]?.queries.some((query) => query.sql === CONSULT_ADVISORY_LOCK_SQL), true);
    assert.equal(JSON.stringify(passed.result).includes(PASSWORD), false);
    for (const defect of ['fk', 'unique', 'index', 'function', 'privilege', 'history'] as const) {
      const held = await runOperated({ scenario: { catalogDefect: defect } });
      assert.equal(held.result.disposition, 'COMMITTED_BUT_VERIFICATION_HOLD', defect);
      assert.equal(held.result.commitAttempts, 1);
      assert.equal(held.result.runtimeApplied, false);
    }
    const queryFailed = await runOperated({ scenario: { catalogDefect: 'query_fail' } });
    assert.equal(queryFailed.result.reason, 'CATALOG_QUERY_FAILED');
    assert.equal(queryFailed.result.disposition, 'COMMITTED_BUT_VERIFICATION_HOLD');
    const cleanup = await runOperated({ failPostClose: true });
    assert.equal(cleanup.result.disposition, 'COMMITTED_BUT_CLEANUP_HOLD');
    assert.equal(cleanup.result.commitAttempts, 1);
    assert.equal(cleanup.result.commitResponseClass, 'DEFINITIVE_COMMIT_ACK');
    assert.notEqual(cleanup.result.disposition, 'AUTHORIZATION_BLOCKED');
    const changed = await runOperated({ changeHeadAfterConfirmation: true });
    assert.equal(changed.result.reason, 'HEAD_CHANGED_AFTER_CONFIRMATION');
    assert.equal(changed.clients.length, 0);
    assert.equal(identity.statements.length > 0, true);
  });

  it('closes the PATCH-3 safety defects without a real database', async () => {
    assert.notEqual(process.stdin.isTTY, true);
    let confirmed = 0;
    let secrets = 0;
    const reachable = await executePairConsultLocalFakeTransport({
      repoRoot: ROOT,
      isControllingTerminal: () => true,
      observe: () => cleanObservation(),
      readConfirmation: async () => {
        confirmed += 1;
        return 'no';
      },
      readCredentialBytes: () => {
        secrets += 1;
        return Buffer.from(PASSWORD);
      },
    });
    assert.equal(confirmed, 1);
    assert.equal(secrets, 0);
    assert.equal(reachable.reason, 'CONFIRMATION_MISMATCH');
    const absentTerminal = await executePairConsultLocalFakeTransport({
      repoRoot: ROOT,
      isControllingTerminal: () => false,
      observe: () => cleanObservation(),
      readConfirmation: async () => {
        confirmed += 1;
        return consultConfirmationPhrase(OPERATED_HEAD);
      },
      readCredentialBytes: () => {
        secrets += 1;
        return Buffer.from(PASSWORD);
      },
    });
    assert.equal(absentTerminal.reason, 'NONINTERACTIVE');
    assert.equal(confirmed, 1);
    assert.equal(secrets, 0);
    const branchChanged = await runOperated({ changeBranchAfterConfirmation: true });
    assert.equal(branchChanged.result.reason, 'BRANCH_MISMATCH');
    assert.equal(branchChanged.clients.length, 0);
    assert.equal(branchChanged.credentialReads, 0);
    const worktreeChanged = await runOperated({ changeWorktreeAfterConfirmation: true });
    assert.equal(worktreeChanged.result.reason, 'WORKTREE_MISMATCH');
    assert.equal(worktreeChanged.clients.length, 0);
    assert.equal(worktreeChanged.credentialReads, 0);
    const afterCredentials = await runOperated({ changeHeadAfterCredentials: true });
    assert.equal(afterCredentials.result.reason, 'HEAD_CHANGED_AFTER_CONFIRMATION');
    assert.equal(afterCredentials.clients.length, 0);
    assert.equal(afterCredentials.credentialReads, 1);
    assert.equal(JSON.stringify(afterCredentials.result).includes(PASSWORD), false);
    const previous = process.env.PAIR_CONSULT_LIVE_EXECUTION_READY;
    process.env.PAIR_CONSULT_LIVE_EXECUTION_READY = 'true';
    try {
      const gated = await executePairConsultHumanOperatedPreview({
        repoRoot: ROOT,
        yes: false,
        authorized: false,
        isControllingTerminal: () => true,
        observe: () => cleanObservation(),
        readConfirmation: async () => {
          confirmed += 1;
          return consultConfirmationPhrase(OPERATED_HEAD);
        },
        readCredentialBytes: () => {
          secrets += 1;
          return Buffer.from(PASSWORD);
        },
        presentedAuthorization: { schema: 'M55_PAIR_P5_HUMAN_PREVIEW_UI_ATTESTATION_v1' },
      });
      assert.equal(gated.disposition, 'AUTHORIZATION_BLOCKED');
      assert.equal(gated.reason, 'FORGED_AUTHORIZATION');
      const liveClosed = await executePairConsultHumanOperatedPreview({
        repoRoot: ROOT,
        isControllingTerminal: () => true,
        observe: () => cleanObservation(),
        readConfirmation: async () => {
          confirmed += 1;
          return consultConfirmationPhrase(OPERATED_HEAD);
        },
        readCredentialBytes: () => {
          secrets += 1;
          return Buffer.from(PASSWORD);
        },
        claimedTransportLabel: 'PG_REAL_SESSION_POOLER_TLS_PINNED_V1',
      });
      const expectedGate = consultControllingTerminalAvailable() ? 'LIVE_EXECUTION_DENIED' : 'NONINTERACTIVE';
      assert.equal(liveClosed.reason, expectedGate);
      assert.equal(liveClosed.liveExecutionReady, false);
      assert.equal(consultLiveMutationPermitted(), false);
    } finally {
      if (previous === undefined) delete process.env.PAIR_CONSULT_LIVE_EXECUTION_READY;
      else process.env.PAIR_CONSULT_LIVE_EXECUTION_READY = previous;
    }
    assert.equal(confirmed, 1);
    assert.equal(secrets, 0);
    const labeled = await runOperated({ claimedTransportLabel: 'PG_REAL_SESSION_POOLER_TLS_PINNED_V1' });
    assert.equal(labeled.result.disposition, 'LOCAL_TRANSPORT_CONTRACT_PASS');
    assert.equal(labeled.result.transportEvidence, 'TEST_INJECTED');
    assert.equal(labeled.result.runtimeApplied, false);
    assert.equal(labeled.result.catalogRuntimeVerified, false);
    assert.equal(classifyConsultTransportEvidence({
      createClient: () => {
        throw new Error('unused');
      },
    }, 'PG_REAL_SESSION_POOLER_TLS_PINNED_V1'), 'TEST_INJECTED');
    assert.equal(classifyConsultTransportEvidence({}, 'TEST_INJECTED'), 'PG_REAL_SESSION_POOLER_TLS_PINNED_V1');
    assert.equal(interpretConsultTransportProfile('caller-says-real', 'PG_REAL_SESSION_POOLER_TLS_PINNED_V1'), 'UNKNOWN');
    const realHold = projectConsultExecutionTruth({
      transportEvidence: 'PG_REAL_SESSION_POOLER_TLS_PINNED_V1',
      commitResponseClass: 'DEFINITIVE_COMMIT_ACK',
      catalogContractMatched: false,
    });
    assert.equal(realHold.transactionCommitted, true);
    assert.equal(realHold.runtimeApplied, true);
    assert.equal(realHold.catalogRuntimeVerified, false);
    assert.equal(realHold.realDisposition, 'COMMITTED_BUT_VERIFICATION_HOLD');
    const realVerified = projectConsultExecutionTruth({
      transportEvidence: 'PG_REAL_SESSION_POOLER_TLS_PINNED_V1',
      commitResponseClass: 'DEFINITIVE_COMMIT_ACK',
      catalogContractMatched: true,
    });
    assert.equal(realVerified.catalogRuntimeVerified, true);
    assert.equal(realVerified.realDisposition, 'REAL_COMMIT_CATALOG_VERIFIED');
    const fakeTruth = projectConsultExecutionTruth({
      transportEvidence: 'TEST_INJECTED',
      commitResponseClass: 'DEFINITIVE_COMMIT_ACK',
      catalogContractMatched: true,
    });
    assert.equal(fakeTruth.runtimeApplied, false);
    assert.equal(fakeTruth.catalogRuntimeVerified, false);
    const guardFailed = await runOperated({ failPostGuard: true });
    assert.equal(guardFailed.result.disposition, 'COMMITTED_BUT_VERIFICATION_HOLD');
    assert.equal(guardFailed.result.reason, 'POST_COMMIT_GUARD_FAILED');
    assert.equal(guardFailed.result.commitAttempts, 1);
    assert.equal(guardFailed.result.commitResponseClass, 'DEFINITIVE_COMMIT_ACK');
    assert.equal(guardFailed.result.querySequence.filter((step) => step === 'COMMIT').length, 1);
    assert.equal(JSON.stringify(guardFailed.result).includes(PASSWORD), false);
    assert.equal(JSON.stringify(guardFailed.result).includes('postgres://'), false);
    let injected = 0;
    const malicious = await executePairConsultLocalFakeTransport({
      repoRoot: ROOT,
      isControllingTerminal: () => true,
      observe: () => cleanObservation(),
      readConfirmation: async () => {
        confirmed += 1;
        return consultConfirmationPhrase(OPERATED_HEAD);
      },
      readCredentialBytes: () => {
        secrets += 1;
        return Buffer.from(PASSWORD);
      },
      transportDeps: {
        createClient: () => {
          injected += 1;
          throw new Error('network');
        },
      },
    } as Parameters<typeof executePairConsultLocalFakeTransport>[0]);
    assert.equal(malicious.reason, 'LOCAL_FAKE_CALLER_TRANSPORT_FORBIDDEN');
    assert.equal(malicious.runtimeApplied, false);
    assert.equal(malicious.transactionCommitted, false);
    assert.equal(malicious.catalogRuntimeVerified, false);
    assert.equal(injected, 0);
    assert.equal(confirmed, 1);
    assert.equal(secrets, 0);
    assert.equal(readLastLocalFakeTransportTrace().length, 0);
    const hooked = await executePairConsultLocalFakeTransport({
      repoRoot: ROOT,
      isControllingTerminal: () => true,
      observe: () => cleanObservation(),
      localFakeScenario: {
        failBegin: true,
        queryHandler: () => ({ rows: [], rowCount: 0 }),
      } as never,
    });
    assert.equal(hooked.reason, 'LOCAL_FAKE_SCENARIO_REJECTED');
    assert.equal(hooked.runtimeApplied, false);
  });
});

const OPERATED_HEAD = 'a'.repeat(40);

function cleanObservation(head = OPERATED_HEAD): ConsultOperationalObservation {
  return {
    ok: true,
    branch: PAIR_CONSULT_EXACT_VERSION.branch,
    head,
    worktree: PAIR_CONSULT_WORKTREE,
    migrationBlobSha1: PAIR_CONSULT_EXACT_VERSION.gitBlobSha1,
    sourceClean: true,
  };
}

function credentialBuffer(overrides: Record<string, unknown> = {}): Buffer {
  return Buffer.from(JSON.stringify({
    host: SESSION_POOLER_HOST,
    port: EXPECTED_PORT,
    database: 'postgres',
    user: expectedConnectionUserForProjectRef(APPROVED_PREVIEW_PROJECT_REF),
    password: PASSWORD,
    sslmode: EXPECTED_SSLMODE,
    tlsCaPem: PINNED_CA,
    ...overrides,
  }));
}

async function runOperated(input: {
  readonly credential?: Record<string, unknown>;
  readonly credentialText?: string;
  readonly scenario?: { readonly versionAlreadyPresent?: boolean; readonly versionAppearsAfterBegin?: boolean; readonly catalogDefect?: ConsultCatalogDefect };
  readonly failBegin?: boolean;
  readonly failStatement?: boolean;
  readonly rollbackAcknowledged?: boolean;
  readonly transportLossOnCommit?: boolean;
  readonly failPostClose?: boolean;
  readonly failPostGuard?: boolean;
  readonly changeHeadAfterConfirmation?: boolean;
  readonly changeBranchAfterConfirmation?: boolean;
  readonly changeWorktreeAfterConfirmation?: boolean;
  readonly changeHeadAfterCredentials?: boolean;
  readonly claimedTransportLabel?: string;
}): Promise<{ result: Awaited<ReturnType<typeof executePairConsultLocalFakeTransport>>; clients: ReturnType<typeof readLastLocalFakeTransportTrace>; credentialReads: number }> {
  const identity = evaluatePairConsultExactVersionIdentity({
    projectRef: PAIR_CONSULT_EXACT_VERSION.projectRef,
    sqlBytes: bytes(),
    localOnlyVersions: [PAIR_CONSULT_EXACT_VERSION.version],
  });
  if (!identity.ok) throw new Error(identity.reason);
  let observations = 0;
  let credentialReads = 0;
  const result = await executePairConsultLocalFakeTransport({
    repoRoot: ROOT,
    isControllingTerminal: () => true,
    claimedTransportLabel: input.claimedTransportLabel,
    localFakeScenario: {
      versionAlreadyPresent: input.scenario?.versionAlreadyPresent,
      versionAppearsAfterBegin: input.scenario?.versionAppearsAfterBegin,
      catalogDefect: input.scenario?.catalogDefect,
      failBegin: input.failBegin,
      failOnStatement: input.failStatement,
      rollbackAcknowledged: input.rollbackAcknowledged,
      transportLossOnCommit: input.transportLossOnCommit,
      failPostClose: input.failPostClose,
      failPostGuard: input.failPostGuard,
    },
    observe: () => {
      observations += 1;
      if (input.changeBranchAfterConfirmation && observations > 1) {
        return { ...cleanObservation(), branch: 'other-branch' };
      }
      if (input.changeWorktreeAfterConfirmation && observations > 1) {
        return { ...cleanObservation(), worktree: '/tmp/other-worktree' };
      }
      const head = input.changeHeadAfterConfirmation && observations > 1
        ? 'b'.repeat(40)
        : input.changeHeadAfterCredentials && observations > 2
          ? 'c'.repeat(40)
          : OPERATED_HEAD;
      return cleanObservation(head);
    },
    readConfirmation: async () => consultConfirmationPhrase(OPERATED_HEAD),
    readCredentialBytes: () => {
      credentialReads += 1;
      return Buffer.from(input.credentialText ?? credentialBuffer(input.credential));
    },
    writePrompt: () => undefined,
  });
  return { result, clients: readLastLocalFakeTransportTrace(), credentialReads };
}
