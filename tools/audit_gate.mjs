#!/usr/bin/env node
/**
 * M55 Audit Gate (external-deps zero)
 *
 * Goal: turn audit into a button.
 *
 * Default: STRICT (fail-closed) => any finding exits with code 1.
 *
 * Checks:
 *  G1: Parse + ESM import/export consistency (named/default exports)
 *  G2: Fail-silent bans (empty catch, catch-return without systemHalt)
 *  G3: Persistence contract (key hotspots: TrustedStorage/LogVault are fail-closed)
 *  G4: No Math.random + time-bounded expiresAt required + now<expiresAt
 *  A11y: reduced-transparency fallback exists in SAME file using blur/backdrop
 *  Pack Safety (optional but enabled by default): Master MANIFEST includes ONLY audit inputs (5 zips) as authoritative.
 *  Master Tree Hash (optional): verify MASTER_TREE_HASH.txt if provided.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

// -----------------------
// CLI
// -----------------------

const argv = process.argv.slice(2);
const args = parseArgs(argv);

const STRICT = args.strict ?? true;
const ROOT = path.resolve(args.root ?? process.cwd());

if (args.writeMasterTreeHash) {
  if (!args.masterRoot) fatal('--write-master-tree-hash requires --master-root');
  const masterRootAbs = path.resolve(args.masterRoot);
  const outFile = args.masterTreeHashFile
    ? path.resolve(args.masterTreeHashFile)
    : path.join(masterRootAbs, '00_MANIFEST', 'MASTER_TREE_HASH.txt');
  const h = writeMasterTreeHash(masterRootAbs, outFile);
  info(`Wrote MASTER_TREE_HASH.txt (${h})`);
}

const legacyRoot = findLegacyRoot(ROOT);
if (!legacyRoot) {
  fatal(`Cannot locate public/legacy under root: ${ROOT}. Use --root to point at repo root (the folder that contains public/legacy).`);
}

const legacyJsDir = path.join(legacyRoot, 'js');
if (!fs.existsSync(legacyJsDir)) {
  fatal(`Missing legacy js dir: ${legacyJsDir}`);
}

const findings = [];
const addFinding = (kind, message, meta = {}, level = 'error') => {
  findings.push({ level, kind, message, ...meta });
};

// Fail-closed MUST apply to these critical pipelines (security, integrity, storage, purchases).
// For non-critical optional UX helpers (e.g. haptics, share, widget snapshot integration),
// the gate will emit WARN findings instead of ERROR findings.
const CRITICAL_BASENAMES = new Set([
  'system_halt.js',
  'binding_inventory.js',
  'integrity_guard.js',
  'phase3_wiring_async.js',
  'routes_manifest.js',
  'm55_purchase_cache.js',
  'm55_data_core.js',
]);

// -----------------------
// Helpers
// -----------------------

function parseArgs(list) {
  /**
   * Supported:
   *  --root <path>
   *  --strict / --no-strict
   *  --strict-warn              (treat warnings as errors)
   *  --pack-manifest <path>
   *  --audit-inputs <semicolon-separated zip names>
   *  --master-root <path>         (optional; for tree hash)
   *  --master-tree-hash-file <path> (default: <master-root>/00_MANIFEST/MASTER_TREE_HASH.txt)
   *  --write-master-tree-hash      (compute+write MASTER_TREE_HASH.txt before verifying)
   *  --no-pack-check
   *  --no-tree-hash
   */
  const out = {};
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a === '--root') out.root = list[++i];
    else if (a === '--strict') out.strict = true;
    else if (a === '--no-strict') out.strict = false;
    else if (a === '--strict-warn') out.strictWarn = true;
    else if (a === '--pack-manifest') out.packManifest = list[++i];
    else if (a === '--audit-inputs') out.auditInputs = list[++i];
    else if (a === '--master-root') out.masterRoot = list[++i];
    else if (a === '--master-tree-hash-file') out.masterTreeHashFile = list[++i];
    else if (a === '--write-master-tree-hash') out.writeMasterTreeHash = true;
    else if (a === '--no-pack-check') out.noPackCheck = true;
    else if (a === '--no-tree-hash') out.noTreeHash = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else {
      // ignore unknown to stay forwards-compatible
    }
  }
  return out;
}

