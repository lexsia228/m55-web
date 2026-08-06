#!/usr/bin/env node
/**
 * M55 Commercial Funnel SSOT verifier.
 * Confirms required docs, machine contract facts, and doc/contract parity.
 * Does NOT enforce deferred runtime assertions (legacy debt lane).
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
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
  'docs/ssot/M55_COMMERCIAL_QUALITY_CONTRACT.md',
  'docs/ssot/M55_SELF_FUNNEL_CONTRACT.md',
  'docs/ssot/M55_PAIR_FUNNEL_CONTRACT.md',
  'docs/ssot/M55_PRODUCT_TRUTH.md',
  'docs/ssot/M55_COPY_AND_CLAIMS.md',
  'docs/ssot/M55_VISUAL_SYSTEM.md',
  'docs/ssot/M55_DECISION_LOG.md',
  'docs/ssot/M55_CURRENT_STATE.md',
  'docs/ssot/M55_WORKTREE_REGISTRY.md',
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
  const preResultTarget = /preResultThemeSelection:\s*false/.test(targetSlice);
  const runtimeSlice = src.slice(src.indexOf('M55_CURRENT_RUNTIME_STATE'));
  const legacyTermsInPublicCopy =
    /legacyTermsInPublicCopy:\s*false/.test(runtimeSlice)
      ? false
      : /legacyTermsInPublicCopy:\s*true/.test(runtimeSlice)
        ? true
        : undefined;
  const enforcedCount = (src.match(/M55_ENFORCED_RUNTIME_ASSERTIONS/g) ?? []).length;
  const deferredCount = (src.match(/id:\s*'no_/g) ?? []).length;

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
    current: { selfFree: { legacyTermsInPublicCopy } },
    target: { selfFree: { preResultThemeSelection: preResultTarget } },
    enforcement:
      src.match(/M55_ENFORCEMENT_STATUS = '([^']+)'/)?.[1] ?? '',
    legacy: {
      internalOnlyTerms: ['保存版'].filter((term) => src.includes(`'${term}'`)),
      legacyPublicTerms: ['見取り図'].filter((term) => src.includes(`'${term}'`)),
    },
    enforced: enforcedCount >= 1 ? [1] : [],
    deferred: deferredCount >= 2 ? [1, 2] : [],
    prohibited: src.match(/M55_PROHIBITED_CLAIMS = \[([\s\S]*?)\] as const/)?.[1] ?? '',
  };
}

function checkMachineContract(data) {
  if (!data) return;
  const { products: p, registry: r, current: c, target: t, deferred, enforced, enforcement, legacy, prohibited } =
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
  if (r.ACTIVE_LANE !== 'M55 MINIMUM-REVENUE-QUALITY') {
    fail('ACTIVE_LANE must be M55 MINIMUM-REVENUE-QUALITY');
  }
  if (enforcement !== 'PENDING_SELF_FUNNEL_IMPLEMENTATION') {
    fail('enforcementStatus must be PENDING_SELF_FUNNEL_IMPLEMENTATION');
  }
  if (t.selfFree.preResultThemeSelection !== true) {
    fail('target contract must record preResultThemeSelection=false');
  }
  if (!legacy.internalOnlyTerms?.includes('保存版')) {
    fail('internal-only registry must record 保存版 as INTERNAL_ONLY');
  }
  if (!legacy.legacyPublicTerms?.includes('見取り図')) {
    fail('legacy runtime debt must record free-tier 見取り図 deferral');
  }
  if (!Array.isArray(enforced) || enforced.length < 1) {
    fail('enforced runtime assertions must be recorded');
  }
  if (!Array.isArray(deferred) || deferred.length < 2) {
    fail('deferred runtime assertions must be recorded');
  }
  if (c.selfFree.legacyTermsInPublicCopy !== false) {
    fail('M55_CURRENT_RUNTIME_STATE.selfFree.legacyTermsInPublicCopy must be false');
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
  if (!agents.includes('M55_COMMERCIAL_QUALITY_CONTRACT.md')) {
    fail('AGENTS.md must list M55_COMMERCIAL_QUALITY_CONTRACT.md');
  }
  if (!agents.includes('M55_CURRENT_STATE.md')) fail('AGENTS.md must list M55_CURRENT_STATE.md');
  if (!read('docs/ssot/M55_COPY_AND_CLAIMS.md').includes('INTERNAL_ONLY')) {
    fail('M55_COPY_AND_CLAIMS.md must record 保存版 INTERNAL_ONLY boundary');
  }
  if (!read('docs/ssot/M55_COPY_AND_CLAIMS.md').includes('プレミアムレポート')) {
    fail('M55_COPY_AND_CLAIMS.md must record canonical Premium public terminology');
  }
  if (!read('docs/ssot/M55_SELF_FUNNEL_CONTRACT.md').includes('今の関心')) {
    fail('M55_SELF_FUNNEL_CONTRACT.md must document 今の関心 (removed / historical)');
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
    'M55_WORKTREE_REGISTRY.md',
    'M55_COMMERCIAL_FUNNEL_SSOT.md',
    'M55_COMMERCIAL_QUALITY_CONTRACT.md',
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

const LIFECYCLE_STATUSES = [
  'PRIMARY_MAIN',
  'ACTIVE',
  'PAUSED',
  'STALE',
  'DO_NOT_USE',
  'CLEANUP_PENDING',
  'COMPLETED_REMOVABLE',
  'UNKNOWN',
];

function checkWorktreeRegistry() {
  const registry = read('docs/ssot/M55_WORKTREE_REGISTRY.md');
  const currentState = read('docs/ssot/M55_CURRENT_STATE.md');

  for (const status of LIFECYCLE_STATUSES) {
    if (!registry.includes(status)) {
      fail(`M55_WORKTREE_REGISTRY.md must define lifecycle status: ${status}`);
    }
  }

  const requiredPaths = [
    '/Users/lexsia/Documents/M55_WORKTREE-home-final-ia-v1',
    '/Users/lexsia/Documents/M55_CANONICAL-cross-page-card-polish',
    '/Users/lexsia/Documents/M55_CANONICAL',
  ];

  for (const wtPath of requiredPaths) {
    if (!registry.includes(wtPath)) fail(`registry must include worktree path: ${wtPath}`);
  }

  if (!registry.includes('DO_NOT_USE')) fail('registry must document DO_NOT_USE lifecycle');
  if (!registry.includes('M55_CANONICAL-cross-page-card-polish')) {
    fail('registry must mark cross-page-card-polish');
  }
  if (!/DO_NOT_USE[\s\S]*M55_CANONICAL-cross-page-card-polish|M55_CANONICAL-cross-page-card-polish[\s\S]*DO_NOT_USE/.test(registry)) {
    fail('cross-page-card-polish must be classified DO_NOT_USE');
  }
  if (!registry.includes('compatibility commerce core')) {
    fail('DO_NOT_USE reason must mention compatibility commerce core merged to main');
  }
  if (!registry.includes('QA') && !registry.includes('qa-screenshots')) {
    fail('DO_NOT_USE reason must mention QA artifacts');
  }
  if (!registry.includes('.gitignore')) {
    fail('DO_NOT_USE reason must mention uncommitted .gitignore change');
  }
  if (!registry.includes('reset') || !registry.includes('stash')) {
    fail('DO_NOT_USE must prohibit reset / stash');
  }
  if (!registry.includes('ACTIVE')) fail('registry must document ACTIVE worktree');
  if (!registry.includes('PRIMARY_MAIN_HOME')) {
    fail('registry must distinguish PRIMARY_MAIN_HOME from current branch');
  }
  if (!registry.includes('37163a0d473c25365f3bddad579d4844fd8300df')) {
    fail('registry must record production origin/main SHA');
  }
  if (!currentState.includes('M55_WORKTREE_REGISTRY.md')) {
    fail('M55_CURRENT_STATE.md must reference M55_WORKTREE_REGISTRY.md');
  }
  if (!currentState.includes('docs/m55-commercial-funnel-ssot-v1')) {
    fail('M55_CURRENT_STATE.md must record active branch');
  }

  const excluded = ['M55_B2C_KEYVISUAL_PRODUCTION_R2', 'M55_PRIVATE_VAULT', 'sparsebundle'];
  for (const name of excluded) {
    if (!registry.includes(name)) {
      fail(`registry must explicitly exclude non-worktree directory: ${name}`);
    }
  }

  const worktreeTableSection = registry.split('## Registered worktrees')[1]?.split('## Non-worktree')[0] ?? '';
  if (/M55_B2C_KEYVISUAL_PRODUCTION_R2|M55_PRIVATE_VAULT/.test(worktreeTableSection)) {
    fail('non-worktree directories must not appear as registered worktree rows');
  }
}

const WT001_ID = 'WT-001';
const WT006_ID = 'WT-006';
const WT009_ID = 'WT-009';
const WT010_ID = 'WT-010';
const WT011_ID = 'WT-011';
const WT006_EXPECTED_PATH = '/Users/lexsia/Documents/M55_CANONICAL-paid-lp-wave1';
const WT006_EXPECTED_BRANCH = 'pre-note/home-fullka-microcopy';
const WT010_EXPECTED_PATH = '/Users/lexsia/Documents/M55_WORKTREE-product-authority-pack-v1';
const WT010_EXPECTED_BRANCH = 'feat/m55-product-authority-pack-v1';
const WT010_EXPECTED_BOOTSTRAP_START_HEAD = 'e6afe67262ebcee3353a3a43713f7ecf8369f26f';
const WT010_EXPECTED_OPERATIONAL_STATE = 'ALLOWLIST_ONLY_DURING_IMPLEMENTATION';
const WT011_EXPECTED_PATH = '/Users/lexsia/Documents/M55_WORKTREE-self-funnel-growth-share-v1';
const WT011_EXPECTED_BRANCH = 'feat/m55-self-funnel-growth-share-v1';
const WT011_IMPLEMENTATION_REVIEWED_TIP = 'd7af28a59755076b6269e93edfba03297eb98084';
const WT011_EXPECTED_LIVE_HEAD_SOURCE = 'Git';
const WT011_HEAD_VALIDATION_DESCENDANT = 'DESCENDANT_OF_REVIEWED_IMPLEMENTATION_TIP';
const PRE_MERGE_SNAPSHOT_BRANCH = 'docs/m55-commercial-funnel-ssot-v1';
const POST_MERGE_EXPECTED_BRANCH = 'main';
const EXPECTED_POST_MERGE_NEXT_SINGLE_ACTION =
  'Cursor docs patch complete → Cursor STOP → Codex independent diff review → Control Plane re-execution';
const WT009_EXPECTED_PATH = '/Users/lexsia/Documents/M55_WORKTREE-build-week-control-plane-v1';
const WT009_EXPECTED_BRANCH = 'feat/m55-build-week-control-plane-v1';
const WT009_EXPECTED_HEAD = '0cba2cb998e07b81c71ea51d69f7ae0fe92b7f75';
const WT009_EXPECTED_LIFECYCLE = 'PAUSED';
const WT009_EXPECTED_PURPOSE = 'FROZEN_BUILD_WEEK_EVIDENCE_AND_EXTERNAL_CONTROL_PLANE';
const WT009_EXPECTED_OPERATIONAL_STATE = 'FROZEN_BY_HUMAN_DECISION';
const WT_HEADING_SEPARATOR = ' — ';
const CANONICAL_WT_HEADING_LABELS = Object.freeze({
  'WT-001': 'PRIMARY_MAIN_HOME',
  'WT-002': 'Compatibility purchase delivery (DO NOT USE)',
  'WT-003': 'Compatibility quality matrix',
  'WT-004': 'Ops control plane bootstrap',
  'WT-005': 'Ops current-state semantics',
  'WT-006': 'Paid LP / home microcopy',
  'WT-007': 'Analysis hub',
  'WT-008': 'HOME poster clean main',
  'WT-009': 'Build Week Control Plane (operational freeze)',
  'WT-010': 'Product Authority Pack',
  'WT-011': 'Self funnel Growth / share lane',
});
const BASELINE_AUTHORITY_GRAMMAR = /^`main`\s*@\s*`([0-9a-f]{40})`$/;
const REQUIRED_REGISTRY_HEADINGS = [WT001_ID, WT009_ID];
const GIT_OPERATION_PATHS = ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply'];

function normalizeRegistryFieldText(raw) {
  return raw.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
}

function collectSectionFieldRows(section) {
  const rows = new Map();
  for (const line of section.split('\n')) {
    const match = line.match(/^\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|\s*$/);
    if (!match) continue;
    const label = match[1].trim().toLowerCase();
    if (label === 'field' || label.startsWith('---')) continue;
    if (!rows.has(label)) rows.set(label, []);
    rows.get(label).push(match[2].trim());
  }
  return rows;
}

function validateExactlyOnce(rows, fieldLabel, { required = true, id = 'WT-???' } = {}) {
  const key = fieldLabel.toLowerCase();
  const values = rows.get(key) ?? [];
  const errors = [];
  if (values.length === 0) {
    if (required) {
      errors.push({ id, field: fieldLabel, kind: 'missing', message: `${id} ${fieldLabel} missing` });
    }
    return { ok: errors.length === 0, value: null, errors };
  }
  if (values.length > 1) {
    errors.push({ id, field: fieldLabel, kind: 'duplicate', message: `${id} ${fieldLabel} duplicate` });
    return { ok: false, value: null, errors };
  }
  const raw = values[0];
  if (!normalizeRegistryFieldText(raw)) {
    errors.push({ id, field: fieldLabel, kind: 'empty', message: `${id} ${fieldLabel} empty` });
    return { ok: false, value: null, errors };
  }
  return { ok: true, value: raw, errors: [] };
}

function extractPathValue(raw) {
  const backtick = raw.match(/`([^`]+)`/);
  return backtick ? backtick[1].trim() : null;
}

function extractBranchValue(raw) {
  const backtick = raw.match(/`([^`]+)`/);
  return backtick ? backtick[1].trim() : normalizeRegistryFieldText(raw);
}

function parseShaFromHeadField(raw) {
  const match = raw.match(/`([0-9a-f]{40})`/i);
  if (!match) return { ok: false, kind: 'invalid' };
  return { ok: true, sha: match[1].toLowerCase() };
}

function parseShaFromBaselineField(raw) {
  const normalized = normalizeRegistryFieldText(raw);
  if (!normalized) return { ok: false, kind: 'empty' };
  const match = normalized.match(BASELINE_AUTHORITY_GRAMMAR);
  if (!match) return { ok: false, kind: 'invalid' };
  return { ok: true, sha: match[1], raw: normalized };
}

function parseSectionIdentityField(section) {
  const rows = collectSectionFieldRows(section);
  const values = rows.get('id') ?? [];
  if (values.length !== 1) return null;
  const raw = normalizeRegistryFieldText(values[0]);
  const backtick = raw.match(/`(WT-\d{3})`/i);
  if (backtick) return backtick[1];
  const plain = raw.match(/^(WT-\d{3})$/i);
  return plain ? plain[1] : raw;
}

function splitRegistryLines(textOrLines) {
  const lines = Array.isArray(textOrLines) ? textOrLines : textOrLines.split(/\r?\n/);
  return lines.map((line) => line.replace(/\r$/, ''));
}

const MAX_FENCE_INDENT_SPACES = 3;

function splitFenceIndent(line) {
  const match = line.match(/^( *)(.*)$/);
  if (!match) return null;
  if (match[1].length > MAX_FENCE_INDENT_SPACES) return null;
  return { indentSpaces: match[1].length, content: match[2] };
}

function parseFenceMarker(content) {
  const match = content.match(/^(`{3,}|~{3,})([\s\S]*)$/);
  if (!match) return null;
  return {
    char: match[1][0],
    length: match[1].length,
    remainder: match[2],
  };
}

function parseFenceOpeningLine(line) {
  const indent = splitFenceIndent(line);
  if (!indent) return null;
  const marker = parseFenceMarker(indent.content);
  if (!marker) return null;
  if (marker.char === '`' && marker.remainder.includes('`')) return null;
  return {
    char: marker.char,
    length: marker.length,
    info: marker.remainder,
    indentSpaces: indent.indentSpaces,
  };
}

function parseFenceClosingLine(line, openFence) {
  const indent = splitFenceIndent(line);
  if (!indent) return false;
  const marker = parseFenceMarker(indent.content);
  if (!marker) return false;
  if (marker.char !== openFence.char) return false;
  if (marker.length < openFence.length) return false;
  if (marker.remainder.length > 0 && !/^[\t ]*$/.test(marker.remainder)) return false;
  return true;
}

function buildMarkdownFenceMask(linesInput) {
  const lines = splitRegistryLines(linesInput);
  const inFenceByLine = new Array(lines.length).fill(false);
  const unclosedFenceErrors = [];
  let openFence = null;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (!openFence) {
      const opening = parseFenceOpeningLine(line);
      if (opening) {
        openFence = {
          char: opening.char,
          length: opening.length,
          line: lineIndex + 1,
        };
      }
      continue;
    }

    if (parseFenceClosingLine(line, openFence)) {
      openFence = null;
      continue;
    }

    inFenceByLine[lineIndex] = true;
  }

  if (openFence) {
    unclosedFenceErrors.push({
      id: 'registry',
      field: 'fence',
      kind: 'unclosed',
      line: openFence.line,
      heading: `${openFence.char.repeat(openFence.length)}`,
      message: `unclosed fenced code block starting at line ${openFence.line}`,
    });
  }

  return { inFenceByLine, unclosedFenceErrors };
}

function expectedRegistryHeadingLine(id) {
  const label = CANONICAL_WT_HEADING_LABELS[id];
  return label ? `### ${id}${WT_HEADING_SEPARATOR}${label}` : null;
}

function classifyRegistryHeadingLine(line) {
  if (!line.startsWith('### ')) return null;
  if (!/^###\s+WT-/i.test(line)) return null;

  const idMatch = line.match(/^### (WT-\d{3})(?: — (.+))?$/);
  if (!idMatch) {
    return {
      kind: 'malformed',
      id: line.match(/^### (WT-\S+)/i)?.[1] ?? 'WT-???',
    };
  }

  const id = idMatch[1];
  const label = idMatch[2] ?? null;
  const canonicalLabel = CANONICAL_WT_HEADING_LABELS[id];

  if (!canonicalLabel) {
    return { kind: 'malformed', id };
  }

  if (line !== expectedRegistryHeadingLine(id)) {
    if (!label) {
      return { kind: 'invalid-label', id, label: null };
    }
    return { kind: 'invalid-label', id, label };
  }

  return { kind: 'valid', id, label: canonicalLabel };
}

function parseRegistryHeadings(registryText) {
  const lines = splitRegistryLines(registryText);
  const { inFenceByLine, unclosedFenceErrors } = buildMarkdownFenceMask(lines);
  const duplicateHeadingErrors = [];
  const malformedHeadingErrors = [];
  const invalidHeadingLabelErrors = [];
  const missingRequiredEntryErrors = [];
  const canonicalSections = [];
  const idOccurrences = new Map();

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    if (inFenceByLine[lineIndex]) continue;

    const line = lines[lineIndex];
    const classification = classifyRegistryHeadingLine(line);
    if (!classification) continue;

    if (classification.kind === 'malformed') {
      malformedHeadingErrors.push({
        id: classification.id,
        field: 'heading',
        kind: 'malformed',
        line: lineIndex + 1,
        heading: line.trim(),
        message: `malformed WT heading at line ${lineIndex + 1}: ${line.trim()}`,
      });
      continue;
    }

    if (classification.kind === 'invalid-label') {
      invalidHeadingLabelErrors.push({
        id: classification.id,
        field: 'heading',
        kind: 'invalid-label',
        line: lineIndex + 1,
        heading: line.trim(),
        message: `${classification.id} heading invalid label at line ${lineIndex + 1}: ${line.trim()}`,
      });
      continue;
    }

    const { id } = classification;
    const seen = idOccurrences.get(id) ?? 0;
    if (seen >= 1) {
      duplicateHeadingErrors.push({
        id,
        field: 'heading',
        kind: 'duplicate',
        line: lineIndex + 1,
        heading: line.trim(),
        message: `${id} heading duplicate at line ${lineIndex + 1}`,
      });
    }
    idOccurrences.set(id, seen + 1);
    canonicalSections.push({
      id,
      index: lines.slice(0, lineIndex).join('\n').length,
      line: lineIndex + 1,
      heading: line.trim(),
    });
  }

  for (const requiredId of REQUIRED_REGISTRY_HEADINGS) {
    if (!idOccurrences.has(requiredId)) {
      missingRequiredEntryErrors.push({
        id: requiredId,
        field: 'heading',
        kind: 'missing',
        line: null,
        message: `${requiredId} heading missing`,
      });
    }
  }

  return {
    duplicateHeadingErrors,
    malformedHeadingErrors,
    invalidHeadingLabelErrors,
    unclosedFenceErrors,
    missingRequiredEntryErrors,
    canonicalSections,
    headingBlockedForRequired: (id) =>
      unclosedFenceErrors.length > 0 ||
      duplicateHeadingErrors.some((error) => error.id === id) ||
      malformedHeadingErrors.some((error) => error.heading.includes(id)) ||
      invalidHeadingLabelErrors.some((error) => error.id === id) ||
      missingRequiredEntryErrors.some((error) => error.id === id),
  };
}

function parseRegistryDocument(registryText) {
  const headings = parseRegistryHeadings(registryText);
  const entries = [];

  for (let index = 0; index < headings.canonicalSections.length; index += 1) {
    const marker = headings.canonicalSections[index];
    if (headings.headingBlockedForRequired(marker.id)) {
      continue;
    }
    const end =
      index + 1 < headings.canonicalSections.length
        ? headings.canonicalSections[index + 1].index
        : registryText.length;
    const section = registryText.slice(marker.index, end);
    const entry = parseRegistryWorktreeSection(section, marker.id);
    const sectionIdentity = parseSectionIdentityField(section);
    if (sectionIdentity && sectionIdentity !== entry.id) {
      entry.valid = false;
      entry.errors.push({
        id: entry.id,
        field: 'id',
        kind: 'invalid',
        message: `${entry.id} heading identity conflict with section id ${sectionIdentity}`,
      });
    }
    entries.push(entry);
  }

  const allErrors = [
    ...headings.duplicateHeadingErrors,
    ...headings.malformedHeadingErrors,
    ...headings.invalidHeadingLabelErrors,
    ...headings.unclosedFenceErrors,
    ...headings.missingRequiredEntryErrors,
    ...entries.flatMap((entry) => entry.errors),
  ];

  return {
    valid:
      headings.duplicateHeadingErrors.length === 0 &&
      headings.malformedHeadingErrors.length === 0 &&
      headings.invalidHeadingLabelErrors.length === 0 &&
      headings.unclosedFenceErrors.length === 0 &&
      headings.missingRequiredEntryErrors.length === 0 &&
      entries.length > 0 &&
      entries.every((entry) => entry.valid),
    entries,
    duplicateHeadingErrors: headings.duplicateHeadingErrors,
    malformedHeadingErrors: headings.malformedHeadingErrors,
    invalidHeadingLabelErrors: headings.invalidHeadingLabelErrors,
    unclosedFenceErrors: headings.unclosedFenceErrors,
    missingRequiredEntryErrors: headings.missingRequiredEntryErrors,
    allErrors,
    headingBlockedForRequired: headings.headingBlockedForRequired,
  };
}
function getSectionFieldRules(id, lifecycleRaw = '') {
  const required = ['path', 'branch', 'HEAD', 'lifecycle', 'purpose'];
  const optional = ['baseline', 'operational state'];
  const lifecycle = lifecycleRaw ? normalizeRegistryFieldText(lifecycleRaw) : '';
  if (id === WT001_ID && lifecycle.includes('PRIMARY_MAIN_HOME')) {
    required.push('baseline');
    return { required, optional: optional.filter((field) => field !== 'baseline') };
  }
  if (id === WT009_ID) {
    required.push('operational state');
    return { required, optional: optional.filter((field) => field !== 'operational state') };
  }
  if (id === WT010_ID) {
    return {
      required: ['path', 'branch', 'bootstrapStartHead', 'lifecycle', 'purpose', 'operational state'],
      optional: ['baseline', 'HEAD', 'cleanliness', 'upstream'],
    };
  }
  if (id === WT011_ID) {
    return {
      required: [
        'path',
        'branch',
        'implementationReviewedTip',
        'liveHeadSource',
        'headValidation',
        'lifecycle',
        'purpose',
      ],
      optional: ['baseline', 'cleanliness', 'upstream', 'operational state', 'current origin/main'],
    };
  }
  return { required, optional };
}

function parseRegistryWorktreeSection(section, id) {
  const rows = collectSectionFieldRows(section);
  const lifecycleRaw = rows.get('lifecycle')?.[0] ?? '';
  const { required, optional } = getSectionFieldRules(id, lifecycleRaw);
  const errors = [];
  const rawFields = {};

  for (const fieldLabel of required) {
    const result = validateExactlyOnce(rows, fieldLabel, { required: true, id });
    errors.push(...result.errors);
    if (result.ok) rawFields[fieldLabel.toLowerCase()] = result.value;
  }
  for (const fieldLabel of optional) {
    const result = validateExactlyOnce(rows, fieldLabel, { required: false, id });
    errors.push(...result.errors);
    if (result.ok && result.value) rawFields[fieldLabel.toLowerCase()] = result.value;
  }

  let path = null;
  let branch = null;
  let headSha = null;
  let bootstrapStartHeadSha = null;
  let implementationReviewedTipSha = null;
  let liveHeadSource = null;
  let headValidationPolicy = null;
  let baselineSha = null;
  let baselineRaw = null;

  if (rawFields.path) {
    path = extractPathValue(rawFields.path);
    if (!path) errors.push({ id, field: 'path', kind: 'invalid', message: `${id} path invalid` });
  }
  if (rawFields.branch) branch = extractBranchValue(rawFields.branch);
  if (rawFields.head) {
    const headParsed = parseShaFromHeadField(rawFields.head);
    if (!headParsed.ok) {
      errors.push({ id, field: 'HEAD', kind: headParsed.kind, message: `${id} HEAD ${headParsed.kind}` });
    } else {
      headSha = headParsed.sha;
    }
  }
  if (rawFields.bootstrapstarthead) {
    const bootstrapParsed = parseShaFromHeadField(rawFields.bootstrapstarthead);
    if (!bootstrapParsed.ok) {
      errors.push({
        id,
        field: 'bootstrapStartHead',
        kind: bootstrapParsed.kind,
        message: `${id} bootstrapStartHead ${bootstrapParsed.kind}`,
      });
    } else {
      bootstrapStartHeadSha = bootstrapParsed.sha;
    }
  }
  if (rawFields.implementationreviewedtip) {
    const tipParsed = parseShaFromHeadField(rawFields.implementationreviewedtip);
    if (!tipParsed.ok) {
      errors.push({
        id,
        field: 'implementationReviewedTip',
        kind: tipParsed.kind,
        message: `${id} implementationReviewedTip ${tipParsed.kind}`,
      });
    } else {
      implementationReviewedTipSha = tipParsed.sha;
    }
  }
  if (rawFields.liveheadsource) {
    liveHeadSource = normalizeRegistryFieldText(rawFields.liveheadsource);
  }
  if (rawFields.headvalidation) {
    headValidationPolicy = normalizeRegistryFieldText(rawFields.headvalidation);
  }
  if (id === WT011_ID && (rows.get('head')?.length ?? 0) > 0) {
    errors.push({
      id,
      field: 'HEAD',
      kind: 'invalid',
      message: `${id} must not use stale exact HEAD; use implementationReviewedTip with headValidation`,
    });
  }
  if (rawFields.baseline) {
    const baselineParsed = parseShaFromBaselineField(rawFields.baseline);
    if (!baselineParsed.ok) {
      errors.push({
        id,
        field: 'baseline',
        kind: baselineParsed.kind,
        message: `${id} baseline ${baselineParsed.kind}`,
      });
    } else {
      baselineSha = baselineParsed.sha;
      baselineRaw = baselineParsed.raw;
    }
  }

  const lifecycle = rawFields.lifecycle ? normalizeRegistryFieldText(rawFields.lifecycle) : null;
  const purpose = rawFields.purpose ? normalizeRegistryFieldText(rawFields.purpose) : null;
  const operationalState = rawFields['operational state']
    ? normalizeRegistryFieldText(rawFields['operational state'])
    : null;

  return {
    id,
    valid: errors.length === 0,
    errors,
    path,
    branch,
    headSha,
    bootstrapStartHeadSha,
    implementationReviewedTipSha,
    liveHeadSource,
    headValidationPolicy,
    baselineRaw,
    baselineSha,
    lifecycle,
    purpose,
    operationalState,
    section,
  };
}

function isPrimaryActiveLifecycle(lifecycle) {
  if (!lifecycle) return false;
  return normalizeRegistryFieldText(lifecycle).startsWith('ACTIVE');
}

function countPrimaryActiveLanes(entries) {
  return entries.filter((entry) => entry.valid && isPrimaryActiveLifecycle(entry.lifecycle)).length;
}

function validateWt001Metadata(entry) {
  const errors = [];
  if (!entry.lifecycle?.includes('ACTIVE') || !entry.lifecycle?.includes('PRIMARY_MAIN_HOME')) {
    errors.push({
      id: WT001_ID,
      field: 'lifecycle',
      kind: 'invalid',
      message: `${WT001_ID} lifecycle unsupported`,
    });
  }
  if (!entry.purpose?.includes('PRIMARY_MAIN_HOME')) {
    errors.push({
      id: WT001_ID,
      field: 'purpose',
      kind: 'invalid',
      message: `${WT001_ID} purpose unsupported`,
    });
  }
  return errors;
}

function validateWt009Metadata(entry) {
  const errors = [];
  if (!entry) {
    errors.push({ id: WT009_ID, field: 'id', kind: 'missing', message: `${WT009_ID} section missing` });
    return errors;
  }
  if (entry.path !== WT009_EXPECTED_PATH) {
    errors.push({ id: WT009_ID, field: 'path', kind: 'invalid', message: `${WT009_ID} path invalid` });
  }
  if (entry.branch !== WT009_EXPECTED_BRANCH) {
    errors.push({ id: WT009_ID, field: 'branch', kind: 'invalid', message: `${WT009_ID} branch invalid` });
  }
  if (entry.headSha !== WT009_EXPECTED_HEAD) {
    errors.push({ id: WT009_ID, field: 'HEAD', kind: 'invalid', message: `${WT009_ID} HEAD invalid` });
  }
  if (entry.lifecycle !== WT009_EXPECTED_LIFECYCLE) {
    errors.push({ id: WT009_ID, field: 'lifecycle', kind: 'invalid', message: `${WT009_ID} lifecycle invalid` });
  }
  if (entry.purpose !== WT009_EXPECTED_PURPOSE) {
    errors.push({ id: WT009_ID, field: 'purpose', kind: 'invalid', message: `${WT009_ID} purpose invalid` });
  }
  if (entry.operationalState !== WT009_EXPECTED_OPERATIONAL_STATE) {
    errors.push({
      id: WT009_ID,
      field: 'operational state',
      kind: 'invalid',
      message: `${WT009_ID} operational state invalid`,
    });
  }
  return errors;
}

function validateWt010Metadata(entry) {
  const errors = [];
  if (!entry) {
    errors.push({ id: WT010_ID, field: 'id', kind: 'missing', message: `${WT010_ID} section missing` });
    return errors;
  }
  if (entry.path !== WT010_EXPECTED_PATH) {
    errors.push({ id: WT010_ID, field: 'path', kind: 'invalid', message: `${WT010_ID} path invalid` });
  }
  if (entry.branch !== WT010_EXPECTED_BRANCH) {
    errors.push({ id: WT010_ID, field: 'branch', kind: 'invalid', message: `${WT010_ID} branch invalid` });
  }
  if (!entry.lifecycle?.includes('ACTIVE')) {
    errors.push({ id: WT010_ID, field: 'lifecycle', kind: 'invalid', message: `${WT010_ID} lifecycle invalid` });
  }
  if (entry.operationalState !== WT010_EXPECTED_OPERATIONAL_STATE) {
    errors.push({
      id: WT010_ID,
      field: 'operational state',
      kind: 'invalid',
      message: `${WT010_ID} operational state invalid`,
    });
  }
  if (!entry.bootstrapStartHeadSha) {
    errors.push({
      id: WT010_ID,
      field: 'bootstrapStartHead',
      kind: 'missing',
      message: `${WT010_ID} bootstrapStartHead missing`,
    });
  }
  return errors;
}

function validateWt011Metadata(entry) {
  const errors = [];
  if (!entry) {
    errors.push({ id: WT011_ID, field: 'id', kind: 'missing', message: `${WT011_ID} section missing` });
    return errors;
  }
  if (entry.path !== WT011_EXPECTED_PATH) {
    errors.push({ id: WT011_ID, field: 'path', kind: 'invalid', message: `${WT011_ID} path invalid` });
  }
  if (entry.branch !== WT011_EXPECTED_BRANCH) {
    errors.push({ id: WT011_ID, field: 'branch', kind: 'invalid', message: `${WT011_ID} branch invalid` });
  }
  if (!isPrimaryActiveLifecycle(entry.lifecycle)) {
    errors.push({ id: WT011_ID, field: 'lifecycle', kind: 'invalid', message: `${WT011_ID} lifecycle invalid` });
  }
  if (entry.headValidationPolicy !== WT011_HEAD_VALIDATION_DESCENDANT) {
    errors.push({
      id: WT011_ID,
      field: 'headValidation',
      kind: 'invalid',
      message: `${WT011_ID} headValidation invalid`,
    });
  }
  if (entry.liveHeadSource !== WT011_EXPECTED_LIVE_HEAD_SOURCE) {
    errors.push({
      id: WT011_ID,
      field: 'liveHeadSource',
      kind: 'invalid',
      message: `${WT011_ID} liveHeadSource invalid`,
    });
  }
  if (!entry.implementationReviewedTipSha) {
    errors.push({
      id: WT011_ID,
      field: 'implementationReviewedTip',
      kind: 'missing',
      message: `${WT011_ID} implementationReviewedTip missing`,
    });
  }
  if (entry.headSha) {
    errors.push({
      id: WT011_ID,
      field: 'HEAD',
      kind: 'invalid',
      message: `${WT011_ID} stale exact HEAD is not allowed without descendant policy marker`,
    });
  }
  return errors;
}

function evaluateWt011RegistryPreflight(registryDocument) {
  if (registryDocument.headingBlockedForRequired(WT011_ID)) {
    const headingErrors = [
      ...registryDocument.duplicateHeadingErrors.filter((error) => error.id === WT011_ID),
      ...registryDocument.malformedHeadingErrors.filter((error) => error.heading.includes(WT011_ID)),
      ...registryDocument.missingRequiredEntryErrors.filter((error) => error.id === WT011_ID),
    ];
    return { valid: false, errors: headingErrors };
  }

  const entry = registryDocument.entries.find((item) => item.id === WT011_ID);
  if (!entry) {
    return {
      valid: false,
      errors: [{ id: WT011_ID, field: 'id', kind: 'missing', message: `${WT011_ID} section missing` }],
    };
  }
  if (!entry.valid) {
    return { valid: false, errors: entry.errors };
  }
  const metadataErrors = validateWt011Metadata(entry);
  return { valid: metadataErrors.length === 0, errors: metadataErrors, entry };
}

function evaluateWt011ActiveLanePreflight(entry, registryEntry, warnings, logs, gitInspector) {
  if (!registryEntry.valid) {
    warnings.push(
      `WT-011 registry parser failure for ${entry.path}: ${formatRegistryParserErrors(registryEntry.errors)}`,
    );
    return;
  }
  if (entry.path !== registryEntry.path) {
    warnings.push(`WT-011 path mismatch for ${entry.path}: expected ${registryEntry.path}`);
  }
  if (entry.branch !== registryEntry.branch) {
    warnings.push(`WT-011 branch mismatch for ${entry.path}: live=${entry.branch ?? 'detached'}`);
  }
  if (!isPrimaryActiveLifecycle(registryEntry.lifecycle)) {
    warnings.push(`WT-011 lifecycle must be ACTIVE for ${entry.path}`);
  }
  if (registryEntry.headValidationPolicy !== WT011_HEAD_VALIDATION_DESCENDANT) {
    warnings.push(
      `WT-011 headValidation must be ${WT011_HEAD_VALIDATION_DESCENDANT} for ${entry.path}`,
    );
  }
  if (registryEntry.liveHeadSource !== WT011_EXPECTED_LIVE_HEAD_SOURCE) {
    warnings.push(`WT-011 liveHeadSource must be ${WT011_EXPECTED_LIVE_HEAD_SOURCE} for ${entry.path}`);
  }
  if (registryEntry.headSha) {
    warnings.push(`WT-011 must not use stale exact HEAD for ${entry.path}`);
  }
  const reviewedTip = registryEntry.implementationReviewedTipSha;
  if (!reviewedTip) {
    warnings.push(`WT-011 implementationReviewedTip missing for ${entry.path}`);
    return;
  }
  if (!entry.head) {
    warnings.push(`WT-011 live HEAD missing for ${entry.path}`);
    return;
  }
  if (!gitInspector.objectExists(entry.path, reviewedTip)) {
    warnings.push(
      `WT-011 implementationReviewedTip object missing for ${entry.path}: ${reviewedTip.slice(0, 12)}`,
    );
    return;
  }
  if (!gitInspector.objectExists(entry.path, entry.head)) {
    warnings.push(`WT-011 live HEAD object missing for ${entry.path}: ${entry.head.slice(0, 12)}`);
    return;
  }
  if (!gitInspector.isAncestorOrEqual(entry.path, reviewedTip, entry.head)) {
    warnings.push(
      `WT-011 live HEAD is not a descendant of implementationReviewedTip for ${entry.path}: live=${entry.head.slice(0, 12)} tip=${reviewedTip.slice(0, 12)}`,
    );
    return;
  }
  const remoteHead = gitInspector.getRemoteFeatureHead?.(entry.path, registryEntry.branch);
  if (!remoteHead) {
    warnings.push(`WT-011 remote feature ref unavailable for ${registryEntry.branch} at ${entry.path}`);
    return;
  }
  if (remoteHead.toLowerCase() !== entry.head.toLowerCase()) {
    warnings.push(
      `WT-011 remote feature ref mismatch for ${entry.path}: live=${entry.head.slice(0, 12)} remote=${remoteHead.slice(0, 12)}`,
    );
    return;
  }
  logs.push(
    `[preflight] WT-011 live HEAD ${entry.head.slice(0, 12)} descends from implementationReviewedTip ${reviewedTip.slice(0, 12)}`,
  );
  if (gitInspector.hasGitOperationInProgress(entry.path)) {
    warnings.push(`WT-011 git operation in progress for ${entry.path}`);
  }
}

function evaluateWt010RegistryPreflight(registryDocument) {
  if (registryDocument.headingBlockedForRequired(WT010_ID)) {
    const headingErrors = [
      ...registryDocument.duplicateHeadingErrors.filter((error) => error.id === WT010_ID),
      ...registryDocument.malformedHeadingErrors.filter((error) => error.heading.includes(WT010_ID)),
      ...registryDocument.missingRequiredEntryErrors.filter((error) => error.id === WT010_ID),
    ];
    return { valid: false, errors: headingErrors };
  }

  const entry = registryDocument.entries.find((item) => item.id === WT010_ID);
  if (!entry) {
    return {
      valid: false,
      errors: [{ id: WT010_ID, field: 'id', kind: 'missing', message: `${WT010_ID} section missing` }],
    };
  }
  if (!entry.valid) {
    return { valid: false, errors: entry.errors };
  }
  const metadataErrors = validateWt010Metadata(entry);
  return { valid: metadataErrors.length === 0, errors: metadataErrors, entry };
}

function evaluateWt010ActiveLanePreflight(entry, registryEntry, warnings, logs, gitInspector) {
  if (!registryEntry.valid) {
    warnings.push(
      `WT-010 registry parser failure for ${entry.path}: ${formatRegistryParserErrors(registryEntry.errors)}`,
    );
    return;
  }
  if (entry.path !== registryEntry.path) {
    warnings.push(`WT-010 path mismatch for ${entry.path}: expected ${registryEntry.path}`);
  }
  if (entry.branch !== WT010_EXPECTED_BRANCH) {
    warnings.push(`WT-010 branch mismatch for ${entry.path}: live=${entry.branch ?? 'detached'}`);
  }
  if (!registryEntry.lifecycle?.includes('ACTIVE')) {
    warnings.push(`WT-010 lifecycle must be ACTIVE for ${entry.path}`);
  }
  if (registryEntry.operationalState !== WT010_EXPECTED_OPERATIONAL_STATE) {
    warnings.push(`WT-010 operational state must be ${WT010_EXPECTED_OPERATIONAL_STATE} for ${entry.path}`);
  }
  const bootstrapStartHead = registryEntry.bootstrapStartHeadSha;
  if (!bootstrapStartHead) {
    warnings.push(`WT-010 bootstrapStartHead missing for ${entry.path}`);
    return;
  }
  if (!entry.head) {
    warnings.push(`WT-010 live HEAD missing for ${entry.path}`);
    return;
  }
  if (!gitInspector.objectExists(entry.path, bootstrapStartHead)) {
    warnings.push(`WT-010 bootstrapStartHead object missing for ${entry.path}: ${bootstrapStartHead.slice(0, 12)}`);
    return;
  }
  if (!gitInspector.objectExists(entry.path, entry.head)) {
    warnings.push(`WT-010 live HEAD object missing for ${entry.path}: ${entry.head.slice(0, 12)}`);
    return;
  }
  if (!gitInspector.isAncestorOrEqual(entry.path, bootstrapStartHead, entry.head)) {
    warnings.push(
      `WT-010 live HEAD is not a descendant of bootstrapStartHead for ${entry.path}: live=${entry.head.slice(0, 12)} bootstrapStartHead=${bootstrapStartHead.slice(0, 12)}`,
    );
    return;
  }
  logs.push(
    `[preflight] WT-010 live HEAD ${entry.head.slice(0, 12)} is at or after bootstrapStartHead ${bootstrapStartHead.slice(0, 12)}`,
  );
  if (gitInspector.hasGitOperationInProgress(entry.path)) {
    warnings.push(`WT-010 git operation in progress for ${entry.path}`);
  }
  if (!gitInspector.isWorktreeClean(entry.path)) {
    logs.push(
      `[preflight] WT-010 ACTIVE implementation lane dirty under ALLOWLIST_ONLY_DURING_IMPLEMENTATION: ${entry.path}`,
    );
  }
}

function evaluateWt009RegistryPreflight(registryDocument) {
  if (registryDocument.headingBlockedForRequired(WT009_ID)) {
    const headingErrors = [
      ...registryDocument.duplicateHeadingErrors.filter((error) => error.id === WT009_ID),
      ...registryDocument.malformedHeadingErrors.filter((error) => error.heading.includes(WT009_ID)),
      ...registryDocument.missingRequiredEntryErrors.filter((error) => error.id === WT009_ID),
    ];
    return { valid: false, errors: headingErrors };
  }

  const entry = registryDocument.entries.find((item) => item.id === WT009_ID);
  if (!entry) {
    return {
      valid: false,
      errors: [{ id: WT009_ID, field: 'id', kind: 'missing', message: `${WT009_ID} section missing` }],
    };
  }
  if (!entry.valid) {
    return { valid: false, errors: entry.errors };
  }
  const metadataErrors = validateWt009Metadata(entry);
  return { valid: metadataErrors.length === 0, errors: metadataErrors, entry };
}

function formatRegistryParserErrors(errors) {
  return errors.map((error) => `${error.id} ${error.field} ${error.kind}`).join('; ');
}

function formatRegistryHeadingErrors(errors) {
  return errors
    .map((error) => `${error.id ?? error.heading} heading ${error.kind} at line ${error.line ?? 'n/a'}`)
    .join('; ');
}

function parseWorktreeListPorcelain(text) {
  const entries = [];
  let current = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current) {
        current.detached = current.branch === null;
        entries.push(current);
      }
      current = { path: line.slice('worktree '.length), branch: null, head: null, detached: false };
    } else if (current && line.startsWith('HEAD ')) {
      current.head = line.slice('HEAD '.length);
    } else if (current && line.startsWith('branch ')) {
      current.branch = line.slice('branch refs/heads/'.length);
    }
  }
  if (current) {
    current.detached = current.branch === null;
    entries.push(current);
  }
  return entries;
}

function parseRegistryWorktreeEntries(registryText) {
  return parseRegistryDocument(registryText).entries;
}

function buildWt001SnapshotFromDocument(registryDocument) {
  if (registryDocument.headingBlockedForRequired(WT001_ID)) {
    const headingErrors = [
      ...registryDocument.duplicateHeadingErrors.filter((error) => error.id === WT001_ID),
      ...registryDocument.malformedHeadingErrors.filter((error) => error.heading.includes(WT001_ID)),
      ...registryDocument.missingRequiredEntryErrors.filter((error) => error.id === WT001_ID),
    ];
    return { valid: false, errors: headingErrors, snapshot: null };
  }

  const entry = registryDocument.entries.find((item) => item.id === WT001_ID);
  if (!entry) {
    return {
      valid: false,
      errors: [{ id: WT001_ID, field: 'id', kind: 'missing', message: `${WT001_ID} section missing` }],
      snapshot: null,
    };
  }
  if (!entry.valid) {
    return { valid: false, errors: entry.errors, snapshot: null };
  }
  const metadataErrors = validateWt001Metadata(entry);
  if (metadataErrors.length > 0) {
    return { valid: false, errors: metadataErrors, snapshot: null };
  }
  return {
    valid: true,
    errors: [],
    snapshot: {
      id: entry.id,
      path: entry.path,
      branch: entry.branch,
      headSha: entry.headSha,
      baselineRaw: entry.baselineRaw,
      baselineSha: entry.baselineSha,
      lifecycle: entry.lifecycle,
      purpose: entry.purpose,
      operationalState: entry.operationalState,
    },
  };
}

function parseWt001RegistrySnapshot(registryText) {
  const registryDocument = parseRegistryDocument(registryText);
  return buildWt001SnapshotFromDocument(registryDocument);
}

function getRegistryEntryByPath(registryEntries, livePath) {
  return registryEntries.find((entry) => entry.path === livePath) ?? null;
}

function normalizeTransitionValue(value) {
  return value.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function parsePostMergeNextSingleAction(currentStateText) {
  const rows = [];
  for (const line of currentStateText.split('\n')) {
    const match = line.match(/^\|\s*\*{0,2}postMergeNextSingleAction\*{0,2}\s*\|\s*(.+?)\s*\|\s*$/i);
    if (match) rows.push(match[1]);
  }
  if (rows.length === 0) return { valid: false, reason: 'postMergeNextSingleAction row missing' };
  if (rows.length > 1) return { valid: false, reason: 'duplicate postMergeNextSingleAction row' };
  const normalized = normalizeTransitionValue(rows[0]);
  const expected = normalizeTransitionValue(EXPECTED_POST_MERGE_NEXT_SINGLE_ACTION);
  if (normalized !== expected) {
    return { valid: false, reason: 'postMergeNextSingleAction value mismatch' };
  }
  return { valid: true, value: rows[0] };
}

function gitRun(args, cwd) {
  return spawnSync('git', args, { cwd, encoding: 'utf8' });
}

function gitObjectExists(sha, cwd) {
  if (!/^[0-9a-f]{40}$/i.test(sha)) return false;
  return gitRun(['cat-file', '-e', `${sha}^{commit}`], cwd).status === 0;
}

function isAncestorOrEqual(ancestor, descendant, cwd) {
  const a = ancestor.toLowerCase();
  const d = descendant.toLowerCase();
  if (a === d) return true;
  const result = gitRun(['merge-base', '--is-ancestor', a, d], cwd);
  return result.status === 0;
}

function createDefaultGitInspector() {
  return {
    objectExists(repositoryRoot, sha) {
      return gitObjectExists(sha, repositoryRoot);
    },
    isAncestorOrEqual(repositoryRoot, ancestorSha, descendantSha) {
      return isAncestorOrEqual(ancestorSha, descendantSha, repositoryRoot);
    },
    isWorktreeClean(repositoryRoot) {
      return isWorktreeClean(repositoryRoot);
    },
    hasGitOperationInProgress(repositoryRoot) {
      return hasGitOperationInProgress(repositoryRoot);
    },
    registryPathExists(registryPath) {
      return fs.existsSync(registryPath);
    },
    getRemoteFeatureHead(repositoryRoot, branch) {
      const result = gitRun(['ls-remote', 'origin', `refs/heads/${branch}`], repositoryRoot);
      if (result.status !== 0 || !result.stdout.trim()) return null;
      const line = result.stdout
        .trim()
        .split('\n')
        .find((candidate) => candidate.endsWith(`refs/heads/${branch}`));
      if (!line) return null;
      return line.split('\t')[0]?.trim().toLowerCase() ?? null;
    },
  };
}

function isWorktreeClean(worktreePath) {
  const result = gitRun(['status', '--porcelain'], worktreePath);
  return result.status === 0 && result.stdout.trim() === '';
}

function gitPathExists(worktreePath, gitPathName) {
  const result = gitRun(['rev-parse', '--git-path', gitPathName], worktreePath);
  if (result.status !== 0) return { exists: null, path: null, error: true };
  const resolved = result.stdout.trim();
  const absolute = path.isAbsolute(resolved) ? resolved : path.join(worktreePath, resolved);
  return { exists: fs.existsSync(absolute), path: absolute, error: false };
}

function hasGitOperationInProgress(worktreePath) {
  for (const gitPathName of GIT_OPERATION_PATHS) {
    const check = gitPathExists(worktreePath, gitPathName);
    if (check.error) return true;
    if (check.exists) return true;
  }
  return false;
}

function isRegistryEntryDoNotUse(entry) {
  return Boolean(entry.lifecycle?.includes('DO_NOT_USE'));
}

function isRegistryEntryLiveRequired(entry, gitInspector = null) {
  if (!entry?.path) return false;
  if (isRegistryEntryDoNotUse(entry)) return false;
  if (gitInspector?.registryPathExists) {
    return gitInspector.registryPathExists(entry.path);
  }
  return fs.existsSync(entry.path);
}

function isParkedSelfFunnelWt001(entry, registryEntry) {
  if (registryEntry?.id !== WT001_ID) return false;
  if (entry.path !== registryEntry.path) return false;
  if (registryEntry.operationalState?.includes('PARKED')) return true;
  return (
    registryEntry.lifecycle?.includes('PAUSED') &&
    !registryEntry.lifecycle?.includes('PRIMARY_MAIN_HOME')
  );
}

function collectRegistryUniquenessErrors(entries) {
  const errors = [];
  const pathOwners = new Map();
  const branchOwners = new Map();

  for (const entry of entries) {
    if (!entry.valid) continue;
    if (entry.path) {
      const owners = pathOwners.get(entry.path) ?? [];
      owners.push(entry.id);
      pathOwners.set(entry.path, owners);
    }
    if (entry.branch && !isRegistryEntryDoNotUse(entry)) {
      const owners = branchOwners.get(entry.branch) ?? [];
      owners.push(entry.id);
      branchOwners.set(entry.branch, owners);
    }
  }

  for (const [wtPath, owners] of pathOwners.entries()) {
    if (owners.length > 1) {
      errors.push({
        id: owners.join(','),
        field: 'path',
        kind: 'duplicate',
        message: `duplicate registry path ${wtPath}: ${owners.join(', ')}`,
      });
    }
  }

  for (const [branch, owners] of branchOwners.entries()) {
    if (owners.length > 1) {
      errors.push({
        id: owners.join(','),
        field: 'branch',
        kind: 'duplicate',
        message: `duplicate active branch ${branch}: ${owners.join(', ')}`,
      });
    }
  }

  const wt006 = entries.find((entry) => entry.id === WT006_ID);
  const wt010 = entries.find((entry) => entry.id === WT010_ID);
  if (wt006?.path && wt006.path !== WT006_EXPECTED_PATH) {
    errors.push({
      id: WT006_ID,
      field: 'path',
      kind: 'invalid',
      message: `${WT006_ID} must remain paid-lp worktree path`,
    });
  }
  if (wt010?.path && wt010.path !== WT010_EXPECTED_PATH) {
    errors.push({
      id: WT010_ID,
      field: 'path',
      kind: 'invalid',
      message: `${WT010_ID} must remain Product Authority Pack worktree path`,
    });
  }
  if (wt006?.path === WT010_EXPECTED_PATH || wt010?.path === WT006_EXPECTED_PATH) {
    errors.push({
      id: `${WT006_ID},${WT010_ID}`,
      field: 'path',
      kind: 'invalid',
      message: 'Authority Pack must not reuse WT-006 paid-lp registry path',
    });
  }

  return errors;
}

function shouldRunFullTopologyPreflight(registryDocument, liveEntries) {
  const hasWt010Heading = registryDocument.entries.some((entry) => entry.id === WT010_ID);
  return hasWt010Heading && liveEntries.length >= 9;
}

function collectSymmetricLiveRegistryErrors(liveEntries, registryEntries, gitInspector = null) {
  const errors = [];
  const livePaths = new Set(liveEntries.map((entry) => entry.path));
  const registryByPath = new Map(
    registryEntries.filter((entry) => entry.path).map((entry) => [entry.path, entry]),
  );

  for (const liveEntry of liveEntries) {
    const registryEntry = registryByPath.get(liveEntry.path);
    if (!registryEntry) {
      errors.push({
        id: 'registry',
        field: 'path',
        kind: 'missing',
        message: `live worktree missing from registry: ${liveEntry.path}`,
      });
      continue;
    }
    if (isRegistryEntryDoNotUse(registryEntry)) {
      errors.push({
        id: registryEntry.id,
        field: 'lifecycle',
        kind: 'invalid',
        message: `live worktree registered as DO_NOT_USE: ${liveEntry.path}`,
      });
    }
  }

  for (const registryEntry of registryEntries) {
    if (!isRegistryEntryLiveRequired(registryEntry, gitInspector)) continue;
    if (!livePaths.has(registryEntry.path)) {
      errors.push({
        id: registryEntry.id,
        field: 'path',
        kind: 'missing',
        message: `registered live worktree missing from git worktree list: ${registryEntry.path}`,
      });
    }
  }

  return errors;
}

function isSnapshotModeCandidate(entry, registryEntry, registryText, transitionParse) {
  if (registryEntry?.id !== WT001_ID) return false;
  if (entry.path !== registryEntry.path) return false;
  if (!registryEntry.lifecycle?.includes('PRIMARY_MAIN_HOME')) return false;
  if (!registryText.includes('Documented post-merge transition')) return false;
  if (!transitionParse.valid) return false;
  if (entry.branch === PRE_MERGE_SNAPSHOT_BRANCH || entry.branch === POST_MERGE_EXPECTED_BRANCH) {
    return false;
  }
  return Boolean(entry.branch && entry.branch === registryEntry.branch);
}

function isLegacyWt001State(entry, registryEntry, registryText) {
  if (registryEntry?.id !== WT001_ID) return false;
  if (entry.path !== registryEntry.path) return false;
  if (!registryText.includes('Documented post-merge transition')) return false;
  if (entry.branch === PRE_MERGE_SNAPSHOT_BRANCH && entry.branch === registryEntry.branch) {
    return true;
  }
  return (
    entry.branch === POST_MERGE_EXPECTED_BRANCH &&
    registryEntry.branch === PRE_MERGE_SNAPSHOT_BRANCH
  );
}

function evaluateWt001SnapshotPreflight({ entry, wt001Parse, registryText, transitionParse, gitInspector }) {
  if (!wt001Parse?.valid || !wt001Parse.snapshot) {
    return {
      pass: false,
      reason: wt001Parse?.errors?.length
        ? `registry parser failure: ${formatRegistryParserErrors(wt001Parse.errors)}`
        : 'WT-001 snapshot not parsed',
    };
  }
  const snapshot = wt001Parse.snapshot;
  if (snapshot.id !== WT001_ID) return { pass: false, reason: 'WT-001 snapshot not parsed' };
  if (entry.path !== snapshot.path) return { pass: false, reason: 'WT-001 path mismatch' };
  if (entry.detached || !entry.branch) return { pass: false, reason: 'WT-001 detached HEAD' };
  if (entry.branch !== snapshot.branch) return { pass: false, reason: 'WT-001 branch mismatch' };
  if (!registryText.includes('Documented post-merge transition')) {
    return { pass: false, reason: 'documented post-merge transition missing' };
  }
  if (!transitionParse.valid) return { pass: false, reason: transitionParse.reason };
  if (!snapshot.baselineSha) {
    return { pass: false, reason: 'baseline SHA missing from registry parser' };
  }
  if (!gitInspector.objectExists(entry.path, snapshot.baselineSha)) {
    return { pass: false, reason: 'baseline SHA object missing' };
  }
  if (!entry.head) return { pass: false, reason: 'live HEAD missing' };
  if (!gitInspector.isAncestorOrEqual(entry.path, snapshot.baselineSha, entry.head)) {
    return { pass: false, reason: 'live HEAD is not baseline or descendant' };
  }
  if (!gitInspector.isWorktreeClean(entry.path)) return { pass: false, reason: 'worktree dirty' };
  if (gitInspector.hasGitOperationInProgress(entry.path)) {
    return { pass: false, reason: 'git operation in progress' };
  }
  return { pass: true, snapshot };
}

function evaluateLegacyWt001Preflight(entry, registryEntry, warnings, logs) {
  const section = registryEntry.section;
  if (
    entry.branch === POST_MERGE_EXPECTED_BRANCH &&
    registryEntry.branch === PRE_MERGE_SNAPSHOT_BRANCH
  ) {
    logs.push(
      '[preflight] WT-001 on main — matches documented post-merge transition (update registry snapshot if not yet done)',
    );
  } else if (entry.branch === PRE_MERGE_SNAPSHOT_BRANCH && entry.branch === registryEntry.branch) {
    // pre-merge snapshot still valid
  } else if (entry.branch && registryEntry.branch && entry.branch !== registryEntry.branch) {
    warnings.push(`branch mismatch for ${entry.path}: live=${entry.branch}`);
  }

  if (entry.head && registryEntry.headSha && !section.includes(entry.head.slice(0, 12))) {
    if (entry.branch === POST_MERGE_EXPECTED_BRANCH) {
      logs.push(
        '[preflight] WT-001 HEAD differs from pre-merge snapshot — expected after merge; update registry',
      );
    } else if (entry.branch !== PRE_MERGE_SNAPSHOT_BRANCH) {
      warnings.push(`HEAD mismatch for ${entry.path}: live=${entry.head.slice(0, 12)}`);
    }
  }
}

function evaluateGenericRegistryPreflight(entry, registryEntry, warnings) {
  if (!registryEntry.valid) {
    warnings.push(`registry parser failure for ${entry.path}: ${formatRegistryParserErrors(registryEntry.errors)}`);
    return;
  }
  if (registryEntry.headValidationPolicy === WT011_HEAD_VALIDATION_DESCENDANT) {
    return;
  }
  if (entry.branch && registryEntry.branch && entry.branch !== registryEntry.branch) {
    warnings.push(`branch mismatch for ${entry.path}: live=${entry.branch}`);
  }
  if (entry.head && registryEntry.headSha) {
    const liveHead = entry.head.toLowerCase();
    const recorded = registryEntry.headSha.toLowerCase();
    if (liveHead !== recorded && !liveHead.startsWith(recorded.slice(0, 12))) {
      warnings.push(`HEAD mismatch for ${entry.path}: live=${entry.head.slice(0, 12)}`);
    }
  }
}

function evaluateWorktreePreflightWarnings(liveEntries, registryText, currentStateText, gitCwd, options = {}) {
  const warnings = [];
  const logs = [];
  const gitInspector = options.gitInspector ?? createDefaultGitInspector();
  const registryDocument = parseRegistryDocument(registryText);

  for (const error of registryDocument.duplicateHeadingErrors) {
    warnings.push(
      `registry heading duplicate for ${error.id} at line ${error.line}: ${error.heading}`,
    );
  }
  for (const error of registryDocument.malformedHeadingErrors) {
    warnings.push(
      `registry heading malformed at line ${error.line}: ${error.heading}`,
    );
  }
  for (const error of registryDocument.missingRequiredEntryErrors) {
    warnings.push(`registry heading missing for ${error.id}`);
  }
  for (const error of registryDocument.invalidHeadingLabelErrors) {
    warnings.push(
      `registry heading invalid label for ${error.id} at line ${error.line}: ${error.heading}`,
    );
  }
  for (const error of registryDocument.unclosedFenceErrors) {
    warnings.push(
      `registry fenced code block unclosed at line ${error.line}: ${error.message}`,
    );
  }

  const wt001Parse = buildWt001SnapshotFromDocument(registryDocument);
  const wt009Preflight = evaluateWt009RegistryPreflight(registryDocument);
  if (!wt009Preflight.valid) {
    for (const error of wt009Preflight.errors) {
      warnings.push(`WT-009 registry metadata validation failed: ${error.id} ${error.field} ${error.kind}`);
    }
  }

  const wt010Preflight = registryDocument.entries.some((entry) => entry.id === WT010_ID)
    ? evaluateWt010RegistryPreflight(registryDocument)
    : { valid: true, errors: [] };
  if (!wt010Preflight.valid) {
    for (const error of wt010Preflight.errors) {
      warnings.push(`WT-010 registry metadata validation failed: ${error.id} ${error.field} ${error.kind}`);
    }
  }

  const wt011Preflight = registryDocument.entries.some((entry) => entry.id === WT011_ID)
    ? evaluateWt011RegistryPreflight(registryDocument)
    : { valid: true, errors: [] };
  if (!wt011Preflight.valid) {
    for (const error of wt011Preflight.errors) {
      warnings.push(`WT-011 registry metadata validation failed: ${error.id} ${error.field} ${error.kind}`);
    }
  }

  const activeLaneCount = countPrimaryActiveLanes(registryDocument.entries);
  if (activeLaneCount !== 1) {
    warnings.push(`registry must contain exactly one primary ACTIVE lane; found ${activeLaneCount}`);
  }

  for (const error of collectRegistryUniquenessErrors(registryDocument.entries)) {
    warnings.push(`registry uniqueness validation failed: ${error.message}`);
  }

  const transitionParse = parsePostMergeNextSingleAction(currentStateText);
  const registryEntries = registryDocument.entries;

  if (options.requireFullTopology || shouldRunFullTopologyPreflight(registryDocument, liveEntries)) {
    for (const error of collectSymmetricLiveRegistryErrors(liveEntries, registryEntries, gitInspector)) {
      warnings.push(error.message);
    }
  }

  for (const entry of liveEntries) {
    const registryEntry = getRegistryEntryByPath(registryEntries, entry.path);
    if (!registryEntry) {
      warnings.push(`live worktree missing from registry: ${entry.path}`);
      continue;
    }

    if (entry.path === WT009_EXPECTED_PATH) {
      if (!wt009Preflight.valid) {
        continue;
      }
      if (entry.branch && entry.branch !== WT009_EXPECTED_BRANCH) {
        warnings.push(`WT-009 branch mismatch for ${entry.path}: live=${entry.branch}`);
      }
      if (entry.head && entry.head.toLowerCase() !== WT009_EXPECTED_HEAD) {
        warnings.push(`WT-009 HEAD mismatch for ${entry.path}: live=${entry.head.slice(0, 12)}`);
      }
      continue;
    }

    if (registryEntry.id === WT010_ID) {
      evaluateWt010ActiveLanePreflight(entry, registryEntry, warnings, logs, gitInspector);
      continue;
    }

    if (registryEntry.id === WT011_ID) {
      evaluateWt011ActiveLanePreflight(entry, registryEntry, warnings, logs, gitInspector);
      continue;
    }

    if (registryDocument.headingBlockedForRequired(WT001_ID)) {
      warnings.push(
        `WT-001 snapshot preflight blocked by registry heading validation: ${formatRegistryHeadingErrors([
          ...registryDocument.duplicateHeadingErrors.filter((error) => error.id === WT001_ID),
          ...registryDocument.malformedHeadingErrors.filter((error) => error.heading.includes(WT001_ID)),
          ...registryDocument.invalidHeadingLabelErrors.filter((error) => error.id === WT001_ID),
          ...registryDocument.unclosedFenceErrors,
          ...registryDocument.missingRequiredEntryErrors.filter((error) => error.id === WT001_ID),
        ])}`,
      );
      continue;
    }

    if (isSnapshotModeCandidate(entry, registryEntry, registryText, transitionParse)) {
      const snapshotResult = evaluateWt001SnapshotPreflight({
        entry,
        wt001Parse,
        registryText,
        transitionParse,
        gitInspector,
      });
      if (snapshotResult.pass) {
        logs.push(
          `[preflight] WT-001 HEAD ${entry.head.slice(0, 12)} is at or after registry baseline snapshot ${snapshotResult.snapshot.baselineSha.slice(0, 12)}`,
        );
      } else {
        warnings.push(`WT-001 snapshot preflight failed for ${entry.path}: ${snapshotResult.reason}`);
      }
      continue;
    }

    if (isLegacyWt001State(entry, registryEntry, registryText)) {
      if (!registryEntry.valid) {
        warnings.push(
          `WT-001 registry parser failure for ${entry.path}: ${formatRegistryParserErrors(registryEntry.errors)}`,
        );
        continue;
      }
      evaluateLegacyWt001Preflight(entry, registryEntry, warnings, logs);
      continue;
    }

    if (isParkedSelfFunnelWt001(entry, registryEntry)) {
      evaluateGenericRegistryPreflight(entry, registryEntry, warnings);
      continue;
    }

    if (registryEntry.id === WT001_ID && entry.path === registryEntry.path) {
      warnings.push(
        `WT-001 state not authorized for ${entry.path}: branch=${entry.branch ?? 'detached'}`,
      );
      continue;
    }

    evaluateGenericRegistryPreflight(entry, registryEntry, warnings);
  }

  return { warnings, logs };
}

function runStrictLocalWorktreePreflight() {
  const result = gitRun(['worktree', 'list', '--porcelain'], ROOT);
  if (result.status !== 0) {
    console.error('[preflight] git worktree list unavailable — cannot verify local topology');
    process.exit(1);
  }

  const live = parseWorktreeListPorcelain(result.stdout);
  const registry = read('docs/ssot/M55_WORKTREE_REGISTRY.md');
  const currentState = read('docs/ssot/M55_CURRENT_STATE.md');
  const { warnings, logs } = evaluateWorktreePreflightWarnings(live, registry, currentState, ROOT, {
    requireFullTopology: true,
  });

  for (const line of logs) console.log(line);

  if (warnings.length > 0) {
    console.error('PASS/FAIL: FAIL');
    console.error('[preflight] local worktree registry strict validation failed:');
    for (const w of warnings) console.error(`- ${w}`);
    process.exit(1);
  }

  console.log('PASS/FAIL: PASS');
  console.log(
    `[preflight] local live worktree topology matches registry (${live.length} live / strict symmetric validation)`,
  );
  process.exit(0);
}

function checkPostMergeHandoff() {
  const currentState = read('docs/ssot/M55_CURRENT_STATE.md');
  const registry = read('docs/ssot/M55_WORKTREE_REGISTRY.md');
  const agents = read('AGENTS.md');

  if (!currentState.includes('postMergeActiveLane')) {
    fail('M55_CURRENT_STATE.md must define postMergeActiveLane');
  }
  if (!currentState.includes('個人無料→個人Premiumファネルの一括実装')) {
    fail('postMergeActiveLane must be Self free→Premium lane');
  }
  if (!currentState.includes('postMergeNextSingleAction')) {
    fail('M55_CURRENT_STATE.md must define postMergeNextSingleAction');
  }
  if (!currentState.includes('NOT_YET')) {
    fail('HOME final SSOT must remain NOT_YET');
  }
  if (!currentState.includes('Pair implementation') && !currentState.includes('pairPremium')) {
    fail('M55_CURRENT_STATE.md must record Pair as later lane');
  }
  if (!currentState.includes('Stripe') || !currentState.includes('Pair runtime')) {
    fail('M55_CURRENT_STATE.md must prohibit Stripe/Pair ahead of Self funnel');
  }
  if (!currentState.includes('Completed GREEN') && !currentState.includes('GREEN')) {
    fail('M55_CURRENT_STATE.md must record SSOT lane as completed GREEN');
  }
  if (!registry.includes('Documented post-merge transition')) {
    fail('registry must document post-merge transition for WT-001');
  }
  if (!agents.includes('Documented post-merge transition')) {
    fail('AGENTS.md must distinguish unexplained drift vs documented post-merge transition');
  }
}

const COMMERCIAL_QUALITY_CONTRACT_PRIVACY_PHRASES = [
  'raw date of birth',
  'birth year / month / day',
  'answer text',
  'answer IDs / facet IDs / internal answer selectors',
  'result text',
  'report text',
  'consultation text',
  'nickname',
  'email address',
  'user ID',
  'Clerk ID',
  'checkout / session identifiers',
  'arbitrary personal payloads',
  'arbitrary unreviewed properties',
  'Only explicitly allowlisted, non-sensitive funnel metadata may be sent',
];

const COMMERCIAL_QUALITY_CONTRACT_HUMAN_LOCK_PHRASES = [
  'automated tests',
  'build / typecheck success',
  'generated screenshots without Human review',
  'screenshot capture completion',
  'visual-regression automation',
  'AI / model evaluation',
  'automated scoring',
  'automated tests prove implementation properties only',
  'screenshots are evidence only after a Human reviews them',
  '`USER_VISIBLE_CLOSED_GREEN` remains **impossible** until explicit Human commercial-quality approval is recorded',
  'automated_tests_replace_human_approval = false',
  'generated_screenshots_replace_human_approval = false',
  'human_visual_review_required_for_screenshot_evidence = true',
];

const COMMERCIAL_QUALITY_CONTRACT_MACHINE_FLAG_PHRASES = [
  'analytics_forbidden_payloads_include_answer_ids = true',
  'analytics_forbidden_payloads_include_nickname = true',
  'analytics_forbidden_payloads_include_email = true',
  'analytics_forbidden_payloads_include_user_id = true',
  'analytics_forbidden_payloads_include_arbitrary_personal_payload = true',
];

const COMMERCIAL_QUALITY_CONTRACT_BASE_PHRASES = [
  'Commercialization and sustainable revenue',
  'USER_VISIBLE_CLOSED_GREEN',
  'Human visual lock is mandatory',
  '320 / 390 / desktop',
  'Technical GREEN alone is **insufficient**',
  'Cursor or Codex self-report alone',
  'no hidden or dead commercial path',
  'no unsupported precision claim',
  'Commercial success **cannot** be claimed before observed market data',
  'Do **not** freeze invented conversion thresholds',
  'entry started',
  'input completed',
  'free result viewed',
  'Premium bridge viewed',
  'plan selected',
  'checkout started',
  'Premium Report opened',
  'P0 / P1 material',
  'P2',
];

const COMMERCIAL_QUALITY_STATE_SEPARATION_PHRASES = [
  'merged_runtime_is_committed_authority = true',
  'branch_local_state_is_not_merged_runtime = true',
  'normative_target_may_precede_runtime = true',
  'global_verifier_requires_unmerged_runtime = false',
  'runtime_specific_validation_owned_by_lane = true',
  'post_merge_state_transition_required = true',
  'Merged runtime (`origin/main`',
  'Target contract',
  'Branch-local Self funnel',
  'not merged main runtime',
  'documented post-merge transition',
  'Not merged into `origin/main` yet',
];

function collectCurrentStateLifecycleFailures(currentState) {
  const failures = [];
  for (const phrase of COMMERCIAL_QUALITY_STATE_SEPARATION_PHRASES) {
    if (!currentState.includes(phrase)) {
      failures.push(`M55_CURRENT_STATE.md missing lifecycle-independent state phrase: ${phrase}`);
    }
  }
  if (/PR\s*#\s*\d+\s+OPEN/i.test(currentState)) {
    failures.push('M55_CURRENT_STATE.md must not encode PR-number OPEN lifecycle as machine authority');
  }
  return failures;
}

function validateCurrentStateLifecycleText(currentState) {
  const failures = collectCurrentStateLifecycleFailures(currentState);
  return { ok: failures.length === 0, failures };
}

function collectCommercialQualityContractPhraseFailures(contract) {
  const failures = [];
  const allPhrases = [
    ...COMMERCIAL_QUALITY_CONTRACT_BASE_PHRASES,
    ...COMMERCIAL_QUALITY_CONTRACT_PRIVACY_PHRASES,
    ...COMMERCIAL_QUALITY_CONTRACT_HUMAN_LOCK_PHRASES,
    ...COMMERCIAL_QUALITY_CONTRACT_MACHINE_FLAG_PHRASES,
  ];

  for (const phrase of allPhrases) {
    if (!contract.includes(phrase)) {
      failures.push(`M55_COMMERCIAL_QUALITY_CONTRACT.md missing required phrase: ${phrase}`);
    }
  }

  return failures;
}

function validateCommercialQualityContractText(contract) {
  return {
    ok: collectCommercialQualityContractPhraseFailures(contract).length === 0,
    failures: collectCommercialQualityContractPhraseFailures(contract),
  };
}

function checkCommercialQualityContract() {
  const contract = read('docs/ssot/M55_COMMERCIAL_QUALITY_CONTRACT.md');
  const agents = read('AGENTS.md');
  const currentState = read('docs/ssot/M55_CURRENT_STATE.md');
  const roadmap = read('docs/ssot/M55_ROADMAP.md');
  const selfFunnel = read('docs/ssot/M55_SELF_FUNNEL_CONTRACT.md');

  for (const message of collectCommercialQualityContractPhraseFailures(contract)) {
    fail(message);
  }

  if (!agents.includes('M55_COMMERCIAL_QUALITY_CONTRACT.md')) {
    fail('AGENTS.md must reference M55_COMMERCIAL_QUALITY_CONTRACT.md in read order');
  }
  if (!agents.includes('USER_VISIBLE_CLOSED_GREEN')) {
    fail('AGENTS.md must reference USER_VISIBLE_CLOSED_GREEN closure standard');
  }
  if (!currentState.includes('M55_COMMERCIAL_QUALITY_CONTRACT.md')) {
    fail('M55_CURRENT_STATE.md must record global commercial quality contract');
  }
  if (!currentState.includes('INPUT_EXPERIENCE_COMMERCIAL_FINALIZATION_GREEN_READY_FOR_HUMAN_LOCK')) {
    fail('M55_CURRENT_STATE.md must record Self input experience status');
  }
  for (const message of collectCurrentStateLifecycleFailures(currentState)) {
    fail(message);
  }
  if (!roadmap.includes('M55_COMMERCIAL_QUALITY_CONTRACT.md')) {
    fail('M55_ROADMAP.md must reference global commercial quality contract');
  }
  if (!selfFunnel.includes('USER_VISIBLE_CLOSED_GREEN')) {
    fail('M55_SELF_FUNNEL_CONTRACT.md must reference USER_VISIBLE_CLOSED_GREEN');
  }
}

const AUTHORITY_PACK_COMMIT_ONE_SHA = 'f9daeb1f38205ca6d6eebb8e90c0a19f4ad58704';
const AUTHORITY_PACK_COMMIT_TWO_SHA = '2761706505576a2baeacbdd40acd130a1f70e81b';
const AUTHORITY_PACK_COMMIT_THREE_SHA = 'fae04444618e2ae36e6fd813ddfddeee975b66c4';
const AUTHORITY_PACK_SUPERSEDED_COMMIT_ONE_SHA = '178dadab4697f4797b8f00fd473d08a135b3ec4e';
const AUTHORITY_PACK_SAFETY_REF_SHA = '844c5bbb73795b2f162e29516be79fb401c3b55e';

const AUTHORITY_PACK_BOOTSTRAP_START_HEAD = 'e6afe67262ebcee3353a3a43713f7ecf8369f26f';

const AUTHORITY_HISTORY_KIND_BY_SEQUENCE = Object.freeze({
  0: 'INITIALIZATION',
  1: 'AUTHORITY_PROCESS_INCIDENT',
  2: 'BOOTSTRAP_RECONCILIATION',
});

/**
 * Structurally parse authority-history JSONL for transition invariants.
 * @param {string} historyText
 * @returns {{ records: object[], bySequence: Map<number, object>, reconciled: boolean }}
 */
