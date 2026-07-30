/**
 * Pure validation of the durable Premium evidence execution records.
 *
 * A record is only accepted when it is corroborated by artifacts that cannot be
 * hand-written: the committed normalized Playwright reporter (opened, re-digested
 * and re-derived), the complete proof source snapshot, and — for the run whose
 * artifacts are committed — the actual evidence files on disk.
 *
 * Every rule is a total function over its inputs so each failure mode can be
 * exercised directly by a negative fixture.
 */
import {
  PREMIUM_EXPERIENCE_VISUAL_CAPTURE_COUNT,
  PREMIUM_EXPERIENCE_VIEWPORTS,
  captureCaseById,
} from './premiumExperienceCaptureModel';
import {
  bindRecordedIdentitiesToDisk,
  compareSemanticEvidenceIdentities,
  type EvidenceFileIdentityRecord,
} from './premiumExperienceEvidenceValidation';
import {
  deriveReporterFacts,
  loadNormalizedReporter,
  PREMIUM_COMMAND_CONTRACT,
  type NormalizedReporterCaptureEvent,
} from './premiumExperienceReporterAuthority';

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
  sourceSnapshotFileCount: number;
  evidenceManifestDigest: string;
  evidenceIdentityDigest: string;
  /** Path to the committed normalized reporter artifact for this run. */
  normalizedReporterFile: string;
  normalizedReporterSha256: string;
  commandContractKey: string;
  command: string;
  /** Exact clean next-dev command used for governed capture (runner metadata). */
  cleanServerCommand?: string;
  exitCode: number;
  expectedOriginPattern: string;
  actualOrigins: string[];
  expectedTestCount: number;
  passed: number;
  failed: number;
  skipped: number;
  interrupted: number;
  testTitles: string[];
  registeredStateCount: number;
  visualCaptureCount: number;
  pngCount: number;
  pdfCount: number;
  captureRecordCount: number;
  captureEvents: PremiumCaptureEvent[];
  evidenceFileIdentities: EvidenceFileIdentityRecord[];
  purchasedBodyDigests: { fileName: string; sha256: string; byteLength: number }[];
  evidenceFailures: string[];
  /** True for the run whose evidence files are the committed set. */
  representsCommittedEvidence: boolean;
  finalVerdict: 'PASS' | 'FAIL';
};

export type RecordValidationOptions = {
  /** Repository root, used to open the normalized reporter artifacts. */
  root: string;
  expectedSourceSnapshotDigest: string;
  expectedSourceSnapshotFileCount: number;
  expectedManifestDigest: string;
  /** Per-file identities read from the evidence currently on disk. */
  diskFileIdentities: readonly EvidenceFileIdentityRecord[];
  expectedEvidenceIdentityDigest: string;
};

function pushIf(failures: string[], condition: boolean, message: string) {
  if (condition) failures.push(message);
}

export function validateCaptureEvents(
  events: readonly (PremiumCaptureEvent | NormalizedReporterCaptureEvent)[],
): string[] {
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

  const pngCaptureIds = new Set(
    events.filter((e) => e.kind === 'png').map((e) => e.captureId),
  );
  pushIf(
    failures,
    pngCaptureIds.size !== PREMIUM_EXPERIENCE_VISUAL_CAPTURE_COUNT,
    `capture events cover ${pngCaptureIds.size} capture ids, expected ${PREMIUM_EXPERIENCE_VISUAL_CAPTURE_COUNT}`,
  );

  return failures;
}

