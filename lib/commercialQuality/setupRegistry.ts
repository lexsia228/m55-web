/**
 * Typed executable setup registry — repository-independent.
 *
 * A manifest setupId is only valid when this registry resolves it to an
 * executable function with matching route/state/stress contracts. String
 * markers alone never satisfy registration.
 *
 * User-visible surfaces are either:
 * - executable — must pass Chromium smoke
 * - non_runtime_reference — evidence identity consumed elsewhere; never a
 *   browser-smoke PASS
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

export type SetupExecutionClass = 'executable' | 'non_runtime_reference';

export type SetupContext = {
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
  cleanupToken?: string;
};

export type ExecutableSetup = {
  setupId: string;
  executionClass: SetupExecutionClass;
  /** When non_runtime_reference: which executable surface consumes this identity. */
  consumedBySurfaceId: string | null;
  expectedRoute: string;
  expectedRuntimeStateId: string;
  authenticationMode: SetupAuthenticationMode;
  preconditions: readonly string[];
  supportedContentStressProfiles: readonly ContentStressProfile[];
  supportedExecutionProfiles: readonly ExecutionProfile[];
  /** Localhost fixture identity; null for plain navigate. */
  fixtureId: string | null;
  readySelector: string;
  /** Selector that proves the expected runtime state after setup. */
  stateMarkerSelector: string;
  hasDeterministicAuthFixture: boolean;
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
  /**
   * Mutates a real protected/governed element for the profile. Synthetic probes
   * alone are forbidden for PASS evidence.
   */
  applyGovernedStress?: (
    context: SetupContext,
    entry: SurfaceManifestEntry,
    profile: ContentStressProfile,
  ) => Promise<StressApplicationResult>;
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
  if (setup.executionClass === 'executable' && needsAuth && !setup.hasDeterministicAuthFixture) {
    failures.push(
      failure(
        'SETUP_AUTH_WITHOUT_FIXTURE',
        'authenticated executable setup lacks deterministic fixture support',
        { ...at, authenticationMode: setup.authenticationMode },
      ),
    );
  }
  if (
    setup.executionClass === 'executable' &&
    setup.hasDeterministicAuthFixture &&
    (setup.fixtureId === null || setup.fixtureId.length === 0)
  ) {
    failures.push(
      failure(
        'SETUP_AUTH_WITHOUT_FIXTURE',
        'hasDeterministicAuthFixture requires an exact fixture identity',
        { ...at, authenticationMode: setup.authenticationMode },
      ),
    );
  }
  if (setup.executionClass === 'non_runtime_reference' && !setup.consumedBySurfaceId) {
    failures.push(
      failure('SETUP_MISSING_FOR_SURFACE', 'non_runtime reference missing consumedBySurfaceId', at),
    );
  }

  return failures;
}

export function validateManifestSetups(
  manifest: SurfaceManifest,
  registry: SetupRegistry,
): readonly InvariantFailure[] {
  const failures: InvariantFailure[] = [];

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