function fatal(msg) {
  console.error(`\n[M55 AUDIT GATE] FAIL: ${msg}\n`);
  process.exit(1);
}

function info(msg) {
  console.log(`[M55 AUDIT GATE] ${msg}`);
}

function warn(msg) {
  console.warn(`[M55 AUDIT GATE] WARN: ${msg}`);
}

function findLegacyRoot(root) {
  const direct = path.join(root, 'public', 'legacy');
  if (fs.existsSync(direct) && fs.statSync(direct).isDirectory()) return direct;

  // Common extracted-zip layouts: search shallow for */public/legacy
  const maxDepth = 4;
  const found = findDirBySuffix(root, path.join('public', 'legacy'), maxDepth);
  return found;
}

function findDirBySuffix(root, suffix, maxDepth) {
  const normSuffix = path.normalize(suffix);
  function walk(dir, depth) {
    if (depth > maxDepth) return null;
    const candidate = path.join(dir, normSuffix);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) return candidate;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return null;
    }
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const name = ent.name;
      if (name === 'node_modules' || name.startsWith('.')) continue;
      const res = walk(path.join(dir, name), depth + 1);
      if (res) return res;
    }
    return null;
  }
  return walk(root, 0);
}

function listFilesRec(dir, exts) {
  const out = [];
  function walk(d) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const ent of entries) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === 'node_modules' || ent.name.startsWith('.')) continue;
        walk(p);
      } else {
        const ext = path.extname(ent.name).toLowerCase();
        if (!exts || exts.includes(ext)) out.push(p);
      }
    }
  }
  walk(dir);
  return out;
}

function readText(p) {
  return fs.readFileSync(p, 'utf8');
}

function sha256Hex(bufOrStr) {
  const h = crypto.createHash('sha256');
  h.update(bufOrStr);
  return h.digest('hex');
}

function normalizeSlashes(p) {
  return p.split(path.sep).join('/');
}

// -----------------------
// G1: Syntax + ESM export availability
// -----------------------

function checkSyntaxNode(files) {
  info(`G1a Syntax check (node --check) on ${files.length} files...`);
  for (const f of files) {
    try {
      execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
    } catch (e) {
      addFinding('G1', `Syntax error: ${normalizeSlashes(f)}`, { detail: String(e?.stderr || e?.message || e) });
    }
  }
}

function parseImports(source) {
  // Very small import parser (good enough for static sanity checks)
  // Handles:
  //  import x from './a.js'
  //  import { a, b as c } from './a.js'
  //  import x, { a } from './a.js'
  //  import * as ns from './a.js'
  const imports = [];
  const re = /import\s+([^;]+?)\s+from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(source))) {
    const clause = m[1].trim();
    const spec = m[2].trim();
    const entry = { spec, defaultImport: null, starImport: false, named: [] };

    if (clause.startsWith('*')) {
      entry.starImport = true;
      imports.push(entry);
      continue;
    }

    // Split default + named
    const parts = clause.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length >= 1 && !parts[0].startsWith('{')) {
      entry.defaultImport = parts[0];
    }
    const namedPart = parts.find(p => p.startsWith('{'));
    if (namedPart) {
      const inside = namedPart.replace(/^\{/, '').replace(/\}$/, '').trim();
      if (inside.length) {
        for (const seg of inside.split(',')) {
          const t = seg.trim();
          if (!t) continue;
          const [orig] = t.split(/\s+as\s+/i).map(x => x.trim());
          entry.named.push(orig);
        }
      }
    }

    imports.push(entry);
  }
  return imports;
}

