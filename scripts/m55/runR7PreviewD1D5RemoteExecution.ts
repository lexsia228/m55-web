#!/usr/bin/env node --experimental-strip-types
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildCanonicalExpectedManifest,
  FROZEN_PREVIEW_HISTORY_SNAPSHOT,
  R7_PR249_FROZEN_BRANCH,
  R7_PR249_FROZEN_REPO_ROOT,
  type R7DeltaStepId,
} from '../../lib/m55/previewRemoteApply/r7D1D5OfflinePlan.ts';
import type { R7HumanExecutionAuthorizationDocument } from '../../lib/m55/previewRemoteApply/r7D1D5ExecutionAuthorization.ts';
import {
  createR7FakeTransport,
  executeR7DeltaStepOffline,
  R7_DELTA_STEP_ORDER,
  R7_LOCAL_IMPLEMENTATION_MODE,
  type R7RemoteExecutionPublicEvidence,
} from '../../lib/m55/previewRemoteApply/r7D1D5RemoteExecution.ts';

const FORBIDDEN_FLAG_FRAGMENTS = [
  'apply',
  'execute-live',
  'remote',
  'credential',
  'password',
  'token',
  'secret',
  'supabase',
  'database-url',
  'db-url',
  'url',
  'push',
  'repair',
  'link',
  'env',
  'stdin',
  'authorization-document',
  'repo-root',
  'manifest-path',
  'multi',
  'all-steps',
] as const;

export type R7RemoteExecutionCliResult =
  | { readonly mode: 'R7_D1_D5_REMOTE_EXECUTION_HOLD'; readonly holdReasonCode: string; readonly evidence: R7RemoteExecutionPublicEvidence | null }
  | { readonly mode: 'R7_D1_D5_REMOTE_EXECUTION_OUTCOME'; readonly evidence: R7RemoteExecutionPublicEvidence };

export function parseR7RemoteExecutionArgv(argv: readonly string[]): {
  stepId: R7DeltaStepId | null;
  unknownFlags: string[];
} {
  const unknownFlags: string[] = [];
  let stepId: R7DeltaStepId | null = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--step') {
      const value = argv[i + 1];
      if (!value || !R7_DELTA_STEP_ORDER.includes(value as R7DeltaStepId)) {
        unknownFlags.push(arg);
      } else {
        stepId = value as R7DeltaStepId;
        i += 1;
      }
      continue;
    }
    if (arg.startsWith('-')) {
      unknownFlags.push(arg);
    }
  }
  return { stepId, unknownFlags };
}

export async function runR7PreviewD1D5RemoteExecutionCli(
  argv: readonly string[],
  repoRoot = R7_PR249_FROZEN_REPO_ROOT,
): Promise<R7RemoteExecutionCliResult> {
  for (const fragment of FORBIDDEN_FLAG_FRAGMENTS) {
    for (const arg of argv) {
      if (arg.toLowerCase().includes(fragment)) {
        return {
          mode: 'R7_D1_D5_REMOTE_EXECUTION_HOLD',
          holdReasonCode: 'HOLD_FORBIDDEN_CLI_FLAG',
          evidence: null,
        };
      }
    }
  }

  const { stepId, unknownFlags } = parseR7RemoteExecutionArgv(argv);
  if (unknownFlags.length > 0 || !stepId) {
    return {
      mode: 'R7_D1_D5_REMOTE_EXECUTION_HOLD',
      holdReasonCode: 'HOLD_CLI_ARGUMENT_INVALID',
      evidence: null,
    };
  }

  const canonicalRoot = realpathSync(repoRoot);
  if (canonicalRoot !== R7_PR249_FROZEN_REPO_ROOT) {
    return {
      mode: 'R7_D1_D5_REMOTE_EXECUTION_HOLD',
      holdReasonCode: 'HOLD_REPO_IDENTITY_MISMATCH',
      evidence: null,
    };
  }

  const manifest = buildCanonicalExpectedManifest(canonicalRoot);
  const stepPlan = manifest.steps.find((s) => s.stepId === stepId);
  if (!stepPlan) {
    return {
      mode: 'R7_D1_D5_REMOTE_EXECUTION_HOLD',
      holdReasonCode: 'HOLD_STEP_NOT_FOUND',
      evidence: null,
    };
  }

  const transport = createR7FakeTransport(FROZEN_PREVIEW_HISTORY_SNAPSHOT);
  const evidence = await executeR7DeltaStepOffline({
    repoRoot: canonicalRoot,
    branch: R7_PR249_FROZEN_BRANCH,
    headCommitSha: '0000000000000000000000000000000000000000',
    stepId,
    transport,
    reviewedCandidateBinding: null,
    humanAuthorization: null,
    offlineManifestExecutionAuthorized: manifest.authorization.executionAuthorized,
    allowLiveTransport: false,
  });

  if (evidence.outcome === 'SUCCESS') {
    return { mode: 'R7_D1_D5_REMOTE_EXECUTION_OUTCOME', evidence };
  }
  return {
    mode: 'R7_D1_D5_REMOTE_EXECUTION_HOLD',
    holdReasonCode: evidence.holdReasonCode ?? 'HOLD_AUTHORIZATION_GATE',
    evidence,
  };
}

function formatPublicEvidence(evidence: R7RemoteExecutionPublicEvidence | null): string {
  if (!evidence) return '{}';
  return JSON.stringify({
    stepId: evidence.stepId,
    outcome: evidence.outcome,
    holdReasonCode: evidence.holdReasonCode,
    lifecycleStages: evidence.lifecycleStages,
    statementCount: evidence.statementCount,
    commitResponseClass: evidence.commitResponseClass,
    ackState: evidence.ackState,
  });
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const result = await runR7PreviewD1D5RemoteExecutionCli(argv);
  if (result.mode === 'R7_D1_D5_REMOTE_EXECUTION_HOLD') {
    process.stdout.write(
      `${result.mode} ${result.holdReasonCode} ${formatPublicEvidence(result.evidence)}\n`,
    );
    process.exitCode = 2;
    return;
  }
  process.stdout.write(`${result.mode} ${formatPublicEvidence(result.evidence)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    process.exitCode = 2;
  });
}

export const R7_REMOTE_EXECUTION_CLI_LOCAL_MODE = R7_LOCAL_IMPLEMENTATION_MODE;
export type { R7HumanExecutionAuthorizationDocument };
