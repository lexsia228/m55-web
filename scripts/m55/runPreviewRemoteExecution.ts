#!/usr/bin/env node --experimental-strip-types
import { fileURLToPath } from 'node:url';
import { readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  createExecutionPgTransport,
  type ExecutionPgTransportFactoryDeps,
} from '../../lib/m55/previewRemoteApply/remoteExecutionPgTransport.ts';
import {
  executePreviewRemoteExecution,
  serializePreviewRemoteExecutionResult,
  STATIC_EXECUTION_GATE,
  type PreviewRemoteExecutionDeps,
  type PreviewRemoteExecutionInput,
  type PreviewRemoteExecutionResult,
  type RuntimeExecutionEvidence,
} from '../../lib/m55/previewRemoteApply/remoteExecutionExecutor.ts';
import {
  readBoundedStdinBytesOnce,
  type CredentialAcquirerDeps,
} from '../../lib/m55/previewRemoteApply/remoteExecutionCredentialAcquirer.ts';
import {
  validateNonsecretTargetBinding,
} from '../../lib/m55/previewRemoteApply/remoteConnectionAuthority.ts';
import {
  CREDENTIAL_METHOD_IDS,
  EXPECTED_REPO_ROOT,
  REPOSITORY_FACTS_SOURCE,
  sanitizePreviewRemoteApplyHoldCode,
  validateDedicatedP8StepSelection,
  type CredentialMethodId,
  type RepositoryIdentityFacts,
  type StepId,
} from '../../lib/m55/previewRemoteApply/types.ts';

const ALLOWED_FLAGS = new Set(['--authorization-document', '--credential-method']);

const CREDENTIAL_FORBIDDEN_FRAGMENTS = [
  'password',
  'token',
  'secret',
  'db-url',
  'database-url',
  'dsn',
  'url',
  'key',
  'execute',
  'apply',
] as const;

type CliArgs = {
  authorizationDocumentPath: string | null;
  credentialMethod: CredentialMethodId | null;
};

export type RunPreviewRemoteExecutionCliDeps = PreviewRemoteExecutionDeps & {
  readonly readAuthorizationDocument?: (path: string) => unknown;
  readonly repositoryFacts?: () => RepositoryIdentityFacts;
  readonly repoRoot?: string;
  readonly credentialAcquirerDeps?: CredentialAcquirerDeps;
  readonly transportFactory?: ExecutionPgTransportFactoryDeps;
  readonly verifierTransportFactory?: ExecutionPgTransportFactoryDeps;
  readonly executePreviewRemoteExecution?: (
    input: PreviewRemoteExecutionInput,
    deps?: PreviewRemoteExecutionDeps,
  ) => ReturnType<typeof executePreviewRemoteExecution>;
};

function classifyForbiddenFlag(token: string): PreviewRemoteExecutionResult['holdReasonCode'] | null {
  const lower = token.toLowerCase();
  if (lower.includes('execute') || lower.includes('apply')) {
    return 'HOLD_EXECUTION_NOT_AUTHORIZED';
  }
  for (const forbidden of CREDENTIAL_FORBIDDEN_FRAGMENTS) {
    if (lower.includes(forbidden)) {
      return 'HOLD_CREDENTIAL_METHOD_INVALID';
    }
  }
  return null;
}

export function parsePreviewRemoteExecutionCliArgs(
  argv: string[],
): CliArgs | { holdReasonCode: NonNullable<PreviewRemoteExecutionResult['holdReasonCode']> } {
  const args: CliArgs = {
    authorizationDocumentPath: null,
    credentialMethod: null,
  };
  const seen = new Set<string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      return { holdReasonCode: 'HOLD_UNEXPECTED_INTERNAL' };
    }
    if (!ALLOWED_FLAGS.has(token)) {
      const classified = classifyForbiddenFlag(token);
      return { holdReasonCode: classified ?? 'HOLD_UNEXPECTED_INTERNAL' };
    }
    if (seen.has(token)) {
      return { holdReasonCode: 'HOLD_UNEXPECTED_INTERNAL' };
    }
    seen.add(token);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      return { holdReasonCode: 'HOLD_UNEXPECTED_INTERNAL' };
    }
    switch (token) {
      case '--authorization-document':
        args.authorizationDocumentPath = value;
        break;
      case '--credential-method':
        args.credentialMethod = value as CredentialMethodId;
        break;
      default:
        return { holdReasonCode: 'HOLD_UNEXPECTED_INTERNAL' };
    }
    index += 1;
  }
  return args;
}

