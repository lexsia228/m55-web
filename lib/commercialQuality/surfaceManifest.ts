/**
 * Surface / state manifest validation (schema v1) and deterministic digest.
 *
 * Pure and repository-independent: no project authority is imported here.
 */
import { createHash } from 'node:crypto';

import {
  CANONICAL_BASELINE_STATES,
  COMMERCIAL_QUALITY_SCHEMA_VERSION,
  CONTENT_STRESS_PROFILES,
  EXECUTION_PROFILES,
  type InvariantFailure,
  type SurfaceManifest,
  type SurfaceManifestEntry,
} from './types';

function failure(
  code: InvariantFailure['code'],
  message: string,
  diagnostics: Record<string, unknown> = {},
  selector: string | null = null,
): InvariantFailure {
  return { code, message, diagnostics, selector };
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/** Validate a single entry. Returns every violated rule, not just the first. */
export function validateSurfaceManifestEntry(
  entry: SurfaceManifestEntry,
): readonly InvariantFailure[] {
  const failures: InvariantFailure[] = [];
  const at = { surfaceId: entry.surfaceId, runtimeStateId: entry.runtimeStateId };

  if (entry.schemaVersion !== COMMERCIAL_QUALITY_SCHEMA_VERSION) {
    failures.push(
      failure('MANIFEST_UNKNOWN_SCHEMA_VERSION', `unsupported schema version`, {
        ...at,
        received: entry.schemaVersion,
        supported: COMMERCIAL_QUALITY_SCHEMA_VERSION,
      }),
    );
  }

  if (!entry.surfaceId.includes(':')) {
    failures.push(
      failure('MANIFEST_MISSING_AUTHORITY_REFERENCE', 'surfaceId must be project-qualified', at),
    );
  }
  if (entry.runtimeStateId.trim().length === 0) {
    failures.push(failure('MANIFEST_MISSING_SETUP', 'runtimeStateId must be stable', at));
  }
  if (entry.setupId.trim().length === 0) {
    failures.push(failure('MANIFEST_MISSING_SETUP', 'setupId is required', at));
  }
  if (entry.authorityReferences.length === 0) {
    failures.push(
      failure('MANIFEST_MISSING_AUTHORITY_REFERENCE', 'at least one authority reference', at),
    );
  }
  if (entry.sourceOwnerFiles.length === 0) {
    failures.push(failure('MANIFEST_MISSING_SOURCE_OWNER', 'sourceOwnerFiles is required', at));
  }
  if (entry.protectedElements.length === 0) {
    failures.push(
      failure('MANIFEST_MISSING_PROTECTED_ELEMENTS', 'protectedElements must be non-empty', at),
    );
  }

  const patternish = /[:*]/.test(entry.route);
  if (patternish !== entry.routeIsPattern) {
    failures.push(
      failure('MANIFEST_MISSING_AUTHORITY_REFERENCE', 'routeIsPattern contradicts route', {
        ...at,
        route: entry.route,
        routeIsPattern: entry.routeIsPattern,
      }),
    );
  }

  if (entry.criticalCta) {
    const cta = entry.criticalCta;
    if (!cta.ctaAuthority || cta.ctaAuthority.key.trim().length === 0) {
      failures.push(
        failure('MANIFEST_MISSING_CTA_AUTHORITY', 'critical CTA requires a CTA authority', {
          ...at,
          selector: cta.selector,
        }),
      );
    }
    if (!isPositiveInt(cta.minTargetPx)) {
      failures.push(
        failure('MANIFEST_MISSING_CTA_AUTHORITY', 'critical CTA requires minTargetPx', at),
      );
    }
  }

  const vp = entry.viewport;
  const rangeInvalid =
    !isPositiveInt(vp.minWidth) ||
    !isPositiveInt(vp.maxWidth) ||
    !isPositiveInt(vp.widthStep) ||
    vp.maxWidth <= vp.minWidth ||
    vp.widthStep > vp.maxWidth - vp.minWidth ||
    vp.heightMatrix.length === 0 ||
    vp.heightMatrix.some((h) => !isPositiveInt(h)) ||
    vp.breakpointNeighborhoods.some((w) => !isPositiveInt(w) || w < vp.minWidth || w > vp.maxWidth);
  if (rangeInvalid) {
    failures.push(
      failure('MANIFEST_INVALID_VIEWPORT_RANGE', 'viewport range is invalid', { ...at, viewport: vp }),
    );
  }

  const ob = entry.outputBehaviour;
  const outputDeclared =
    typeof ob?.screen === 'boolean' &&
    typeof ob?.print === 'boolean' &&
    typeof ob?.pdf === 'boolean' &&
    typeof ob?.sharedImage === 'boolean';
  if (!outputDeclared || !(ob.screen || ob.print || ob.pdf || ob.sharedImage)) {
    failures.push(
      failure('MANIFEST_MISSING_OUTPUT_BEHAVIOUR', 'output behaviour must be declared', at),
    );
  }

  if (!CANONICAL_BASELINE_STATES.includes(entry.canonicalBaseline)) {
    failures.push(
      failure('MANIFEST_CANDIDATE_MARKED_CANONICAL', 'unknown canonicalBaseline status', {
        ...at,
        received: entry.canonicalBaseline,
      }),
    );
  }
  if (entry.canonicalBaseline === 'candidate' && entry.baselineApproval !== null) {
    failures.push(
      failure(
        'MANIFEST_CANDIDATE_MARKED_CANONICAL',
        'candidate baseline must not carry an approval record',
        at,
      ),
    );
  }
  if (entry.canonicalBaseline === 'human-approved') {
    const rec = entry.baselineApproval;
    const complete =
      rec !== null &&
      rec.humanApprovalRef.trim().length > 0 &&
      rec.independentReviewRef.trim().length > 0 &&
      rec.sourceCommit.trim().length > 0 &&
      rec.manifestDigest.trim().length > 0;
    if (!complete) {
      failures.push(
        failure(
          'MANIFEST_APPROVED_BASELINE_WITHOUT_RECORD',
          'human-approved baseline requires approval record and source commit',
          at,
        ),
      );
    }
  }

  for (const profile of entry.contentStressProfiles) {
    if (!CONTENT_STRESS_PROFILES.includes(profile)) {
      failures.push(
        failure('MANIFEST_MISSING_SETUP', `unknown content stress profile: ${profile}`, at),
      );
    }
  }
  for (const profile of entry.executionProfiles) {
    if (!EXECUTION_PROFILES.includes(profile)) {
      failures.push(failure('MANIFEST_MISSING_SETUP', `unknown execution profile: ${profile}`, at));
    }
  }
  if (entry.executionProfiles.length === 0) {
    failures.push(failure('MANIFEST_MISSING_SETUP', 'at least one execution profile', at));
  }

  return failures;
}

export function validateSurfaceManifest(manifest: SurfaceManifest): readonly InvariantFailure[] {
  const failures: InvariantFailure[] = [];

  if (manifest.schemaVersion !== COMMERCIAL_QUALITY_SCHEMA_VERSION) {
    failures.push(
      failure('MANIFEST_UNKNOWN_SCHEMA_VERSION', 'unsupported manifest schema version', {
        received: manifest.schemaVersion,
      }),
    );
  }

  const seenSurfaces = new Set<string>();
  const seenIdentities = new Set<string>();
  for (const entry of manifest.entries) {
    if (seenSurfaces.has(entry.surfaceId)) {
      failures.push(
        failure('MANIFEST_DUPLICATE_SURFACE_ID', `duplicate surfaceId: ${entry.surfaceId}`, {
          surfaceId: entry.surfaceId,
        }),
      );
    }
    seenSurfaces.add(entry.surfaceId);

    const identity = `${entry.route}::${entry.runtimeStateId}`;
    if (seenIdentities.has(identity)) {
      failures.push(
        failure(
          'MANIFEST_DUPLICATE_ROUTE_STATE_IDENTITY',
          `duplicate route/state identity: ${identity}`,
          { identity, surfaceId: entry.surfaceId },
        ),
      );
    }
    seenIdentities.add(identity);

    failures.push(...validateSurfaceManifestEntry(entry));
  }

  return failures;
}

/** Stable key order so the digest only changes when governed content changes. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) out[key] = canonicalize(source[key]);
    return out;
  }
  return value;
}

export function manifestDigest(manifest: SurfaceManifest): string {
  return createHash('sha256').update(JSON.stringify(canonicalize(manifest))).digest('hex');
}

export function manifestEntry(
  manifest: SurfaceManifest,
  surfaceId: string,
): SurfaceManifestEntry | undefined {
  return manifest.entries.find((entry) => entry.surfaceId === surfaceId);
}
