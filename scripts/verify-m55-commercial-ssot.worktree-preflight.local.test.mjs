import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  WT001_ID,
  WT009_ID,
  WT009_EXPECTED_PATH,
  WT009_EXPECTED_HEAD,
  PRE_MERGE_SNAPSHOT_BRANCH,
  POST_MERGE_EXPECTED_BRANCH,
  EXPECTED_POST_MERGE_NEXT_SINGLE_ACTION,
  CANONICAL_WT_HEADING_LABELS,
  WT_HEADING_SEPARATOR,
  BASELINE_AUTHORITY_GRAMMAR,
  parseWorktreeListPorcelain,
  parseRegistryWorktreeEntries,
  parseRegistryWorktreeSection,
  parseRegistryDocument,
  parseRegistryHeadings,
  buildMarkdownFenceMask,
  splitRegistryLines,
  parseFenceOpeningLine,
  parseFenceClosingLine,
  expectedRegistryHeadingLine,
  classifyRegistryHeadingLine,
  parseWt001RegistrySnapshot,
  parsePostMergeNextSingleAction,
  parseShaFromBaselineField,
  parseShaFromHeadField,
  formatRegistryParserErrors,
  evaluateWt009RegistryPreflight,
  gitObjectExists,
  isAncestorOrEqual,
  isWorktreeClean,
  hasGitOperationInProgress,
  gitPathExists,
  evaluateWt001SnapshotPreflight,
  evaluateWorktreePreflightWarnings,
} from './verify-m55-commercial-ssot.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_SHA = '575791f2ab80d57c89317e07da4b8020cfba3485';
const BOOTSTRAP_BRANCH = 'chore/m55-worktree-registry-current-state-bootstrap-rev1';
const FIXTURE_BASE_SHA = '3ea803eaffd83a67434ffa032319cb915fd163f9';
const VERIFIER_REL_PATH = 'scripts/verify-m55-commercial-ssot.mjs';

function runGit(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function assertGitObjectExists(objectish, cwd) {
  const result = spawnSync('git', ['cat-file', '-e', objectish], { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, `expected git object ${objectish} in ${cwd}`);
}

function buildCleanStateDisposableFixture() {
  const fixtureParent = fs.mkdtempSync(path.join(os.tmpdir(), 'm55-clean-proof-'));
  const fixtureRoot = path.join(fixtureParent, 'repo');
  const verifierSourcePath = path.join(REPO_ROOT, VERIFIER_REL_PATH);

  assert.ok(fs.existsSync(verifierSourcePath), 'verifier source file must exist');
  assertGitObjectExists(FIXTURE_BASE_SHA, REPO_ROOT);

  const clone = spawnSync('git', ['clone', REPO_ROOT, fixtureRoot], { encoding: 'utf8' });
  assert.equal(clone.status, 0, clone.stderr || clone.stdout);

  const cloneTip = runGit(['rev-parse', 'HEAD'], fixtureRoot);
  runGit(['checkout', FIXTURE_BASE_SHA], fixtureRoot);
  runGit(['checkout', '-B', BOOTSTRAP_BRANCH], fixtureRoot);

  assert.equal(runGit(['rev-parse', 'HEAD'], fixtureRoot), FIXTURE_BASE_SHA);
  assert.equal(runGit(['branch', '--show-current'], fixtureRoot), BOOTSTRAP_BRANCH);

  const fixtureVerifierPath = path.join(fixtureRoot, VERIFIER_REL_PATH);
  fs.writeFileSync(fixtureVerifierPath, fs.readFileSync(verifierSourcePath, 'utf8'));

  const diffNames = runGit(['diff', '--name-only'], fixtureRoot);
  assert.notEqual(diffNames.trim(), '', 'expected verifier copy to produce a non-empty diff');
  assert.match(diffNames, /scripts\/verify-m55-commercial-ssot\.mjs/);

  assert.equal(runGit(['diff', '--cached', '--name-only'], fixtureRoot).trim(), '');

  runGit(['add', VERIFIER_REL_PATH], fixtureRoot);

  const stagedPaths = runGit(['diff', '--cached', '--name-only'], fixtureRoot);
  assert.deepEqual(stagedPaths.split('\n').filter(Boolean), [VERIFIER_REL_PATH]);

  runGit(['commit', '-m', 'temp: disposable clean-state verifier proof'], fixtureRoot);

  const head = runGit(['rev-parse', 'HEAD'], fixtureRoot);
  assert.notEqual(head, FIXTURE_BASE_SHA, 'temporary commit must be non-empty');
  assert.equal(runGit(['rev-parse', 'HEAD^'], fixtureRoot), FIXTURE_BASE_SHA);
  assert.equal(runGit(['rev-list', '--count', `${FIXTURE_BASE_SHA}..HEAD`], fixtureRoot), '1');
  assert.equal(isWorktreeClean(fixtureRoot), true);
  assert.equal(isAncestorOrEqual(BASELINE_SHA, head, fixtureRoot), true);

  return { fixtureParent, fixtureRoot, head, cloneTip };
}

function initRepoWithHistory() {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'm55-preflight-'));
  const dir = path.join(parent, 'M55_WORKTREE-home-final-ia-v1');
  fs.mkdirSync(dir, { recursive: true });
  runGit(['init'], dir);
  runGit(['config', 'user.email', 'test@example.com'], dir);
  runGit(['config', 'user.name', 'M55 Test'], dir);
  fs.writeFileSync(path.join(dir, 'README.md'), 'baseline\n');
  runGit(['add', 'README.md'], dir);
  runGit(['commit', '-m', 'baseline'], dir);
  const baselineSha = runGit(['rev-parse', 'HEAD'], dir);
  fs.appendFileSync(path.join(dir, 'README.md'), 'child\n');
  runGit(['add', 'README.md'], dir);
  runGit(['commit', '-m', 'child'], dir);
  const childSha = runGit(['rev-parse', 'HEAD'], dir);
  runGit(['checkout', '-b', 'bootstrap-branch'], dir);
  return { dir, parent, baselineSha, childSha };
}

function buildCurrentState({ transitionValue = EXPECTED_POST_MERGE_NEXT_SINGLE_ACTION, duplicate = false } = {}) {
  const duplicateRow = duplicate
    ? `| **postMergeNextSingleAction** | ${EXPECTED_POST_MERGE_NEXT_SINGLE_ACTION} |\n`
    : '';
  return `# Current State\n\n| Field | Value |\n|---|---|\n| **postMergeNextSingleAction** | ${transitionValue} |\n${duplicateRow}| **HOME_FINAL_DESIGN_COPY_PRODUCT_SSOT** | NOT_YET |\n\nGate bootstrap wording elsewhere must not substitute.\n`;
}

function buildRegistryText({
  wt001Path,
  branch = 'bootstrap-branch',
  baselineSha,
  headSha,
  wt001ExtraRows = '',
  wt002ExtraRows = '',
  wt009ExtraRows = '',
  wt002Branch = 'feat/do-not-use',
  wt009Branch = 'feat/build-week',
  includeTransition = true,
} = {}) {
  const head = headSha ?? baselineSha;
  const transitionBlock = includeTransition
    ? `### Documented post-merge transition (WT-001)\n\n| Phase | branch | HEAD |\n|---|---|---|\n| Current (bootstrap REV2) | \`${branch}\` | \`${baselineSha}\` |\n\n`
    : '';
  return `# Registry\n\n${transitionBlock}### WT-001 — PRIMARY_MAIN_HOME\n\n| Field | Value |\n|---|---|\n| path | \`${wt001Path}\` |\n| branch | \`${branch}\` |\n| HEAD | \`${head}\` |\n| baseline | \`main\` @ \`${baselineSha}\` |\n| lifecycle | **ACTIVE** + **PRIMARY_MAIN_HOME** |\n| purpose | **PRIMARY_MAIN_HOME** — post–PR #74 commercial funnel baseline worktree |\n${wt001ExtraRows}\n### WT-002 — Compatibility purchase delivery (DO NOT USE)\n\n| Field | Value |\n|---|---|\n| path | \`/tmp/wt-002\` |\n| branch | \`${wt002Branch}\` |\n| HEAD | \`${'a'.repeat(40)}\` |\n| lifecycle | **DO_NOT_USE** |\n| purpose | Historical compatibility commerce lane |\n${wt002ExtraRows}\n### WT-009 — Build Week Control Plane (operational freeze)\n\n| Field | Value |\n|---|---|\n| id | WT-009 |\n| path | \`${WT009_EXPECTED_PATH}\` |\n| branch | \`feat/m55-build-week-control-plane-v1\` |\n| HEAD | \`${WT009_EXPECTED_HEAD}\` |\n| lifecycle | **PAUSED** |\n| operational state | **FROZEN_BY_HUMAN_DECISION** |\n| purpose | **FROZEN_BUILD_WEEK_EVIDENCE_AND_EXTERNAL_CONTROL_PLANE** |\n${wt009ExtraRows}`;
}

