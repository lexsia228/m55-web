import fs from 'node:fs';

export const REQUIRED_PROFILES = [
  'CONTINUATION_FAST_PATH',
  'PINNED_REVIEW_PREFLIGHT',
  'FULL_REPO_PREFLIGHT',
];

export const DANGEROUS_FULL_TASK_CLASSES = [
  'CREATOR_REVENUE_DESIGN',
  'LEGAL_TAX_OPERATOR',
  'STRIPE_PROVIDER_MONEY',
  'DB_LEDGER_SECURITY',
  'SSOT_GOVERNANCE',
  'MERGE_SYNC_INTEGRATION',
];

export const REQUIRED_MANDATORY_STAGES = [
  'IDENTIFY_TASK',
  'GIT_FIRST_BASELINE',
  'ROUTE_RELEVANT_AUTHORITY',
  'EXISTING_DECISION_CHECK',
  'PRE_MUTATION_RECHECK_IF_MUTATING',
  'PRE_GREEN_OR_INTEGRATION_RECHECK_WHEN_APPLICABLE',
];

export const REQUIRED_UNIVERSAL_READS = [
  'docs/ssot/M55_GIT_FIRST_ENTRYPOINT.md',
  'docs/ssot/M55_GIT_PREFLIGHT_MANIFEST.json',
  'docs/ssot/M55_SCOPE_AWARE_REPO_PREFLIGHT_SSOT.md',
  'docs/ssot/M55_GIT_FIRST_HARDENING_SSOT.md',
  'docs/ssot/M55_GIT_FIRST_HOST_ENFORCEMENT_SSOT.md',
];

export const REQUIRED_WORKFLOW_COMMANDS = [
  'node scripts/verify-m55-git-first-preflight.mjs',
  'node scripts/verify-m55-git-first-hardening.mjs',
  'node scripts/verify-m55-git-first-structure.mjs',
  'node --test scripts/m55-git-first-policy.test.mjs',
  'node scripts/verify-m55-git-first-diff.mjs',
];

export const HOST_REQUIRED_JOB_ID = 'verify-git-first-preflight';