/** Every capture event must correspond to a recorded evidence file identity. */
function validateCaptureToEvidenceBinding(record: PremiumRunRecord): string[] {
  const failures: string[] = [];
  const identityByName = new Map(record.evidenceFileIdentities.map((i) => [i.fileName, i]));

  for (const event of record.captureEvents) {
    const identity = identityByName.get(event.fileName);
    if (!identity) {
      failures.push(`capture ${event.captureId} has no evidence identity for ${event.fileName}`);
      continue;
    }
    pushIf(
      failures,
      identity.captureId !== event.captureId,
      `${event.fileName}: capture event says ${event.captureId}, evidence identity says ${identity.captureId}`,
    );
    pushIf(
      failures,
      identity.stateId !== event.stateId,
      `${event.fileName}: capture event state ${event.stateId}, evidence identity ${identity.stateId}`,
    );
    pushIf(
      failures,
      identity.viewport !== event.viewport,
      `${event.fileName}: capture event viewport ${event.viewport}, evidence identity ${identity.viewport}`,
    );
    pushIf(
      failures,
      identity.expectedRoute !== event.expectedRoute,
      `${event.fileName}: capture event route ${event.expectedRoute}, evidence identity ${identity.expectedRoute}`,
    );
    pushIf(
      failures,
      identity.ownerModule !== event.ownerModule,
      `${event.fileName}: capture event owner ${event.ownerModule}, evidence identity ${identity.ownerModule}`,
    );
    pushIf(
      failures,
      identity.visibleContractDigest !== event.visibleContractDigest,
      `${event.fileName}: capture event contract digest does not match evidence identity`,
    );
  }

  for (const identity of record.evidenceFileIdentities) {
    if (!record.captureEvents.some((e) => e.fileName === identity.fileName)) {
      failures.push(`evidence file ${identity.fileName} has no emitted capture event`);
    }
    if (!identity.decoded || !identity.contentOk) {
      failures.push(`evidence file ${identity.fileName} recorded as undecoded or blank`);
    }
  }

  return failures;
}

