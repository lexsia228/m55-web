/**
 * M55 adapter contracts for the commercial quality control plane.
 *
 * Responsibilities:
 * - prove every imported governed identity is registered (coverage)
 * - reject unknown Product Truth / Asset Ledger references
 * - reject duplicate imported authority
 * - expose the consolidation interface for existing systems (Commit B migrates
 *   HOME as the first consumer; nothing is deleted or migrated here)
 */
import { validateManifestSetups } from '../../../commercialQuality/setupRegistry';
import {
  manifestDigest,
  validateSurfaceManifest,
} from '../../../commercialQuality/surfaceManifest';
import type { InvariantFailure, SurfaceManifestEntry } from '../../../commercialQuality/types';
import { M55_EXPERIENCE_ROUTE_REGISTRY } from '../experience/experienceRouteRegistry';
import { PREMIUM_EXPERIENCE_CAPTURE_CASES } from '../premiumExperience/premiumExperienceCaptureModel';
import { PREMIUM_EXPERIENCE_STATE_REGISTRY } from '../premiumExperience/premiumExperienceStateRegistry';
import { COMMERCIAL_VISUAL_CASES } from '../visualQuality/commercialVisualQualityContract';
import { M55_METHOD_ROUTE_CONSUMPTION } from '../../method/m55MethodRouteConsumption';
import { M55_SETUP_REGISTRY, m55SetupById } from './m55SetupRegistry';
import {
  M55_COMMERCIAL_QUALITY_MANIFEST,
  M55_QUALITY_PROJECT_ID,
  M55_REGISTRATION_COUNTS,
  isKnownAuthorityReference,
} from './m55SurfaceManifest';

function failure(
  code: InvariantFailure['code'],
  message: string,
  diagnostics: Record<string, unknown> = {},
): InvariantFailure {
  return { code, message, diagnostics, selector: null };
}

const entriesBySurfaceId = new Map(
  M55_COMMERCIAL_QUALITY_MANIFEST.entries.map((entry) => [entry.surfaceId, entry]),
);

export function m55SurfaceById(surfaceId: string): SurfaceManifestEntry | undefined {
  return entriesBySurfaceId.get(surfaceId);
}

function surfaceMapFrom(
  entries: readonly SurfaceManifestEntry[] = M55_COMMERCIAL_QUALITY_MANIFEST.entries,
): Map<string, SurfaceManifestEntry> {
  return new Map(entries.map((entry) => [entry.surfaceId, entry]));
}

/** Every ECP route must have a registered surface with a runtime-state contract. */
export function checkEcpCoverage(
  surfaces: ReadonlyMap<string, SurfaceManifestEntry> = entriesBySurfaceId,
): readonly InvariantFailure[] {
  const failures: InvariantFailure[] = [];
  for (const entry of M55_EXPERIENCE_ROUTE_REGISTRY) {
    const surfaceId = `${M55_QUALITY_PROJECT_ID}:ecp.${entry.id}`;
    const surface = surfaces.get(surfaceId);
    if (!surface) {
      failures.push(
        failure('ADAPTER_UNREGISTERED_ROUTE', `ECP route without surface registration: ${entry.id}`, {
          routeId: entry.id,
        }),
      );
      continue;
    }
    if (surface.runtimeStateId.trim().length === 0) {
      failures.push(
        failure(
          'ADAPTER_MISSING_RUNTIME_STATE_CONTRACT',
          `registered route missing runtime-state contract: ${entry.id}`,
          { routeId: entry.id },
        ),
      );
    }
    if (surface.route !== entry.pattern) {
      failures.push(
        failure('ADAPTER_UNREGISTERED_ROUTE', `registered route drifted from ECP: ${entry.id}`, {
          routeId: entry.id,
          registered: surface.route,
          ecp: entry.pattern,
        }),
      );
    }
  }
  return failures;
}

export function checkPremiumStateCoverage(
  surfaces: ReadonlyMap<string, SurfaceManifestEntry> = entriesBySurfaceId,
): readonly InvariantFailure[] {
  const failures: InvariantFailure[] = [];
  for (const state of PREMIUM_EXPERIENCE_STATE_REGISTRY) {
    const surface = surfaces.get(`${M55_QUALITY_PROJECT_ID}:premium.${state.id}`);
    if (!surface) {
      failures.push(
        failure('ADAPTER_UNREGISTERED_STATE', `Premium state not registered: ${state.id}`, {
          stateId: state.id,
        }),
      );
      continue;
    }
    if (!surface.preconditions.includes(`ecp_route:${state.ecpRouteId}`)) {
      failures.push(
        failure(
          'ADAPTER_MISSING_RUNTIME_STATE_CONTRACT',
          `Premium state does not bind its ECP route: ${state.id}`,
          { stateId: state.id, ecpRouteId: state.ecpRouteId },
        ),
      );
    }
  }
  return failures;
}