function parseExports(source) {
  const exported = new Set();
  let hasDefault = false;

  // export function/const/class/let/var NAME
  const reDecl = /export\s+(?:async\s+)?(?:function|const|class|let|var)\s+([A-Za-z_$][\w$]*)/g;
  let m;
  while ((m = reDecl.exec(source))) exported.add(m[1]);

  // export { a, b as c }
  const reNamed = /export\s*\{([^}]+)\}/g;
  while ((m = reNamed.exec(source))) {
    const inside = m[1];
    for (const seg of inside.split(',')) {
      const t = seg.trim();
      if (!t) continue;
      const parts = t.split(/\s+as\s+/i).map(x => x.trim());
      const outName = parts.length === 2 ? parts[1] : parts[0];
      if (outName === 'default') {
        hasDefault = true;
      } else {
        exported.add(outName);
      }
    }
  }

  // export default ...
  if (/export\s+default\b/.test(source)) hasDefault = true;

  // re-export: export { x } from './y.js'
  const reRe = /export\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"]/g;
  while ((m = reRe.exec(source))) {
    const inside = m[1];
    for (const seg of inside.split(',')) {
      const t = seg.trim();
      if (!t) continue;
      const parts = t.split(/\s+as\s+/i).map(x => x.trim());
      const outName = parts.length === 2 ? parts[1] : parts[0];
      if (outName === 'default') hasDefault = true;
      else exported.add(outName);
    }
  }

  return { exported, hasDefault };
}

function resolveImport(fromFile, spec) {
  if (!spec.startsWith('./') && !spec.startsWith('../')) return null; // ignore bare imports

  const base = path.resolve(path.dirname(fromFile), spec);

  // If spec already has extension and exists
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;

  const tryExt = ['.js', '.mjs', '.cjs'];
  for (const ext of tryExt) {
    if (fs.existsSync(base + ext) && fs.statSync(base + ext).isFile()) return base + ext;
  }

  // directory import => index
  if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
    for (const ext of tryExt) {
      const idx = path.join(base, 'index' + ext);
      if (fs.existsSync(idx) && fs.statSync(idx).isFile()) return idx;
    }
  }

  return null;
}

function checkEsmImports(files) {
  info(`G1b ESM import/export consistency (static) ...`);

  // Cache export maps
  const exportCache = new Map();
  const getExports = (file) => {
    if (exportCache.has(file)) return exportCache.get(file);
    const src = readText(file);
    const ex = parseExports(src);
    exportCache.set(file, ex);
    return ex;
  };

  for (const f of files) {
    const src = readText(f);
    const imports = parseImports(src);
    for (const imp of imports) {
      const target = resolveImport(f, imp.spec);
      if (!target) {
        addFinding('G1', `Unresolved relative import: ${normalizeSlashes(f)} -> ${imp.spec}`);
        continue;
      }
      const ex = getExports(target);

      if (imp.defaultImport && !ex.hasDefault) {
        addFinding('G1', `Default import requires default export, but missing: ${normalizeSlashes(f)} imports default from ${normalizeSlashes(target)}`);
      }
      for (const name of imp.named) {
        if (!ex.exported.has(name)) {
          addFinding('G1', `Missing named export '${name}': ${normalizeSlashes(f)} -> ${normalizeSlashes(target)}`);
        }
      }
    }
  }

  // Hard requirements per SSOT: system_halt.js must export these
  const systemHaltFile = path.join(legacyJsDir, 'system_halt.js');
  if (fs.existsSync(systemHaltFile)) {
    const ex = parseExports(readText(systemHaltFile));
    for (const req of ['systemHalt', 'installGlobalErrorTrap']) {
      if (!ex.exported.has(req)) addFinding('G1', `system_halt.js missing required export '${req}' (SSOT requirement)`);
    }
  } else {
    addFinding('G1', `Missing system_halt.js at ${normalizeSlashes(systemHaltFile)}`);
  }
}

// -----------------------
// G2/G3: fail-silent bans + persistence contracts
// -----------------------

