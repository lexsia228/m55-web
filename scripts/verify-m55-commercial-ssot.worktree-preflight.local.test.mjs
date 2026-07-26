import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  WT001_ID,
  WT006_ID,
  WT009_ID,
  WT010_ID,
  WT006_EXPECTED_PATH,
  WT006_EXPECTED_BRANCH,
  WT010_EXPECTED_PATH,
  WT010_EXPECTED_BRANCH,
  WT010_EXPECTED_BOOTSTRAP_START_HEAD,
  WT010_EXPECTED_OPERATIONAL_STATE,
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
  collectRegistryUniquenessErrors,
  collectSymmetricLiveRegistryErrors,
  gitObjectExists,
  isAncestorOrEqual,
  isWorktreeClean,
  hasGitOperationInProgress,
  gitPathExists,
  evaluateWt001SnapshotPreflight,
  evaluateWt010ActiveLanePreflight,
  evaluateWt010RegistryPreflight,
  evaluateWorktreePreflightWarnings,
  createDefaultGitInspector,
} from './verify-m55-commercial-ssot.mjs';
import { verifyProductAuthority } from './product-authority/validate.mjs';
import { bootstrapFixture } from './product-authority/generate.mjs';
import { withComputedEventHashes, writeHistory } from './product-authority/history.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WT010_LIVE_HEAD = '2761706505576a2baeacbdd40acd130a1f70e81b';
const WT010_COMMIT_ONE_HEAD = 'f9daeb1f38205ca6d6eebb8e90c0a19f4ad58704';
const WORKFLOW_PATH = path.join(REPO_ROOT, '.github/workflows/verify-product-authority-pack.yml');
const BOOTSTRAP_BRANCH = 'chore/m55-worktree-registry-current-state-bootstrap-rev1';
const VERIFIER_REL_PATH = 'scripts/verify-m55-commercial-ssot.mjs';
const DISPOSABLE_ESSENTIAL_PATHS = [
  'docs/ssot/M55_WORKTREE_REGISTRY.md',
  'docs/ssot/M55_CURRENT_STATE.md',
];

function createControlledGitInspector(repositoryFacts = {}, { registeredPaths = null } = {}) {
  const registeredPathSet = registeredPaths ? new Set(registeredPaths) : null;
  return {
    objectExists(repositoryRoot, sha) {
      const facts = repositoryFacts[repositoryRoot];
      if (!facts?.objects) return false;
      return facts.objects.has(String(sha).toLowerCase());
    },
    isAncestorOrEqual(repositoryRoot, ancestorSha, descendantSha) {
      const facts = repositoryFacts[repositoryRoot];
      if (!facts) return false;
      const ancestor = String(ancestorSha).toLowerCase();
      const descendant = String(descendantSha).toLowerCase();
      if (ancestor === descendant) return true;
      return (facts.ancestry ?? []).some(
        ([anc, desc]) => anc.toLowerCase() === ancestor && desc.toLowerCase() === descendant,
      );
    },
    isWorktreeClean(repositoryRoot) {
      const facts = repositoryFacts[repositoryRoot];
      return facts?.clean ?? true;
    },
    hasGitOperationInProgress(repositoryRoot) {
      const facts = repositoryFacts[repositoryRoot];
      return facts?.gitOperationInProgress ?? false;
    },
    registryPathExists(registryPath) {
      if (!registeredPathSet) return false;
      return registeredPathSet.has(registryPath);
    },
  };
}

function buildStaticWt010GitFacts(wt010Path, liveHead = WT010_LIVE_HEAD) {
  return {
    [wt010Path]: {
      objects: new Set([
        WT010_EXPECTED_BOOTSTRAP_START_HEAD.toLowerCase(),
        liveHead.toLowerCase(),
      ]),
      ancestry: [[WT010_EXPECTED_BOOTSTRAP_START_HEAD, liveHead]],
      clean: true,
      gitOperationInProgress: false,
    },
  };
}

function buildStaticNineEntryGitInspector(liveEntries, { registeredPaths = null } = {}) {
  const wt010Entry =
    liveEntries.find((entry) => entry.branch === WT010_EXPECTED_BRANCH) ??
    LIVE_TOPOLOGY_ENTRIES.find((entry) => entry.branch === WT010_EXPECTED_BRANCH);
  const effectiveRegisteredPaths = registeredPaths ?? liveEntries.map((entry) => entry.path);
  return createControlledGitInspector(
    buildStaticWt010GitFacts(WT010_EXPECTED_PATH, wt010Entry?.head ?? WT010_LIVE_HEAD),
    { registeredPaths: effectiveRegisteredPaths },
  );
}