function gitExec(repoRoot: string, args: string[]): string {
  const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error('GIT_READ_FAILED');
  }
  return result.stdout.trim();
}

function readRepositoryFacts(repoRoot: string): RepositoryIdentityFacts {
  const topLevel = gitExec(repoRoot, ['rev-parse', '--show-toplevel']);
  const branch = gitExec(repoRoot, ['branch', '--show-current']);
  const headCommitSha = gitExec(repoRoot, ['rev-parse', 'HEAD']);
  const treeSha = gitExec(repoRoot, ['rev-parse', 'HEAD^{tree}']);
  const porcelain = gitExec(repoRoot, ['status', '--porcelain']);
  const trackedDirty = porcelain
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .some((line) => !line.startsWith('??'));
  const indexDirty = gitExec(repoRoot, ['diff', '--cached', '--name-only']).length > 0;
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

function buildPreConnectRuntimeEvidence(): RuntimeExecutionEvidence {
  return {
    authorizationBindingAccepted: false,
    connectionOpened: false,
    transactionBegan: false,
    mutationStatementsStarted: false,
    historyInsertExecuted: false,
    commitSent: false,
    commitResponseClass: null,
    freshReadonlyCheckExecuted: false,
    freshReadonlyCheckCompleted: false,
    transportProfile: null,
    executionStageReached: 'PRE_CONNECT',
  };
}

function buildHoldOutput(
  holdReasonCode: NonNullable<PreviewRemoteExecutionResult['holdReasonCode']>,
): PreviewRemoteExecutionResult {
  return {
    mode: 'PREVIEW_REMOTE_EXECUTION_HOLD',
    holdReasonCode: sanitizePreviewRemoteApplyHoldCode(holdReasonCode),
    runtimeEvidence: buildPreConnectRuntimeEvidence(),
    ...STATIC_EXECUTION_GATE,
  };
}

function defaultCliCredentialDeps(method: CredentialMethodId): CredentialAcquirerDeps {
  if (method === 'SECURE_STDIN_CONNECTION_CONFIG_v1') {
    return { readBytes: readBoundedStdinBytesOnce };
  }
  return {};
}

function defaultCliTransportDeps(): ExecutionPgTransportFactoryDeps {
  return {};
}

export async function runPreviewRemoteExecutionCli(
  argv: string[],
  deps: RunPreviewRemoteExecutionCliDeps = {},
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  try {
    const parsed = parsePreviewRemoteExecutionCliArgs(argv);
    if ('holdReasonCode' in parsed) {
      const output = serializePreviewRemoteExecutionResult(buildHoldOutput(parsed.holdReasonCode));
      return { exitCode: 1, stdout: `${output}\n`, stderr: '' };
    }

    if (!parsed.authorizationDocumentPath || !parsed.credentialMethod) {
      const output = serializePreviewRemoteExecutionResult(buildHoldOutput('HOLD_EXECUTION_NOT_AUTHORIZED'));
      return { exitCode: 1, stdout: `${output}\n`, stderr: '' };
    }

    if (!CREDENTIAL_METHOD_IDS.includes(parsed.credentialMethod)) {
      const output = serializePreviewRemoteExecutionResult(buildHoldOutput('HOLD_CREDENTIAL_METHOD_INVALID'));
      return { exitCode: 1, stdout: `${output}\n`, stderr: '' };
    }

    if (parsed.credentialMethod === 'TEMP_PGPASSFILE_0600_v1') {
      const output = serializePreviewRemoteExecutionResult(buildHoldOutput('HOLD_CREDENTIAL_METHOD_INVALID'));
      return { exitCode: 1, stdout: `${output}\n`, stderr: '' };
    }

    const repoRoot = deps.repoRoot ?? realpathSync(resolve(process.cwd()));
    if (repoRoot !== EXPECTED_REPO_ROOT) {
      const output = serializePreviewRemoteExecutionResult(buildHoldOutput('HOLD_REPO_IDENTITY_MISMATCH'));
      return { exitCode: 1, stdout: `${output}\n`, stderr: '' };
    }

    const reader = deps.readAuthorizationDocument ?? ((path: string) => JSON.parse(readFileSync(path, 'utf8')));
    const authorizationDocument = reader(parsed.authorizationDocumentPath);

    const bindingResult = validateNonsecretTargetBinding(authorizationDocument);
    if (!bindingResult.ok) {
      const output = serializePreviewRemoteExecutionResult(buildHoldOutput(bindingResult.outcome));
      return { exitCode: 1, stdout: `${output}\n`, stderr: '' };
    }

    const selectedStep = bindingResult.receipt.selectedStep;
    const authorizedMethod = bindingResult.receipt.credentialMethod;
    if (!/^P[1-8]$/.test(selectedStep)) {
      const output = serializePreviewRemoteExecutionResult(buildHoldOutput('HOLD_EXECUTION_NOT_AUTHORIZED'));
      return { exitCode: 1, stdout: `${output}\n`, stderr: '' };
    }
    if (selectedStep === 'P8') {
      const dedicatedSelection = validateDedicatedP8StepSelection('P8');
      if (!dedicatedSelection.ok) {
        const output = serializePreviewRemoteExecutionResult(buildHoldOutput('HOLD_EXECUTION_NOT_AUTHORIZED'));
        return { exitCode: 1, stdout: `${output}\n`, stderr: '' };
      }
    }
    if (authorizedMethod !== parsed.credentialMethod) {
      const output = serializePreviewRemoteExecutionResult(buildHoldOutput('HOLD_CREDENTIAL_METHOD_INVALID'));
      return { exitCode: 1, stdout: `${output}\n`, stderr: '' };
    }

    const repository = deps.repositoryFacts?.() ?? readRepositoryFacts(repoRoot);

    const input: PreviewRemoteExecutionInput = {
      repoRoot,
      authorizationDocument,
      credentialMethod: parsed.credentialMethod,
      selectedStep: selectedStep as StepId,
    };

    void createExecutionPgTransport(deps.transportFactory ?? defaultCliTransportDeps());

    const executor = deps.executePreviewRemoteExecution ?? executePreviewRemoteExecution;
    const result = await executor(input, {
      ...deps,
      repositoryFacts: () => repository,
      credentialAcquirerDeps: deps.credentialAcquirerDeps ?? defaultCliCredentialDeps(parsed.credentialMethod),
      transportFactory: deps.transportFactory ?? defaultCliTransportDeps(),
      verifierTransportFactory: deps.verifierTransportFactory ?? deps.transportFactory ?? defaultCliTransportDeps(),
    });
    const exitCode = result.mode === 'PREVIEW_REMOTE_EXECUTION_HOLD' ? 1 : 0;
    return { exitCode, stdout: `${serializePreviewRemoteExecutionResult(result)}\n`, stderr: '' };
  } catch {
    const output = serializePreviewRemoteExecutionResult(buildHoldOutput('HOLD_UNEXPECTED_INTERNAL'));
    return { exitCode: 1, stdout: `${output}\n`, stderr: '' };
  }
}

async function main(): Promise<void> {
  const result = await runPreviewRemoteExecutionCli(process.argv.slice(2));
  process.stdout.write(result.stdout);
  process.exit(result.exitCode);
}

const modulePath = fileURLToPath(import.meta.url);
const executedDirectly = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  return resolve(entry) === modulePath;
})();

if (executedDirectly) {
  main().catch(() => {
    process.stdout.write(
      `${serializePreviewRemoteExecutionResult(buildHoldOutput('HOLD_UNEXPECTED_INTERNAL'))}\n`,
    );
    process.exit(1);
  });
}
