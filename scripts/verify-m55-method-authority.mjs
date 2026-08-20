#!/usr/bin/env node
/**
 * Deterministic M55 method / authority verifier.
 * npm run verify:m55-method-authority
 *
 * Rejects authority M55 does not hold, internal vocabulary reaching a reader,
 * a second method route, missing placements, and missing CI wiring.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FAILURES = [];

const AUTHORITY = 'lib/m55/method/m55MethodAuthority.ts';
const AUTHORITY_TEST = 'lib/m55/method/m55MethodAuthority.test.ts';
const SSOT_DOC = 'docs/ssot/M55_METHOD_AND_AUTHORITY_SSOT_v1.md';
const COMPETITOR_DOC =
  'docs/research/M55_COMPETITOR_INFORMATION_ARCHITECTURE_EVIDENCE_v1.md';

const PUBLIC_NAME = 'M55 複合読み解きモデル';
const CANONICAL_ROUTE = '/how-m55-works';

// Ordered user-value first, then trust, then the supporting method detail.
const REQUIRED_SECTION_TITLES = [
  'M55で見えること',
  'なぜ生年月日と、今の回答の両方を見るのか',
  '無料で分かること',
  'プレミアムレポートで深くなること',
  '二人の関係で見ること',
  'M55が行わないこと',
  '保存とプライバシー',
  '入力として使うもの',
  '変わりにくい土台',
  '近い点とずれる点',
  '再現性と版管理',
];

const REQUIRED_INPUT_IDS = [
  'dob_base',
  'free_expression',
  'paid_depth',
  'align',
  'diverge',
  'intensity',
  'hesitation',
  'reactive_context',
  'reply_affinity',
];

const REQUIRED_PLACEMENTS = [
  { id: 'home', testId: 'm55-method-home', ownerFile: 'components/home/HomeMethodModel.tsx' },
  {
    id: 'core_free_result',
    testId: 'm55-method-core-free-result',
    ownerFile: 'components/core/CoreMethodCompact.tsx',
  },
  {
    id: 'dtr_lp',
    testId: 'm55-method-dtr-difference',
    ownerFile: 'components/dtr/DtrMethodDifference.tsx',
  },
  {
    id: 'purchased_report',
    testId: 'm55-method-purchased-report',
    ownerFile: 'components/dtr/DtrMethodReportNote.tsx',
  },
  {
    id: 'checkout_prep',
    testId: 'm55-method-checkout-trust-link',
    ownerFile: 'components/pages/M55MethodTrustLink.tsx',
  },
  {
    id: 'footer_nav',
    testId: 'm55-method-footer-link',
    ownerFile: 'app/_components/PublicFooter.tsx',
  },
];

const LEGACY_PUBLIC_METHOD_TERMS = ['M55複合暦解析', 'M55 複合暦解析', '複合暦解析'];
const ROUTE_CONSUMPTION = 'lib/m55/method/m55MethodRouteConsumption.ts';
const ROUTE_CONSUMPTION_TEST = 'lib/m55/method/m55MethodRouteConsumption.test.ts';
const METHOD_E2E = 'e2e/method-authority-placement.spec.ts';

/**
 * Phrases asserting authority M55 does not hold. Mirrors
 * M55_UNSUPPORTED_AUTHORITY_PHRASES; the authority module is the source and the
 * mirror is checked against it below.
 */
const UNSUPPORTED_PHRASES = [
  '科学的に証明',
  '科学的に実証',
  '科学的根拠',
  '心理診断',
  '心理検査',
  '性格診断',
  '医学的',
  '臨床的',
  '専門医',
  '医師監修',
  '専門家監修',
  '専門家が監修',
  '監修済み',
  '的中率',
  '適合率',
  '正確度',
  '精度は',
  '当たる占い',
  '占い師',
  'AIがあなたを理解',
  'AIが理解します',
  '未来を予測',
  '将来を予測',
  '相手の気持ちがわかる',
  '相手の本音がわかる',
  '万人が利用',
  '利用者数',
  '研究参加者',
  'scientifically validated',
  'clinically validated',
  'diagnostic accuracy',
  'predictive accuracy',
];

const UNSUPPORTED_PATTERNS = [
  /(的中|精度|正確|一致率)[^。]{0,8}\d+\s*[%％]/,
  /\d+\s*[%％][^。]{0,8}(的中|精度|正確)/,
  /\d[\d,]*\s*(人|名)[^。]{0,6}(利用|参加|検証|調査)/,
];

