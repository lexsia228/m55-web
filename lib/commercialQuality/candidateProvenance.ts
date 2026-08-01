/**
 * Candidate pack provenance binding — exact manifest tuple + inventory.
 *
 * Independent ID membership is never enough. Each capture must bind the exact
 * (surfaceId, route, runtimeStateId, setupId, fixture, viewport, profile,
 * executionMode, outputMode) tuple present in the current manifest, with
 * pre-recorded hashes and a complete directory inventory.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import type { GateSummary, InvariantFailure } from './types';

export type ManifestTuple = {
  surfaceId: string;
  route: string;
  runtimeStateId: string;
  setupId: string;
  fixtureId: string | null;
  preconditionIdentity: string;
  viewport: { width: number; height: number };
  profile: string;
  executionMode: string;
  outputMode: string;
};

export type PreRecordedCapture = {
  relativePath: string;
  kind: 'png' | 'pdf';
  sha256: string;
  byteLength: number;
  surfaceId: string;
  route: string;
  runtimeStateId: string;
  setupId: string;
  fixtureId: string | null;
  preconditionIdentity: string;
  viewport: { width: number; height: number };
  profile: string;
  executionMode: string;
  outputMode: string;
};

export type ExecutedTuple = {
  surfaceId: string;
  route: string;
  runtimeStateId: string;
  setupId: string;
  fixtureId: string | null;
  preconditionIdentity: string;
  viewport: { width: number; height: number };
  profile: string;
  executionMode: string;
  outputMode: string;
};

export type GateEvidence = {
  status: 'browser_gate_green';
  sourceCommit: string;
  manifestDigest: string;
  gates: GateSummary;
  changedSurfaces: readonly string[];
  setupIds: readonly string[];
  executedTuples: readonly ExecutedTuple[];
  /** Captures with hashes recorded *before* pack assembly. */
  captures: readonly PreRecordedCapture[];
  /** Exact relative paths present at evidence-recording time. */
  inventory: readonly string[];
};

export type ProvenanceValidationInput = {
  evidence: GateEvidence;
  currentSourceCommit: string;
  currentManifestDigest: string;
  captureDirectory: string;
  manifestTuples: readonly ManifestTuple[];
};

export const DEFAULT_PROVENANCE_VIEWPORT = { width: 390, height: 844 } as const;
export const DEFAULT_PROVENANCE_PROFILE = 'default' as const;
export const DEFAULT_PROVENANCE_EXECUTION_MODE = 'fresh_load' as const;
export const DEFAULT_PROVENANCE_OUTPUT_MODE = 'screen' as const;

function failure(
  code: InvariantFailure['code'],
  message: string,
  diagnostics: Record<string, unknown> = {},
): InvariantFailure {
  return { code, message, diagnostics, selector: null };
}