function snapshotArgs(repo, registry, currentState, entryOverrides = {}) {
  return {
    entry: {
      path: repo.dir,
      branch: 'bootstrap-branch',
      head: repo.childSha,
      detached: false,
      ...entryOverrides,
    },
    wt001Parse: parseWt001RegistrySnapshot(registry),
    registryText: registry,
    transitionParse: parsePostMergeNextSingleAction(currentState),
    gitCwd: repo.dir,
  };
}

function wt001Section(wt001Path, branch, baselineSha, headSha, extraRows = '') {
  const head = headSha ?? baselineSha;
  return `### WT-001 — PRIMARY_MAIN_HOME\n\n| Field | Value |\n|---|---|\n| path | \`${wt001Path}\` |\n| branch | \`${branch}\` |\n| HEAD | \`${head}\` |\n| baseline | \`main\` @ \`${baselineSha}\` |\n| lifecycle | **ACTIVE** + **PRIMARY_MAIN_HOME** |\n| purpose | **PRIMARY_MAIN_HOME** — post–PR #74 commercial funnel baseline worktree |\n${extraRows}`;
}

function createGitMarker(repo, markerName, content = '') {
  const resolved = gitPathExists(repo.dir, markerName);
  assert.equal(resolved.error, false);
  assert.ok(resolved.path);
  if (markerName === 'rebase-merge' || markerName === 'rebase-apply') {
    fs.mkdirSync(resolved.path, { recursive: true });
    return resolved.path;
  }
  fs.mkdirSync(path.dirname(resolved.path), { recursive: true });
  fs.writeFileSync(resolved.path, content);
  return resolved.path;
}

describe('structured registry parsing', () => {
  it('parses WT sections without bleeding into later entries', () => {
    const baselineSha = 'b'.repeat(40);
    const registry = buildRegistryText({
      wt001Path: '/exact/wt-001',
      branch: 'bootstrap-branch',
      baselineSha,
      wt002Branch: 'bootstrap-branch',
    });
    const entries = parseRegistryWorktreeEntries(registry);
    const wt001 = entries.find((entry) => entry.id === WT001_ID);
    const wt002 = entries.find((entry) => entry.id === 'WT-002');
    assert.equal(wt001.path, '/exact/wt-001');
    assert.equal(wt001.branch, 'bootstrap-branch');
    assert.equal(wt002.branch, 'bootstrap-branch');
    assert.notEqual(wt001.path, wt002.path);
  });

  it('does not treat same suffix path as WT-001 without exact registry path match', () => {
    const registry = buildRegistryText({
      wt001Path: '/tmp/exact/M55_WORKTREE-home-final-ia-v1',
      branch: 'bootstrap-branch',
      baselineSha: 'c'.repeat(40),
    });
    const snapshot = parseWt001RegistrySnapshot(registry);
    assert.equal(snapshot.valid, true, formatRegistryParserErrors(snapshot.errors));
    assert.equal(snapshot.snapshot.path, '/tmp/exact/M55_WORKTREE-home-final-ia-v1');
    assert.notEqual(snapshot.snapshot.path, '/other/prefix/M55_WORKTREE-home-final-ia-v1');
  });
});

describe('machine-readable transition parsing', () => {
  it('accepts the exact postMergeNextSingleAction row', () => {
    const parsed = parsePostMergeNextSingleAction(buildCurrentState());
    assert.equal(parsed.valid, true);
  });

  it('rejects missing, duplicate, unrelated, and bootstrap-only prose', () => {
    assert.equal(parsePostMergeNextSingleAction('# no table').valid, false);
    assert.equal(parsePostMergeNextSingleAction(buildCurrentState({ duplicate: true })).valid, false);
    assert.equal(
      parsePostMergeNextSingleAction(buildCurrentState({ transitionValue: 'wrong sequence' })).valid,
      false,
    );
    assert.equal(
      parsePostMergeNextSingleAction('# Current State\n\nGate bootstrap wording elsewhere must not substitute.\n').valid,
      false,
    );
  });
});

describe('WT-001 snapshot PASS cases', () => {
  let repo;

  before(() => {
    repo = initRepoWithHistory();
  });

  after(() => {
    fs.rmSync(repo.parent, { recursive: true, force: true });
  });

  it('passes when live HEAD equals baseline snapshot', () => {
    runGit(['checkout', '-B', 'bootstrap-branch', repo.baselineSha], repo.dir);
    const registry = buildRegistryText({ wt001Path: repo.dir, baselineSha: repo.baselineSha });
    const currentState = buildCurrentState();
    const result = evaluateWt001SnapshotPreflight(
      snapshotArgs(repo, registry, currentState, { head: repo.baselineSha }),
    );
    assert.equal(result.pass, true);
  });

  it('passes when live HEAD is a descendant of baseline snapshot', () => {
    const registry = buildRegistryText({ wt001Path: repo.dir, baselineSha: repo.baselineSha });
    const result = evaluateWt001SnapshotPreflight(
      snapshotArgs(repo, registry, buildCurrentState()),
    );
    assert.equal(result.pass, true);
  });

  it('passes aggregate preflight without warnings for descendant HEAD', () => {
    const registry = buildRegistryText({ wt001Path: repo.dir, baselineSha: repo.baselineSha });
    const { warnings, logs } = evaluateWorktreePreflightWarnings(
      [{ path: repo.dir, branch: 'bootstrap-branch', head: repo.childSha, detached: false }],
      registry,
      buildCurrentState(),
      repo.dir,
    );
    assert.equal(warnings.length, 0);
    assert.match(logs.join('\n'), /WT-001 HEAD .* is at or after registry baseline snapshot/);
  });
});

