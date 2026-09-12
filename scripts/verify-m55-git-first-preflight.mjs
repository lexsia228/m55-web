#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

const files = {
  agents: 'AGENTS.md',
  entry: 'docs/ssot/M55_GIT_FIRST_ENTRYPOINT.md',
  manifest: 'docs/ssot/M55_GIT_PREFLIGHT_MANIFEST.json',
  profile: 'docs/ssot/M55_SCOPE_AWARE_REPO_PREFLIGHT_SSOT.md',
  cursorControlTower: '.cursor/rules/m55-control-tower.mdc',
  cursorPreflight: '.cursor/rules/m55-scope-aware-repo-preflight.mdc',
  ssotIndex: 'docs/ssot/README.md',
};

function full(rel) {
  return path.join(ROOT, rel);
}

function requireFile(rel) {
  if (!fs.existsSync(full(rel))) {
    failures.push(`missing required Git-first file: ${rel}`);
    return false;
  }
  return true;
}

function read(rel) {
  return fs.readFileSync(full(rel), 'utf8');
}

function requireToken(rel, token) {
  if (!requireFile(rel)) return;
  if (!read(rel).includes(token)) {
    failures.push(`${rel} missing required token/reference: ${token}`);
  }
}

for (const rel of Object.values(files)) requireFile(rel);

requireToken(files.agents, 'M55_GIT_FIRST_ENTRYPOINT.md');
requireToken(files.agents, 'M55_GIT_PREFLIGHT_MANIFEST.json');
requireToken(files.agents, 'M55_SCOPE_AWARE_REPO_PREFLIGHT_SSOT.md');
requireToken(files.agents, 'NO_M55_WORK_BEFORE_GIT_FIRST_BASELINE = TRUE');
requireToken(files.agents, 'GIT_PREFLIGHT_INCOMPLETE');
requireToken(files.agents, 'CONTINUATION_FAST_PATH');
requireToken(files.agents, 'PINNED_REVIEW_PREFLIGHT');
requireToken(files.agents, 'FULL_REPO_PREFLIGHT');

requireToken(files.entry, 'IDENTIFY_TASK -> GIT_IDENTITY -> RELEVANT_AUTHORITY -> EXISTING_DECISION_CHECK -> WORK');
requireToken(files.entry, 'GIT_IDENTITY_REQUIRED_BEFORE_M55_WORK = TRUE');
requireToken(files.entry, 'TASK_RELEVANT_GIT_REVIEW_REQUIRED = TRUE');
requireToken(files.entry, 'PRE_MUTATION_GIT_RECHECK_REQUIRED = TRUE');
requireToken(files.entry, 'PRE_GREEN_RELEVANT_GIT_RECHECK_REQUIRED = TRUE');

requireToken(files.profile, 'CONTINUATION_LANES_MUST_NOT_BE_FORCED_THROUGH_UNRELATED_FULL_PREFLIGHT = TRUE');
requireToken(files.profile, 'FULL_PREFLIGHT_IN_ONE_LANE_DOES_NOT_GLOBALLY_BARRIER_OTHER_VALID_LANES = TRUE');
requireToken(files.profile, 'SEARCH_EXISTING_SSOT_BEFORE_CREATING_NEW_CONTRACT = TRUE');

requireToken(files.cursorControlTower, 'M55_GIT_FIRST_ENTRYPOINT.md');
requireToken(files.cursorControlTower, 'GIT_PREFLIGHT_INCOMPLETE');
requireToken(files.cursorPreflight, 'FULL_REPO_PREFLIGHT');
requireToken(files.cursorPreflight, 'CONTINUATION_FAST_PATH');
requireToken(files.cursorPreflight, 'PINNED_REVIEW_PREFLIGHT');

let manifest;
if (requireFile(files.manifest)) {
  try {
    manifest = JSON.parse(read(files.manifest));
  } catch (error) {
    failures.push(`invalid JSON in ${files.manifest}: ${error.message}`);
  }
}

if (manifest) {
  if (manifest?.universal?.gitFirstRequired !== true) failures.push('manifest universal.gitFirstRequired must be true');
  if (manifest?.universal?.failClosedToken === 'GIT_PREFLIGHT_INCOMPLETE') {
    failures.push('manifest failClosedToken must live at top level, not universal');
  }
  if (manifest?.failClosedToken !== 'GIT_PREFLIGHT_INCOMPLETE') failures.push('manifest failClosedToken mismatch');

  for (const profile of ['CONTINUATION_FAST_PATH', 'PINNED_REVIEW_PREFLIGHT', 'FULL_REPO_PREFLIGHT']) {
    if (!manifest?.profiles?.[profile]) failures.push(`manifest missing profile ${profile}`);
    if (manifest?.profiles?.[profile]?.requiresGitIdentity !== true) {
      failures.push(`${profile}.requiresGitIdentity must be true`);
    }
  }

  for (const stage of [
    'IDENTIFY_TASK',
    'GIT_FIRST_BASELINE',
    'ROUTE_RELEVANT_AUTHORITY',
    'EXISTING_DECISION_CHECK',
  ]) {
    if (!manifest?.mandatoryStages?.includes(stage)) failures.push(`manifest missing mandatory stage ${stage}`);
  }

  for (const taskClass of [
    'UIUX_CONTINUATION',
    'CREATOR_REVENUE_DESIGN',
    'LEGAL_TAX_OPERATOR',
    'STRIPE_PROVIDER_MONEY',
    'DB_LEDGER_SECURITY',
    'SSOT_GOVERNANCE',
    'PINNED_DIFF_REVIEW',
    'MERGE_SYNC_INTEGRATION',
  ]) {
    if (!manifest?.taskClasses?.[taskClass]) failures.push(`manifest missing task class ${taskClass}`);
  }

  if (manifest?.taskClasses?.UIUX_CONTINUATION?.defaultProfile !== 'CONTINUATION_FAST_PATH') {
    failures.push('UIUX_CONTINUATION must default to CONTINUATION_FAST_PATH');
  }
  if (manifest?.taskClasses?.CREATOR_REVENUE_DESIGN?.defaultProfile !== 'FULL_REPO_PREFLIGHT') {
    failures.push('CREATOR_REVENUE_DESIGN must default to FULL_REPO_PREFLIGHT');
  }
}

if (failures.length) {
  console.error('M55_GIT_FIRST_PREFLIGHT_VERIFY=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('M55_GIT_FIRST_PREFLIGHT_VERIFY=PASS');
console.log('profiles=CONTINUATION_FAST_PATH,PINNED_REVIEW_PREFLIGHT,FULL_REPO_PREFLIGHT');
console.log('git_identity_required_for_all_profiles=true');
