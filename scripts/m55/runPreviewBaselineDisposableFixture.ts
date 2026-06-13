#!/usr/bin/env node --experimental-strip-types
/**
 * M55 Preview Baseline — disposable execution CLI (Revision-4 runtime).
 * --execute-local remains fail-closed until Human enablement gate.
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DISPOSABLE_RUNTIME_REVISION,
  EXECUTE_LOCAL_NOT_AUTHORIZED_ERROR,
  EXECUTION_ENABLEMENT_STATUS,
  EXECUTION_STRATEGY,
  parseDisposableExecutionFlags,
  runDisposableExecutionCli,
  stableStringify,
  // @ts-ignore TS5097 Node strip-types requires explicit .ts import suffix.
} from './previewBaselineDisposableRuntime.ts';

function repoRootFromModule(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, '..', '..');
}

function printUsage(): void {
  console.log(`Usage: runPreviewBaselineDisposableFixture.ts [flags]
Runtime: ${DISPOSABLE_RUNTIME_REVISION}
Strategy: ${EXECUTION_STRATEGY}
Enablement: ${EXECUTION_ENABLEMENT_STATUS}

Flags:
  --plan-execution          Emit side-effect-free disposable execution plan JSON.
  --verify-frozen-inputs    Read-only frozen artifact / contract validation.
  --execute-local           Implemented but unauthorized (${EXECUTE_LOCAL_NOT_AUTHORIZED_ERROR}).
  --help                    Print this usage text and exit 0.
  --workspace-root <path>   Required for --plan-execution (verified workspace).
  --repo-root <path>        Optional repo root override.
`);
}

function main(argv: string[]): number {
  if (argv.includes('--help')) {
    printUsage();
    return 0;
  }

  const flags = parseDisposableExecutionFlags(argv);
  const repoRoot = flags.repoRoot ?? repoRootFromModule();
  const { exitCode, payload } = runDisposableExecutionCli(repoRoot, flags);
  console.log(stableStringify(payload).trimEnd());
  return exitCode;
}

const modulePath = fileURLToPath(import.meta.url);
const executedDirectly = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  return resolve(entry) === modulePath;
})();

function ensureStripTypesAndRun(): void {
  const hasStripTypes = process.execArgv.some((arg) => arg.includes('experimental-strip-types'));
  if (!hasStripTypes) {
    const result = spawnSync(
      process.execPath,
      ['--experimental-strip-types', modulePath, ...process.argv.slice(2)],
      { stdio: 'inherit' }
    );
    process.exit(result.status === null ? 1 : result.status);
  }
  process.exitCode = main(process.argv.slice(2));
}

if (executedDirectly) {
  ensureStripTypesAndRun();
}