describe('WT-001 snapshot FAIL cases', () => {
  let repo;

  before(() => {
    repo = initRepoWithHistory();
  });

  after(() => {
    fs.rmSync(repo.parent, { recursive: true, force: true });
  });

  it('fails for unrelated HEAD', () => {
    runGit(['checkout', '--orphan', 'orphan-branch'], repo.dir);
    fs.writeFileSync(path.join(repo.dir, 'orphan.txt'), 'orphan\n');
    runGit(['add', 'orphan.txt'], repo.dir);
    runGit(['commit', '-m', 'orphan'], repo.dir);
    const orphanSha = runGit(['rev-parse', 'HEAD'], repo.dir);
    const registry = buildRegistryText({
      wt001Path: repo.dir,
      branch: 'orphan-branch',
      baselineSha: repo.baselineSha,
    });
    const result = evaluateWt001SnapshotPreflight(
      snapshotArgs(repo, registry, buildCurrentState(), {
        branch: 'orphan-branch',
        head: orphanSha,
      }),
    );
    assert.equal(result.pass, false);
    assert.match(result.reason, /not baseline or descendant/);
  });

  it('fails for wrong branch', () => {
    const registry = buildRegistryText({
      wt001Path: repo.dir,
      branch: 'expected-branch',
      baselineSha: repo.baselineSha,
    });
    const result = evaluateWt001SnapshotPreflight(snapshotArgs(repo, registry, buildCurrentState()));
    assert.equal(result.pass, false);
    assert.match(result.reason, /branch mismatch/);
  });

  it('fails for detached HEAD at baseline', () => {
    runGit(['checkout', '--detach', repo.baselineSha], repo.dir);
    const registry = buildRegistryText({ wt001Path: repo.dir, baselineSha: repo.baselineSha });
    const result = evaluateWt001SnapshotPreflight(
      snapshotArgs(repo, registry, buildCurrentState(), {
        branch: null,
        head: repo.baselineSha,
        detached: true,
      }),
    );
    assert.equal(result.pass, false);
    assert.match(result.reason, /detached HEAD/);
  });

  it('fails for unstaged, staged, and untracked dirtiness', () => {
    const registry = buildRegistryText({ wt001Path: repo.dir, baselineSha: repo.baselineSha });
    const currentState = buildCurrentState();

    fs.writeFileSync(path.join(repo.dir, 'dirty-unstaged.txt'), 'x\n');
    let result = evaluateWt001SnapshotPreflight(snapshotArgs(repo, registry, currentState));
    assert.match(result.reason, /dirty/);
    fs.rmSync(path.join(repo.dir, 'dirty-unstaged.txt'));

    fs.writeFileSync(path.join(repo.dir, 'dirty-staged.txt'), 'x\n');
    runGit(['add', 'dirty-staged.txt'], repo.dir);
    result = evaluateWt001SnapshotPreflight(snapshotArgs(repo, registry, currentState));
    assert.match(result.reason, /dirty/);
    runGit(['reset', 'HEAD', 'dirty-staged.txt'], repo.dir);
    fs.rmSync(path.join(repo.dir, 'dirty-staged.txt'));

    fs.writeFileSync(path.join(repo.dir, 'dirty-untracked.txt'), 'x\n');
    result = evaluateWt001SnapshotPreflight(snapshotArgs(repo, registry, currentState));
    assert.match(result.reason, /dirty/);
    fs.rmSync(path.join(repo.dir, 'dirty-untracked.txt'));
  });

  it('fails for baseline object missing and transition row problems', () => {
    const registry = buildRegistryText({
      wt001Path: repo.dir,
      baselineSha: 'd'.repeat(40),
    });
    let result = evaluateWt001SnapshotPreflight(snapshotArgs(repo, registry, buildCurrentState()));
    assert.match(result.reason, /baseline SHA object missing/);

    result = evaluateWt001SnapshotPreflight(
      snapshotArgs(repo, buildRegistryText({ wt001Path: repo.dir, baselineSha: repo.baselineSha, includeTransition: false }), buildCurrentState()),
    );
    assert.match(result.reason, /postMergeNextSingleAction row missing|documented post-merge transition missing/);
  });

  it('fails for git operation markers without silent pass', () => {
    const registry = buildRegistryText({ wt001Path: repo.dir, baselineSha: repo.baselineSha });
    const currentState = buildCurrentState();
    const markers = [
      ['MERGE_HEAD', `${repo.baselineSha}\n`],
      ['CHERRY_PICK_HEAD', `${repo.baselineSha}\n`],
      ['REVERT_HEAD', `${repo.baselineSha}\n`],
      ['rebase-merge', ''],
      ['rebase-apply', ''],
    ];

    for (const [marker, content] of markers) {
      const markerPath = createGitMarker(repo, marker, content);
      try {
        const result = evaluateWt001SnapshotPreflight(snapshotArgs(repo, registry, currentState));
        assert.equal(result.pass, false);
        assert.match(result.reason, /git operation in progress/);
      } finally {
        fs.rmSync(markerPath, { recursive: true, force: true });
      }
    }
  });

  it('does not fallback to legacy after snapshot failure', () => {
    fs.writeFileSync(path.join(repo.dir, 'fallback.txt'), 'dirty\n');
    const registry = buildRegistryText({ wt001Path: repo.dir, baselineSha: repo.baselineSha });
    const { warnings, logs } = evaluateWorktreePreflightWarnings(
      [{ path: repo.dir, branch: 'bootstrap-branch', head: repo.childSha, detached: false }],
      registry,
      buildCurrentState(),
      repo.dir,
    );
    assert.match(warnings.join('\n'), /WT-001 snapshot preflight failed/);
    assert.doesNotMatch(logs.join('\n'), /pre-merge snapshot/);
    fs.rmSync(path.join(repo.dir, 'fallback.txt'));
  });

  it('fails for unregistered path and same-suffix different path', () => {
    const registry = buildRegistryText({
      wt001Path: '/tmp/exact/M55_WORKTREE-home-final-ia-v1',
      baselineSha: repo.baselineSha,
    });
    const unregistered = evaluateWorktreePreflightWarnings(
      [{ path: '/tmp/unregistered-worktree', branch: 'x', head: repo.childSha, detached: false }],
      registry,
      buildCurrentState(),
      repo.dir,
    );
    assert.match(unregistered.warnings[0], /missing from registry/);

    const suffixOnly = evaluateWorktreePreflightWarnings(
      [{ path: repo.dir, branch: 'bootstrap-branch', head: repo.childSha, detached: false }],
      registry,
      buildCurrentState(),
      repo.dir,
    );
    assert.match(
      suffixOnly.warnings.join('\n'),
      /missing from registry|WT-001 state not authorized|snapshot preflight failed/,
    );
  });
});

describe('non-WT-001 isolation and regression', () => {
  let repo;

  before(() => {
    repo = initRepoWithHistory();
  });

  after(() => {
    fs.rmSync(repo.parent, { recursive: true, force: true });
  });

  it('does not apply descendant exception to WT-002 or WT-009', () => {
    const registry = buildRegistryText({
      wt001Path: '/tmp/exact/M55_WORKTREE-home-final-ia-v1',
      baselineSha: repo.baselineSha,
    });
    const wt002 = evaluateWorktreePreflightWarnings(
      [{ path: '/tmp/wt-002', branch: 'feat/do-not-use', head: repo.childSha, detached: false }],
      registry,
      buildCurrentState(),
      repo.dir,
    );
    assert.equal(wt002.warnings.some((warning) => warning.includes('HEAD mismatch')), true);

    const wt009 = evaluateWorktreePreflightWarnings(
      [{
        path: WT009_EXPECTED_PATH,
        branch: 'feat/m55-build-week-control-plane-v1',
        head: repo.childSha,
        detached: false,
      }],
      registry,
      buildCurrentState(),
      repo.dir,
    );
    assert.match(wt009.warnings.join('\n'), /WT-009 HEAD mismatch/i);
  });

  it('does not PASS earlier entries from later section branch or SHA matches', () => {
    const registry = buildRegistryText({
      wt001Path: '/tmp/wt-001',
      branch: 'wt-001-branch',
      baselineSha: 'e'.repeat(40),
      wt002Branch: 'bootstrap-branch',
    }).replace(`| HEAD | \`${'a'.repeat(40)}\` |`, `| HEAD | \`${repo.baselineSha}\` |`, 1);
    const { warnings } = evaluateWorktreePreflightWarnings(
      [{ path: '/tmp/wt-001', branch: 'wt-001-branch', head: repo.childSha, detached: false }],
      registry,
      buildCurrentState(),
      repo.dir,
    );
    assert.match(warnings.join('\n'), /WT-001 state not authorized|HEAD mismatch|snapshot preflight failed/);
  });

  it('still allows valid historical pre-merge and main post-merge WT-001 states', () => {
    const wt001Path = '/tmp/exact/M55_WORKTREE-home-final-ia-v1';
    const registry = `# Registry\n\nDocumented post-merge transition\n\n${wt001Section(wt001Path, PRE_MERGE_SNAPSHOT_BRANCH, repo.baselineSha, repo.baselineSha)}\n\n### WT-002 — Compatibility purchase delivery (DO NOT USE)\n\n| Field | Value |\n|---|---|\n| path | \`/tmp/wt-002\` |\n| branch | \`feat/do-not-use\` |\n| HEAD | \`${'a'.repeat(40)}\` |\n| lifecycle | **DO_NOT_USE** |\n| purpose | Historical compatibility commerce lane |\n\n### WT-009 — Build Week Control Plane (operational freeze)\n\n| Field | Value |\n|---|---|\n| id | WT-009 |\n| path | \`${WT009_EXPECTED_PATH}\` |\n| branch | \`feat/m55-build-week-control-plane-v1\` |\n| HEAD | \`${WT009_EXPECTED_HEAD}\` |\n| lifecycle | **PAUSED** |\n| operational state | **FROZEN_BY_HUMAN_DECISION** |\n| purpose | **FROZEN_BUILD_WEEK_EVIDENCE_AND_EXTERNAL_CONTROL_PLANE** |\n`;

    const mainState = evaluateWorktreePreflightWarnings(
      [{ path: wt001Path, branch: POST_MERGE_EXPECTED_BRANCH, head: repo.childSha, detached: false }],
      registry,
      buildCurrentState(),
      repo.dir,
    );
    assert.equal(mainState.warnings.length, 0);
    assert.match(mainState.logs.join('\n'), /WT-001 on main — matches documented post-merge transition/);

    const preMergeState = evaluateWorktreePreflightWarnings(
      [{ path: wt001Path, branch: PRE_MERGE_SNAPSHOT_BRANCH, head: repo.childSha, detached: false }],
      registry,
      buildCurrentState(),
      repo.dir,
    );
    assert.equal(preMergeState.warnings.length, 0);
  });

  it('uses real git ancestor checks', () => {
    assert.equal(isAncestorOrEqual(repo.baselineSha, repo.childSha, repo.dir), true);
    assert.equal(gitObjectExists(repo.baselineSha, repo.dir), true);
    assert.equal(isWorktreeClean(repo.dir), true);
    assert.equal(hasGitOperationInProgress(repo.dir), false);
  });
});

