import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  EXECUTION_SQL_AUTHORITY_FOUNDATION_ID,
  EXPECTED_FOUNDATION_BASE_HEAD,
  FOUNDATION_MISSING_AUTHORITIES,
  FOUNDATION_REL_PATHS,
  loadExecutionSqlAuthorityFoundationDocument,
  loadExecutionSqlAuthorityFoundationManifest,
  validateExecutionSqlAuthorityFoundation,
} from './previewRemoteApply/executionSqlAuthorityFoundation.ts';
import {
  APPROVED_CREDENTIAL_METHODS,
  APPROVED_PREVIEW_PROJECT_REF,
  calculateCanonicalHostFingerprint,
  buildCredentialAcquisitionPlan,
  EVIDENCE_ALLOWED_FIELDS,
  EVIDENCE_FORBIDDEN_FIELDS,
  EXECUTION_SQL_AUTHORITY_FOUNDATION_MANIFEST_ID,
  EXPECTED_REMOTE_CONNECTION_AUTHORITY,
  expectedConnectionUserForProjectRef,
  POST_CONNECT_GUARD_BINDING,
  POST_CONNECT_GUARD_SQL,
  POST_CONNECT_GUARD_SQL_SHA256,
  REMOTE_CONNECTION_AUTHORITY_ID,
  REMOTE_EXECUTION_LIFECYCLE_AUTHORITY_ID,
  SESSION_POOLER_CONNECTION_ENDPOINT_PROFILE,
  SESSION_POOLER_HOST,
  SESSION_POOLER_HOST_FINGERPRINT_SHA256,
  validateCredentialMethodSelection,
  validateNonsecretTargetBinding,
  validateRemoteConnectionAuthorityDocument,
  type ExpectedAuthorizationBinding,
  type ObservedPreConnectFacts,
} from './previewRemoteApply/remoteConnectionAuthority.ts';
import * as connectionAuthorityModule from './previewRemoteApply/remoteConnectionAuthority.ts';
import { EXPECTED_BRANCH } from './previewRemoteApply/types.ts';

const REPO_ROOT = join(import.meta.dirname, '../..');
const CONNECTION_JSON_PATH = FOUNDATION_REL_PATHS.connectionAuthorityJson;
const VALID_PROJECT_REF = APPROVED_PREVIEW_PROJECT_REF;
const VALID_HOST = SESSION_POOLER_HOST;
const VALID_CONNECTION_USER = expectedConnectionUserForProjectRef(VALID_PROJECT_REF);
const HUMAN_EXEC_AUTH_ID = 'M55-HUMAN-EXEC-AUTH-TEST-001';
const ALT_VALID_HEAD = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const ALT_VALID_TREE = 'cccccccccccccccccccccccccccccccccccccccc';

function readRepo(relPath: string): string {
  return readFileSync(join(REPO_ROOT, relPath), 'utf8');
}

function validHostFingerprint(): string {
  const result = calculateCanonicalHostFingerprint(VALID_HOST);
  assert.equal(result.ok, true);
  assert.equal(result.fingerprintSha256, SESSION_POOLER_HOST_FINGERPRINT_SHA256);
  return result.fingerprintSha256;
}

function validExpectedBinding(
  overrides: Partial<ExpectedAuthorizationBinding> = {},
): ExpectedAuthorizationBinding {
  return {
    environment: 'Preview',
    organizationSlug: 'm55-preview',
    projectName: 'm55-soul-preview',
    databaseSource: 'Primary Database',
    databaseName: 'postgres',
    expectedCurrentUser: 'postgres',
    connectionEndpointProfile: SESSION_POOLER_CONNECTION_ENDPOINT_PROFILE,
    connectionUser: VALID_CONNECTION_USER,
    projectRef: VALID_PROJECT_REF,
    host: VALID_HOST,
    hostFingerprintSha256: validHostFingerprint(),
    port: 5432,
    sslmode: 'require',
    credentialMethod: APPROVED_CREDENTIAL_METHODS[0],
    repositoryBranch: EXPECTED_BRANCH,
    repositoryHead: EXPECTED_FOUNDATION_BASE_HEAD,
    repositoryTree: ALT_VALID_TREE,
    executionAuthorizationId: HUMAN_EXEC_AUTH_ID,
    selectedStep: 'P1',
    executionSqlAuthorityFoundationId: EXECUTION_SQL_AUTHORITY_FOUNDATION_ID,
    executionSqlAuthorityFoundationManifestId: EXECUTION_SQL_AUTHORITY_FOUNDATION_MANIFEST_ID,
    remoteExecutionLifecycleAuthorityId: REMOTE_EXECUTION_LIFECYCLE_AUTHORITY_ID,
    remoteConnectionAuthorityId: REMOTE_CONNECTION_AUTHORITY_ID,
    ...overrides,
  };
}

function toObservedFacts(binding: ExpectedAuthorizationBinding): ObservedPreConnectFacts {
  return {
    environment: binding.environment,
    organizationSlug: binding.organizationSlug,
    projectName: binding.projectName,
    databaseSource: binding.databaseSource,
    databaseName: binding.databaseName,
    expectedCurrentUser: binding.expectedCurrentUser,
    connectionEndpointProfile: binding.connectionEndpointProfile,
    connectionUser: binding.connectionUser,
    projectRef: binding.projectRef,
    host: binding.host,
    hostFingerprintSha256: binding.hostFingerprintSha256,
    port: binding.port,
    sslmode: binding.sslmode,
    credentialMethod: binding.credentialMethod,
    repositoryBranch: binding.repositoryBranch,
    repositoryHead: binding.repositoryHead,
    repositoryTree: binding.repositoryTree,
    executionAuthorizationId: binding.executionAuthorizationId,
    selectedStep: binding.selectedStep,
    executionSqlAuthorityFoundationId: binding.executionSqlAuthorityFoundationId,
    executionSqlAuthorityFoundationManifestId: binding.executionSqlAuthorityFoundationManifestId,
    remoteExecutionLifecycleAuthorityId: binding.remoteExecutionLifecycleAuthorityId,
    remoteConnectionAuthorityId: binding.remoteConnectionAuthorityId,
  };
}

const INHERITED_POLLUTION_KEY = 'm55InheritedEnumerableInspection';

function withInheritedEnumerablePrototypePollution<T>(fn: () => T): T {
  const proto = Object.prototype as Record<string, unknown>;
  const priorDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, INHERITED_POLLUTION_KEY);
  try {
    Object.defineProperty(Object.prototype, INHERITED_POLLUTION_KEY, {
      enumerable: true,
      configurable: true,
      writable: true,
      value: 'pollution',
    });
    return fn();
  } finally {
    if (priorDescriptor) {
      Object.defineProperty(Object.prototype, INHERITED_POLLUTION_KEY, priorDescriptor);
    } else {
      delete proto[INHERITED_POLLUTION_KEY];
    }
  }
}

function validBindingInput(
  overrides: {
    expected?: Partial<ExpectedAuthorizationBinding>;
    observed?: Partial<ObservedPreConnectFacts>;
  } = {},
) {
  const expected = validExpectedBinding(overrides.expected);
  const observed = { ...toObservedFacts(expected), ...overrides.observed };
  return { expected, observed };
}

function receiptBindingIdentifier(binding: ReturnType<typeof validBindingInput>): string {
  const result = validateNonsecretTargetBinding(binding);
  assert.equal(result.ok, true);
  if (!result.ok) return '';
  return result.receipt.targetBindingIdentifier;
}

function createTempConnectionMutationRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'm55-connection-mutation-'));
  const paths = [
    ...Object.values(FOUNDATION_REL_PATHS),
    'docs/planning/preview-baseline/preview_baseline_execution_oracle_v1.json',
    'scripts/m55/previewBaselineDisposableRuntime.ts',
  ];
  for (const relPath of paths) {
    const dest = join(root, relPath);
    mkdirSync(join(dest, '..'), { recursive: true });
    cpSync(join(REPO_ROOT, relPath), dest);
  }
  return root;
}

function loadConnectionDocumentFromRepo(): Record<string, unknown> {
  return JSON.parse(readRepo(CONNECTION_JSON_PATH)) as Record<string, unknown>;
}

describe('remote connection authority rev1 C1-C20', () => {
  it('C1 exact approved stdin method accepted', () => {
    const result = validateCredentialMethodSelection({
      credentialMethod: 'SECURE_STDIN_CONNECTION_CONFIG_v1',
    });
    assert.equal(result.ok, true);
    const binding = validateNonsecretTargetBinding(
      validBindingInput({
        expected: { credentialMethod: 'SECURE_STDIN_CONNECTION_CONFIG_v1' },
      }),
    );
    assert.equal(binding.ok, true);
    assert.equal(binding.outcome, 'PASS_TARGET_BINDING');
  });

  it('C2 exact pgpass method accepted', () => {
    const result = validateCredentialMethodSelection({
      credentialMethod: 'TEMP_PGPASSFILE_0600_v1',
    });
    assert.equal(result.ok, true);
    const binding = validateNonsecretTargetBinding(
      validBindingInput({
        expected: { credentialMethod: 'TEMP_PGPASSFILE_0600_v1' },
      }),
    );
    assert.equal(binding.ok, true);
    assert.equal(binding.outcome, 'PASS_TARGET_BINDING');
  });

  it('C3 unknown credential method rejected', () => {
    const result = validateCredentialMethodSelection({ credentialMethod: 'UNKNOWN_METHOD' });
    assert.equal(result.ok, false);
    assert.equal(result.holdReasonCode, 'HOLD_CREDENTIAL_METHOD_INVALID');
  });

  it('C4 ambient env fallback rejected', () => {
    const result = validateCredentialMethodSelection({
      credentialMethod: APPROVED_CREDENTIAL_METHODS[0],
      ambientEnvFallback: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.holdReasonCode, 'HOLD_CREDENTIAL_METHOD_INVALID');
  });

  it('C5 argv/DSN credential input rejected', () => {
    const argv = validateCredentialMethodSelection({
      credentialMethod: APPROVED_CREDENTIAL_METHODS[0],
      credentialInArgv: true,
    });
    assert.equal(argv.ok, false);
    assert.equal(argv.holdReasonCode, 'HOLD_CREDENTIAL_METHOD_INVALID');

    const dsn = validateCredentialMethodSelection({
      credentialMethod: APPROVED_CREDENTIAL_METHODS[0],
      credentialDsnInput: true,
    });
    assert.equal(dsn.ok, false);
    assert.equal(dsn.holdReasonCode, 'HOLD_CREDENTIAL_METHOD_INVALID');
  });

  it('C6 secret-bearing field in public evidence rejected', () => {
    const result = validateCredentialMethodSelection({
      credentialMethod: APPROVED_CREDENTIAL_METHODS[0],
      evidenceFields: ['password'],
    });
    assert.equal(result.ok, false);
    assert.equal(result.holdReasonCode, 'HOLD_CREDENTIAL_METHOD_INVALID');
    assert.ok(EVIDENCE_FORBIDDEN_FIELDS.includes('password'));
    assert.ok(!EVIDENCE_ALLOWED_FIELDS.includes('password'));
  });

  it('C7 missing project_ref rejected', () => {
    const result = validateNonsecretTargetBinding(validBindingInput({ expected: { projectRef: '' } }));
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_TARGET_FINGERPRINT_INCOMPLETE');
  });

  it('C8 missing host fingerprint rejected', () => {
    const result = validateNonsecretTargetBinding(
      validBindingInput({ expected: { hostFingerprintSha256: '' } }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_TARGET_FINGERPRINT_INCOMPLETE');
  });

  it('C9 host fingerprint mismatch rejected', () => {
    const result = validateNonsecretTargetBinding(
      validBindingInput({ expected: { hostFingerprintSha256: 'f'.repeat(64) } }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_TARGET_IDENTITY_MISMATCH');
  });

  it('C10 Production target rejected', () => {
    const org = validateNonsecretTargetBinding(
      validBindingInput({ expected: { organizationSlug: 'm55-soul' } }),
    );
    assert.equal(org.ok, false);
    assert.equal(org.outcome, 'HOLD_TARGET_PRODUCTION_FORBIDDEN');

    const project = validateNonsecretTargetBinding(
      validBindingInput({ expected: { projectName: 'm55-soul-core' } }),
    );
    assert.equal(project.ok, false);
    assert.equal(project.outcome, 'HOLD_TARGET_PRODUCTION_FORBIDDEN');
  });

  it('C11 localhost/private substitute rejected', () => {
    const localhost = calculateCanonicalHostFingerprint('localhost');
    assert.equal(localhost.ok, false);
    assert.equal(localhost.rejectionReason, 'HOLD_TARGET_PRODUCTION_FORBIDDEN');

    const binding = validateNonsecretTargetBinding(
      validBindingInput({ expected: { host: 'localhost' } }),
    );
    assert.equal(binding.ok, false);
    assert.equal(binding.outcome, 'HOLD_TARGET_PRODUCTION_FORBIDDEN');
  });

  it('C12 wrong organization/project/source/database/user rejected', () => {
    const cases = [
      { organizationSlug: 'wrong-org' },
      { projectName: 'wrong-project' },
      { databaseSource: 'wrong-tier' },
      { databaseName: 'wrong-db' },
      { expectedCurrentUser: 'wrong-user' },
    ] as const;
    for (const override of cases) {
      const result = validateNonsecretTargetBinding(validBindingInput({ expected: override }));
      assert.equal(result.ok, false, JSON.stringify(override));
      assert.equal(result.outcome, 'HOLD_TARGET_IDENTITY_MISMATCH');
    }
  });

  it('C13 wrong branch/head/tree rejected', () => {
    const branch = validateNonsecretTargetBinding(
      validBindingInput({ expected: { repositoryBranch: 'wrong-branch' } }),
    );
    assert.equal(branch.ok, false);
    assert.equal(branch.outcome, 'HOLD_REPO_IDENTITY_MISMATCH');

    const head = validateNonsecretTargetBinding(
      validBindingInput({ expected: { repositoryHead: 'not-a-commit-sha' } }),
    );
    assert.equal(head.ok, false);
    assert.equal(head.outcome, 'HOLD_REPO_IDENTITY_MISMATCH');
  });

  it('C14 selected step outside P1-P7 rejected', () => {
    const result = validateNonsecretTargetBinding(validBindingInput({ expected: { selectedStep: 'P8' } }));
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C15 boolean-only execute authorization rejected', () => {
    const result = validateNonsecretTargetBinding(
      validBindingInput({ expected: { executeBooleanOnly: true } }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C16 credential plan remains unimplemented/nonsecret', () => {
    const binding = validBindingInput();
    const planResult = buildCredentialAcquisitionPlan(binding);
    assert.equal(planResult.ok, true);
    if (!planResult.ok) return;
    const plan = planResult.plan;
    assert.equal(plan.implementation_status, 'UNIMPLEMENTED');
    assert.equal(plan.execution_authorized, false);
    assert.equal(plan.acquisition_implemented, false);
    assert.match(plan.target_binding_identifier, /^[0-9a-f]{64}$/);
    assert.equal(JSON.stringify(plan).includes('password'), false);
    assert.equal(JSON.stringify(plan).includes('secret'), false);
  });

  it('C17 post-connect guard binding exact', () => {
    assert.equal(POST_CONNECT_GUARD_BINDING.sql, POST_CONNECT_GUARD_SQL);
    assert.equal(POST_CONNECT_GUARD_BINDING.sql_sha256, POST_CONNECT_GUARD_SQL_SHA256);
    assert.equal(
      createHash('sha256').update(POST_CONNECT_GUARD_SQL, 'utf8').digest('hex'),
      POST_CONNECT_GUARD_SQL_SHA256,
    );
    assert.equal(POST_CONNECT_GUARD_BINDING.expected.current_database_name, 'postgres');
    assert.equal(POST_CONNECT_GUARD_BINDING.expected.current_user_name, 'postgres');
    assert.equal(POST_CONNECT_GUARD_BINDING.expected.row_count, 1);
    const doc = loadConnectionDocumentFromRepo();
    assert.deepEqual(doc.post_connect_guard_binding, POST_CONNECT_GUARD_BINDING);
  });

  it('C18 connection authority document mutation rejected', () => {
    const doc = loadConnectionDocumentFromRepo();
    const validation = validateRemoteConnectionAuthorityDocument(
      doc as Parameters<typeof validateRemoteConnectionAuthorityDocument>[0],
    );
    assert.equal(validation.ok, true, validation.mismatchCategories.join(','));

    const mutated = loadConnectionDocumentFromRepo();
    const globalRules = mutated.global_credential_rules as Record<string, unknown>;
    globalRules.execution_authorized = true;
    const mutationValidation = validateRemoteConnectionAuthorityDocument(
      mutated as Parameters<typeof validateRemoteConnectionAuthorityDocument>[0],
    );
    assert.equal(mutationValidation.ok, false);
    assert.ok(mutationValidation.mismatchCategories.some((entry) => entry.includes('execution_authorized')));
  });

  it('C19 only credential/target missing authorities removed', () => {
    const foundation = loadExecutionSqlAuthorityFoundationDocument(REPO_ROOT);
    const manifest = loadExecutionSqlAuthorityFoundationManifest(REPO_ROOT);
    assert.deepEqual(foundation.missing_authorities, ['remote executor implementation']);
    assert.deepEqual(manifest.missing_authorities, foundation.missing_authorities);
    assert.deepEqual([...FOUNDATION_MISSING_AUTHORITIES], foundation.missing_authorities);

    const tempRoot = createTempConnectionMutationRoot();
    const foundationDoc = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), 'utf8'));
    foundationDoc.missing_authorities = [
      'credential acquisition',
      'target connection binding',
      'remote executor implementation',
    ];
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), `${JSON.stringify(foundationDoc, null, 2)}\n`);
    const validation = validateExecutionSqlAuthorityFoundation(tempRoot);
    assert.equal(validation.ok, false);
    assert.ok(validation.mismatchCategories.some((entry) => entry.includes('missing_authorities')));

    assert.equal(foundation.credential_acquisition_authority?.frozen, true);
    assert.equal(foundation.credential_acquisition_authority?.acquisition_implemented, false);
    assert.equal(foundation.target_connection_binding_authority?.frozen, true);
    assert.equal(foundation.target_connection_binding_authority?.target_binding_implemented, false);
    assert.equal(foundation.remote_connection_authority?.path, CONNECTION_JSON_PATH);
    assert.equal(EXPECTED_REMOTE_CONNECTION_AUTHORITY.identifier, REMOTE_CONNECTION_AUTHORITY_ID);
  });

  it('C20 remote executor missing authority preserved', () => {
    const foundation = loadExecutionSqlAuthorityFoundationDocument(REPO_ROOT);
    const manifest = loadExecutionSqlAuthorityFoundationManifest(REPO_ROOT);
    assert.ok(foundation.missing_authorities.includes('remote executor implementation'));
    assert.ok(manifest.missing_authorities.includes('remote executor implementation'));
    assert.equal(foundation.missing_authorities.length, 1);
    assert.equal(manifest.missing_authorities.length, 1);

    const tempRoot = createTempConnectionMutationRoot();
    const foundationDoc = JSON.parse(readFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), 'utf8'));
    foundationDoc.missing_authorities = ['remote executor implementation', 'extra authority'];
    writeFileSync(join(tempRoot, FOUNDATION_REL_PATHS.foundationJson), `${JSON.stringify(foundationDoc, null, 2)}\n`);
    const validation = validateExecutionSqlAuthorityFoundation(tempRoot);
    assert.equal(validation.ok, false);
    assert.ok(validation.mismatchCategories.some((entry) => entry.includes('missing_authorities')));
  });
});

