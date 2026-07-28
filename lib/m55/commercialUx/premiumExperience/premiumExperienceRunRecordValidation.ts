/**
 * Pure validation of the durable Premium evidence execution records.
 *
 * Every rule here is a total function over a record object so each failure mode
 * can be exercised directly by a negative fixture instead of being assumed to be
 * covered by the runner.
 */
import {
  PREMIUM_EXPERIENCE_VISUAL_CAPTURE_COUNT,
  PREMIUM_EXPERIENCE_VIEWPORTS,
  captureCaseById,
} from './premiumExperienceCaptureModel';

export const PREMIUM_REQUIRED_E2E_TEST_COUNT = 19 as const;
export const PREMIUM_REQUIRED_PNG_COUNT = 42 as const;
export const PREMIUM_REQUIRED_PDF_COUNT = 5 as const;
/** 42 PNG captures + 5 print captures. */
export const PREMIUM_REQUIRED_CAPTURE_RECORD_COUNT = 47 as const;
export const PREMIUM_EXPECTED_ORIGIN_PATTERN = '^https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?$';

export type PremiumCaptureEvent = {
  captureId: string;
  stateId: string;
  viewport: string | null;
  expectedRoute: string;
  actualUrl: string;
  actualOrigin: string;
  ownerModule: string;
  visibleContractDigest: string;
  fileName: string;
  kind: 'png' | 'pdf';
};

export type PremiumRunRecord = {
  suite: string;
  runId: string;
  sourceSnapshotDigest: string;
  evidenceManifestDigest: string;
  evidenceIdentityDigest: string;
  rawReporterDigest: string;
  command: string;
  exitCode: number;
  expectedOriginPattern: string;
  actualOrigins: string[];
  expectedTestCount: number;
  passed: number;
  failed: number;
  skipped: number;
  interrupted: number;
  testTitles: string[];
  pngCount: number;
  pdfCount: number;
  captureRecordCount: number;
  captureEvents: PremiumCaptureEvent[];
  evidenceFailures: string[];
  finalVerdict: 'PASS' | 'FAIL';
};

export type RecordValidationOptions = {
  expectedSourceSnapshotDigest: string;
  expectedManifestDigest: string;
};

function pushIf(failures: string[], condition: boolean, message: string) {
  if (condition) failures.push(message);
}

export function validateCaptureEvents(events: readonly PremiumCaptureEvent[]): string[] {
  const failures: string[] = [];
  const originRe = new RegExp(PREMIUM_EXPECTED_ORIGIN_PATTERN);

  for (const event of events) {
    const capture = captureCaseById(event.captureId);
    if (!capture) {
      failures.push(`capture event ${event.captureId} has no capture case`);
      continue;
    }
    pushIf(
      failures,
      capture.stateId !== event.stateId,
      `capture ${event.captureId} mapped to state ${event.stateId}, expected ${capture.stateId}`,
    );
    pushIf(
      failures,
      capture.ownerModule !== event.ownerModule,
      `capture ${event.captureId} owner ${event.ownerModule}, expected ${capture.ownerModule}`,
    );
    pushIf(
      failures,
      capture.expectedRoute !== event.expectedRoute,
      `capture ${event.captureId} route ${event.expectedRoute}, expected ${capture.expectedRoute}`,
    );
    pushIf(
      failures,
      !originRe.test(event.actualOrigin),
      `capture ${event.captureId} origin ${event.actualOrigin} is not a local fixture origin`,
    );
    const routePath = capture.expectedRoute.split('?')[0];
    pushIf(
      failures,
      !event.actualUrl.includes(routePath),
      `capture ${event.captureId} actual URL ${event.actualUrl} does not contain ${routePath}`,
    );
    if (event.kind === 'png') {
      pushIf(
        failures,
        !(PREMIUM_EXPERIENCE_VIEWPORTS as readonly string[]).includes(event.viewport ?? ''),
        `capture ${event.captureId} viewport ${event.viewport} not in the governed viewport set`,
      );
      pushIf(
        failures,
        event.fileName !== `${event.captureId}-${event.viewport}.png`,
        `capture ${event.captureId} file ${event.fileName} does not match captureId/viewport`,
      );
    } else {
      pushIf(
        failures,
        capture.printFileName !== event.fileName,
        `print capture ${event.captureId} file ${event.fileName}, expected ${capture.printFileName}`,
      );
    }
  }

  const pngCaptureIds = new Set(events.filter((e) => e.kind === 'png').map((e) => e.captureId));
  pushIf(
    failures,
    pngCaptureIds.size !== PREMIUM_EXPERIENCE_VISUAL_CAPTURE_COUNT,
    `capture events cover ${pngCaptureIds.size} capture ids, expected ${PREMIUM_EXPERIENCE_VISUAL_CAPTURE_COUNT}`,
  );

  return failures;
}

