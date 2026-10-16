#!/usr/bin/env node --experimental-strip-types
import { readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import {
  evaluateR7D1D5OfflinePlan,
  interpretGitSpawn,
  R7_OFFLINE_ALLOWLIST_RELATIVE_PATHS,
  R7_PR249_REVIEWED_BASE_ANCESTOR_SHA,
  resolveConfinedManifestPath,
  type GitSpawnResult,
  type WorkspaceGitObservation,
} from '../../lib/m55/previewRemoteApply/r7D1D5OfflinePlan.ts';

const FORBIDDEN_FLAG_FRAGMENTS = [
  'apply',
  'execute',
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
  'manifest-path',
  'repo-root',
] as const;

export function runGitCommand(repoRoot: string, args: readonly string[]): GitSpawnResult {
  const result = spawnSync('git', [...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: process.env,
  });
  return {
    spawnError: result.error ? result.error.message : null,
    status: result.status,
    signal: result.signal,
    stdout: result.stdout === null || result.stdout === undefined ? undefined : result.stdout,
    stderr: result.stderr ?? '',
  };
}

export function observeWorkspaceGit(repoRoot: string): WorkspaceGitObservation {
  const branchOut = interpretGitSpawn(
    runGitCommand(repoRoot, ['branch', '--show-current']),
    { kind: 'required_non_empty_text' },
  ) as string;
  const headOut = interpretGitSpawn(runGitCommand(repoRoot, ['rev-parse', 'HEAD']), {
    kind: 'required_non_empty_text',
  }) as string;
  const statusOut = interpretGitSpawn(
    runGitCommand(repoRoot, ['status', '--porcelain=v1', '-uall']),
    { kind: 'optional_text' },
  ) as string;
  const stagedOut = interpretGitSpawn(runGitCommand(repoRoot, ['diff', '--cached', '--name-only']), {
    kind: 'optional_text',
  }) as string;
  const changedOut = interpretGitSpawn(
    runGitCommand(repoRoot, [
      'diff',
      '--name-only',
      `${R7_PR249_REVIEWED_BASE_ANCESTOR_SHA}..HEAD`,
    ]),
    { kind: 'optional_text' },
  ) as string;
  const trackedOut = interpretGitSpawn(
    runGitCommand(repoRoot, ['ls-files', '--', ...R7_OFFLINE_ALLOWLIST_RELATIVE_PATHS]),
    { kind: 'optional_text' },
  ) as string;

  const porcelainLines = statusOut.length === 0 ? [] : statusOut.split('\n').filter((l) => l.length > 0);
  const stagedPaths =
    stagedOut.trim().length === 0 ? [] : stagedOut.trim().split('\n').filter((l) => l.length > 0);
  const changedPathsSinceBase =
    changedOut.trim().length === 0 ? [] : changedOut.trim().split('\n').filter((l) => l.length > 0);
  const trackedAllowlistPaths =
    trackedOut.trim().length === 0 ? [] : trackedOut.trim().split('\n').filter((l) => l.length > 0);

  const isAncestor = (ancestor: string, descendant: string): boolean =>
    interpretGitSpawn(
      runGitCommand(repoRoot, ['merge-base', '--is-ancestor', ancestor, descendant]),
      { kind: 'is_ancestor' },
    ) as boolean;

  return {
    repoRoot,
    branch: branchOut,
    headCommitSha: headOut,
    porcelainLines,
    stagedPaths,
    changedPathsSinceBase,
    trackedAllowlistPaths,
    isAncestor,
  };
}

function classifyForbiddenFlag(token: string): string | null {
  const lower = token.toLowerCase();
  for (const fragment of FORBIDDEN_FLAG_FRAGMENTS) {
    if (lower.includes(fragment)) {
      return fragment;
    }
  }
  return null;
}

function parseArgv(argv: string[]): { error: string } | { ok: true } {
  for (const token of argv) {
    if (token === '--help' || token === '-h') {
      return { error: 'HELP_REQUESTED' };
    }
    const forbidden = classifyForbiddenFlag(token);
    if (forbidden) {
      return { error: `FORBIDDEN_FLAG:${forbidden}` };
    }
    if (!token.startsWith('--')) {
      return { error: 'UNKNOWN_POSITIONAL' };
    }
    return { error: 'UNKNOWN_FLAG' };
  }
  return { ok: true };
}

function emit(result: unknown, exitCode: number): never {
  const bounded = JSON.stringify(result, null, 2);
  if (bounded.length > 512_000) {
    process.stdout.write(
      `${JSON.stringify({ mode: 'R7_D1_D5_OFFLINE_HOLD', holdReasonCode: 'HOLD_UNEXPECTED_INTERNAL' })}\n`,
    );
    process.exit(1);
  }
  process.stdout.write(`${bounded}\n`);
  process.exit(exitCode);
}

export function runR7PreviewD1D5OfflinePlanCli(repoRootInput?: string): {
  exitCode: number;
  payload: unknown;
} {
  const parsed = parseArgv(process.argv.slice(2));
  if ('error' in parsed) {
    return {
      exitCode: 1,
      payload: {
        mode: 'R7_D1_D5_OFFLINE_HOLD',
        holdReasonCode: 'HOLD_UNEXPECTED_INTERNAL',
        cliError: parsed.error,
      },
    };
  }

  try {
    const repoRoot = realpathSync(resolve(repoRootInput ?? process.cwd()));
    const workspace = observeWorkspaceGit(repoRoot);
    const manifestPath = resolveConfinedManifestPath(repoRoot);
    const manifestOnDisk = JSON.parse(readFileSync(manifestPath, 'utf8'));

    const result = evaluateR7D1D5OfflinePlan({
      repoRoot,
      workspace,
      manifestOnDisk,
    });

    return {
      exitCode: result.mode === 'READY_FOR_INDEPENDENT_DELTA_REVIEW' ? 0 : 1,
      payload: {
        ...result,
        cli: {
          offlineOnly: true,
          remoteConnectionAttempted: false,
          databaseMutationAuthorized: false,
        },
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const holdReasonCode = message.includes('HOLD_GIT')
      ? 'HOLD_GIT_OBSERVATION_FAILED'
      : message.includes('HOLD_MANIFEST_PATH')
        ? 'HOLD_MANIFEST_PATH_VIOLATION'
        : message.includes('HOLD_ALLOWLIST')
          ? 'HOLD_ALLOWLIST_FILE_MISMATCH'
          : 'HOLD_UNEXPECTED_INTERNAL';
    return {
      exitCode: 1,
      payload: { mode: 'R7_D1_D5_OFFLINE_HOLD', holdReasonCode },
    };
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { exitCode, payload } = runR7PreviewD1D5OfflinePlanCli();
  emit(payload, exitCode);
}
