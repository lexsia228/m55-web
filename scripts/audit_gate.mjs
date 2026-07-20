#!/usr/bin/env node
/**
 * M55 Phase6 Audit Gate (cross-platform)
 * - Fails build if any Layer0/Layer1 hard rules are violated.
 * - Keeps checks conservative to avoid false negatives.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const LEGACY = path.join(ROOT, 'public', 'legacy');

const ARGS = new Set(process.argv.slice(2));
const FAST = ARGS.has('--fast');

function readExpectedShaFromLegacy(){
  const p = path.join(LEGACY, 'js', 'integrity_guard.js');
  if(!fs.existsSync(p)) return null;
  const t = fs.readFileSync(p, 'utf8');
  const m = t.match(/M55_NAME_ANALYSIS_EXPECTED_SHA256\s*=\s*['"]([0-9a-f]{64})['"]/i);
  return m ? m[1] : null;
}
const NAME_ANALYSIS_JSON = path.join(LEGACY, 'data', 'm55_name_analysis_81_sanitized.json');

const VIOLATIONS = [];

function add(file, reason) {
  VIOLATIONS.push({ file, reason });
}

function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

function readText(p) {
  return fs.readFileSync(p, 'utf8');
}

function sha256File(p) {
  const buf = fs.readFileSync(p);
  const h = crypto.createHash('sha256');
  h.update(buf);
  return h.digest('hex');
}

function walk(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let ents;
    try { ents = fs.readdirSync(d, { withFileTypes: true }); }
    catch { continue; }
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile()) out.push(p);
    }
  }
  return out;
}

function rel(p) {
  return path.relative(ROOT, p).replaceAll('\\', '/');
}

function grep(files, re, reason, opts = {}) {
  for (const f of files) {
    if (opts.ext && !opts.ext.some(x => f.endsWith(x))) continue;
    let txt;
    try { txt = readText(f); } catch { continue; }
    const excludeLine = opts.excludeLine;
    if (excludeLine) {
      const lines = txt.split(/\r?\n/);
      for (const line of lines) {
        if (re.test(line) && !excludeLine.test(line)) {
          add(rel(f), reason);
          break;
        }
      }
    } else if (re.test(txt)) {
      add(rel(f), reason);
    }
  }
}

/** Stripe crawler guard: public/legacy must not serve HTML or iframe targets. */
function validateLegacyPublicExposureRemoved() {
  if (!exists(LEGACY)) return;

  for (const f of walk(LEGACY)) {
    if (f.endsWith('.html')) {
      add(rel(f), 'Stripe crawler guard: public/legacy HTML must not be publicly servable');
    }
  }
}

function validateLegacyIframeRoutesRemoved() {
  const routes = [
    path.join(ROOT, 'app', 'ai-chat', 'page.tsx'),
    path.join(ROOT, 'app', 'tarot', 'page.tsx'),
    path.join(ROOT, 'app', 'meter', 'page.tsx'),
    path.join(ROOT, 'app', 'calendar', 'page.tsx'),
  ];
  for (const p of routes) {
    if (!exists(p)) continue;
    const t = readText(p);
    if (t.includes('/legacy/')) {
      add(rel(p), 'Legacy iframe route must not reference /legacy/');
    }
    if (!t.includes('notFound(')) {
      add(rel(p), 'Legacy iframe route must fail closed with notFound()');
    }
  }
}

function validateIntegrityHash() {
  if (!exists(NAME_ANALYSIS_JSON)) return;
  const expected = readExpectedShaFromLegacy();
  if (!expected) {
    add(rel(path.join(LEGACY, 'js', 'integrity_guard.js')), 'Cannot derive expected SHA256 (integrity_guard.js missing or unparsable)');
    return;
  }
  const actual = sha256File(NAME_ANALYSIS_JSON);
  if (actual !== expected) {
    add(rel(NAME_ANALYSIS_JSON), `Integrity hash mismatch: expected ${expected}, got ${actual}`);
  }
}

