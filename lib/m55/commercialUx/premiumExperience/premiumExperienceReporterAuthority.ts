/**
 * Normalized Playwright reporter authority.
 *
 * A run record is only credible if the machine-readable reporter output it was
 * derived from is committed alongside it. This module defines the small
 * normalized artifact, the frozen command contract, and the derivation used by
 * both the runner and the static validator — so a forged digest or a handwritten
 * command cannot pass.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Only these exact commands may produce a governed Premium evidence record. */
export const PREMIUM_COMMAND_CONTRACT = {
  'premium-experience-evidence.playwright.json':
    'playwright test e2e/premium-experience-evidence.spec.ts --reporter=json',
} as const;

export type PremiumCommandContractKey = keyof typeof PREMIUM_COMMAND_CONTRACT;

export const PREMIUM_REPORTER_SCHEMA = 'm55.premium-experience.normalized-reporter.v1' as const;

export type NormalizedReporterTest = {
  testId: string;
  title: string;
  projectName: string;
  status: string;
  expectedStatus: string;
  durationMs: number;
  /** Viewport suffix parsed from the governed test title (`… @390`). */
  viewport: string | null;
};

export type NormalizedReporterCaptureEvent = {
  kind: 'png' | 'pdf';
  captureId: string;
  stateId: string;
  viewport: string | null;
  expectedRoute: string;
  actualUrl: string;
  actualOrigin: string;
  ownerModule: string;
  visibleContractDigest: string;
  fileName: string;
  byteLength: number;
  /** Test the event was emitted from, so a capture cannot be orphaned. */
  emittedByTestId: string;
};

export type NormalizedReporter = {
  schema: typeof PREMIUM_REPORTER_SCHEMA;
  runId: string;
  commandContractKey: PremiumCommandContractKey;
  command: string;
  exitCode: number;
  startedAt: string;
  endedAt: string;
  stats: {
    expected: number;
    unexpected: number;
    flaky: number;
    skipped: number;
    interrupted: number;
  };
  tests: NormalizedReporterTest[];
  captureEvents: NormalizedReporterCaptureEvent[];
};

export type DerivedReporterFacts = {
  passed: number;
  failed: number;
  skipped: number;
  interrupted: number;
  testTitles: string[];
  actualOrigins: string[];
  captureIds: string[];
  captureEvents: NormalizedReporterCaptureEvent[];
  captureRecordCount: number;
};

export const CAPTURE_EVENT_PREFIX = 'M55_CAPTURE_EVENT ' as const;

/** Canonical serialization — the digest is over this exact text. */
export function serializeNormalizedReporter(reporter: NormalizedReporter): string {
  return `${JSON.stringify(reporter, null, 2)}\n`;
}

export function digestNormalizedReporter(reporter: NormalizedReporter): string {
  return createHash('sha256').update(serializeNormalizedReporter(reporter)).digest('hex');
}

export function digestReporterFileContents(contents: string): string {
  return createHash('sha256').update(contents).digest('hex');
}

/** Derive every countable fact from the reporter artifact, never from constants. */
export function deriveReporterFacts(reporter: NormalizedReporter): DerivedReporterFacts {
  const testTitles = reporter.tests.map((t) => `${t.projectName}|${t.title}`);
  const actualOrigins = Array.from(new Set(reporter.captureEvents.map((e) => e.actualOrigin))).sort();
  const captureIds = Array.from(new Set(reporter.captureEvents.map((e) => e.captureId))).sort();
  return {
    passed: reporter.stats.expected,
    failed: reporter.stats.unexpected + reporter.stats.flaky,
    skipped: reporter.stats.skipped,
    interrupted: reporter.stats.interrupted,
    testTitles,
    actualOrigins,
    captureIds,
    captureEvents: reporter.captureEvents,
    captureRecordCount: reporter.captureEvents.length,
  };
}

export type ReporterLoadResult =
  | { ok: true; reporter: NormalizedReporter; contents: string; sha256: string }
  | { ok: false; failures: string[] };

/**
 * Open the committed artifact, recompute its digest and validate its shape.
 * Fails closed on a missing file, a digest mismatch, an unknown command contract
 * key or a command string that does not match the frozen contract.
 */
export function loadNormalizedReporter(
  root: string,
  relPath: string,
  expectedSha256: string,
  expectedRunId: string,
  expectedCommandContractKey: string,
  expectedCommand: string,
): ReporterLoadResult {
  const failures: string[] = [];
  const abs = join(root, relPath);
  if (!existsSync(abs)) {
    return { ok: false, failures: [`normalized reporter artifact missing: ${relPath}`] };
  }
  const contents = readFileSync(abs, 'utf8');
  const sha256 = digestReporterFileContents(contents);
  if (sha256 !== expectedSha256) {
    failures.push(
      `normalized reporter ${relPath} sha256 ${sha256} does not match recorded ${expectedSha256}`,
    );
  }

  let reporter: NormalizedReporter;
  try {
    reporter = JSON.parse(contents) as NormalizedReporter;
  } catch (err) {
    return { ok: false, failures: [...failures, `${relPath} is not valid JSON: ${(err as Error).message}`] };
  }

  if (reporter.schema !== PREMIUM_REPORTER_SCHEMA) {
    failures.push(`${relPath} schema ${reporter.schema}, expected ${PREMIUM_REPORTER_SCHEMA}`);
  }
  if (reporter.runId !== expectedRunId) {
    failures.push(`${relPath} runId ${reporter.runId}, expected ${expectedRunId}`);
  }
  const contractCommand = (PREMIUM_COMMAND_CONTRACT as Record<string, string>)[
    expectedCommandContractKey
  ];
  if (!contractCommand) {
    failures.push(`unknown command contract key ${expectedCommandContractKey}`);
  } else {
    if (expectedCommand !== contractCommand) {
      failures.push(
        `recorded command "${expectedCommand}" does not match contract "${contractCommand}"`,
      );
    }
    if (reporter.command !== contractCommand) {
      failures.push(
        `${relPath} command "${reporter.command}" does not match contract "${contractCommand}"`,
      );
    }
  }
  if (reporter.commandContractKey !== expectedCommandContractKey) {
    failures.push(
      `${relPath} commandContractKey ${reporter.commandContractKey}, expected ${expectedCommandContractKey}`,
    );
  }
  if (!Array.isArray(reporter.tests) || reporter.tests.length === 0) {
    failures.push(`${relPath} contains no test results`);
  }
  if (!Array.isArray(reporter.captureEvents) || reporter.captureEvents.length === 0) {
    failures.push(`${relPath} contains no capture events`);
  }

  const testIds = new Set((reporter.tests ?? []).map((t) => t.testId));
  for (const event of reporter.captureEvents ?? []) {
    if (!testIds.has(event.emittedByTestId)) {
      failures.push(
        `${relPath} capture ${event.captureId} references unknown test ${event.emittedByTestId}`,
      );
    }
  }

  if (failures.length > 0) return { ok: false, failures };
  return { ok: true, reporter, contents, sha256 };
}