function checkFailSilentPatterns(scanFiles) {
  info(`G2/G3 fail-silent bans (empty catch + catch-return without systemHalt) ...`);

  const emptyCatchRe = /catch\s*\([^)]*\)\s*\{\s*\}/m;
  const catchBlockRe = /catch\s*\([^)]*\)\s*\{([\s\S]*?)\}/gm;

  for (const f of scanFiles) {
    const src = readText(f);
    const isCritical = CRITICAL_BASENAMES.has(path.basename(f));
    const level = isCritical ? 'error' : 'warn';

    if (emptyCatchRe.test(src)) {
      addFinding('G2', `Empty catch block (prohibited): ${normalizeSlashes(f)}`, {}, level);
      continue;
    }

    let m;
    while ((m = catchBlockRe.exec(src))) {
      const body = m[1];
      if (/\breturn\b/.test(body) && !/systemHalt\s*\(/.test(body)) {
        // return inside catch without halting is prohibited (fail-silent)
        addFinding('G2', `catch-return without systemHalt (prohibited): ${normalizeSlashes(f)}`, {}, level);
        break;
      }
    }
  }

  // Hotspot checks (minimum, low false-positive):
  const dataCore = path.join(legacyJsDir, 'm55_data_core.js');
  if (fs.existsSync(dataCore)) {
    const src = readText(dataCore);

    // TrustedStorage.getItem must not silently return null on missing/tamper/invalid.
    // We only check for the historically failing patterns.
    const badGetItem = [
      /TrustedStorage[\s\S]*?getItem\s*\([^)]*\)\s*\{[\s\S]*?if\s*\(!raw\)\s*return\s+null\s*;/m,
      /TrustedStorage[\s\S]*?getItem\s*\([^)]*\)\s*\{[\s\S]*?return\s+null\s*;\s*\}\s*catch/m
    ];
    for (const re of badGetItem) {
      if (re.test(src)) {
        addFinding('G3', `TrustedStorage.getItem contains silent return null pattern (prohibited): ${normalizeSlashes(dataCore)}`);
        break;
      }
    }

    // LogVault.getAllLogs must not return [] on parse failure.
    if (/getAllLogs\s*\([^)]*\)\s*\{[\s\S]*?catch\s*\([^)]*\)\s*\{\s*return\s*\[\]\s*;\s*\}/m.test(src)) {
      addFinding('G3', `LogVault.getAllLogs contains catch { return [] } (prohibited): ${normalizeSlashes(dataCore)}`);
    }
  } else {
    addFinding('G3', `Missing m55_data_core.js at ${normalizeSlashes(dataCore)}`);
  }

  const purchaseCache = path.join(legacyJsDir, 'm55_purchase_cache.js');
  if (fs.existsSync(purchaseCache)) {
    const src = readText(purchaseCache);
    if (/hasRight[\s\S]*?\(.*?userHash[\s\S]*?\)\s*\{[\s\S]*?if\s*\(!userHash\)\s*return\s+false\s*;/m.test(src)) {
      addFinding('G2', `PurchaseCache.hasRight has silent return false on missing userHash (prohibited): ${normalizeSlashes(purchaseCache)}`);
    }

    // expiresAt required checks
    const need = [
      /Weekly[\s\S]{0,200}meta\.expiresAt/m,
      /Daily[\s\S]{0,200}meta\.expiresAt/m,
    ];
    for (const re of need) {
      if (!re.test(src)) {
        addFinding('G4', `Time-bounded purchase flow seems to miss meta.expiresAt requirement in ${normalizeSlashes(purchaseCache)}`);
        break;
      }
    }

    if (!/now\s*<\s*exp/.test(src) && !/now\s*<\s*expiresAt/.test(src)) {
      addFinding('G4', `Missing now < expiresAt adoption condition in ${normalizeSlashes(purchaseCache)}`);
    }
  } else {
    addFinding('G2', `Missing m55_purchase_cache.js at ${normalizeSlashes(purchaseCache)}`);
  }

  // Widget snapshot must not fail-silent on storage write
  const widgetSnap = path.join(legacyJsDir, 'm55_widget_snapshot.js');
  if (fs.existsSync(widgetSnap)) {
    const src = readText(widgetSnap);
    if (/fail-silent/i.test(src)) {
      addFinding('G2', `m55_widget_snapshot.js contains 'fail-silent' comment (culture violation / audit risk): ${normalizeSlashes(widgetSnap)}`);
    }
    // also ban catch-return without systemHalt already covers most.
  }

  // integrity_guard must not swallow systemHalt by catching and doing nothing
  const ig = path.join(legacyJsDir, 'integrity_guard.js');
  if (fs.existsSync(ig)) {
    const src = readText(ig);
    if (/catch\s*\([^)]*\)\s*\{\s*\/\*\s*systemHalt\s+already\s+handled\s*\*\/\s*\}/i.test(src) ||
        /catch\s*\([^)]*\)\s*\{\s*\/\/\s*systemHalt\s+already\s+handled[\s\S]*?\}/i.test(src)) {
      addFinding('G2', `integrity_guard.js swallows exception after systemHalt (prohibited): ${normalizeSlashes(ig)}`);
    }
  }
}

