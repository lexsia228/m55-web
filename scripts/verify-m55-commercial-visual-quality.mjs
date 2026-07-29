#!/usr/bin/env node
/**
 * Deterministic commercial responsive quality verifier.
 * npm run verify:m55-commercial-visual-quality
 *
 * Static half of the gate: it proves the authority, the fixtures and the CI
 * wiring exist and stay honest. The measuring half lives in
 * e2e/commercial-visual-quality.spec.ts, which judges real pages through the
 * same pure checker these fixtures use.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FAILURES = [];

const CONTRACT = 'lib/m55/commercialUx/visualQuality/commercialVisualQualityContract.ts';
const CHECKS = 'lib/m55/commercialUx/visualQuality/commercialVisualQualityChecks.ts';
const FIXTURES = 'lib/m55/commercialUx/visualQuality/commercialVisualQualityFixtures.ts';
const UNIT_TEST = 'lib/m55/commercialUx/visualQuality/commercialVisualQuality.test.ts';
const FREE_ENTRY = 'lib/m55/commercialUx/visualQuality/freeEntryCtaAuthority.ts';
const SPEC = 'e2e/commercial-visual-quality.spec.ts';

const REQUIRED_VIEWPORTS = [320, 360, 390, 430, 768, 1024, 1280, 1440];

const REQUIRED_RULES = [
  'horizontal_overflow',
  'overflow_x_concealment',
  'missing_protected_target',
  'outside_viewport',
  'clipped_text',
  'overlay_covers_protected',
  'overlay_covers_overlay',
  'safe_area_missing',
  'contrast_below_minimum',
  'focus_indicator_missing',
  'interactive_target_too_small',
  'desktop_content_too_narrow',
  'mobile_group_not_co_visible',
];

const REQUIRED_FIXTURE_IDS = [
  'right_edge_heading_overflow',
  'bottom_clipped_content',
  'fixed_cta_covers_text',
  'low_contrast_premium_text',
  'narrow_desktop_content',
  'plan_comparison_below_oversized_card',
];

/** Surfaces whose CTA labels must all derive from the canonical Free entry term. */
const GOVERNED_UI_DIRS = ['components', 'app'];

const REPORT = {
  contractPath: CONTRACT,
  checksPath: CHECKS,
  fixturesPath: FIXTURES,
  specPath: SPEC,
  viewports: REQUIRED_VIEWPORTS,
  governedCases: 0,
  governedFindings: 0,
  enforcedRules: 0,
  brokenFixtures: 0,
  divergentFreeEntryLiterals: 0,
  ciWired: false,
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
    if (name === 'node_modules' || name === '.git' || name === '__preview__') continue;
    const rel = join(dirRel, name).split(sep).join('/');
    if (statSync(join(ROOT, rel)).isDirectory()) walkFiles(rel, pred, out);
    else if (pred(rel)) out.push(rel);
  }
  return out;
}

function requireFiles() {
  for (const rel of [CONTRACT, CHECKS, FIXTURES, UNIT_TEST, FREE_ENTRY, SPEC]) {
    if (!existsSync(join(ROOT, rel))) fail('authority.missing', `required file absent: ${rel}`);
  }
}

function checkContract() {
  if (!existsSync(join(ROOT, CONTRACT))) return;
  const src = read(CONTRACT);

  for (const width of REQUIRED_VIEWPORTS) {
    if (!new RegExp(`\\b${width}\\b`).test(src)) {
      fail('contract.viewport', `viewport ${width} is not governed`);
    }
  }

  const caseIds = [...src.matchAll(/caseId:\s*'([^']+)'/g)].map((m) => m[1]);
  REPORT.governedCases = new Set(caseIds).size;
  if (REPORT.governedCases < 6) {
    fail('contract.cases', `expected at least 6 governed cases, found ${REPORT.governedCases}`);
  }

  const findingIds = [...src.matchAll(/^\s{2}'(P[01]-\d+)':/gm)].map((m) => m[1]);
  REPORT.governedFindings = new Set(findingIds).size;
  if (REPORT.governedFindings < 10) {
    fail(
      'contract.findings',
      `expected the 10 reviewed P0/P1 findings, found ${REPORT.governedFindings}`,
    );
  }

  if (!src.includes('findingCoverageGaps')) {
    fail('contract.coverage', 'contract must expose findingCoverageGaps() so no finding is unowned');
  }
}