function validateNoOldLogicJS(files) {
  // Old/forbidden logic sources.
  const bannedPaths = [
    path.join(LEGACY, 'js', 'm55_name_analysis.js'),
    path.join(LEGACY, 'js', 'm55_runtime_ssot.js'),
    path.join(LEGACY, 'docs', 'M55_RUNTIME_SSOT.json')
  ];
  for (const p of bannedPaths) {
    if (exists(p)) add(rel(p), 'Forbidden legacy logic artifact present');
  }

  // Banned references anywhere **in runtime code**.
  // Allow occurrences inside audit/CI scripts or docs that merely *mention* the ban.
  const runtimeFiles = files.filter((p) => {
    const s = p.replace(/\\/g, '/');
    return (
      !s.includes('/public/legacy/ci/') &&
      !s.includes('/public/legacy/docs/') &&
      !s.includes('/public/legacy/scripts/')
    );
  });
  grep(runtimeFiles, /M55_RUNTIME_SSOT\.json|m55_runtime_ssot\b/, 'Forbidden RuntimeSSOT reference found');
  grep(files, /fnv1a32\b/, 'Forbidden dummy hash helper found');
}

function validateNoLoopNoBadgeNoSpinner(files) {
  // No infinite animations. Exclude doc lines like "No infinite animations".
  grep(files, /\binfinite\b/, 'NoLoop violation: "infinite" found', {
    ext: ['.css', '.html', '.js', '.ts', '.tsx'],
    excludeLine: /no\s+infinite|No\s+infinite/i,
  });

  // No badge-ish UI keywords. Exclude suppression rules (display:none) and doc.
  grep(files, /(badge|unread|notif|notification|red-dot|alert)/i, 'NoBadge violation keyword found', {
    ext: ['.html', '.css', '.js', '.ts', '.tsx'],
    excludeLine: /display\s*:\s*none|no\s+(notification|badge|notif)|No\s+(notification|badge|notif)/i,
  });

  // No spinners.
  grep(files, /(spinner|loading\s*spinner)/i, 'NoSpinner violation keyword found', { ext: ['.html', '.css', '.js', '.ts', '.tsx'] });
}

function validateBackgroundNoTouch(files) {
  // In shell CSS, forbid body/html background overrides.
  const shellCss = path.join(ROOT, 'app', 'globals.css');
  if (exists(shellCss)) {
    const t = readText(shellCss);
    if (/\bbackground\b/i.test(t)) add(rel(shellCss), 'Background NoTouch: shell CSS must not set background');
  }

  // In legacy, forbid explicit html/body background changes (should be handled by frozen SSOT assets only).
  // This is intentionally conservative: flags any "body{...background" in legacy CSS.
  const legacyCssFiles = files.filter(f => f.endsWith('.css'));
  for (const f of legacyCssFiles) {
    const t = readText(f);
    if (/\b(body|html)\b[^\{]*\{[^\}]*\bbackground\b/i.test(t)) {
      add(rel(f), 'Background NoTouch: html/body background override present');
    }
  }
}

function validateUserHashFailClosed(files) {
  // Disallow anon fallback / random generation for userHash.
  // Heuristic: if a line contains userHash and (fallback|anon|random|uuid) => violation.
  const jsFiles = files.filter(f => /\.(js|ts|tsx)$/.test(f));
  for (const f of jsFiles) {
    const t = readText(f);
    const lines = t.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/userHash/.test(line) && /(fallback|anon|random|uuid|getRandomValues|Math\.random)/i.test(line)) {
        add(`${rel(f)}:${i+1}`, 'Identity policy: userHash must be fail-closed (no fallback generation)');
      }
    }
  }
}

function validateMyPageNoGaugeAndNoDoubleBinding() {
  const mypage = path.join(LEGACY, 'page_mypage.html');
  if (!exists(mypage)) return;
  const t = readText(mypage);

  // Remove gauge-like remnants specifically flagged before.
  if (/width\s*:\s*0%/i.test(t) || /0%/.test(t) && /fill/i.test(t)) {
    add(rel(mypage), 'UI risk: gauge-like fill (e.g., width:0%) present');
  }

  // Double script include for binding_inventory.js.
  const matches = t.match(/binding_inventory\.js/gi);
  if (matches && matches.length > 1) {
    add(rel(mypage), 'Bug risk: binding_inventory.js loaded multiple times');
  }
}

