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
  const preResultCurrent = /preResultThemeSelection:\s*true/.test(
    src.slice(src.indexOf('M55_CURRENT_RUNTIME_STATE'), src.indexOf('M55_TARGET_COMMERCIAL_CONTRACT')),
  );
  const preResultTarget = /preResultThemeSelection:\s*false/.test(targetSlice);

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
    current: { selfFree: { preResultThemeSelection: preResultCurrent } },
    target: { selfFree: { preResultThemeSelection: preResultTarget } },
    enforcement:
      src.match(/M55_ENFORCEMENT_STATUS = '([^']+)'/)?.[1] ?? '',
    legacy: {
      legacyPublicTerms: ['保存版', '見取り図'].filter((term) => src.includes(`'${term}'`)),
    },
    deferred: (src.match(/M55_DEFERRED_RUNTIME_ASSERTIONS/g) ?? []).length >= 1 ? [1, 2, 3] : [],
    prohibited: src.match(/M55_PROHIBITED_CLAIMS = \[([\s\S]*?)\] as const/)?.[1] ?? '',
  };
}

function checkMachineContract(data) {
  if (!data) return;
  const { products: p, registry: r, current: c, target: t, deferred, enforcement, legacy, prohibited } =
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
  if (r.ACTIVE_LANE !== '個人無料→個人Premiumファネルの一括実装') {
    fail('ACTIVE_LANE must be post-merge Self funnel lane');
  }
  if (enforcement !== 'PENDING_SELF_FUNNEL_IMPLEMENTATION') {
    fail('enforcementStatus must be PENDING_SELF_FUNNEL_IMPLEMENTATION');
  }
  if (c.selfFree.preResultThemeSelection !== true) {
    fail('current runtime must record preResultThemeSelection=true (legacy debt)');
  }
  if (t.selfFree.preResultThemeSelection !== true) {
    fail('target contract must record preResultThemeSelection=false');
  }
  if (!legacy.legacyPublicTerms?.includes('保存版') || !legacy.legacyPublicTerms?.includes('見取り図')) {
    fail('legacy runtime debt must record 保存版 and 見取り図');
  }
  if (!Array.isArray(deferred) || deferred.length < 3) {
    fail('deferred runtime assertions must be recorded');
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
  if (!agents.includes('M55_CURRENT_STATE.md')) fail('AGENTS.md must list M55_CURRENT_STATE.md');
  if (!read('docs/ssot/M55_COPY_AND_CLAIMS.md').includes('保存版')) {
    fail('M55_COPY_AND_CLAIMS.md must record legacy 保存版 debt');
  }
  if (!read('docs/ssot/M55_SELF_FUNNEL_CONTRACT.md').includes('今の関心')) {
    fail('M55_SELF_FUNNEL_CONTRACT.md must record current 今の関心 runtime');
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
const WT009_ID = 'WT-009';
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
function getSectionFieldRules(id) {
  const required = ['path', 'branch', 'HEAD', 'lifecycle', 'purpose'];
  const optional = ['baseline', 'operational state'];
  if (id === WT001_ID) {
    required.push('baseline');
    return { required, optional: optional.filter((field) => field !== 'baseline') };
  }
  if (id === WT009_ID) {
    required.push('operational state');
    return { required, optional: optional.filter((field) => field !== 'operational state') };
  }
  return { required, optional };
}

function parseRegistryWorktreeSection(section, id) {
  const rows = collectSectionFieldRows(section);
  const { required, optional } = getSectionFieldRules(id);
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
    baselineRaw,
    baselineSha,
    lifecycle,
    purpose,
    operationalState,
    section,
  };
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

function isSnapshotModeCandidate(entry, registryEntry, registryText, transitionParse) {
  if (registryEntry?.id !== WT001_ID) return false;
  if (entry.path !== registryEntry.path) return false;
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

function evaluateWt001SnapshotPreflight({ entry, wt001Parse, registryText, transitionParse, gitCwd }) {
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
  if (!gitObjectExists(snapshot.baselineSha, gitCwd)) {
    return { pass: false, reason: 'baseline SHA object missing' };
  }
  if (!entry.head) return { pass: false, reason: 'live HEAD missing' };
  if (!isAncestorOrEqual(snapshot.baselineSha, entry.head, gitCwd)) {
    return { pass: false, reason: 'live HEAD is not baseline or descendant' };
  }
  if (!isWorktreeClean(entry.path)) return { pass: false, reason: 'worktree dirty' };
  if (hasGitOperationInProgress(entry.path)) {
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

function evaluateWorktreePreflightWarnings(liveEntries, registryText, currentStateText, gitCwd) {
  const warnings = [];
  const logs = [];
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

  const transitionParse = parsePostMergeNextSingleAction(currentStateText);
  const registryEntries = registryDocument.entries;

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
        gitCwd,
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

function checkLocalWorktreePreflight() {
  if (process.env.CI) return;

  const result = gitRun(['worktree', 'list', '--porcelain'], ROOT);
  if (result.status !== 0) {
    console.warn('[preflight] git worktree list unavailable — skipping live comparison');
    return;
  }

  const live = parseWorktreeListPorcelain(result.stdout);
  const registry = read('docs/ssot/M55_WORKTREE_REGISTRY.md');
  const currentState = read('docs/ssot/M55_CURRENT_STATE.md');
  const { warnings, logs } = evaluateWorktreePreflightWarnings(live, registry, currentState, ROOT);

  for (const line of logs) console.log(line);

  if (warnings.length > 0) {
    console.warn('[preflight] worktree registry drift detected:');
    for (const w of warnings) console.warn(`- ${w}`);
  } else {
    console.log('[preflight] live git worktree list matches registry preflight rules');
  }
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

function checkDeferredNotEnforcedAsPass() {
  const src = read('scripts/verify-m55-commercial-ssot.mjs');
  if (!src.includes('PENDING_SELF_FUNNEL_IMPLEMENTATION')) {
    fail('verifier must document deferred enforcement');
  }
  if (/public copy.*見取り図.*===\s*0/.test(src)) {
    fail('verifier must not enforce zero 見取り図 public copy yet');
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
  checkDeferredNotEnforcedAsPass();

  if (FAILURES.length > 0) {
    console.log('PASS/FAIL: FAIL');
    console.log('M55 Commercial Funnel SSOT verifier failures:');
    for (const f of FAILURES) console.log(`- ${f}`);
    process.exit(1);
  }

  console.log('PASS/FAIL: PASS');
  console.log('M55 Commercial Funnel SSOT verifier: all checks passed');
  console.log(`deferred enforcement: PENDING_SELF_FUNNEL_IMPLEMENTATION`);
  checkLocalWorktreePreflight();
  process.exit(0);
}

export {
  WT001_ID,
  WT009_ID,
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
  evaluateWt009RegistryPreflight,
  gitObjectExists,
  isAncestorOrEqual,
  isWorktreeClean,
  hasGitOperationInProgress,
  gitPathExists,
  isSnapshotModeCandidate,
  isLegacyWt001State,
  evaluateWt001SnapshotPreflight,
  evaluateWorktreePreflightWarnings,
};

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main();
}
