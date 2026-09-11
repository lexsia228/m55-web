import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  validateManifest,
  validateCursorRule,
  validateWorkflow,
  validateAssetIndexWorkflow,
  validateAssetIndexTrustedExecutionOrder,
  classifyChangedPaths,
} from './m55-git-first-policy.mjs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');

const baseManifest = {
  universal: {
    gitFirstRequired: true,
    unknownScopeProfile: 'FULL_REPO_PREFLIGHT',
    requiredReads: [
      'docs/ssot/M55_GIT_FIRST_ENTRYPOINT.md',
      'docs/ssot/M55_GIT_PREFLIGHT_MANIFEST.json',
      'docs/ssot/M55_SCOPE_AWARE_REPO_PREFLIGHT_SSOT.md',
      'docs/ssot/M55_GIT_FIRST_HARDENING_SSOT.md',
      'docs/ssot/M55_GIT_FIRST_HOST_ENFORCEMENT_SSOT.md',
    ],
  },
  failClosedToken: 'GIT_PREFLIGHT_INCOMPLETE',
  profiles: {
    CONTINUATION_FAST_PATH: { requiresGitIdentity: true },
    PINNED_REVIEW_PREFLIGHT: { requiresGitIdentity: true, mutationAllowed: false },
    FULL_REPO_PREFLIGHT: {
      requiresGitIdentity: true,
      requiresFreshRemoteMain: true,
      requiresRelevantUnmergedAuthorityCheck: true,
    },
  },
  taskClasses: {
    UIUX_CONTINUATION: { defaultProfile: 'CONTINUATION_FAST_PATH', requiredAuthority: [] },
    PINNED_DIFF_REVIEW: { defaultProfile: 'PINNED_REVIEW_PREFLIGHT', mutationAllowed: false, requiredAuthority: [] },
    CREATOR_REVENUE_DESIGN: { defaultProfile: 'FULL_REPO_PREFLIGHT', requiredAuthority: [] },
    LEGAL_TAX_OPERATOR: { defaultProfile: 'FULL_REPO_PREFLIGHT', requiredAuthority: [] },
    STRIPE_PROVIDER_MONEY: { defaultProfile: 'FULL_REPO_PREFLIGHT', requiredAuthority: [] },
    DB_LEDGER_SECURITY: { defaultProfile: 'FULL_REPO_PREFLIGHT', requiredAuthority: [] },
    SSOT_GOVERNANCE: { defaultProfile: 'FULL_REPO_PREFLIGHT', requiredAuthority: [] },
    MERGE_SYNC_INTEGRATION: { defaultProfile: 'FULL_REPO_PREFLIGHT', requiredAuthority: [] },
  },
  mandatoryStages: [
    'IDENTIFY_TASK',
    'GIT_FIRST_BASELINE',
    'ROUTE_RELEVANT_AUTHORITY',
    'EXISTING_DECISION_CHECK',
    'PRE_MUTATION_RECHECK_IF_MUTATING',
    'PRE_GREEN_OR_INTEGRATION_RECHECK_WHEN_APPLICABLE',
  ],
  hardTriggerPaths: ['docs/ssot/**','app/api/stripe/**','supabase/**'],
  semanticOwnerPaths: ['lib/m55/contracts/**','app/**/checkout/**','app/**/webhook/**'],
  continuationHandoff: {
    enabled: true,
    requiredFields: ['lane','owner','workspaceOrRef','authorizedTask','candidateSha','mutablePaths','observedAt'],
    newChatMayUseFastWhenValid: true,
    missingOrStaleHandoffDefaultsFull: true,
  },
};

const exists = () => true;
const clone = value => JSON.parse(JSON.stringify(value));
const validWorkflow = fs.readFileSync('.github/workflows/m55-git-first-preflight.yml', 'utf8');
const validAssetIndexWorkflow = fs.readFileSync('.github/workflows/m55-asset-index.yml', 'utf8');

function replaceRequired(text, from, to) {
  assert.ok(text.includes(from), `fixture source not found: ${from}`);
  return text.replace(from, to);
}

function assertWorkflowRejected(label, mutate) {
  test(label, () => {
    const candidate = mutate(validWorkflow);
    assert.notDeepEqual(validateWorkflow(candidate), []);
  });
}

function assertAssetRejected(label, mutate) {
  test(label, () => {
    const candidate = mutate(validAssetIndexWorkflow);
    assert.notDeepEqual(validateAssetIndexWorkflow(candidate), []);
  });
}

test('baseline manifest passes', () => {
  assert.deepEqual(validateManifest(baseManifest,{fileExists:exists}), []);
});

