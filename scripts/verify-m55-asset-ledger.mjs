#!/usr/bin/env node
/**
 * Deterministic M55 Asset-First Commercial SSOT verifier.
 * npm run verify:m55-asset-ledger
 */

import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const require = createRequire(join(ROOT, 'package.json'));
const ts = require('typescript');
const FAILURES = [];

const REPORT = {
  ledgerVersion: 'asset-ledger-v1',
  canonical: 0,
  derived: 0,
  legacy: 0,
  rejected: 0,
  routes: 0,
  routeConsumptionCoverage: 0,
  userFacingFourChapterBefore: null,
  userFacingFourChapterAfter: null,
  premiumQuestions: 6,
};

function fail(rule, message) {
  FAILURES.push({ rule, message });
}

function read(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function walkFiles(dirRel, pred, out = []) {
  const abs = join(ROOT, dirRel);
  if (!existsSync(abs)) return out;
  for (const name of readdirSync(abs)) {
    if (name === 'node_modules' || name === '.git') continue;
    const rel = join(dirRel, name).split(sep).join('/');
    const st = statSync(join(ROOT, rel));
    if (st.isDirectory()) walkFiles(rel, pred, out);
    else if (pred(rel)) out.push(rel);
  }
  return out;
}

const GOVERNED_USERFacing_GLOBS = [
  'components/core',
  'components/dtr',
  'components/home',
  'components/share',
  'components/shell',
  'components/checkout',
  'app/home',
  'app/pricing',
  'app/how-m55-works',
  'app/dtr/lp',
  'app/support',
  'app/r',
  'lib/m55/commercialUx',
  'lib/m55/topFreeEntryPublicCopy.ts',
  'lib/m55/m55LogicPublicCopy.ts',
];

const INTERNAL_FOUR_CHAPTER_ALLOWED = [
  'lib/m55/paidDtrProductCopy.ts',
  'lib/m55/contracts/m55CommercialFunnelContract.ts',
  'lib/m55/individualization',
  'lib/m55/consult',
  'lib/m55/dtrOpenAiHybridAiProvider.ts',
  'lib/m55/dtrProductLabels.ts',
  'components/dtr/DtrFullReader.tsx',
  'components/dtr/PremiumDrawerHub.tsx',
  'app/legal',
  'docs/',
];

function isInternalAllowed(rel) {
  return INTERNAL_FOUR_CHAPTER_ALLOWED.some(
    (p) => rel === p || rel.startsWith(p) || rel.includes(p.replace(/\/$/, '')),
  );
}

function countFourChapterInGoverned() {
  let count = 0;
  const hits = [];
  for (const base of GOVERNED_USERFacing_GLOBS) {
    const abs = join(ROOT, base);
    if (!existsSync(abs)) continue;
    const st = statSync(abs);
    const files = st.isDirectory()
      ? walkFiles(base, (r) => /\.(tsx?|css)$/.test(r))
      : [base];
    for (const rel of files) {
      if (isInternalAllowed(rel)) continue;
      if (rel.includes('.test.') || rel.includes('assetLedger')) continue;
      const src = read(rel);
      if (rel.includes('experienceCtaState.ts') && src.includes('M55_CTA_FORBIDDEN_PHRASES')) {
        continue;
      }
      const re = /4章|第[1-4]章|4章構成|4章で|4章を/g;
      let m;
      while ((m = re.exec(src)) !== null) {
        count += 1;
        hits.push(`${rel}:${m[0]}`);
      }
    }
  }
  return { count, hits };
}

function checkLedger() {
  const ledgerPath = 'lib/m55/commercialUx/assetLedger/assetLedger.ts';
  const src = read(ledgerPath);
  if (!src.includes('M55_ASSET_LEDGER_VERSION')) fail('ledger', 'missing version');
  const counts = {
    CANONICAL: (src.match(/\bcanonical\(/g) || []).length,
    DERIVED: (src.match(/\bderived\(/g) || []).length,
    LEGACY: (src.match(/\blegacy\(/g) || []).length,
    REJECTED: (src.match(/\brejected\(/g) || []).length,
  };
  REPORT.canonical = counts.CANONICAL;
  REPORT.derived = counts.DERIVED;
  REPORT.legacy = counts.LEGACY;
  REPORT.rejected = counts.REJECTED;

  const consumption = read('lib/m55/commercialUx/assetLedger/assetRouteConsumption.ts');
  const routeIds = [...consumption.matchAll(/'([a-z0-9_.]+)':\s*\[/g)].map((m) => m[1]);
  const registry = read('lib/m55/commercialUx/experience/experienceRouteRegistry.ts');
  const registryIds = [...registry.matchAll(/id: '([a-z0-9_.]+)'/g)].map((m) => m[1]);
  REPORT.routes = registryIds.length;
  let covered = 0;
  for (const id of registryIds) {
    if (consumption.includes(`'${id}':`)) covered += 1;
    else fail('route.consumption', `missing consumption for ${id}`);
  }
  REPORT.routeConsumptionCoverage = covered;

  for (const key of routeIds) {
    if (!registryIds.includes(key)) {
      fail('route.consumption', `orphan consumption key ${key}`);
    }
  }
}

function checkPremiumQuestions() {
  const copy = read('lib/m55/paidResult/questionnaireCopyV1.ts');
  const banned = ['読み返し方', '読み方の好み', '章ごとに選んで', '要点から入る', '流れで読む'];
  for (const phrase of banned) {
    if (copy.includes(phrase)) fail('premium.question', `obsolete question copy: ${phrase}`);
  }
  if (!copy.includes('paid.recovery_sequence')) fail('premium.question', 'missing recovery_sequence');
  if (!copy.includes('paid.restart_condition')) fail('premium.question', 'missing restart_condition');

  const contract = read('lib/m55/commercialUx/assetLedger/premiumQuestionContract.ts');
  if (!contract.includes('paid.recovery_sequence')) fail('premium.contract', 'Q5 contract missing');
  if (!contract.includes('paid.restart_condition')) fail('premium.contract', 'Q6 contract missing');
}

function checkFenceSingleAuthority() {
  const fence = read('lib/m55/commercialUx/assetLedger/commercialFence.ts');
  const bridge = read('components/core/corePublicCopy.ts');
  if (!bridge.includes('M55_COMMERCIAL_FENCE') && !bridge.includes('STATIC_FREE_TO_PAID_BRIDGE')) {
    fail('fence', 'bridge must derive from commercial fence authority');
  }
  if (fence.includes('4章')) fail('fence', 'fence must not use 4章');
}

function checkProductTruth() {
  const contract = read('lib/m55/contracts/m55CommercialFunnelContract.ts');
  const plan = read('lib/m55/commercialUx/planComparison.ts');
  if (!/priceJpy:\s*1000/.test(contract)) fail('product_truth', 'Light ¥1,000');
  if (!/priceJpy:\s*1480/.test(contract)) fail('product_truth', 'Full ¥1,480');
  if (!/upgradePriceJpy/.test(plan)) fail('product_truth', 'upgrade path');
  if (!/additionalReadings:\s*1/.test(plan)) fail('product_truth', 'Light readings');
  if (!/additionalReadings:\s*5/.test(plan)) fail('product_truth', 'Full readings');
}

function checkTraitShareCoverage() {
  const catalog = read('lib/m55/commercialUx/traitIdentityCatalog.ts');
  if (!catalog.includes('TRAIT_IDENTITY_CATALOG.length !== 10')) {
    fail('share', 'trait catalog must assert 10 traits');
  }
  for (const field of ['shareStatement', 'sharedEntryStatement', 'imagePath']) {
    if (!catalog.includes(field)) fail('share', `trait missing ${field}`);
  }
}

function checkUserFacingFourChapter() {
  const { count, hits } = countFourChapterInGoverned();
  REPORT.userFacingFourChapterAfter = count;
  if (count > 0) {
    for (const h of hits.slice(0, 20)) fail('terminology.four_chapter', `user-facing 4章: ${h}`);
  }
}

function checkLegacyNotInNewUi() {
  const qcopy = read('lib/m55/paidResult/questionnaireCopyV1.ts');
  if (qcopy.includes("'paid.report_usage'") || qcopy.includes("'paid.reading_style'")) {
    fail('legacy.ui', 'legacy question IDs in active questionnaire copy');
  }
}

function main() {
  console.log('M55 Asset-First Commercial SSOT verifier');
  console.log(`root: ${ROOT}\n`);
  checkLedger();
  checkPremiumQuestions();
  checkFenceSingleAuthority();
  checkProductTruth();
  checkTraitShareCoverage();
  checkLegacyNotInNewUi();
  checkUserFacingFourChapter();

  console.log('--- report ---');
  console.log(JSON.stringify(REPORT, null, 2));
  if (FAILURES.length) {
    console.log('\n--- failures ---');
    for (const f of FAILURES) console.log(`[${f.rule}] ${f.message}`);
    console.log(`\nPASS/FAIL: FAIL (${FAILURES.length})`);
    process.exit(1);
  }
  console.log('\nPASS/FAIL: PASS');
}

main();
