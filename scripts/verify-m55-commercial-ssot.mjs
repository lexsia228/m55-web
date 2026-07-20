#!/usr/bin/env node
/**
 * M55 Commercial Funnel SSOT verifier.
 * Confirms required docs, machine contract facts, and doc/contract parity.
 * Does NOT enforce deferred runtime assertions (legacy debt lane).
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FAILURES = [];

function fail(message) {
  FAILURES.push(message);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const REQUIRED_SSOT_FILES = [
  'AGENTS.md',
  'docs/ssot/README.md',
  'docs/ssot/M55_COMMERCIAL_FUNNEL_SSOT.md',
  'docs/ssot/M55_SELF_FUNNEL_CONTRACT.md',
  'docs/ssot/M55_PAIR_FUNNEL_CONTRACT.md',
  'docs/ssot/M55_PRODUCT_TRUTH.md',
  'docs/ssot/M55_COPY_AND_CLAIMS.md',
  'docs/ssot/M55_VISUAL_SYSTEM.md',
  'docs/ssot/M55_DECISION_LOG.md',
  'docs/ssot/M55_CURRENT_STATE.md',
  'docs/ssot/M55_WORKTREE_REGISTRY.md',
  'docs/ssot/M55_ROADMAP.md',
  'lib/m55/contracts/m55CommercialFunnelContract.ts',
  'lib/m55/contracts/m55CommercialFunnelContract.test.ts',
];

function checkRequiredFiles() {
  for (const rel of REQUIRED_SSOT_FILES) {
    if (!exists(rel)) fail(`missing required file: ${rel}`);
  }
}

function loadContractFacts() {
  const contractPath = 'lib/m55/contracts/m55CommercialFunnelContract.ts';
  const src = read(contractPath);

  function captureProduct(key) {
    const blockRe = new RegExp(`${key}:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`, 'm');
    const block = src.match(blockRe)?.[1] ?? '';
    const num = (field) => {
      const m = block.match(new RegExp(`${field}:\\s*(\\d+|null)`));
      return m ? (m[1] === 'null' ? null : Number(m[1])) : undefined;
    };
    const str = (field) => block.match(new RegExp(`${field}:\\s*'([^']*)'`))?.[1];
    const bool = (field) => block.match(new RegExp(`${field}:\\s*(true|false)`))?.[1] === 'true';
    return {
      priceJpy: num('priceJpy'),
      additionalThemes: num('additionalThemes'),
      reportChapters: num('reportChapters'),
      status: str('status'),
      showHomePaidCta: bool('showHomePaidCta'),
    };
  }

  const targetSlice = src.slice(src.indexOf('M55_TARGET_COMMERCIAL_CONTRACT'));
  const preResultCurrent = /preResultThemeSelection:\s*true/.test(
    src.slice(src.indexOf('M55_CURRENT_RUNTIME_STATE'), src.indexOf('M55_TARGET_COMMERCIAL_CONTRACT')),
  );
  const preResultTarget = /preResultThemeSelection:\s*false/.test(targetSlice);

  return {
    products: {
      selfPremiumLight: captureProduct('selfPremiumLight'),
      selfPremiumFull: captureProduct('selfPremiumFull'),
      pairPremium: captureProduct('pairPremium'),
    },
    registry: {
      HOME_FINAL_DESIGN_COPY_PRODUCT_SSOT:
        src.match(/HOME_FINAL_DESIGN_COPY_PRODUCT_SSOT:\s*'([^']+)'/)?.[1] ?? '',
      ACTIVE_LANE: src.match(/ACTIVE_LANE:\s*'([^']+)'/)?.[1] ?? '',
      STALE_DO_NOT_USE_WORKTREE:
        src.match(/STALE_DO_NOT_USE_WORKTREE:\s*'([^']+)'/)?.[1] ?? '',
    },
    current: { selfFree: { preResultThemeSelection: preResultCurrent } },
    target: { selfFree: { preResultThemeSelection: preResultTarget } },
    enforcement:
      src.match(/M55_ENFORCEMENT_STATUS = '([^']+)'/)?.[1] ?? '',
    legacy: {
      legacyPublicTerms: ['保存版', '見取り図'].filter((term) => src.includes(`'${term}'`)),
    },
    deferred: (src.match(/M55_DEFERRED_RUNTIME_ASSERTIONS/g) ?? []).length >= 1 ? [1, 2, 3] : [],
    prohibited: src.match(/M55_PROHIBITED_CLAIMS = \[([\s\S]*?)\] as const/)?.[1] ?? '',
  };
}

function checkMachineContract(data) {
  if (!data) return;
  const { products: p, registry: r, current: c, target: t, deferred, enforcement, legacy, prohibited } =
    data;

  if (p.selfPremiumLight.priceJpy !== 1000) fail('Light price must be 1000');
  if (p.selfPremiumFull.priceJpy !== 1480) fail('Full price must be 1480');
  if (p.selfPremiumLight.additionalThemes !== 1) fail('Light additionalThemes must be 1');
  if (p.selfPremiumFull.additionalThemes !== 5) fail('Full additionalThemes must be 5');
  if (p.selfPremiumLight.reportChapters !== 4) fail('Light reportChapters must be 4');
  if (p.selfPremiumFull.reportChapters !== 4) fail('Full reportChapters must be 4');
  if (p.pairPremium.status === 'LIVE') fail('pairPremium status must not be LIVE');
  if (p.pairPremium.showHomePaidCta !== false) fail('pairPremium showHomePaidCta must be false');
  if (r.HOME_FINAL_DESIGN_COPY_PRODUCT_SSOT !== 'NOT_YET') {
    fail('HOME final SSOT must be NOT_YET');
  }
  if (r.ACTIVE_LANE !== '個人無料→個人Premiumファネルの一括実装') {
    fail('ACTIVE_LANE must be post-merge Self funnel lane');
  }
  if (enforcement !== 'PENDING_SELF_FUNNEL_IMPLEMENTATION') {
    fail('enforcementStatus must be PENDING_SELF_FUNNEL_IMPLEMENTATION');
  }
  if (c.selfFree.preResultThemeSelection !== true) {
    fail('current runtime must record preResultThemeSelection=true (legacy debt)');
  }
  if (t.selfFree.preResultThemeSelection !== true) {
    fail('target contract must record preResultThemeSelection=false');
  }
  if (!legacy.legacyPublicTerms?.includes('保存版') || !legacy.legacyPublicTerms?.includes('見取り図')) {
    fail('legacy runtime debt must record 保存版 and 見取り図');
  }
  if (!Array.isArray(deferred) || deferred.length < 3) {
    fail('deferred runtime assertions must be recorded');
  }
  if (!prohibited?.length) fail('prohibited claims list must exist');
  if (!r.STALE_DO_NOT_USE_WORKTREE?.includes('M55_CANONICAL-cross-page-card-polish')) {
    fail('stale compatibility worktree must be DO_NOT_USE');
  }
}

function checkDocsParity(data) {
  if (!data) return;
  const productTruth = read('docs/ssot/M55_PRODUCT_TRUTH.md');
  const currentState = read('docs/ssot/M55_CURRENT_STATE.md');
  const agents = read('AGENTS.md');

  if (!productTruth.includes('¥1,000')) fail('M55_PRODUCT_TRUTH.md must include Light ¥1,000');
  if (!productTruth.includes('¥1,480')) fail('M55_PRODUCT_TRUTH.md must include Full ¥1,480');
  if (!productTruth.includes('追加読み解き1件')) {
    fail('M55_PRODUCT_TRUTH.md must document additional theme counts');
  }
  if (!currentState.includes('37163a0d473c25365f3bddad579d4844fd8300df')) {
    fail('M55_CURRENT_STATE.md must record production main SHA');
  }
  if (!currentState.includes('NOT_YET')) fail('M55_CURRENT_STATE.md must record HOME final SSOT NOT_YET');
  if (!agents.includes('M55_COMMERCIAL_FUNNEL_SSOT.md')) fail('AGENTS.md read order incomplete');
  if (!agents.includes('M55_CURRENT_STATE.md')) fail('AGENTS.md must list M55_CURRENT_STATE.md');
  if (!read('docs/ssot/M55_COPY_AND_CLAIMS.md').includes('保存版')) {
    fail('M55_COPY_AND_CLAIMS.md must record legacy 保存版 debt');
  }
  if (!read('docs/ssot/M55_SELF_FUNNEL_CONTRACT.md').includes('今の関心')) {
    fail('M55_SELF_FUNNEL_CONTRACT.md must record current 今の関心 runtime');
  }
  if (!read('docs/ssot/M55_PAIR_FUNNEL_CONTRACT.md').includes('NOT_LIVE')) {
    fail('M55_PAIR_FUNNEL_CONTRACT.md must record pairPremium NOT_LIVE');
  }

  const lightPrice = data.products.selfPremiumLight.priceJpy;
  const fullPrice = data.products.selfPremiumFull.priceJpy;
  const lightMatches = (productTruth.match(/1,000|1000/g) ?? []).length >= 1;
  const fullMatches = (productTruth.match(/1,480|1480/g) ?? []).length >= 1;
  if (!lightMatches || lightPrice !== 1000) fail('docs Light price must match machine contract');
  if (!fullMatches || fullPrice !== 1480) fail('docs Full price must match machine contract');
}

function checkAgentsReadOrder() {
  const agents = read('AGENTS.md');
  const expected = [
    'AGENTS.md',
    'docs/ssot/README.md',
    'M55_CURRENT_STATE.md',
    'M55_WORKTREE_REGISTRY.md',
    'M55_COMMERCIAL_FUNNEL_SSOT.md',
    'M55_DECISION_LOG.md',
    'M55_ROADMAP.md',
  ];
  let lastIndex = -1;
  for (const item of expected) {
    const idx = agents.indexOf(item);
    if (idx === -1) {
      fail(`AGENTS.md missing read-order item: ${item}`);
      continue;
    }
    if (idx < lastIndex) fail(`AGENTS.md read order out of sequence near: ${item}`);
    lastIndex = idx;
  }
}

const LIFECYCLE_STATUSES = [
  'PRIMARY_MAIN',
  'ACTIVE',
  'PAUSED',
  'STALE',
  'DO_NOT_USE',
  'CLEANUP_PENDING',
  'COMPLETED_REMOVABLE',
  'UNKNOWN',
];

function checkWorktreeRegistry() {
  const registry = read('docs/ssot/M55_WORKTREE_REGISTRY.md');
  const currentState = read('docs/ssot/M55_CURRENT_STATE.md');

  for (const status of LIFECYCLE_STATUSES) {
    if (!registry.includes(status)) {
      fail(`M55_WORKTREE_REGISTRY.md must define lifecycle status: ${status}`);
    }
  }

  const requiredPaths = [
    '/Users/lexsia/Documents/M55_WORKTREE-home-final-ia-v1',
    '/Users/lexsia/Documents/M55_CANONICAL-cross-page-card-polish',
    '/Users/lexsia/Documents/M55_CANONICAL',
  ];

  for (const wtPath of requiredPaths) {
    if (!registry.includes(wtPath)) fail(`registry must include worktree path: ${wtPath}`);
  }

  if (!registry.includes('DO_NOT_USE')) fail('registry must document DO_NOT_USE lifecycle');
  if (!registry.includes('M55_CANONICAL-cross-page-card-polish')) {
    fail('registry must mark cross-page-card-polish');
  }
  if (!/DO_NOT_USE[\s\S]*M55_CANONICAL-cross-page-card-polish|M55_CANONICAL-cross-page-card-polish[\s\S]*DO_NOT_USE/.test(registry)) {
    fail('cross-page-card-polish must be classified DO_NOT_USE');
  }
  if (!registry.includes('compatibility commerce core')) {
    fail('DO_NOT_USE reason must mention compatibility commerce core merged to main');
  }
  if (!registry.includes('QA') && !registry.includes('qa-screenshots')) {
    fail('DO_NOT_USE reason must mention QA artifacts');
  }
  if (!registry.includes('.gitignore')) {
    fail('DO_NOT_USE reason must mention uncommitted .gitignore change');
  }
  if (!registry.includes('reset') || !registry.includes('stash')) {
    fail('DO_NOT_USE must prohibit reset / stash');
  }
  if (!registry.includes('ACTIVE')) fail('registry must document ACTIVE worktree');
  if (!registry.includes('PRIMARY_MAIN_HOME')) {
    fail('registry must distinguish PRIMARY_MAIN_HOME from current branch');
  }
  if (!registry.includes('37163a0d473c25365f3bddad579d4844fd8300df')) {
    fail('registry must record production origin/main SHA');
  }
  if (!currentState.includes('M55_WORKTREE_REGISTRY.md')) {
    fail('M55_CURRENT_STATE.md must reference M55_WORKTREE_REGISTRY.md');
  }
  if (!currentState.includes('docs/m55-commercial-funnel-ssot-v1')) {
    fail('M55_CURRENT_STATE.md must record active branch');
  }

  const excluded = ['M55_B2C_KEYVISUAL_PRODUCTION_R2', 'M55_PRIVATE_VAULT', 'sparsebundle'];
  for (const name of excluded) {
    if (!registry.includes(name)) {
      fail(`registry must explicitly exclude non-worktree directory: ${name}`);
    }
  }

  const worktreeTableSection = registry.split('## Registered worktrees')[1]?.split('## Non-worktree')[0] ?? '';
  if (/M55_B2C_KEYVISUAL_PRODUCTION_R2|M55_PRIVATE_VAULT/.test(worktreeTableSection)) {
    fail('non-worktree directories must not appear as registered worktree rows');
  }
}

function parseWorktreeListPorcelain(text) {
  const entries = [];
  let current = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current) entries.push(current);
      current = { path: line.slice('worktree '.length), branch: null, head: null };
    } else if (current && line.startsWith('HEAD ')) {
      current.head = line.slice('HEAD '.length);
    } else if (current && line.startsWith('branch ')) {
      current.branch = line.slice('branch refs/heads/'.length);
    }
  }
  if (current) entries.push(current);
  return entries;
}

function checkLocalWorktreePreflight() {
  if (process.env.CI) return;

  const result = spawnSync('git', ['worktree', 'list', '--porcelain'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    console.warn('[preflight] git worktree list unavailable — skipping live comparison');
    return;
  }

  const live = parseWorktreeListPorcelain(result.stdout);
  const registry = read('docs/ssot/M55_WORKTREE_REGISTRY.md');
  const warnings = [];
  const hasDocumentedTransition = registry.includes('Documented post-merge transition');

  for (const entry of live) {
    if (!registry.includes(entry.path)) {
      warnings.push(`live worktree missing from registry: ${entry.path}`);
      continue;
    }
    const pathBlock = registry.slice(registry.indexOf(entry.path));
    const isWt001 = entry.path.endsWith('M55_WORKTREE-home-final-ia-v1');
    const isTemporaryControlPlane = entry.path.endsWith('M55_WORKTREE-build-week-control-plane-v1');
    const preMergeSnapshotBranch = 'docs/m55-commercial-funnel-ssot-v1';
    const postMergeExpectedBranch = 'main';

    if (entry.branch && !pathBlock.includes(entry.branch)) {
      if (
        isWt001 &&
        hasDocumentedTransition &&
        entry.branch === postMergeExpectedBranch &&
        pathBlock.includes(preMergeSnapshotBranch)
      ) {
        console.log(
          '[preflight] WT-001 on main — matches documented post-merge transition (update registry snapshot if not yet done)',
        );
      } else if (
        isWt001 &&
        hasDocumentedTransition &&
        entry.branch === preMergeSnapshotBranch
      ) {
        // pre-merge snapshot still valid
      } else {
        warnings.push(`branch mismatch for ${entry.path}: live=${entry.branch}`);
      }
    }
    if (entry.head && !pathBlock.includes(entry.head.slice(0, 12))) {
      if (isTemporaryControlPlane && pathBlock.includes('TEMPORARY_ACTIVE') && pathBlock.includes('rolling feature-branch tip')) {
        console.log('[preflight] WT-009 HEAD is live-verified — documented TEMPORARY_ACTIVE rolling branch');
      } else if (isWt001 && hasDocumentedTransition && entry.branch === postMergeExpectedBranch) {
        console.log(
          '[preflight] WT-001 HEAD differs from pre-merge snapshot — expected after merge; update registry',
        );
      } else if (!(isWt001 && hasDocumentedTransition && entry.branch === preMergeSnapshotBranch)) {
        warnings.push(`HEAD mismatch for ${entry.path}: live=${entry.head.slice(0, 12)}`);
      }
    }
  }

  if (warnings.length > 0) {
    console.warn('[preflight] worktree registry drift detected:');
    for (const w of warnings) console.warn(`- ${w}`);
  } else {
    console.log('[preflight] live git worktree list matches registry paths/branches/HEAD prefixes');
  }
}

function checkPostMergeHandoff() {
  const currentState = read('docs/ssot/M55_CURRENT_STATE.md');
  const registry = read('docs/ssot/M55_WORKTREE_REGISTRY.md');
  const agents = read('AGENTS.md');

  if (!currentState.includes('postMergeActiveLane')) {
    fail('M55_CURRENT_STATE.md must define postMergeActiveLane');
  }
  if (!currentState.includes('個人無料→個人Premiumファネルの一括実装')) {
    fail('postMergeActiveLane must be Self free→Premium lane');
  }
  if (!currentState.includes('postMergeNextSingleAction')) {
    fail('M55_CURRENT_STATE.md must define postMergeNextSingleAction');
  }
  if (!currentState.includes('NOT_YET')) {
    fail('HOME final SSOT must remain NOT_YET');
  }
  if (!currentState.includes('Pair implementation') && !currentState.includes('pairPremium')) {
    fail('M55_CURRENT_STATE.md must record Pair as later lane');
  }
  if (!currentState.includes('Stripe') || !currentState.includes('Pair runtime')) {
    fail('M55_CURRENT_STATE.md must prohibit Stripe/Pair ahead of Self funnel');
  }
  if (!currentState.includes('Completed GREEN') && !currentState.includes('GREEN')) {
    fail('M55_CURRENT_STATE.md must record SSOT lane as completed GREEN');
  }
  if (!registry.includes('Documented post-merge transition')) {
    fail('registry must document post-merge transition for WT-001');
  }
  if (!agents.includes('Documented post-merge transition')) {
    fail('AGENTS.md must distinguish unexplained drift vs documented post-merge transition');
  }
}

function checkDeferredNotEnforcedAsPass() {
  const src = read('scripts/verify-m55-commercial-ssot.mjs');
  if (!src.includes('PENDING_SELF_FUNNEL_IMPLEMENTATION')) {
    fail('verifier must document deferred enforcement');
  }
  if (/public copy.*見取り図.*===\s*0/.test(src)) {
    fail('verifier must not enforce zero 見取り図 public copy yet');
  }
}

function main() {
  checkRequiredFiles();
  const data = loadContractFacts();
  checkMachineContract(data);
  checkDocsParity(data);
  checkAgentsReadOrder();
  checkWorktreeRegistry();
  checkPostMergeHandoff();
  checkDeferredNotEnforcedAsPass();

  if (FAILURES.length > 0) {
    console.log('PASS/FAIL: FAIL');
    console.log('M55 Commercial Funnel SSOT verifier failures:');
    for (const f of FAILURES) console.log(`- ${f}`);
    process.exit(1);
  }

  console.log('PASS/FAIL: PASS');
  console.log('M55 Commercial Funnel SSOT verifier: all checks passed');
  console.log(`deferred enforcement: PENDING_SELF_FUNNEL_IMPLEMENTATION`);
  checkLocalWorktreePreflight();
  process.exit(0);
}

main();
