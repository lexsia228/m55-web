/**
 * Typed executable setup registry — repository-independent.
 *
 * A manifest setupId is only valid when this registry resolves it to an
 * executable function with matching route/state/stress contracts. String
 * markers alone never satisfy registration.
 */
import {
  SETUP_FAILURE_CODES,
  type ContentStressProfile,
  type ExecutionProfile,
  type InvariantFailure,
  type SetupFailureCode,
  type SurfaceManifest,
  type SurfaceManifestEntry,
} from './types';

export { SETUP_FAILURE_CODES, type SetupFailureCode };

export type SetupAuthenticationMode =
  | 'none'
  | 'unauthenticated'
  | 'authenticated'
  | 'purchased_private';

/**
 * How the all-registration smoke exercises this setup.
 * - navigate: goto expectedRoute and assert protected selectors
 * - navigate_fixture: deterministic fixture path (token / seeded state)
 * - registration_only: auth/purchase/pattern without a deterministic browser
 *   fixture yet — smoke proves resolution + metadata, never claims GREEN load
 */
export type SetupSmokeKind = 'navigate' | 'navigate_fixture' | 'registration_only';

export type SetupContext = {
  /** Opaque browser/page handle owned by the project adapter. */
  page: unknown;
  baseURL: string;
  label: string;
};

export type SetupExecutionResult = {
  setupId: string;
  applied: true;
  evidence: Readonly<Record<string, unknown>>;
};

export type StressApplicationResult = {
  profile: ContentStressProfile | ExecutionProfile;
  applied: true;
  evidence: Readonly<Record<string, unknown>>;
  /** Cleanup token returned to clearStress. */
  cleanupToken?: string;
};

/**
 * Project-agnostic setup contract. The generic engine never constructs product
 * fixtures; it only invokes these hooks through the project adapter.
 */
export type ExecutableSetup = {
  setupId: string;
  expectedRoute: string;
  expectedRuntimeStateId: string;
  authenticationMode: SetupAuthenticationMode;
  preconditions: readonly string[];
  supportedContentStressProfiles: readonly ContentStressProfile[];
  supportedExecutionProfiles: readonly ExecutionProfile[];
  smokeKind: SetupSmokeKind;
  /** Fixture path when smokeKind is navigate_fixture; otherwise null. */
  fixturePath: string | null;
  /** Selector that must resolve after a successful navigable smoke. */
  readySelector: string;
  /** True when an authenticated/purchased setup has a deterministic fixture. */
  hasDeterministicAuthFixture: boolean;
  /**
   * Bound at registration time. Must be a real function — never a string
   * marker. The project adapter invokes it with a typed page handle.
   */
  execute: (context: SetupContext, entry: SurfaceManifestEntry) => Promise<SetupExecutionResult>;
  teardown?: (context: SetupContext, entry: SurfaceManifestEntry) => Promise<void>;
  applyContentStress?: (
    context: SetupContext,
    entry: SurfaceManifestEntry,
    profile: ContentStressProfile,
  ) => Promise<StressApplicationResult>;
  clearContentStress?: (
    context: SetupContext,
    entry: SurfaceManifestEntry,
    profile: ContentStressProfile,
    token?: string,
  ) => Promise<void>;
  applyExecutionProfile?: (
    context: SetupContext,
    entry: SurfaceManifestEntry,
    profile: ExecutionProfile,
  ) => Promise<StressApplicationResult>;
  clearExecutionProfile?: (
    context: SetupContext,
    entry: SurfaceManifestEntry,
    profile: ExecutionProfile,
    token?: string,
  ) => Promise<void>;
};

export type SetupRegistry = {
  projectId: string;
  setups: readonly ExecutableSetup[];
};

function failure(
  code: SetupFailureCode,
  message: string,
  diagnostics: Record<string, unknown> = {},
): InvariantFailure {
  return { code, message, diagnostics, selector: null };
}

export function setupById(
  registry: SetupRegistry,
  setupId: string,
): ExecutableSetup | undefined {
  return registry.setups.find((setup) => setup.setupId === setupId);
}

