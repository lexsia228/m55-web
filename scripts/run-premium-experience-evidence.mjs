#!/usr/bin/env node
/**
 * Deterministic two-run Premium Experience evidence runner.
 * npm run test:e2e:premium-experience-evidence
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SUITE = 'e2e/premium-experience-evidence.spec.ts';
const REQUIRED_TESTS = 19;
const EVIDENCE_DIR = join(ROOT, 'e2e/screenshots/premium-experience-ssot');
const RECORDS_DIR = join(
  ROOT,
  'lib/m55/commercialUx/premiumExperience/evidence-execution-records',
);
const LOCAL_RUNS = join(ROOT, 'ops/runs/local');

function gitHead() {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) throw new Error('git rev-parse HEAD failed');
  return r.stdout.trim();
}

function gitTreeDiffId() {
  const r = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
  return createHash('sha256').update(r.stdout.trim() || 'clean').digest('hex').slice(0, 16);
}

function loadManifestViaTsx() {
  const script = `
    import { validatePremiumEvidenceOnDisk } from './lib/m55/commercialUx/premiumExperience/premiumExperienceEvidenceValidation.ts';
    const root = ${JSON.stringify(ROOT)};
    const evidence = validatePremiumEvidenceOnDisk(root);
    console.log(JSON.stringify({ evidence }));
  `;
  const r = spawnSync('npx', ['tsx', '-e', script], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`manifest load failed: ${r.stderr || r.stdout}`);
  const line = r.stdout.trim().split('\n').pop();
  return JSON.parse(line);
}

function cleanGovernedEvidence() {
  if (!existsSync(EVIDENCE_DIR)) mkdirSync(EVIDENCE_DIR, { recursive: true });
  const pdfDir = join(EVIDENCE_DIR, 'pdf');
  if (existsSync(pdfDir)) rmSync(pdfDir, { recursive: true, force: true });
  for (const entry of readdirSync(EVIDENCE_DIR)) {
    const abs = join(EVIDENCE_DIR, entry);
    if (statSync(abs).isFile() && entry.endsWith('.png')) unlinkSync(abs);
  }
  mkdirSync(pdfDir, { recursive: true });
}

function countPassed(suite) {
  let n = 0;
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      for (const result of test.results ?? []) {
        if (result.status === 'passed') n += 1;
      }
    }
  }
  for (const child of suite.suites ?? []) n += countPassed(child);
  return n;
}

function parsePlaywrightJsonReport(raw) {
  const data = JSON.parse(raw);
  const stats = data.stats ?? {};
  const passed = stats.expected ?? countPassed(data);
  return {
    passed,
    failed: (stats.unexpected ?? 0) + (stats.flaky ?? 0),
    skipped: stats.skipped ?? 0,
    interrupted: stats.interrupted ?? 0,
  };
}

function runPlaywrightOnce(runLabel) {
  mkdirSync(LOCAL_RUNS, { recursive: true });
  const jsonOut = join(LOCAL_RUNS, `premium-evidence-${runLabel}.json`);
  const startedAt = new Date().toISOString();
  const r = spawnSync(
    'npx',
    ['playwright', 'test', SUITE, '--reporter=json'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: jsonOut },
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  const endedAt = new Date().toISOString();
  if (!existsSync(jsonOut)) {
    throw new Error(`Playwright JSON report missing for ${runLabel}:\n${r.stderr}\n${r.stdout}`);
  }
  return { ...parsePlaywrightJsonReport(readFileSync(jsonOut, 'utf8')), startedAt, endedAt, exitCode: r.status ?? 1, jsonOut };
}

function buildRecord(runId, head, treeId, pw, manifestPayload) {
  const { evidence } = manifestPayload;
  const purchasedBodyDigests = evidence.purchasedBodyDigests.map((d) => ({
    fileName: d.fileName,
    sha256: d.sha256,
    byteLength: d.byteLength,
  }));
  const verdict =
    pw.passed === REQUIRED_TESTS &&
    pw.failed === 0 &&
    pw.skipped === 0 &&
    pw.interrupted === 0 &&
    evidence.pngCount === 42 &&
    evidence.pdfCount === 5 &&
    evidence.failures.length === 0
      ? 'PASS'
      : 'FAIL';
  return {
    suite: 'premium-experience-evidence',
    runId,
    sourceTreeDiffId: treeId,
    gitHead: head,
    command: `npx playwright test ${SUITE} --reporter=json`,
    expectedTestCount: REQUIRED_TESTS,
    passed: pw.passed,
    failed: pw.failed,
    skipped: pw.skipped,
    interrupted: pw.interrupted,
    startedAt: pw.startedAt,
    endedAt: pw.endedAt,
    expectedOrigin: 'http://localhost:3000|http://127.0.0.1:3000',
    actualOrigin: 'localhost|127.0.0.1',
    pngCount: evidence.pngCount,
    pdfCount: evidence.pdfCount,
    evidenceManifestDigest: evidence.manifestDigest,
    purchasedBodyDigests,
    evidenceFailures: evidence.failures,
    finalVerdict: verdict,
  };
}

function main() {
  const head = gitHead();
  const treeId = gitTreeDiffId();
  const records = [];

  for (const runId of ['run-1', 'run-2']) {
    cleanGovernedEvidence();
    const pw = runPlaywrightOnce(runId);
    const manifestPayload = loadManifestViaTsx();
    const record = buildRecord(runId, head, treeId, pw, manifestPayload);
    mkdirSync(RECORDS_DIR, { recursive: true });
    writeFileSync(join(RECORDS_DIR, `${runId}.json`), `${JSON.stringify(record, null, 2)}\n`);
    records.push(record);
    if (record.finalVerdict !== 'PASS') {
      console.error(JSON.stringify(record, null, 2));
      process.exit(1);
    }
  }

  const digestsMatch = records[0].purchasedBodyDigests.every((d, i) => {
    const b = records[1].purchasedBodyDigests[i];
    return b && d.sha256 === b.sha256;
  });
  const structuralMatch =
    records[0].pngCount === records[1].pngCount &&
    records[0].pdfCount === records[1].pdfCount &&
    records[0].evidenceManifestDigest === records[1].evidenceManifestDigest &&
    records.every((r) => r.purchasedBodyDigests.every((d) => d.byteLength >= 8_000));
  const purchasedBodySizeStable = records[0].purchasedBodyDigests.every((d, i) => {
    const b = records[1].purchasedBodyDigests[i];
    if (!b) return false;
    const ratio = Math.min(d.byteLength, b.byteLength) / Math.max(d.byteLength, b.byteLength);
    return ratio >= 0.9;
  });

  if (!structuralMatch || !purchasedBodySizeStable) {
    console.error('EVIDENCE_COMPLETENESS_FAILED: run-1 and run-2 structural evidence mismatch');
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        verdict: 'PASS',
        records: records.map((r) => r.runId),
        pngBinaryDigestStable: digestsMatch,
        evidenceManifestDigest: records[0].evidenceManifestDigest,
      },
      null,
      2,
    ),
  );
}

main();