function parseAuthorityHistoryTransitionJsonl(historyText) {
  const lines = historyText.split('\n');
  /** @type {object[]} */
  const records = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === '') continue;

    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      throw new Error(`authority-history JSONL line ${index + 1}: malformed JSON`);
    }

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`authority-history JSONL line ${index + 1}: record must be an object`);
    }
    if (!Number.isInteger(parsed.sequence)) {
      throw new Error(`authority-history JSONL line ${index + 1}: sequence must be integer`);
    }
    if (!Object.hasOwn(AUTHORITY_HISTORY_KIND_BY_SEQUENCE, parsed.sequence)) {
      throw new Error(`Unexpected authority-history sequence: ${parsed.sequence}`);
    }

    records.push(parsed);
  }

  const bySequence = new Map();
  for (const record of records) {
    if (bySequence.has(record.sequence)) {
      throw new Error(`authority-history JSONL duplicate sequence ${record.sequence}`);
    }
    bySequence.set(record.sequence, record);
  }

  for (const sequence of [0, 1, 2]) {
    if (!bySequence.has(sequence)) {
      throw new Error(`authority-history JSONL missing sequence ${sequence}`);
    }
    const expectedKind = AUTHORITY_HISTORY_KIND_BY_SEQUENCE[sequence];
    if (bySequence.get(sequence).kind !== expectedKind) {
      throw new Error(
        `authority-history JSONL sequence ${sequence} kind must be ${expectedKind}`,
      );
    }
  }

  if (records.length !== 3 || bySequence.size !== 3) {
    throw new Error('authority-history JSONL must contain exactly sequences 0, 1, and 2');
  }

  return {
    records,
    bySequence,
    reconciled: bySequence.get(2).kind === 'BOOTSTRAP_RECONCILIATION',
  };
}