export function validateManifest(manifest, { fileExists = fs.existsSync } = {}) {
  const failures = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return ['manifest must be a JSON object'];
  }
  if (manifest?.universal?.gitFirstRequired !== true) failures.push('universal.gitFirstRequired must be true');
  if (manifest?.failClosedToken !== 'GIT_PREFLIGHT_INCOMPLETE') failures.push('failClosedToken mismatch');
  if (manifest?.universal?.unknownScopeProfile !== 'FULL_REPO_PREFLIGHT') failures.push('unknownScopeProfile must be FULL_REPO_PREFLIGHT');

  for (const read of REQUIRED_UNIVERSAL_READS) {
    if (!manifest?.universal?.requiredReads?.includes(read)) failures.push(`universal.requiredReads missing ${read}`);
  }

  for (const profile of REQUIRED_PROFILES) {
    if (!manifest?.profiles?.[profile]) failures.push(`missing profile ${profile}`);
    if (manifest?.profiles?.[profile]?.requiresGitIdentity !== true) failures.push(`${profile}.requiresGitIdentity must be true`);
  }
  if (manifest?.profiles?.PINNED_REVIEW_PREFLIGHT?.mutationAllowed !== false) failures.push('PINNED_REVIEW_PREFLIGHT.mutationAllowed must be false');
  if (manifest?.profiles?.FULL_REPO_PREFLIGHT?.requiresFreshRemoteMain !== true) failures.push('FULL_REPO_PREFLIGHT.requiresFreshRemoteMain must be true');
  if (manifest?.profiles?.FULL_REPO_PREFLIGHT?.requiresRelevantUnmergedAuthorityCheck !== true) failures.push('FULL_REPO_PREFLIGHT.requiresRelevantUnmergedAuthorityCheck must be true');

  for (const stage of REQUIRED_MANDATORY_STAGES) {
    if (!manifest?.mandatoryStages?.includes(stage)) failures.push(`mandatoryStages missing ${stage}`);
  }

  if (manifest?.taskClasses?.UIUX_CONTINUATION?.defaultProfile !== 'CONTINUATION_FAST_PATH') {
    failures.push('UIUX_CONTINUATION must default to CONTINUATION_FAST_PATH');
  }
  if (manifest?.taskClasses?.PINNED_DIFF_REVIEW?.defaultProfile !== 'PINNED_REVIEW_PREFLIGHT') {
    failures.push('PINNED_DIFF_REVIEW must default to PINNED_REVIEW_PREFLIGHT');
  }
  if (manifest?.taskClasses?.PINNED_DIFF_REVIEW?.mutationAllowed !== false) failures.push('PINNED_DIFF_REVIEW.mutationAllowed must be false');
  for (const taskClass of DANGEROUS_FULL_TASK_CLASSES) {
    if (manifest?.taskClasses?.[taskClass]?.defaultProfile !== 'FULL_REPO_PREFLIGHT') {
      failures.push(`${taskClass} must default to FULL_REPO_PREFLIGHT`);
    }
  }

  for (const [taskClass, config] of Object.entries(manifest?.taskClasses ?? {})) {
    if (Array.isArray(config.requiredAuthority)) {
      for (const rel of config.requiredAuthority) {
        if (typeof rel !== 'string' || !rel.trim()) failures.push(`${taskClass}.requiredAuthority contains invalid path`);
        else if (!fileExists(rel)) failures.push(`${taskClass}.requiredAuthority missing file ${rel}`);
      }
    }
    if (config.requiredUnmergedAuthority !== undefined) {
      if (config.checkRelevantOpenPrOrStackedBranch !== true) {
        failures.push(`${taskClass}.requiredUnmergedAuthority requires checkRelevantOpenPrOrStackedBranch=true`);
      }
      if (!Array.isArray(config.requiredUnmergedAuthority) || config.requiredUnmergedAuthority.length === 0) {
        failures.push(`${taskClass}.requiredUnmergedAuthority must be a non-empty array`);
      } else {
        for (const item of config.requiredUnmergedAuthority) {
          if (!item || typeof item !== 'object' || Array.isArray(item)) {
            failures.push(`${taskClass}.requiredUnmergedAuthority contains invalid entry`);
            continue;
          }
          if (typeof item.path !== 'string' || !item.path.trim()) failures.push(`${taskClass}.requiredUnmergedAuthority entry missing path`);
          if (typeof item.discoveryHint !== 'string' || !item.discoveryHint.trim()) failures.push(`${taskClass}.requiredUnmergedAuthority entry missing discoveryHint`);
        }
      }
    }
  }

  if (!Array.isArray(manifest?.hardTriggerPaths) || manifest.hardTriggerPaths.length === 0) failures.push('hardTriggerPaths must be non-empty');
  if (!Array.isArray(manifest?.semanticOwnerPaths) || manifest.semanticOwnerPaths.length === 0) failures.push('semanticOwnerPaths must be non-empty');

  const handoff = manifest?.continuationHandoff;
  if (!handoff || handoff.enabled !== true) failures.push('continuationHandoff.enabled must be true');
  for (const key of ['lane','owner','workspaceOrRef','authorizedTask','candidateSha','mutablePaths','observedAt']) {
    if (!handoff?.requiredFields?.includes(key)) failures.push(`continuationHandoff.requiredFields missing ${key}`);
  }
  if (handoff?.newChatMayUseFastWhenValid !== true) failures.push('continuationHandoff.newChatMayUseFastWhenValid must be true');
  if (handoff?.missingOrStaleHandoffDefaultsFull !== true) failures.push('continuationHandoff.missingOrStaleHandoffDefaultsFull must be true');

  return failures;
}

export function validateCursorRule(text, label) {
  const failures = [];
  const frontmatter = text.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter) failures.push(`${label} missing frontmatter`);
  else if (!/^alwaysApply:\s*true\s*$/m.test(frontmatter[1])) failures.push(`${label} alwaysApply must be true`);
  for (const token of ['GIT_PREFLIGHT_INCOMPLETE','CONTINUATION_FAST_PATH','FULL_REPO_PREFLIGHT']) {
    if (!text.includes(token)) failures.push(`${label} missing ${token}`);
  }
  return failures;
}

