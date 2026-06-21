#!/usr/bin/env npx tsx
/**
 * Local-only generated output audit — writes JSON/Markdown artifacts.
 * Synthetic profiles only; no DB / production access.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  AUDIT_JSON_PATH,
  AUDIT_MD_PATH,
  formatOutputAuditMarkdown,
  runCanonicalV2GeneratedOutputAudit,
} from '../../lib/m55/compositeStem/canonicalV2GeneratedOutputAudit';

mkdirSync('/Users/lexsia/Downloads/m55_legacy_snapshot_v2_rebuild_artifacts', { recursive: true });

const report = runCanonicalV2GeneratedOutputAudit();
writeFileSync(AUDIT_JSON_PATH, JSON.stringify(report, null, 2), 'utf8');
writeFileSync(AUDIT_MD_PATH, formatOutputAuditMarkdown(report), 'utf8');

console.info('[m55GeneratedOutputAudit] profiles:', report.summary.auditedProfileCount);
console.info('[m55GeneratedOutputAudit] all pass:', report.summary.allOutputAuditsPass);
console.info('[m55GeneratedOutputAudit] json:', AUDIT_JSON_PATH);
console.info('[m55GeneratedOutputAudit] md:', AUDIT_MD_PATH);

if (!report.summary.allOutputAuditsPass) {
  process.exitCode = 1;
}