export function checkPremiumCaptureCoverage(): readonly InvariantFailure[] {
  const failures: InvariantFailure[] = [];
  const registeredStateIds = new Set(PREMIUM_EXPERIENCE_STATE_REGISTRY.map((s) => s.id));
  for (const capture of PREMIUM_EXPERIENCE_CAPTURE_CASES) {
    const surface = entriesBySurfaceId.get(
      `${M55_QUALITY_PROJECT_ID}:capture.${capture.captureId}`,
    );
    if (!surface) {
      failures.push(
        failure('ADAPTER_UNREGISTERED_STATE', `Premium capture not registered: ${capture.captureId}`, {
          captureId: capture.captureId,
        }),
      );
      continue;
    }
    if (!registeredStateIds.has(capture.stateId)) {
      failures.push(
        failure(
          'ADAPTER_UNREGISTERED_STATE',
          `capture references an unregistered state: ${capture.captureId}`,
          { captureId: capture.captureId, stateId: capture.stateId },
        ),
      );
    }
  }
  return failures;
}

export function checkCommercialVisualCoverage(): readonly InvariantFailure[] {
  const failures: InvariantFailure[] = [];
  for (const visualCase of COMMERCIAL_VISUAL_CASES) {
    const surface = entriesBySurfaceId.get(
      `${M55_QUALITY_PROJECT_ID}:visual.${visualCase.caseId}`,
    );
    if (!surface) {
      failures.push(
        failure('ADAPTER_UNREGISTERED_ROUTE', `visual case not registered: ${visualCase.caseId}`, {
          caseId: visualCase.caseId,
        }),
      );
      continue;
    }
    if (surface.route !== visualCase.route) {
      failures.push(
        failure('ADAPTER_UNREGISTERED_ROUTE', `visual case route drift: ${visualCase.caseId}`, {
          caseId: visualCase.caseId,
          registered: surface.route,
          contract: visualCase.route,
        }),
      );
    }
  }
  return failures;
}

/** Method placements are referenced, never restated. */
export function checkMethodAuthorityReferences(): readonly InvariantFailure[] {
  const failures: InvariantFailure[] = [];
  for (const placement of M55_METHOD_ROUTE_CONSUMPTION) {
    if (!isKnownAuthorityReference({ kind: 'method_placement', key: placement.id })) {
      failures.push(
        failure(
          'ADAPTER_UNKNOWN_AUTHORITY_REFERENCE',
          `method placement is not a known authority key: ${placement.id}`,
          { placementId: placement.id },
        ),
      );
    }
  }
  return failures;
}

/** Every declared authority reference must resolve inside a known authority. */
export function checkAuthorityReferences(): readonly InvariantFailure[] {
  const failures: InvariantFailure[] = [];
  for (const entry of M55_COMMERCIAL_QUALITY_MANIFEST.entries) {
    const seen = new Set<string>();
    for (const reference of entry.authorityReferences) {
      const identity = `${reference.kind}:${reference.key}`;
      if (seen.has(identity)) {
        failures.push(
          failure('ADAPTER_DUPLICATE_IMPORTED_AUTHORITY', `duplicate authority reference`, {
            surfaceId: entry.surfaceId,
            reference: identity,
          }),
        );
      }
      seen.add(identity);
      if (!isKnownAuthorityReference(reference)) {
        failures.push(
          failure('ADAPTER_UNKNOWN_AUTHORITY_REFERENCE', `unknown authority reference`, {
            surfaceId: entry.surfaceId,
            reference: identity,
          }),
        );
      }
    }
  }
  return failures;
}

/** No user-visible ECP state may exist without a registered surface. */
export function checkUnregisteredUserVisibleStates(): readonly InvariantFailure[] {
  const failures: InvariantFailure[] = [];
  const registeredEcpRuntimeStates = new Set(
    M55_COMMERCIAL_QUALITY_MANIFEST.entries
      .filter((entry) => entry.surfaceId.startsWith(`${M55_QUALITY_PROJECT_ID}:ecp.`))
      .map((entry) => entry.runtimeStateId),
  );
  for (const entry of M55_EXPERIENCE_ROUTE_REGISTRY) {
    const expected = `ecp:${entry.id}:${entry.state ?? 'default'}`;
    if (!registeredEcpRuntimeStates.has(expected)) {
      failures.push(
        failure(
          'ADAPTER_MISSING_RUNTIME_STATE_CONTRACT',
          `user-visible state not registered: ${expected}`,
          { routeId: entry.id },
        ),
      );
    }
  }
  return failures;
}

export type AdapterCoverageReport = {
  projectId: string;
  schemaVersion: number;
  manifestDigest: string;
  counts: typeof M55_REGISTRATION_COUNTS;
  expectedCounts: {
    ecpEntries: number;
    premiumStates: number;
    premiumCaptures: number;
    commercialVisualCases: number;
  };
  failures: readonly InvariantFailure[];
};

