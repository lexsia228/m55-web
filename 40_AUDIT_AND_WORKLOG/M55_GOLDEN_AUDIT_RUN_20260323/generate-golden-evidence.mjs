/**
 * M55 Golden Vector Audit — evidence generator
 * Uses repo canonical Layer2 engine + Layer3 display mapper (production-equivalent path).
 * Fixed golden: birthDate=1983-02-28, nickname=T, locale=ja-JP, nowDate=2026-03-23
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.dirname(__filename);
const OUT = {
  input: path.join(ROOT, 'input'),
  raw: path.join(ROOT, 'raw'),
  display: path.join(ROOT, 'display'),
  exposure: path.join(ROOT, 'exposure'),
  diff: path.join(ROOT, 'diff'),
};

/** Default: frozen merge web project (override with M55_REPO_ROOT) */
const DEFAULT_REPO = path.resolve(
  'C:\\M55_PHASE2_5HOLY_ARTIFACTS_FROZEN_2026-02-15_v1_0_1\\M55_FULLMERGE_WITH_AUDIT_GATE_v2_1_1_FROZEN_2026-02-15\\m55_web_projectB',
);
const REPO_ROOT = process.env.M55_REPO_ROOT || DEFAULT_REPO;

const CONTRACT_VERSION = 'io-v1.0';
const GENERATED_AT = '2026-03-23T12:00:00.000Z';

const BIRTH = '1983-02-28';
const NICK = 'T';
const LOCALE = 'ja-JP';
const NOW_DATE = '2026-03-23';

const FORBIDDEN = ['黄金期', '宿命', '重大転機', '必ず当たる', '科学的に証明'];

async function loadCanonical() {
  const engineUrl = pathToFileURL(path.join(REPO_ROOT, 'lib', 'm55-canonical', 'engine.mjs')).href;
  const mapperUrl = pathToFileURL(path.join(REPO_ROOT, 'lib', 'm55-canonical', 'display-mapper.mjs')).href;
  const engine = await import(engineUrl);
  const displayMapper = await import(mapperUrl);
  return {
    computeLayer2Envelope: engine.computeLayer2Envelope,
    ENGINE_VERSION: engine.ENGINE_VERSION,
    mapPayloadToDisplay: displayMapper.mapPayloadToDisplay,
  };
}

function safetyScan(obj) {
  const s = JSON.stringify(obj);
  return FORBIDDEN.filter((w) => s.includes(w));
}

function exposureForScope(scope) {
  const map = {
    essence: {
      Home: ['essence.summaryShort', 'essence.keywords (preview only)'],
      core: ['essence.summaryShort', 'essence.keywords', 'essence.focusAreas'],
      today: [],
      weekly: [],
      my: [],
      'dtr/lp': [],
    },
    today: {
      Home: ['today.heading', 'today.summaryShort (preview)'],
      core: [],
      today: ['today.heading', 'today.summaryShort', 'today.focus', 'today.step', 'today.bridgeToTomorrow'],
      weekly: [],
      my: [],
      'dtr/lp': [],
    },
    weekly: {
      Home: ['weekly.heading', 'weekly.weeklyKey (preview)'],
      core: [],
      today: [],
      weekly: ['weekly.heading', 'weekly.weeklyKey', 'weekly.lines', 'weekly.focusAreas', 'weekly.nextBridge'],
      my: [],
      'dtr/lp': [],
    },
    dtr: {
      Home: ['dtr.teaserSections (blurred/teaser)'],
      core: ['bridge link only'],
      today: [],
      weekly: [],
      my: ['dtr.title', 'dtr.ownershipType', 'dtr.expiresAt', 'consult credits'],
      'dtr/lp': ['dtr.title', 'dtr.teaserSections', 'dtr.aiConsultIncluded', 'dtr.version'],
    },
  };
  return {
    scope,
    mappingRef: 'M55_PAGE_OUTPUT_MAPPING_SSOT_v1 + PATCH_P1',
    pages: map[scope],
    rawFieldsNeverOnPublicFree: scope === 'essence' ? ['rawTraits'] : scope === 'today' || scope === 'weekly' ? ['rawSignals'] : ['fullSections body'],
  };
}

