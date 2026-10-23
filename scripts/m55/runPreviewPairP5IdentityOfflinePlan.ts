#!/usr/bin/env node --experimental-strip-types
import { writeFileSync } from 'node:fs';

import {
  buildPairP5IdentityOfflinePlan,
  buildPairP5SyntheticFixtureRepositoryIdentity,
  PAIR_P5_STATIC_EXECUTION_GATE,
  readPairP5RepositoryIdentityFromGit,
  validateDedicatedPairP5IdentityStepSelection,
} from '../../lib/m55/previewRemoteApply/pairP5IdentityOfflinePlan.ts';
import {
  PAIR_P5_EXPECTED_REPO_ROOT,
  PAIR_P5_IDENTITY_STEP_ID,
} from '../../lib/m55/previewRemoteApply/pairP5IdentityStepAuthority.ts';
const ALLOWED_FLAGS = new Set([
  '--step',
  '--project-ref',
  '--host-fingerprint-sha256',
  '--repository-source',
  '--output',
]);

type RepositorySource = 'git' | 'synthetic-fixture';

type CliArgs = {
  step: string | null;
  projectRef: string | null;
  hostFingerprintSha256: string | null;
  repositorySource: RepositorySource;
  outputPath: string | null;
};

function parseArgs(
  argv: string[],
): CliArgs | { holdReasonCode: 'HOLD_PAIR_P5_STEP_SELECTION_INVALID' } {
  const args: CliArgs = {
    step: null,
    projectRef: null,
    hostFingerprintSha256: null,
    repositorySource: 'git',
    outputPath: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      return { holdReasonCode: 'HOLD_PAIR_P5_STEP_SELECTION_INVALID' };
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
      default:
        return { holdReasonCode: 'HOLD_PAIR_P5_STEP_SELECTION_INVALID' };
    }
    index += 1;
  }
  return args;
}

function main(): void {
  const parsed = parseArgs(process.argv.slice(2));
  if ('holdReasonCode' in parsed) {
    process.stdout.write(
      `${JSON.stringify({ mode: 'PAIR_P5_IDENTITY_OFFLINE_HOLD', ...PAIR_P5_STATIC_EXECUTION_GATE, holdReasonCode: parsed.holdReasonCode }, null, 2)}\n`,
    );
    process.exit(1);
  }
  const selection = validateDedicatedPairP5IdentityStepSelection(parsed.step);
  if (!selection.ok) {
    process.stdout.write(
      `${JSON.stringify({ mode: 'PAIR_P5_IDENTITY_OFFLINE_HOLD', ...PAIR_P5_STATIC_EXECUTION_GATE, holdReasonCode: 'HOLD_PAIR_P5_STEP_SELECTION_INVALID', selectionError: selection.error }, null, 2)}\n`,
    );
    process.exit(1);
  }

  const repositoryBinding =
    parsed.repositorySource === 'git'
      ? readPairP5RepositoryIdentityFromGit(PAIR_P5_EXPECTED_REPO_ROOT)
      : buildPairP5SyntheticFixtureRepositoryIdentity();

  const plan = buildPairP5IdentityOfflinePlan({
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
    selectedStep: PAIR_P5_IDENTITY_STEP_ID,
    executionEnablement: false,
  });

  const envelope = {
    repositoryFactsProvenance: repositoryBinding.provenance,
    plan,
  };
  const serialized = `${JSON.stringify(envelope, null, 2)}\n`;
  if (parsed.outputPath) {
    writeFileSync(parsed.outputPath, serialized, 'utf8');
  }
  process.stdout.write(serialized);
  process.exit(plan.mode === 'PAIR_P5_IDENTITY_OFFLINE_PLAN' ? 0 : 1);
}

main();
