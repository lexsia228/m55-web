import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { compositeStreamSha256 } from '../transactionNormalized/statementStream.ts';

import {
  FROZEN_DELTA_SOURCE_SPECS,
  FROZEN_PREVIEW_HISTORY_SNAPSHOT,
  INDEPENDENT_HISTORY_OBSERVATION_DIGEST_SHA256,
  R7_OFFLINE_ALLOWLIST_RELATIVE_PATHS,
  R7_PR249_FROZEN_BRANCH,
  R7_PR249_FROZEN_REPO_ROOT,
  R7_PR249_REVIEWED_BASE_ANCESTOR_SHA,
  assertGitSpawnOk,
  buildCanonicalExpectedManifest,
  buildPolicy2HistoryPayloadForDelta,
  classifyOfflineWorkspaceStage,
  detectCommittedCandidateWorkspacePattern,
  deriveNormalizedStatementsFromSourceBytes,
  evaluateR7D1D5OfflinePlan,
  interpretGitSpawn,
  parsePorcelainPaths,
  resolveConfinedRegularFileUnderRoot,
  validateManifestPayloadStrict,
  verifyIndependentHistoryObservationDigest,
  type WorkspaceGitObservation,
} from './r7D1D5OfflinePlan.ts';
import {
  observeWorkspaceGit,
  runGitCommand,
  runR7PreviewD1D5OfflinePlanCli,
} from '../../../scripts/m55/runR7PreviewD1D5OfflinePlan.ts';

const REPO_ROOT = R7_PR249_FROZEN_REPO_ROOT;
const MANIFEST_PATH = join(REPO_ROOT, 'docs/planning/r7-preview-delta/M55_R7_PR249_PREVIEW_D1_D5_OFFLINE_MANIFEST_V1.json');

const EXPECTED_COMPOSITES = {
  D1: 'a75610d21f75f791c6424817afed00dca5f21e3c9b16eed4955b8dd6d16023df',
  D2: '97a07e8deb1395812013ff15133116e99ebc5dabef212411d5e78dd24a9b15ea',
  D3: 'ddcf10b15831182577301364f694dafb7202fdfbf67ed8f772ea42b2b41d401c',
  D4: '5f8bc286e9912d8d84c51eef6d6868ec1bea2ab23646b6a9ea5057715e3f67a4',
  D5: '10bd7d078c535a389d7e5f1d10410591c8191657cfc3f1f161e31c54adaf49a4',
} as const;

function loadManifestOnDisk(): ReturnType<typeof JSON.parse> {
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
}

function makeFourFileUntrackedWorkspace(): WorkspaceGitObservation {
  const allowlist = [...R7_OFFLINE_ALLOWLIST_RELATIVE_PATHS].sort();
  return {
    repoRoot: REPO_ROOT,
    branch: R7_PR249_FROZEN_BRANCH,
    headCommitSha: R7_PR249_REVIEWED_BASE_ANCESTOR_SHA,
    porcelainLines: allowlist.map((p) => `?? ${p}`),
    stagedPaths: [],
    changedPathsSinceBase: [],
    trackedAllowlistPaths: [],
    isAncestor: (ancestor, descendant) =>
      ancestor === R7_PR249_REVIEWED_BASE_ANCESTOR_SHA && descendant === R7_PR249_REVIEWED_BASE_ANCESTOR_SHA,
  };
}

function makeCommittedCleanWorkspace(head = 'cccccccccccccccccccccccccccccccccccccccc'): WorkspaceGitObservation {
  const allowlist = [...R7_OFFLINE_ALLOWLIST_RELATIVE_PATHS].sort();
  return {
    repoRoot: REPO_ROOT,
    branch: R7_PR249_FROZEN_BRANCH,
    headCommitSha: head,
    porcelainLines: [],
    stagedPaths: [],
    changedPathsSinceBase: allowlist,
    trackedAllowlistPaths: allowlist,
    isAncestor: (ancestor, descendant) =>
      ancestor === R7_PR249_REVIEWED_BASE_ANCESTOR_SHA && descendant === head,
  };
}