function activeWorkflowText(text) {
  return text.split(/\r?\n/).filter(line => !/^\s*#/.test(line)).join('\n');
}

function extractJobBlock(active, jobId) {
  const lines = active.split('\n');
  const jobsIndex = lines.findIndex(line => /^jobs:\s*$/.test(line));
  if (jobsIndex < 0) return null;
  const jobHeader = `  ${jobId}:`;
  const start = lines.findIndex((line, index) => index > jobsIndex && line === jobHeader);
  if (start < 0) return null;
  const block = [lines[start]];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^  [A-Za-z0-9_-]+:\s*$/.test(lines[i])) break;
    block.push(lines[i]);
  }
  return block.join('\n');
}

function extractPullRequestEventBlock(active) {
  const lines = active.split('\n');
  const onIndex = lines.findIndex(line => /^on:\s*$/.test(line));
  if (onIndex < 0) return null;
  const start = lines.findIndex((line, index) => index > onIndex && /^  pull_request:\s*$/.test(line));
  if (start < 0) return null;
  const block = [lines[start]];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^  [A-Za-z0-9_-]+:\s*$/.test(lines[i])) break;
    block.push(lines[i]);
  }
  return block.join('\n');
}

export function validateWorkflow(text) {
  const failures = [];
  const active = activeWorkflowText(text);

  if (!/^on:\s*$/m.test(active)) failures.push('workflow missing active on: block');
  if (!/^\s{2}pull_request:\s*$/m.test(active)) failures.push('workflow missing active pull_request trigger');
  if (!/^\s{2}push:\s*$/m.test(active)) failures.push('workflow missing active push trigger');
  if (!/^\s{6}- main\s*$/m.test(active)) failures.push('workflow push trigger must include main');

  const prEvent = extractPullRequestEventBlock(active);
  if (prEvent) {
    if (/^\s{4}(paths|paths-ignore|branches|branches-ignore):\s*$/m.test(prEvent)) {
      failures.push('workflow pull_request trigger must not narrow paths or branches');
    }
  }

  if (/^\s+(paths|paths-ignore):\s*$/m.test(active)) {
    failures.push('workflow must not use paths/paths-ignore filters; Git-first self-protection must run on every PR');
  }

  const requiredJob = extractJobBlock(active, HOST_REQUIRED_JOB_ID);
  if (!requiredJob) {
    failures.push(`workflow missing host-required job ${HOST_REQUIRED_JOB_ID}`);
    return failures;
  }
  if (/^\s{4}if\s*:\s*/m.test(requiredJob)) failures.push('host-required job must not have a job-level if condition');
  if (/^\s{8}if\s*:\s*/m.test(requiredJob)) failures.push('host-required job steps must not have step-level if conditions');
  if (/^\s{8}continue-on-error\s*:\s*/m.test(requiredJob)) failures.push('host-required job steps must not use continue-on-error');
  if (/^\s{4}name:\s*(?!["']?verify-git-first-preflight["']?\s*$).+/m.test(requiredJob)) {
    failures.push('host-required job must not override its check name');
  }
  if (!/^\s{6}- uses:\s*actions\/checkout@v4\s*$/m.test(requiredJob)) failures.push('host-required job must use actions/checkout@v4');
  if (!/^\s{10}fetch-depth:\s*0\s*$/m.test(requiredJob)) failures.push('host-required job checkout must use fetch-depth: 0');

  for (const command of REQUIRED_WORKFLOW_COMMANDS) {
    const escaped = command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp(`^\\s{8}run:\\s*${escaped}\\s*$`, 'm').test(requiredJob)) {
      failures.push(`host-required job missing active command: ${command}`);
    }
  }

  return failures;
}

function shellMutationLines(active) {
  return active.split('\n').map(line => line.trim()).filter(Boolean);
}

export function validateAssetIndexWorkflow(text) {
  const failures = [];
  const active = activeWorkflowText(text);
  const lines = shellMutationLines(active);

  if (!/^\s{6}contents:\s*write\s*$/m.test(active)) failures.push('asset-index workflow must scope contents: write to its job');
  if (!/^\s{6}pull-requests:\s*write\s*$/m.test(active)) failures.push('asset-index workflow must scope pull-requests: write to its job');
  if (!/gh pr create/.test(active)) failures.push('asset-index workflow must create a pull request');
  if (!/--base main/.test(active)) failures.push('asset-index pull request must target main');
  if (!/automation\/m55-asset-index-/.test(active)) failures.push('asset-index workflow must use the dedicated automation branch family');

  for (const line of lines) {
    if (/\bgit\s+push\b/.test(line)) {
      if (/\|\|\s*true\b/.test(line) || /continue-on-error\s*:\s*true/.test(active)) {
        failures.push('asset-index workflow must not swallow push failures');
      }
      const normalized = line.replace(/["']/g, ' ');
      if (/\b(?:refs\/heads\/)?main\b/.test(normalized) || /\bHEAD\s*:\s*(?:refs\/heads\/)?main\b/.test(normalized)) {
        failures.push('asset-index workflow must not push directly to main by branch or refspec');
      }
      if (!/\$BRANCH|steps\.branch\.outputs\.name/.test(line) && !/--set-upstream\s+origin\s+"?\$BRANCH"?/.test(line)) {
        failures.push('asset-index git push must target the dedicated automation branch variable');
      }
    }

    if (/\bgh\s+pr\s+merge\b/.test(line) || /\bgh\s+api\b.*\/pulls\/[^\s/]+\/merge\b/.test(line) || /\bcurl\b.*\/pulls\/[^\s/]+\/merge\b/.test(line)) {
      failures.push('asset-index workflow must not auto-merge its pull request');
    }
    if (/\bgh\s+pr\s+review\b.*--approve\b/.test(line) || /\bgh\s+api\b.*\/pulls\/[^\s/]+\/reviews\b/.test(line) || /\bcurl\b.*\/pulls\/[^\s/]+\/reviews\b/.test(line)) {
      failures.push('asset-index workflow must not auto-approve its pull request');
    }
    if (/\b(?:gh\s+api|curl)\b/i.test(line) && /(?:git\/refs\/heads\/main|refs\/heads\/main)/i.test(line.replace(/["']/g, ' '))) {
      failures.push('asset-index workflow must not mutate the main ref through GitHub API calls');
    }
  }

  if (/\b(?:mergePullRequest|updateRef|createRef|deleteRef)\b/.test(active)) {
    failures.push('asset-index workflow must not use GitHub GraphQL merge/ref mutations');
  }
  if (/(?:\bgh\s+api\b|\bcurl\b)[\s\S]{0,800}(?:git\/refs\/heads\/main|refs\/heads\/main)/i.test(active)) {
    failures.push('asset-index workflow must not mutate the main ref through GitHub API calls');
  }
  if (/\bauto-merge\b|\bmerge_method\b|\bAPPROVE\b/.test(active)) {
    failures.push('asset-index workflow must not contain auto-merge or approval API semantics');
  }

  return [...new Set(failures)];
}

function globToRegExp(glob) {
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
          out += '.*';
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

export function pathMatches(path, pattern) {
  const normalizedPath = String(path).replace(/\\/g, '/').toLowerCase();
  const normalizedPattern = String(pattern).replace(/\\/g, '/').toLowerCase();
  return globToRegExp(normalizedPattern).test(normalizedPath);
}

export function classifyChangedPaths(paths, manifest) {
  const matched = [];
  for (const path of paths) {
    for (const pattern of [...(manifest?.hardTriggerPaths ?? []), ...(manifest?.semanticOwnerPaths ?? [])]) {
      if (pathMatches(path, pattern)) matched.push({ path, pattern });
    }
  }
  return { requiresFull: matched.length > 0, matched };
}
