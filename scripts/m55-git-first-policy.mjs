import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { isDeepStrictEqual } from 'node:util';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');

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

const PARSER_INSTALL_COMMAND = [
  'npm install --prefix "$RUNNER_TEMP/m55-yaml-parser" --no-save --ignore-scripts --no-audit --no-fund --package-lock=false js-yaml@4.1.1',
  'echo "NODE_PATH=$RUNNER_TEMP/m55-yaml-parser/node_modules" >> "$GITHUB_ENV"',
].join('\n');

const EXPECTED_GIT_FIRST_WORKFLOW = {
  name: 'm55-git-first-preflight',
  on: {
    pull_request: null,
    push: {
      branches: ['main'],
    },
  },
  permissions: {
    contents: 'read',
  },
  jobs: {
    [HOST_REQUIRED_JOB_ID]: {
      'runs-on': 'ubuntu-latest',
      steps: [
        {
          uses: 'actions/checkout@v4',
          with: {
            'fetch-depth': 0,
          },
        },
        {
          name: 'Install pinned M55 YAML parser',
          run: PARSER_INSTALL_COMMAND,
        },
        {
          name: 'Verify M55 Git-first legacy routing compatibility',
          run: REQUIRED_WORKFLOW_COMMANDS[0],
        },
        {
          name: 'Verify M55 Git-first legacy hardening compatibility',
          run: REQUIRED_WORKFLOW_COMMANDS[1],
        },
        {
          name: 'Verify M55 Git-first structural invariants',
          run: REQUIRED_WORKFLOW_COMMANDS[2],
        },
        {
          name: 'Run M55 Git-first negative policy tests',
          run: REQUIRED_WORKFLOW_COMMANDS[3],
        },
        {
          name: 'Verify M55 Git-first exact changed-path classification',
          env: {
            M55_BASE_SHA: '${{ github.event.pull_request.base.sha || github.event.before }}',
            M55_HEAD_SHA: '${{ github.event.pull_request.head.sha || github.sha }}',
            M55_PR_BODY: "${{ github.event.pull_request.body || '' }}",
            M55_EVENT_NAME: '${{ github.event_name }}',
          },
          run: REQUIRED_WORKFLOW_COMMANDS[4],
        },
      ],
    },
  },
};

const ASSET_INDEX_RUN_HASHES = [
  null,
  null,
  '8e39bb91b0f635e9adff16917e7f0e9a25abd8af80a85d15fa48bdb61ec909a3',
  '6cf5d53ca6ebad881c848a647918cb0323bc8397ce5a4dd46eca62dd81da608b',
  '27e075033e1cd8b8daf8dec37cb45c3323fc64cae2224509eb0781e9ec0afa0a',
  'fb477535cf827e9af5aec848fca2c08dabcc8495c7188642b0bda870c2f611f8',
  '40de014297eb5d53e6820911cd9e947b60c776c324523260c31415c33848fa07',
  'b68bda374c576288c4dbcac80227372f56591388408a3bedd63ce9d834f0783f',
  '88352fb3c37969fe7c251c2f96db9c2c9ebfa2a1eec4ff132d8ad93b74e475b2',
  '61e8497269c380bbb4ab7d615776e4f3fc0926d727eab16095e6f36968e7c137',
  'd3f691fe2e1d49d5709e29d8802fffd54306036b6bb2f81fe782d30648d82dfb',
  '3d1641c8ae671f4891e4b6b4d5007ac7763757f206d18a2a589a1eae1ddd6613',
  'f6c48067adc14090eba57e7f981be6fa45f77bdf82c8c17e78803d0be547c6fa',
];

const ASSET_INDEX_TRUSTED_BUILD_STEP = 'Build asset index from trusted main';
const ASSET_INDEX_OUTPUT_BRANCH_STEP = 'Prepare automation branch';