describe('baseline field parsing', () => {
  let repo;

  before(() => {
    repo = initRepoWithHistory();
  });

  after(() => {
    fs.rmSync(repo.parent, { recursive: true, force: true });
  });

  it('PASSes with explicit baseline and descendant HEAD even when HEAD differs', () => {
    const registry = buildRegistryText({
      wt001Path: repo.dir,
      baselineSha: repo.baselineSha,
      headSha: 'f'.repeat(40),
    });
    const parsed = parseWt001RegistrySnapshot(registry);
    assert.equal(parsed.valid, true);
    assert.equal(parsed.snapshot.baselineSha, repo.baselineSha);
    assert.equal(parsed.snapshot.headSha, 'f'.repeat(40));
    const result = evaluateWt001SnapshotPreflight(snapshotArgs(repo, registry, buildCurrentState()));
    assert.equal(result.pass, true);
  });

  it('FAILs when baseline is missing, empty, malformed, or duplicated', () => {
    const missing = `# Registry\n\nDocumented post-merge transition\n\n${wt001Section(repo.dir, 'bootstrap-branch', repo.baselineSha, repo.baselineSha).replace('| baseline | `main` @ `' + repo.baselineSha + '` |', '')}\n`;
    assert.equal(parseWt001RegistrySnapshot(missing).valid, false);
    assert.match(formatRegistryParserErrors(parseWt001RegistrySnapshot(missing).errors), /baseline missing/);

    const duplicateSame = buildRegistryText({
      wt001Path: repo.dir,
      baselineSha: repo.baselineSha,
      wt001ExtraRows: `| baseline | \`main\` @ \`${repo.baselineSha}\` |`,
    });
    assert.equal(parseWt001RegistrySnapshot(duplicateSame).valid, false);
    assert.match(formatRegistryParserErrors(parseWt001RegistrySnapshot(duplicateSame).errors), /baseline duplicate/);

    const duplicateConflict = buildRegistryText({
      wt001Path: repo.dir,
      baselineSha: repo.baselineSha,
      wt001ExtraRows: `| baseline | \`main\` @ \`${'c'.repeat(40)}\` |`,
    });
    assert.equal(parseWt001RegistrySnapshot(duplicateConflict).valid, false);

    const empty = buildRegistryText({
      wt001Path: repo.dir,
      baselineSha: repo.baselineSha,
    }).replace(`| baseline | \`main\` @ \`${repo.baselineSha}\` |`, '| baseline |  |');
    assert.equal(parseWt001RegistrySnapshot(empty).valid, false);
    assert.match(formatRegistryParserErrors(parseWt001RegistrySnapshot(empty).errors), /baseline empty/);

    const malformed = buildRegistryText({
      wt001Path: repo.dir,
      baselineSha: repo.baselineSha,
    }).replace(`| baseline | \`main\` @ \`${repo.baselineSha}\` |`, '| baseline | not-a-sha |');
    assert.equal(parseWt001RegistrySnapshot(malformed).valid, false);
    assert.match(formatRegistryParserErrors(parseWt001RegistrySnapshot(malformed).errors), /baseline invalid/);
  });

  it('FAILs with valid HEAD but missing or invalid baseline', () => {
    const missingBaseline = `# Registry\n\nDocumented post-merge transition\n\n${wt001Section(repo.dir, 'bootstrap-branch', repo.baselineSha, repo.baselineSha).replace('| baseline | `main` @ `' + repo.baselineSha + '` |', '')}\n`;
    const missingParse = parseWt001RegistrySnapshot(missingBaseline);
    assert.equal(missingParse.valid, false);
    const missingEval = evaluateWt001SnapshotPreflight({
      ...snapshotArgs(repo, missingBaseline, buildCurrentState()),
      wt001Parse: missingParse,
    });
    assert.equal(missingEval.pass, false);

    const invalidBaseline = buildRegistryText({
      wt001Path: repo.dir,
      baselineSha: repo.baselineSha,
    }).replace(`| baseline | \`main\` @ \`${repo.baselineSha}\` |`, '| baseline | broken |');
    const invalidParse = parseWt001RegistrySnapshot(invalidBaseline);
    assert.equal(invalidParse.valid, false);
    const invalidEval = evaluateWt001SnapshotPreflight({
      ...snapshotArgs(repo, invalidBaseline, buildCurrentState()),
      wt001Parse: invalidParse,
    });
    assert.equal(invalidEval.pass, false);

    const validHeadInvalidBaseline = buildRegistryText({
      wt001Path: repo.dir,
      baselineSha: repo.baselineSha,
      headSha: repo.childSha,
    }).replace(
      `| baseline | \`main\` @ \`${repo.baselineSha}\` |`,
      `| baseline | note \`main\` @ \`${repo.baselineSha}\` |`,
    );
    const grammarParse = parseWt001RegistrySnapshot(validHeadInvalidBaseline);
    assert.equal(grammarParse.valid, false);
    assert.match(formatRegistryParserErrors(grammarParse.errors), /baseline invalid/);
  });
});

describe('required field exactly-once validation', () => {
  let repo;

  before(() => {
    repo = initRepoWithHistory();
  });

  after(() => {
    fs.rmSync(repo.parent, { recursive: true, force: true });
  });

  it('FAILs when lifecycle is duplicated', () => {
    const registry = buildRegistryText({
      wt001Path: repo.dir,
      baselineSha: repo.baselineSha,
      wt001ExtraRows: '| lifecycle | **ACTIVE** + **PRIMARY_MAIN_HOME** |',
    });
    const parsed = parseWt001RegistrySnapshot(registry);
    assert.equal(parsed.valid, false);
    assert.match(formatRegistryParserErrors(parsed.errors), /lifecycle duplicate/i);
  });

  it('FAILs when purpose is duplicated', () => {
    const registry = buildRegistryText({
      wt001Path: repo.dir,
      baselineSha: repo.baselineSha,
      wt001ExtraRows: '| purpose | **PRIMARY_MAIN_HOME** — note |',
    });
    assert.match(formatRegistryParserErrors(parseWt001RegistrySnapshot(registry).errors), /purpose duplicate/i);
  });

  it('FAILs when HEAD is duplicated', () => {
    const registry = buildRegistryText({
      wt001Path: repo.dir,
      baselineSha: repo.baselineSha,
      wt001ExtraRows: `| HEAD | \`${'d'.repeat(40)}\` |`,
    });
    assert.match(formatRegistryParserErrors(parseWt001RegistrySnapshot(registry).errors), /HEAD duplicate/i);
  });

  it('FAILs when path is duplicated', () => {
    const registry = buildRegistryText({
      wt001Path: repo.dir,
      baselineSha: repo.baselineSha,
      wt001ExtraRows: '| path | `/tmp/other` |',
    });
    assert.match(formatRegistryParserErrors(parseWt001RegistrySnapshot(registry).errors), /path duplicate/i);
  });

  it('FAILs when branch is duplicated', () => {
    const registry = buildRegistryText({
      wt001Path: repo.dir,
      baselineSha: repo.baselineSha,
      wt001ExtraRows: '| branch | `other-branch` |',
    });
    assert.match(formatRegistryParserErrors(parseWt001RegistrySnapshot(registry).errors), /branch duplicate/i);
  });

  it('FAILs when lifecycle is missing', () => {
    const registry = buildRegistryText({
      wt001Path: repo.dir,
      baselineSha: repo.baselineSha,
    }).replace('| lifecycle | **ACTIVE** + **PRIMARY_MAIN_HOME** |', '');
    assert.match(formatRegistryParserErrors(parseWt001RegistrySnapshot(registry).errors), /lifecycle missing/i);
  });

  it('FAILs when purpose is missing', () => {
    const registry = buildRegistryText({
      wt001Path: repo.dir,
      baselineSha: repo.baselineSha,
    }).replace('| purpose | **PRIMARY_MAIN_HOME** — post–PR #74 commercial funnel baseline worktree |', '');
    assert.match(formatRegistryParserErrors(parseWt001RegistrySnapshot(registry).errors), /purpose missing/i);
  });

  it('FAILs when HEAD is missing', () => {
    const registry = buildRegistryText({
      wt001Path: repo.dir,
      baselineSha: repo.baselineSha,
    }).replace(`| HEAD | \`${repo.baselineSha}\` |`, '');
    assert.match(formatRegistryParserErrors(parseWt001RegistrySnapshot(registry).errors), /HEAD missing/i);
  });

  it('FAILs when path is missing', () => {
    const registry = buildRegistryText({
      wt001Path: repo.dir,
      baselineSha: repo.baselineSha,
    }).replace(`| path | \`${repo.dir}\` |`, '');
    assert.match(formatRegistryParserErrors(parseWt001RegistrySnapshot(registry).errors), /path missing/i);
  });

  it('FAILs when branch is missing', () => {
    const registry = buildRegistryText({
      wt001Path: repo.dir,
      baselineSha: repo.baselineSha,
    }).replace('| branch | `bootstrap-branch` |', '');
    assert.match(formatRegistryParserErrors(parseWt001RegistrySnapshot(registry).errors), /branch missing/i);
  });

  it('FAILs when operational state is absent for WT-001 without requiring the field', () => {
    const parsed = parseWt001RegistrySnapshot(
      buildRegistryText({ wt001Path: repo.dir, baselineSha: repo.baselineSha }),
    );
    assert.equal(parsed.valid, true);
    assert.equal(parsed.snapshot.operationalState, null);
  });

  it('requires operational state exactly once for WT-009 only', () => {
    const validWt009 = parseRegistryWorktreeEntries(
      buildRegistryText({ wt001Path: '/tmp/wt-001', baselineSha: repo.baselineSha }),
    ).find((entry) => entry.id === WT009_ID);
    assert.equal(validWt009.valid, true);
    assert.equal(validWt009.operationalState, 'FROZEN_BY_HUMAN_DECISION');

    const missingOpState = buildRegistryText({
      wt001Path: '/tmp/wt-001',
      baselineSha: repo.baselineSha,
    }).replace('| operational state | **FROZEN_BY_HUMAN_DECISION** |', '');
    const wt009 = parseRegistryWorktreeEntries(missingOpState).find((entry) => entry.id === WT009_ID);
    assert.equal(wt009.valid, false);
    assert.match(formatRegistryParserErrors(wt009.errors), /operational state missing/i);
  });
});