function runGit(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(' ')} failed in ${cwd}: ${result.stderr || result.stdout || result.error?.message || 'unknown error'}`,
    );
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
  fs.mkdirSync(fixtureRoot, { recursive: true });

  runGit(['init'], fixtureRoot);
  runGit(['config', 'user.email', 'test@example.com'], fixtureRoot);
  runGit(['config', 'user.name', 'M55 Test'], fixtureRoot);

  for (const relPath of DISPOSABLE_ESSENTIAL_PATHS) {
    const sourcePath = path.join(REPO_ROOT, relPath);
    const destinationPath = path.join(fixtureRoot, relPath);
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.copyFileSync(sourcePath, destinationPath);
  }

  runGit(['add', '.'], fixtureRoot);
  runGit(['commit', '-m', 'temp: disposable fixture base commit'], fixtureRoot);
  const baseSha = runGit(['rev-parse', 'HEAD'], fixtureRoot);

  const registryText = buildRegistryText({
    wt001Path: fixtureRoot,
    branch: BOOTSTRAP_BRANCH,
    baselineSha: baseSha,
    headSha: baseSha,
  });
  fs.writeFileSync(path.join(fixtureRoot, 'docs/ssot/M55_WORKTREE_REGISTRY.md'), registryText);
  const verifierDestinationPath = path.join(fixtureRoot, VERIFIER_REL_PATH);
  fs.mkdirSync(path.dirname(verifierDestinationPath), { recursive: true });
  fs.writeFileSync(verifierDestinationPath, fs.readFileSync(verifierSourcePath, 'utf8'));

  runGit(['add', '.'], fixtureRoot);
  runGit(['commit', '-m', 'temp: disposable clean-state verifier proof'], fixtureRoot);
  runGit(['checkout', '-B', BOOTSTRAP_BRANCH], fixtureRoot);

  const head = runGit(['rev-parse', 'HEAD'], fixtureRoot);
  assert.notEqual(head, baseSha, 'temporary commit must be non-empty');
  assert.equal(runGit(['rev-parse', 'HEAD^'], fixtureRoot), baseSha);
  assert.equal(runGit(['rev-list', '--count', `${baseSha}..HEAD`], fixtureRoot), '1');
  assert.equal(isWorktreeClean(fixtureRoot), true);
  assert.equal(isAncestorOrEqual(baseSha, head, fixtureRoot), true);

  return { fixtureParent, fixtureRoot, head, baseSha };
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
  const entry = {
    path: repo.dir,
    branch: 'bootstrap-branch',
    head: repo.childSha,
    detached: false,
    ...entryOverrides,
  };
  return {
    entry,
    wt001Parse: parseWt001RegistrySnapshot(registry),
    registryText: registry,
    transitionParse: parsePostMergeNextSingleAction(currentState),
    gitInspector: createDefaultGitInspector(),
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

const LIVE_TOPOLOGY_ENTRIES = Object.freeze([
  {
    path: '/Users/lexsia/Documents/M55_WORKTREE-home-final-ia-v1',
    branch: 'feat/m55-self-free-to-premium-funnel-v1',
    head: '76cb15577dd46ce99980aed6a4df474960fd51d9',
  },
  {
    path: '/Users/lexsia/Documents/M55_CANONICAL',
    branch: 'feat/m55-compatibility-quality-matrix',
    head: '3928cb9bcec67e290437cd03164341a1c6acfac9',
  },
  {
    path: '/Users/lexsia/Documents/M55_CANONICAL-ops-control-plane-wave1',
    branch: 'chore/ops-control-plane-bootstrap',
    head: 'dde083b3cf85b7580728935be9079bfab3291e4c',
  },
  {
    path: '/Users/lexsia/Documents/M55_CANONICAL-ops-current-state-semantics-wave1',
    branch: 'chore/ops-current-state-semantics-wave1',
    head: '403d4235cdb2d1b73adbfa9dc60d76c7360c65d0',
  },
  {
    path: WT006_EXPECTED_PATH,
    branch: WT006_EXPECTED_BRANCH,
    head: '8391d02ea18db8e026de3370caa9199a3b273b67',
  },
  {
    path: '/Users/lexsia/Documents/M55_WORKTREE-analysis-hub-v1',
    branch: 'feat/m55-analysis-hub-account-center-v1',
    head: '468f89550e765f762c5084d7ebe135bf22dc5526',
  },
  {
    path: '/Users/lexsia/Documents/M55_WORKTREE-home-poster-clean-main-v1',
    branch: 'feat/m55-home-poster-clean-main',
    head: '2a88ddddcc58fc45823d9c966c2a6d4ba99cd40a',
  },
  {
    path: WT009_EXPECTED_PATH,
    branch: 'feat/m55-build-week-control-plane-v1',
    head: WT009_EXPECTED_HEAD,
  },
  {
    path: WT010_EXPECTED_PATH,
    branch: WT010_EXPECTED_BRANCH,
    head: WT010_LIVE_HEAD,
  },
]);

function buildCapacityRegistryText({
  wt006Path = WT006_EXPECTED_PATH,
  wt010Path = WT010_EXPECTED_PATH,
  includeWt010 = true,
  includeWt006 = true,
  wt006Branch = WT006_EXPECTED_BRANCH,
  wt010Branch = WT010_EXPECTED_BRANCH,
  duplicateWt010Heading = false,
} = {}) {
  const wt010Block = includeWt010
    ? `\n### WT-010 — Product Authority Pack\n\n| Field | Value |\n|---|---|\n| path | \`${wt010Path}\` |\n| branch | \`${wt010Branch}\` |\n| bootstrapStartHead | \`${WT010_EXPECTED_BOOTSTRAP_START_HEAD}\` |\n| lifecycle | **ACTIVE** |\n| operational state | **${WT010_EXPECTED_OPERATIONAL_STATE}** |\n| purpose | **Product Authority Pack bootstrap implementation** |\n${duplicateWt010Heading ? '\n### WT-010 — Product Authority Pack\n' : ''}`
    : '';
  const wt006Block = includeWt006
    ? `\n### WT-006 — Paid LP / home microcopy\n\n| Field | Value |\n|---|---|\n| path | \`${wt006Path}\` |\n| branch | \`${wt006Branch}\` |\n| HEAD | \`8391d02ea18db8e026de3370caa9199a3b273b67\` |\n| lifecycle | **PAUSED** |\n| purpose | HOME full upgrade reassurance / paid LP copy lane |\n`
    : '';
  return `# Registry\n\nDocumented post-merge transition\n\n### WT-001 — PRIMARY_MAIN_HOME\n\n| Field | Value |\n|---|---|\n| path | \`/Users/lexsia/Documents/M55_WORKTREE-home-final-ia-v1\` |\n| branch | \`feat/m55-self-free-to-premium-funnel-v1\` |\n| HEAD | \`76cb15577dd46ce99980aed6a4df474960fd51d9\` |\n| lifecycle | **PAUSED** |\n| operational state | **PARKED** |\n| purpose | **Self free→Premium funnel** |\n\n### WT-002 — Compatibility purchase delivery (DO NOT USE)\n\n| Field | Value |\n|---|---|\n| path | \`/Users/lexsia/Documents/M55_CANONICAL-cross-page-card-polish\` |\n| branch | \`feat/m55-compatibility-purchase-delivery-v1\` |\n| HEAD | \`${'a'.repeat(40)}\` |\n| lifecycle | **DO_NOT_USE** |\n| purpose | Historical compatibility commerce lane |\n${wt006Block}### WT-003 — Compatibility quality matrix\n\n| Field | Value |\n|---|---|\n| path | \`/Users/lexsia/Documents/M55_CANONICAL\` |\n| branch | \`feat/m55-compatibility-quality-matrix\` |\n| HEAD | \`3928cb9bcec67e290437cd03164341a1c6acfac9\` |\n| lifecycle | **PAUSED** |\n| purpose | Compatibility quality matrix lane |\n\n### WT-004 — Ops control plane bootstrap\n\n| Field | Value |\n|---|---|\n| path | \`/Users/lexsia/Documents/M55_CANONICAL-ops-control-plane-wave1\` |\n| branch | \`chore/ops-control-plane-bootstrap\` |\n| HEAD | \`dde083b3cf85b7580728935be9079bfab3291e4c\` |\n| lifecycle | **PAUSED** |\n| purpose | Ops control plane bootstrap |\n\n### WT-005 — Ops current-state semantics\n\n| Field | Value |\n|---|---|\n| path | \`/Users/lexsia/Documents/M55_CANONICAL-ops-current-state-semantics-wave1\` |\n| branch | \`chore/ops-current-state-semantics-wave1\` |\n| HEAD | \`403d4235cdb2d1b73adbfa9dc60d76c7360c65d0\` |\n| lifecycle | **PAUSED** |\n| purpose | Ops current-state semantics |\n\n### WT-007 — Analysis hub\n\n| Field | Value |\n|---|---|\n| path | \`/Users/lexsia/Documents/M55_WORKTREE-analysis-hub-v1\` |\n| branch | \`feat/m55-analysis-hub-account-center-v1\` |\n| HEAD | \`468f89550e765f762c5084d7ebe135bf22dc5526\` |\n| lifecycle | **PAUSED** |\n| purpose | Analysis hub lane |\n\n### WT-008 — HOME poster clean main\n\n| Field | Value |\n|---|---|\n| path | \`/Users/lexsia/Documents/M55_WORKTREE-home-poster-clean-main-v1\` |\n| branch | \`feat/m55-home-poster-clean-main\` |\n| HEAD | \`2a88ddddcc58fc45823d9c966c2a6d4ba99cd40a\` |\n| lifecycle | **PAUSED** |\n| purpose | HOME poster hero clean-main lane |\n\n### WT-009 — Build Week Control Plane (operational freeze)\n\n| Field | Value |\n|---|---|\n| id | WT-009 |\n| path | \`${WT009_EXPECTED_PATH}\` |\n| branch | \`feat/m55-build-week-control-plane-v1\` |\n| HEAD | \`${WT009_EXPECTED_HEAD}\` |\n| lifecycle | **PAUSED** |\n| operational state | **FROZEN_BY_HUMAN_DECISION** |\n| purpose | **FROZEN_BUILD_WEEK_EVIDENCE_AND_EXTERNAL_CONTROL_PLANE** |\n${wt010Block}`;
}