function checkRules() {
  if (!existsSync(join(ROOT, CHECKS))) return;
  const src = read(CHECKS);
  let enforced = 0;
  for (const rule of REQUIRED_RULES) {
    if (src.includes(`'${rule}'`)) enforced += 1;
    else fail('checks.rule', `rule ${rule} is not enforced`);
  }
  REPORT.enforcedRules = enforced;

  // The judgement must stay pure so fixtures and real pages share one code path.
  if (/\bdocument\.|\bwindow\.|getComputedStyle\(|querySelector/.test(src)) {
    fail('checks.purity', 'checker must not reach into browser globals');
  }
}

function checkFixtures() {
  if (!existsSync(join(ROOT, FIXTURES))) return;
  const src = read(FIXTURES);
  const ids = [...src.matchAll(/id:\s*'([a-z_]+)'/g)].map((m) => m[1]);
  REPORT.brokenFixtures = new Set(ids).size;
  for (const id of REQUIRED_FIXTURE_IDS) {
    if (!ids.includes(id)) fail('fixtures.missing', `no broken fixture proves rejection of ${id}`);
  }
  if (!existsSync(join(ROOT, UNIT_TEST))) return;
  const test = read(UNIT_TEST);
  if (!test.includes('brokenFixtures()') || !test.includes('checkMeasuredPage')) {
    fail('fixtures.unproven', 'unit test must run the broken fixtures through checkMeasuredPage');
  }
  if (!test.includes('healthyMobilePage') || !test.includes('healthyDesktopPage')) {
    fail('fixtures.unproven', 'unit test must also prove defect-free snapshots pass');
  }
}

function checkSpec() {
  if (!existsSync(join(ROOT, SPEC))) return;
  const src = read(SPEC);
  if (!src.includes('checkMeasuredPage')) {
    fail('spec.shared_judgement', 'spec must judge real pages with the shared pure checker');
  }
  if (!src.includes('COMMERCIAL_VIEWPORTS')) {
    fail('spec.viewports', 'spec must iterate the governed viewport list, not its own copy');
  }
  if (!/scrollState/.test(src)) {
    fail('spec.scroll_state', 'spec must measure both the landing and mid-scroll states');
  }
}

/**
 * A second Free entry label is exactly the defect P1-10 reported, so a divergent
 * literal in a governed surface fails even if it never reaches the canonical term.
 */
function checkFreeEntryLabelSingularity() {
  const canonical = '無料で見てみる';
  const divergent = /'無料で見る'|"無料で見る"|>\s*無料で見る\s*</;
  const hits = [];
  for (const dir of GOVERNED_UI_DIRS) {
    for (const rel of walkFiles(dir, (p) => /\.(tsx|ts)$/.test(p) && !/\.test\.tsx?$/.test(p))) {
      const src = read(rel);
      if (divergent.test(src)) hits.push(rel);
    }
  }
  REPORT.divergentFreeEntryLiterals = hits.length;
  for (const rel of hits) {
    fail('cta.free_entry', `${rel} hardcodes a Free entry label other than ${canonical}`);
  }
  if (existsSync(join(ROOT, 'lib/m55/commercialUx/terminology.ts'))) {
    const term = read('lib/m55/commercialUx/terminology.ts');
    if (!term.includes(`freeEntry: '${canonical}'`)) {
      fail('cta.free_entry', `terminology.freeEntry must be ${canonical}`);
    }
  }
}

/** P1-8: the primary Premium CTA must lead with the outcome, not the answering work. */
function checkPremiumCtaHierarchy() {
  const term = read('lib/m55/commercialUx/terminology.ts');
  const label = term.match(/premiumBridgeCta:\s*'([^']+)'/)?.[1] ?? '';
  if (!label) fail('cta.premium', 'premiumBridgeCta label not found');
  if (/\d+問/.test(label)) {
    fail('cta.premium', `primary Premium CTA "${label}" leads with the answering work`);
  }
  const bridge = read('components/core/corePublicCopy.ts');
  if (!bridge.includes('primaryCtaJa: M55_COMMERCIAL_TERMINOLOGY.premiumBridgeCta')) {
    fail('cta.premium', 'bridge primary CTA must derive from the canonical terminology');
  }
  if (!/effortJa:\s*'[^']*6問/.test(bridge)) {
    fail('cta.premium', 'the answering effort must stay disclosed in the supporting line');
  }
}