function historyHasBootstrapReconciliation(historyText) {
  return parseAuthorityHistoryTransitionJsonl(historyText).reconciled;
}

function readObservedOriginMainSha() {
  if (!exists('.product-authority/observations.json')) return null;
  try {
    const observations = JSON.parse(read('.product-authority/observations.json'));
    return observations?.repository?.lastObservedOriginMainSha?.value ?? null;
  } catch {
    return null;
  }
}

function readObservationTimestamp() {
  if (!exists('.product-authority/observations.json')) return null;
  try {
    const observations = JSON.parse(read('.product-authority/observations.json'));
    return observations?.observationMeta?.lastObservedAt?.value ?? null;
  } catch {
    return null;
  }
}

function collectAuthorityPackTransitionFailures({
  currentStateText = read('docs/ssot/M55_CURRENT_STATE.md'),
  registryText = read('docs/ssot/M55_WORKTREE_REGISTRY.md'),
  roadmapText = read('docs/ssot/M55_ROADMAP.md'),
  historyText = exists('.product-authority/authority-history.jsonl')
    ? read('.product-authority/authority-history.jsonl')
    : '',
  handoffJsonText = exists('.product-authority/generated/handoff.json')
    ? read('.product-authority/generated/handoff.json')
    : '',
  authorityHeaderText = exists('.product-authority/generated/authority-header.md')
    ? read('.product-authority/generated/authority-header.md')
    : '',
  observedOriginMainSha = readObservedOriginMainSha(),
  observationTimestamp = readObservationTimestamp(),
} = {}) {
  const failures = [];
  let reconciled = false;
  if (historyText.trim() !== '') {
    try {
      reconciled = parseAuthorityHistoryTransitionJsonl(historyText).reconciled;
    } catch (error) {
      failures.push(`authority-history JSONL transition parse failed: ${error.message}`);
    }
  }

  if (reconciled) {
    if (/sequence 0 only/i.test(currentStateText)) {
      failures.push('M55_CURRENT_STATE.md must not describe sequence 0 only when history has sequences 0–2');
    }
    if (/not yet reconciled/i.test(currentStateText)) {
      failures.push('M55_CURRENT_STATE.md must not say bootstrap reconciliation is pending when sequence 2 exists');
    }
    if (/reconciliation pending/i.test(currentStateText)) {
      failures.push('M55_CURRENT_STATE.md must not say reconciliation is pending when sequence 2 exists');
    }
    if (/Not active yet/i.test(currentStateText)) {
      failures.push('M55_CURRENT_STATE.md must not say steady-state enforcement is not active when reconciled');
    }
    if (/reconciliation candidate pending Commit 2/i.test(registryText)) {
      failures.push('M55_WORKTREE_REGISTRY.md must not say reconciliation Commit 2 is pending when sequence 2 exists');
    }
    if (/no push during bootstrap\/reconciliation gates/i.test(registryText)) {
      failures.push('M55_WORKTREE_REGISTRY.md must not describe remote branch as absent after PR #79 push');
    }
    if (/remote branch absent|unpublished/i.test(registryText) && registryText.includes('PR #79')) {
      failures.push('M55_WORKTREE_REGISTRY.md must not describe PR #79 branch as absent or unpublished');
    }
  }

  if (!currentStateText.includes('sequences **0–2**') && !currentStateText.includes('sequences 0–2')) {
    failures.push('M55_CURRENT_STATE.md must document Product Authority history sequences 0–2');
  }
  if (!currentStateText.includes('PR #79')) {
    failures.push('M55_CURRENT_STATE.md must record PR #79 transition snapshot');
  }
  if (!currentStateText.includes(AUTHORITY_PACK_COMMIT_THREE_SHA)) {
    failures.push('M55_CURRENT_STATE.md must record CI-portability Commit 3 SHA');
  }
  if (/merged runtime.*fae0444/i.test(currentStateText)) {
    failures.push('M55_CURRENT_STATE.md must not describe PR feature tip fae0444 as merged runtime');
  }
  if (/PR tip.*merged runtime|merged runtime.*PR tip/i.test(currentStateText)) {
    failures.push('M55_CURRENT_STATE.md must not conflate PR feature tip with merged runtime');
  }

  if (observedOriginMainSha) {
    if (!currentStateText.includes(observedOriginMainSha)) {
      failures.push('M55_CURRENT_STATE.md must record the latest observed origin/main SHA');
    }
    if (
      new RegExp(`last observed origin/main.*${AUTHORITY_PACK_BOOTSTRAP_START_HEAD}`, 'i').test(
        currentStateText,
      )
    ) {
      failures.push(
        'M55_CURRENT_STATE.md must not label bootstrapStartHead as the last observed origin/main',
      );
    }
    if (
      new RegExp(`Current live remote main.*${AUTHORITY_PACK_BOOTSTRAP_START_HEAD}`, 'i').test(
        registryText,
      )
    ) {
      failures.push(
        'M55_WORKTREE_REGISTRY.md must not label bootstrapStartHead as current live remote main',
      );
    }
    if (
      new RegExp(
        `Merged runtime \\(\`origin/main\` @ \`${AUTHORITY_PACK_BOOTSTRAP_START_HEAD}\`\\)`,
        'i',
      ).test(currentStateText)
    ) {
      failures.push(
        'M55_CURRENT_STATE.md must not present bootstrapStartHead as merged runtime origin/main',
      );
    }
    if (observationTimestamp && !currentStateText.includes(observationTimestamp)) {
      failures.push('M55_CURRENT_STATE.md must record the latest origin/main observation timestamp');
    }
    if (!registryText.includes(observedOriginMainSha)) {
      failures.push('M55_WORKTREE_REGISTRY.md must record the latest observed origin/main SHA');
    }
  }

  if (!registryText.includes(AUTHORITY_PACK_COMMIT_ONE_SHA)) {
    failures.push('M55_WORKTREE_REGISTRY.md must record rewritten Commit 1 f9daeb1');
  }
  if (!registryText.includes(AUTHORITY_PACK_COMMIT_THREE_SHA)) {
    failures.push('M55_WORKTREE_REGISTRY.md must record Commit 3 / PR tip fae0444');
  }
  if (!registryText.includes('PR #79')) {
    failures.push('M55_WORKTREE_REGISTRY.md must record PR #79');
  }
  if (!registryText.includes(AUTHORITY_PACK_BOOTSTRAP_START_HEAD)) {
    failures.push('M55_WORKTREE_REGISTRY.md must retain bootstrapStartHead as historical lane anchor');
  }

  const wt010Section = registryText.split('### WT-010')[1]?.split('### ')[0] ?? '';
  if (new RegExp(AUTHORITY_PACK_SUPERSEDED_COMMIT_ONE_SHA).test(wt010Section)) {
    if (!/superseded|safety-ref|Push Protection rewrite|retained local history/i.test(wt010Section)) {
      failures.push('WT-010 registry must not present superseded Commit 1 178dadab as active provenance');
    }
  }
  if (new RegExp(AUTHORITY_PACK_SAFETY_REF_SHA).test(wt010Section)) {
    if (!/safety-ref|retained local history|not active branch provenance/i.test(wt010Section)) {
      failures.push('WT-010 registry must not treat safety-ref SHA as active branch provenance');
    }
  }
  if (
    new RegExp(
      `${AUTHORITY_PACK_SAFETY_REF_SHA}.*active branch tip|active branch tip.*${AUTHORITY_PACK_SAFETY_REF_SHA}`,
      'i',
    ).test(wt010Section)
  ) {
    failures.push('WT-010 registry must not interpret safety-ref SHA as active branch tip');
  }

  if (
    /Active lane.*個人無料→個人Premium/.test(roadmapText) &&
    !roadmapText.includes('SUPERSEDED (2026-07-26)')
  ) {
    failures.push('M55_ROADMAP.md must mark superseded Self-funnel authority block explicitly');
  }
  if (!roadmapText.includes('authority-data correction')) {
    failures.push('M55_ROADMAP.md must identify Authority Pack authority-data correction as current lane');
  }

  if (handoffJsonText) {
    if (/\"nextGate\"/.test(handoffJsonText)) {
      failures.push('generated handoff.json must not contain unsourced nextGate');
    }
    if (/BOOTSTRAP-DIFF-REVIEW/.test(handoffJsonText)) {
      failures.push('generated handoff.json must not retain stale Bootstrap Diff Review gate text');
    }
  }
  if (authorityHeaderText) {
    if (/Next exact gate/i.test(authorityHeaderText)) {
      failures.push('generated authority-header.md must not synthesize operational next gate copy');
    }
    if (/BOOTSTRAP-DIFF-REVIEW/.test(authorityHeaderText)) {
      failures.push('generated authority-header.md must not retain stale Bootstrap Diff Review gate text');
    }
    if (observedOriginMainSha && authorityHeaderText.includes(AUTHORITY_PACK_BOOTSTRAP_START_HEAD)) {
      if (
        new RegExp(
          `last observed origin/main SHA:\\s*${AUTHORITY_PACK_BOOTSTRAP_START_HEAD}`,
          'i',
        ).test(authorityHeaderText)
      ) {
        failures.push(
          'generated authority-header.md must not present stale bootstrapStartHead as last observed origin/main',
        );
      }
    }
  }

  for (const adapter of ['codex.md', 'cursor.md', 'generic-agent.md']) {
    const rel = `.product-authority/generated/adapters/${adapter}`;
    if (!exists(rel)) continue;
    const text = read(rel);
    if (/nextGate|Next exact gate|BOOTSTRAP-DIFF-REVIEW/i.test(text)) {
      failures.push(`generated adapter ${adapter} must not synthesize operational gate text`);
    }
  }

  return failures;
}