describe('r7D1D5OfflinePlan', () => {
  it('independent history digest matches observation artifact', () => {
    assert.equal(
      verifyIndependentHistoryObservationDigest(FROZEN_PREVIEW_HISTORY_SNAPSHOT),
      INDEPENDENT_HISTORY_OBSERVATION_DIGEST_SHA256,
    );
  });

  it('derives stable normalized composite digests for all five deltas', () => {
    for (const spec of FROZEN_DELTA_SOURCE_SPECS) {
      const bytes = readFileSync(join(REPO_ROOT, spec.relativePath));
      const { normalized, statements } = deriveNormalizedStatementsFromSourceBytes(bytes, spec);
      assert.equal(normalized.normalizedStatementCount, spec.sourceStatementCount);
      assert.equal(normalized.normalizedStreamCompositeSha256, EXPECTED_COMPOSITES[spec.stepId]);
      assert.equal(compositeStreamSha256(statements), EXPECTED_COMPOSITES[spec.stepId]);
      buildPolicy2HistoryPayloadForDelta(spec, statements);
    }
  });

  it('classifies four-untracked audit stage', () => {
    assert.equal(classifyOfflineWorkspaceStage(makeFourFileUntrackedWorkspace()), 'FOUR_FILE_UNTRACKED_AUDIT');
  });

  it('committed-clean ancestry pattern is detected but never classified as READY stage', () => {
    const ws = makeCommittedCleanWorkspace();
    assert.equal(detectCommittedCandidateWorkspacePattern(ws), true);
    assert.equal(classifyOfflineWorkspaceStage(ws), null);
    const result = evaluateR7D1D5OfflinePlan({
      repoRoot: REPO_ROOT,
      workspace: ws,
      manifestOnDisk: loadManifestOnDisk(),
    });
    assert.equal(result.holdReasonCode, 'HOLD_COMMITTED_CANDIDATE_REQUIRES_EXTERNAL_BINDING');
  });

  it('HOLD staged index via workspace stage mismatch', () => {
    const ws = makeFourFileUntrackedWorkspace();
    const staged = { ...ws, stagedPaths: ['lib/m55/previewRemoteApply/r7D1D5OfflinePlan.ts'] };
    assert.equal(classifyOfflineWorkspaceStage(staged), null);
    const result = evaluateR7D1D5OfflinePlan({
      repoRoot: REPO_ROOT,
      workspace: staged,
      manifestOnDisk: loadManifestOnDisk(),
    });
    assert.equal(result.holdReasonCode, 'HOLD_WORKSPACE_STAGE_MISMATCH');
  });

  it('READY for four-untracked when manifest matches canonical expected', () => {
    const result = evaluateR7D1D5OfflinePlan({
      repoRoot: REPO_ROOT,
      workspace: makeFourFileUntrackedWorkspace(),
      manifestOnDisk: loadManifestOnDisk(),
    });
    assert.equal(result.mode, 'READY_FOR_INDEPENDENT_DELTA_REVIEW');
    if (result.mode === 'READY_FOR_INDEPENDENT_DELTA_REVIEW') {
      assert.equal(result.offlineWorkspaceStage, 'FOUR_FILE_UNTRACKED_AUDIT');
      assert.equal(result.manifest.authorization.executionAuthorized, false);
    }
  });

  it('HOLD on wrong branch', () => {
    const ws = { ...makeFourFileUntrackedWorkspace(), branch: 'main' };
    const result = evaluateR7D1D5OfflinePlan({
      repoRoot: REPO_ROOT,
      workspace: ws,
      manifestOnDisk: loadManifestOnDisk(),
    });
    assert.equal(result.holdReasonCode, 'HOLD_BRANCH_MISMATCH');
  });

  it('HOLD on partial untracked allowlist', () => {
    const ws = {
      ...makeFourFileUntrackedWorkspace(),
      porcelainLines: ['?? lib/m55/previewRemoteApply/r7D1D5OfflinePlan.ts'],
    };
    assert.equal(classifyOfflineWorkspaceStage(ws), null);
  });

  it('interpretGitSpawn: spawn error, signal, and empty required stdout fail closed', () => {
    assert.throws(
      () =>
        interpretGitSpawn(
          { spawnError: 'ENOENT', status: null, signal: null, stdout: undefined, stderr: '' },
          { kind: 'required_non_empty_text' },
        ),
      /HOLD_GIT_OBSERVATION_FAILED/,
    );
    assert.throws(
      () =>
        interpretGitSpawn(
          { spawnError: null, status: 0, signal: 'SIGTERM', stdout: 'ok', stderr: '' },
          { kind: 'required_non_empty_text' },
        ),
      /HOLD_GIT_OBSERVATION_FAILED/,
    );
    assert.throws(
      () =>
        interpretGitSpawn(
          { spawnError: null, status: 0, signal: null, stdout: '   \n', stderr: '' },
          { kind: 'required_non_empty_text' },
        ),
      /HOLD_GIT_OBSERVATION_FAILED/,
    );
    assert.throws(
      () =>
        interpretGitSpawn(
          { spawnError: null, status: 2, signal: null, stdout: '', stderr: '' },
          { kind: 'required_non_empty_text' },
        ),
      /HOLD_GIT_OBSERVATION_FAILED/,
    );
  });

  it('interpretGitSpawn optional/required stdout and stderr contract (table-driven)', () => {
    const passOptionalEmpty = {
      spawnError: null,
      status: 0,
      signal: null,
      stdout: '',
      stderr: '',
    } satisfies Parameters<typeof interpretGitSpawn>[0];
    assert.equal(interpretGitSpawn(passOptionalEmpty, { kind: 'optional_text' }), '');

    const holdCases: Array<{
      label: string;
      result: Parameters<typeof interpretGitSpawn>[0];
      contract: Parameters<typeof interpretGitSpawn>[1];
    }> = [
      {
        label: 'optional stdout undefined',
        result: { spawnError: null, status: 0, signal: null, stdout: undefined, stderr: '' },
        contract: { kind: 'optional_text' },
      },
      {
        label: 'required stdout undefined',
        result: { spawnError: null, status: 0, signal: null, stdout: undefined, stderr: '' },
        contract: { kind: 'required_non_empty_text' },
      },
      {
        label: 'optional nonempty stderr warning',
        result: { spawnError: null, status: 0, signal: null, stdout: '', stderr: 'warning' },
        contract: { kind: 'optional_text' },
      },
      {
        label: 'optional stderr undefined',
        result: { spawnError: null, status: 0, signal: null, stdout: '', stderr: undefined as unknown as string },
        contract: { kind: 'optional_text' },
      },
      {
        label: 'required empty stdout',
        result: { spawnError: null, status: 0, signal: null, stdout: '', stderr: '' },
        contract: { kind: 'required_non_empty_text' },
      },
      {
        label: 'is_ancestor stdout undefined',
        result: { spawnError: null, status: 0, signal: null, stdout: undefined, stderr: '' },
        contract: { kind: 'is_ancestor' },
      },
      {
        label: 'is_ancestor unexpected stdout payload',
        result: { spawnError: null, status: 0, signal: null, stdout: 'true\n', stderr: '' },
        contract: { kind: 'is_ancestor' },
      },
      {
        label: 'is_ancestor malformed exit',
        result: { spawnError: null, status: 128, signal: null, stdout: '', stderr: '' },
        contract: { kind: 'is_ancestor' },
      },
      {
        label: 'nonzero status regression',
        result: { spawnError: null, status: 2, signal: null, stdout: '', stderr: '' },
        contract: { kind: 'optional_text' },
      },
      {
        label: 'signal regression',
        result: { spawnError: null, status: 0, signal: 'SIGTERM', stdout: 'x', stderr: '' },
        contract: { kind: 'optional_text' },
      },
      {
        label: 'spawn error regression',
        result: { spawnError: 'ENOENT', status: null, signal: null, stdout: undefined, stderr: '' },
        contract: { kind: 'optional_text' },
      },
    ];

    for (const holdCase of holdCases) {
      assert.throws(
        () => interpretGitSpawn(holdCase.result, holdCase.contract),
        /HOLD_GIT_OBSERVATION_FAILED/,
        holdCase.label,
      );
    }
  });

  it('interpretGitSpawn: is_ancestor treats status 0/1 with valid empty string streams', () => {
    assert.equal(
      interpretGitSpawn(
        { spawnError: null, status: 0, signal: null, stdout: '', stderr: '' },
        { kind: 'is_ancestor' },
      ),
      true,
    );
    assert.equal(
      interpretGitSpawn(
        { spawnError: null, status: 1, signal: null, stdout: '', stderr: '' },
        { kind: 'is_ancestor' },
      ),
      false,
    );
  });

  it('assertGitSpawnOk fails closed on nonzero status for required stdout', () => {
    assert.throws(
      () =>
        assertGitSpawnOk(
          { spawnError: null, status: 1, signal: null, stdout: '', stderr: 'err' },
          true,
        ),
      /HOLD_GIT_OBSERVATION_FAILED/,
    );
  });

  it('runGitCommand surfaces spawnError when git is unavailable (contract)', () => {
    const result = runGitCommand('/nonexistent/m55-r7-git-root', ['status']);
    if (result.spawnError) {
      assert.throws(
        () => interpretGitSpawn(result, { kind: 'optional_text' }),
        /HOLD_GIT_OBSERVATION_FAILED/,
      );
    } else {
      assert.ok(result.status !== 0 || result.spawnError);
    }
  });

  it('path confinement rejects traversal, symlink parent, symlink file, directory, missing', () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'm55-r7-path-')));
    mkdirSync(join(root, 'nested'), { recursive: true });
    writeFileSync(join(root, 'nested', 'ok.txt'), 'ok', 'utf8');
    writeFileSync(join(root, 'escape.txt'), 'x', 'utf8');

    assert.throws(() => resolveConfinedRegularFileUnderRoot(root, '../escape.txt'), /HOLD_MANIFEST_PATH/);
    assert.throws(() => resolveConfinedRegularFileUnderRoot(root, 'nested/missing.txt'), /HOLD_MANIFEST_PATH/);

    mkdirSync(join(root, 'dirfile'));
    assert.throws(() => resolveConfinedRegularFileUnderRoot(root, 'dirfile'), /HOLD_MANIFEST_PATH/);

    const outsideDir = mkdtempSync(join(tmpdir(), 'm55-r7-outside-'));
    writeFileSync(join(outsideDir, 'outside.txt'), 'outside', 'utf8');
    symlinkSync(outsideDir, join(root, 'linked'), 'dir');
    assert.throws(
      () => resolveConfinedRegularFileUnderRoot(root, 'linked/outside.txt'),
      /HOLD_MANIFEST_PATH/,
    );

    symlinkSync(join(root, 'escape.txt'), join(root, 'nested', 'symlink.txt'));
    assert.throws(
      () => resolveConfinedRegularFileUnderRoot(root, 'nested/symlink.txt'),
      /HOLD_MANIFEST_PATH/,
    );

    assert.equal(resolveConfinedRegularFileUnderRoot(root, 'nested/ok.txt'), join(root, 'nested', 'ok.txt'));
  });

  it('deep-tamper authorization flags HOLD', () => {
    const expected = buildCanonicalExpectedManifest(REPO_ROOT);
    const tampered = JSON.parse(JSON.stringify(expected));
    tampered.authorization.executionAuthorized = true;
    assert.equal(validateManifestPayloadStrict(tampered, expected), 'HOLD_MANIFEST_SCHEMA_DRIFT');
  });

  it('deep-tamper history row name HOLD', () => {
    const expected = buildCanonicalExpectedManifest(REPO_ROOT);
    const tampered = JSON.parse(JSON.stringify(expected));
    tampered.startingHistoryPrefix[15].name = 'tampered';
    assert.equal(validateManifestPayloadStrict(tampered, expected), 'HOLD_MANIFEST_SCHEMA_DRIFT');
  });

  it('reject unknown manifest keys', () => {
    const expected = buildCanonicalExpectedManifest(REPO_ROOT);
    const tampered = JSON.parse(JSON.stringify(expected));
    tampered.extraKey = true;
    assert.equal(validateManifestPayloadStrict(tampered, expected), 'HOLD_MANIFEST_UNKNOWN_KEY');
  });

  it('synthetic injected four-untracked workspace reaches READY via evaluate (not live porcelain)', () => {
    const result = evaluateR7D1D5OfflinePlan({
      repoRoot: REPO_ROOT,
      workspace: makeFourFileUntrackedWorkspace(),
      manifestOnDisk: loadManifestOnDisk(),
    });
    assert.equal(result.mode, 'READY_FOR_INDEPENDENT_DELTA_REVIEW');
    if (result.mode === 'READY_FOR_INDEPENDENT_DELTA_REVIEW') {
      assert.equal(result.offlineWorkspaceStage, 'FOUR_FILE_UNTRACKED_AUDIT');
    }
  });

  it('CLI on live post-commit repository does not reach untracked-audit READY', () => {
    const { exitCode, payload } = runR7PreviewD1D5OfflinePlanCli(REPO_ROOT);
    assert.equal(exitCode, 1);
    assert.notEqual((payload as { mode: string }).mode, 'READY_FOR_INDEPENDENT_DELTA_REVIEW');
    const hold = (payload as { holdReasonCode?: string | null }).holdReasonCode;
    if (hold) {
      assert.notEqual(hold, 'HOLD_UNEXPECTED_INTERNAL');
    }
  });

  it('CLI rejects forbidden --apply flag', () => {
    const original = process.argv;
    process.argv = [...original.slice(0, 2), '--apply'];
    const { exitCode, payload } = runR7PreviewD1D5OfflinePlanCli(REPO_ROOT);
    process.argv = original;
    assert.equal(exitCode, 1);
    assert.match(JSON.stringify(payload), /FORBIDDEN_FLAG:apply/);
  });

  it('CLI merge-base not-ancestor returns false without treating exit 1 as HOLD', () => {
    const ws = observeWorkspaceGit(REPO_ROOT);
    assert.equal(
      ws.isAncestor(R7_PR249_REVIEWED_BASE_ANCESTOR_SHA, ws.headCommitSha),
      true,
    );
    assert.equal(
      ws.isAncestor(ws.headCommitSha, R7_PR249_REVIEWED_BASE_ANCESTOR_SHA),
      false,
    );
  });

  it('parsePorcelain separates untracked and tracked changes', () => {
    const parsed = parsePorcelainPaths(['?? a.txt', ' M b.txt']);
    assert.deepEqual(parsed.untracked, ['a.txt']);
    assert.deepEqual(parsed.trackedChanges, ['b.txt']);
  });

  it('history prefix lengths D1=16 through D5=20 post', () => {
    const manifest = buildCanonicalExpectedManifest(REPO_ROOT);
    assert.equal(manifest.steps[0].historyPrefixPrior.length, 16);
    assert.equal(manifest.steps[0].historyPrefixPost.length, 17);
    assert.equal(manifest.steps[4].historyPrefixPrior.length, 20);
    assert.equal(manifest.steps[4].historyPrefixPost.length, 21);
  });
});