/** P1-7: both tiers must be comparable before a plan is selected. */
function checkPlanComparisonVisibility() {
  const model = read('lib/m55/commercialUx/planComparison.ts');
  if (!model.includes('compactDifference')) {
    fail('plans.compare', 'plan comparison model must expose a compact difference');
  }
  const ui = read('components/dtr/DtrPaidPurchasePrep.tsx');
  for (const testId of ['m55-plan-compare-light', 'm55-plan-compare-full']) {
    if (!ui.includes(testId)) fail('plans.compare', `plan selection must render ${testId}`);
  }
  const comparePos = ui.indexOf('m55-plan-compare');
  const stackPos = ui.indexOf('styles.planStack');
  if (comparePos < 0 || stackPos < 0 || comparePos > stackPos) {
    fail('plans.compare', 'the compact comparison must render before the plan cards');
  }
}

/** Page-wide clipping must not be introduced as a substitute for fixing layout. */
function checkNoGlobalOverflowBandAid() {
  for (const rel of ['app/globals.css', 'styles/globals.css']) {
    if (!existsSync(join(ROOT, rel))) continue;
    const src = read(rel);
    if (/(html|body)[^{}]*\{[^}]*overflow-x:\s*hidden/s.test(src)) {
      fail(
        'overflow.bandaid',
        `${rel} clips the page horizontally; fix the overflowing element instead`,
      );
    }
  }
}

function checkCiWiring() {
  const rel = '.github/workflows/audit.yml';
  if (!existsSync(join(ROOT, rel))) {
    fail('ci.missing', `${rel} not found`);
    return;
  }
  const src = read(rel);
  REPORT.ciWired = src.includes('verify:m55-commercial-visual-quality');
  if (!REPORT.ciWired) {
    fail('ci.wiring', 'audit workflow must run verify:m55-commercial-visual-quality');
  }
  if (!src.includes('test:m55-commercial-visual-quality')) {
    fail('ci.wiring', 'audit workflow must run the broken-fixture unit tests');
  }
  const e2eWired =
    src.includes('commercial-visual-quality.spec.ts') ||
    src.includes('test:e2e:commercial-visual-quality');
  if (!e2eWired) {
    fail(
      'ci.e2e',
      'audit workflow must run the real browser gate e2e/commercial-visual-quality.spec.ts',
    );
  }
  if (!src.includes('playwright install')) {
    fail('ci.e2e', 'audit workflow must install repository-locked Playwright browsers');
  }
}

function main() {
  console.log('M55 commercial responsive quality verifier');
  console.log(`root: ${ROOT}\n`);
  requireFiles();
  checkContract();
  checkRules();
  checkFixtures();
  checkSpec();
  checkFreeEntryLabelSingularity();
  checkPremiumCtaHierarchy();
  checkPlanComparisonVisibility();
  checkNoGlobalOverflowBandAid();
  checkCiWiring();

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