// Tools-only: policy reference trace for legacy binding_inventory.js
function checkLegacyBindingInventoryPolicyTrace() {
  const p = path.join(ROOT, "public", "legacy", "js", "binding_inventory.js");
  if (!fs.existsSync(p)) {
    throw new Error(`[AUDIT] Missing: ${rel(p)}`);
  }
  const s = fs.readFileSync(p, "utf8");
  const needs = ["m55_entitlements_v1_0.json", "ai_chat_send_per_day"];
  for (const needle of needs) {
    if (!s.includes(needle)) {
      throw new Error(`[AUDIT] binding_inventory.js must reference '${needle}' (Layer1 trace)`);
    }
  }
}

// -----------------------
// G4: Math.random
// -----------------------

function checkNoMathRandom(files) {
  info(`G4 Math.random scan ...`);
  for (const f of files) {
    const src = readText(f);
    if (src.includes('Math.random')) {
      addFinding('G4', `Math.random found (prohibited): ${normalizeSlashes(f)}`);
    }
  }
}

// -----------------------
// A11y: Reduce Transparency fallback
// -----------------------

function checkReducedTransparency(legacyFiles) {
  info(`A11y Reduce Transparency fallback (same-file) ...`);
  const needles = ['backdrop-filter', '-webkit-backdrop-filter', 'backdropFilter', 'WebkitBackdropFilter'];
  const marker = 'prefers-reduced-transparency: reduce';

  for (const f of legacyFiles) {
    const src = readText(f);
    const hasBlur = needles.some(n => src.includes(n));
    if (!hasBlur) continue;

    const hasFallback = src.includes(marker) || src.includes("'(prefers-reduced-transparency: reduce)'") || src.includes('"(prefers-reduced-transparency: reduce)"') ||
      /matchMedia\s*\(\s*['"]\(prefers-reduced-transparency:\s*reduce\)['"]\s*\)/.test(src);

    if (!hasFallback) {
      addFinding('A11y', `File uses blur/backdrop but lacks prefers-reduced-transparency fallback in SAME file: ${normalizeSlashes(f)}`);
    }
  }
}

// -----------------------
// Pack Priority Safety (Master MANIFEST)
// -----------------------

function checkPackManifest() {
  if (args.noPackCheck) {
    warn('Pack Safety check disabled via --no-pack-check');
    return;
  }

  const manifestPath = args.packManifest
    ? path.resolve(args.packManifest)
    : findFirstFile(ROOT, 'MANIFEST__MASTER_HANDOFF_PACK.md', 6);

  if (!manifestPath) {
    addFinding('PACK', `Cannot find MANIFEST__MASTER_HANDOFF_PACK.md (required for pack safety). Provide via --pack-manifest or disable via --no-pack-check.`);
    return;
  }

  if (!args.auditInputs) {
    addFinding('PACK', `Missing --audit-inputs (required). Provide 5 zip names separated by ';'.`);
    return;
  }

  const auditInputs = args.auditInputs.split(';').map(s => s.trim()).filter(Boolean);
  if (auditInputs.length !== 5) {
    addFinding('PACK', `--audit-inputs must contain EXACTLY 5 zip names; got ${auditInputs.length}`);
    return;
  }

  const src = readText(manifestPath);

  // Must mention all 5 input names (exact match)
  for (const name of auditInputs) {
    if (!src.includes(name)) {
      addFinding('PACK', `Master MANIFEST missing audit input zip name: '${name}' in ${normalizeSlashes(manifestPath)}`);
    }
  }

  // If there are any other '.zip' mentions, they must be explicitly marked reference-only near the mention.
  const zipMentions = Array.from(src.matchAll(/[A-Za-z0-9_.-]+\.zip/g)).map(m => m[0]);
  const unique = Array.from(new Set(zipMentions));
  const nonInputs = unique.filter(z => !auditInputs.includes(z));

  for (const z of nonInputs) {
    // Find line containing the zip mention and require reference-only markers nearby
    const lines = src.split(/\r?\n/);
    const idx = lines.findIndex(l => l.includes(z));
    if (idx === -1) continue;
    const windowLines = lines.slice(Math.max(0, idx - 1), Math.min(lines.length, idx + 2)).join('\n').toLowerCase();
    const ok = windowLines.includes('reference-only') || windowLines.includes('参照専用') || windowLines.includes('実装禁止') || windowLines.includes('do not use as authoritative');
    if (!ok) {
      addFinding('PACK', `Zip '${z}' is mentioned without reference-only label near it (mixing risk): ${normalizeSlashes(manifestPath)} line ${idx + 1}`);
    }
  }
}

function findFirstFile(root, filename, maxDepth = 6) {
  function walk(dir, depth) {
    if (depth > maxDepth) return null;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return null;
    }
    for (const ent of entries) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === 'node_modules' || ent.name.startsWith('.')) continue;
        const res = walk(p, depth + 1);
        if (res) return res;
      } else if (ent.isFile() && ent.name === filename) {
        return p;
      }
    }
    return null;
  }
  return walk(root, 0);
}