describe('section safety for baseline and duplicates', () => {
  let repo;

  before(() => {
    repo = initRepoWithHistory();
  });

  after(() => {
    fs.rmSync(repo.parent, { recursive: true, force: true });
  });

  it('FAILs when baseline exists only in the next WT section', () => {
    const registry = `# Registry\n\nDocumented post-merge transition\n\n### WT-001 — PRIMARY_MAIN_HOME\n\n| Field | Value |\n|---|---|\n| path | \`/tmp/wt-001\` |\n| branch | \`bootstrap-branch\` |\n| HEAD | \`${repo.baselineSha}\` |\n| lifecycle | **ACTIVE** + **PRIMARY_MAIN_HOME** |\n| purpose | **PRIMARY_MAIN_HOME** — note |\n\n### WT-002 — Compatibility purchase delivery (DO NOT USE)\n\n| Field | Value |\n|---|---|\n| baseline | \`main\` @ \`${repo.baselineSha}\` |\n| path | \`/tmp/wt-002\` |\n| branch | \`feat/do-not-use\` |\n| HEAD | \`${'a'.repeat(40)}\` |\n| lifecycle | **DO_NOT_USE** |\n| purpose | Historical lane |\n`;
    const parsed = parseWt001RegistrySnapshot(registry);
    assert.equal(parsed.valid, false);
    assert.match(formatRegistryParserErrors(parsed.errors), /baseline missing/i);
  });

  it('does not PASS WT-001 using a valid baseline from a later section', () => {
    const registry = buildRegistryText({
      wt001Path: '/tmp/wt-001',
      branch: 'bootstrap-branch',
      baselineSha: 'e'.repeat(40),
      wt002ExtraRows: `| baseline | \`main\` @ \`${repo.baselineSha}\` |`,
    });
    const { warnings } = evaluateWorktreePreflightWarnings(
      [{ path: '/tmp/wt-001', branch: 'bootstrap-branch', head: repo.childSha, detached: false }],
      registry,
      buildCurrentState(),
      repo.dir,
    );
    assert.match(warnings.join('\n'), /snapshot preflight failed|registry parser failure|not baseline or descendant/);
  });
});

describe('WT section heading validation', () => {
  let repo;

  before(() => {
    repo = initRepoWithHistory();
  });

  after(() => {
    fs.rmSync(repo.parent, { recursive: true, force: true });
  });

  function registryWithHeadings(wt001Heading, wt009Heading = '### WT-009 — Build Week Control Plane (operational freeze)') {
    const base = buildRegistryText({ wt001Path: repo.dir, baselineSha: repo.baselineSha });
    return base
      .replace('### WT-001 — PRIMARY_MAIN_HOME', wt001Heading)
      .replace('### WT-009 — Build Week Control Plane (operational freeze)', wt009Heading);
  }

  it('PASSes with valid unique headings', () => {
    const doc = parseRegistryDocument(buildRegistryText({ wt001Path: repo.dir, baselineSha: repo.baselineSha }));
    assert.equal(doc.duplicateHeadingErrors.length, 0);
    assert.equal(doc.malformedHeadingErrors.length, 0);
    assert.equal(doc.missingRequiredEntryErrors.length, 0);
  });

  it('FAILs duplicate WT-001, WT-009, and other WT headings', () => {
    for (const [label, heading] of [
      ['WT-001', '### WT-001 — PRIMARY_MAIN_HOME'],
      ['WT-009', '### WT-009 — Build Week Control Plane (operational freeze)'],
      ['WT-002', '### WT-002 — Compatibility purchase delivery (DO NOT USE)'],
    ]) {
      const doc = parseRegistryDocument(
        `${registryWithHeadings('### WT-001 — PRIMARY_MAIN_HOME')}\n${heading}\n`,
      );
      assert.match(
        formatRegistryParserErrors(doc.duplicateHeadingErrors),
        new RegExp(`${label} heading duplicate`, 'i'),
      );
    }
  });

  for (const malformed of [
    '### WT-01',
    '### WT-0001',
    '### wt-001',
    '### WT-001 extra',
  ]) {
    it(`FAILs malformed heading ${malformed}`, () => {
      const doc = parseRegistryDocument(registryWithHeadings(malformed));
      assert.ok(doc.malformedHeadingErrors.length > 0);
    });
  }

  it('FAILs heading identity conflict with section id field', () => {
    const registry = buildRegistryText({
      wt001Path: repo.dir,
      baselineSha: repo.baselineSha,
    }).replace('| id | WT-009 |', '| id | WT-002 |');
    const wt009 = parseRegistryDocument(registry).entries.find((entry) => entry.id === WT009_ID);
    assert.equal(wt009.valid, false);
    assert.match(wt009.errors.map((error) => error.message).join('; '), /identity conflict/i);
  });
});

describe('canonical registry heading grammar', () => {
  let repo;

  before(() => {
    repo = initRepoWithHistory();
  });

  after(() => {
    fs.rmSync(repo.parent, { recursive: true, force: true });
  });

  it('PASSes production authority headings for WT-001 through WT-009', () => {
    for (const [id, label] of Object.entries(CANONICAL_WT_HEADING_LABELS)) {
      const heading = expectedRegistryHeadingLine(id);
      assert.equal(classifyRegistryHeadingLine(heading).kind, 'valid');
      assert.equal(heading, `### ${id}${WT_HEADING_SEPARATOR}${label}`);
    }
  });

  it('FAILs bare heading, arbitrary suffix, label mismatch, and separator variants', () => {
    assert.equal(classifyRegistryHeadingLine('### WT-001').kind, 'invalid-label');
    assert.equal(classifyRegistryHeadingLine('### WT-001 — arbitrary text').kind, 'invalid-label');
    assert.equal(classifyRegistryHeadingLine('### WT-001 — PRIMARY_MAIN_HOME trailing').kind, 'invalid-label');
    assert.equal(classifyRegistryHeadingLine('### WT-001 - PRIMARY_MAIN_HOME').kind, 'malformed');
    assert.equal(classifyRegistryHeadingLine('### WT-001  — PRIMARY_MAIN_HOME').kind, 'malformed');

    const registry = buildRegistryText({ wt001Path: repo.dir, baselineSha: repo.baselineSha }).replace(
      expectedRegistryHeadingLine('WT-001'),
      '### WT-001 — arbitrary text',
    );
    const doc = parseRegistryDocument(registry);
    assert.ok(doc.invalidHeadingLabelErrors.some((error) => error.id === WT001_ID));
  });
});

