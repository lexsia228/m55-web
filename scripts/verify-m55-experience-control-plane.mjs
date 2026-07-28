#!/usr/bin/env node
/**
 * Deterministic M55 Experience Control Plane v2 enforcement gate.
 * No LLM, no source mutation, reproducible locally and in CI.
 *
 * npm run verify:m55-experience-control-plane
 */

import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const require = createRequire(join(ROOT, 'package.json'));
const ts = require('typescript');
const FAILURES = [];
const REPORT = {
  routes: 0,
  archetypes: 9,
  unmanagedLiteralsFound: 0,
  unmanagedLiteralsExcepted: 0,
  tokenViolationsFound: 0,
  tokenViolationsExcepted: 0,
  ownershipViolations: 0,
  ctaViolations: 0,
  editorialViolations: 0,
  traitParity: 0,
  productTruthOk: false,
  exceptions: 0,
};

function fail(rule, message, extra = {}) {
  FAILURES.push({ rule, message, ...extra });
}

function read(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return existsSync(join(ROOT, rel));
}

function walkFiles(dirRel, pred, out = []) {
  const abs = join(ROOT, dirRel);
  if (!existsSync(abs)) return out;
  for (const name of readdirSync(abs)) {
    if (name === 'node_modules' || name === '.git') continue;
    // Skip nested draft trees under components/home/{home,home_tmp}.
    if (dirRel === 'components/home' && (name === 'home' || name === 'home_tmp')) continue;
    const rel = join(dirRel, name).split(sep).join('/');
    const st = statSync(join(ROOT, rel));
    if (st.isDirectory()) walkFiles(rel, pred, out);
    else if (pred(rel)) out.push(rel);
  }
  return out;
}

function loadJson(rel) {
  return JSON.parse(read(rel));
}

function hasJapanese(s) {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(s);
}

function normalizeLiteral(s) {
  return s.replace(/\s+/g, ' ').trim();
}

function loadExceptions() {
  const rel = 'lib/m55/commercialUx/experience/editorialExceptions.json';
  const list = loadJson(rel);
  for (const ex of list) {
    for (const key of ['rule', 'path', 'reason', 'owner', 'reviewDate']) {
      if (!ex[key] || typeof ex[key] !== 'string') {
        fail('exceptions.schema', `${rel} entry missing ${key}`);
      }
    }
    if (ex.path.includes('*') || ex.path.includes('**')) {
      fail('exceptions.wildcard', `${rel} forbids wildcard path: ${ex.path}`);
    }
  }
  REPORT.exceptions = list.length;
  return list;
}

function exceptionCovers(exceptions, rule, fileRel) {
  return exceptions.some(
    (ex) => ex.rule === rule && (fileRel === ex.path || fileRel.startsWith(`${ex.path}/`) || fileRel.startsWith(ex.path)),
  );
}