// -----------------------
// Master Tree Hash (optional)
// -----------------------

function checkMasterTreeHash() {
  if (args.noTreeHash) {
    warn('Master Tree Hash check disabled via --no-tree-hash');
    return;
  }
  if (!args.masterRoot) return; // optional by default

  const masterRoot = path.resolve(args.masterRoot);
  if (!fs.existsSync(masterRoot) || !fs.statSync(masterRoot).isDirectory()) {
    addFinding('TREE', `--master-root is not a directory: ${masterRoot}`);
    return;
  }

  const treeHashFile = path.resolve(args.masterTreeHashFile ?? path.join(masterRoot, '00_MANIFEST', 'MASTER_TREE_HASH.txt'));
  if (!fs.existsSync(treeHashFile)) {
    addFinding('TREE', `Missing MASTER_TREE_HASH.txt at ${normalizeSlashes(treeHashFile)}`);
    return;
  }

  const treeText = readText(treeHashFile);
  const mHash = treeText.match(/tree_hash_sha256:\s*([0-9a-f]{64})/i);
  const expected = mHash ? mHash[1].toLowerCase() : (treeText.match(/([0-9a-f]{64})/i)?.[1]?.toLowerCase());
  if (!expected) { addFinding('TREE', `MASTER_TREE_HASH.txt has no sha256: ${normalizeSlashes(treeHashFile)}`); return; }
  const computed = computeTreeHash(masterRoot, {
    // Exclude MANIFEST + hash file to avoid self-SHA paradox and allow doc-only edits without changing this hash.
    excludeRel: [
      '00_MANIFEST/MANIFEST__MASTER_HANDOFF_PACK.md',
      normalizeSlashes(path.relative(masterRoot, treeHashFile)),
    ],
  });

  if (expected !== computed) {
    addFinding('TREE', `MASTER_TREE_HASH mismatch. expected=${expected} computed=${computed}`);
  }
}

function computeTreeHash(rootDir, opts = {}) {
  const exclude = new Set((opts.excludeRel ?? []).map(normalizeSlashes));
  const files = listFilesRec(rootDir, null)
    .filter(p => fs.statSync(p).isFile())
    .map(p => ({ abs: p, rel: normalizeSlashes(path.relative(rootDir, p)) }))
    .filter(x => !exclude.has(x.rel))
    .filter(x => !x.rel.startsWith('.git/'));

  files.sort((a, b) => a.rel.localeCompare(b.rel));

  const parts = [];
  for (const f of files) {
    const buf = fs.readFileSync(f.abs);
    const fh = sha256Hex(buf);
    parts.push(`${f.rel}\t${fh}`);
  }
  const joined = parts.join('\n');
  return sha256Hex(joined);
}