describe('markdown fenced code heading exclusion', () => {
  let repo;

  before(() => {
    repo = initRepoWithHistory();
  });

  after(() => {
    fs.rmSync(repo.parent, { recursive: true, force: true });
  });

  function fencedRegistry(fenceBody, { fenceOpen = '```md', fenceClose = '```' } = {}) {
    const base = buildRegistryText({ wt001Path: repo.dir, baselineSha: repo.baselineSha });
    return `${base}\n${fenceOpen}\n${fenceBody}\n${fenceClose}\n`;
  }

  it('ignores valid, duplicate, and malformed WT headings inside backtick and tilde fences', () => {
    for (const body of [
      expectedRegistryHeadingLine('WT-001'),
      `${expectedRegistryHeadingLine('WT-001')}\n${expectedRegistryHeadingLine('WT-001')}`,
      '### WT-01',
      '### WT-001 extra',
    ]) {
      const backtickDoc = parseRegistryDocument(fencedRegistry(body));
      assert.equal(backtickDoc.duplicateHeadingErrors.length, 0);
      assert.equal(backtickDoc.malformedHeadingErrors.length, 0);
      assert.equal(backtickDoc.invalidHeadingLabelErrors.length, 0);

      const tildeDoc = parseRegistryDocument(fencedRegistry(body, { fenceOpen: '~~~', fenceClose: '~~~' }));
      assert.equal(tildeDoc.duplicateHeadingErrors.length, 0);
      assert.equal(tildeDoc.malformedHeadingErrors.length, 0);
    }
  });

  it('still FAILs fence-outside duplicate and malformed headings', () => {
    const duplicateOutside = `${buildRegistryText({ wt001Path: repo.dir, baselineSha: repo.baselineSha })}\n${expectedRegistryHeadingLine('WT-001')}\n`;
    assert.ok(parseRegistryDocument(duplicateOutside).duplicateHeadingErrors.length > 0);

    const malformedOutside = buildRegistryText({ wt001Path: repo.dir, baselineSha: repo.baselineSha }).replace(
      expectedRegistryHeadingLine('WT-001'),
      '### WT-001 extra',
    );
    assert.ok(parseRegistryDocument(malformedOutside).malformedHeadingErrors.length > 0);
  });

  it('handles fence close rules and inline code heading strings', () => {
    const longerClose = buildMarkdownFenceMask(['```', '### WT-001 — PRIMARY_MAIN_HOME', '````']);
    assert.equal(longerClose.inFenceByLine[1], true);
    assert.equal(longerClose.unclosedFenceErrors.length, 0);

    const mismatchedClose = buildMarkdownFenceMask(['```', '### WT-001 — PRIMARY_MAIN_HOME', '~~~']);
    assert.equal(mismatchedClose.inFenceByLine[1], true);
    assert.equal(mismatchedClose.unclosedFenceErrors.length, 1);

    const shorterClose = buildMarkdownFenceMask(['````', '### WT-001 — PRIMARY_MAIN_HOME', '```']);
    assert.equal(shorterClose.inFenceByLine[1], true);
    assert.equal(shorterClose.unclosedFenceErrors.length, 1);

    assert.equal(classifyRegistryHeadingLine('example `### WT-001 — PRIMARY_MAIN_HOME` note'), null);
  });

  it('FAILs unclosed backtick and tilde fences through preflight path', () => {
    for (const [fenceOpen, label] of [['```md', 'backtick'], ['~~~', 'tilde']]) {
      const registry = `${buildRegistryText({ wt001Path: repo.dir, baselineSha: repo.baselineSha })}\n${fenceOpen}\n${expectedRegistryHeadingLine('WT-001')}\n`;
      const doc = parseRegistryDocument(registry);
      assert.equal(doc.unclosedFenceErrors.length, 1);
      const { warnings } = evaluateWorktreePreflightWarnings(
        [{ path: repo.dir, branch: 'bootstrap-branch', head: repo.childSha, detached: false }],
        registry,
        buildCurrentState(),
        repo.dir,
      );
      assert.match(warnings.join('\n'), new RegExp(`unclosed.*${label}|fenced code block unclosed`, 'i'));
    }
  });
});

describe('markdown fence scanner grammar', () => {
  let repo;

  before(() => {
    repo = initRepoWithHistory();
  });

  after(() => {
    fs.rmSync(repo.parent, { recursive: true, force: true });
  });

  function openFence() {
    return { char: '`', length: 3 };
  }

  it('rejects closing fences with trailing non-whitespace and accepts spaces or tabs only', () => {
    assert.equal(parseFenceClosingLine('``` not-a-close', openFence()), false);
    assert.equal(parseFenceClosingLine('~~~ comment', { char: '~', length: 3 }), false);
    assert.equal(parseFenceClosingLine('```x', openFence()), false);
    assert.equal(parseFenceClosingLine('~~~#', { char: '~', length: 3 }), false);
    assert.equal(parseFenceClosingLine('```   ', openFence()), true);
    assert.equal(parseFenceClosingLine('```\t', openFence()), true);
    assert.equal(parseFenceClosingLine('```', openFence()), true);
  });

  it('keeps fence state after false closes and fails unclosed when only false closes exist', () => {
    const heading = expectedRegistryHeadingLine('WT-001');
    const mask = buildMarkdownFenceMask(['```', heading, '``` not-a-close', heading]);
    assert.equal(mask.inFenceByLine[1], true);
    assert.equal(mask.inFenceByLine[2], true);
    assert.equal(mask.unclosedFenceErrors.length, 1);

    const doc = parseRegistryDocument(
      `${buildRegistryText({ wt001Path: repo.dir, baselineSha: repo.baselineSha })}\n\`\`\`\n${heading}\n\`\`\` trailing\n`,
    );
    assert.equal(doc.unclosedFenceErrors.length, 1);
    assert.equal(doc.duplicateHeadingErrors.length, 0);
  });

  it('recognizes 0 to 3 space indented opening and closing fences for backtick and tilde', () => {
    for (const spaces of ['', ' ', '  ', '   ']) {
      const open = `${spaces}\`\`\`md`;
      const close = `${spaces}\`\`\``;
      const mask = buildMarkdownFenceMask([open, expectedRegistryHeadingLine('WT-001'), close]);
      assert.equal(mask.inFenceByLine[1], true, `backtick indent ${spaces.length}`);
      assert.equal(mask.unclosedFenceErrors.length, 0, `backtick indent ${spaces.length}`);

      const tildeOpen = `${spaces}~~~`;
      const tildeClose = `${' '.repeat(Math.max(0, 3 - spaces.length))}~~~`;
      const tildeMask = buildMarkdownFenceMask([tildeOpen, expectedRegistryHeadingLine('WT-001'), tildeClose]);
      assert.equal(tildeMask.inFenceByLine[1], true, `tilde indent ${spaces.length}`);
      assert.equal(tildeMask.unclosedFenceErrors.length, 0, `tilde indent ${spaces.length}`);
    }
  });

  it('does not treat 4-space indented fence openers or headings as fenced or registry headings', () => {
    assert.equal(parseFenceOpeningLine('    ```'), null);
    const fourSpaceHeading = `    ${expectedRegistryHeadingLine('WT-001')}`;
    assert.equal(classifyRegistryHeadingLine(fourSpaceHeading), null);

    const mask = buildMarkdownFenceMask(['    ```', 'plain content', '    ```']);
    assert.equal(mask.inFenceByLine.every((value) => value === false), true);
    assert.equal(mask.unclosedFenceErrors.length, 0);

    const doc = parseRegistryDocument(
      `${buildRegistryText({ wt001Path: repo.dir, baselineSha: repo.baselineSha })}\n    \`\`\`\n    ${expectedRegistryHeadingLine('WT-001')}\n`,
    );
    assert.equal(doc.unclosedFenceErrors.length, 0);
    assert.equal(doc.duplicateHeadingErrors.length, 0);
  });

  it('handles marker length/type boundaries and backtick info-string rules', () => {
    const shorterClose = buildMarkdownFenceMask(['````', 'content', '```']);
    assert.equal(shorterClose.inFenceByLine[1], true);
    assert.equal(shorterClose.unclosedFenceErrors.length, 1);

    const longerClose = buildMarkdownFenceMask(['```', 'content', '````']);
    assert.equal(longerClose.inFenceByLine[1], true);
    assert.equal(longerClose.unclosedFenceErrors.length, 0);

    const mismatchedClose = buildMarkdownFenceMask(['```', 'content', '~~~']);
    assert.equal(mismatchedClose.inFenceByLine[1], true);
    assert.equal(mismatchedClose.unclosedFenceErrors.length, 1);

    assert.deepEqual(parseFenceOpeningLine('```md'), { char: '`', length: 3, info: 'md', indentSpaces: 0 });
    assert.equal(parseFenceOpeningLine('```not`valid'), null);
    assert.deepEqual(parseFenceOpeningLine('~~~`ok`'), { char: '~', length: 3, info: '`ok`', indentSpaces: 0 });
  });

  it('supports CRLF input and documents without a trailing newline', () => {
    const crlf = '```md\r\n### WT-001 — PRIMARY_MAIN_HOME\r\n```\r\n';
    const crlfMask = buildMarkdownFenceMask(crlf);
    assert.equal(crlfMask.inFenceByLine[1], true);
    assert.equal(crlfMask.unclosedFenceErrors.length, 0);

    const noTrailingNewline = buildMarkdownFenceMask(['```', 'content', '```'].join('\n'));
    assert.equal(noTrailingNewline.unclosedFenceErrors.length, 0);

    const crlfDoc = parseRegistryDocument(
      `${buildRegistryText({ wt001Path: repo.dir, baselineSha: repo.baselineSha })}\r\n\`\`\`md\r\n${expectedRegistryHeadingLine('WT-001')}\r\n\`\`\``,
    );
    assert.equal(crlfDoc.unclosedFenceErrors.length, 0);
    assert.equal(crlfDoc.duplicateHeadingErrors.length, 0);
  });
});

