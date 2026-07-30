/**
 * Candidate pack provenance binding.
 *
 * Capture bytes are hashed *before* pack assembly and must match exactly when
 * the pack is generated. Re-hashing after reading never "authenticates" a
 * mutated file — the pre-recorded hash is the authority.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { GateSummary, InvariantFailure } from './types';

export type PreRecordedCapture = {
  relativePath: string;
  kind: 'png' | 'pdf';
  /** SHA-256 of the capture bytes at evidence-recording time. */
  sha256: string;
  byteLength: number;
  surfaceId: string;
  runtimeStateId: string;
  setupId: string;
};

export type GateEvidence = {
  status: 'browser_gate_green';
  sourceCommit: string;
  manifestDigest: string;
  gates: GateSummary;
  changedSurfaces: readonly string[];
  /** Setup IDs exercised by the gate. */
  setupIds: readonly string[];
  /** Surface / runtime-state identities exercised by the gate. */
  executedSurfaceStates: readonly { surfaceId: string; runtimeStateId: string }[];
  /** Captures with hashes recorded *before* pack assembly. */
  captures: readonly PreRecordedCapture[];
};

export type ProvenanceValidationInput = {
  evidence: GateEvidence;
  currentSourceCommit: string;
  currentManifestDigest: string;
  /** Absolute directory containing the capture files named in evidence. */
  captureDirectory: string;
  /** Manifest surface IDs that are legal for this pack. */
  manifestSurfaceIds: ReadonlySet<string>;
  manifestSetupIds: ReadonlySet<string>;
  manifestRuntimeStateIds: ReadonlySet<string>;
};

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

/**
 * Validate gate evidence against current HEAD / digest and pre-recorded hashes.
 * Does not write a pack; callers generate only after this returns zero failures.
 */
export function validateCandidateProvenance(
  input: ProvenanceValidationInput,
): readonly InvariantFailure[] {
  const failures: InvariantFailure[] = [];
  const { evidence } = input;

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

  for (const setupId of evidence.setupIds ?? []) {
    if (!input.manifestSetupIds.has(setupId)) {
      failures.push(
        failure('SETUP_UNKNOWN_ID', `gate evidence setupId not in manifest: ${setupId}`, { setupId }),
      );
    }
  }
  for (const executed of evidence.executedSurfaceStates ?? []) {
    if (!input.manifestSurfaceIds.has(executed.surfaceId)) {
      failures.push(
        failure('ADAPTER_UNREGISTERED_ROUTE', `gate evidence surface not in manifest: ${executed.surfaceId}`, {
          surfaceId: executed.surfaceId,
        }),
      );
    }
    if (!input.manifestRuntimeStateIds.has(executed.runtimeStateId)) {
      failures.push(
        failure('ADAPTER_UNREGISTERED_STATE', `gate evidence state not in manifest: ${executed.runtimeStateId}`, {
          runtimeStateId: executed.runtimeStateId,
        }),
      );
    }
  }

  const seenPaths = new Set<string>();
  for (const capture of evidence.captures ?? []) {
    if (seenPaths.has(capture.relativePath)) {
      failures.push(
        failure('PROMOTION_ALTERED_CANDIDATE_HASH', `duplicate capture path: ${capture.relativePath}`, {
          relativePath: capture.relativePath,
        }),
      );
    }
    seenPaths.add(capture.relativePath);

    if (!capture.sha256 || capture.sha256.length !== 64) {
      failures.push(
        failure('PROMOTION_ALTERED_CANDIDATE_HASH', `capture missing pre-recorded hash: ${capture.relativePath}`, {
          relativePath: capture.relativePath,
        }),
      );
      continue;
    }
    if (!input.manifestSurfaceIds.has(capture.surfaceId)) {
      failures.push(
        failure('ADAPTER_UNREGISTERED_ROUTE', `capture surface not in manifest: ${capture.surfaceId}`, {
          relativePath: capture.relativePath,
        }),
      );
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

    // Compare against the *pre-recorded* hash — never treat a fresh hash of
    // mutated bytes as authentication.
    const actual = sha256OfBytes(bytes);
    if (actual !== capture.sha256) {
      failures.push(
        failure('PROMOTION_ALTERED_CANDIDATE_HASH', `capture bytes altered since evidence recording`, {
          relativePath: capture.relativePath,
          preRecorded: capture.sha256,
          actual,
        }),
      );
    }
    if (bytes.byteLength !== capture.byteLength) {
      failures.push(
        failure('PROMOTION_ALTERED_CANDIDATE_HASH', `capture byteLength altered`, {
          relativePath: capture.relativePath,
          preRecorded: capture.byteLength,
          actual: bytes.byteLength,
        }),
      );
    }
  }

  return failures;
}

/** Build pack capture payloads only after provenance validation has passed. */
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
  identity: { surfaceId: string; runtimeStateId: string; setupId: string },
): PreRecordedCapture {
  return {
    relativePath,
    kind,
    sha256: sha256OfBytes(data),
    byteLength: data.byteLength,
    surfaceId: identity.surfaceId,
    runtimeStateId: identity.runtimeStateId,
    setupId: identity.setupId,
  };
}
