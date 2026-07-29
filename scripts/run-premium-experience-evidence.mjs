#!/usr/bin/env node
/**
 * Deterministic two-run Premium Experience evidence runner.
 *
 *   npm run test:e2e:premium-experience-evidence
 *
 * Each run cleans only the governed evidence output, executes the complete
 * required suite, parses the real Playwright JSON reporter (exit code, stats,
 * test titles, capture events, observed origins), validates the evidence on disk
 * and writes a small normalized execution record bound to a digest of the
 * proof-relevant source tree.
 *
 * Raster SHA differences between the two runs are expected and are not a
 * failure; only semantic evidence identity must match.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT, assertLockedProofToolchain, runProofTs } from './premium-proof-toolchain.mjs';

const ROOT = REPO_ROOT;
const SUITE = 'e2e/premium-experience-evidence.spec.ts';
const REQUIRED_TESTS = 19;
const REQUIRED_PNG = 42;
const REQUIRED_PDF = 5;
const REQUIRED_CAPTURE_RECORDS = 47;
const EVIDENCE_DIR = join(ROOT, 'e2e/screenshots/premium-experience-ssot');
const RECORDS_DIR_REL = 'lib/m55/commercialUx/premiumExperience/evidence-execution-records';
const RECORDS_DIR = join(ROOT, RECORDS_DIR_REL);
const LOCAL_RUNS = join(ROOT, 'ops/runs/local');
const CAPTURE_EVENT_PREFIX = 'M55_CAPTURE_EVENT ';
const EXPECTED_ORIGIN_PATTERN = '^https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?$';
const REPORTER_SCHEMA = 'm55.premium-experience.normalized-reporter.v1';
const COMMAND_CONTRACT_KEY = 'premium-experience-evidence.playwright.json';
const COMMAND_CONTRACT = {
  [COMMAND_CONTRACT_KEY]: 'playwright test e2e/premium-experience-evidence.spec.ts --reporter=json',
};
const PLAYWRIGHT_BIN = join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'playwright.cmd' : 'playwright');

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

/** Load the typed proof authority through the locked offline toolchain. */
function loadProofPayload() {
  const script = `
    import { validatePremiumEvidenceOnDisk } from './lib/m55/commercialUx/premiumExperience/premiumExperienceEvidenceValidation.ts';
    import { computePremiumProofSourceSnapshot } from './lib/m55/commercialUx/premiumExperience/premiumExperienceProofSourceSnapshot.ts';
    const root = ${JSON.stringify(ROOT)};
    console.log('M55_PROOF_PAYLOAD ' + JSON.stringify({
      evidence: validatePremiumEvidenceOnDisk(root),
      snapshot: computePremiumProofSourceSnapshot(root),
    }));
  `;
  const result = runProofTs(['-e', script]);
  const line = (result.stdout ?? '')
    .split('\n')
    .reverse()
    .find((l) => l.startsWith('M55_PROOF_PAYLOAD '));
  if (result.status !== 0 || !line) {
    throw new Error(`proof authority load failed:\n${result.stderr ?? ''}\n${result.stdout ?? ''}`);
  }
  return JSON.parse(line.slice('M55_PROOF_PAYLOAD '.length));
}

