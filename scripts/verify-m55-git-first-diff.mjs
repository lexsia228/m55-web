#!/usr/bin/env node
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const manifest = JSON.parse(fs.readFileSync('docs/ssot/M55_GIT_PREFLIGHT_MANIFEST.json','utf8'));
const base = process.env.M55_BASE_SHA;
const head = process.env.M55_HEAD_SHA;
const prBody = process.env.M55_PR_BODY ?? '';
const eventName = process.env.M55_EVENT_NAME ?? 'local';

function splitNulPaths(buffer) {
  const paths = [];
  let start = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    if (buffer[i] !== 0) continue;
    paths.push(buffer.subarray(start, i).toString('utf8'));
    start = i + 1;
  }
  if (start !== buffer.length) {
    throw new Error('unterminated NUL-delimited git path output');
  }
  return paths;
}

function globToRegExpNulSafe(glob) {
  let out = '^';
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i];
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        const followedBySlash = glob[i + 2] === '/';
        if (followedBySlash) {
          out += '(?:[^/]+/)*';
          i += 2;
        } else {
          out += '[\\s\\S]*';
          i += 1;
        }
      } else {
        out += '[^/]*';
      }
      continue;
    }
    if (ch === '?') {
      out += '[^/]';
      continue;
    }
    if ('\\.^$+{}()|[]'.includes(ch)) out += `\\${ch}`;
    else out += ch;
  }
  out += '$';
  return new RegExp(out);
}

function pathMatchesNulSafe(path, pattern) {
  const normalizedPath = String(path).replace(/\\/g, '/').toLowerCase();
  const normalizedPattern = String(pattern).replace(/\\/g, '/').toLowerCase();
  return globToRegExpNulSafe(normalizedPattern).test(normalizedPath);
}

function classifyChangedPathsNulSafe(paths, manifest) {
  const matched = [];
  for (const filepath of paths) {
    for (const pattern of [...(manifest?.hardTriggerPaths ?? []), ...(manifest?.semanticOwnerPaths ?? [])]) {
      if (pathMatchesNulSafe(filepath, pattern)) matched.push({ path: filepath, pattern });
    }
  }
  return { requiresFull: matched.length > 0, matched };
}

const enforcementCriticalPatterns = [
  'AGENTS.md',
  '.cursor/rules/m55-*.mdc',
  '.github/workflows/m55-git-first-preflight.yml',
  '.github/workflows/m55-asset-index.yml',
  'scripts/m55-git-first-*.mjs',
  'scripts/verify-m55-git-first-*.mjs',
  'docs/ssot/M55_GIT_PREFLIGHT_MANIFEST.json',
  'docs/ssot/M55_GIT_FIRST_ENTRYPOINT.md',
  'docs/ssot/M55_SCOPE_AWARE_REPO_PREFLIGHT_SSOT.md',
  'docs/ssot/M55_GIT_FIRST_HARDENING_SSOT.md',
  'docs/ssot/M55_GIT_FIRST_HOST_ENFORCEMENT_SSOT.md',
  'docs/ssot/M55_GIT_FIRST_EXTERNAL_RED_TEAM_ACCEPTANCE_SSOT.md',
];

if (!base || !head) {
  console.error('M55_GIT_FIRST_DIFF_VERIFY=FAIL');
  console.error('- M55_BASE_SHA and M55_HEAD_SHA are required');
  process.exit(1);
}

let changed;
try {
  const diffOutput = execFileSync('git', ['diff', '--no-renames', '--name-only', '-z', `${base}...${head}`]);
  changed = splitNulPaths(diffOutput);
} catch (error) {
  console.error('M55_GIT_FIRST_DIFF_VERIFY=FAIL');
  console.error(`- unable to resolve exact diff ${base}...${head}: ${error.message}`);
  process.exit(1);
}

const classification = classifyChangedPathsNulSafe(changed, manifest);
const marker = prBody.match(/M55_PREFLIGHT_PROFILE:\s*(CONTINUATION_FAST_PATH|PINNED_REVIEW_PREFLIGHT|FULL_REPO_PREFLIGHT)/i)?.[1]?.toUpperCase();
const enforcementMarker = /M55_ENFORCEMENT_CHANGE:\s*TRUE/i.test(prBody);
const enforcementHits = changed.filter(path => enforcementCriticalPatterns.some(pattern => pathMatchesNulSafe(path, pattern)));

if (classification.requiresFull && eventName === 'pull_request' && marker !== 'FULL_REPO_PREFLIGHT') {
  console.error('M55_GIT_FIRST_DIFF_VERIFY=FAIL');
  console.error('- changed paths require FULL_REPO_PREFLIGHT but PR body does not declare M55_PREFLIGHT_PROFILE: FULL_REPO_PREFLIGHT');
  for (const hit of classification.matched) console.error(`- ${hit.path} <= ${hit.pattern}`);
  process.exit(1);
}

if (enforcementHits.length && eventName === 'pull_request' && !enforcementMarker) {
  console.error('M55_GIT_FIRST_DIFF_VERIFY=FAIL');
  console.error('- enforcement-critical files changed but PR body does not declare M55_ENFORCEMENT_CHANGE: TRUE');
  for (const path of enforcementHits) console.error(`- enforcement-critical: ${path}`);
  process.exit(1);
}

console.log('M55_GIT_FIRST_DIFF_VERIFY=PASS');
console.log(`changed_file_count=${changed.length}`);
console.log(`machine_requires_full=${classification.requiresFull}`);
console.log(`enforcement_critical_change=${enforcementHits.length > 0}`);
if (classification.matched.length) console.log(`matched=${JSON.stringify(classification.matched)}`);
if (enforcementHits.length) console.log(`enforcement_hits=${JSON.stringify(enforcementHits)}`);
console.log('semantic_note=static path classification is not complete semantic proof');
console.log('host_note=required status context is not immutable attestation of candidate-controlled workflow code; enforcement-critical changes require independent exact-head external re-audit before adoption');
