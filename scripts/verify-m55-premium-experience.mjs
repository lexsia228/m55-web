#!/usr/bin/env node
/**
 * Premium Experience SSOT verifier — AST mount checks, evidence manifest, four-chapter scan.
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
  registered: 0,
  imported: 0,
  mounted: 0,
  conditionallySelected: 0,
  fixtureReachable: 0,
  visualEvidenceRequired: 0,
  printEvidenceRequired: 0,
  userFacingFourChapterCount: 0,
  pngCount: 0,
  pdfCount: 0,
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

function loadMountContract() {
  const contractPath = 'lib/m55/commercialUx/premiumExperience/premiumExperienceMountContract.ts';
  const src = read(contractPath);
  const sf = ts.createSourceFile(contractPath, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const entries = [];
  function visit(node) {
    if (
      ts.isObjectLiteralExpression(node) &&
      node.properties.some(
        (p) => ts.isPropertyAssignment(p) && p.name.getText(sf) === 'id' && ts.isStringLiteral(p.initializer),
      )
    ) {
      const obj = {};
      for (const prop of node.properties) {
        if (!ts.isPropertyAssignment(prop)) continue;
        const key = prop.name.getText(sf);
        const init = prop.initializer;
        if (ts.isStringLiteral(init)) obj[key] = init.text;
        if (key === 'mount' && ts.isObjectLiteralExpression(init)) {
          obj.mount = {};
          for (const mp of init.properties) {
            if (!ts.isPropertyAssignment(mp)) continue;
            const mk = mp.name.getText(sf);
            if (ts.isStringLiteral(mp.initializer)) obj.mount[mk] = mp.initializer.text;
            if (mk === 'conditionallySelected' && mp.initializer.kind === ts.SyntaxKind.TrueKeyword) {
              obj.mount.conditionallySelected = true;
            }
          }
        }
      }
      if (obj.id && obj.ownerFile && obj.mount) entries.push(obj);
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return entries;
}

function jsxTagName(node) {
  const n = node.tagName;
  if (ts.isIdentifier(n)) return n.text;
  if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.name)) return n.name.text;
  return null;
}

function readJsxStringAttr(attrs, name, sf) {
  for (const prop of attrs.properties) {
    if (!ts.isJsxAttribute(prop)) continue;
    if (prop.name.getText(sf) !== name || !prop.initializer) continue;
    if (ts.isStringLiteral(prop.initializer)) return prop.initializer.text;
    if (
      ts.isJsxExpression(prop.initializer) &&
      prop.initializer.expression &&
      ts.isStringLiteral(prop.initializer.expression)
    ) {
      return prop.initializer.expression.text;
    }
  }
  return null;
}

function readJsxExprStringAttr(attrs, name, sf, constStrings) {
  for (const prop of attrs.properties) {
    if (!ts.isJsxAttribute(prop)) continue;
    if (prop.name.getText(sf) !== name || !prop.initializer) continue;
    if (ts.isStringLiteral(prop.initializer)) return prop.initializer.text;
    if (
      ts.isJsxExpression(prop.initializer) &&
      prop.initializer.expression &&
      ts.isStringLiteral(prop.initializer.expression)
    ) {
      return prop.initializer.expression.text;
    }
    if (
      ts.isJsxExpression(prop.initializer) &&
      prop.initializer.expression &&
      ts.isIdentifier(prop.initializer.expression)
    ) {
      const resolved = constStrings.get(prop.initializer.expression.text);
      if (resolved) return resolved;
    }
  }
  return null;
}

function collectConditionalConstStrings(sourceFile) {
  const map = new Map();
  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isConditionalExpression(node.initializer)
    ) {
      const whenTrue = node.initializer.whenTrue;
      const whenFalse = node.initializer.whenFalse;
      if (ts.isStringLiteral(whenTrue) && ts.isStringLiteral(whenFalse)) {
        map.set(node.name.text, [whenTrue.text, whenFalse.text]);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return map;
}

function inspectOwnerFile(relPath) {
  const src = read(relPath);
  const sf = ts.createSourceFile(relPath, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const importedSymbols = new Set();
  const premiumSurfaceMounts = [];
  const dataPremiumStates = [];
  const conditionalConstStrings = collectConditionalConstStrings(sf);

  function visit(node) {
    if (ts.isImportDeclaration(node) && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
      for (const el of node.importClause.namedBindings.elements) importedSymbols.add(el.name.text);
    }
    if (ts.isImportDeclaration(node) && node.importClause?.name) importedSymbols.add(node.importClause.name.text);
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = jsxTagName(node);
      if (tag === 'PremiumExperienceSurface' || tag === 'PremiumDecisionSurface') {
        const stateId = readJsxStringAttr(node.attributes, 'stateId', sf);
        if (stateId) premiumSurfaceMounts.push({ component: tag, stateId });
        if (!stateId) {
          for (const prop of node.attributes.properties) {
            if (!ts.isJsxAttribute(prop) || prop.name.getText(sf) !== 'stateId' || !prop.initializer) continue;
            if (
              ts.isJsxExpression(prop.initializer) &&
              prop.initializer.expression &&
              ts.isIdentifier(prop.initializer.expression)
            ) {
              const variants = conditionalConstStrings.get(prop.initializer.expression.text);
              if (variants) {
                for (const variant of variants) {
                  premiumSurfaceMounts.push({ component: tag, stateId: variant });
                }
              }
            }
          }
        }
      }
      const dataState = readJsxStringAttr(node.attributes, 'data-m55-premium-state', sf);
      if (dataState) dataPremiumStates.push({ value: dataState });
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return { importedSymbols, premiumSurfaceMounts, dataPremiumStates };
}

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
  'lib/m55/commercialUx/premiumExperience/premiumExperienceEvidenceManifest.ts',
];

const GOVERNED_USERFacing_GLOBS = [
  'components/core',
  'components/dtr',
  'components/home',
  'components/share',
  'components/shell',
  'components/checkout',
  'components/experience',
  'app/home',
  'app/pricing',
  'app/how-m55-works',
  'app/dtr/lp',
  'app/support',
  'app/r',
  'app/dev/premium-share-preview',
  'lib/m55/commercialUx',
  'lib/m55/topFreeEntryPublicCopy.ts',
  'lib/m55/m55LogicPublicCopy.ts',
];

const FOUR_CHAPTER_PATTERNS = [
  /4章/g,
  /４章/g,
  /4\s*章/g,
  /第[1-4]章/g,
  /4章構成/g,
  /4章で/g,
  /4章を/g,
  /章を作る/g,
  /章レポート/g,
];

function isInternalAllowed(rel) {
  return INTERNAL_FOUR_CHAPTER_ALLOWED.some(
    (p) => rel === p || rel.startsWith(p) || rel.includes(p.replace(/\/$/, '')),
  );
}

function scanFourChapter() {
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
      if (rel.includes('.test.') || rel.includes('premiumExperienceAst')) continue;
      const src = read(rel);
      if (rel.includes('experienceCtaState.ts') && src.includes('M55_CTA_FORBIDDEN_PHRASES')) {
        continue;
      }
      for (const re of FOUR_CHAPTER_PATTERNS) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(src)) !== null) {
          count += 1;
          hits.push(`${rel}:${m[0]}`);
        }
      }
    }
  }
  return { count, hits };
}

function loadEvidenceManifestCounts() {
  const rel = 'lib/m55/commercialUx/premiumExperience/premiumExperienceEvidenceManifest.ts';
  const src = read(rel);
  const pngMatch = src.match(/PREMIUM_EXPERIENCE_REQUIRED_PNG_COUNT\s*=\s*(\d+)/);
  const pdfMatch = src.match(/PREMIUM_EXPERIENCE_REQUIRED_PDF_COUNT\s*=\s*(\d+)/);
  return {
    expectedPng: pngMatch ? Number(pngMatch[1]) : 0,
    expectedPdf: pdfMatch ? Number(pdfMatch[1]) : 0,
  };
}

function verifyEvidenceManifest() {
  const evidenceDir = join(ROOT, 'e2e/screenshots/premium-experience-ssot');
  const manifestSrc = read('lib/m55/commercialUx/premiumExperience/premiumExperienceEvidenceManifest.ts');
  const fileNameMatches = [...manifestSrc.matchAll(/fileName:\s*'([^']+)'/g)].map((m) => m[1]);
  const expectedPng = fileNameMatches.filter((f) => f.endsWith('.png'));
  const expectedPdf = fileNameMatches.filter((f) => f.endsWith('.pdf'));

  REPORT.visualEvidenceRequired = expectedPng.length;
  REPORT.printEvidenceRequired = expectedPdf.length;

  const onDiskPng = walkFiles('e2e/screenshots/premium-experience-ssot', (r) => r.endsWith('.png'));
  const onDiskPdf = walkFiles('e2e/screenshots/premium-experience-ssot/pdf', (r) => r.endsWith('.pdf')).map(
    (r) => r.replace(/^e2e\/screenshots\/premium-experience-ssot\//, ''),
  );

  REPORT.pngCount = onDiskPng.length;
  REPORT.pdfCount = onDiskPdf.length;

  if (expectedPng.length !== 42) fail('evidence.manifest', `expected 42 PNG manifest entries, got ${expectedPng.length}`);
  if (expectedPdf.length !== 5) fail('evidence.manifest', `expected 5 PDF manifest entries, got ${expectedPdf.length}`);
  if (onDiskPng.length !== 42) fail('evidence.files', `expected 42 PNG files on disk, got ${onDiskPng.length}`);
  if (onDiskPdf.length !== 5) fail('evidence.files', `expected 5 PDF files on disk, got ${onDiskPdf.length}`);

  for (const file of expectedPng) {
    if (!existsSync(join(evidenceDir, file))) fail('evidence.missing', `missing PNG ${file}`);
    if (file.startsWith('purchased-report-body-')) {
      const size = statSync(join(evidenceDir, file)).size;
      if (size < 8000) fail('evidence.blank', `purchased body PNG too small (${size}b): ${file}`);
    }
  }
  for (const file of expectedPdf) {
    if (!existsSync(join(evidenceDir, file))) fail('evidence.missing', `missing PDF ${file}`);
    const size = statSync(join(evidenceDir, file)).size;
    if (size < 3000) fail('evidence.blank', `PDF too small (${size}b): ${file}`);
  }

  const expectedSet = new Set([...expectedPng, ...expectedPdf]);
  for (const rel of [...onDiskPng, ...onDiskPdf.map((f) => `pdf/${f.split('/').pop()}`)]) {
    const normalized = rel.replace(/^e2e\/screenshots\/premium-experience-ssot\//, '');
    if (!expectedSet.has(normalized) && !expectedSet.has(normalized.replace(/^pdf\//, 'pdf/'))) {
      const base = normalized.includes('/') ? normalized : normalized;
      if (!expectedPng.includes(base) && !expectedPdf.includes(base)) {
        fail('evidence.extra', `unexpected evidence file ${normalized}`);
      }
    }
  }
}

async function main() {
  const contract = loadMountContract();
  const registrySrc = read('lib/m55/commercialUx/premiumExperience/premiumExperienceStateRegistry.ts');
  const registryIds = [...registrySrc.matchAll(/id: '([^']+)'/g)].map((m) => m[1]);
  REPORT.registered = registryIds.length;

  for (const id of registryIds) {
    if (!contract.some((c) => c.id === id)) fail('mount.registry', `registry state ${id} missing mount contract`);
  }

  let mounted = 0;
  let fixtureReachable = 0;
  const inspectionCache = new Map();

  for (const entry of contract) {
    const inspection = inspectOwnerFile(entry.ownerFile);
    inspectionCache.set(entry.ownerFile, inspection);

    if (entry.mount.kind === 'premium_surface') {
      if (!inspection.importedSymbols.has(entry.mount.component)) {
        fail('mount.imported', `${entry.id} missing import ${entry.mount.component} in ${entry.ownerFile}`);
      } else {
        REPORT.imported += 1;
      }
      const hit = inspection.premiumSurfaceMounts.some(
        (m) => m.component === entry.mount.component && m.stateId === entry.mount.stateId,
      );
      if (!hit) {
        fail('mount.mounted', `${entry.id} JSX mount missing ${entry.mount.component} stateId=${entry.mount.stateId}`);
      } else {
        mounted += 1;
        REPORT.mounted += 1;
      if (entry.mount.conditionallySelected) REPORT.conditionallySelected += 1;
      }
    } else if (entry.mount.kind === 'data_premium_state') {
      const hit = inspection.dataPremiumStates.some((m) => m.value === entry.mount.value);
      if (!hit) {
        fail('mount.mounted', `${entry.id} missing data-m55-premium-state=${entry.mount.value}`);
      } else {
        mounted += 1;
        REPORT.mounted += 1;
      }
    }

    if (entry.fixtureRoute) {
      if (entry.fixtureModule && !existsSync(join(ROOT, entry.fixtureModule))) {
        fail('fixture.module', `${entry.id} fixture module missing ${entry.fixtureModule}`);
      } else {
        fixtureReachable += 1;
        REPORT.fixtureReachable += 1;
      }
    }
  }

  const freeSharePath = 'components/core/CoreFreeResultShareCTA.tsx';
  const freeInspection = inspectionCache.get(freeSharePath) ?? inspectOwnerFile(freeSharePath);
  if (
    freeInspection.importedSymbols.has('PremiumDecisionSurface') ||
    freeInspection.premiumSurfaceMounts.some((m) => m.component === 'PremiumDecisionSurface')
  ) {
    fail('share.isolation', 'Free share owner must not mount PremiumDecisionSurface');
  }

  const premiumSharePath = 'components/core/CorePremiumResultShareCTA.tsx';
  if (!existsSync(join(ROOT, premiumSharePath))) {
    fail('share.premium_owner', 'missing CorePremiumResultShareCTA.tsx');
  } else {
    const premiumInspection = inspectOwnerFile(premiumSharePath);
    const hit = premiumInspection.premiumSurfaceMounts.some(
      (m) => m.component === 'PremiumDecisionSurface' && m.stateId === 'premium.share.card',
    );
    if (!hit) fail('share.premium_owner', 'premium share owner missing PremiumDecisionSurface mount');
  }

  const prodCore = read('app/dtr/core/page.tsx');
  if (prodCore.includes('devPreviewFixtureReady')) {
    fail('fixture.isolation', 'Production /dtr/core must not pass devPreviewFixtureReady');
  }

  const ledger = read('lib/m55/commercialUx/assetLedger/assetRouteConsumption.ts');
  if (ledger.match(/'free\.core\.share':[^\n]*premium\.experience/)) {
    fail('share.consumption', 'free.core.share must not consume premium visual authority');
  }
  if (!ledger.includes("'dev.premium_share_preview'")) {
    fail('share.consumption', 'dev.premium_share_preview consumption missing');
  }

  const fourChapter = scanFourChapter();
  REPORT.userFacingFourChapterCount = fourChapter.count;
  for (const hit of fourChapter.hits.slice(0, 20)) {
    fail('copy.four_chapter', `user-facing four-chapter language: ${hit}`);
  }

  verifyEvidenceManifest();

  console.log('M55 Premium Experience SSOT verifier');
  console.log(`root: ${ROOT}`);
  console.log('\n--- report ---');
  console.log(JSON.stringify({ ...REPORT, failures: FAILURES.length }, null, 2));
  console.log(`\nPASS/FAIL: ${FAILURES.length === 0 ? 'PASS' : 'FAIL'}`);
  if (FAILURES.length) {
    for (const f of FAILURES) console.error(`[${f.rule}] ${f.message}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