export function validatePremiumRunRecord(
  record: PremiumRunRecord,
  options: RecordValidationOptions,
): string[] {
  const failures: string[] = [];
  const label = record.runId || '(unnamed run)';

  pushIf(failures, record.suite !== 'premium-experience-evidence', `${label}: unexpected suite ${record.suite}`);
  pushIf(failures, record.exitCode !== 0, `${label}: Playwright exit code ${record.exitCode}, expected 0`);
  pushIf(
    failures,
    record.expectedTestCount !== PREMIUM_REQUIRED_E2E_TEST_COUNT,
    `${label}: expectedTestCount ${record.expectedTestCount}, expected ${PREMIUM_REQUIRED_E2E_TEST_COUNT}`,
  );
  pushIf(
    failures,
    record.passed !== PREMIUM_REQUIRED_E2E_TEST_COUNT,
    `${label}: passed ${record.passed}, expected ${PREMIUM_REQUIRED_E2E_TEST_COUNT}`,
  );
  pushIf(failures, record.failed !== 0, `${label}: failed ${record.failed}, expected 0`);
  pushIf(failures, record.skipped !== 0, `${label}: skipped ${record.skipped}, expected 0`);
  pushIf(failures, record.interrupted !== 0, `${label}: interrupted ${record.interrupted}, expected 0`);
  pushIf(
    failures,
    record.testTitles.length !== PREMIUM_REQUIRED_E2E_TEST_COUNT,
    `${label}: ${record.testTitles.length} test titles, expected ${PREMIUM_REQUIRED_E2E_TEST_COUNT}`,
  );
  pushIf(
    failures,
    new Set(record.testTitles).size !== record.testTitles.length,
    `${label}: duplicate test titles in reporter output`,
  );

  pushIf(
    failures,
    record.pngCount !== PREMIUM_REQUIRED_PNG_COUNT,
    `${label}: pngCount ${record.pngCount}, expected ${PREMIUM_REQUIRED_PNG_COUNT}`,
  );
  pushIf(
    failures,
    record.pdfCount !== PREMIUM_REQUIRED_PDF_COUNT,
    `${label}: pdfCount ${record.pdfCount}, expected ${PREMIUM_REQUIRED_PDF_COUNT}`,
  );
  pushIf(
    failures,
    record.captureRecordCount !== PREMIUM_REQUIRED_CAPTURE_RECORD_COUNT,
    `${label}: captureRecordCount ${record.captureRecordCount}, expected ${PREMIUM_REQUIRED_CAPTURE_RECORD_COUNT}`,
  );
  pushIf(
    failures,
    record.captureEvents.length !== record.captureRecordCount,
    `${label}: captureEvents ${record.captureEvents.length} does not match captureRecordCount ${record.captureRecordCount}`,
  );

  pushIf(
    failures,
    record.sourceSnapshotDigest !== options.expectedSourceSnapshotDigest,
    `${label}: stale sourceSnapshotDigest ${record.sourceSnapshotDigest}, current source is ${options.expectedSourceSnapshotDigest}`,
  );
  pushIf(
    failures,
    record.evidenceManifestDigest !== options.expectedManifestDigest,
    `${label}: evidenceManifestDigest ${record.evidenceManifestDigest} does not match current manifest`,
  );
  pushIf(
    failures,
    !/^[0-9a-f]{64}$/.test(record.rawReporterDigest),
    `${label}: rawReporterDigest is not a sha-256 digest`,
  );
  pushIf(
    failures,
    !/^[0-9a-f]{64}$/.test(record.evidenceIdentityDigest),
    `${label}: evidenceIdentityDigest is not a sha-256 digest`,
  );

  pushIf(
    failures,
    record.expectedOriginPattern !== PREMIUM_EXPECTED_ORIGIN_PATTERN,
    `${label}: expectedOriginPattern is not the governed pattern`,
  );
  pushIf(failures, record.actualOrigins.length === 0, `${label}: no actual origins observed by the tests`);
  const originRe = new RegExp(record.expectedOriginPattern);
  for (const origin of record.actualOrigins) {
    pushIf(failures, !originRe.test(origin), `${label}: observed origin ${origin} does not match expected pattern`);
  }
  const eventOrigins = new Set(record.captureEvents.map((e) => e.actualOrigin));
  for (const origin of record.actualOrigins) {
    pushIf(
      failures,
      !eventOrigins.has(origin),
      `${label}: declared origin ${origin} was not observed in any capture event`,
    );
  }

  pushIf(failures, record.evidenceFailures.length > 0, `${label}: evidence failures ${record.evidenceFailures.join('; ')}`);
  failures.push(...validateCaptureEvents(record.captureEvents).map((f) => `${label}: ${f}`));

  const expectedVerdict = failures.length === 0 ? 'PASS' : 'FAIL';
  pushIf(
    failures,
    record.finalVerdict === 'PASS' && expectedVerdict === 'FAIL',
    `${label}: finalVerdict PASS contradicts validation failures`,
  );
  pushIf(
    failures,
    record.finalVerdict !== 'PASS' && expectedVerdict === 'PASS',
    `${label}: finalVerdict ${record.finalVerdict} but all checks pass`,
  );

  return failures;
}

/**
 * Two runs must independently prove the same semantic evidence identity.
 * Raster SHA differences are expected and are not a failure.
 */
export function validatePremiumRunRecordPair(
  records: readonly PremiumRunRecord[],
  options: RecordValidationOptions,
): string[] {
  const failures: string[] = [];

  if (records.length !== 2) {
    failures.push(`expected exactly 2 successful execution records, received ${records.length}`);
    return failures;
  }

  const [first, second] = records;
  if (first.runId === second.runId) {
    failures.push(`both execution records share runId ${first.runId}`);
  }

  for (const record of records) {
    failures.push(...validatePremiumRunRecord(record, options));
  }

  pushIf(
    failures,
    first.sourceSnapshotDigest !== second.sourceSnapshotDigest,
    'run-1 and run-2 were produced from different source trees',
  );
  pushIf(
    failures,
    first.evidenceIdentityDigest !== second.evidenceIdentityDigest,
    'run-1 and run-2 semantic evidence identity differs (captureId/state/route/owner/viewport/contract/dimensions)',
  );

  const identityOf = (record: PremiumRunRecord) =>
    record.captureEvents
      .map((e) => `${e.kind}|${e.fileName}|${e.captureId}|${e.stateId}|${e.viewport}|${e.expectedRoute}|${e.ownerModule}|${e.visibleContractDigest}`)
      .sort()
      .join('\n');

  pushIf(
    failures,
    identityOf(first) !== identityOf(second),
    'run-1 and run-2 capture event identity sets differ',
  );

  return failures;
}
