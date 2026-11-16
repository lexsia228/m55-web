#!/usr/bin/env node --experimental-strip-types
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

import { loadPairP5DedicatedTargetBindingReceiptFromOwnerControlledJsonFile } from '../../lib/m55/previewRemoteApply/pairP5DedicatedTargetBindingReceipt.ts';

import {
  assertPairP5CheckoutPrerequisiteLocalCodeIntegrity,
  executePairP5CheckoutAuthorizationGatedRealExecution,
  PAIR_P5_CHECKOUT_AUTH_GATED_REAL_EXECUTION_READINESS,
  pairP5CheckoutAuthGatedRealExecutionCliExitCode,
  serializePairP5AuthGatedRealExecutionResult,
} from '../../lib/m55/previewRemoteApply/pairP5CheckoutAuthorizationGatedRealExecutor.ts';
import { validateDedicatedPairP5CheckoutStepSelection } from '../../lib/m55/previewRemoteApply/pairP5CheckoutOfflinePlan.ts';
import {
  PAIR_P5_CHECKOUT_STATIC_EXECUTION_GATE,
  PAIR_P5_CHECKOUT_LIVE_EXECUTION_PREP_READINESS,
} from '../../lib/m55/previewRemoteApply/pairP5CheckoutLiveExecutionAuthority.ts';
import {
  buildPairP5SyntheticFixtureRepositoryIdentity,
  readPairP5RepositoryIdentityFromGit,
} from '../../lib/m55/previewRemoteApply/pairP5IdentityOfflinePlan.ts';
import { PAIR_P5_CHECKOUT_STEP_ID } from '../../lib/m55/previewRemoteApply/pairP5CheckoutStepAuthority.ts';
import { PAIR_P5_EXPECTED_REPO_ROOT } from '../../lib/m55/previewRemoteApply/pairP5IdentityStepAuthority.ts';

const ALLOWED_FLAGS = new Set([
  '--step',
  '--project-ref',
  '--host-fingerprint-sha256',
  '--repository-source',
  '--output',
  '--dedicated-receipt-json-path',
]);

const FORBIDDEN_FLAG_FRAGMENTS = [
  'execute',
  'apply',
  'force',
  'credential',
  'password',
  'token',
  'secret',
  'database-url',
  'db-url',
  'dsn',
] as const;

type RepositorySource = 'git' | 'synthetic-fixture';

type CliArgs = {
  step: string | null;
  projectRef: string | null;
  hostFingerprintSha256: string | null;
  repositorySource: RepositorySource;
  outputPath: string | null;
  dedicatedReceiptJsonPath: string | null;
};

function classifyForbiddenFlag(token: string): 'HOLD_PAIR_P5_EXECUTION_NOT_AUTHORIZED' | null {
  const lower = token.toLowerCase();
  for (const fragment of FORBIDDEN_FLAG_FRAGMENTS) {
    if (lower.includes(fragment)) {
      return 'HOLD_PAIR_P5_EXECUTION_NOT_AUTHORIZED';
    }
  }
  return null;
}

export function parsePairP5CheckoutAuthGatedRealExecutionCliArgs(
  argv: string[],
): CliArgs | { holdReasonCode: 'HOLD_PAIR_P5_STEP_SELECTION_INVALID' | 'HOLD_PAIR_P5_EXECUTION_NOT_AUTHORIZED' } {
  const args: CliArgs = {
    step: null,
    projectRef: null,
    hostFingerprintSha256: null,
    repositorySource: 'git',
    outputPath: null,
    dedicatedReceiptJsonPath: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      return { holdReasonCode: 'HOLD_PAIR_P5_STEP_SELECTION_INVALID' };
    }
    const forbidden = classifyForbiddenFlag(token);
    if (forbidden) {
      return { holdReasonCode: forbidden };
    }
    if (!ALLOWED_FLAGS.has(token)) {
      return { holdReasonCode: 'HOLD_PAIR_P5_STEP_SELECTION_INVALID' };
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      return { holdReasonCode: 'HOLD_PAIR_P5_STEP_SELECTION_INVALID' };
    }
    switch (token) {
      case '--step':
        args.step = value;
        break;
      case '--project-ref':
        args.projectRef = value;
        break;
      case '--host-fingerprint-sha256':
        args.hostFingerprintSha256 = value;
        break;
      case '--repository-source':
        if (value !== 'git' && value !== 'synthetic-fixture') {
          return { holdReasonCode: 'HOLD_PAIR_P5_STEP_SELECTION_INVALID' };
        }
        args.repositorySource = value;
        break;
      case '--output':
        args.outputPath = value;
        break;
      case '--dedicated-receipt-json-path':
        args.dedicatedReceiptJsonPath = value;
        break;
      default:
        return { holdReasonCode: 'HOLD_PAIR_P5_STEP_SELECTION_INVALID' };
    }
    index += 1;
  }
  return args;
}