/** Validate a single setup against its owning manifest entry. */
export function validateSetupAgainstEntry(
  setup: ExecutableSetup | undefined,
  entry: SurfaceManifestEntry,
): readonly InvariantFailure[] {
  const failures: InvariantFailure[] = [];
  const at = {
    surfaceId: entry.surfaceId,
    setupId: entry.setupId,
    runtimeStateId: entry.runtimeStateId,
  };

  if (!setup) {
    failures.push(failure('SETUP_UNKNOWN_ID', `unknown setup ID: ${entry.setupId}`, at));
    return failures;
  }
  if (typeof setup.execute !== 'function') {
    failures.push(
      failure('SETUP_NO_EXECUTABLE_FUNCTION', `setup has no executable function: ${entry.setupId}`, at),
    );
  }
  if (setup.expectedRoute !== entry.route) {
    failures.push(
      failure('SETUP_ROUTE_MISMATCH', 'setup route does not match manifest route', {
        ...at,
        setupRoute: setup.expectedRoute,
        manifestRoute: entry.route,
      }),
    );
  }
  if (setup.expectedRuntimeStateId !== entry.runtimeStateId) {
    failures.push(
      failure('SETUP_STATE_MISMATCH', 'setup runtime state does not match manifest', {
        ...at,
        setupState: setup.expectedRuntimeStateId,
        manifestState: entry.runtimeStateId,
      }),
    );
  }

  for (const profile of entry.contentStressProfiles) {
    if (!setup.supportedContentStressProfiles.includes(profile)) {
      failures.push(
        failure('SETUP_STRESS_UNSUPPORTED', `content stress unsupported by setup: ${profile}`, {
          ...at,
          profile,
        }),
      );
    }
  }
  for (const profile of entry.executionProfiles) {
    if (!setup.supportedExecutionProfiles.includes(profile)) {
      failures.push(
        failure('SETUP_STRESS_UNSUPPORTED', `execution profile unsupported by setup: ${profile}`, {
          ...at,
          profile,
        }),
      );
    }
  }

  const needsAuth =
    setup.authenticationMode === 'authenticated' ||
    setup.authenticationMode === 'purchased_private' ||
    entry.requiresAuthentication;
  if (needsAuth && !setup.hasDeterministicAuthFixture && setup.smokeKind !== 'registration_only') {
    failures.push(
      failure(
        'SETUP_AUTH_WITHOUT_FIXTURE',
        'authenticated setup lacks deterministic fixture support',
        { ...at, authenticationMode: setup.authenticationMode, smokeKind: setup.smokeKind },
      ),
    );
  }

  return failures;
}

/** Every manifest entry must resolve to a valid executable setup. */
export function validateManifestSetups(
  manifest: SurfaceManifest,
  registry: SetupRegistry,
): readonly InvariantFailure[] {
  const failures: InvariantFailure[] = [];
  const seenSetupIds = new Set<string>();

  for (const entry of manifest.entries) {
    const setup = setupById(registry, entry.setupId);
    if (!setup) {
      failures.push(
        failure('SETUP_MISSING_FOR_SURFACE', `surface has no executable setup: ${entry.surfaceId}`, {
          surfaceId: entry.surfaceId,
          setupId: entry.setupId,
        }),
      );
      continue;
    }
    seenSetupIds.add(setup.setupId);
    failures.push(...validateSetupAgainstEntry(setup, entry));
  }

  for (const setup of registry.setups) {
    if (typeof setup.execute !== 'function') {
      failures.push(
        failure('SETUP_NO_EXECUTABLE_FUNCTION', `orphan setup has no function: ${setup.setupId}`, {
          setupId: setup.setupId,
        }),
      );
    }
  }

  return failures;
}

/** Profiles a plan may apply: intersection of entry declaration and setup support. */
export function assertProfileSupported(
  setup: ExecutableSetup,
  content: ContentStressProfile,
  execution: ExecutionProfile,
): void {
  if (!setup.supportedContentStressProfiles.includes(content)) {
    throw new Error(`SETUP_STRESS_UNSUPPORTED: content profile ${content} not supported by ${setup.setupId}`);
  }
  if (!setup.supportedExecutionProfiles.includes(execution)) {
    throw new Error(
      `SETUP_STRESS_UNSUPPORTED: execution profile ${execution} not supported by ${setup.setupId}`,
    );
  }
}
