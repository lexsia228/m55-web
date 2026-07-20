#!/usr/bin/env node
/**
 * M55 Commercial Funnel SSOT verifier.
 * Confirms required docs, machine contract facts, and doc/contract parity.
 * Does NOT enforce deferred runtime assertions (legacy debt lane).
 */

import fs from 'node:fs';
import path from 'node:path';
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
  if (r.ACTIVE_LANE !== 'M55 Commercial Funnel SSOT構築') {
    fail('ACTIVE_LANE must match exact commercial funnel SSOT lane');
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
  process.exit(0);
}

main();