/** Internal vocabulary that must never reach a rendered surface. */
const INTERNAL_VOCABULARY = [
  'dob_base',
  'free_expression',
  'paid_depth',
  'reactive_context',
  'reply_affinity',
  'fp-v1',
  'dal-v1',
  'ptrm-v1',
  'chapterBias',
  'dobFp',
];

/** Rendered public surfaces scanned for claims and vocabulary leaks. */
const GOVERNED_PUBLIC_DIRS = [
  'components/method',
  'components/pages',
  'components/home',
  'components/core',
  'components/dtr',
  'components/share',
  'app/how-m55-works',
  'app/pricing',
  'app/_components',
];

const REPORT = {
  publicName: PUBLIC_NAME,
  ssotPath: SSOT_DOC,
  typedAuthorityPath: AUTHORITY,
  competitorEvidencePath: COMPETITOR_DOC,
  canonicalRoute: CANONICAL_ROUTE,
  methodInputs: 0,
  requiredSections: 0,
  placements: 0,
  routeConsumptionPlacements: 0,
  routeConsumptionNegativeFixtures: 0,
  unsupportedClaimCount: 0,
  internalVocabularyLeaks: 0,
  competingMethodRoutes: 0,
  legacyPublicMethodTermsOnCanonicalRoute: 0,
  ciWired: false,
  methodE2eWired: false,
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

function governedPublicFiles() {
  const files = [];
  for (const dir of GOVERNED_PUBLIC_DIRS) {
    files.push(
      ...walkFiles(dir, (p) => /\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p) && !/_draft|_tmp/.test(p)),
    );
  }
  return [...new Set(files)];
}

/** Japanese string literals and JSX text, i.e. what a reader can actually see. */
function renderedText(source) {
  const chunks = [];
  const literal = /'([^'\\\n]*)'|"([^"\\\n]*)"|`([^`\\]*)`/g;
  let m;
  while ((m = literal.exec(source))) {
    const value = m[1] ?? m[2] ?? m[3] ?? '';
    if (/[\u3040-\u30ff\u4e00-\u9faf]/.test(value)) chunks.push(value);
  }
  const jsxText = />([^<>{}]*[\u3040-\u30ff\u4e00-\u9faf][^<>{}]*)</g;
  while ((m = jsxText.exec(source))) chunks.push(m[1]);
  return chunks.join('\n');
}

function requireArtifacts() {
  for (const rel of [AUTHORITY, AUTHORITY_TEST, SSOT_DOC, COMPETITOR_DOC]) {
    if (!existsSync(join(ROOT, rel))) fail('artifact.missing', `required artifact absent: ${rel}`);
  }
}

function checkAuthorityModule() {
  if (!existsSync(join(ROOT, AUTHORITY))) return;
  const src = read(AUTHORITY);

  if (!src.includes(`'${PUBLIC_NAME}'`)) {
    fail('authority.name', `public name must be ${PUBLIC_NAME}`);
  }
  if (!src.includes(`M55_METHOD_CANONICAL_ROUTE = '${CANONICAL_ROUTE}'`)) {
    fail('authority.route', `canonical method route must be ${CANONICAL_ROUTE}`);
  }

  let inputs = 0;
  for (const id of REQUIRED_INPUT_IDS) {
    if (new RegExp(`id:\\s*'${id}'`).test(src)) inputs += 1;
    else fail('authority.input', `method input ${id} is not declared`);
  }
  REPORT.methodInputs = inputs;

  let sections = 0;
  for (const title of REQUIRED_SECTION_TITLES) {
    if (src.includes(title)) sections += 1;
    else fail('authority.section', `required section missing: ${title}`);
  }
  REPORT.requiredSections = sections;

  for (const level of ['M55_AUTHORITY_LEVEL_1', 'M55_AUTHORITY_LEVEL_2', 'M55_AUTHORITY_LEVEL_3']) {
    if (!src.includes(level)) fail('authority.levels', `${level} is not frozen in the authority`);
  }

  // The verifier's phrase list must not drift from the authority's list.
  for (const phrase of UNSUPPORTED_PHRASES) {
    if (!src.includes(phrase)) {
      fail('authority.phrase_drift', `authority does not list prohibited phrase: ${phrase}`);
    }
  }
}