test('dangerous task class cannot downgrade to FAST', () => {
  const m = clone(baseManifest);
  m.taskClasses.STRIPE_PROVIDER_MONEY.defaultProfile = 'CONTINUATION_FAST_PATH';
  assert.ok(validateManifest(m,{fileExists:exists}).some(x => x.includes('STRIPE_PROVIDER_MONEY')));
});

test('host and hardening universal reads cannot be removed', () => {
  for (const token of ['HARDENING', 'HOST_ENFORCEMENT']) {
    const m = clone(baseManifest);
    m.universal.requiredReads = m.universal.requiredReads.filter(x => !x.includes(token));
    assert.notDeepEqual(validateManifest(m,{fileExists:exists}), []);
  }
});

test('missing mandatory stage fails', () => {
  const m = clone(baseManifest);
  m.mandatoryStages = m.mandatoryStages.filter(x => x !== 'PRE_MUTATION_RECHECK_IF_MUTATING');
  assert.notDeepEqual(validateManifest(m,{fileExists:exists}), []);
});

test('missing local authority file fails', () => {
  const m = clone(baseManifest);
  m.taskClasses.DB_LEDGER_SECURITY.requiredAuthority = ['missing.md'];
  assert.notDeepEqual(validateManifest(m,{fileExists:()=>false}), []);
});

test('well-formed unmerged authority need not exist in current checkout', () => {
  const m = clone(baseManifest);
  m.taskClasses.LEGAL_TAX_OPERATOR.checkRelevantOpenPrOrStackedBranch = true;
  m.taskClasses.LEGAL_TAX_OPERATOR.requiredUnmergedAuthority = [{path:'docs/ssot/future.md',discoveryHint:'fresh open PR search'}];
  assert.deepEqual(validateManifest(m,{fileExists:()=>false}), []);
});

test('unmerged authority requires fresh-discovery contract', () => {
  const m = clone(baseManifest);
  m.taskClasses.LEGAL_TAX_OPERATOR.requiredUnmergedAuthority = [{path:'docs/ssot/future.md',discoveryHint:'fresh open PR search'}];
  assert.notDeepEqual(validateManifest(m,{fileExists:exists}), []);
});

test('PINNED mutation cannot be enabled', () => {
  const m = clone(baseManifest);
  m.profiles.PINNED_REVIEW_PREFLIGHT.mutationAllowed = true;
  assert.notDeepEqual(validateManifest(m,{fileExists:exists}), []);
});

test('continuation handoff must be complete', () => {
  const m = clone(baseManifest);
  m.continuationHandoff.requiredFields = ['lane'];
  assert.notDeepEqual(validateManifest(m,{fileExists:exists}), []);
});

test('Cursor alwaysApply false fails', () => {
  const text = '---\ndescription: x\nalwaysApply: false\n---\nGIT_PREFLIGHT_INCOMPLETE CONTINUATION_FAST_PATH FULL_REPO_PREFLIGHT';
  assert.notDeepEqual(validateCursorRule(text,'cursor'), []);
});

test('canonical Git-first workflow passes semantic allowlist', () => {
  assert.deepEqual(validateWorkflow(validWorkflow), []);
});

test('semantically equivalent quoted YAML remains accepted', () => {
  const candidate = replaceRequired(
    validWorkflow,
    'name: m55-git-first-preflight',
    '"name": "m55-git-first-preflight"',
  );
  assert.deepEqual(validateWorkflow(candidate), []);
});

assertWorkflowRejected('quoted job-level if is rejected', workflow =>
  replaceRequired(
    workflow,
    '    runs-on: ubuntu-latest\n',
    '    runs-on: ubuntu-latest\n    "if": false\n',
  ));

assertWorkflowRejected('quoted step-level if is rejected', workflow =>
  replaceRequired(
    workflow,
    '      - name: Verify M55 Git-first structural invariants\n',
    '      - name: Verify M55 Git-first structural invariants\n        "if": false\n',
  ));

assertWorkflowRejected('quoted continue-on-error is rejected', workflow =>
  replaceRequired(
    workflow,
    '      - name: Verify M55 Git-first structural invariants\n',
    '      - name: Verify M55 Git-first structural invariants\n        "continue-on-error": true\n',
  ));

assertWorkflowRejected('checkout quoted if is rejected', workflow =>
  replaceRequired(
    workflow,
    '      - uses: actions/checkout@v4\n',
    '      - uses: actions/checkout@v4\n        "if": false\n',
  ));