/** Validate the written records through the typed pure validators. */
function validateWrittenRecords() {
  const script = `
    import { readFileSync } from 'node:fs';
    import { join } from 'node:path';
    import { validatePremiumRunRecordPair } from './lib/m55/commercialUx/premiumExperience/premiumExperienceRunRecordValidation.ts';
    import { computeManifestDigest, validatePremiumEvidenceOnDisk } from './lib/m55/commercialUx/premiumExperience/premiumExperienceEvidenceValidation.ts';
    import { computePremiumProofSourceSnapshot } from './lib/m55/commercialUx/premiumExperience/premiumExperienceProofSourceSnapshot.ts';
    const root = ${JSON.stringify(ROOT)};
    const dir = ${JSON.stringify(RECORDS_DIR)};
    const records = ['run-1', 'run-2'].map((id) =>
      JSON.parse(readFileSync(join(dir, id + '.json'), 'utf8')),
    );
    const snapshot = computePremiumProofSourceSnapshot(root);
    const evidence = validatePremiumEvidenceOnDisk(root);
    const failures = validatePremiumRunRecordPair(records, {
      root,
      expectedSourceSnapshotDigest: snapshot.digest,
      expectedSourceSnapshotFileCount: snapshot.fileCount,
      expectedManifestDigest: computeManifestDigest(),
      diskFileIdentities: evidence.fileIdentities,
      expectedEvidenceIdentityDigest: evidence.evidenceIdentityDigest,
    });
    console.log('M55_RECORD_VALIDATION ' + JSON.stringify({ failures }));
  `;
  const result = runProofTs(['-e', script]);
  const line = (result.stdout ?? '')
    .split('\n')
    .reverse()
    .find((l) => l.startsWith('M55_RECORD_VALIDATION '));
  if (result.status !== 0 || !line) {
    throw new Error(`record validation failed to run:\n${result.stderr ?? ''}\n${result.stdout ?? ''}`);
  }
  return JSON.parse(line.slice('M55_RECORD_VALIDATION '.length)).failures;
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

function cleanPriorRecords() {
  if (existsSync(RECORDS_DIR)) rmSync(RECORDS_DIR, { recursive: true, force: true });
  mkdirSync(RECORDS_DIR, { recursive: true });
}

function walkSpecs(suite, visit) {
  for (const spec of suite.specs ?? []) visit(spec);
  for (const child of suite.suites ?? []) walkSpecs(child, visit);
}

/**
 * Normalize the real reporter output into the committed authenticating artifact:
 * per-test identity/status/duration plus the stdout capture events, each bound
 * back to the test that emitted it. Traces, attachments, stack frames and HTML
 * output are deliberately dropped so the artifact stays small.
 */
function normalizePlaywrightJsonReport(raw) {
  const data = JSON.parse(raw);
  const stats = data.stats ?? {};
  const tests = [];
  const captureEvents = [];

  for (const suite of data.suites ?? []) {
    walkSpecs(suite, (spec) => {
      for (const testCase of spec.tests ?? []) {
        const projectName = testCase.projectName ?? 'default';
        const testId = testCase.id ?? `${projectName}|${spec.id ?? spec.title}`;
        const viewportMatch = /@(390|768|1280)\b/.exec(spec.title);
        const durationMs = (testCase.results ?? []).reduce((sum, r) => sum + (r.duration ?? 0), 0);
        tests.push({
          testId,
          title: spec.title,
          projectName,
          status: testCase.status ?? 'unknown',
          expectedStatus: testCase.expectedStatus ?? 'passed',
          durationMs,
          viewport: viewportMatch ? viewportMatch[1] : null,
        });
        for (const result of testCase.results ?? []) {
          for (const chunk of result.stdout ?? []) {
            const text = typeof chunk === 'string' ? chunk : (chunk.text ?? '');
            for (const line of text.split('\n')) {
              if (!line.startsWith(CAPTURE_EVENT_PREFIX)) continue;
              const event = JSON.parse(line.slice(CAPTURE_EVENT_PREFIX.length));
              captureEvents.push({ ...event, emittedByTestId: testId });
            }
          }
        }
      }
    });
  }

  return {
    stats: {
      expected: stats.expected ?? 0,
      unexpected: stats.unexpected ?? 0,
      flaky: stats.flaky ?? 0,
      skipped: stats.skipped ?? 0,
      interrupted: stats.interrupted ?? 0,
    },
    tests,
    captureEvents,
  };
}

function runPlaywrightOnce(runId) {
  mkdirSync(LOCAL_RUNS, { recursive: true });
  const jsonOut = join(LOCAL_RUNS, `premium-evidence-${runId}.json`);
  if (existsSync(jsonOut)) unlinkSync(jsonOut);

  const args = ['test', SUITE, '--reporter=json'];
  const command = `playwright ${args.join(' ')}`;
  if (command !== COMMAND_CONTRACT[COMMAND_CONTRACT_KEY]) {
    throw new Error(`COMMAND_CONTRACT_DRIFT: "${command}" is not the governed command`);
  }
  const startedAt = new Date().toISOString();
  const result = spawnSync(PLAYWRIGHT_BIN, args, {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: jsonOut },
    maxBuffer: 256 * 1024 * 1024,
  });
  const endedAt = new Date().toISOString();

  if (!existsSync(jsonOut)) {
    throw new Error(
      `Playwright JSON report missing for ${runId}:\n${result.stderr ?? ''}\n${result.stdout ?? ''}`,
    );
  }
  const normalized = normalizePlaywrightJsonReport(readFileSync(jsonOut, 'utf8'));

  const reporter = {
    schema: REPORTER_SCHEMA,
    runId,
    commandContractKey: COMMAND_CONTRACT_KEY,
    command,
    exitCode: result.status ?? 1,
    startedAt,
    endedAt,
    stats: normalized.stats,
    tests: normalized.tests,
    captureEvents: normalized.captureEvents,
  };
  const reporterContents = `${JSON.stringify(reporter, null, 2)}\n`;
  const reporterRel = `${RECORDS_DIR_REL}/reporter-${runId}.json`;
  writeFileSync(join(ROOT, reporterRel), reporterContents);

  return {
    passed: normalized.stats.expected,
    failed: normalized.stats.unexpected + normalized.stats.flaky,
    skipped: normalized.stats.skipped,
    interrupted: normalized.stats.interrupted,
    testTitles: normalized.tests.map((t) => `${t.projectName}|${t.title}`),
    captureEvents: normalized.captureEvents,
    command,
    commandContractKey: COMMAND_CONTRACT_KEY,
    normalizedReporterFile: reporterRel,
    normalizedReporterSha256: sha256(reporterContents),
    exitCode: reporter.exitCode,
    startedAt,
    endedAt,
  };
}