/** Harvest Japanese string literals from authority owner files. */
function harvestAuthorityStrings() {
  const domains = [
    'lib/m55/commercialUx/terminology.ts',
    'lib/m55/commercialUx/experience/experienceCtaState.ts',
    'lib/m55/commercialUx/publicHeaderState.ts',
    'lib/m55/commercialUx/planComparison.ts',
    'lib/m55/commercialUx/traitIdentityCatalog.ts',
    'lib/m55/freeResult/guestFreeJourneyCopyV1.ts',
    'lib/m55/freeResult/privacySafeShareCardV1.ts',
    'lib/m55/topFreeEntryPublicCopy.ts',
    'lib/m55/homeProductStory.ts',
    'components/core/corePublicCopy.ts',
    'lib/m55/commercialUx/experience/pageContent/index.ts',
    'lib/m55/commercialUx/experience/pageContent/freeFunnelCopy.ts',
    'lib/m55/commercialUx/experience/pageContent/premiumFunnelCopy.ts',
    'lib/m55/commercialUx/experience/pageContent/productPricingCopy.ts',
    'lib/m55/commercialUx/experience/pageContent/publicNavCopy.ts',
    'lib/m55/publicStemDisplay.ts',
  ];
  // Auto-include *Copy*.ts authority modules
  walkFiles('lib/m55', (r) => /Copy|copy\.ts$|Catalog\.ts$|terminology\.ts$/.test(r), domains);
  walkFiles('components', (r) => /Copy\.ts$/.test(r), domains);
  const set = new Set();
  const re = /['"`]([^'"`\n]{2,240})['"`]/g;
  for (const rel of [...new Set(domains)]) {
    if (!exists(rel) || statSync(join(ROOT, rel)).isDirectory()) continue;
    const src = read(rel);
    let m;
    while ((m = re.exec(src))) {
      const lit = normalizeLiteral(m[1]);
      if (hasJapanese(lit) || /^¥[\d,]+$/.test(lit) || /^\d+円$/.test(lit)) set.add(lit);
    }
  }
  // Always allow canonical CTA / terminology exact values
  for (const lit of [
    '無料で見てみる',
    '無料で見る',
    '無料結果',
    '無料結果の続きを見る',
    '無料結果を開く',
    'プレミアムの6問へ進む',
    'プレミアムの続きを見る',
    'プランを選ぶ',
    '支払い内容を確認する',
    '支払い画面へ進む',
    'プレミアムレポートを開く',
    '無料結果に戻る',
    '自分も無料で見る',
    '結果を保存する',
    'この結果を共有する',
    '回答から見えた理由',
    'プレミアムレポート',
    '追加読み解き',
    'M55について',
    'メニュー',
    'ホームへ戻る',
    'ログイン',
    'アカウント',
    '料金とプラン',
    'ライトを選ぶ',
    'フルを選ぶ',
    '買い切り・自動更新なし',
  ]) {
    set.add(lit);
  }
  return set;
}

function checkConstitution() {
  const src = read('lib/m55/commercialUx/experience/experienceArchetypes.ts');
  const required = [
    'header',
    'footer',
    'background',
    'readingWidth',
    'typographyLead',
    'sectionRhythm',
    'imageRole',
    'stickyAllowed',
    'printMode',
    'cardProminenceDefault',
    'primaryCtaTone',
  ];
  for (const key of required) {
    if (!src.includes(`${key}:`)) fail('constitution.contract', `missing contract field ${key}`);
  }
  const arch = [
    'PUBLIC_POSTER',
    'PUBLIC_EDITORIAL',
    'GUIDED_FREE_FLOW',
    'EDITORIAL_FREE_RESULT',
    'SHARED_SOCIAL_ENTRY',
    'PREMIUM_GUIDED_FLOW',
    'PRODUCT_DECISION',
    'PURCHASE_CONFIRMATION',
    'DIGITAL_PUBLICATION',
  ];
  for (const a of arch) {
    if (!src.includes(`${a}:`)) fail('constitution.archetype', `missing archetype ${a}`);
  }
  for (const shell of [
    'app/_components/PublicShell.tsx',
    'components/shell/ShellLayout.tsx',
    'app/dtr/core/layout.tsx',
  ]) {
    const body = read(shell);
    if (!body.includes('data-m55-ecp') || !body.includes('data-m55-archetype')) {
      fail('constitution.shell', `${shell} missing ECP markers`);
    }
  }
}

function checkRouteRegistry(exceptions) {
  const regSrc = read('lib/m55/commercialUx/experience/experienceRouteRegistry.ts');
  const idMatches = [...regSrc.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);
  REPORT.routes = idMatches.length;
  if (idMatches.length < 40) {
    fail('registry.coverage', `expected >=40 registry entries, got ${idMatches.length}`);
  }
  const requiredIds = [
    'public.home',
    'public.how_m55_works',
    'public.ten_views',
    'public.pricing',
    'public.support',
    'public.legal.terms',
    'public.legal.privacy',
    'public.legal.tokushoho',
    'public.legal.refund',
    'public.sign_in',
    'free.core.empty',
    'free.core.questions',
    'free.core.result',
    'shared.entry',
    'shared.entry.invalid',
    'shared.og',
    'premium.lp.intro',
    'premium.lp.questions',
    'premium.lp.plans',
    'premium.lp.checkout',
    'purchased.reader',
  ];
  for (const id of requiredIds) {
    if (!idMatches.includes(id)) fail('registry.required', `missing registry id ${id}`);
  }

  const pages = walkFiles('app', (r) => r.endsWith('/page.tsx') || r.endsWith('page.tsx'));
  const patterns = [...regSrc.matchAll(/pattern:\s*'([^']+)'/g)].map((m) => m[1]);

  function pageCovered(pageRel) {
    // app/home/page.tsx -> /home
    const parts = pageRel.replace(/^app\//, '').replace(/\/page\.tsx$/, '').replace(/page\.tsx$/, '');
    if (!parts || parts === '') return patterns.includes('/');
    let route = `/${parts}`
      .replace(/\/\[\.\.\.[^\]]+\]/g, '')
      .replace(/\/\[[^\]]+\]/g, '/:param');
    // normalize dynamic
    route = route
      .replace('/:param', (m, offset, s) => {
        // map known dynamics
        if (s.includes('/r/')) return '/:token';
        if (s.includes('report')) return '/:reportId';
        if (s.includes('dev')) return '/:slug';
        return '/:param';
      });
    // Fix doubles
    const candidates = new Set([
      `/${parts}`,
      `/${parts.replace(/\/\[[^\]]+\]/g, '')}`,
      '/r/:token',
      '/synastry/report/:reportId',
      '/dev/:slug',
      '/sign-in',
      '/sign-up',
      '/prototype',
    ]);
    if (parts.startsWith('r/')) candidates.add('/r/:token');
    if (parts.startsWith('sign-in')) candidates.add('/sign-in');
    if (parts.startsWith('sign-up')) candidates.add('/sign-up');
    if (parts.startsWith('prototype')) candidates.add('/prototype');
    if (parts.startsWith('dev/')) candidates.add('/dev/:slug');
    if (parts.startsWith('synastry/report')) candidates.add('/synastry/report/:reportId');
    for (const c of candidates) {
      if (patterns.includes(c)) return true;
      // prefix match for nested
      if (patterns.some((p) => p === `/${parts}` || `/${parts}`.startsWith(`${p}/`))) return true;
    }
    // exact static
    const staticPath = `/${parts.replace(/\/\[[^\]]+\]/g, '').replace(/\/$/, '')}`;
    return patterns.includes(staticPath) || patterns.includes(`/${parts}`);
  }

  for (const page of pages) {
    if (page.includes('/api/')) continue;
    if (!pageCovered(page) && !exceptionCovers(exceptions, 'registry.unlisted', page)) {
      fail('registry.unlisted', `app page not covered by registry: ${page}`, { file: page });
    }
  }
}

/** Surfaces where unmanaged Japanese JSX literals are hard-gated this pass. */
const STRICT_COPY_FILES = new Set([
  'components/core/CoreLockedState.tsx',
  'components/core/CorePremiumStickyCta.tsx',
  'components/dtr/DtrNeedFreeResultGate.tsx',
  'components/dtr/DtrPaidPurchasePrep.tsx',
  'components/share/SharedEntryPanel.tsx',
  'components/shell/PublicHeader.tsx',
  'app/pricing/page.tsx',
  'app/r/[token]/page.tsx',
]);

function checkAstCopy(exceptions, allowed) {
  const roots = [
    'components/core',
    'components/dtr',
    'components/share',
    'components/shell',
    'components/experience',
    'components/profile',
    'app/pricing',
    'app/r',
    'app/core',
    'app/dtr',
    'app/home',
    'components/home',
  ];
  const files = [];
  for (const root of roots) {
    walkFiles(root, (r) => r.endsWith('.tsx'), files);
  }

  const forbiddenCta = [
    '6問に答えて4章を作る',
    '4章を作る',
    'レポートを生成する',
    'プラン選択へ進む',
    '無料結果を始める',
  ];
  const forbiddenEditorial = [
    'Entry Report',
    '無料解析',
    '診断結果',
    'AI往復券',
  ];

  const ignoredAttrs = new Set([
    'className',
    'class',
    'href',
    'src',
    'data-testid',
    'id',
    'type',
    'role',
    'name',
    'method',
    'target',
    'rel',
    'decoding',
    'loading',
    'aria-controls',
    'aria-labelledby',
    'aria-describedby',
    'htmlFor',
  ]);

  for (const file of files) {
    if (
      file.includes('.test.') ||
      file.includes('__tests__') ||
      file.includes('home_tmp') ||
      file.includes('components/home/home/')
    ) {
      continue;
    }
    const src = read(file);
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const strict = STRICT_COPY_FILES.has(file);

    function reportLiteral(lit, kind, node) {
      const text = normalizeLiteral(lit);
      if (!text || text.length < 2) return;
      const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
      const lineNo = line + 1;

      for (const phrase of forbiddenCta) {
        if (text.includes(phrase)) {
          REPORT.ctaViolations += 1;
          fail('cta.forbidden', `${file}:${lineNo} CTA/construction phrase "${phrase}"`, {
            file,
            line: lineNo,
            literal: text,
            rule: 'cta.forbidden',
            expected: 'experienceCtaState / terminology',
          });
        }
      }
      for (const phrase of forbiddenEditorial) {
        if (text.includes(phrase)) {
          REPORT.editorialViolations += 1;
          fail('editorial.forbidden', `${file}:${lineNo} forbidden term "${phrase}"`, {
            file,
            line: lineNo,
            literal: text,
            rule: 'editorial.forbidden',
          });
        }
      }

      if (!strict) return;
      if (!hasJapanese(text)) return;
      if (text.startsWith('/') || text.startsWith('m55') || text.startsWith('http')) return;
      if (allowed.has(text)) return;
      if (/^[0-9０-９¥円,.…・／/\-\s]+$/.test(text)) return;

      if (exceptionCovers(exceptions, 'copy.jsx_literal', file)) {
        REPORT.unmanagedLiteralsExcepted += 1;
        return;
      }
      REPORT.unmanagedLiteralsFound += 1;
      fail('copy.jsx_literal', `${file}:${lineNo} unmanaged user-visible literal`, {
        file,
        line: lineNo,
        literal: text.slice(0, 80),
        rule: 'copy.jsx_literal',
        expected: 'copy authority domain or editorialExceptions.json',
      });
    }

    function visit(node) {
      if (ts.isJsxText(node)) {
        const lit = node.getText(sf);
        if (lit.trim()) reportLiteral(lit, 'JsxText', node);
      }
      if (ts.isJsxAttribute(node) && node.initializer) {
        const name = node.name.getText(sf);
        if (name.startsWith('data-') || ignoredAttrs.has(name) || name.startsWith('aria-')) {
          if (name === 'aria-label' && ts.isStringLiteral(node.initializer)) {
            reportLiteral(node.initializer.text, 'aria-label', node);
          } else if (
            name === 'aria-label' &&
            ts.isJsxExpression(node.initializer) &&
            node.initializer.expression &&
            ts.isStringLiteral(node.initializer.expression)
          ) {
            reportLiteral(node.initializer.expression.text, 'aria-label', node);
          }
        } else if (ts.isStringLiteral(node.initializer)) {
          reportLiteral(node.initializer.text, 'attr', node);
        } else if (
          ts.isJsxExpression(node.initializer) &&
          node.initializer.expression &&
          ts.isStringLiteral(node.initializer.expression)
        ) {
          reportLiteral(node.initializer.expression.text, 'attrExpr', node);
        }
      }
      if (
        ts.isJsxExpression(node) &&
        node.expression &&
        ts.isStringLiteral(node.expression) &&
        node.parent &&
        (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))
      ) {
        reportLiteral(node.expression.text, 'jsxExpr', node);
      }
      ts.forEachChild(node, visit);
    }
    visit(sf);
  }
}

function checkTokens(exceptions) {
  const approvedHex = new Set([
    '#1a2a4a',
    '#6b5fa8',
    '#f9f7f4',
    '#ffffff',
    '#fff',
    '#3d3d3d',
    '#1a1a1a',
    '#fffaf1',
    '#fbfaf8',
    '#faf8f5',
    '#f7f4ef',
    '#efe8df',
    '#000',
    '#000000',
  ]);
  // Growth decision/share/shell surfaces only (not purchased reader legacy skins).
  const cssFiles = [];
  for (const root of [
    'components/share',
    'components/experience',
    'components/shell',
    'app/pricing',
    'components/dtr/DtrPaidDecisionUx.module.css',
    'components/dtr/DtrLpPremiumContinuity.module.css',
  ]) {
    if (root.endsWith('.css')) {
      if (exists(root)) cssFiles.push(root);
      continue;
    }
    walkFiles(root, (r) => r.endsWith('.module.css') || r.endsWith('.css'), cssFiles);
  }
  const hexRe = /#(?:[0-9a-fA-F]{3,8})\b/g;
  for (const file of cssFiles) {
    if (file.includes('experienceControlPlane.css') || file.includes('publicPrint.css')) continue;
    const src = read(file);
    let m;
    while ((m = hexRe.exec(src))) {
      const hex = m[0].toLowerCase();
      const normalized = hex.length === 4
        ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
        : hex;
      if (approvedHex.has(hex) || approvedHex.has(normalized)) continue;
      if (exceptionCovers(exceptions, 'token.css_literal', file)) {
        REPORT.tokenViolationsExcepted += 1;
        continue;
      }
      REPORT.tokenViolationsFound += 1;
      const line = src.slice(0, m.index).split('\n').length;
      fail('token.css_literal', `${file}:${line} unmanaged color ${m[0]}`, {
        file,
        line,
        literal: m[0],
        rule: 'token.css_literal',
        expected: 'EXPERIENCE_COLOR / --m55-* vars',
      });
    }
  }
}

function checkOwnership(exceptions) {
  const headerFiles = walkFiles('components', (r) => /PublicHeader[^/]*\.tsx$/.test(r));
  if (headerFiles.length > 2) {
    REPORT.ownershipViolations += 1;
    fail('ownership.header', `too many PublicHeader files: ${headerFiles.join(', ')}`);
  }
  const shellFiles = walkFiles('components', (r) => /Shell\.tsx$/.test(r) || /PublicShell/.test(r));
  // app/_components/PublicShell + ShellLayout only expected
  const rogue = shellFiles.filter(
    (f) => !f.endsWith('ShellLayout.tsx') && !f.includes('PublicShell') && !f.includes('experience'),
  );
  // ignore Legacy shells
  for (const f of rogue) {
    if (f.includes('legacy') || f.includes('src/')) continue;
  }

  const forbiddenCatalog = ['SAFE_STATEMENT_BY_LANE', 'TRAIT_FALLBACK_CATALOG', 'LOCAL_TRAIT_MAP'];
  const scanRoots = ['components/core', 'components/dtr', 'components/share', 'lib/m55/freeResult'];
  for (const root of scanRoots) {
    for (const file of walkFiles(root, (r) => r.endsWith('.ts') || r.endsWith('.tsx'))) {
      if (file.includes('traitIdentityCatalog')) continue;
      const src = read(file);
      for (const name of forbiddenCatalog) {
        if (src.includes(name)) {
          REPORT.ownershipViolations += 1;
          fail('ownership.trait_catalog', `${file} defines/uses forbidden second catalog ${name}`);
        }
      }
    }
  }

  // Plan arithmetic literals outside planComparison — Growth Self surfaces only.
  const priceFiles = [
    ...walkFiles('components/core', (r) => r.endsWith('.tsx')),
    ...walkFiles('components/dtr', (r) => r.endsWith('.tsx') && !r.includes('FullReader')),
    ...walkFiles('components/share', (r) => r.endsWith('.tsx')),
    ...walkFiles('app/pricing', (r) => r.endsWith('.tsx')),
    ...walkFiles('app/dtr', (r) => r.endsWith('.tsx')),
    'components/home/HomePanel.tsx',
  ].filter((f) => exists(f));
  for (const file of priceFiles) {
    const src = read(file);
    if (src.includes('PLAN_COMPARISON') || src.includes('planComparison') || src.includes('getCommercialProduct')) {
      continue;
    }
    for (const lit of ['¥1,000', '¥1,480', '1,600円', '¥600']) {
      if (src.includes(lit)) {
        REPORT.ownershipViolations += 1;
        fail('ownership.plan_arithmetic', `${file} restates Product Truth ${lit} without PLAN_COMPARISON`);
      }
    }
  }

  // Print frameworks on Growth surfaces
  const cssAll = [
    ...walkFiles('components/core', (r) => r.endsWith('.css')),
    ...walkFiles('components/dtr', (r) => r.endsWith('.css') && !r.includes('FullReader') && !r.includes('Shelf')),
    ...walkFiles('components/share', (r) => r.endsWith('.css')),
    ...walkFiles('components/shell', (r) => r.endsWith('.css')),
    ...walkFiles('components/common', (r) => r.endsWith('.css')),
    ...walkFiles('app/pricing', (r) => r.endsWith('.css')),
  ];
  const printAllow = new Set([
    'lib/m55/commercialUx/publicPrint.css',
    'lib/m55/commercialUx/experience/experienceControlPlane.css',
    'app/dtr/core/layout.module.css',
    'components/home/HomePrintSummary.module.css',
    'components/home/HomePanel.module.css',
    'components/common/ScrollToTopButton.module.css',
  ]);
  for (const file of cssAll) {
    if (printAllow.has(file)) continue;
    const src = read(file);
    if (/@media\s+print/.test(src)) {
      if (exceptionCovers(exceptions, 'ownership.print_css', file)) continue;
      REPORT.ownershipViolations += 1;
      fail('ownership.print_css', `${file} defines route-local @media print`);
    }
  }

  // Sticky sole owner — allow CoreExperience css for sticky bar styles
  const stickyOwners = walkFiles('components', (r) => r.endsWith('.tsx') && read(r).includes('m55-premium-sticky-cta'));
  const unexpected = stickyOwners.filter((f) => !f.endsWith('CorePremiumStickyCta.tsx'));
  for (const f of unexpected) {
    REPORT.ownershipViolations += 1;
    fail('ownership.sticky', `${f} hosts sticky CTA testid; owner is CorePremiumStickyCta`);
  }
}

function checkProductTruth() {
  const contract = read('lib/m55/contracts/m55CommercialFunnelContract.ts');
  const plan = read('lib/m55/commercialUx/planComparison.ts');
  const pricing = read('lib/m55/paidDtrProductCopy.ts');
  if (!/priceJpy:\s*1000/.test(contract)) fail('product_truth', 'contract missing Light ¥1,000');
  if (!/priceJpy:\s*1480/.test(contract)) fail('product_truth', 'contract missing Full ¥1,480');
  if (!/600/.test(pricing) && !/upgradePriceJpy/.test(plan)) {
    fail('product_truth', 'upgrade ¥600 not wired');
  }
  if (!/lightThenUpgradeTotalJpy/.test(plan)) fail('product_truth', 'later total path missing');
  if (!/additionalReadings:\s*1/.test(plan)) fail('product_truth', 'Light additional readings');
  if (!/additionalReadings:\s*5/.test(plan)) fail('product_truth', 'Full additional readings');
  if (!/自動更新なし/.test(plan)) fail('product_truth', 'no automatic renewal');
  if (!/getCommercialProduct\('selfPremiumLight'\)/.test(plan)) {
    fail('product_truth', 'planComparison must derive Light from machine contract');
  }
  if (!/getCommercialProduct\('selfPremiumFull'\)/.test(plan)) {
    fail('product_truth', 'planComparison must derive Full from machine contract');
  }
  REPORT.productTruthOk = FAILURES.filter((f) => f.rule === 'product_truth').length === 0;
}

function checkTraitParity() {
  const src = read('lib/m55/commercialUx/traitIdentityCatalog.ts');
  const fields = [
    'traitName',
    'identityLine',
    'tagline',
    'recognitionStatement',
    'evidenceTemplates',
    'sceneTemplates',
    'shareStatement',
    'sharedEntryStatement',
    'premiumContinuation',
    'image',
    'accent',
  ];
  for (const f of fields) {
    if (!src.includes(f)) fail('trait.parity', `trait catalog missing field ${f}`);
  }
  if (!src.includes('assertTraitIdentityCatalogComplete')) {
    fail('trait.parity', 'missing assertTraitIdentityCatalogComplete');
  }
  if (!src.includes('TRAIT_IDENTITY_CATALOG.length !== 10')) {
    fail('trait.parity', 'catalog must assert length === 10');
  }
  REPORT.traitParity = 10;

  const consumers = [
    'lib/m55/freeResult/privacySafeShareCardV1.ts',
    'components/dtr/DtrLpPremiumContinuityIntro.tsx',
    'app/r/[token]/opengraph-image.tsx',
  ];
  for (const c of consumers) {
    if (!exists(c)) continue;
    const body = read(c);
    if (!body.includes('resolveTraitIdentity') && !body.includes('TRAIT_IDENTITY') && !body.includes('traitIdentity')) {
      fail('trait.consumer', `${c} does not resolve from trait identity catalog`);
    }
  }
}

function checkCtaWiring() {
  const runtime = read('lib/m55/selfFunnel/selfFunnelRuntimeState.ts');
  if (!runtime.includes('resolveExperienceCtaLabel')) {
    fail('cta.wiring', 'resolveFreeCtaLabel must delegate to experience CTA resolver');
  }
  const cta = read('lib/m55/commercialUx/experience/experienceCtaState.ts');
  for (const state of [
    'FRESH',
    'FREE_IN_PROGRESS',
    'FREE_COMPLETE',
    'FREE_TO_PREMIUM',
    'PREMIUM_IN_PROGRESS',
    'PREMIUM_COMPLETE',
    'PLAN_SELECTED',
    'PAYMENT_READY',
    'PURCHASED',
    'RETURN_TO_FREE_RESULT',
    'SHARED_RECIPIENT',
  ]) {
    if (!cta.includes(`${state}:`) && !cta.includes(`'${state}'`)) {
      fail('cta.state', `missing CTA state ${state}`);
    }
  }
}

function checkEditorialObjective(exceptions) {
  const files = walkFiles('components/core', (r) => r.endsWith('.tsx'));
  files.push(...walkFiles('components/dtr', (r) => r.endsWith('.tsx')));
  for (const file of files) {
    const src = read(file);
    if (/！！！|？？？|\?\?\?|!!!/.test(src)) {
      if (!exceptionCovers(exceptions, 'editorial.punctuation', file)) {
        REPORT.editorialViolations += 1;
        fail('editorial.punctuation', `${file} excessive punctuation repetition`);
      }
    }
    if (/<br\s*\/>\s*<br\s*\/>/.test(src)) {
      fail('editorial.manual_break', `${file} forbidden double manual line-break pattern`);
    }
  }
}

function main() {
  console.log('M55 Experience Control Plane v2 enforcement');
  console.log(`root: ${ROOT}`);
  const exceptions = loadExceptions();
  const allowed = harvestAuthorityStrings();

  checkConstitution();
  checkRouteRegistry(exceptions);
  checkCtaWiring();
  checkAstCopy(exceptions, allowed);
  checkTokens(exceptions);
  checkOwnership(exceptions);
  checkProductTruth();
  checkTraitParity();
  checkEditorialObjective(exceptions);

  console.log('\n--- report ---');
  console.log(JSON.stringify(REPORT, null, 2));

  if (FAILURES.length) {
    console.error(`\nFAIL: ${FAILURES.length} violation(s)`);
    for (const f of FAILURES.slice(0, 80)) {
      console.error(`- [${f.rule}] ${f.message}`);
      if (f.literal) console.error(`    literal: ${f.literal}`);
      if (f.expected) console.error(`    expected: ${f.expected}`);
    }
    if (FAILURES.length > 80) console.error(`… ${FAILURES.length - 80} more`);
    process.exit(1);
  }
  console.log('\nPASS/FAIL: PASS');
  process.exit(0);
}

const invoked = process.argv[1] ? resolve(process.argv[1]) : '';
const self = fileURLToPath(import.meta.url);
if (invoked === self || /verify-m55-experience-control-plane\.mjs$/.test(invoked)) {
  main();
}

export { main, FAILURES, REPORT };