function validateLayer1KeysLightly() {
  // Quick schema-level sanity check: ensure contract keys exist.
  const entPath = path.join(LEGACY, 'policies', 'm55_entitlements_v1_0.json');
  if (!exists(entPath)) return;
  let ent;
  try { ent = JSON.parse(fs.readFileSync(entPath, 'utf8')); } catch { add(rel(entPath), 'Invalid JSON'); return; }

  const plans = ent?.plans;
  if (!plans?.free || !plans?.standard || !plans?.premium) {
    add(rel(entPath), 'Layer1 entitlements must define plans.free/standard/premium');
    return;
  }

  // Required keys (contract names) that earlier audits depended on.
  const requiredKeys = ['ai_chat_send_per_day', 'tarot_draws_per_day', 'dtr_monthly_included', 'weekly_view'];
  for (const tier of ['free','standard','premium']) {
    const p = plans[tier];
    for (const k of requiredKeys) {
      if (!(k in p)) add(`${rel(entPath)}:${tier}`, `Missing entitlement key: ${k}`);
    }
  }
}

function validateBindingInventoryPolicyTrace() {
  const p = path.join(LEGACY, 'js', 'binding_inventory.js');
  if (!exists(p)) return;
  const t = readText(p);
  if (!t.includes('m55_entitlements_v1_0.json')) {
    add(rel(p), 'Layer1 trace missing: should reference policies/m55_entitlements_v1_0.json');
  }
  if (!t.includes('ai_chat_send_per_day')) {
    add(rel(p), 'Layer1 trace missing: should reference ai_chat_send_per_day');
  }
}

function runGuard(name, pythonScript, args) {
  const scriptPath = path.join(ROOT, 'scripts', 'ci', 'guard', pythonScript);
  if (!exists(scriptPath)) {
    console.warn(`[AuditGate] Guard ${name}: script not found at ${scriptPath}`);
    return;
  }
  const pys = process.platform === 'win32' ? ['py', 'python', 'python3'] : ['python3', 'python'];
  for (const py of pys) {
    const r = spawnSync(py, [scriptPath, ...args], { cwd: ROOT, stdio: 'inherit', encoding: 'utf8' });
    if (!r.error) {
      if (r.status !== 0) {
        console.error(`[AuditGate] Guard ${name} failed (exit ${r.status})`);
        process.exit(1);
      }
      return;
    }
  }
  console.error(`[AuditGate] Guard ${name}: Python not found (tried: ${pys.join(', ')})`);
  process.exit(1);
}