function writeMasterTreeHash(masterRoot, outFile) {
  const relOut = path.relative(masterRoot, outFile).split(path.sep).join('/');
  const hash = computeTreeHash(masterRoot, {
    excludeRel: [
      '00_MANIFEST/MANIFEST__MASTER_HANDOFF_PACK.md',
      relOut,
    ],
  });
  const content = [
    'M55 MASTER HANDOFF PACK TREE HASH (authoritative)',
    `tree_hash_sha256: ${hash}`,
    '',
    'definition:',
    '- Exclude:',
    '  - 00_MANIFEST/MANIFEST__MASTER_HANDOFF_PACK.md',
    `  - ${relOut}`,
    '- For every remaining file under this pack:',
    '  sha256(file_bytes) => file_hash',
    '  record line: "<relative_path_posix> <file_hash>"',
    '- Sort lines by relative_path_posix ascending',
    '- tree_hash_sha256 = sha256( join(lines, "\\n") )',
    '',
    'notes:',
    '- Avoids the ZIP self-SHA paradox while remaining tamper-detectable.',
    ''
  ].join('\n');
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, content, 'utf8');
  return hash;
}

// -----------------------
// Run
// -----------------------

if (args.help) {
  console.log(`\nM55 Audit Gate\n\nUsage:\n  node tools/audit_gate.mjs --root . \\\n    --audit-inputs "ZIP1;ZIP2;ZIP3;ZIP4;ZIP5" \\\n    --pack-manifest <path/to/MANIFEST__MASTER_HANDOFF_PACK.md>\n\nOptional:\n  --master-root <path/to/master_unzipped_dir>   (enables TREE hash check)\n  --master-tree-hash-file <path>               (default: <master-root>/00_MANIFEST/MASTER_TREE_HASH.txt)\n  --no-pack-check                              (disable pack safety)\n  --no-tree-hash                               (disable tree hash)\n  --no-strict                                  (prints findings but exits 0; not recommended)\n`);
  process.exit(0);
}

const jsFiles = listFilesRec(legacyJsDir, ['.js', '.mjs']);
const legacyAllFiles = listFilesRec(legacyRoot, ['.js', '.mjs', '.html', '.css', '.md']);
const legacyRuntimeFiles = listFilesRec(legacyRoot, ['.js', '.mjs', '.html', '.css']);

checkSyntaxNode(jsFiles);
checkEsmImports(jsFiles);
checkFailSilentPatterns(jsFiles);
checkLegacyBindingInventoryPolicyTrace();
checkNoMathRandom(legacyRuntimeFiles);
checkReducedTransparency(legacyAllFiles);
checkPackManifest();
checkMasterTreeHash();

const STRICT_WARN = !!args.strictWarn;
const errors = findings.filter((f) => f.level !== 'warn');
const warns = findings.filter((f) => f.level === 'warn');

const failFindings = STRICT_WARN ? findings : errors;

if (failFindings.length || warns.length) {
  const failCount = failFindings.length;
  const warnCount = warns.length;
  const total = findings.length;

  console.error(`\n[M55 AUDIT GATE] FINDINGS: ${total} (errors=${errors.length}, warns=${warnCount})`);
  for (const f of findings) {
    const tag = (f.level || 'error').toUpperCase();
    console.error(`- [${tag}] [${f.kind}] ${f.message}`);
    if (f.detail) console.error(`    detail: ${String(f.detail).slice(0, 500)}`);
  }

  if (failCount) {
    if (STRICT) {
      console.error('\n[M55 AUDIT GATE] RESULT: FAIL (fail-closed)\n');
      process.exit(1);
    }
    warn('STRICT mode disabled; exiting 0 despite error findings.');
    process.exit(0);
  }

  // No blocking errors
  console.log('\n[M55 AUDIT GATE] RESULT: PASS (with warnings)\n');
  process.exit(0);
}

console.log('\n[M55 AUDIT GATE] RESULT: PASS\n');
process.exit(0);