function layer1Truth() {
  return {
    purchase_product_code: 'dtr_core_static_v1',
    ingest: { DTR_CORE_STATIC_V1: 'dtr_core_static_v1', dtr_single_v1: 'dtr_core_static_v1' },
    dtr_ownership_type: 'static',
    owned_dtr_state: 'static',
    purchase_entitlement_state: 'owned',
    dtr_unlock_state: 'owned',
    retention_window_days: null,
    dtr_expires_at: null,
    dynamic_example: {
      note: 'If dynamic: derived_expires_at_ms = t0_ms + N*86400000; stored must equal ISO instant',
      last_purchase_at_example: '2026-03-23T10:00:00.000Z',
      retention_window_days: 30,
      derived_expires_at_ms: Date.parse('2026-03-23T10:00:00.000Z') + 30 * 86400000,
    },
  };
}

function writeJson(dir, name, obj) {
  fs.writeFileSync(path.join(dir, name), JSON.stringify(obj, null, 2), 'utf8');
}

function writeTxt(dir, name, text) {
  fs.writeFileSync(path.join(dir, name), text, 'utf8');
}

function diffText(a, b, label) {
  if (a === b) return `${label}: IDENTICAL (no diff)\n`;
  return `${label}: DIFFER\n---\n${a}\n--- vs ---\n${b}\n`;
}

function inputJson(scope) {
  return {
    birthDate: BIRTH,
    nickname: NICK,
    contextScope: scope,
    locale: LOCALE,
    nowDate: NOW_DATE,
    relationshipTarget: null,
    longTermWindow: null,
    historySignals: null,
  };
}

async function run() {
  const { computeLayer2Envelope, ENGINE_VERSION, mapPayloadToDisplay } = await loadCanonical();

  const scopes = ['essence', 'today', 'weekly', 'dtr'];

  const manifest = [];
  manifest.push('# M55 Golden Vector Audit Manifest');
  manifest.push('');
  manifest.push(`- **contractVersion**: ${CONTRACT_VERSION}`);
  manifest.push(`- **engineVersion**: ${ENGINE_VERSION}`);
  manifest.push(`- **m55RepoRoot**: ${REPO_ROOT}`);
  manifest.push(`- **golden input**: birthDate=${BIRTH}, nickname=${NICK}, locale=${LOCALE}, nowDate=${NOW_DATE}`);
  manifest.push('- **generator**: generate-golden-evidence.mjs → canonical Layer2 + display mapper');
  manifest.push('');

  for (const scope of scopes) {
    const inp = inputJson(scope);
    const raw = computeLayer2Envelope(inp, { fixedGeneratedAt: GENERATED_AT });
    const display = mapPayloadToDisplay(scope, raw.payload);

    writeJson(OUT.input, `${scope}_input.json`, inp);
    writeJson(OUT.raw, `${scope}_raw.json`, raw);
    writeJson(OUT.display, `${scope}_display.json`, display);
    writeJson(OUT.exposure, `${scope}_exposure.json`, exposureForScope(scope));

    const raw2 = JSON.stringify(computeLayer2Envelope(inp, { fixedGeneratedAt: GENERATED_AT }));
    const raw1 = JSON.stringify(raw);
    const disp2 = JSON.stringify(mapPayloadToDisplay(scope, computeLayer2Envelope(inp, { fixedGeneratedAt: GENERATED_AT }).payload));
    const disp1 = JSON.stringify(display);
    const diffContent =
      diffText(raw1, raw2, 'raw_run1_vs_run2') +
      diffText(disp1, disp2, 'display_run1_vs_run2');
    writeTxt(OUT.diff, `${scope}_diff.txt`, diffContent);

    const safety = safetyScan(display);
    manifest.push(`## ${scope}`);
    manifest.push(`- safety forbidden leak: ${safety.length ? safety.join(', ') : 'none'}`);
    manifest.push(`- raw determinism: ${raw1 === raw2 ? 'PASS' : 'FAIL'}`);
    manifest.push(`- display determinism: ${disp1 === disp2 ? 'PASS' : 'FAIL'}`);
  }

  manifest.push('');
  manifest.push('## Layer1 truth (sample static ownership)');
  manifest.push('```json');
  manifest.push(JSON.stringify(layer1Truth(), null, 2));
  manifest.push('```');

  fs.writeFileSync(path.join(ROOT, 'audit_manifest.md'), manifest.join('\n'), 'utf8');
  console.log('Wrote evidence to', ROOT);
  console.log('ENGINE_VERSION:', ENGINE_VERSION);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