assertWorkflowRejected('job defaults custom shell is rejected', workflow =>
  replaceRequired(
    workflow,
    '    runs-on: ubuntu-latest\n',
    "    runs-on: ubuntu-latest\n    defaults:\n      run:\n        shell: 'bash {0} || true'\n",
  ));

assertWorkflowRejected('required step custom shell is rejected', workflow =>
  replaceRequired(
    workflow,
    '      - name: Verify M55 Git-first structural invariants\n        run: node scripts/verify-m55-git-first-structure.mjs\n',
    '      - name: Verify M55 Git-first structural invariants\n        shell: bash {0} || true\n        run: node scripts/verify-m55-git-first-structure.mjs\n',
  ));

assertWorkflowRejected('required command failure wrapper is rejected', workflow =>
  replaceRequired(
    workflow,
    '        run: node scripts/verify-m55-git-first-structure.mjs',
    '        run: node scripts/verify-m55-git-first-structure.mjs || true',
  ));

assertWorkflowRejected('pinned YAML parser bootstrap tampering is rejected', workflow =>
  replaceRequired(workflow, 'js-yaml@4.1.1', 'js-yaml@4.1.0'));

assertWorkflowRejected('NODE_PATH parser routing tampering is rejected', workflow =>
  replaceRequired(workflow, '/m55-yaml-parser/node_modules', '/other/node_modules'));

assertWorkflowRejected('workflow paths narrowing is rejected', workflow =>
  replaceRequired(workflow, '  pull_request:\n', '  pull_request:\n    paths:\n      - AGENTS.md\n'));

assertWorkflowRejected('workflow pull_request types narrowing is rejected', workflow =>
  replaceRequired(workflow, '  pull_request:\n', '  pull_request:\n    types: [opened]\n'));

assertWorkflowRejected('restrictive pull-request branch filter is rejected', workflow =>
  replaceRequired(workflow, '  pull_request:\n', '  pull_request:\n    branches:\n      - release/**\n'));

assertWorkflowRejected('required command removal is rejected', workflow =>
  replaceRequired(
    workflow,
    '      - name: Verify M55 Git-first structural invariants\n        run: node scripts/verify-m55-git-first-structure.mjs\n',
    '',
  ));

assertWorkflowRejected('duplicate YAML mapping key fails closed', workflow =>
  replaceRequired(
    workflow,
    'permissions:\n  contents: read\n',
    'permissions:\n  contents: read\npermissions:\n  contents: read\n',
  ));

test('canonical asset-index workflow passes semantic allowlist', () => {
  assert.deepEqual(validateAssetIndexWorkflow(validAssetIndexWorkflow), []);
});

assertAssetRejected('asset-index BRANCH env cannot be redirected to main', workflow =>
  replaceRequired(
    workflow,
    '          BRANCH: ${{ steps.branch.outputs.name }}',
    '          BRANCH: main',
  ));

assertAssetRejected('asset-index branch resolver cannot emit main', workflow =>
  replaceRequired(
    workflow,
    '            echo "name=automation/m55-asset-index-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}" >> "$GITHUB_OUTPUT"',
    '            echo "name=main" >> "$GITHUB_OUTPUT"',
  ));

assertAssetRejected('asset-index in-script BRANCH reassignment is rejected', workflow =>
  replaceRequired(
    workflow,
    '          git push --set-upstream origin "$BRANCH"',
    '          BRANCH=main\n          git push --set-upstream origin "$BRANCH"',
  ));

assertAssetRejected('asset-index swallowed push with || : is rejected', workflow =>
  replaceRequired(
    workflow,
    '          git push --set-upstream origin "$BRANCH"',
    '          git push --set-upstream origin "$BRANCH" || :',
  ));

assertAssetRejected('asset-index job defaults custom shell is rejected', workflow =>
  replaceRequired(
    workflow,
    '    runs-on: ubuntu-latest\n',
    "    runs-on: ubuntu-latest\n    defaults:\n      run:\n        shell: 'bash {0} || true'\n",
  ));

assertAssetRejected('asset-index step custom shell is rejected', workflow =>
  replaceRequired(
    workflow,
    '      - name: Commit index if changed\n',
    '      - name: Commit index if changed\n        shell: bash {0} || true\n',
  ));

assertAssetRejected('asset-index continue-on-error is rejected', workflow =>
  replaceRequired(
    workflow,
    '      - name: Commit index if changed\n',
    '      - name: Commit index if changed\n        continue-on-error: true\n',
  ));

assertAssetRejected('asset-index direct main push is rejected', workflow =>
  replaceRequired(
    workflow,
    '          git push --set-upstream origin "$BRANCH"',
    '          git push origin main',
  ));