/** REGRESSION: /home must not auto-mount SoulBirthGate (CTA-driven intake on HomePanel). */
function validateShellLayoutNoAutoBirthGateOnHome() {
  const p = path.join(ROOT, 'components', 'shell', 'ShellLayout.tsx');
  if (!exists(p)) return;
  const t = readText(p);
  if (!/\bpathname\s*!==\s*['"]\/home['"]/.test(t)) {
    add(rel(p), "REGRESSION GUARD: ShellLayout must render SoulBirthGate only when pathname !== '/home'");
  }
  if (!t.includes('<SoulBirthGate')) {
    add(rel(p), 'REGRESSION GUARD: ShellLayout must still render SoulBirthGate for non-/home shell routes');
  }
}

/** Stable hooks for manual / future E2E: Home = value surface only; no personal observation shelf on Home. */
function validateHomeRegressionTestIds() {
  const panel = path.join(ROOT, 'components', 'home', 'HomePanel.tsx');
  if (!exists(panel)) return;
  const t = readText(panel);
  if (!t.includes('data-testid="m55-home-hero"')) {
    add(rel(panel), 'REGRESSION GUARD: HomePanel must expose data-testid="m55-home-hero"');
  }
  if (t.includes('data-testid="m55-home-observation"')) {
    add(rel(panel), 'REGRESSION GUARD: HomePanel must not mount m55-home-observation (personal results belong off Home)');
  }
  if (!t.includes('data-testid="m55-home-has-profile-hero"')) {
    add(
      rel(panel),
      'REGRESSION GUARD: HomePanel must expose data-testid="m55-home-has-profile-hero" (quiet /core link in hero)',
    );
  }
  const overlay = path.join(ROOT, 'components', 'core', 'CoreAnalysisLoading.tsx');
  if (exists(overlay) && !readText(overlay).includes('data-testid="m55-core-analysis-loading"')) {
    add(
      rel(overlay),
      'REGRESSION GUARD: CoreAnalysisLoading must expose data-testid="m55-core-analysis-loading" (post-save → /core)',
    );
  }
  const lowerSectionTestIds = [
    'm55-home-lower',
    'm55-home-product-map',
    'm55-home-free-preview',
    'm55-home-pair-free',
    'm55-home-mechanism',
    'm55-home-premium-preview',
    'm55-home-premium-value-bridge',
    'm55-home-plan-comparison',
    'm55-home-final-cta',
  ];
  for (const id of lowerSectionTestIds) {
    if (id === 'm55-home-premium-value-bridge' || id === 'm55-home-pair-free') continue;
    if (!t.includes(`data-testid="${id}"`)) {
      add(rel(panel), `REGRESSION GUARD: HomePanel must expose data-testid="${id}" (lower HOME IA)`);
    }
  }
  const valueBridge = path.join(ROOT, 'components', 'home', 'HomePremiumValueBridge.tsx');
  if (!exists(valueBridge)) {
    add(rel(panel), 'REGRESSION GUARD: HomePanel premium section must mount HomePremiumValueBridge');
  } else {
    const valueBridgeText = readText(valueBridge);
    if (!valueBridgeText.includes('data-testid="m55-home-premium-value-bridge"')) {
      add(rel(valueBridge), 'REGRESSION GUARD: HomePremiumValueBridge must expose data-testid="m55-home-premium-value-bridge"');
    }
    if (!t.includes('HomePremiumValueBridge')) {
      add(rel(panel), 'REGRESSION GUARD: HomePanel must import and render HomePremiumValueBridge inside premium section');
    }
  }
  const productMap = path.join(ROOT, 'components', 'home', 'HomeProductMap.tsx');
  if (!exists(productMap)) {
    add(rel(panel), 'REGRESSION GUARD: HomePanel must mount HomeProductMap');
  } else if (!t.includes('HomeProductMap')) {
    add(rel(panel), 'REGRESSION GUARD: HomePanel must import and render HomeProductMap below hero');
  }
  const teaser = path.join(ROOT, 'components', 'home', 'HomeTenAssetTeaser.tsx');
  if (!exists(teaser)) {
    add(rel(panel), 'REGRESSION GUARD: HomePanel free section must mount HomeTenAssetTeaser');
  } else {
    const teaserText = readText(teaser);
    if (!teaserText.includes('data-testid="m55-home-ten-asset-teaser"')) {
      add(rel(teaser), 'REGRESSION GUARD: HomeTenAssetTeaser must expose data-testid="m55-home-ten-asset-teaser"');
    }
    if (!t.includes('HomeTenAssetTeaser')) {
      add(rel(panel), 'REGRESSION GUARD: HomePanel must import and render HomeTenAssetTeaser inside free section');
    }
  }
  const pairFreeSection = path.join(ROOT, 'components', 'home', 'HomePairFreeSection.tsx');
  if (!exists(pairFreeSection)) {
    add(rel(panel), 'REGRESSION GUARD: HomePanel must mount HomePairFreeSection after self free section');
  } else {
    const pairFreeText = readText(pairFreeSection);
    if (!pairFreeText.includes('data-testid="m55-home-pair-free"')) {
      add(rel(pairFreeSection), 'REGRESSION GUARD: HomePairFreeSection must expose data-testid="m55-home-pair-free"');
    }
    if (!pairFreeText.includes('data-testid="m55-home-pair-free-structure"')) {
      add(rel(pairFreeSection), 'REGRESSION GUARD: HomePairFreeSection must expose data-testid="m55-home-pair-free-structure"');
    }
    if (!pairFreeText.includes('data-testid="m55-home-pair-free-cta"')) {
      add(rel(pairFreeSection), 'REGRESSION GUARD: HomePairFreeSection must expose data-testid="m55-home-pair-free-cta"');
    }
    if (!pairFreeText.includes('pairReadingPublicStructure')) {
      add(rel(pairFreeSection), 'REGRESSION GUARD: HomePairFreeSection must import shared pairReadingPublicStructure authority');
    }
    if (!t.includes('HomePairFreeSection')) {
      add(rel(panel), 'REGRESSION GUARD: HomePanel must import and render HomePairFreeSection after self free section');
    }
  }
  const orderedLowerIds = [
    'm55-home-product-map',
    'm55-home-free-preview',
    'm55-home-mechanism',
    'm55-home-premium-preview',
    'm55-home-final-cta',
  ];
  const orderedIndices = orderedLowerIds.map((id) => t.indexOf(`data-testid="${id}"`));
  for (const [position, id] of orderedLowerIds.entries()) {
    if (orderedIndices[position] === -1) {
      add(rel(panel), `REGRESSION GUARD: HomePanel lower IA missing data-testid="${id}"`);
    }
  }
  for (let i = 1; i < orderedIndices.length; i += 1) {
    if (orderedIndices[i] !== -1 && orderedIndices[i - 1] !== -1 && orderedIndices[i] <= orderedIndices[i - 1]) {
      add(
        rel(panel),
        `REGRESSION GUARD: HomePanel lower IA order violation — "${orderedLowerIds[i]}" must render after "${orderedLowerIds[i - 1]}"`,
      );
    }
  }
  const freeIdx = t.indexOf('data-testid="m55-home-free-preview"');
  const pairMountIdx = t.indexOf('<HomePairFreeSection');
  const mechanismIdx = t.indexOf('data-testid="m55-home-mechanism"');
  if (pairMountIdx === -1 || freeIdx === -1 || mechanismIdx === -1 || !(freeIdx < pairMountIdx && pairMountIdx < mechanismIdx)) {
    add(rel(panel), 'REGRESSION GUARD: HomePanel must mount HomePairFreeSection after self free and before mechanism');
  }
  const copyPath = path.join(ROOT, 'lib', 'm55', 'topFreeEntryPublicCopy.ts');
  if (exists(copyPath)) {
    const copyText = readText(copyPath);
    if (!copyText.includes('自分の流れを、複数の視点から詳しく読み解く。')) {
      add(rel(copyPath), 'REGRESSION GUARD: HOME premiumHeadlineJa must use value-first headline copy');
    }
    if (copyText.includes('同じ土台を、4つの章で読み返せます。') || copyText.includes('深く読み返す')) {
      add(rel(copyPath), 'REGRESSION GUARD: HOME must not retain removed premium/product-map copy');
    }
    const homeBlockMatch = copyText.match(/home:\s*\{([\s\S]*?)\n  \},/);
    if (homeBlockMatch && homeBlockMatch[1].includes('読み返す')) {
      add(rel(copyPath), 'REGRESSION GUARD: HOME public copy must not include 読み返す');
    }
  }
  if (t.includes('m55-home-final-cta-pair')) {
    add(rel(panel), 'REGRESSION GUARD: HomePanel must not expose final pair CTA');
  }
  if (t.includes('/synastry/purchase/confirm') || t.includes('isCompatibilityCommerceEnabled')) {
    add(rel(panel), 'REGRESSION GUARD: HomePanel must not expose paid compatibility commerce routes');
  }
  for (const removed of [
    'm55-home-seen-things-bridge',
    'm55-home-understanding',
    'm55-home-demo-five-element',
    'm55-home-report-shell',
    'm55-home-outcome-bridge',
    'm55-home-ten-assets',
    'm55-home-existing-user',
    'm55-home-ten-asset-grid',
  ]) {
    if (t.includes(`data-testid="${removed}"`)) {
      add(rel(panel), `REGRESSION GUARD: HomePanel must not expose removed data-testid="${removed}"`);
    }
  }
  if (!t.includes('data-testid="m55-home-open-birth-intake"')) {
    add(rel(panel), 'REGRESSION GUARD: HomePanel must expose data-testid="m55-home-open-birth-intake"');
  }
  if (!t.includes('BirthProfileIntakeLayer')) {
    add(rel(panel), 'REGRESSION GUARD: HomePanel must mount BirthProfileIntakeLayer for CTA-driven birth intake');
  }
  if (!t.includes('CoreAnalysisLoading')) {
    add(rel(panel), 'REGRESSION GUARD: HomePanel must mount CoreAnalysisLoading after profile save');
  }
  if (!/nicknameHint=\{nicknameHint\}/.test(t)) {
    add(rel(panel), 'REGRESSION GUARD: HomePanel must pass nicknameHint to BirthProfileIntakeLayer');
  }
  if (!/router\.push\(['"]\/core['"]\)/.test(t)) {
    add(rel(panel), "REGRESSION GUARD: HomePanel must router.push('/core') after save analyzing beat");
  }
  if (/<input\b/.test(t)) {
    add(rel(panel), 'REGRESSION GUARD: HomePanel must not embed inline inputs (intake lives in BirthProfileIntakeLayer only)');
  }
}

function validateMyPanelProfileIntakeTestId() {
  const p = path.join(ROOT, 'components', 'my', 'MyPanel.tsx');
  if (!exists(p)) return;
  const t = readText(p);
  if (!t.includes('data-testid="m55-my-profile-intake"')) {
    add(rel(p), 'REGRESSION GUARD: MyPanel no_profile intake must expose data-testid="m55-my-profile-intake"');
  }
}

/** /purchase/success: legacy Stripe URL compat — must forward to /dtr/processing (snapshot wait + fulfillment). */
function validatePurchaseSuccessPage() {
  const pagePath = path.join(ROOT, 'app', 'purchase', 'success', 'page.tsx');
  if (!exists(pagePath)) return;
  const t = readText(pagePath);
  if (!t.includes('/dtr/processing')) {
    add(rel(pagePath), 'REGRESSION GUARD: purchase success must redirect to /dtr/processing');
  }
  if (!t.includes('redirect(')) {
    add(rel(pagePath), 'REGRESSION GUARD: purchase success must use redirect()');
  }
  if (/\bunauthorized\b/i.test(t)) {
    add(rel(pagePath), 'REGRESSION GUARD: purchase success page must not surface raw unauthorized copy');
  }
  const pollPath = path.join(ROOT, 'components', 'QuietPolling.tsx');
  if (exists(pollPath)) {
    const q = readText(pollPath);
    if (q.includes('location.reload')) {
      add(rel(pollPath), 'REGRESSION GUARD: QuietPolling must not use location.reload (use router.refresh to reduce flicker)');
    }
    if (!q.includes('router.refresh')) {
      add(rel(pollPath), 'REGRESSION GUARD: QuietPolling must call router.refresh for soft entitlement revalidation');
    }
  }
}

/** BAN-prevention: forbidden public-claim markers in user-facing app/components (fast scan). */
const PUBLIC_CLAIMS_SCAN_DIRS = [
  path.join(ROOT, 'components', 'home'),
  path.join(ROOT, 'components', 'pages'),
  path.join(ROOT, 'components', 'shell'),
  path.join(ROOT, 'app', 'how-m55-works'),
  path.join(ROOT, 'app', 'ten-views'),
  path.join(ROOT, 'app', 'support'),
  path.join(ROOT, 'app', 'legal'),
  path.join(ROOT, 'app', 'purchase', 'success'),
  path.join(ROOT, 'app', 'dtr'),
  path.join(ROOT, 'app', 'home'),
];

const PUBLIC_CLAIMS_BAN_PATTERNS = [
  { re: /世界初/, label: '世界初' },
  { re: /日本発/, label: '日本発' },
  { re: /20万7,360/, label: '20万7,360' },
  { re: /33の基本因子/, label: '33の基本因子' },
  { re: /12の動的サイクル/, label: '12の動的サイクル' },
  { re: /1,000年の統計/, label: '1,000年の統計' },
  { re: /AI精度No\.1/, label: 'AI精度No.1' },
  { re: /best in Japan/i, label: 'best in Japan' },
  { re: /ぼったくり/, label: 'ぼったくり' },
];

function isPublicClaimsScannableFile(filePath) {
  const base = path.basename(filePath);
  if (base.includes('.bak')) return false;
  return filePath.endsWith('.tsx') || filePath.endsWith('.ts');
}

function collectPublicClaimsScanTargets() {
  const targets = [];
  for (const d of PUBLIC_CLAIMS_SCAN_DIRS) {
    if (!exists(d)) continue;
    let stat;
    try {
      stat = fs.statSync(d);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;
    for (const f of walk(d)) {
      if (isPublicClaimsScannableFile(f)) targets.push(f);
    }
  }
  const appPage = path.join(ROOT, 'app', 'page.tsx');
  if (exists(appPage) && isPublicClaimsScannableFile(appPage)) targets.push(appPage);
  return [...new Set(targets)];
}

function validatePublicClaimsBanlist() {
  const files = collectPublicClaimsScanTargets();
  for (const f of files) {
    let txt;
    try {
      txt = readText(f);
    } catch {
      continue;
    }
    for (const { re, label } of PUBLIC_CLAIMS_BAN_PATTERNS) {
      if (re.test(txt)) {
        add(
          rel(f),
          `PUBLIC CLAIMS BAN: disallowed marker 「${label}」 (docs/ssot/M55_PUBLIC_CLAIMS_ALLOWLIST_v1.md)`
        );
      }
    }
  }
}

function main() {
  validateLegacyPublicExposureRemoved();
  validateLegacyIframeRoutesRemoved();

  validateShellLayoutNoAutoBirthGateOnHome();
  validateHomeRegressionTestIds();
  validateMyPanelProfileIntakeTestId();
  validatePurchaseSuccessPage();
  validatePublicClaimsBanlist();

  if (!exists(LEGACY)) {
    reportAndExit();
    return;
  }

  const files = walk(LEGACY);

  validateIntegrityHash();
  validateNoOldLogicJS(files);

  if (!FAST) {
    validateNoLoopNoBadgeNoSpinner(files);
    validateBackgroundNoTouch(files);
    validateUserHashFailClosed(files);
    validateMyPageNoGaugeAndNoDoubleBinding();
    validateLayer1KeysLightly();
    validateBindingInventoryPolicyTrace();

    runGuard('m55_gate_scan_wiring', 'm55_gate_scan_wiring.py', [LEGACY]);
    runGuard('m55_appstore_language', 'm55_appstore_language_gate_v2.py', [path.join(LEGACY, 'page_mypage.html')]);

    // GM Seal: DOM Freeze (GM vs CANDIDATE per HTML)
    const GM_SNAPSHOT = path.join(ROOT, 'docs', 'ssot', 'gm_snapshot');
    const DOM_FREEZE_PAIRS = [
      ['index.html', 'index.html'],
      ['today.html', 'today.html'],
      ['weekly.html', 'weekly.html'],
      ['meter.html', 'meter.html'],
      ['calendar.html', 'calendar.html'],
      ['core.html', 'core.html'],
      ['synastry.html', 'synastry.html'],
    ];
    for (const [gmName, candName] of DOM_FREEZE_PAIRS) {
      const gmPath = path.join(GM_SNAPSHOT, gmName);
      const candPath = path.join(LEGACY, candName);
      if (exists(gmPath) && exists(candPath)) {
        runGuard(`DOM_FREEZE:${gmName}`, 'm55_dom_freeze_check_v2.py', [gmPath, candPath]);
      }
    }
  }

  reportAndExit();
}

function reportAndExit() {
  if (VIOLATIONS.length === 0) {
    console.log('PASS/FAIL: PASS');
    console.log('Violations:');
    console.log('(none)');
    process.exit(0);
  }

  console.log('PASS/FAIL: FAIL');
  console.log('Violations:');
  for (const v of VIOLATIONS) {
    console.log(`- ${v.file} — ${v.reason}`);
  }
  console.log('\nMinimal Patch Diff:');
  console.log('- only if FAIL (smallest diff, no new spec)');
  process.exit(1);
}

main();