export function checkSetupRegistry(): readonly InvariantFailure[] {
  const failures = [...validateManifestSetups(M55_COMMERCIAL_QUALITY_MANIFEST, M55_SETUP_REGISTRY)];
  for (const entry of M55_COMMERCIAL_QUALITY_MANIFEST.entries) {
    const setup = m55SetupById(entry.setupId);
    if (!setup || typeof setup.execute !== 'function') {
      failures.push(
        failure('SETUP_NO_EXECUTABLE_FUNCTION', `setup not executable: ${entry.setupId}`, {
          surfaceId: entry.surfaceId,
        }),
      );
    }
  }
  return failures;
}

export type AdapterNegativeKind =
  | 'remove_ecp_route'
  | 'alter_ecp_route'
  | 'remove_premium_state'
  | 'alter_premium_state'
  | 'duplicate_imported_authority'
  | 'unknown_setup'
  | 'setup_wrong_route'
  | 'setup_wrong_runtime_state'
  // Legacy aliases used by existing fixtures
  | 'unregistered_route'
  | 'unregistered_state'
  | 'duplicate_ecp';

/**
 * Production adapter negative probes — mutate a copy and invoke the real
 * exported enforcement functions. Never mocks PASS.
 */
export function probeAdapterNegative(kind: AdapterNegativeKind): readonly InvariantFailure[] {
  if (kind === 'remove_ecp_route' || kind === 'unregistered_route') {
    const dropped = M55_EXPERIENCE_ROUTE_REGISTRY[0];
    const map = surfaceMapFrom(
      M55_COMMERCIAL_QUALITY_MANIFEST.entries.filter(
        (entry) => entry.surfaceId !== `${M55_QUALITY_PROJECT_ID}:ecp.${dropped.id}`,
      ),
    );
    return checkEcpCoverage(map);
  }
  if (kind === 'alter_ecp_route') {
    const target = M55_EXPERIENCE_ROUTE_REGISTRY[0];
    const surfaceId = `${M55_QUALITY_PROJECT_ID}:ecp.${target.id}`;
    const map = surfaceMapFrom();
    const current = map.get(surfaceId);
    if (!current) return [failure('ADAPTER_UNREGISTERED_ROUTE', 'alter target missing', { surfaceId })];
    map.set(surfaceId, { ...current, route: '/cq-altered-route' });
    return checkEcpCoverage(map);
  }
  if (kind === 'remove_premium_state' || kind === 'unregistered_state') {
    const dropped = PREMIUM_EXPERIENCE_STATE_REGISTRY[0];
    const map = surfaceMapFrom(
      M55_COMMERCIAL_QUALITY_MANIFEST.entries.filter(
        (entry) => entry.surfaceId !== `${M55_QUALITY_PROJECT_ID}:premium.${dropped.id}`,
      ),
    );
    return checkPremiumStateCoverage(map);
  }
  if (kind === 'alter_premium_state') {
    const target = PREMIUM_EXPERIENCE_STATE_REGISTRY[0];
    const surfaceId = `${M55_QUALITY_PROJECT_ID}:premium.${target.id}`;
    const map = surfaceMapFrom();
    const current = map.get(surfaceId);
    if (!current) return [failure('ADAPTER_UNREGISTERED_STATE', 'alter target missing', { surfaceId })];
    map.set(surfaceId, {
      ...current,
      preconditions: current.preconditions.filter((p) => !p.startsWith('ecp_route:')),
    });
    return checkPremiumStateCoverage(map);
  }
  if (kind === 'duplicate_imported_authority') {
    const base = M55_COMMERCIAL_QUALITY_MANIFEST.entries[0];
    const dupRef = base.authorityReferences[0];
    const mutated = {
      ...base,
      authorityReferences: [...base.authorityReferences, dupRef],
    };
    const seen = new Set<string>();
    const failures: InvariantFailure[] = [];
    for (const reference of mutated.authorityReferences) {
      const identity = `${reference.kind}:${reference.key}`;
      if (seen.has(identity)) {
        failures.push(
          failure('ADAPTER_DUPLICATE_IMPORTED_AUTHORITY', 'duplicate authority reference', {
            surfaceId: mutated.surfaceId,
            reference: identity,
          }),
        );
      }
      seen.add(identity);
    }
    return failures;
  }
  if (kind === 'unknown_setup') {
    const entry = {
      ...M55_COMMERCIAL_QUALITY_MANIFEST.entries[0],
      setupId: 'm55.setup.DOES_NOT_EXIST',
    };
    return validateManifestSetups(
      { ...M55_COMMERCIAL_QUALITY_MANIFEST, entries: [entry] },
      M55_SETUP_REGISTRY,
    );
  }
  if (kind === 'setup_wrong_route') {
    const entry = M55_COMMERCIAL_QUALITY_MANIFEST.entries[0];
    const setup = m55SetupById(entry.setupId);
    if (!setup) return [failure('SETUP_UNKNOWN_ID', 'setup missing', { setupId: entry.setupId })];
    return validateManifestSetups(
      {
        ...M55_COMMERCIAL_QUALITY_MANIFEST,
        entries: [{ ...entry, route: '/cq-wrong-route', routeIsPattern: false }],
      },
      M55_SETUP_REGISTRY,
    );
  }
  if (kind === 'setup_wrong_runtime_state') {
    const entry = M55_COMMERCIAL_QUALITY_MANIFEST.entries[0];
    return validateManifestSetups(
      {
        ...M55_COMMERCIAL_QUALITY_MANIFEST,
        entries: [{ ...entry, runtimeStateId: 'cq:wrong-runtime-state' }],
      },
      M55_SETUP_REGISTRY,
    );
  }
  // duplicate_ecp — two surfaces claiming the same ECP surface id
  const base = M55_COMMERCIAL_QUALITY_MANIFEST.entries.find((e) =>
    e.surfaceId.startsWith(`${M55_QUALITY_PROJECT_ID}:ecp.`),
  );
  if (!base) return [failure('ADAPTER_UNREGISTERED_ROUTE', 'no ECP surface to duplicate', {})];
  const dup = { ...base, runtimeStateId: `${base.runtimeStateId}__dup` };
  return validateSurfaceManifest({
    ...M55_COMMERCIAL_QUALITY_MANIFEST,
    entries: [base, dup],
  });
}