function buildRecord(runId, pw, payload, representsCommittedEvidence) {
  const { evidence, snapshot } = payload;
  const actualOrigins = Array.from(new Set(pw.captureEvents.map((e) => e.actualOrigin))).sort();

  const verdict =
    pw.exitCode === 0 &&
    pw.passed === REQUIRED_TESTS &&
    pw.failed === 0 &&
    pw.skipped === 0 &&
    pw.interrupted === 0 &&
    pw.testTitles.length === REQUIRED_TESTS &&
    evidence.pngCount === REQUIRED_PNG &&
    evidence.pdfCount === REQUIRED_PDF &&
    pw.captureEvents.length === REQUIRED_CAPTURE_RECORDS &&
    evidence.failures.length === 0 &&
    snapshot.missing.length === 0
      ? 'PASS'
      : 'FAIL';

  return {
    suite: 'premium-experience-evidence',
    runId,
    sourceSnapshotDigest: snapshot.digest,
    sourceSnapshotFileCount: snapshot.fileCount,
    evidenceManifestDigest: evidence.manifestDigest,
    evidenceIdentityDigest: evidence.evidenceIdentityDigest,
    normalizedReporterFile: pw.normalizedReporterFile,
    normalizedReporterSha256: pw.normalizedReporterSha256,
    commandContractKey: pw.commandContractKey,
    command: pw.command,
    exitCode: pw.exitCode,
    startedAt: pw.startedAt,
    endedAt: pw.endedAt,
    expectedOriginPattern: EXPECTED_ORIGIN_PATTERN,
    actualOrigins,
    expectedTestCount: REQUIRED_TESTS,
    passed: pw.passed,
    failed: pw.failed,
    skipped: pw.skipped,
    interrupted: pw.interrupted,
    testTitles: pw.testTitles,
    registeredStateCount: evidence.registeredStateCount,
    visualCaptureCount: evidence.visualCaptureCount,
    pngCount: evidence.pngCount,
    pdfCount: evidence.pdfCount,
    captureRecordCount: pw.captureEvents.length,
    captureEvents: pw.captureEvents.map((e) => ({
      captureId: e.captureId,
      stateId: e.stateId,
      viewport: e.viewport,
      expectedRoute: e.expectedRoute,
      actualUrl: e.actualUrl,
      actualOrigin: e.actualOrigin,
      ownerModule: e.ownerModule,
      visibleContractDigest: e.visibleContractDigest,
      fileName: e.fileName,
      kind: e.kind,
    })),
    evidenceFileIdentities: evidence.fileIdentities,
    purchasedBodyDigests: evidence.purchasedBodyDigests,
    evidenceFailures: evidence.failures,
    representsCommittedEvidence,
    finalVerdict: verdict,
  };
}

function main() {
  const toolchain = assertLockedProofToolchain();
  console.log(`proof toolchain: tsx@${toolchain.version} (locked, offline)`);
  if (!existsSync(PLAYWRIGHT_BIN)) {
    console.error(`PROOF_TOOLCHAIN_NOT_INSTALLED: ${PLAYWRIGHT_BIN} missing — run "npm ci"`);
    process.exit(1);
  }

  cleanPriorRecords();
  const records = [];

  // run-2 executes last, so its artifacts are the committed evidence set.
  for (const runId of ['run-1', 'run-2']) {
    cleanGovernedEvidence();
    const pw = runPlaywrightOnce(runId);
    const payload = loadProofPayload();
    const record = buildRecord(runId, pw, payload, runId === 'run-2');
    writeFileSync(join(RECORDS_DIR, `${runId}.json`), `${JSON.stringify(record, null, 2)}\n`);
    records.push(record);
    if (record.finalVerdict !== 'PASS') {
      console.error(
        JSON.stringify(
          {
            runId,
            exitCode: record.exitCode,
            passed: record.passed,
            failed: record.failed,
            skipped: record.skipped,
            interrupted: record.interrupted,
            pngCount: record.pngCount,
            pdfCount: record.pdfCount,
            captureRecordCount: record.captureRecordCount,
            evidenceFailures: record.evidenceFailures.slice(0, 20),
          },
          null,
          2,
        ),
      );
      process.exit(1);
    }
  }

  const failures = validateWrittenRecords();
  if (failures.length > 0) {
    console.error('EVIDENCE_RECORD_VALIDATION_FAILED');
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        verdict: 'PASS',
        sourceSnapshotDigest: records[0].sourceSnapshotDigest,
        evidenceIdentityDigest: records[0].evidenceIdentityDigest,
        runs: records.map((r) => ({
          runId: r.runId,
          exitCode: r.exitCode,
          passed: r.passed,
          failed: r.failed,
          skipped: r.skipped,
          interrupted: r.interrupted,
          pngCount: r.pngCount,
          pdfCount: r.pdfCount,
          captureRecordCount: r.captureRecordCount,
          actualOrigins: r.actualOrigins,
        })),
        rasterDigestsIdentical:
          records[0].purchasedBodyDigests.map((d) => d.sha256).join(',') ===
          records[1].purchasedBodyDigests.map((d) => d.sha256).join(','),
      },
      null,
      2,
    ),
  );
}

main();