describe('strict baseline grammar', () => {
  it('PASSes exact authority grammar and rejects invalid variants', () => {
    const sha = 'a'.repeat(40);
    assert.equal(parseShaFromBaselineField(`\`main\` @ \`${sha}\``).ok, true);
    assert.equal(parseShaFromBaselineField(`\`develop\` @ \`${sha}\``).ok, false);
    assert.equal(parseShaFromBaselineField(`\`main\` @ \`${sha.slice(0, 12)}\``).ok, false);
    assert.equal(parseShaFromBaselineField(`\`main\` @ \`${sha.toUpperCase()}\``).ok, false);
    assert.equal(parseShaFromBaselineField('main @ `' + sha + '`').ok, false);
    assert.equal(parseShaFromBaselineField('`main` `' + sha + '`').ok, false);
    assert.equal(parseShaFromBaselineField('`main` @ `' + sha + '` trailing').ok, false);
    assert.equal(parseShaFromBaselineField('leading `main` @ `' + sha + '`').ok, false);
    assert.equal(parseShaFromBaselineField(`\`main\` @ \`${sha}\` @ \`${sha}\``).ok, false);
    assert.equal(parseShaFromBaselineField(`note \`main\` @ \`${sha}\``).ok, false);
    assert.equal(parseShaFromBaselineField(`\`main\` @ \`${sha}\` \`${sha}\``).ok, false);
    assert.match(BASELINE_AUTHORITY_GRAMMAR.source, /main/);
  });
});

describe('WT-009 metadata preflight integration', () => {
  let repo;

  before(() => {
    repo = initRepoWithHistory();
  });

  after(() => {
    fs.rmSync(repo.parent, { recursive: true, force: true });
  });

  it('PASSes exact required metadata through evaluateWorktreePreflightWarnings', () => {
    const registry = buildRegistryText({ wt001Path: repo.dir, baselineSha: repo.baselineSha });
    const doc = parseRegistryDocument(registry);
    assert.equal(evaluateWt009RegistryPreflight(doc).valid, true);
    const { warnings } = evaluateWorktreePreflightWarnings(
      [{ path: repo.dir, branch: 'bootstrap-branch', head: repo.childSha, detached: false }],
      registry,
      buildCurrentState(),
      repo.dir,
    );
    assert.equal(warnings.some((warning) => warning.includes('WT-009 registry metadata validation failed')), false);
  });

  it('FAILs purpose, lifecycle, and operational state problems through preflight path', () => {
    const wrongPurpose = buildRegistryText({
      wt001Path: repo.dir,
      baselineSha: repo.baselineSha,
    }).replace(
      '| purpose | **FROZEN_BUILD_WEEK_EVIDENCE_AND_EXTERNAL_CONTROL_PLANE** |',
      '| purpose | **WRONG_PURPOSE** |',
    );
    let result = evaluateWorktreePreflightWarnings(
      [{ path: repo.dir, branch: 'bootstrap-branch', head: repo.childSha, detached: false }],
      wrongPurpose,
      buildCurrentState(),
      repo.dir,
    );
    assert.match(result.warnings.join('\n'), /WT-009 registry metadata validation failed.*purpose invalid/i);

    const wrongLifecycle = buildRegistryText({
      wt001Path: repo.dir,
      baselineSha: repo.baselineSha,
    }).replace('| lifecycle | **PAUSED** |', '| lifecycle | **ACTIVE** |');
    result = evaluateWorktreePreflightWarnings(
      [{ path: repo.dir, branch: 'bootstrap-branch', head: repo.childSha, detached: false }],
      wrongLifecycle,
      buildCurrentState(),
      repo.dir,
    );
    assert.match(result.warnings.join('\n'), /WT-009 registry metadata validation failed.*lifecycle invalid/i);

    const missingPurpose = buildRegistryText({
      wt001Path: repo.dir,
      baselineSha: repo.baselineSha,
    }).replace('| purpose | **FROZEN_BUILD_WEEK_EVIDENCE_AND_EXTERNAL_CONTROL_PLANE** |', '');
    result = evaluateWorktreePreflightWarnings(
      [{ path: repo.dir, branch: 'bootstrap-branch', head: repo.childSha, detached: false }],
      missingPurpose,
      buildCurrentState(),
      repo.dir,
    );
    assert.match(result.warnings.join('\n'), /WT-009 registry metadata validation failed.*purpose missing/i);

    const duplicatePurpose = buildRegistryText({
      wt001Path: repo.dir,
      baselineSha: repo.baselineSha,
      wt009ExtraRows: '| purpose | **FROZEN_BUILD_WEEK_EVIDENCE_AND_EXTERNAL_CONTROL_PLANE** |',
    });
    result = evaluateWorktreePreflightWarnings(
      [{ path: repo.dir, branch: 'bootstrap-branch', head: repo.childSha, detached: false }],
      duplicatePurpose,
      buildCurrentState(),
      repo.dir,
    );
    assert.match(result.warnings.join('\n'), /WT-009 registry metadata validation failed.*purpose duplicate/i);

    const wrongOperationalState = buildRegistryText({
      wt001Path: repo.dir,
      baselineSha: repo.baselineSha,
    }).replace('| operational state | **FROZEN_BY_HUMAN_DECISION** |', '| operational state | **ACTIVE** |');
    result = evaluateWorktreePreflightWarnings(
      [{ path: repo.dir, branch: 'bootstrap-branch', head: repo.childSha, detached: false }],
      wrongOperationalState,
      buildCurrentState(),
      repo.dir,
    );
    assert.match(result.warnings.join('\n'), /WT-009 registry metadata validation failed.*operational state invalid/i);
  });

  it('always runs WT-009 registry validation on preflight even without live WT-009 path', () => {
    const registry = buildRegistryText({
      wt001Path: repo.dir,
      baselineSha: repo.baselineSha,
    }).replace(
      '| purpose | **FROZEN_BUILD_WEEK_EVIDENCE_AND_EXTERNAL_CONTROL_PLANE** |',
      '| purpose | **WRONG** |',
    );
    const { warnings } = evaluateWorktreePreflightWarnings(
      [{ path: repo.dir, branch: 'bootstrap-branch', head: repo.childSha, detached: false }],
      registry,
      buildCurrentState(),
      repo.dir,
    );
    assert.match(warnings.join('\n'), /WT-009 registry metadata validation failed/i);
  });

  it('FAILs overall preflight when WT-001 is valid but WT-009 metadata is invalid', () => {
    const registry = buildRegistryText({
      wt001Path: repo.dir,
      baselineSha: repo.baselineSha,
    }).replace(
      '| purpose | **FROZEN_BUILD_WEEK_EVIDENCE_AND_EXTERNAL_CONTROL_PLANE** |',
      '| purpose | **WRONG** |',
    );
    const { warnings } = evaluateWorktreePreflightWarnings(
      [{ path: repo.dir, branch: 'bootstrap-branch', head: repo.childSha, detached: false }],
      registry,
      buildCurrentState(),
      repo.dir,
    );
    assert.match(warnings.join('\n'), /WT-009 registry metadata validation failed/i);
  });

  it('does not reuse later section purpose for invalid WT-009', () => {
    const registry = `# Registry\n\nDocumented post-merge transition\n\n${wt001Section('/tmp/wt-001', 'bootstrap-branch', repo.baselineSha)}\n\n### WT-009 — Build Week Control Plane (operational freeze)\n\n| Field | Value |\n|---|---|\n| id | WT-009 |\n| path | \`${WT009_EXPECTED_PATH}\` |\n| branch | \`feat/m55-build-week-control-plane-v1\` |\n| HEAD | \`${WT009_EXPECTED_HEAD}\` |\n| lifecycle | **PAUSED** |\n| operational state | **FROZEN_BY_HUMAN_DECISION** |\n| purpose | **WRONG** |\n\n### WT-002 — Compatibility purchase delivery (DO NOT USE)\n\n| Field | Value |\n|---|---|\n| purpose | **FROZEN_BUILD_WEEK_EVIDENCE_AND_EXTERNAL_CONTROL_PLANE** |\n| path | \`/tmp/wt-002\` |\n| branch | \`feat/do-not-use\` |\n| HEAD | \`${'a'.repeat(40)}\` |\n| lifecycle | **DO_NOT_USE** |\n| purpose | Historical lane |\n`;
    const doc = parseRegistryDocument(registry);
    assert.equal(evaluateWt009RegistryPreflight(doc).valid, false);
  });
});

