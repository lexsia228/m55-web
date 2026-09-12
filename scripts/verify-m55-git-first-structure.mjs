#!/usr/bin/env node
import fs from 'node:fs';
import { validateManifest, validateCursorRule, validateWorkflow, validateAssetIndexWorkflow } from './m55-git-first-policy.mjs';

const failures = [];
const required = [
  'AGENTS.md',
  'docs/ssot/M55_GIT_FIRST_ENTRYPOINT.md',
  'docs/ssot/M55_GIT_PREFLIGHT_MANIFEST.json',
  'docs/ssot/M55_SCOPE_AWARE_REPO_PREFLIGHT_SSOT.md',
  'docs/ssot/M55_GIT_FIRST_HARDENING_SSOT.md',
  'docs/ssot/M55_GIT_FIRST_HOST_ENFORCEMENT_SSOT.md',
  'docs/ssot/M55_GIT_FIRST_OPERATIONAL_FIXTURES.md',
  '.cursor/rules/m55-control-tower.mdc',
  '.cursor/rules/m55-scope-aware-repo-preflight.mdc',
  '.github/workflows/m55-git-first-preflight.yml',
  '.github/workflows/m55-asset-index.yml',
  'scripts/m55-git-first-policy.mjs',
  'scripts/m55-git-first-policy.test.mjs',
  'scripts/verify-m55-git-first-diff.mjs',
];
for (const file of required) if (!fs.existsSync(file)) failures.push(`missing required file ${file}`);

let manifest;
if (fs.existsSync('docs/ssot/M55_GIT_PREFLIGHT_MANIFEST.json')) {
  try {
    manifest = JSON.parse(fs.readFileSync('docs/ssot/M55_GIT_PREFLIGHT_MANIFEST.json','utf8'));
    failures.push(...validateManifest(manifest));
  } catch (error) {
    failures.push(`manifest parse failed: ${error.message}`);
  }
}
for (const file of ['.cursor/rules/m55-control-tower.mdc','.cursor/rules/m55-scope-aware-repo-preflight.mdc']) {
  if (fs.existsSync(file)) failures.push(...validateCursorRule(fs.readFileSync(file,'utf8'), file));
}
if (fs.existsSync('.github/workflows/m55-git-first-preflight.yml')) {
  failures.push(...validateWorkflow(fs.readFileSync('.github/workflows/m55-git-first-preflight.yml','utf8')));
}
if (fs.existsSync('.github/workflows/m55-asset-index.yml')) {
  failures.push(...validateAssetIndexWorkflow(fs.readFileSync('.github/workflows/m55-asset-index.yml','utf8')));
}

const agents = fs.existsSync('AGENTS.md') ? fs.readFileSync('AGENTS.md','utf8') : '';
const entry = fs.existsSync('docs/ssot/M55_GIT_FIRST_ENTRYPOINT.md') ? fs.readFileSync('docs/ssot/M55_GIT_FIRST_ENTRYPOINT.md','utf8') : '';
if (!agents.includes('M55_GIT_FIRST_ENTRYPOINT.md')) failures.push('AGENTS.md must route every AI through M55_GIT_FIRST_ENTRYPOINT.md');
if (!agents.includes('M55_GIT_PREFLIGHT_MANIFEST.json')) failures.push('AGENTS.md must require M55_GIT_PREFLIGHT_MANIFEST.json');
for (const ref of ['M55_GIT_FIRST_HARDENING_SSOT.md','M55_GIT_FIRST_HOST_ENFORCEMENT_SSOT.md','M55_GIT_FIRST_OPERATIONAL_FIXTURES.md']) {
  if (!entry.includes(ref)) failures.push(`entrypoint missing governance reference ${ref}`);
}
if (!entry.includes('CONTINUATION_HANDOFF')) failures.push('entrypoint missing CONTINUATION_HANDOFF rule');
if (!entry.includes('AUDIT_REPRODUCTION_MUST_MATCH_EXACT_ACCEPTANCE_CONDITION = TRUE')) failures.push('entrypoint missing exact audit re-grounding rule');
if (!manifest?.universal?.requiredReads?.includes('docs/ssot/M55_GIT_FIRST_HARDENING_SSOT.md')) failures.push('manifest must make hardening a universal required read');
if (!manifest?.universal?.requiredReads?.includes('docs/ssot/M55_GIT_FIRST_HOST_ENFORCEMENT_SSOT.md')) failures.push('manifest must make host enforcement a universal required read');

if (failures.length) {
  console.error('M55_GIT_FIRST_STRUCTURE_VERIFY=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('M55_GIT_FIRST_STRUCTURE_VERIFY=PASS');