function buildFullNineEntryRegistryText(options = {}) {
  return buildCapacityRegistryText(options);
}

function liveEntriesFromTopology(topology = LIVE_TOPOLOGY_ENTRIES) {
  return topology.map((entry) => ({ ...entry, detached: false }));
}

describe('canonical registry heading grammar', () => {
  let repo;

  before(() => {
    repo = initRepoWithHistory();
  });

  after(() => {
    fs.rmSync(repo.parent, { recursive: true, force: true });
  });

  it('PASSes production authority headings for WT-001 through WT-010', () => {
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

  it('accepts canonical WT-010 heading grammar', () => {
    const heading = expectedRegistryHeadingLine(WT010_ID);
    assert.equal(classifyRegistryHeadingLine(heading).kind, 'valid');
    assert.equal(heading, '### WT-010 — Product Authority Pack');
  });

  it('preserves WT-006 paid-lp identity in registry parser', () => {
    const doc = parseRegistryDocument(buildCapacityRegistryText());
    const wt006 = doc.entries.find((entry) => entry.id === WT006_ID);
    assert.equal(wt006.path, WT006_EXPECTED_PATH);
    assert.equal(wt006.branch, WT006_EXPECTED_BRANCH);
  });

  it('rejects WT-006 reuse for Authority Pack path assignment', () => {
    const doc = parseRegistryDocument(
      buildCapacityRegistryText({ wt006Path: WT010_EXPECTED_PATH, includeWt010: false }),
    );
    const errors = collectRegistryUniquenessErrors(doc.entries);
    assert.match(errors.map((error) => error.message).join('; '), /WT-006 must remain paid-lp|Authority Pack must not reuse WT-006/i);
  });

  it('rejects duplicate WT ID headings', () => {
    const doc = parseRegistryDocument(buildCapacityRegistryText({ duplicateWt010Heading: true }));
    assert.ok(doc.duplicateHeadingErrors.some((error) => error.id === WT010_ID));
  });

  it('rejects duplicate registry path assignments', () => {
    const doc = parseRegistryDocument(
      buildCapacityRegistryText({ wt010Path: WT006_EXPECTED_PATH }),
    );
    const errors = collectRegistryUniquenessErrors(doc.entries);
    assert.match(errors.map((error) => error.message).join('; '), /duplicate registry path/i);
  });

  it('rejects duplicate active branch assignments', () => {
    const doc = parseRegistryDocument(
      buildCapacityRegistryText({ wt010Branch: WT006_EXPECTED_BRANCH }),
    );
    const errors = collectRegistryUniquenessErrors(doc.entries);
    assert.match(errors.map((error) => error.message).join('; '), /duplicate active branch/i);
  });

  it('rejects missing live paid-lp worktree from symmetric validation', () => {
    const registry = buildCapacityRegistryText({ includeWt006: false });
    const doc = parseRegistryDocument(registry);
    const live = LIVE_TOPOLOGY_ENTRIES.map((entry) => ({ ...entry, detached: false }));
    const errors = collectSymmetricLiveRegistryErrors(live, doc.entries);
    assert.match(errors.map((error) => error.message).join('; '), /live worktree missing from registry.*paid-lp|registered live worktree missing/i);
  });

  it('rejects missing live Authority Pack worktree from symmetric validation', () => {
    const registry = buildCapacityRegistryText({ includeWt010: false });
    const doc = parseRegistryDocument(registry);
    const live = LIVE_TOPOLOGY_ENTRIES.map((entry) => ({ ...entry, detached: false }));
    const errors = collectSymmetricLiveRegistryErrors(live, doc.entries);
    assert.match(errors.map((error) => error.message).join('; '), /registered live worktree missing.*product-authority|WT-010|missing from registry/i);
  });

  it('rejects extra unregistered live worktree from symmetric validation', () => {
    const registry = buildCapacityRegistryText();
    const doc = parseRegistryDocument(registry);
    const live = [
      ...LIVE_TOPOLOGY_ENTRIES.map((entry) => ({ ...entry, detached: false })),
      {
        path: '/Users/lexsia/Documents/M55_WORKTREE-unregistered-extra-v1',
        branch: 'feat/unregistered',
        head: 'b'.repeat(40),
        detached: false,
      },
    ];
    const errors = collectSymmetricLiveRegistryErrors(live, doc.entries);
    assert.match(errors.map((error) => error.message).join('; '), /missing from registry.*unregistered-extra/i);
  });

  it('rejects malformed WT-10 heading', () => {
    const doc = parseRegistryDocument(
      buildCapacityRegistryText().replace(
        '### WT-010 — Product Authority Pack',
        '### WT-10 — Product Authority Pack',
      ),
    );
    assert.ok(doc.malformedHeadingErrors.some((error) => error.id === 'WT-10'));
  });

  it('rejects malformed WT-0010 heading', () => {
    const doc = parseRegistryDocument(
      buildCapacityRegistryText().replace(
        '### WT-010 — Product Authority Pack',
        '### WT-0010 — Product Authority Pack',
      ),
    );
    assert.ok(doc.malformedHeadingErrors.some((error) => error.id === 'WT-0010'));
  });

  it('passes controlled nine-entry fixture topology with zero drift warning', () => {
    const liveEntries = liveEntriesFromTopology();
    const registryText = buildFullNineEntryRegistryText();
    const currentStateText = buildCurrentState();
    const gitInspector = buildStaticNineEntryGitInspector(liveEntries);
    const { warnings } = evaluateWorktreePreflightWarnings(
      liveEntries,
      registryText,
      currentStateText,
      '/fixture/nonexistent-git-root',
      { requireFullTopology: true, gitInspector },
    );
    assert.equal(warnings.length, 0, warnings.join('; '));
  });

  it('does not read host git worktree list for controlled fixture topology PASS', () => {
    const liveEntries = liveEntriesFromTopology();
    assert.equal(liveEntries.length, 9);
    const registryText = buildFullNineEntryRegistryText();
    const gitInspector = buildStaticNineEntryGitInspector(liveEntries);
    const originalExistsSync = fs.existsSync;
    let hostPathAccessCount = 0;
    fs.existsSync = (targetPath) => {
      if (String(targetPath).includes('/Users/lexsia/Documents/')) {
        hostPathAccessCount += 1;
      }
      return originalExistsSync(targetPath);
    };
    try {
      const { warnings } = evaluateWorktreePreflightWarnings(
        liveEntries,
        registryText,
        buildCurrentState(),
        '/fixture/nonexistent-git-root',
        { requireFullTopology: true, gitInspector },
      );
      assert.equal(warnings.length, 0, warnings.join('; '));
      assert.equal(hostPathAccessCount, 0);
    } finally {
      fs.existsSync = originalExistsSync;
    }
  });

  it('fails strict local topology validation when registered live path is missing from live list', () => {
    const registryText = buildFullNineEntryRegistryText();
    const liveEntries = liveEntriesFromTopology(LIVE_TOPOLOGY_ENTRIES.slice(0, 8));
    const gitInspector = buildStaticNineEntryGitInspector(liveEntries, {
      registeredPaths: liveEntriesFromTopology().map((entry) => entry.path),
    });
    const { warnings } = evaluateWorktreePreflightWarnings(
      liveEntries,
      registryText,
      buildCurrentState(),
      '/fixture/nonexistent-git-root',
      { requireFullTopology: true, gitInspector },
    );
    assert.ok(warnings.length > 0);
    assert.match(warnings.join('; '), /registered live worktree missing|missing from registry/i);
  });

  it('fails strict local topology validation when extra unregistered live worktree is present', () => {
    const registryText = buildFullNineEntryRegistryText();
    const liveEntries = [
      ...liveEntriesFromTopology(),
      {
        path: '/fixture/static-m55-registry/wt-extra-unregistered',
        branch: 'feat/extra-unregistered',
        head: 'c'.repeat(40),
        detached: false,
      },
    ];
    const gitInspector = buildStaticNineEntryGitInspector(liveEntries);
    const { warnings } = evaluateWorktreePreflightWarnings(
      liveEntries,
      registryText,
      buildCurrentState(),
      '/fixture/nonexistent-git-root',
      { requireFullTopology: true, gitInspector },
    );
    assert.ok(warnings.length > 0);
    assert.match(warnings.join('; '), /missing from registry/i);
  });

  it('preserves WT-002 DO_NOT_USE exemption from live requirement', () => {
    const registry = buildCapacityRegistryText();
    const doc = parseRegistryDocument(registry);
    const wt002 = doc.entries.find((entry) => entry.id === 'WT-002');
    assert.equal(wt002.lifecycle.includes('DO_NOT_USE'), true);
    const live = LIVE_TOPOLOGY_ENTRIES.map((entry) => ({ ...entry, detached: false }));
    const errors = collectSymmetricLiveRegistryErrors(live, doc.entries);
    assert.equal(errors.some((error) => error.message.includes('cross-page-card-polish')), false);
  });

  it('keeps WT-002 DO_NOT_USE parser identity intact', () => {
    const doc = parseRegistryDocument(buildCapacityRegistryText());
    const wt002 = doc.entries.find((entry) => entry.id === 'WT-002');
    assert.equal(wt002.valid, true);
    assert.match(wt002.lifecycle, /DO_NOT_USE/);
  });

  it('validates WT-010 path and branch uniqueness against WT-006', () => {
    const doc = parseRegistryDocument(buildCapacityRegistryText());
    const wt006 = doc.entries.find((entry) => entry.id === WT006_ID);
    const wt010 = doc.entries.find((entry) => entry.id === WT010_ID);
    assert.notEqual(wt006.path, wt010.path);
    assert.notEqual(wt006.branch, wt010.branch);
    assert.equal(collectRegistryUniquenessErrors(doc.entries).length, 0);
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

describe('repository-static WT-010 git-state fixture', () => {
  function runStaticNineEntryPreflight({ liveTopology, registryOptions, registryTextMutator, gitInspector } = {}) {
    const liveEntries = liveEntriesFromTopology(liveTopology ?? LIVE_TOPOLOGY_ENTRIES);
    let registryText = buildFullNineEntryRegistryText(registryOptions ?? {});
    if (registryTextMutator) {
      registryText = registryTextMutator(registryText);
    }
    return evaluateWorktreePreflightWarnings(
      liveEntries,
      registryText,
      buildCurrentState(),
      '/fixture/nonexistent-git-root',
      {
        requireFullTopology: true,
        gitInspector: gitInspector ?? buildStaticNineEntryGitInspector(liveEntries),
      },
    );
  }

  it('uses injected git-state facts rather than host WT-010 repository', () => {
    const liveEntries = liveEntriesFromTopology();
    const gitInspector = buildStaticNineEntryGitInspector(liveEntries);
    const { warnings } = runStaticNineEntryPreflight({ gitInspector });
    assert.equal(warnings.length, 0, warnings.join('; '));
    assert.equal(gitInspector.objectExists(WT010_EXPECTED_PATH, WT010_LIVE_HEAD), true);
    assert.equal(
      gitInspector.isAncestorOrEqual(
        WT010_EXPECTED_PATH,
        WT010_EXPECTED_BOOTSTRAP_START_HEAD,
        WT010_LIVE_HEAD,
      ),
      true,
    );
  });

  it('rejects missing bootstrapStartHead through registry parser', () => {
    const { warnings } = runStaticNineEntryPreflight({
      registryTextMutator: (registryText) =>
        registryText.replace(
          `| bootstrapStartHead | \`${WT010_EXPECTED_BOOTSTRAP_START_HEAD}\` |`,
          '',
        ),
    });
    assert.match(warnings.join('; '), /bootstrapStartHead missing/i);
  });

  it('rejects nonexistent bootstrapStartHead object according to controlled inspector', () => {
    const liveEntries = liveEntriesFromTopology();
    const gitInspector = createControlledGitInspector(
      {
        [WT010_EXPECTED_PATH]: {
          objects: new Set([WT010_LIVE_HEAD.toLowerCase()]),
          ancestry: [],
          clean: true,
        },
      },
      { registeredPaths: liveEntries.map((entry) => entry.path) },
    );
    const { warnings } = runStaticNineEntryPreflight({ gitInspector });
    assert.match(warnings.join('; '), /bootstrapStartHead object missing/i);
  });

  it('rejects unrelated live HEAD according to controlled inspector', () => {
    const unrelatedHead = 'a'.repeat(40);
    const liveTopology = LIVE_TOPOLOGY_ENTRIES.map((entry) =>
      entry.path === WT010_EXPECTED_PATH ? { ...entry, head: unrelatedHead } : entry,
    );
    const liveEntries = liveEntriesFromTopology(liveTopology);
    const gitInspector = createControlledGitInspector(
      {
        [WT010_EXPECTED_PATH]: {
          objects: new Set([
            WT010_EXPECTED_BOOTSTRAP_START_HEAD.toLowerCase(),
            unrelatedHead.toLowerCase(),
          ]),
          ancestry: [],
          clean: true,
        },
      },
      { registeredPaths: liveEntries.map((entry) => entry.path) },
    );
    const { warnings } = runStaticNineEntryPreflight({ liveTopology, gitInspector });
    assert.match(warnings.join('; '), /not a descendant of bootstrapStartHead/i);
  });

  it('rejects wrong WT-010 branch', () => {
    const liveTopology = LIVE_TOPOLOGY_ENTRIES.map((entry) =>
      entry.path === WT010_EXPECTED_PATH ? { ...entry, branch: 'wrong-branch' } : entry,
    );
    const { warnings } = runStaticNineEntryPreflight({ liveTopology });
    assert.match(warnings.join('; '), /branch mismatch/i);
  });

  it('rejects wrong WT-010 path', () => {
    const liveTopology = LIVE_TOPOLOGY_ENTRIES.map((entry) =>
      entry.path === WT010_EXPECTED_PATH
        ? { ...entry, path: '/fixture/static-m55-registry/wt-010-wrong' }
        : entry,
    );
    const { warnings } = runStaticNineEntryPreflight({ liveTopology });
    assert.match(warnings.join('; '), /path mismatch|missing from registry/i);
  });

  it('rejects invalid WT-010 ACTIVE-lane lifecycle state', () => {
    const { warnings } = runStaticNineEntryPreflight({
      registryTextMutator: (registryText) =>
        registryText.replace('| lifecycle | **ACTIVE** |', '| lifecycle | **PAUSED** |'),
    });
    assert.match(warnings.join('; '), /lifecycle must be ACTIVE|lifecycle invalid/i);
  });
});

describe('local strict real Git topology validation', () => {
  it('accepts current real WT-010 bootstrapStartHead ancestry against live HEAD', () => {
    if (!fs.existsSync(WT010_EXPECTED_PATH)) {
      return;
    }
    if (!gitObjectExists(WT010_EXPECTED_BOOTSTRAP_START_HEAD, WT010_EXPECTED_PATH)) {
      return;
    }
    const liveHead = runGit(['rev-parse', 'HEAD'], WT010_EXPECTED_PATH);
    assert.equal(
      isAncestorOrEqual(WT010_EXPECTED_BOOTSTRAP_START_HEAD, liveHead, WT010_EXPECTED_PATH),
      true,
    );
    const registry = fs.readFileSync(path.join(REPO_ROOT, 'docs/ssot/M55_WORKTREE_REGISTRY.md'), 'utf8');
    const currentState = fs.readFileSync(path.join(REPO_ROOT, 'docs/ssot/M55_CURRENT_STATE.md'), 'utf8');
    const liveEntry = {
      path: WT010_EXPECTED_PATH,
      branch: runGit(['branch', '--show-current'], WT010_EXPECTED_PATH),
      head: liveHead,
      detached: false,
    };
    const warnings = [];
    const logs = [];
    evaluateWt010ActiveLanePreflight(
      liveEntry,
      makeWt010RegistryEntry(),
      warnings,
      logs,
      createDefaultGitInspector(),
    );
    assert.equal(warnings.length, 0, warnings.join('; '));
    assert.match(logs.join('\n'), /at or after bootstrapStartHead/);
  });

  it('rejects missing real WT-010 path with default git inspector', () => {
    const missingPath = '/tmp/m55-missing-wt-010-path-for-strict-test';
    const warnings = [];
    const logs = [];
    evaluateWt010ActiveLanePreflight(
      {
        path: missingPath,
        branch: WT010_EXPECTED_BRANCH,
        head: WT010_LIVE_HEAD,
        detached: false,
      },
      makeWt010RegistryEntry({ path: missingPath }),
      warnings,
      logs,
      createDefaultGitInspector(),
    );
    assert.match(warnings.join('; '), /path mismatch|object missing/i);
  });

  it('rejects unrelated ancestry with default git inspector on real temp repository', () => {
    const repo = initRepoWithHistory();
    try {
      const warnings = [];
      const logs = [];
      evaluateWt010ActiveLanePreflight(
        { path: repo.dir, branch: WT010_EXPECTED_BRANCH, head: repo.baselineSha, detached: false },
        makeWt010RegistryEntry({ path: repo.dir, bootstrapStartHeadSha: repo.childSha }),
        warnings,
        logs,
        createDefaultGitInspector(),
      );
      assert.match(warnings.join('; '), /not a descendant of bootstrapStartHead/i);
    } finally {
      fs.rmSync(repo.parent, { recursive: true, force: true });
    }
  });

  it('does not introduce process.env.CI behavior fork in verifier source', () => {
    const verifierSource = fs.readFileSync(path.join(REPO_ROOT, VERIFIER_REL_PATH), 'utf8');
    assert.doesNotMatch(verifierSource, /process\.env\.CI/);
  });
});

describe('clean-state disposable proof', () => {
  it('creates its own base and descendant Git objects without repository history dependency', () => {
    const { fixtureParent, fixtureRoot, head, baseSha } = buildCleanStateDisposableFixture();
    try {
      assert.equal(gitObjectExists(baseSha, fixtureRoot), true);
      assert.equal(gitObjectExists(head, fixtureRoot), true);
      assert.equal(isAncestorOrEqual(baseSha, head, fixtureRoot), true);
      assert.notEqual(baseSha, WT010_EXPECTED_BOOTSTRAP_START_HEAD);
      assert.notEqual(head, WT010_EXPECTED_BOOTSTRAP_START_HEAD);
    } finally {
      fs.rmSync(fixtureParent, { recursive: true, force: true });
    }
  });

  it(
    'preflight passes without drift warning on clean bootstrap descendant fixture',
    { timeout: 180000 },
    () => {
      const { fixtureParent, fixtureRoot, head, baseSha } = buildCleanStateDisposableFixture();
      assert.notEqual(head, baseSha, 'temporary disposable commit must advance fixture HEAD');
      assert.equal(runGit(['rev-parse', 'HEAD^'], fixtureRoot), baseSha);
      assert.equal(isAncestorOrEqual(baseSha, head, fixtureRoot), true);

      const worktreeList = spawnSync('git', ['worktree', 'list', '--porcelain'], {
        cwd: fixtureRoot,
        encoding: 'utf8',
      });
      assert.equal(worktreeList.status, 0);
      const liveEntries = parseWorktreeListPorcelain(worktreeList.stdout);
      assert.ok(liveEntries.length >= 1);
      const entry = {
        path: path.resolve(fixtureRoot),
        branch: BOOTSTRAP_BRANCH,
        head,
        detached: false,
      };
      const registryText = fs.readFileSync(
        path.join(fixtureRoot, 'docs/ssot/M55_WORKTREE_REGISTRY.md'),
        'utf8',
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
        `| baseline | \`main\` @ \`${baseSha}\` |`,
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
        `| baseline | \`main\` @ \`${baseSha}\` |`,
        `| baseline | \`main\` @ \`${baseSha}\` |\n| baseline | \`main\` @ \`${baseSha}\` |`,
      );
      const duplicateResult = evaluateWorktreePreflightWarnings(
        [entry],
        negativeDuplicateBaseline,
        currentStateText,
        fixtureRoot,
      );
      assert.match(duplicateResult.warnings.join('\n'), /baseline duplicate|registry parser failure|snapshot preflight failed/i);

      const negativeInvalidBaseline = registryText.replace(
        `| baseline | \`main\` @ \`${baseSha}\` |`,
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
        `| baseline | \`main\` @ \`${baseSha}\` |`,
        `| baseline | note \`main\` @ \`${baseSha}\` |`,
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

function buildWt010RegistrySection({
  wt010Path = WT010_EXPECTED_PATH,
  wt010Branch = WT010_EXPECTED_BRANCH,
  bootstrapStartHead = WT010_EXPECTED_BOOTSTRAP_START_HEAD,
  operationalState = WT010_EXPECTED_OPERATIONAL_STATE,
} = {}) {
  return `### WT-010 — Product Authority Pack

| Field | Value |
|---|---|
| path | \`${wt010Path}\` |
| branch | \`${wt010Branch}\` |
| bootstrapStartHead | \`${bootstrapStartHead}\` |
| lifecycle | **ACTIVE** |
| operational state | **${operationalState}** |
| purpose | **Product Authority Pack** |
`;
}

function makeWt010RegistryEntry(overrides = {}) {
  return {
    id: WT010_ID,
    valid: true,
    errors: [],
    path: WT010_EXPECTED_PATH,
    branch: WT010_EXPECTED_BRANCH,
    bootstrapStartHeadSha: WT010_EXPECTED_BOOTSTRAP_START_HEAD,
    lifecycle: 'ACTIVE',
    operationalState: WT010_EXPECTED_OPERATIONAL_STATE,
    section: '',
    ...overrides,
  };
}

describe('WT-010 ACTIVE lane bootstrapStartHead preflight', () => {
  let repo;

  before(() => {
    repo = initRepoWithHistory();
    runGit(['checkout', '-b', WT010_EXPECTED_BRANCH], repo.dir);
  });

  after(() => {
    fs.rmSync(repo.parent, { recursive: true, force: true });
  });

  it('PASSes when live HEAD equals bootstrapStartHead', () => {
    const warnings = [];
    const logs = [];
    evaluateWt010ActiveLanePreflight(
      { path: repo.dir, branch: WT010_EXPECTED_BRANCH, head: repo.baselineSha, detached: false },
      makeWt010RegistryEntry({ path: repo.dir, bootstrapStartHeadSha: repo.baselineSha }),
      warnings,
      logs,
      createDefaultGitInspector(),
    );
    assert.equal(warnings.length, 0, warnings.join('; '));
    assert.match(logs.join('\n'), /at or after bootstrapStartHead/);
  });

  it('PASSes when live HEAD descends from bootstrapStartHead', () => {
    const warnings = [];
    const logs = [];
    evaluateWt010ActiveLanePreflight(
      { path: repo.dir, branch: WT010_EXPECTED_BRANCH, head: repo.childSha, detached: false },
      makeWt010RegistryEntry({ path: repo.dir, bootstrapStartHeadSha: repo.baselineSha }),
      warnings,
      logs,
      createDefaultGitInspector(),
    );
    assert.equal(warnings.length, 0, warnings.join('; '));
    assert.match(logs.join('\n'), /at or after bootstrapStartHead/);
  });

  it('FAILs when live HEAD is unrelated to bootstrapStartHead', () => {
    const warnings = [];
    const logs = [];
    evaluateWt010ActiveLanePreflight(
      { path: repo.dir, branch: WT010_EXPECTED_BRANCH, head: repo.baselineSha, detached: false },
      makeWt010RegistryEntry({ path: repo.dir, bootstrapStartHeadSha: repo.childSha }),
      warnings,
      logs,
      createDefaultGitInspector(),
    );
    assert.match(warnings.join('; '), /not a descendant of bootstrapStartHead/i);
  });

  it('FAILs on wrong branch', () => {
    const warnings = [];
    const logs = [];
    evaluateWt010ActiveLanePreflight(
      { path: repo.dir, branch: 'wrong-branch', head: repo.childSha, detached: false },
      makeWt010RegistryEntry({ path: repo.dir, bootstrapStartHeadSha: repo.baselineSha }),
      warnings,
      logs,
      createDefaultGitInspector(),
    );
    assert.match(warnings.join('; '), /branch mismatch/i);
  });

  it('FAILs on wrong path', () => {
    const warnings = [];
    const logs = [];
    evaluateWt010ActiveLanePreflight(
      { path: '/tmp/wrong-path', branch: WT010_EXPECTED_BRANCH, head: repo.childSha, detached: false },
      makeWt010RegistryEntry({ bootstrapStartHeadSha: repo.baselineSha }),
      warnings,
      logs,
      createDefaultGitInspector(),
    );
    assert.match(warnings.join('; '), /path mismatch/i);
  });

  it('logs dirty status without failing topology for ALLOWLIST_ONLY_DURING_IMPLEMENTATION', () => {
    fs.writeFileSync(path.join(repo.dir, 'dirty-proof.txt'), 'dirty\n');
    const warnings = [];
    const logs = [];
    evaluateWt010ActiveLanePreflight(
      { path: repo.dir, branch: WT010_EXPECTED_BRANCH, head: repo.childSha, detached: false },
      makeWt010RegistryEntry({ path: repo.dir, bootstrapStartHeadSha: repo.baselineSha }),
      warnings,
      logs,
      createDefaultGitInspector(),
    );
    assert.equal(warnings.length, 0, warnings.join('; '));
    assert.match(logs.join('\n'), /dirty under ALLOWLIST_ONLY_DURING_IMPLEMENTATION/i);
    fs.rmSync(path.join(repo.dir, 'dirty-proof.txt'));
  });

  it('requires bootstrapStartHead in WT-010 registry parser', () => {
    const section = buildWt010RegistrySection().replace(
      `| bootstrapStartHead | \`${WT010_EXPECTED_BOOTSTRAP_START_HEAD}\` |\n`,
      '',
    );
    const entry = parseRegistryWorktreeSection(section, WT010_ID);
    assert.equal(entry.valid, false);
    assert.match(entry.errors.map((error) => error.message).join('; '), /bootstrapStartHead missing/i);
  });

  it('PASSes production WT-010 registry parser with bootstrapStartHead and without HEAD', () => {
    const doc = parseRegistryDocument(buildCapacityRegistryText());
    const wt010 = doc.entries.find((entry) => entry.id === WT010_ID);
    assert.equal(wt010.valid, true);
    assert.equal(wt010.bootstrapStartHeadSha, WT010_EXPECTED_BOOTSTRAP_START_HEAD);
    assert.equal(wt010.headSha, null);
    const preflight = evaluateWt010RegistryPreflight(doc);
    assert.equal(preflight.valid, true);
  });

  it('PASSes full topology when live HEAD descends from bootstrapStartHead', () => {
    if (!gitObjectExists(WT010_EXPECTED_BOOTSTRAP_START_HEAD, REPO_ROOT)) {
      return;
    }
    if (!gitObjectExists(WT010_LIVE_HEAD, REPO_ROOT)) {
      return;
    }
    assert.equal(
      isAncestorOrEqual(WT010_EXPECTED_BOOTSTRAP_START_HEAD, WT010_LIVE_HEAD, REPO_ROOT),
      true,
    );
    const registry = fs.readFileSync(path.join(REPO_ROOT, 'docs/ssot/M55_WORKTREE_REGISTRY.md'), 'utf8');
    const currentState = fs.readFileSync(path.join(REPO_ROOT, 'docs/ssot/M55_CURRENT_STATE.md'), 'utf8');
    const live = LIVE_TOPOLOGY_ENTRIES.map((entry) => ({ ...entry, detached: false }));
    const { warnings } = evaluateWorktreePreflightWarnings(live, registry, currentState, REPO_ROOT, {
      requireFullTopology: true,
      gitInspector: createDefaultGitInspector(),
    });
    assert.equal(warnings.length, 0, warnings.join('; '));
  });
});

describe('Product Authority verifier mode semantics', () => {
  it('bootstrap verifier PASSes sequence 0 only', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'm55-pa-bootstrap-'));
    try {
      bootstrapFixture(tempRoot);
      const result = verifyProductAuthority(tempRoot, { mode: 'bootstrap' });
      assert.equal(result.ok, true);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('bootstrap verifier FAILs reconciled sequences 0-2', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'm55-pa-reconciled-'));
    try {
      bootstrapFixture(tempRoot);
      const historyPath = path.join(tempRoot, '.product-authority/authority-history.jsonl');
      const sequence0 = JSON.parse(fs.readFileSync(historyPath, 'utf8').trim().split('\n')[0]);
      const events = withComputedEventHashes([
        sequence0,
        {
          sequence: 1,
          kind: 'AUTHORITY_PROCESS_INCIDENT',
          sourceCommit: WT010_COMMIT_ONE_HEAD,
          approvalReference: 'test-ref',
          changedPaths: ['a'],
          updatedAt: '2026-07-26T05:48:00+00:00',
        },
        {
          sequence: 2,
          kind: 'BOOTSTRAP_RECONCILIATION',
          sourceCommit: WT010_COMMIT_ONE_HEAD,
          bootstrapHistorySha256: 'c'.repeat(64),
          changedPaths: ['b'],
          updatedAt: '2026-07-26T05:48:00+00:00',
        },
      ]);
      writeHistory(tempRoot, events);
      const result = verifyProductAuthority(tempRoot, { mode: 'bootstrap' });
      assert.equal(result.ok, false);
      assert.match(result.errors.join('; '), /bootstrap history must contain only sequence 0; found 3/);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('steady-state verifier FAILs sequence 0 only', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'm55-pa-bootstrap-only-'));
    try {
      bootstrapFixture(tempRoot);
      const result = verifyProductAuthority(tempRoot, { mode: 'steady-state' });
      assert.equal(result.ok, false);
      assert.match(result.errors.join('; '), /steady-state history requires sequences 0-2; found 1/);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('steady-state verifier PASSes valid sequences 0-2 from production reconciliation candidate', () => {
    const result = verifyProductAuthority(REPO_ROOT, { mode: 'steady-state' });
    assert.equal(result.ok, true, result.errors.join('; '));
  });
});

describe('Product Authority Pack workflow verification mode', () => {
  it('invokes steady-state verification and not bootstrap mode at PR tip', () => {
    const workflow = fs.readFileSync(WORKFLOW_PATH, 'utf8');
    assert.match(workflow, /npm run verify:product-authority/);
    assert.doesNotMatch(workflow, /verify:product-authority:bootstrap/);
  });
});
