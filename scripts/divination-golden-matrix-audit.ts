/**
 * Divination Golden Matrix audit CLI — v2 composite only (stdout; no DB/network).
 * Run: npx tsx scripts/divination-golden-matrix-audit.ts [--json]
 */
import { DIVINATION_GOLDEN_MATRIX_CASES } from '../lib/m55/divinationGoldenMatrixCases';
import {
  runDivinationGoldenMatrixAll,
  type DivinationGoldenMatrixAuditRow,
} from '../lib/m55/divinationGoldenMatrixAudit';

const jsonMode = process.argv.includes('--json');

function markdownEscape(s: string): string {
  return s.replace(/\|/g, '\\|');
}

function formatMarkdownTable(rows: DivinationGoldenMatrixAuditRow[]): string {
  const headers = [
    'case_id',
    'status',
    'birthDate',
    'lane',
    'stem',
    'title',
    'certified',
    'error',
  ];
  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
  ];
  for (const r of rows) {
    lines.push(
      `| ${[
        markdownEscape(r.case_id),
        r.certification_status,
        r.input_birthDate,
        r.stemLaneIndex ?? '—',
        r.stemChar ?? '—',
        markdownEscape(r.publicTitle ?? '—'),
        r.certified_match === null ? '—' : String(r.certified_match),
        markdownEscape(r.errorCode ?? '—'),
      ].join(' | ')} |`,
    );
  }
  return lines.join('\n');
}

function summarize(rows: DivinationGoldenMatrixAuditRow[]) {
  const certified = rows.filter((r) => r.certification_status === 'CERTIFIED');
  const review = rows.filter((r) => r.certification_status === 'REVIEW_REQUIRED');
  const invariant = rows.filter((r) => r.certification_status === 'INVARIANT_ONLY');
  const certifiedFail = certified.filter((r) => r.certified_match === false);
  const reviewRows = review.length;
  return {
    total: rows.length,
    certified: certified.length,
    certified_fail: certifiedFail.length,
    review_required: reviewRows,
    invariant_only: invariant.length,
    p0_anchor: rows.find((r) => r.case_id === 'DM-GX-01'),
  };
}

const rows = runDivinationGoldenMatrixAll(DIVINATION_GOLDEN_MATRIX_CASES);
const summary = summarize(rows);

if (jsonMode) {
  process.stdout.write(`${JSON.stringify({ summary, rows }, null, 2)}\n`);
} else {
  process.stdout.write('# Divination Golden Matrix Audit\n\n');
  process.stdout.write(formatMarkdownTable(rows));
  process.stdout.write('\n\n');
  process.stdout.write('## Summary\n\n');
  process.stdout.write(`- total: ${summary.total}\n`);
  process.stdout.write(`- CERTIFIED: ${summary.certified} (fail: ${summary.certified_fail})\n`);
  process.stdout.write(`- REVIEW_REQUIRED rows: ${summary.review_required}\n`);
  process.stdout.write(`- INVARIANT_ONLY: ${summary.invariant_only}\n`);
  if (summary.p0_anchor) {
    const a = summary.p0_anchor;
    process.stdout.write(
      `- DM-GX-01: lane ${a.stemLaneIndex} ${a.publicTitle} certified=${a.certified_match}\n`,
    );
  }
  process.stdout.write('\n');
}

process.exit(summary.certified_fail > 0 ? 1 : 0);
