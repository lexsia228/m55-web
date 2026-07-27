#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateProductAuthority } from './generate.mjs';
import { writeHistory, withComputedEventHashes } from './history.mjs';
import { runVerifyCli } from './validate.mjs';
import { scanForSecrets } from './secret-scan.mjs';

const ROOT = process.cwd();
const COMMAND = process.argv[2];

const CHANGED_PATHS = [
  '.product-authority/authority.json',
  '.product-authority/observations.json',
  '.product-authority/authority-history.jsonl',
  '.product-authority/schema/authority-pack.schema.json',
  '.product-authority/authority.lock.json',
  '.product-authority/generated/handoff.md',
  '.product-authority/generated/handoff.json',
  '.product-authority/generated/authority-header.md',
  '.product-authority/generated/adapters/codex.md',
  '.product-authority/generated/adapters/cursor.md',
  '.product-authority/generated/adapters/generic-agent.md',
  'scripts/product-authority/canonical-json.mjs',
  'scripts/product-authority/hash.mjs',
  'scripts/product-authority/history.mjs',
  'scripts/product-authority/observations.mjs',
  'scripts/product-authority/validate.mjs',
  'scripts/product-authority/secret-scan.mjs',
  'scripts/product-authority/generate.mjs',
  'scripts/product-authority/cli.mjs',
  'AGENTS.md',
  'docs/ssot/M55_CURRENT_STATE.md',
  'docs/ssot/M55_WORKTREE_REGISTRY.md',
  'docs/ssot/M55_ROADMAP.md',
  'docs/ssot/M55_DECISION_LOG.md',
  'package.json',
  '.github/workflows/verify-product-authority-pack.yml',
  '.github/CODEOWNERS',
];

function initHistory() {
  const sequence0 = {
    sequence: 0,
    kind: 'INITIALIZATION',
    sourceCommit: 'UNCOMMITTED_BOOTSTRAP',
    previousEventHash: null,
    bootstrap: true,
    approvalReference:
      'M55_SHARED_CRITICAL_AUTHORITY_PACK_IMPLEMENTATION_CONTRACT_FINAL_GREEN',
    changedPaths: [...CHANGED_PATHS].sort(),
    updatedAt: '2026-07-25T07:00:00+00:00',
  };
  writeHistory(ROOT, withComputedEventHashes([sequence0]));
  console.log('product-authority init: sequence 0 written');
}

function generateHandoff() {
  const result = generateProductAuthority(ROOT);
  console.log(`product-authority generate: bundle ${result.generatedBundleSha256}`);
}

function printHeader() {
  const headerPath = path.join(ROOT, '.product-authority/generated/authority-header.md');
  process.stdout.write(fs.readFileSync(headerPath, 'utf8'));
}

function observeReadOnly() {
  console.log('product-authority observe: read-only snapshot prepared');
  console.log('- Production SHA remains pending; no automatic promotion');
  console.log('- Provider identities remain PENDING_EVIDENCE');
  console.log('- Use Human approval + approve-change for durable updates');
}

function approveChange() {
  console.error('approve-change requires explicit Human approval metadata and history semantics');
  console.error('Not available during bootstrap sequence-0-only gate');
  process.exit(1);
}

function secretScan() {
  const targets = [
    '.product-authority/authority.json',
    '.product-authority/observations.json',
    '.product-authority/authority-history.jsonl',
    '.product-authority/authority.lock.json',
  ];
  const findings = [];
  for (const rel of targets) {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const result = scanForSecrets(text);
    findings.push(...result.findings.map((finding) => `${rel}: ${finding}`));
  }
  if (findings.length > 0) {
    console.error('secret-scan FAIL');
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }
  console.log('secret-scan PASS');
}

switch (COMMAND) {
  case 'init':
    initHistory();
    break;
  case 'generate-handoff':
    generateHandoff();
    break;
  case 'header':
    printHeader();
    break;
  case 'observe':
    observeReadOnly();
    break;
  case 'approve-change':
    approveChange();
    break;
  case 'verify':
    runVerifyCli(ROOT);
    break;
  case 'secret-scan':
    secretScan();
    break;
  default:
    console.error('Usage: node scripts/product-authority/cli.mjs <init|verify|header|observe|approve-change|generate-handoff|secret-scan>');
    process.exit(1);
}