describe('clean-state disposable proof', () => {
  it(
    'preflight passes without drift warning on clean bootstrap descendant fixture',
    { timeout: 180000 },
    () => {
      const { fixtureParent, fixtureRoot, head, cloneTip } = buildCleanStateDisposableFixture();
      assert.notEqual(head, FIXTURE_BASE_SHA, 'temporary disposable commit must advance fixture HEAD');
      assert.equal(runGit(['rev-parse', 'HEAD^'], fixtureRoot), FIXTURE_BASE_SHA);
      if (cloneTip !== FIXTURE_BASE_SHA) {
        assert.notEqual(cloneTip, head, 'fixture must not reuse current branch tip as proof HEAD');
      }

      const worktreeList = spawnSync('git', ['worktree', 'list', '--porcelain'], {
        cwd: fixtureRoot,
        encoding: 'utf8',
      });
      assert.equal(worktreeList.status, 0);
      const liveEntries = parseWorktreeListPorcelain(worktreeList.stdout);
      assert.ok(liveEntries.length >= 1);
      const entry = {
        ...liveEntries[0],
        path: path.resolve(fixtureRoot),
        branch: BOOTSTRAP_BRANCH,
        head,
        detached: false,
      };
      const registryText = fs
        .readFileSync(path.join(fixtureRoot, 'docs/ssot/M55_WORKTREE_REGISTRY.md'), 'utf8')
        .replace(
          /(\| path \| `)[^`]+(` \|)/,
          `$1${entry.path}$2`,
        );
      const currentStateText = fs.readFileSync(
        path.join(fixtureRoot, 'docs/ssot/M55_CURRENT_STATE.md'),
        'utf8',
      );

      const registryWithFence = `${registryText}\n \`\`\`md\n${expectedRegistryHeadingLine('WT-001')}\n \`\`\`\n`;

      const { warnings, logs } = evaluateWorktreePreflightWarnings(
        [entry],
        registryWithFence,
        currentStateText,
        fixtureRoot,
      );
      assert.equal(warnings.length, 0, warnings.join('; '));
      assert.match(logs.join('\n'), /registry baseline snapshot/);

      const negativeMissingBaseline = registryText.replace(
        `| baseline | \`main\` @ \`${BASELINE_SHA}\` |`,
        '',
      );
      const missingResult = evaluateWorktreePreflightWarnings(
        [entry],
        negativeMissingBaseline,
        currentStateText,
        fixtureRoot,
      );
      assert.match(missingResult.warnings.join('\n'), /baseline missing|registry parser failure|snapshot preflight failed/i);

      const negativeDuplicateBaseline = registryText.replace(
        `| baseline | \`main\` @ \`${BASELINE_SHA}\` |`,
        `| baseline | \`main\` @ \`${BASELINE_SHA}\` |\n| baseline | \`main\` @ \`${BASELINE_SHA}\` |`,
      );
      const duplicateResult = evaluateWorktreePreflightWarnings(
        [entry],
        negativeDuplicateBaseline,
        currentStateText,
        fixtureRoot,
      );
      assert.match(duplicateResult.warnings.join('\n'), /baseline duplicate|registry parser failure|snapshot preflight failed/i);

      const negativeInvalidBaseline = registryText.replace(
        `| baseline | \`main\` @ \`${BASELINE_SHA}\` |`,
        '| baseline | broken |',
      );
      const invalidResult = evaluateWorktreePreflightWarnings(
        [entry],
        negativeInvalidBaseline,
        currentStateText,
        fixtureRoot,
      );
      assert.match(invalidResult.warnings.join('\n'), /baseline invalid|registry parser failure|snapshot preflight failed/i);

      const duplicateHeading = registryText.replace(
        '### WT-001 — PRIMARY_MAIN_HOME',
        '### WT-001 — PRIMARY_MAIN_HOME\n### WT-001 — PRIMARY_MAIN_HOME',
      );
      const duplicateHeadingResult = evaluateWorktreePreflightWarnings(
        [entry],
        duplicateHeading,
        currentStateText,
        fixtureRoot,
      );
      assert.match(duplicateHeadingResult.warnings.join('\n'), /heading duplicate/i);

      const malformedHeading = registryText.replace(
        '### WT-009 — Build Week Control Plane (operational freeze)',
        '### WT-009 extra',
      );
      const malformedHeadingResult = evaluateWorktreePreflightWarnings(
        [entry],
        malformedHeading,
        currentStateText,
        fixtureRoot,
      );
      assert.match(malformedHeadingResult.warnings.join('\n'), /heading malformed/i);

      const arbitraryBaseline = registryText.replace(
        `| baseline | \`main\` @ \`${BASELINE_SHA}\` |`,
        `| baseline | note \`main\` @ \`${BASELINE_SHA}\` |`,
      );
      const arbitraryBaselineResult = evaluateWorktreePreflightWarnings(
        [entry],
        arbitraryBaseline,
        currentStateText,
        fixtureRoot,
      );
      assert.match(arbitraryBaselineResult.warnings.join('\n'), /baseline invalid|registry parser failure|snapshot preflight failed/i);

      const wrongPurpose = registryText.replace(
        '| purpose | **FROZEN_BUILD_WEEK_EVIDENCE_AND_EXTERNAL_CONTROL_PLANE** |',
        '| purpose | **WRONG** |',
      );
      const wrongPurposeResult = evaluateWorktreePreflightWarnings(
        [entry],
        wrongPurpose,
        currentStateText,
        fixtureRoot,
      );
      assert.match(wrongPurposeResult.warnings.join('\n'), /WT-009 registry metadata validation failed/i);

      const invalidLabel = registryText.replace(
        expectedRegistryHeadingLine('WT-001'),
        '### WT-001 — arbitrary text',
      );
      const invalidLabelResult = evaluateWorktreePreflightWarnings(
        [entry],
        invalidLabel,
        currentStateText,
        fixtureRoot,
      );
      assert.match(invalidLabelResult.warnings.join('\n'), /invalid label/i);

      const unclosedFence = `${registryText}\n\`\`\`md\nexample\n`;
      const unclosedFenceResult = evaluateWorktreePreflightWarnings(
        [entry],
        unclosedFence,
        currentStateText,
        fixtureRoot,
      );
      assert.match(unclosedFenceResult.warnings.join('\n'), /unclosed/i);

      const falseCloseOnly = `${registryText}\n\`\`\`\n${expectedRegistryHeadingLine('WT-001')}\n\`\`\` trailing\n`;
      const falseCloseResult = evaluateWorktreePreflightWarnings(
        [entry],
        falseCloseOnly,
        currentStateText,
        fixtureRoot,
      );
      assert.match(falseCloseResult.warnings.join('\n'), /unclosed/i);

      const fourSpaceOpener = `${registryText}\n    \`\`\`\n    ${expectedRegistryHeadingLine('WT-001')}\n`;
      const fourSpaceResult = evaluateWorktreePreflightWarnings(
        [entry],
        fourSpaceOpener,
        currentStateText,
        fixtureRoot,
      );
      assert.equal(fourSpaceResult.warnings.length, 0, fourSpaceResult.warnings.join('; '));

      const invalidOpener = `${registryText}\n\`\`\`not\`valid\n    ${expectedRegistryHeadingLine('WT-001')}\n`;
      const invalidOpenerResult = evaluateWorktreePreflightWarnings(
        [entry],
        invalidOpener,
        currentStateText,
        fixtureRoot,
      );
      assert.equal(invalidOpenerResult.warnings.length, 0, invalidOpenerResult.warnings.join('; '));

      fs.rmSync(fixtureParent, { recursive: true, force: true });
    },
  );
});
