#!/usr/bin/env node --experimental-strip-types
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { buildPreviewRemoteApplyPlan } from '../../lib/m55/previewRemoteApply/transactionNormalizedRemoteExecutor.ts';
import {
  APPROVED_PREVIEW_DATABASE_TIER,
  APPROVED_PREVIEW_ORGANIZATION,
  APPROVED_PREVIEW_PROJECT,
  CREDENTIAL_METHOD_IDS,
  EXPECTED_REPO_ROOT,
  REPOSITORY_FACTS_SOURCE,
  sanitizePreviewRemoteApplyHoldCode,
  type CredentialMethodId,
  type PlanCliPublicOutput,
  type PreviewRemoteApplyPlanHold,
  type RepositoryIdentityFacts,
} from '../../lib/m55/previewRemoteApply/types.ts';

const ALLOWED_FLAGS = new Set([
  '--organization',
  '--project',
  '--database-tier',
  '--project-ref',
  '--host-fingerprint-sha256',
  '--credential-method',
]);

const CREDENTIAL_FORBIDDEN_FRAGMENTS = [
  'password',
  'token',
  'secret',
  'db-url',
  'database-url',
  'dsn',
  'url',
  'key',
] as const;

type CliArgs = {
  organization: string;
  project: string;
  databaseTier: string;
  projectRef: string | null;
  hostFingerprintSha256: string | null;
  credentialMethod: CredentialMethodId | null;
};

function classifyForbiddenFlag(token: string): PreviewRemoteApplyPlanHold['holdReasonCode'] | null {
  const lower = token.toLowerCase();
  if (lower.includes('execute') || lower.includes('apply')) {
    return 'HOLD_EXECUTION_NOT_AUTHORIZED';
  }
  if (lower.includes('timeout')) {
    return 'HOLD_TIMEOUT_POLICY';
  }
  if (lower.includes('repo-root') || lower.includes('authority')) {
    return 'HOLD_REPO_IDENTITY_MISMATCH';
  }
  for (const forbidden of CREDENTIAL_FORBIDDEN_FRAGMENTS) {
    if (lower.includes(forbidden)) {
      return 'HOLD_CREDENTIAL_METHOD_INVALID';
    }
  }
  return null;
}

function parseCliArgs(argv: string[]): CliArgs | { holdReasonCode: PreviewRemoteApplyPlanHold['holdReasonCode'] } {
  const args: CliArgs = {
    organization: APPROVED_PREVIEW_ORGANIZATION,
    project: APPROVED_PREVIEW_PROJECT,
    databaseTier: APPROVED_PREVIEW_DATABASE_TIER,
    projectRef: null,
    hostFingerprintSha256: null,
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
      case '--organization':
        args.organization = value;
        break;
      case '--project':
        args.project = value;
        break;
      case '--database-tier':
        args.databaseTier = value;
        break;
      case '--project-ref':
        args.projectRef = value;
        break;
      case '--host-fingerprint-sha256':
        args.hostFingerprintSha256 = value;
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

function buildHoldOutput(
  holdReasonCode: PreviewRemoteApplyPlanHold['holdReasonCode'],
): PreviewRemoteApplyPlanHold {
  return {
    mode: 'PREVIEW_REMOTE_APPLY_DRY_RUN_HOLD',
    holdReasonCode: sanitizePreviewRemoteApplyHoldCode(holdReasonCode),
    executionAuthorized: false,
    remoteConnectionAttempted: false,
    sqlExecuted: false,
    migrationApplyAuthorized: false,
    productionAccessAuthorized: false,
    automaticNextGate: false,
    transportCallCount: 0,
  };
}

function formatOutput(output: PlanCliPublicOutput): string {
  return `${JSON.stringify(output)}\n`;
}

function emitHoldAndExit(holdReasonCode: PreviewRemoteApplyPlanHold['holdReasonCode']): never {
  process.stdout.write(formatOutput(buildHoldOutput(holdReasonCode)));
  process.exit(1);
}

function main(): void {
  try {
    const parsed = parseCliArgs(process.argv.slice(2));
    if ('holdReasonCode' in parsed) {
      emitHoldAndExit(parsed.holdReasonCode);
    }

    if (!parsed.credentialMethod || !CREDENTIAL_METHOD_IDS.includes(parsed.credentialMethod)) {
      emitHoldAndExit('HOLD_CREDENTIAL_METHOD_INVALID');
    }

    const repoRoot = realpathSync(resolve(process.cwd()));
    if (repoRoot !== EXPECTED_REPO_ROOT) {
      emitHoldAndExit('HOLD_REPO_IDENTITY_MISMATCH');
    }

    const repository = readRepositoryFacts(repoRoot);
    const result = buildPreviewRemoteApplyPlan({
      repoRoot,
      repository,
      target: {
        organization: parsed.organization,
        project: parsed.project,
        databaseTier: parsed.databaseTier,
        projectRef: parsed.projectRef,
        hostFingerprintSha256: parsed.hostFingerprintSha256,
      },
      credentialMethod: parsed.credentialMethod,
      executionEnablement: false,
    });

    process.stdout.write(formatOutput(result));
    process.exit(result.mode === 'PREVIEW_REMOTE_APPLY_DRY_RUN_HOLD' ? 1 : 0);
  } catch {
    emitHoldAndExit('HOLD_UNEXPECTED_INTERNAL');
  }
}

main();