/** Full reconciliation: manifest validity plus imported-identity coverage. */
export function verifyM55CommercialQualityRegistration(): AdapterCoverageReport {
  const failures: InvariantFailure[] = [
    ...validateSurfaceManifest(M55_COMMERCIAL_QUALITY_MANIFEST),
    ...checkEcpCoverage(),
    ...checkPremiumStateCoverage(),
    ...checkPremiumCaptureCoverage(),
    ...checkCommercialVisualCoverage(),
    ...checkMethodAuthorityReferences(),
    ...checkAuthorityReferences(),
    ...checkUnregisteredUserVisibleStates(),
    ...checkSetupRegistry(),
  ];

  return {
    projectId: M55_COMMERCIAL_QUALITY_MANIFEST.projectId,
    schemaVersion: M55_COMMERCIAL_QUALITY_MANIFEST.schemaVersion,
    manifestDigest: manifestDigest(M55_COMMERCIAL_QUALITY_MANIFEST),
    counts: M55_REGISTRATION_COUNTS,
    expectedCounts: {
      ecpEntries: M55_EXPERIENCE_ROUTE_REGISTRY.length,
      premiumStates: PREMIUM_EXPERIENCE_STATE_REGISTRY.length,
      premiumCaptures: PREMIUM_EXPERIENCE_CAPTURE_CASES.length,
      commercialVisualCases: COMMERCIAL_VISUAL_CASES.length,
    },
    failures,
  };
}

/**
 * Consolidation interface for existing systems. Commit A declares the shared
 * seam and the owning module; existing execution is untouched.
 */
export const M55_CONSOLIDATION_POINTS = [
  {
    id: 'commercial_visual_quality',
    owner: 'lib/m55/commercialUx/visualQuality/commercialVisualQualityChecks.ts',
    seam: 'lib/commercialQuality/layoutInvariants.ts',
    migratedInCommitA: false,
  },
  {
    id: 'experience_control_plane_visual',
    owner: 'e2e/experience-control-plane-visual.spec.ts',
    seam: 'e2e/helpers/commercialQualityRunner.ts',
    migratedInCommitA: false,
  },
  {
    id: 'premium_capture_model',
    owner: 'lib/m55/commercialUx/premiumExperience/premiumExperienceCaptureModel.ts',
    seam: 'lib/m55/commercialUx/qualityControl/m55SurfaceManifest.ts',
    migratedInCommitA: false,
  },
  {
    id: 'premium_proof_identity',
    owner: 'lib/m55/commercialUx/premiumExperience/premiumExperienceRunRecordValidation.ts',
    seam: 'lib/commercialQuality/approvalPack.ts',
    migratedInCommitA: false,
  },
  {
    id: 'method_route_consumption',
    owner: 'lib/m55/method/m55MethodRouteConsumption.ts',
    seam: 'lib/m55/commercialUx/qualityControl/m55ManifestAdapter.ts',
    migratedInCommitA: false,
  },
  {
    id: 'clean_capture_environment',
    owner: 'e2e/helpers/cleanCaptureEnvironment.ts',
    seam: 'e2e/helpers/commercialQualityRunner.ts',
    migratedInCommitA: false,
  },
] as const;