const REPO_SCRIPT_RUN_PATTERN = /\b(?:python|node|bash)\s+(?:[^\n|;&]*\/)?scripts\//;
const ASSET_INDEX_FORBIDDEN_POST_SWITCH_OUTPUT_WRITE_PATTERN =
  /\b(?:cp|mv|install)\s+[^\n]*M55_REPO_ASSET_INDEX\.(?:md|json)|>\s*docs\/audit\/M55_REPO_ASSET_INDEX\.(?:md|json)/;

const EXPECTED_ASSET_INDEX_SEMANTICS = {
  name: 'm55-asset-index',
  on: {
    workflow_dispatch: null,
    schedule: [{ cron: '15 21 * * *' }],
  },
  jobs: {
    'build-index': {
      'runs-on': 'ubuntu-latest',
      permissions: {
        contents: 'write',
        'pull-requests': 'write',
      },
      steps: [
        {
          uses: 'actions/checkout@v4',
          with: { 'fetch-depth': 0 },
        },
        {
          name: 'Set up Python',
          uses: 'actions/setup-python@v5',
          with: { 'python-version': '3.11' },
        },
        {
          name: 'Resolve automation branch',
          id: 'branch',
          env: { GH_TOKEN: '${{ github.token }}' },
          run_sha256: ASSET_INDEX_RUN_HASHES[2],
        },
        {
          name: 'Assert trusted main checkout',
          run_sha256: ASSET_INDEX_RUN_HASHES[3],
        },
        {
          name: ASSET_INDEX_TRUSTED_BUILD_STEP,
          run_sha256: ASSET_INDEX_RUN_HASHES[4],
        },
        {
          name: 'Stage trusted index outputs',
          run_sha256: ASSET_INDEX_RUN_HASHES[5],
        },
        {
          name: ASSET_INDEX_OUTPUT_BRANCH_STEP,
          env: {
            BRANCH: '${{ steps.branch.outputs.name }}',
            EXISTING_PR: '${{ steps.branch.outputs.existing_pr }}',
          },
          run_sha256: ASSET_INDEX_RUN_HASHES[6],
        },
        {
          name: 'Write trusted index outputs via Git index',
          run_sha256: ASSET_INDEX_RUN_HASHES[7],
        },
        {
          name: 'Verify staged index outputs',
          run_sha256: ASSET_INDEX_RUN_HASHES[8],
        },
        {
          name: 'Commit index if changed',
          id: 'commit',
          env: { BRANCH: '${{ steps.branch.outputs.name }}' },
          run_sha256: ASSET_INDEX_RUN_HASHES[9],
        },
        {
          name: 'Push main-sync-only update for existing PR',
          if: "steps.branch.outputs.existing_pr == 'true' && steps.commit.outputs.changed != 'true'",
          env: { BRANCH: '${{ steps.branch.outputs.name }}' },
          run_sha256: ASSET_INDEX_RUN_HASHES[10],
        },
        {
          name: 'Create pull request',
          if: "steps.branch.outputs.existing_pr != 'true' && steps.commit.outputs.changed == 'true'",
          env: {
            GH_TOKEN: '${{ github.token }}',
            BRANCH: '${{ steps.branch.outputs.name }}',
          },
          run_sha256: ASSET_INDEX_RUN_HASHES[11],
        },
        {
          name: 'Report existing pull request',
          if: "steps.branch.outputs.existing_pr == 'true'",
          env: { BRANCH: '${{ steps.branch.outputs.name }}' },
          run_sha256: ASSET_INDEX_RUN_HASHES[12],
        },
      ],
    },
  },
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseWorkflowYaml(text, label) {
  try {
    const value = yaml.load(text, {
      schema: yaml.CORE_SCHEMA,
      json: false,
    });
    if (!isPlainObject(value)) {
      return { value: null, failures: [`${label} must parse to a YAML mapping`] };
    }
    return { value, failures: [] };
  } catch (error) {
    return { value: null, failures: [`${label} YAML parse failed: ${error.message}`] };
  }
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function assetIndexSemanticFingerprint(parsed) {
  if (!isPlainObject(parsed)) return parsed;
  const copy = structuredClone(parsed);
  const steps = copy?.jobs?.['build-index']?.steps;
  if (Array.isArray(steps)) {
    copy.jobs['build-index'].steps = steps.map(step => {
      if (!isPlainObject(step)) return step;
      const normalized = { ...step };
      if (Object.hasOwn(normalized, 'run')) {
        normalized.run_sha256 = sha256(String(normalized.run));
        delete normalized.run;
      }
      return normalized;
    });
  }
  return copy;
}

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

export function validateWorkflow(text) {
  const parsed = parseWorkflowYaml(text, 'm55-git-first-preflight workflow');
  if (parsed.failures.length) return parsed.failures;

  if (!isDeepStrictEqual(parsed.value, EXPECTED_GIT_FIRST_WORKFLOW)) {
    return [
      'm55-git-first-preflight workflow must match the canonical parsed-YAML allowlist exactly; conditional, non-blocking, custom-shell, default-shell, trigger-narrowing, step-reordering, command-wrapping, or extra semantics are prohibited',
    ];
  }
  return [];
}

export function validateAssetIndexTrustedExecutionOrder(parsed) {
  const failures = [];
  const steps = parsed?.jobs?.['build-index']?.steps;
  if (!Array.isArray(steps)) {
    failures.push('m55-asset-index workflow missing build-index steps');
    return failures;
  }

  const buildIndex = steps.findIndex(step => step?.name === ASSET_INDEX_TRUSTED_BUILD_STEP);
  const outputBranchIndex = steps.findIndex(step => step?.name === ASSET_INDEX_OUTPUT_BRANCH_STEP);
  if (buildIndex < 0) {
    failures.push(`m55-asset-index workflow missing ${ASSET_INDEX_TRUSTED_BUILD_STEP} step`);
  }
  if (outputBranchIndex < 0) {
    failures.push(`m55-asset-index workflow missing ${ASSET_INDEX_OUTPUT_BRANCH_STEP} step`);
  }
  if (buildIndex >= 0 && outputBranchIndex >= 0 && buildIndex >= outputBranchIndex) {
    failures.push(
      `m55-asset-index workflow must execute ${ASSET_INDEX_TRUSTED_BUILD_STEP} before ${ASSET_INDEX_OUTPUT_BRANCH_STEP}`,
    );
  }

  if (outputBranchIndex >= 0) {
    for (const step of steps.slice(outputBranchIndex + 1)) {
      if (!step || typeof step.run !== 'string') continue;
      if (REPO_SCRIPT_RUN_PATTERN.test(step.run)) {
        failures.push(
          `m55-asset-index workflow must not execute repository scripts after ${ASSET_INDEX_OUTPUT_BRANCH_STEP}; found in step ${step.name ?? '(unnamed)'}`,
        );
      }
      if (ASSET_INDEX_FORBIDDEN_POST_SWITCH_OUTPUT_WRITE_PATTERN.test(step.run)) {
        failures.push(
          `m55-asset-index workflow must write trusted outputs via Git index only after ${ASSET_INDEX_OUTPUT_BRANCH_STEP}; found filesystem write in step ${step.name ?? '(unnamed)'}`,
        );
      }
    }
  }

  return failures;
}

export function validateAssetIndexWorkflow(text) {
  const parsed = parseWorkflowYaml(text, 'm55-asset-index workflow');
  if (parsed.failures.length) return parsed.failures;

  const trustedOrderFailures = validateAssetIndexTrustedExecutionOrder(parsed.value);
  if (trustedOrderFailures.length) return trustedOrderFailures;

  const fingerprint = assetIndexSemanticFingerprint(parsed.value);
  if (!isDeepStrictEqual(fingerprint, EXPECTED_ASSET_INDEX_SEMANTICS)) {
    return [
      'm55-asset-index workflow must match the canonical parsed-YAML allowlist exactly; branch-source overrides, shell/data-flow changes, failure suppression, direct-main/API mutations, step changes, or extra semantics are prohibited',
    ];
  }
  return [];
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