function checkAuthorityPackTransitionConsistency() {
  for (const message of collectAuthorityPackTransitionFailures()) {
    fail(message);
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
  if (!src.includes('collectPremiumPublicTerminologyViolations')) {
    fail('verifier must scan public source boundaries for 保存版 terminology');
  }
}

const PREMIUM_PUBLIC_TERMINOLOGY_SCAN_ROOTS = ['app', 'components', 'lib/m55'];

/** Exact-file skips for legacy-stripping / replacement catalogs (not directory-wide). */
const PREMIUM_PUBLIC_TERMINOLOGY_SKIP_PATH_PARTS = [
  'lib/m55/paidReportPublicDisplayTerminology.ts',
  'lib/m55/consult/normalizeConsultReplyDisplayText.ts',
  'lib/m55/freeResult/buildFreeDepthAnalysisV1.ts',
  'docs/',
  'migrations/',
  'node_modules/',
];

/**
 * Exact known-match allowlist for authoritative internal registry occurrences.
 * Directory-wide exemptions are prohibited; each entry must pin file + line signature.
 */
const PREMIUM_PUBLIC_TERMINOLOGY_ALLOWED_OCCURRENCES = [
  {
    file: 'lib/m55/contracts/m55CommercialFunnelContract.ts',
    match: '保存版',
    lineMustMatch: /internalOnlyTerms:\s*\[\s*'保存版'\s*\]/,
  },
  {
    file: 'lib/m55/contracts/m55CommercialFunnelContract.ts',
    match: '保存版',
    lineMustMatch:
      /description:\s*'「保存版」public copy が 0 — terminology guard \+ stored snapshot display normalizer'/,
  },
];

const PREMIUM_PUBLIC_TERMINOLOGY_SKIP_PATH_SUFFIXES = [
  '.test.ts',
  '.local.test.ts',
  '.selfcheck.mjs',
];

const PREMIUM_PUBLIC_TERMINOLOGY_PROHIBITED = [
  { pattern: /保存版ライト/, label: '保存版ライト' },
  { pattern: /保存版FULL/, label: '保存版FULL' },
  { pattern: /保存版フル/, label: '保存版フル' },
  { pattern: /保存版レポート/, label: '保存版レポート' },
  { pattern: /保存版/, label: '保存版' },
];

function shouldScanPremiumPublicTerminologyFile(relPath) {
  if (!/\.(tsx?|jsx?)$/.test(relPath)) return false;
  const normalized = relPath.replace(/\\/g, '/');
  if (PREMIUM_PUBLIC_TERMINOLOGY_SKIP_PATH_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) {
    return false;
  }
  if (PREMIUM_PUBLIC_TERMINOLOGY_SKIP_PATH_PARTS.some((part) => normalized.includes(part))) {
    return false;
  }
  return PREMIUM_PUBLIC_TERMINOLOGY_SCAN_ROOTS.some(
    (root) => normalized === root || normalized.startsWith(`${root}/`),
  );
}

function isAllowedPremiumPublicTerminologyOccurrence(relPath, matchLabel, rawLine) {
  const normalized = relPath.replace(/\\/g, '/');
  return PREMIUM_PUBLIC_TERMINOLOGY_ALLOWED_OCCURRENCES.some(
    (entry) =>
      entry.file === normalized &&
      entry.match === matchLabel &&
      entry.lineMustMatch.test(rawLine),
  );
}

function stripLineComments(line) {
  let inSingle = false;
  let inDouble = false;
  let inBack = false;
  let escaped = false;
  for (let i = 0; i < line.length - 1; i += 1) {
    const ch = line[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (!inDouble && !inBack && ch === "'") {
      inSingle = !inSingle;
      continue;
    }
    if (!inSingle && !inBack && ch === '"') {
      inDouble = !inDouble;
      continue;
    }
    if (!inSingle && !inDouble && ch === '`') {
      inBack = !inBack;
      continue;
    }
    if (!inSingle && !inDouble && !inBack && ch === '/' && line[i + 1] === '/') {
      return line.slice(0, i);
    }
  }
  return line;
}

function extractQuotedSegments(line) {
  const segments = [];
  const re = /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g;
  let match = re.exec(line);
  while (match) {
    segments.push(match[0]);
    match = re.exec(line);
  }
  return segments;
}

function isCommentOnlyLine(rawLine) {
  const trimmed = rawLine.trim();
  return (
    trimmed.startsWith('//') ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('*') ||
    trimmed.endsWith('*/')
  );
}

function walkPremiumTerminologyFiles(dir, rootDir, out) {
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.git') continue;
      walkPremiumTerminologyFiles(abs, rootDir, out);
      continue;
    }
    const rel = path.relative(rootDir, abs).replace(/\\/g, '/');
    if (shouldScanPremiumPublicTerminologyFile(rel)) out.push({ abs, rel });
  }
}