/** Open, re-digest, re-parse and re-derive the committed reporter artifact. */
function authenticateReporter(record: PremiumRunRecord, root: string): string[] {
  const failures: string[] = [];
  const label = record.runId || '(unnamed run)';

  pushIf(
    failures,
    !record.normalizedReporterFile ||
      !record.normalizedReporterFile.endsWith(`reporter-${record.runId}.json`),
    `${label}: normalizedReporterFile "${record.normalizedReporterFile}" is not the expected artifact path`,
  );
  pushIf(
    failures,
    !/^[0-9a-f]{64}$/.test(record.normalizedReporterSha256),
    `${label}: normalizedReporterSha256 is not a sha-256 digest`,
  );
  pushIf(
    failures,
    !(record.commandContractKey in PREMIUM_COMMAND_CONTRACT),
    `${label}: commandContractKey ${record.commandContractKey} is not in the frozen command contract`,
  );
  if (failures.length > 0) return failures;

  const loaded = loadNormalizedReporter(
    root,
    record.normalizedReporterFile,
    record.normalizedReporterSha256,
    record.runId,
    record.commandContractKey,
    record.command,
  );
  if (!loaded.ok) {
    return loaded.failures.map((f) => `${label}: ${f}`);
  }

  const derived = deriveReporterFacts(loaded.reporter);

  pushIf(
    failures,
    loaded.reporter.exitCode !== record.exitCode,
    `${label}: reporter exit code ${loaded.reporter.exitCode} does not match record ${record.exitCode}`,
  );
  pushIf(
    failures,
    derived.passed !== record.passed,
    `${label}: reporter derives passed ${derived.passed}, record claims ${record.passed}`,
  );
  pushIf(
    failures,
    derived.failed !== record.failed,
    `${label}: reporter derives failed ${derived.failed}, record claims ${record.failed}`,
  );
  pushIf(
    failures,
    derived.skipped !== record.skipped,
    `${label}: reporter derives skipped ${derived.skipped}, record claims ${record.skipped}`,
  );
  pushIf(
    failures,
    derived.interrupted !== record.interrupted,
    `${label}: reporter derives interrupted ${derived.interrupted}, record claims ${record.interrupted}`,
  );
  pushIf(
    failures,
    derived.testTitles.slice().sort().join('\n') !== record.testTitles.slice().sort().join('\n'),
    `${label}: reporter test titles do not match the record`,
  );
  pushIf(
    failures,
    derived.actualOrigins.join(',') !== record.actualOrigins.slice().sort().join(','),
    `${label}: reporter derives origins ${derived.actualOrigins.join(',')}, record claims ${record.actualOrigins.join(',')}`,
  );
  pushIf(
    failures,
    derived.captureRecordCount !== record.captureRecordCount,
    `${label}: reporter derives ${derived.captureRecordCount} capture events, record claims ${record.captureRecordCount}`,
  );
  pushIf(
    failures,
    derived.captureIds.length !== PREMIUM_EXPERIENCE_VISUAL_CAPTURE_COUNT,
    `${label}: reporter emits ${derived.captureIds.length} capture ids, expected ${PREMIUM_EXPERIENCE_VISUAL_CAPTURE_COUNT}`,
  );

  const reporterKey = (e: NormalizedReporterCaptureEvent | PremiumCaptureEvent) =>
    `${e.kind}|${e.fileName}|${e.captureId}|${e.stateId}|${e.viewport}|${e.expectedRoute}|${e.ownerModule}|${e.actualOrigin}|${e.actualUrl}|${e.visibleContractDigest}`;
  const fromReporter = derived.captureEvents.map(reporterKey).sort().join('\n');
  const fromRecord = record.captureEvents.map(reporterKey).sort().join('\n');
  pushIf(
    failures,
    fromReporter !== fromRecord,
    `${label}: capture events in the record are not the capture events emitted by the tests`,
  );

  failures.push(...validateCaptureEvents(derived.captureEvents).map((f) => `${label}: reporter ${f}`));

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
    record.registeredStateCount !== 12,
    `${label}: registeredStateCount ${record.registeredStateCount}, expected 12`,
  );
  pushIf(
    failures,
    record.visualCaptureCount !== PREMIUM_EXPERIENCE_VISUAL_CAPTURE_COUNT,
    `${label}: visualCaptureCount ${record.visualCaptureCount}, expected ${PREMIUM_EXPERIENCE_VISUAL_CAPTURE_COUNT}`,
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
    record.evidenceFileIdentities.length !== PREMIUM_REQUIRED_CAPTURE_RECORD_COUNT,
    `${label}: ${record.evidenceFileIdentities.length} evidence identities, expected ${PREMIUM_REQUIRED_CAPTURE_RECORD_COUNT}`,
  );

  pushIf(
    failures,
    record.sourceSnapshotDigest !== options.expectedSourceSnapshotDigest,
    `${label}: stale sourceSnapshotDigest ${record.sourceSnapshotDigest}, current source is ${options.expectedSourceSnapshotDigest}`,
  );
  pushIf(
    failures,
    record.sourceSnapshotFileCount !== options.expectedSourceSnapshotFileCount,
    `${label}: sourceSnapshotFileCount ${record.sourceSnapshotFileCount}, current source set has ${options.expectedSourceSnapshotFileCount}`,
  );
  pushIf(
    failures,
    record.evidenceManifestDigest !== options.expectedManifestDigest,
    `${label}: evidenceManifestDigest ${record.evidenceManifestDigest} does not match current manifest`,
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
  failures.push(...validateCaptureToEvidenceBinding(record).map((f) => `${label}: ${f}`));
  failures.push(...authenticateReporter(record, options.root));

  if (record.representsCommittedEvidence) {
    pushIf(
      failures,
      record.evidenceIdentityDigest !== options.expectedEvidenceIdentityDigest,
      `${label}: evidenceIdentityDigest does not match the evidence currently on disk`,
    );
    failures.push(
      ...bindRecordedIdentitiesToDisk(record.evidenceFileIdentities, options.diskFileIdentities).map(
        (f) => `${label}: ${f}`,
      ),
    );
  } else {
    // The earlier run's binaries are not required to remain on disk; its
    // normalized identity must still agree semantically with what is committed.
    // Raster equality is neither required nor forbidden — the captures are
    // deterministic in practice.
    failures.push(
      ...compareSemanticEvidenceIdentities(record.evidenceFileIdentities, options.diskFileIdentities).map(
        (f) => `${label}: ${f}`,
      ),
    );
  }

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
  if (first.normalizedReporterFile === second.normalizedReporterFile) {
    failures.push('both execution records reference the same normalized reporter artifact');
  }
  if (first.normalizedReporterSha256 === second.normalizedReporterSha256) {
    failures.push('both execution records reference an identical reporter digest');
  }
  const committed = records.filter((r) => r.representsCommittedEvidence);
  if (committed.length !== 1) {
    failures.push(
      `exactly one record must represent the committed evidence, found ${committed.length}`,
    );
  }

  for (const record of records) {
    failures.push(...validatePremiumRunRecord(record, options));
  }

  pushIf(
    failures,
    first.sourceSnapshotDigest !== second.sourceSnapshotDigest,
    'run-1 and run-2 were produced from different source trees',
  );
  failures.push(
    ...compareSemanticEvidenceIdentities(
      first.evidenceFileIdentities,
      second.evidenceFileIdentities,
    ).map((f) => `run pair: ${f}`),
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