export function sha256OfBytes(data: Uint8Array | Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

function tupleKey(t: {
  surfaceId: string;
  route: string;
  runtimeStateId: string;
  setupId: string;
  fixtureId: string | null;
  preconditionIdentity: string;
  viewport: { width: number; height: number };
  profile: string;
  executionMode: string;
  outputMode: string;
}): string {
  return [
    t.surfaceId,
    t.route,
    t.runtimeStateId,
    t.setupId,
    t.fixtureId ?? '',
    t.preconditionIdentity,
    String(t.viewport.width),
    String(t.viewport.height),
    t.profile,
    t.executionMode,
    t.outputMode,
  ].join('|');
}

function listInventory(directory: string): string[] {
  try {
    return readdirSync(directory)
      .filter((name) => {
        try {
          return statSync(join(directory, name)).isFile();
        } catch {
          return false;
        }
      })
      .sort();
  } catch {
    return [];
  }
}

export function validateCandidateProvenance(
  input: ProvenanceValidationInput,
): readonly InvariantFailure[] {
  const failures: InvariantFailure[] = [];
  const { evidence } = input;
  const manifestKeys = new Set(input.manifestTuples.map(tupleKey));

  if (evidence.status !== 'browser_gate_green') {
    failures.push(
      failure('PROMOTION_GEOMETRY_NOT_GREEN', 'gate evidence status is not browser_gate_green', {
        status: evidence.status,
      }),
    );
  }
  if (!evidence.gates?.geometryGreen || !evidence.gates?.semanticGreen || !evidence.gates?.accessibilityGreen) {
    failures.push(
      failure('PROMOTION_GEOMETRY_NOT_GREEN', 'gate evidence is not fully GREEN', {
        gates: evidence.gates,
      }),
    );
  }
  if (evidence.sourceCommit !== input.currentSourceCommit) {
    failures.push(
      failure('PROMOTION_STALE_SOURCE_COMMIT', 'gate evidence sourceCommit ≠ current HEAD', {
        evidence: evidence.sourceCommit,
        current: input.currentSourceCommit,
      }),
    );
  }
  if (evidence.manifestDigest !== input.currentManifestDigest) {
    failures.push(
      failure('PROMOTION_STALE_MANIFEST_DIGEST', 'gate evidence manifestDigest ≠ current digest', {
        evidence: evidence.manifestDigest,
        current: input.currentManifestDigest,
      }),
    );
  }
  if (!Array.isArray(evidence.captures) || evidence.captures.length === 0) {
    failures.push(
      failure('PROMOTION_ALTERED_CANDIDATE_HASH', 'gate evidence has no pre-recorded captures', {}),
    );
  }
  if (!Array.isArray(evidence.inventory)) {
    failures.push(
      failure('PROMOTION_ALTERED_CANDIDATE_HASH', 'gate evidence missing inventory', {}),
    );
  }

  const executedKeys = new Set<string>();
  for (const executed of evidence.executedTuples ?? []) {
    const key = tupleKey(executed);
    if (executedKeys.has(key)) {
      failures.push(
        failure('PROMOTION_ALTERED_CANDIDATE_HASH', 'duplicate executed tuple', { key }),
      );
    }
    executedKeys.add(key);
    if (!manifestKeys.has(key)) {
      failures.push(
        failure('ADAPTER_UNREGISTERED_STATE', 'executed tuple not in current manifest', {
          key,
        }),
      );
    }
  }

  const captureKeys = new Set<string>();
  const capturePaths = new Set<string>();
  for (const capture of evidence.captures ?? []) {
    const key = tupleKey(capture);
    if (captureKeys.has(key)) {
      failures.push(
        failure('PROMOTION_ALTERED_CANDIDATE_HASH', 'duplicate capture tuple', { key }),
      );
    }
    captureKeys.add(key);
    if (capturePaths.has(capture.relativePath)) {
      failures.push(
        failure('PROMOTION_ALTERED_CANDIDATE_HASH', `duplicate capture path: ${capture.relativePath}`, {
          relativePath: capture.relativePath,
        }),
      );
    }
    capturePaths.add(capture.relativePath);

    if (!manifestKeys.has(key)) {
      failures.push(
        failure('ADAPTER_UNREGISTERED_ROUTE', 'capture tuple not in current manifest', { key }),
      );
    }
    if (!executedKeys.has(key)) {
      failures.push(
        failure('PROMOTION_ALTERED_CANDIDATE_HASH', 'capture tuple was not executed', { key }),
      );
    }
    if (!capture.sha256 || capture.sha256.length !== 64) {
      failures.push(
        failure('PROMOTION_ALTERED_CANDIDATE_HASH', `capture missing pre-recorded hash: ${capture.relativePath}`, {
          relativePath: capture.relativePath,
        }),
      );
      continue;
    }

    let bytes: Buffer;
    try {
      bytes = readFileSync(join(input.captureDirectory, capture.relativePath));
    } catch {
      failures.push(
        failure('PROMOTION_ALTERED_CANDIDATE_HASH', `capture file missing: ${capture.relativePath}`, {
          relativePath: capture.relativePath,
        }),
      );
      continue;
    }

    const actual = sha256OfBytes(bytes);
    if (actual !== capture.sha256) {
      failures.push(
        failure('PROMOTION_ALTERED_CANDIDATE_HASH', 'capture bytes altered since evidence recording', {
          relativePath: capture.relativePath,
          preRecorded: capture.sha256,
          actual,
        }),
      );
    }
    if (bytes.byteLength !== capture.byteLength) {
      failures.push(
        failure('PROMOTION_ALTERED_CANDIDATE_HASH', 'capture byteLength altered', {
          relativePath: capture.relativePath,
          preRecorded: capture.byteLength,
          actual: bytes.byteLength,
        }),
      );
    }
  }

  // Complete inventory: current directory must equal pre-recorded inventory exactly.
  const recordedInventory = [...(evidence.inventory ?? [])].sort();
  const currentInventory = listInventory(input.captureDirectory).filter(
    (name) => name !== 'gate-summary.json' && name !== 'provenance.json',
  );
  if (recordedInventory.join('|') !== currentInventory.join('|')) {
    failures.push(
      failure('PROMOTION_ALTERED_CANDIDATE_HASH', 'capture inventory differs from evidence recording', {
        recorded: recordedInventory,
        current: currentInventory,
      }),
    );
  }
  for (const path of recordedInventory) {
    if (!capturePaths.has(path) && !path.endsWith('.json')) {
      if (!capturePaths.has(path)) {
        failures.push(
          failure('PROMOTION_ALTERED_CANDIDATE_HASH', `inventory file not bound to a capture: ${path}`, {
            path,
          }),
        );
      }
    }
  }

  return failures;
}

export function loadProvenancedCaptures(
  evidence: GateEvidence,
  captureDirectory: string,
): { relativePath: string; kind: 'png' | 'pdf'; data: Uint8Array }[] {
  return evidence.captures.map((capture) => ({
    relativePath: capture.relativePath,
    kind: capture.kind,
    data: readFileSync(join(captureDirectory, capture.relativePath)),
  }));
}

export function recordCaptureHash(
  relativePath: string,
  kind: 'png' | 'pdf',
  data: Uint8Array,
  identity: Omit<PreRecordedCapture, 'relativePath' | 'kind' | 'sha256' | 'byteLength'>,
): PreRecordedCapture {
  return {
    relativePath,
    kind,
    sha256: sha256OfBytes(data),
    byteLength: data.byteLength,
    ...identity,
  };
}

export function manifestTuplesFromEntries(
  entries: readonly {
    surfaceId: string;
    route: string;
    runtimeStateId: string;
    setupId: string;
    preconditions: readonly string[];
  }[],
  fixtureBySetupId: ReadonlyMap<string, string | null>,
  options?: {
    viewport?: { width: number; height: number };
    profile?: string;
    executionMode?: string;
    outputMode?: string;
  },
): ManifestTuple[] {
  const viewport = options?.viewport ?? { ...DEFAULT_PROVENANCE_VIEWPORT };
  const profile = options?.profile ?? DEFAULT_PROVENANCE_PROFILE;
  const executionMode = options?.executionMode ?? DEFAULT_PROVENANCE_EXECUTION_MODE;
  const outputMode = options?.outputMode ?? DEFAULT_PROVENANCE_OUTPUT_MODE;
  return entries.map((entry) => ({
    surfaceId: entry.surfaceId,
    route: entry.route,
    runtimeStateId: entry.runtimeStateId,
    setupId: entry.setupId,
    fixtureId: fixtureBySetupId.get(entry.setupId) ?? null,
    preconditionIdentity: [...entry.preconditions].sort().join(';'),
    viewport: { ...viewport },
    profile,
    executionMode,
    outputMode,
  }));
}