assertAssetRejected('asset-index REST main-ref mutation is rejected by exact run contract', workflow =>
  replaceRequired(
    workflow,
    '      - name: Build asset index from trusted main\n        run: python scripts/m55/build_asset_index.py',
    '      - name: Build asset index from trusted main\n        run: gh api -X PATCH repos/x/y/git/refs/heads/main -f sha=deadbeef',
  ));

assertAssetRejected('asset-index GraphQL ref mutation is rejected by exact run contract', workflow =>
  replaceRequired(
    workflow,
    '      - name: Build asset index from trusted main\n        run: python scripts/m55/build_asset_index.py',
    "      - name: Build asset index from trusted main\n        run: gh api graphql -f query='mutation { updateRef(input: {}) { clientMutationId } }'",
  ));

test('asset-index trusted build precedes output-branch preparation', () => {
  const parsed = yaml.load(validAssetIndexWorkflow);
  const steps = parsed.jobs['build-index'].steps;
  const buildIndex = steps.findIndex(step => step.name === 'Build asset index from trusted main');
  const outputBranchIndex = steps.findIndex(step => step.name === 'Prepare automation branch');
  assert.ok(buildIndex >= 0);
  assert.ok(outputBranchIndex >= 0);
  assert.ok(buildIndex < outputBranchIndex);
  assert.deepEqual(validateAssetIndexTrustedExecutionOrder(parsed), []);
});

test('asset-index rejects repository scripts after output-branch preparation', () => {
  const parsed = yaml.load(validAssetIndexWorkflow);
  const outputBranchIndex = parsed.jobs['build-index'].steps.findIndex(
    step => step.name === 'Prepare automation branch',
  );
  for (const step of parsed.jobs['build-index'].steps.slice(outputBranchIndex + 1)) {
    if (typeof step.run === 'string') {
      assert.doesNotMatch(step.run, /\b(?:python|node|bash)\s+(?:[^\n|;&]*\/)?scripts\//);
    }
  }
});

test('asset-index rejects branch-first generator execution regression', () => {
  const vulnerable = replaceRequired(
    validAssetIndexWorkflow,
    `      - name: Assert trusted main checkout
        run: |
          git fetch origin main
          test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"

      - name: Build asset index from trusted main
        run: python scripts/m55/build_asset_index.py

      - name: Stage trusted index outputs
        run: |
          mkdir -p "$RUNNER_TEMP/m55-asset-index-output"
          cp docs/audit/M55_REPO_ASSET_INDEX.md docs/audit/M55_REPO_ASSET_INDEX.json \\
            "$RUNNER_TEMP/m55-asset-index-output/"
          git checkout -- docs/audit/M55_REPO_ASSET_INDEX.md docs/audit/M55_REPO_ASSET_INDEX.json

      - name: Prepare automation branch`,
    `      - name: Prepare automation branch`,
  );
  const withBranchControlledPython = replaceRequired(
    vulnerable,
    `      - name: Apply trusted index outputs
        run: |
          cp "$RUNNER_TEMP/m55-asset-index-output/M55_REPO_ASSET_INDEX.md" docs/audit/M55_REPO_ASSET_INDEX.md
          cp "$RUNNER_TEMP/m55-asset-index-output/M55_REPO_ASSET_INDEX.json" docs/audit/M55_REPO_ASSET_INDEX.json

`,
    `      - name: Build asset index
        run: python scripts/m55/build_asset_index.py

`,
  );
  assert.notDeepEqual(validateAssetIndexWorkflow(withBranchControlledPython), []);
});

test('known hard-trigger changed path requires FULL', () => {
  assert.equal(classifyChangedPaths(['app/api/stripe/route.ts'],baseManifest).requiresFull,true);
});

test('nested checkout path requires FULL', () => {
  assert.equal(classifyChangedPaths(['app/foo/checkout/action.ts'],baseManifest).requiresFull,true);
});

test('root checkout path requires FULL', () => {
  assert.equal(classifyChangedPaths(['app/checkout/page.ts'],baseManifest).requiresFull,true);
});

test('root webhook path requires FULL', () => {
  assert.equal(classifyChangedPaths(['app/webhook/route.ts'],baseManifest).requiresFull,true);
});

test('case-variant protected path requires FULL', () => {
  assert.equal(classifyChangedPaths(['app/Checkout/page.ts'],baseManifest).requiresFull,true);
});

test('ordinary UIUX css path does not machine-force FULL', () => {
  assert.equal(classifyChangedPaths(['components/home/Hero.module.css'],baseManifest).requiresFull,false);
});