function checkSsotDoc() {
  if (!existsSync(join(ROOT, SSOT_DOC))) return;
  const doc = read(SSOT_DOC);
  if (!doc.includes(AUTHORITY)) fail('ssot.link', 'SSOT must name the machine authority path');
  if (!doc.includes(COMPETITOR_DOC)) {
    fail('ssot.link', 'SSOT must name the competitor evidence document');
  }
  for (const level of ['LEVEL 1', 'LEVEL 2', 'LEVEL 3']) {
    if (!doc.includes(level)) fail('ssot.levels', `SSOT must freeze ${level}`);
  }
  for (const title of REQUIRED_SECTION_TITLES) {
    if (!doc.includes(title)) fail('ssot.sections', `SSOT missing required section: ${title}`);
  }
}

function checkCompetitorDoc() {
  if (!existsSync(join(ROOT, COMPETITOR_DOC))) return;
  const doc = read(COMPETITOR_DOC);
  if (!doc.includes('RESEARCH EVIDENCE ONLY')) {
    fail('competitor.status', 'competitor document must be marked research evidence only');
  }
  if (!doc.includes('OBSERVED FACT') || !doc.includes('M55 INFERENCE')) {
    fail('competitor.schema', 'competitor entries must separate OBSERVED FACT and M55 INFERENCE');
  }
  if (!doc.includes('Official source URL') || !doc.includes('Observation date')) {
    fail('competitor.schema', 'competitor entries must include official URL and observation date');
  }
  const entryBlocks = doc.split(/### E\d+/).slice(1);
  if (entryBlocks.length < 3) {
    fail('competitor.entries', 'competitor document must include multiple dated official-source entries');
  }
  for (const block of entryBlocks) {
    if (!/https?:\/\//.test(block)) {
      fail('competitor.entries', 'each competitor entry must include an official source URL');
    }
    if (!/20\d{2}-\d{2}-\d{2}/.test(block)) {
      fail('competitor.entries', 'each competitor entry must include an observation date');
    }
  }
  const claims = unsupportedClaims(doc);
  // The document names non-adoptions, so English level-3 terms may appear in the
  // non-adoption list. Japanese marketing forms may not.
  const japaneseClaims = claims.filter((c) => /[\u3040-\u30ff\u4e00-\u9faf]/.test(c));
  for (const claim of japaneseClaims) {
    fail('competitor.claim', `competitor evidence adopts a prohibited claim form: ${claim}`);
  }
}

function unsupportedClaims(text) {
  const hits = [];
  for (const phrase of UNSUPPORTED_PHRASES) if (text.includes(phrase)) hits.push(phrase);
  for (const pattern of UNSUPPORTED_PATTERNS) {
    const match = text.match(pattern);
    if (match) hits.push(match[0]);
  }
  return hits;
}

function checkGovernedPublicCopy() {
  let claimCount = 0;
  let leakCount = 0;
  for (const rel of governedPublicFiles()) {
    const visible = renderedText(read(rel));
    for (const claim of unsupportedClaims(visible)) {
      claimCount += 1;
      fail('claim.unsupported', `${rel} asserts unsupported authority: ${claim}`);
    }
    for (const word of INTERNAL_VOCABULARY) {
      if (visible.includes(word)) {
        leakCount += 1;
        fail('vocabulary.leak', `${rel} shows internal vocabulary to a reader: ${word}`);
      }
    }
  }
  REPORT.unsupportedClaimCount = claimCount;
  REPORT.internalVocabularyLeaks = leakCount;
}

function checkPlacements() {
  let count = 0;
  for (const placement of REQUIRED_PLACEMENTS) {
    if (!existsSync(join(ROOT, placement.ownerFile))) {
      fail('placement.missing', `${placement.id} owner file absent: ${placement.ownerFile}`);
      continue;
    }
    const src = read(placement.ownerFile);
    if (!src.includes(placement.testId)) {
      fail('placement.missing', `${placement.ownerFile} does not render ${placement.testId}`);
      continue;
    }
    count += 1;
  }
  REPORT.placements = count;

  const mounts = [
    ['components/home/HomePanel.tsx', 'HomeMethodModel'],
    ['components/core/CoreEssencePanel.tsx', 'CoreMethodCompact'],
    ['components/dtr/DtrPaidPurchasePrep.tsx', 'DtrMethodDifference'],
    ['components/dtr/DtrPaidPurchasePrep.tsx', 'M55MethodTrustLink'],
    ['components/dtr/DtrFullReader.tsx', 'DtrMethodReportNote'],
    ['app/how-m55-works/page.tsx', 'M55MethodSections'],
  ];
  for (const [file, component] of mounts) {
    if (!existsSync(join(ROOT, file))) {
      fail('placement.mount', `${file} not found`);
      continue;
    }
    if (!new RegExp(`<${component}\\b`).test(read(file))) {
      fail('placement.mount', `${file} does not mount ${component}`);
    }
  }

  const prep = read('components/dtr/DtrPaidPurchasePrep.tsx');
  if (!prep.includes('surface="checkout"')) {
    fail('placement.checkout', 'checkout preparation must mount M55MethodTrustLink surface=checkout');
  }
  const footer = read('app/_components/PublicFooter.tsx');
  if (!footer.includes('M55_METHOD_ROUTE_LINK_LABEL_JA')) {
    fail('placement.footer', 'footer label must consume M55_METHOD_ROUTE_LINK_LABEL_JA');
  }
}

function checkRouteConsumption() {
  for (const rel of [ROUTE_CONSUMPTION, ROUTE_CONSUMPTION_TEST]) {
    if (!existsSync(join(ROOT, rel))) {
      fail('route_consumption.missing', `required artifact absent: ${rel}`);
      return;
    }
  }
  const src = read(ROUTE_CONSUMPTION);
  const testSrc = read(ROUTE_CONSUMPTION_TEST);
  const requiredIds = [
    'home',
    'core_free_result',
    'dtr_lp',
    'purchased_report',
    'checkout_prep',
    'footer_nav',
  ];
  const block = src.match(
    /export const M55_METHOD_ROUTE_CONSUMPTION[\s\S]*?=\s*\[([\s\S]*?)\]\s*as const/,
  );
  if (!block) {
    fail('route_consumption.missing', 'M55_METHOD_ROUTE_CONSUMPTION array not found');
    return;
  }
  const declaredIds = [...block[1].matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);
  REPORT.routeConsumptionPlacements = declaredIds.length;
  if (declaredIds.join(',') !== requiredIds.join(',')) {
    fail(
      'route_consumption.count',
      `route-consumption authority must declare exactly these placements: ${requiredIds.join(', ')} (got: ${declaredIds.join(', ') || 'none'})`,
    );
  }
  if (declaredIds.includes('pricing')) {
    fail(
      'route_consumption.retired_pricing',
      'retired pricing must not remain a method placement',
    );
  }
  if (!declaredIds.includes('checkout_prep')) {
    fail('route_consumption.checkout', 'checkout_prep placement is required');
  }
  const fixtureIds = [
    'duplicate_placement',
    'unregistered_placement',
    'wrong_route',
    'wrong_runtime_state',
    'wrong_dom_order',
    'noncanonical_copy_owner',
    'missing_checkout_placement',
    'missing_purchased_report_placement',
    'wrong_link_target',
    'competing_canonical_method_name',
  ];
  let fixtures = 0;
  for (const id of fixtureIds) {
    if (src.includes(`'${id}'`) || src.includes(`"${id}"`)) fixtures += 1;
    else fail('route_consumption.fixture', `negative fixture missing: ${id}`);
  }
  REPORT.routeConsumptionNegativeFixtures = fixtures;
  if (!testSrc.includes('rejects') || !testSrc.includes('routeConsumptionNegativeFixtures')) {
    fail('route_consumption.test', 'route-consumption negative fixtures must be unit-tested');
  }
}

/**
 * Follow imported copy owners so a legacy term cannot hide behind
 * TOP_FREE_ENTRY_PUBLIC_COPY on the canonical method route.
 */
function checkCanonicalRouteSingleAuthority() {
  const pageRel = 'app/how-m55-works/page.tsx';
  if (!existsSync(join(ROOT, pageRel))) {
    fail('route.canonical', 'canonical method route page is missing');
    return;
  }
  const page = read(pageRel);
  if (!page.includes('M55MethodSections')) {
    fail('route.canonical', 'canonical route must mount M55MethodSections');
  }
  for (const term of [
    'CalendarLayersSection',
    'WhatYouCanDoSection',
    'IntroSection',
    'FrameworkSection',
    'TOP_FREE_ENTRY_PUBLIC_COPY',
  ]) {
    if (page.includes(term)) {
      fail('route.legacy', `canonical method route still mounts competing content via ${term}`);
    }
  }

  let legacyHits = 0;
  for (const term of LEGACY_PUBLIC_METHOD_TERMS) {
    if (page.includes(term)) {
      legacyHits += 1;
      fail('route.legacy_name', `canonical method route renders competing name: ${term}`);
    }
  }

  // Follow local imports from the page into rendered owners and reject legacy terms.
  const importRe = /from\s+['"](\.[^'"]+)['"]/g;
  let m;
  const visited = new Set([pageRel]);
  const queue = [];
  while ((m = importRe.exec(page))) queue.push(m[1]);
  while (queue.length) {
    const spec = queue.shift();
    const resolved = resolveRelative(pageRel, spec);
    if (!resolved || visited.has(resolved) || !existsSync(join(ROOT, resolved))) continue;
    visited.add(resolved);
    const src = read(resolved);
    for (const term of LEGACY_PUBLIC_METHOD_TERMS) {
      if (src.includes(term)) {
        legacyHits += 1;
        fail(
          'route.imported_legacy',
          `${resolved} (imported by canonical route) still contains ${term}`,
        );
      }
    }
  }
  REPORT.legacyPublicMethodTermsOnCanonicalRoute = legacyHits;
}

function resolveRelative(fromRel, spec) {
  const fromDir = fromRel.split('/').slice(0, -1).join('/');
  const parts = `${fromDir}/${spec}`.split('/');
  const out = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  let candidate = out.join('/');
  if (existsSync(join(ROOT, `${candidate}.tsx`))) return `${candidate}.tsx`;
  if (existsSync(join(ROOT, `${candidate}.ts`))) return `${candidate}.ts`;
  if (existsSync(join(ROOT, candidate, 'index.tsx'))) return `${candidate}/index.tsx`;
  return candidate;
}

/** A second detailed method page produces contradictory statements over time. */
function checkSingleCanonicalRoute() {
  const routeDirs = walkFiles('app', (p) => /\/page\.tsx$/.test(p)).map((p) =>
    p.replace(/^app\//, '/').replace(/\/page\.tsx$/, ''),
  );
  const competing = routeDirs.filter(
    (route) =>
      route !== CANONICAL_ROUTE &&
      /(how-|method|mechanism|shikumi|仕組み|read-model)/.test(route),
  );
  REPORT.competingMethodRoutes = competing.length;
  for (const route of competing) {
    fail('route.duplicate', `competing method route: ${route}`);
  }
  if (!existsSync(join(ROOT, 'app/how-m55-works/page.tsx'))) {
    fail('route.canonical', 'canonical method route page is missing');
  }
}

function checkCiWiring() {
  const rel = '.github/workflows/audit.yml';
  if (!existsSync(join(ROOT, rel))) {
    fail('ci.missing', `${rel} not found`);
    return;
  }
  const src = read(rel);
  REPORT.ciWired = src.includes('verify:m55-method-authority');
  if (!REPORT.ciWired) fail('ci.wiring', 'audit workflow must run verify:m55-method-authority');
  if (!src.includes('test:m55-method-authority')) {
    fail('ci.wiring', 'audit workflow must run the method authority negative fixtures');
  }
  REPORT.methodE2eWired =
    src.includes('method-authority-placement.spec.ts') ||
    src.includes('test:e2e:method-authority-placement');
  if (!REPORT.methodE2eWired) {
    fail('ci.e2e', 'audit workflow must run e2e/method-authority-placement.spec.ts');
  }
  if (!existsSync(join(ROOT, METHOD_E2E))) {
    fail('ci.e2e', `${METHOD_E2E} is missing`);
  } else {
    const e2e = read(METHOD_E2E);
    for (const needle of [
      'm55-method-checkout-trust-link',
      'm55-method-purchased-report',
      'M55複合暦解析',
    ]) {
      if (!e2e.includes(needle)) {
        fail('ci.e2e', `${METHOD_E2E} must cover runtime assertion for ${needle}`);
      }
    }
  }
}

function main() {
  console.log('M55 method / authority verifier');
  console.log(`root: ${ROOT}\n`);
  requireArtifacts();
  checkAuthorityModule();
  checkSsotDoc();
  checkCompetitorDoc();
  checkGovernedPublicCopy();
  checkPlacements();
  checkRouteConsumption();
  checkCanonicalRouteSingleAuthority();
  checkSingleCanonicalRoute();
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