export async function runPreviewPairP5CheckoutAuthorizationGatedRealExecutionCli(
  argv: string[],
): Promise<{ exitCode: number; stdout: string }> {
  const parsed = parsePairP5CheckoutAuthGatedRealExecutionCliArgs(argv);
  if ('holdReasonCode' in parsed) {
    const envelope = {
      mode: 'PAIR_P5_AUTH_GATED_REAL_HOLD',
      ...PAIR_P5_CHECKOUT_STATIC_EXECUTION_GATE,
      readiness: PAIR_P5_CHECKOUT_AUTH_GATED_REAL_EXECUTION_READINESS,
      liveExecutionPrep: PAIR_P5_CHECKOUT_LIVE_EXECUTION_PREP_READINESS,
      holdReasonCode: parsed.holdReasonCode,
    };
    return { exitCode: 1, stdout: `${JSON.stringify(envelope, null, 2)}\n` };
  }

  try {
    assertPairP5CheckoutPrerequisiteLocalCodeIntegrity();
  } catch {
    return {
      exitCode: 1,
      stdout: `${JSON.stringify(
        {
          mode: 'PAIR_P5_AUTH_GATED_REAL_HOLD',
          ...PAIR_P5_CHECKOUT_STATIC_EXECUTION_GATE,
          readiness: PAIR_P5_CHECKOUT_AUTH_GATED_REAL_EXECUTION_READINESS,
          holdReasonCode: 'HOLD_PAIR_P5_PROBE_SHA_MISMATCH',
        },
        null,
        2,
      )}\n`,
    };
  }

  const selection = validateDedicatedPairP5CheckoutStepSelection(parsed.step);
  if (!selection.ok) {
    return {
      exitCode: 1,
      stdout: `${JSON.stringify(
        {
          mode: 'PAIR_P5_AUTH_GATED_REAL_HOLD',
          ...PAIR_P5_CHECKOUT_STATIC_EXECUTION_GATE,
          holdReasonCode: 'HOLD_PAIR_P5_STEP_SELECTION_INVALID',
          selectionError: selection.error,
        },
        null,
        2,
      )}\n`,
    };
  }

  const repositoryBinding =
    parsed.repositorySource === 'git'
      ? readPairP5RepositoryIdentityFromGit(PAIR_P5_EXPECTED_REPO_ROOT)
      : buildPairP5SyntheticFixtureRepositoryIdentity();

  let dedicatedTargetBindingReceipt = null;
  if (parsed.dedicatedReceiptJsonPath !== null) {
    const loaded = loadPairP5DedicatedTargetBindingReceiptFromOwnerControlledJsonFile(
      parsed.dedicatedReceiptJsonPath,
    );
    if (!loaded.ok) {
      const envelope = {
        mode: 'PAIR_P5_AUTH_GATED_REAL_HOLD',
        ...PAIR_P5_CHECKOUT_STATIC_EXECUTION_GATE,
        readiness: PAIR_P5_CHECKOUT_AUTH_GATED_REAL_EXECUTION_READINESS,
        holdReasonCode: loaded.holdReasonCode,
      };
      return { exitCode: 1, stdout: `${JSON.stringify(envelope, null, 2)}\n` };
    }
    dedicatedTargetBindingReceipt = loaded.receipt;
  }

  const result = await executePairP5CheckoutAuthorizationGatedRealExecution({
    repoRoot: PAIR_P5_EXPECTED_REPO_ROOT,
    repository: repositoryBinding.facts,
    repositoryFactsProvenance: repositoryBinding.provenance,
    target: {
      organization: 'm55-preview',
      project: 'm55-soul-preview',
      databaseTier: 'Primary Database',
      projectRef: parsed.projectRef,
      hostFingerprintSha256: parsed.hostFingerprintSha256,
    },
    selectedStep: PAIR_P5_CHECKOUT_STEP_ID,
    dedicatedTargetBindingReceipt,
  });

  const serialized = `${serializePairP5AuthGatedRealExecutionResult(result)}\n`;
  if (parsed.outputPath) {
    writeFileSync(parsed.outputPath, serialized, 'utf8');
  }
  const exitCode = pairP5CheckoutAuthGatedRealExecutionCliExitCode(result);
  return { exitCode, stdout: serialized };
}

async function main(): Promise<void> {
  const result = await runPreviewPairP5CheckoutAuthorizationGatedRealExecutionCli(process.argv.slice(2));
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
      `${JSON.stringify(
        {
          mode: 'PAIR_P5_AUTH_GATED_REAL_HOLD',
          holdReasonCode: 'HOLD_UNEXPECTED_INTERNAL',
          ...PAIR_P5_CHECKOUT_STATIC_EXECUTION_GATE,
        },
        null,
        2,
      )}\n`,
    );
    process.exit(1);
  });
}
