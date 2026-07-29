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

const REQUIRED_SECTION_TITLES = [
  '一つの情報だけで決めない',
  '入力として使うもの',
  '変わりにくい土台',
  '今の回答に表れること',
  '近い点とずれる点',
  'Premiumで加わる深さ',
  '生活場面への整理',
  '再現性と版管理',
  '保存とプライバシー',
  'M55が行わないこと',
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
    id: 'pricing_checkout_prep',
    testId: 'm55-method-trust-link',
    ownerFile: 'components/pages/M55MethodTrustLink.tsx',
  },
  {
    id: 'footer_nav',
    testId: 'm55-method-footer-link',
    ownerFile: 'app/_components/PublicFooter.tsx',
  },
];

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
  unsupportedClaimCount: 0,
  internalVocabularyLeaks: 0,
  competingMethodRoutes: 0,
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
    ['components/dtr/DtrFullReader.tsx', 'DtrMethodReportNote'],
    ['app/pricing/page.tsx', 'M55MethodTrustLink'],
    ['app/how-m55-works/page.tsx', 'M55MethodSections'],
  ];
  for (const [file, component] of mounts) {
    if (!existsSync(join(ROOT, file))) {
      fail('placement.mount', `${file} not found`);
      continue;
    }
    if (!new RegExp(`<${component}\\s*/?>`).test(read(file))) {
      fail('placement.mount', `${file} does not mount ${component}`);
    }
  }
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