function collectPremiumPublicTerminologyViolations(rootDir = ROOT) {
  const violations = [];
  const files = [];
  for (const root of PREMIUM_PUBLIC_TERMINOLOGY_SCAN_ROOTS) {
    const absRoot = path.join(rootDir, root);
    if (fs.existsSync(absRoot)) walkPremiumTerminologyFiles(absRoot, rootDir, files);
  }

  for (const { abs, rel } of files) {
    const lines = fs.readFileSync(abs, 'utf8').split('\n');
    lines.forEach((rawLine, index) => {
      if (isCommentOnlyLine(rawLine)) return;
      const line = stripLineComments(rawLine);
      const segments = extractQuotedSegments(line);
      const scanTargets = segments.length > 0 ? segments.map((s) => s.slice(1, -1)) : [line];

      for (const target of scanTargets) {
        for (const { pattern, label } of PREMIUM_PUBLIC_TERMINOLOGY_PROHIBITED) {
          if (pattern.test(target)) {
            if (isAllowedPremiumPublicTerminologyOccurrence(rel, label, rawLine)) {
              return;
            }
            violations.push({
              file: rel,
              line: index + 1,
              match: label,
              text: rawLine.trim(),
            });
            return;
          }
        }
      }
    });
  }
  return violations;
}

function checkPremiumPublicTerminologyBoundary() {
  const violations = collectPremiumPublicTerminologyViolations();
  if (violations.length > 0) {
    for (const v of violations) {
      fail(`public 保存版 terminology: ${v.file}:${v.line} match=${v.match} ${v.text}`);
    }
  }
}