describe('remote connection authority correction-1 C21-C32', () => {
  it('C21 HEAD mismatch with both valid 40-hex rejected', () => {
    const result = validateNonsecretTargetBinding(
      validBindingInput({
        expected: { repositoryHead: EXPECTED_FOUNDATION_BASE_HEAD },
        observed: { repositoryHead: ALT_VALID_HEAD },
      }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_REPO_IDENTITY_MISMATCH');
  });

  it('C22 tree mismatch rejected', () => {
    const result = validateNonsecretTargetBinding(
      validBindingInput({
        expected: { repositoryTree: ALT_VALID_TREE },
        observed: { repositoryTree: 'dddddddddddddddddddddddddddddddddddddddd' },
      }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_REPO_IDENTITY_MISMATCH');
  });

  it('C23 step mismatch rejected', () => {
    const result = validateNonsecretTargetBinding(
      validBindingInput({
        expected: { selectedStep: 'P1' },
        observed: { selectedStep: 'P2' },
      }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C24 credential method mismatch rejected', () => {
    const result = validateNonsecretTargetBinding(
      validBindingInput({
        expected: { credentialMethod: 'SECURE_STDIN_CONNECTION_CONFIG_v1' },
        observed: { credentialMethod: 'TEMP_PGPASSFILE_0600_v1' },
      }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_CREDENTIAL_METHOD_INVALID');
  });

  it('C25 project_ref/host/fingerprint mismatch rejected', () => {
    const altRef = 'other-preview-ref';
    const altHost = 'aws-0-us-east-1.pooler.supabase.com';
    const altFingerprint = calculateCanonicalHostFingerprint(altHost);
    assert.equal(altFingerprint.ok, true);

    const projectRef = validateNonsecretTargetBinding(
      validBindingInput({
        expected: { projectRef: VALID_PROJECT_REF },
        observed: { projectRef: altRef },
      }),
    );
    assert.equal(projectRef.ok, false);
    assert.equal(projectRef.outcome, 'HOLD_TARGET_IDENTITY_MISMATCH');

    const host = validateNonsecretTargetBinding(
      validBindingInput({
        expected: { host: VALID_HOST },
        observed: { host: altHost },
      }),
    );
    assert.equal(host.ok, false);
    assert.equal(host.outcome, 'HOLD_TARGET_IDENTITY_MISMATCH');

    const fingerprint = validateNonsecretTargetBinding(
      validBindingInput({
        expected: { hostFingerprintSha256: validHostFingerprint() },
        observed: { hostFingerprintSha256: altFingerprint.fingerprintSha256 },
      }),
    );
    assert.equal(fingerprint.ok, false);
    assert.equal(fingerprint.outcome, 'HOLD_TARGET_IDENTITY_MISMATCH');
  });

  it('C26 foundation ID as execution authorization rejected', () => {
    const result = validateNonsecretTargetBinding(
      validBindingInput({
        expected: { executionAuthorizationId: EXECUTION_SQL_AUTHORITY_FOUNDATION_ID },
        observed: { executionAuthorizationId: EXECUTION_SQL_AUTHORITY_FOUNDATION_ID },
      }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C27 manifest/connection/lifecycle static ID substitution rejected', () => {
    const manifest = validateNonsecretTargetBinding(
      validBindingInput({
        expected: { executionAuthorizationId: EXECUTION_SQL_AUTHORITY_FOUNDATION_MANIFEST_ID },
        observed: { executionAuthorizationId: EXECUTION_SQL_AUTHORITY_FOUNDATION_MANIFEST_ID },
      }),
    );
    assert.equal(manifest.ok, false);
    assert.equal(manifest.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');

    const connection = validateNonsecretTargetBinding(
      validBindingInput({
        expected: { executionAuthorizationId: REMOTE_CONNECTION_AUTHORITY_ID },
        observed: { executionAuthorizationId: REMOTE_CONNECTION_AUTHORITY_ID },
      }),
    );
    assert.equal(connection.ok, false);
    assert.equal(connection.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');

    const lifecycle = validateNonsecretTargetBinding(
      validBindingInput({
        expected: { executionAuthorizationId: REMOTE_EXECUTION_LIFECYCLE_AUTHORITY_ID },
        observed: { executionAuthorizationId: REMOTE_EXECUTION_LIFECYCLE_AUTHORITY_ID },
      }),
    );
    assert.equal(lifecycle.ok, false);
    assert.equal(lifecycle.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C28 authority identity mismatch rejected', () => {
    const result = validateNonsecretTargetBinding(
      validBindingInput({
        expected: { remoteConnectionAuthorityId: REMOTE_CONNECTION_AUTHORITY_ID },
        observed: { remoteConnectionAuthorityId: 'M55_PREVIEW_REMOTE_CONNECTION_AUTHORITY_v2' },
      }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_AUTHORITY_IDENTITY_MISMATCH');
  });

  it('C29 invalid binding produces no plan', () => {
    const planResult = buildCredentialAcquisitionPlan(
      validBindingInput({
        expected: { executionAuthorizationId: EXECUTION_SQL_AUTHORITY_FOUNDATION_ID },
        observed: { executionAuthorizationId: EXECUTION_SQL_AUTHORITY_FOUNDATION_ID },
      }),
    );
    assert.equal(planResult.ok, false);
    if (planResult.ok) return;
    assert.equal(planResult.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C30 full valid binding PASS receipt', () => {
    const binding = validBindingInput();
    const result = validateNonsecretTargetBinding(binding);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.receipt.outcome, 'PASS_TARGET_BINDING');
    assert.match(result.receipt.targetBindingIdentifier, /^[0-9a-f]{64}$/);
    assert.equal(result.receipt.credentialMethod, binding.expected.credentialMethod);
    assert.equal(result.receipt.selectedStep, binding.expected.selectedStep);
    assert.equal(result.receipt.repositoryHead, binding.expected.repositoryHead);
    assert.equal(result.receipt.repositoryTree, binding.expected.repositoryTree);
    assert.equal(result.receipt.executionAuthorizationId, HUMAN_EXEC_AUTH_ID);
    assert.equal(JSON.stringify(result.receipt).includes(VALID_HOST), false);
    assert.equal(JSON.stringify(result.receipt).includes('host'), false);
  });

  it('C31 binding identifier changes with head/tree/step/method/exec auth', () => {
    const base = validBindingInput();
    const baseId = receiptBindingIdentifier(base);

    const headId = receiptBindingIdentifier(
      validBindingInput({
        expected: { repositoryHead: ALT_VALID_HEAD },
        observed: { repositoryHead: ALT_VALID_HEAD },
      }),
    );
    assert.notEqual(headId, baseId);

    const treeId = receiptBindingIdentifier(
      validBindingInput({
        expected: { repositoryTree: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' },
        observed: { repositoryTree: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' },
      }),
    );
    assert.notEqual(treeId, baseId);

    const stepId = receiptBindingIdentifier(
      validBindingInput({
        expected: { selectedStep: 'P2' },
        observed: { selectedStep: 'P2' },
      }),
    );
    assert.notEqual(stepId, baseId);

    const methodId = receiptBindingIdentifier(
      validBindingInput({
        expected: { credentialMethod: 'TEMP_PGPASSFILE_0600_v1' },
        observed: { credentialMethod: 'TEMP_PGPASSFILE_0600_v1' },
      }),
    );
    assert.notEqual(methodId, baseId);

    const execAuthId = receiptBindingIdentifier(
      validBindingInput({
        expected: { executionAuthorizationId: 'M55-HUMAN-EXEC-AUTH-TEST-002' },
        observed: { executionAuthorizationId: 'M55-HUMAN-EXEC-AUTH-TEST-002' },
      }),
    );
    assert.notEqual(execAuthId, baseId);
  });

  it('C32 valid receipt produces UNIMPLEMENTED plan', () => {
    const binding = validBindingInput();
    const bindingResult = validateNonsecretTargetBinding(binding);
    assert.equal(bindingResult.ok, true);
    if (!bindingResult.ok) return;

    const planResult = buildCredentialAcquisitionPlan(binding);
    assert.equal(planResult.ok, true);
    if (!planResult.ok) return;
    assert.equal(planResult.plan.implementation_status, 'UNIMPLEMENTED');
    assert.equal(planResult.plan.execution_authorized, false);
    assert.equal(planResult.plan.acquisition_implemented, false);
    assert.equal(
      planResult.plan.target_binding_identifier,
      bindingResult.receipt.targetBindingIdentifier,
    );
  });
});

describe('remote connection authority correction-2 C33-C42', () => {
  it('C33 empty expected/observed executionAuthorizationId rejected', () => {
    const result = validateNonsecretTargetBinding(
      validBindingInput({
        expected: { executionAuthorizationId: '' },
        observed: { executionAuthorizationId: '' },
      }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C34 whitespace-only executionAuthorizationId rejected', () => {
    const result = validateNonsecretTargetBinding(
      validBindingInput({
        expected: { executionAuthorizationId: '   ' },
        observed: { executionAuthorizationId: '   ' },
      }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C35 leading/trailing whitespace executionAuthorizationId rejected', () => {
    const padded = ` ${HUMAN_EXEC_AUTH_ID} `;
    const result = validateNonsecretTargetBinding(
      validBindingInput({
        expected: { executionAuthorizationId: padded },
        observed: { executionAuthorizationId: padded },
      }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C36 padded static authority identifier rejected', () => {
    const padded = ` ${EXECUTION_SQL_AUTHORITY_FOUNDATION_ID} `;
    const result = validateNonsecretTargetBinding(
      validBindingInput({
        expected: { executionAuthorizationId: padded },
        observed: { executionAuthorizationId: padded },
      }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C37 unknown extra field on expected binding rejected', () => {
    const expected = { ...validExpectedBinding(), unknownExtraField: true };
    const observed = toObservedFacts(validExpectedBinding());
    const result = validateNonsecretTargetBinding({
      expected: expected as ExpectedAuthorizationBinding,
      observed,
    });
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C38 unknown extra field on observed facts rejected', () => {
    const expected = validExpectedBinding();
    const observed = { ...toObservedFacts(expected), unknownObservedField: true };
    const result = validateNonsecretTargetBinding({
      expected,
      observed: observed as ObservedPreConnectFacts,
    });
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C39 password/token secret-bearing field on expected rejected', () => {
    const passwordBinding = { ...validExpectedBinding(), password: 'secret-value' };
    const passwordResult = validateNonsecretTargetBinding({
      expected: passwordBinding as ExpectedAuthorizationBinding,
      observed: toObservedFacts(validExpectedBinding()),
    });
    assert.equal(passwordResult.ok, false);
    assert.equal(passwordResult.outcome, 'HOLD_CREDENTIAL_METHOD_INVALID');

    const tokenBinding = { ...validExpectedBinding(), token: 'bearer-token' };
    const tokenResult = validateNonsecretTargetBinding({
      expected: tokenBinding as ExpectedAuthorizationBinding,
      observed: toObservedFacts(validExpectedBinding()),
    });
    assert.equal(tokenResult.ok, false);
    assert.equal(tokenResult.outcome, 'HOLD_CREDENTIAL_METHOD_INVALID');
  });

  it('C40 connectionString/pgpass secret-bearing field on observed rejected', () => {
    const expected = validExpectedBinding();
    const connectionStringObserved = {
      ...toObservedFacts(expected),
      connectionString: 'postgres://user:pass@host/db',
    };
    const connectionResult = validateNonsecretTargetBinding({
      expected,
      observed: connectionStringObserved as ObservedPreConnectFacts,
    });
    assert.equal(connectionResult.ok, false);
    assert.equal(connectionResult.outcome, 'HOLD_CREDENTIAL_METHOD_INVALID');

    const pgpassObserved = { ...toObservedFacts(expected), pgpass: '/tmp/.pgpass' };
    const pgpassResult = validateNonsecretTargetBinding({
      expected,
      observed: pgpassObserved as ObservedPreConnectFacts,
    });
    assert.equal(pgpassResult.ok, false);
    assert.equal(pgpassResult.outcome, 'HOLD_CREDENTIAL_METHOD_INVALID');
  });

  it('C41 non-plain/inherited or symbol-keyed binding rejected', () => {
    const plain = validExpectedBinding();
    const inherited = Object.create({ inheritedEnumerable: true });
    Object.assign(inherited, plain);
    const inheritedResult = validateNonsecretTargetBinding({
      expected: inherited as ExpectedAuthorizationBinding,
      observed: toObservedFacts(plain),
    });
    assert.equal(inheritedResult.ok, false);
    assert.equal(inheritedResult.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');

    const withSymbol = { ...plain, [Symbol('binding')]: true };
    const symbolResult = validateNonsecretTargetBinding({
      expected: withSymbol as unknown as ExpectedAuthorizationBinding,
      observed: toObservedFacts(plain),
    });
    assert.equal(symbolResult.ok, false);
    assert.equal(symbolResult.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C42 exact valid key sets still return PASS receipt and UNIMPLEMENTED plan', () => {
    const binding = validBindingInput();
    const validation = validateNonsecretTargetBinding(binding);
    assert.equal(validation.ok, true);
    if (!validation.ok) return;
    assert.equal(validation.receipt.outcome, 'PASS_TARGET_BINDING');
    assert.match(validation.receipt.targetBindingIdentifier, /^[0-9a-f]{64}$/);
    assert.equal(JSON.stringify(validation.receipt).includes('host'), false);

    const planResult = buildCredentialAcquisitionPlan(binding);
    assert.equal(planResult.ok, true);
    if (!planResult.ok) return;
    assert.equal(planResult.plan.implementation_status, 'UNIMPLEMENTED');
    assert.equal(planResult.plan.execution_authorized, false);
    assert.equal(planResult.plan.acquisition_implemented, false);
    assert.equal(
      planResult.plan.target_binding_identifier,
      validation.receipt.targetBindingIdentifier,
    );
    assert.equal(JSON.stringify(planResult.plan).includes('password'), false);
  });

  it('C43 non-enumerable password on expected binding rejected', () => {
    const expected = validExpectedBinding();
    Object.defineProperty(expected, 'password', {
      value: 'secret-value',
      enumerable: false,
      configurable: true,
    });
    const result = validateNonsecretTargetBinding({
      expected,
      observed: toObservedFacts(validExpectedBinding()),
    });
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_CREDENTIAL_METHOD_INVALID');
  });

  it('C44 non-enumerable unknown field on observed facts rejected', () => {
    const expected = validExpectedBinding();
    const observed = toObservedFacts(expected);
    Object.defineProperty(observed, 'unknownObservedField', {
      value: true,
      enumerable: false,
      configurable: true,
    });
    const result = validateNonsecretTargetBinding({ expected, observed });
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C45 getter property rejected without invoking getter', () => {
    let getterInvocations = 0;
    const expected = validExpectedBinding();
    Object.defineProperty(expected, 'host', {
      get() {
        getterInvocations += 1;
        return VALID_HOST;
      },
      enumerable: true,
      configurable: true,
    });
    const result = validateNonsecretTargetBinding({
      expected,
      observed: toObservedFacts(validExpectedBinding()),
    });
    assert.equal(getterInvocations, 0);
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C46 setter/accessor property rejected', () => {
    const expected = validExpectedBinding();
    Object.defineProperty(expected, 'projectRef', {
      set() {
        /* rejected before invocation */
      },
      enumerable: true,
      configurable: true,
    });
    const result = validateNonsecretTargetBinding({
      expected,
      observed: toObservedFacts(validExpectedBinding()),
    });
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C47 inherited enumerable property rejected', () => {
    const plain = validExpectedBinding();
    const inherited = Object.create({ inheritedEnumerable: 'forbidden' });
    Object.assign(inherited, plain);
    const result = validateNonsecretTargetBinding({
      expected: inherited as ExpectedAuthorizationBinding,
      observed: toObservedFacts(plain),
    });
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C48 projectRef number returns controlled HOLD and does not throw', () => {
    const expected = { ...validExpectedBinding(), projectRef: 123 };
    const observed = toObservedFacts(validExpectedBinding());
    const result = validateNonsecretTargetBinding({
      expected: expected as unknown as ExpectedAuthorizationBinding,
      observed,
    });
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C49 host object returns controlled HOLD and does not throw', () => {
    const expected = { ...validExpectedBinding(), host: {} };
    const observed = toObservedFacts(validExpectedBinding());
    const result = validateNonsecretTargetBinding({
      expected: expected as unknown as ExpectedAuthorizationBinding,
      observed,
    });
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C50 port string/NaN/Infinity rejected', () => {
    for (const port of ['5432', Number.NaN, Number.POSITIVE_INFINITY]) {
      const expected = { ...validExpectedBinding(), port };
      const observed = { ...toObservedFacts(validExpectedBinding()), port };
      const result = validateNonsecretTargetBinding({
        expected: expected as unknown as ExpectedAuthorizationBinding,
        observed: observed as unknown as ObservedPreConnectFacts,
      });
      assert.equal(result.ok, false);
      assert.equal(result.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
    }
  });

  it('C51 executeBooleanOnly non-boolean rejected', () => {
    const expected = { ...validExpectedBinding(), executeBooleanOnly: 'false' };
    const observed = toObservedFacts(validExpectedBinding());
    const result = validateNonsecretTargetBinding({
      expected: expected as unknown as ExpectedAuthorizationBinding,
      observed,
    });
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C52 secretFieldsInBinding non-array or non-string member rejected', () => {
    const nonArray = { ...validExpectedBinding(), secretFieldsInBinding: 0 };
    const nonArrayResult = validateNonsecretTargetBinding({
      expected: nonArray as unknown as ExpectedAuthorizationBinding,
      observed: toObservedFacts(validExpectedBinding()),
    });
    assert.equal(nonArrayResult.ok, false);
    assert.equal(nonArrayResult.outcome, 'HOLD_CREDENTIAL_METHOD_INVALID');

    const nonStringMember = { ...validExpectedBinding(), secretFieldsInBinding: [0] };
    const nonStringResult = validateNonsecretTargetBinding({
      expected: nonStringMember as unknown as ExpectedAuthorizationBinding,
      observed: toObservedFacts(validExpectedBinding()),
    });
    assert.equal(nonStringResult.ok, false);
    assert.equal(nonStringResult.outcome, 'HOLD_CREDENTIAL_METHOD_INVALID');
  });

  it('C53 boxed primitive field rejected', () => {
    const expected = { ...validExpectedBinding(), environment: new String('Preview') };
    const observed = toObservedFacts(validExpectedBinding());
    const result = validateNonsecretTargetBinding({
      expected: expected as unknown as ExpectedAuthorizationBinding,
      observed,
    });
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C54 arbitrary malformed expected/observed objects never throw', () => {
    const malformedInputs: unknown[] = [
      null,
      undefined,
      42,
      'binding',
      [],
      { expected: null, observed: null },
      { expected: { host: Symbol('host') }, observed: {} },
      { expected: validExpectedBinding(), observed: { port: () => 5432 } },
    ];
    for (const input of malformedInputs) {
      assert.doesNotThrow(() => {
        const result = validateNonsecretTargetBinding(input);
        assert.equal(result.ok, false);
      });
      const planResult = buildCredentialAcquisitionPlan(input);
      assert.equal(planResult.ok, false);
    }
    assert.doesNotThrow(() => {
      const credentialResult = validateCredentialMethodSelection({ credentialMethod: 123 });
      assert.equal(credentialResult.ok, false);
    });
  });

  it('C55 raw binding-hash helper is not publicly exported', () => {
    assert.equal('computeTargetBindingIdentifier' in connectionAuthorityModule, false);
  });

  it('C56 exact valid binding still yields PASS receipt and UNIMPLEMENTED plan', () => {
    const binding = validBindingInput();
    const validation = validateNonsecretTargetBinding(binding);
    assert.equal(validation.ok, true);
    if (!validation.ok) return;
    assert.equal(validation.receipt.outcome, 'PASS_TARGET_BINDING');
    assert.match(validation.receipt.targetBindingIdentifier, /^[0-9a-f]{64}$/);
    assert.equal(JSON.stringify(validation.receipt).includes('host'), false);

    const planResult = buildCredentialAcquisitionPlan(binding);
    assert.equal(planResult.ok, true);
    if (!planResult.ok) return;
    assert.equal(planResult.plan.implementation_status, 'UNIMPLEMENTED');
    assert.equal(planResult.plan.execution_authorized, false);
    assert.equal(planResult.plan.acquisition_implemented, false);
    assert.equal(
      planResult.plan.target_binding_identifier,
      validation.receipt.targetBindingIdentifier,
    );
  });

  it('C57 outer envelope unknown extra field rejected', () => {
    const binding = validBindingInput();
    const envelope = { ...binding, unknownEnvelopeField: true };
    const result = validateNonsecretTargetBinding(envelope);
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C58 outer envelope non-enumerable unknown key rejected', () => {
    const binding = validBindingInput();
    const envelope = { ...binding };
    Object.defineProperty(envelope, 'hiddenEnvelopeField', {
      value: true,
      enumerable: false,
      configurable: true,
    });
    const result = validateNonsecretTargetBinding(envelope);
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C59 outer envelope getter on expected slot rejected without invoking getter', () => {
    let getterInvocations = 0;
    const binding = validBindingInput();
    const envelope: Record<string, unknown> = {
      observed: binding.observed,
    };
    Object.defineProperty(envelope, 'expected', {
      get() {
        getterInvocations += 1;
        return binding.expected;
      },
      enumerable: true,
      configurable: true,
    });
    const result = validateNonsecretTargetBinding(envelope);
    assert.equal(getterInvocations, 0);
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C60 outer envelope inherited enumerable property rejected', () => {
    const binding = validBindingInput();
    const parent = { inheritedEnvelopeField: 'forbidden' };
    const envelope = Object.assign(Object.create(parent), binding);
    const result = validateNonsecretTargetBinding(envelope);
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C61 credential-method selection unknown field rejected', () => {
    const result = validateCredentialMethodSelection({
      credentialMethod: APPROVED_CREDENTIAL_METHODS[0],
      unknownSelectionField: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.holdReasonCode, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C62 credential-method selection getter rejected without invoking getter', () => {
    let getterInvocations = 0;
    const input: Record<string, unknown> = {};
    Object.defineProperty(input, 'credentialMethod', {
      get() {
        getterInvocations += 1;
        return APPROVED_CREDENTIAL_METHODS[0];
      },
      enumerable: true,
      configurable: true,
    });
    const result = validateCredentialMethodSelection(input);
    assert.equal(getterInvocations, 0);
    assert.equal(result.ok, false);
    assert.equal(result.holdReasonCode, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C63 credential-method selection inherited enumerable property rejected', () => {
    const parent = { inheritedSelectionField: 'forbidden' };
    const input = Object.assign(Object.create(parent), {
      credentialMethod: APPROVED_CREDENTIAL_METHODS[0],
    });
    const result = validateCredentialMethodSelection(input);
    assert.equal(result.ok, false);
    assert.equal(result.holdReasonCode, 'HOLD_EXECUTION_NOT_AUTHORIZED');
  });

  it('C64 credential-method selection credentialMethod number rejected', () => {
    const result = validateCredentialMethodSelection({
      credentialMethod: 123,
    });
    assert.equal(result.ok, false);
    assert.equal(result.holdReasonCode, 'HOLD_CREDENTIAL_METHOD_INVALID');
  });

  it('C65 credential-method selection ambientEnvFallback string rejected', () => {
    const result = validateCredentialMethodSelection({
      credentialMethod: APPROVED_CREDENTIAL_METHODS[0],
      ambientEnvFallback: 'true',
    });
    assert.equal(result.ok, false);
    assert.equal(result.holdReasonCode, 'HOLD_CREDENTIAL_METHOD_INVALID');
  });

  it('C66 expected binding inherited enumerable for-in pollution rejected', () => {
    withInheritedEnumerablePrototypePollution(() => {
      const expected = validExpectedBinding();
      const result = validateNonsecretTargetBinding({
        expected,
        observed: toObservedFacts(expected),
      });
      assert.equal(result.ok, false);
      assert.equal(result.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
    });
  });

  it('C67 observed facts inherited enumerable for-in pollution rejected', () => {
    withInheritedEnumerablePrototypePollution(() => {
      const expected = validExpectedBinding();
      const observed = toObservedFacts(expected);
      const result = validateNonsecretTargetBinding({ expected, observed });
      assert.equal(result.ok, false);
      assert.equal(result.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');
    });
  });

  it('C68 arbitrary malformed outer envelopes never throw', () => {
    const malformedInputs: unknown[] = [
      null,
      undefined,
      42,
      [],
      { expected: null, observed: null },
      { expected: validExpectedBinding() },
      { observed: toObservedFacts(validExpectedBinding()) },
      { expected: validExpectedBinding(), observed: toObservedFacts(validExpectedBinding()), extra: true },
    ];
    for (const input of malformedInputs) {
      assert.doesNotThrow(() => {
        const result = validateNonsecretTargetBinding(input);
        assert.equal(result.ok, false);
      });
      const planResult = buildCredentialAcquisitionPlan(input);
      assert.equal(planResult.ok, false);
    }
  });

  it('C69 arbitrary malformed credential-method selection inputs never throw', () => {
    const malformedInputs: unknown[] = [
      null,
      undefined,
      42,
      [],
      { credentialMethod: () => APPROVED_CREDENTIAL_METHODS[0] },
      { credentialMethod: APPROVED_CREDENTIAL_METHODS[0], evidenceFields: [0] },
      { credentialMethod: APPROVED_CREDENTIAL_METHODS[0], ambientEnvFallback: 'false' },
    ];
    for (const input of malformedInputs) {
      assert.doesNotThrow(() => {
        const result = validateCredentialMethodSelection(input);
        assert.equal(result.ok, false);
      });
    }
  });

  it('C70 exact valid envelope and selection still yield PASS receipt and UNIMPLEMENTED plan', () => {
    const binding = validBindingInput();
    const selection = validateCredentialMethodSelection({
      credentialMethod: binding.expected.credentialMethod,
    });
    assert.equal(selection.ok, true);

    const validation = validateNonsecretTargetBinding(binding);
    assert.equal(validation.ok, true);
    if (!validation.ok) return;
    assert.equal(validation.receipt.outcome, 'PASS_TARGET_BINDING');
    assert.match(validation.receipt.targetBindingIdentifier, /^[0-9a-f]{64}$/);

    const planResult = buildCredentialAcquisitionPlan(binding);
    assert.equal(planResult.ok, true);
    if (!planResult.ok) return;
    assert.equal(planResult.plan.implementation_status, 'UNIMPLEMENTED');
    assert.equal(planResult.plan.execution_authorized, false);
    assert.equal(planResult.plan.acquisition_implemented, false);
    assert.equal(
      planResult.plan.target_binding_identifier,
      validation.receipt.targetBindingIdentifier,
    );
  });

  it('C71 evidenceFields accessor index rejected, getter invocation count zero', () => {
    let getterInvocations = 0;
    const evidenceFields: string[] = [];
    Object.defineProperty(evidenceFields, '0', {
      get() {
        getterInvocations += 1;
        return 'credential_method';
      },
      enumerable: true,
      configurable: true,
    });
    evidenceFields.length = 1;
    const result = validateCredentialMethodSelection({
      credentialMethod: APPROVED_CREDENTIAL_METHODS[0],
      evidenceFields,
    });
    assert.equal(getterInvocations, 0);
    assert.equal(result.ok, false);
    assert.equal(result.holdReasonCode, 'HOLD_CREDENTIAL_METHOD_INVALID');
  });

  it('C72 evidenceFields sparse array rejected', () => {
    const sparse: string[] = [];
    sparse[1] = 'credential_method';
    const result = validateCredentialMethodSelection({
      credentialMethod: APPROVED_CREDENTIAL_METHODS[0],
      evidenceFields: sparse,
    });
    assert.equal(result.ok, false);
    assert.equal(result.holdReasonCode, 'HOLD_CREDENTIAL_METHOD_INVALID');
  });

  it('C73 evidenceFields extra own property rejected', () => {
    const evidenceFields = ['credential_method'];
    Object.defineProperty(evidenceFields, 'extra', {
      value: 'forbidden',
      enumerable: true,
      configurable: true,
    });
    const result = validateCredentialMethodSelection({
      credentialMethod: APPROVED_CREDENTIAL_METHODS[0],
      evidenceFields,
    });
    assert.equal(result.ok, false);
    assert.equal(result.holdReasonCode, 'HOLD_CREDENTIAL_METHOD_INVALID');
  });

  it('C74 evidenceFields symbol property rejected', () => {
    const evidenceFields = ['credential_method'];
    (evidenceFields as unknown as Record<symbol, string>)[Symbol('evidence')] = 'forbidden';
    const result = validateCredentialMethodSelection({
      credentialMethod: APPROVED_CREDENTIAL_METHODS[0],
      evidenceFields,
    });
    assert.equal(result.ok, false);
    assert.equal(result.holdReasonCode, 'HOLD_CREDENTIAL_METHOD_INVALID');
  });

  it('C75 evidenceFields Array subclass/custom prototype rejected', () => {
    class CustomEvidenceArray extends Array<string> {}
    const evidenceFields = new CustomEvidenceArray('credential_method');
    const result = validateCredentialMethodSelection({
      credentialMethod: APPROVED_CREDENTIAL_METHODS[0],
      evidenceFields,
    });
    assert.equal(result.ok, false);
    assert.equal(result.holdReasonCode, 'HOLD_CREDENTIAL_METHOD_INVALID');
  });

  it('C76 secretFieldsInBinding accessor index rejected, getter invocation count zero', () => {
    let getterInvocations = 0;
    const secretFieldsInBinding: string[] = [];
    Object.defineProperty(secretFieldsInBinding, '0', {
      get() {
        getterInvocations += 1;
        return 'password';
      },
      enumerable: true,
      configurable: true,
    });
    secretFieldsInBinding.length = 1;
    const expected = { ...validExpectedBinding(), secretFieldsInBinding };
    const result = validateNonsecretTargetBinding({
      expected: expected as ExpectedAuthorizationBinding,
      observed: toObservedFacts(validExpectedBinding()),
    });
    assert.equal(getterInvocations, 0);
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_CREDENTIAL_METHOD_INVALID');
  });

  it('C77 secretFieldsInBinding sparse/extra/symbol array rejected', () => {
    const sparse: string[] = [];
    sparse[1] = 'password';
    const sparseResult = validateNonsecretTargetBinding({
      expected: { ...validExpectedBinding(), secretFieldsInBinding: sparse } as ExpectedAuthorizationBinding,
      observed: toObservedFacts(validExpectedBinding()),
    });
    assert.equal(sparseResult.ok, false);
    assert.equal(sparseResult.outcome, 'HOLD_CREDENTIAL_METHOD_INVALID');

    const withExtra = [] as string[];
    Object.defineProperty(withExtra, 'extra', {
      value: 'password',
      enumerable: true,
      configurable: true,
    });
    const extraResult = validateNonsecretTargetBinding({
      expected: { ...validExpectedBinding(), secretFieldsInBinding: withExtra } as ExpectedAuthorizationBinding,
      observed: toObservedFacts(validExpectedBinding()),
    });
    assert.equal(extraResult.ok, false);
    assert.equal(extraResult.outcome, 'HOLD_CREDENTIAL_METHOD_INVALID');

    const withSymbol = [] as string[];
    (withSymbol as unknown as Record<symbol, string>)[Symbol('secret')] = 'password';
    const symbolResult = validateNonsecretTargetBinding({
      expected: { ...validExpectedBinding(), secretFieldsInBinding: withSymbol } as ExpectedAuthorizationBinding,
      observed: toObservedFacts(validExpectedBinding()),
    });
    assert.equal(symbolResult.ok, false);
    assert.equal(symbolResult.outcome, 'HOLD_CREDENTIAL_METHOD_INVALID');
  });

  it('C78 secretFieldsInBinding nonempty exact string array rejected', () => {
    const result = validateNonsecretTargetBinding(
      validBindingInput({
        expected: { secretFieldsInBinding: ['password'] },
      }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_CREDENTIAL_METHOD_INVALID');
  });

  it('C79 exact empty secretFieldsInBinding accepted', () => {
    const result = validateNonsecretTargetBinding(
      validBindingInput({
        expected: { secretFieldsInBinding: [] },
      }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.receipt.outcome, 'PASS_TARGET_BINDING');
  });

  it('C80 exact dense allowed evidenceFields still accepted and produces no secret output', () => {
    const result = validateCredentialMethodSelection({
      credentialMethod: APPROVED_CREDENTIAL_METHODS[0],
      evidenceFields: ['credential_method', 'outcome_code'],
    });
    assert.equal(result.ok, true);
    assert.equal(JSON.stringify(result).includes('password'), false);
    assert.equal(JSON.stringify(result).includes('token'), false);
    assert.equal(JSON.stringify(result).includes('secret'), false);
  });
});

describe('remote connection authority session pooler correction-1 V1-V8', () => {
  it('V1 exact Session pooler expected/observed binding passes', () => {
    const binding = validBindingInput();
    const result = validateNonsecretTargetBinding(binding);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.receipt.outcome, 'PASS_TARGET_BINDING');
    assert.equal(binding.expected.connectionEndpointProfile, SESSION_POOLER_CONNECTION_ENDPOINT_PROFILE);
    assert.equal(binding.expected.connectionUser, VALID_CONNECTION_USER);
    assert.equal(binding.expected.host, SESSION_POOLER_HOST);
  });

  it('V2 Direct host rejected for SESSION_POOLER_IPV4_V1', () => {
    const directHost = `db.${VALID_PROJECT_REF}.supabase.co`;
    const directFingerprint = calculateCanonicalHostFingerprint(directHost);
    assert.equal(directFingerprint.ok, true);
    const result = validateNonsecretTargetBinding(
      validBindingInput({
        expected: {
          host: directHost,
          hostFingerprintSha256: directFingerprint.fingerprintSha256,
        },
      }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_TARGET_IDENTITY_MISMATCH');
  });

  it('V3 wrong pooler region/host rejected', () => {
    const wrongHost = 'aws-0-us-east-1.pooler.supabase.com';
    const wrongFingerprint = calculateCanonicalHostFingerprint(wrongHost);
    assert.equal(wrongFingerprint.ok, true);
    const result = validateNonsecretTargetBinding(
      validBindingInput({
        expected: {
          host: wrongHost,
          hostFingerprintSha256: wrongFingerprint.fingerprintSha256,
        },
      }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_TARGET_IDENTITY_MISMATCH');
  });

  it('V4 wrong host fingerprint rejected', () => {
    const result = validateNonsecretTargetBinding(
      validBindingInput({ expected: { hostFingerprintSha256: 'f'.repeat(64) } }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_TARGET_IDENTITY_MISMATCH');
  });

  it('V5 missing/wrong connectionEndpointProfile rejected', () => {
    const full = validExpectedBinding();
    const observedFull = toObservedFacts(full);
    const missingExpected = { ...full } as Record<string, unknown>;
    const missingObserved = { ...observedFull } as Record<string, unknown>;
    delete missingExpected.connectionEndpointProfile;
    delete missingObserved.connectionEndpointProfile;
    const missing = validateNonsecretTargetBinding({
      expected: missingExpected as ExpectedAuthorizationBinding,
      observed: missingObserved as ObservedPreConnectFacts,
    });
    assert.equal(missing.ok, false);
    assert.equal(missing.outcome, 'HOLD_EXECUTION_NOT_AUTHORIZED');

    const wrong = validateNonsecretTargetBinding(
      validBindingInput({
        expected: { connectionEndpointProfile: 'DIRECT_IPV4_V1' },
        observed: { connectionEndpointProfile: 'DIRECT_IPV4_V1' },
      }),
    );
    assert.equal(wrong.ok, false);
    assert.equal(wrong.outcome, 'HOLD_TARGET_IDENTITY_MISMATCH');
  });

  it('V6 connectionUser must equal postgres.<projectRef>', () => {
    const result = validateNonsecretTargetBinding(
      validBindingInput({
        expected: { connectionUser: 'postgres' },
        observed: { connectionUser: 'postgres' },
      }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_TARGET_IDENTITY_MISMATCH');
  });

  it('V7 expected/observed connectionUser mismatch rejected', () => {
    const result = validateNonsecretTargetBinding(
      validBindingInput({
        expected: { connectionUser: VALID_CONNECTION_USER },
        observed: { connectionUser: 'postgres.other-preview-ref' },
      }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_TARGET_IDENTITY_MISMATCH');
  });

  it('V8 full binding identifier changes with connectionUser/profile', () => {
    const base = validBindingInput();
    const baseId = receiptBindingIdentifier(base);

    const altRef = 'other-preview-ref';
    const altUser = expectedConnectionUserForProjectRef(altRef);
    const userId = receiptBindingIdentifier(
      validBindingInput({
        expected: { projectRef: altRef, connectionUser: altUser },
        observed: { projectRef: altRef, connectionUser: altUser },
      }),
    );
    assert.notEqual(userId, baseId);

    const wrongProfile = validateNonsecretTargetBinding(
      validBindingInput({
        expected: { connectionEndpointProfile: 'DIRECT_IPV4_V1' },
        observed: { connectionEndpointProfile: 'DIRECT_IPV4_V1' },
      }),
    );
    assert.equal(wrongProfile.ok, false);
    assert.notEqual(
      wrongProfile.ok ? wrongProfile.receipt.targetBindingIdentifier : '',
      baseId,
    );
  });
});

describe('remote connection authority session pooler correction-2 W1-W6', () => {
  it('W1 exact approved projectRef + exact pooler user passes', () => {
    const result = validateNonsecretTargetBinding(validBindingInput());
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.receipt.outcome, 'PASS_TARGET_BINDING');
    assert.equal(result.receipt.targetBindingIdentifier.length > 0, true);
  });

  it('W2 arbitrary projectRef + matching postgres.<arbitrary> is rejected', () => {
    const altRef = 'other-preview-ref';
    const altUser = expectedConnectionUserForProjectRef(altRef);
    const result = validateNonsecretTargetBinding(
      validBindingInput({
        expected: { projectRef: altRef, connectionUser: altUser },
        observed: { projectRef: altRef, connectionUser: altUser },
      }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_TARGET_IDENTITY_MISMATCH');
  });

  it('W3 blank/case-changed/whitespace-padded approved projectRef is rejected', () => {
    for (const badRef of ['', ' ', ` ${VALID_PROJECT_REF}`, VALID_PROJECT_REF.toUpperCase()]) {
      const result = validateNonsecretTargetBinding(
        validBindingInput({
          expected: { projectRef: badRef },
          observed: { projectRef: badRef },
        }),
      );
      assert.equal(result.ok, false);
      assert.notEqual(result.outcome, 'PASS_TARGET_BINDING');
    }
  });

  it('W4 expected/observed projectRef mismatch is rejected', () => {
    const result = validateNonsecretTargetBinding(
      validBindingInput({
        expected: { projectRef: VALID_PROJECT_REF },
        observed: { projectRef: 'other-preview-ref' },
      }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.outcome, 'HOLD_TARGET_IDENTITY_MISMATCH');
  });

  it('W6 target-binding identifier remains deterministic for the exact approved target', () => {
    const first = receiptBindingIdentifier(validBindingInput());
    const second = receiptBindingIdentifier(validBindingInput());
    assert.equal(first, second);
    assert.equal(first.length > 0, true);
  });
});
