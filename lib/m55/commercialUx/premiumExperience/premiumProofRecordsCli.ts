#!/usr/bin/env node
/**
 * Static validation of the committed Premium evidence execution records.
 *
 * CI consumes this instead of regenerating browser evidence: it recomputes the
 * source snapshot digest and rejects records that were produced from a different
 * source tree, that were handwritten, that report skips or a nonzero exit code,
 * or that do not match the 12-state / 14-capture / 42-PNG / 5-PDF model.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePremiumRunRecordPair, type PremiumRunRecord } from './premiumExperienceRunRecordValidation.ts';
import {
  computeManifestDigest,
  validatePremiumEvidenceOnDisk,
} from './premiumExperienceEvidenceValidation.ts';
import { computePremiumProofSourceSnapshot } from './premiumExperienceProofSourceSnapshot.ts';
import {
  PREMIUM_EXPERIENCE_CAPTURE_CASES,
  PREMIUM_EXPERIENCE_REGISTERED_STATE_COUNT,
  PREMIUM_EXPERIENCE_VISUAL_CAPTURE_COUNT,
} from './premiumExperienceCaptureModel.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const RECORDS_DIR = join(ROOT, 'lib/m55/commercialUx/premiumExperience/evidence-execution-records');
const RUN_IDS = ['run-1', 'run-2'] as const;

const failures: string[] = [];
const records: PremiumRunRecord[] = [];

for (const runId of RUN_IDS) {
  const abs = join(RECORDS_DIR, `${runId}.json`);
  if (!existsSync(abs)) {
    failures.push(`missing execution record ${runId}.json`);
    continue;
  }
  try {
    records.push(JSON.parse(readFileSync(abs, 'utf8')) as PremiumRunRecord);
  } catch (err) {
    failures.push(`${runId}.json is not valid JSON: ${(err as Error).message}`);
  }
}

const snapshot = computePremiumProofSourceSnapshot(ROOT);
for (const missing of snapshot.missing) {
  failures.push(`proof source file missing: ${missing}`);
}

if (records.length === RUN_IDS.length) {
  failures.push(
    ...validatePremiumRunRecordPair(records, {
      expectedSourceSnapshotDigest: snapshot.digest,
      expectedManifestDigest: computeManifestDigest(),
    }),
  );
}

const evidence = validatePremiumEvidenceOnDisk(ROOT);
failures.push(...evidence.failures);

if (evidence.registeredStateCount !== PREMIUM_EXPERIENCE_REGISTERED_STATE_COUNT) {
  failures.push(`registered states ${evidence.registeredStateCount}, expected ${PREMIUM_EXPERIENCE_REGISTERED_STATE_COUNT}`);
}
if (evidence.visualCaptureCount !== PREMIUM_EXPERIENCE_VISUAL_CAPTURE_COUNT) {
  failures.push(`visual captures ${evidence.visualCaptureCount}, expected ${PREMIUM_EXPERIENCE_VISUAL_CAPTURE_COUNT}`);
}
for (const record of records) {
  if (record.evidenceIdentityDigest !== evidence.evidenceIdentityDigest) {
    failures.push(
      `${record.runId}: evidenceIdentityDigest does not match the committed evidence on disk`,
    );
  }
}

console.log('M55 Premium proof record validator');
console.log(`root: ${ROOT}`);
console.log('\n--- report ---');
console.log(
  JSON.stringify(
    {
      records: records.map((r) => r.runId),
      sourceSnapshotDigest: snapshot.digest,
      sourceSnapshotFileCount: snapshot.fileCount,
      registeredStateCount: evidence.registeredStateCount,
      visualCaptureCount: evidence.visualCaptureCount,
      captureIds: PREMIUM_EXPERIENCE_CAPTURE_CASES.length,
      pngCount: evidence.pngCount,
      pdfCount: evidence.pdfCount,
      runExitCodes: records.map((r) => r.exitCode),
      runPassed: records.map((r) => r.passed),
      runSkipped: records.map((r) => r.skipped),
      failures: failures.length,
    },
    null,
    2,
  ),
);
console.log(`\nPASS/FAIL: ${failures.length === 0 ? 'PASS' : 'FAIL'}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`[proof.records] ${failure}`);
  process.exit(1);
}