function checkEnforcedHozonbanAssertion(data) {
  const contract = read('lib/m55/contracts/m55CommercialFunnelContract.ts');
  if (!contract.includes('M55_ENFORCED_RUNTIME_ASSERTIONS')) {
    fail('machine contract must define M55_ENFORCED_RUNTIME_ASSERTIONS');
  }
  if (!/no_public_hozonban_copy[\s\S]*enforcement:\s*'CLOSED_GREEN'/.test(contract)) {
    fail('no_public_hozonban_copy must be CLOSED_GREEN in M55_ENFORCED_RUNTIME_ASSERTIONS');
  }
  if (/no_public_hozonban_copy/.test(contract.split('M55_DEFERRED_RUNTIME_ASSERTIONS')[1] ?? '')) {
    fail('no_public_hozonban_copy must not remain in M55_DEFERRED_RUNTIME_ASSERTIONS');
  }
  if (data?.current?.selfFree?.legacyTermsInPublicCopy === true) {
    fail('M55_CURRENT_RUNTIME_STATE must record legacyTermsInPublicCopy=false after terminology enforcement');
  }
}

function main() {
  checkRequiredFiles();
  const data = loadContractFacts();
  checkMachineContract(data);
  checkDocsParity(data);
  checkAgentsReadOrder();
  checkWorktreeRegistry();
  checkPostMergeHandoff();
  checkCommercialQualityContract();
  checkAuthorityPackTransitionConsistency();
  checkDeferredNotEnforcedAsPass();
  checkEnforcedHozonbanAssertion(data);
  checkPremiumPublicTerminologyBoundary();

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

export {
  WT001_ID,
  WT006_ID,
  WT009_ID,
  WT010_ID,
  WT011_ID,
  WT006_EXPECTED_PATH,
  WT006_EXPECTED_BRANCH,
  WT010_EXPECTED_PATH,
  WT010_EXPECTED_BRANCH,
  WT010_EXPECTED_BOOTSTRAP_START_HEAD,
  WT010_EXPECTED_OPERATIONAL_STATE,
  WT011_EXPECTED_PATH,
  WT011_EXPECTED_BRANCH,
  WT011_IMPLEMENTATION_REVIEWED_TIP,
  WT011_EXPECTED_LIVE_HEAD_SOURCE,
  WT011_HEAD_VALIDATION_DESCENDANT,
  WT009_EXPECTED_PATH,
  WT009_EXPECTED_BRANCH,
  WT009_EXPECTED_HEAD,
  WT009_EXPECTED_LIFECYCLE,
  WT009_EXPECTED_PURPOSE,
  WT009_EXPECTED_OPERATIONAL_STATE,
  PRE_MERGE_SNAPSHOT_BRANCH,
  POST_MERGE_EXPECTED_BRANCH,
  EXPECTED_POST_MERGE_NEXT_SINGLE_ACTION,
  CANONICAL_WT_HEADING_LABELS,
  WT_HEADING_SEPARATOR,
  BASELINE_AUTHORITY_GRAMMAR,
  parseWorktreeListPorcelain,
  collectSectionFieldRows,
  buildMarkdownFenceMask,
  splitRegistryLines,
  parseFenceOpeningLine,
  parseFenceClosingLine,
  expectedRegistryHeadingLine,
  classifyRegistryHeadingLine,
  parseRegistryHeadings,
  parseRegistryDocument,
  parseRegistryWorktreeEntries,
  parseRegistryWorktreeSection,
  parseWt001RegistrySnapshot,
  parsePostMergeNextSingleAction,
  getRegistryEntryByPath,
  formatRegistryParserErrors,
  formatRegistryHeadingErrors,
  parseShaFromBaselineField,
  parseShaFromHeadField,
  validateWt001Metadata,
  validateWt009Metadata,
  validateWt010Metadata,
  validateWt011Metadata,
  evaluateWt009RegistryPreflight,
  evaluateWt010RegistryPreflight,
  evaluateWt011RegistryPreflight,
  evaluateWt010ActiveLanePreflight,
  evaluateWt011ActiveLanePreflight,
  isPrimaryActiveLifecycle,
  countPrimaryActiveLanes,
  createDefaultGitInspector,
  gitObjectExists,
  isAncestorOrEqual,
  isWorktreeClean,
  hasGitOperationInProgress,
  gitPathExists,
  isSnapshotModeCandidate,
  isLegacyWt001State,
  isParkedSelfFunnelWt001,
  isRegistryEntryDoNotUse,
  isRegistryEntryLiveRequired,
  shouldRunFullTopologyPreflight,
  collectRegistryUniquenessErrors,
  collectSymmetricLiveRegistryErrors,
  evaluateWt001SnapshotPreflight,
  evaluateWorktreePreflightWarnings,
  runStrictLocalWorktreePreflight,
  COMMERCIAL_QUALITY_CONTRACT_PRIVACY_PHRASES,
  COMMERCIAL_QUALITY_CONTRACT_HUMAN_LOCK_PHRASES,
  COMMERCIAL_QUALITY_CONTRACT_MACHINE_FLAG_PHRASES,
  COMMERCIAL_QUALITY_STATE_SEPARATION_PHRASES,
  collectCommercialQualityContractPhraseFailures,
  collectCurrentStateLifecycleFailures,
  collectAuthorityPackTransitionFailures,
  checkAuthorityPackTransitionConsistency,
  parseAuthorityHistoryTransitionJsonl,
  historyHasBootstrapReconciliation,
  readObservedOriginMainSha,
  readObservationTimestamp,
  AUTHORITY_PACK_COMMIT_ONE_SHA,
  AUTHORITY_PACK_COMMIT_TWO_SHA,
  AUTHORITY_PACK_COMMIT_THREE_SHA,
  AUTHORITY_PACK_SUPERSEDED_COMMIT_ONE_SHA,
  AUTHORITY_PACK_SAFETY_REF_SHA,
  AUTHORITY_PACK_BOOTSTRAP_START_HEAD,
  AUTHORITY_HISTORY_KIND_BY_SEQUENCE,
  validateCommercialQualityContractText,
  validateCurrentStateLifecycleText,
  collectPremiumPublicTerminologyViolations,
  shouldScanPremiumPublicTerminologyFile,
  isAllowedPremiumPublicTerminologyOccurrence,
  PREMIUM_PUBLIC_TERMINOLOGY_SCAN_ROOTS,
  PREMIUM_PUBLIC_TERMINOLOGY_SKIP_PATH_PARTS,
  PREMIUM_PUBLIC_TERMINOLOGY_ALLOWED_OCCURRENCES,
  PREMIUM_PUBLIC_TERMINOLOGY_PROHIBITED,
};

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  if (process.argv.includes('--local-worktree-preflight')) {
    runStrictLocalWorktreePreflight();
  } else {
    main();
  }
}
