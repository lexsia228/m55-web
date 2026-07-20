import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const EXIT_USAGE = 2;
export function exitCodeForStatus(status) { return status === 'HOLD' ? 1 : 0; }
export function classifyChecks(checks) { const levels = new Set(checks.map((check) => check.level)); return levels.has('FAIL') ? 'HOLD' : levels.has('WARN') ? 'READY_WITH_WARNINGS' : 'READY'; }

export function redactRemote(value = '') {
  return value.replace(/(https?:\/\/)([^/@\s]+)@/g, '$1[REDACTED]@');
}

export function resolveGitExecutable({ platform = process.platform, env = process.env, existsSync = fs.existsSync } = {}) {
  if (platform !== 'win32') return env.GIT_EXECUTABLE || 'git';
  if (env.GIT_EXECUTABLE && existsSync(env.GIT_EXECUTABLE)) return env.GIT_EXECUTABLE;
  const extensions = (env.PATHEXT || '.EXE;.CMD;.BAT').split(';').filter(Boolean);
  for (const directory of (env.PATH || '').split(';').filter(Boolean)) {
    for (const extension of extensions) {
      const candidate = path.win32.join(directory, `git${extension.toLowerCase()}`);
      if (existsSync(candidate)) return candidate;
    }
  }
  return 'git.exe';
}

export function runGit(repo, args) {
  try {
    return execFileSync(resolveGitExecutable(), ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: false, windowsHide: true, env: process.env }).trim();
  } catch (error) {
    return null;
  }
}

export function parseWorktrees(porcelain = '') {
  const entries = [];
  let entry;
  for (const line of porcelain.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (entry) entries.push(entry);
      entry = { path: line.slice(9), head: null, branch: null, detached: false };
    } else if (entry && line.startsWith('HEAD ')) entry.head = line.slice(5);
    else if (entry && line.startsWith('branch refs/heads/')) entry.branch = line.slice(18);
    else if (entry && line === 'detached') entry.detached = true;
  }
  if (entry) entries.push(entry);
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

export function gitOperation(repo) {
  const markers = [['MERGE_HEAD', 'merge'], ['CHERRY_PICK_HEAD', 'cherry-pick'], ['REVERT_HEAD', 'revert']];
  for (const [name, label] of markers) {
    const candidate = runGit(repo, ['rev-parse', '--git-path', name]);
    if (candidate && fs.existsSync(path.resolve(repo, candidate))) return label;
  }
  for (const name of ['rebase-merge', 'rebase-apply']) {
    const candidate = runGit(repo, ['rev-parse', '--git-path', name]);
    if (candidate && fs.existsSync(path.resolve(repo, candidate))) return 'rebase';
  }
  return 'none';
}

export function collectRepository(repo) {
  const root = runGit(repo, ['rev-parse', '--show-toplevel']);
  if (!root) throw new Error('NOT_A_GIT_REPOSITORY');
  const branch = runGit(root, ['branch', '--show-current']) || 'DETACHED';
  const head = runGit(root, ['rev-parse', 'HEAD']);
  const originMain = runGit(root, ['rev-parse', 'origin/main']);
  const upstream = runGit(root, ['rev-parse', '--abbrev-ref', '@{upstream}']);
  const remote = redactRemote(runGit(root, ['remote', 'get-url', 'origin']) || '');
  const dirtyFiles = (runGit(root, ['status', '--porcelain']) || '').split('\n').filter(Boolean).length;
  return {
    root, branch, head, originMain, upstream, remote,
    clean: dirtyFiles === 0, dirtyFiles, gitOperation: gitOperation(root),
    worktrees: parseWorktrees(runGit(root, ['worktree', 'list', '--porcelain']) || ''),
  };
}

export function validateAuthorityPath(root, candidate, real, label = '') {
  if (!candidate.startsWith(`${root}${path.sep}`)) throw new Error(`AUTHORITY_PATH_ESCAPE:${label}`);
  if (!real.startsWith(`${root}${path.sep}`)) throw new Error(`AUTHORITY_SYMLINK_ESCAPE:${label}`);
  return real;
}

export function safeRead(repo, relativePath) {
  const root = fs.realpathSync(repo);
  const candidate = path.resolve(root, relativePath);
  const real = fs.realpathSync(candidate);
  validateAuthorityPath(root, candidate, real, relativePath);
  return fs.readFileSync(real, 'utf8');
}

export function htmlEscape(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
