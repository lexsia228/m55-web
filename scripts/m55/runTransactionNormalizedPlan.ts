#!/usr/bin/env node --experimental-strip-types
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  EXPECTED_BRANCH,
  EXPECTED_REPO_ROOT,
  EXPECTED_SOURCE_AUTHORITY_HEAD,
  SOURCE_AUTHORITY_HEAD_REBIND_BLOCKER,
  AUTHORITY_CONTRACT_REL_PATH,
  AUTHORITY_MATRIX_REL_PATH,
  AUTHORITY_PARSER_EVIDENCE_REL_PATH,
  parsePlanVersionSelector,
  runTransactionNormalizedPlan,
  sanitizeHoldReasonCode,
} from '../../lib/m55/transactionNormalized/transactionNormalizedCore.ts';

const FORBIDDEN_ARG_FRAGMENTS = [
  'execute',
  'db-url',
  'database-url',
  'credential',
  'password',
  'remote',
  'apply',
] as const;

function findRepoRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../..');
}

function parseSingleSelector(argv: string[]): string {
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const lower = arg.toLowerCase();
    for (const forbidden of FORBIDDEN_ARG_FRAGMENTS) {
      if (lower.includes(forbidden)) {
        throw new Error('FORBIDDEN_ARGUMENT');
      }
    }
    if (arg === '--help' || arg === '-h') {
      continue;
    }
    if (arg.startsWith('-')) {
      throw new Error('UNKNOWN_ARGUMENT');
    }
    positional.push(arg);
  }

  if (positional.length === 0) {
    return 'ALL';
  }
  if (positional.length > 1) {
    throw new Error('EXTRA_ARGUMENT');
  }
  return positional[0];
}

function formatCliOutput(result: ReturnType<typeof runTransactionNormalizedPlan>): string {
  const payload = {
    mode: result.mode,
    coreValidation: result.coreValidation,
    executionState: result.executionState,
    selectedVersions: result.selectedVersions,
    authorityIdentities: {
      ...result.authorityIdentities,
      expectedRepoRoot: EXPECTED_REPO_ROOT,
      expectedBranch: EXPECTED_BRANCH,
      expectedHead: EXPECTED_SOURCE_AUTHORITY_HEAD,
      contractPath: AUTHORITY_CONTRACT_REL_PATH,
      matrixPath: AUTHORITY_MATRIX_REL_PATH,
      parserEvidencePath: AUTHORITY_PARSER_EVIDENCE_REL_PATH,
    },
    perVersionStatus: result.perVersionStatus,
    stageBBlockers: result.stageBBlockers,
    executionLock: result.executionLock,
    targetFingerprintReadiness: result.targetFingerprintReadiness,
    holdReasonCode: result.holdReasonCode,
    expectedPreImplementationHead: EXPECTED_SOURCE_AUTHORITY_HEAD,
    planOnlyPassIsNotExecutionAuthorization: true,
    executionRemainsLocked: true,
    sourceAuthorityHeadRebindBlocker: SOURCE_AUTHORITY_HEAD_REBIND_BLOCKER,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

function main(argv: string[]): number {
  try {
    const rawSelector = parseSingleSelector(argv);
    const selector = parsePlanVersionSelector(rawSelector);
    if (selector === null) {
      process.stdout.write(
        `${JSON.stringify(
          {
            mode: 'PLAN_ONLY',
            coreValidation: 'PRE_DB_HOLD',
            holdReasonCode: 'PLAN_SELECTOR_INVALID',
          },
          null,
          2,
        )}\n`,
      );
      return 1;
    }

    const repoRoot = findRepoRoot();
    const result = runTransactionNormalizedPlan({
      repoRoot,
      planVersionSelector: selector,
    });
    process.stdout.write(formatCliOutput(result));
    return result.coreValidation === 'PLAN_ONLY_PASS' ? 0 : 1;
  } catch (error) {
    const code = sanitizeHoldReasonCode(error instanceof Error ? error.message : 'INVALID_ARGUMENT');
    process.stderr.write(`${code}\n`);
    return 1;
  }
}

const modulePath = fileURLToPath(import.meta.url);
const executedDirectly = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  return resolve(entry) === modulePath;
})();

if (executedDirectly) {
  process.exitCode = main(process.argv.slice(2));
}
