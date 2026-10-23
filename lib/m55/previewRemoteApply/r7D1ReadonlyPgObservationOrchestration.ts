import {
  R7_PREVIEW_TARGET_PROJECT,
  R7_PREVIEW_TARGET_PROJECT_REF,
  R7_PR249_FROZEN_REPO_ROOT,
} from './r7D1D5OfflinePlan.ts';
import {
  deriveProducerBoundCategoryOutcomesDigestSha256,
  evaluateProducerBoundD1CatalogEvidence,
} from './r7D1ExactCatalogContract.ts';
import {
  collectD1CatalogObservationFromReadonlySession,
  readR7D1ProducerBoundEvidenceFromTrustedCollected,
  type R7D1TrustedCollectedCatalogObservation,
} from './r7D1TrustedCatalogVerifier.ts';
import {
  createR7D1InjectedExecutionPgTransport,
  createR7LiveBridgeSessionFactoryFromPgTransport,
  establishFreshReadOnlyPgSession,
  validateR7D1ExecutionPgClientConfigPreviewTargetBinding,
  type R7LiveBridgePgSessionShape,
  type R7RealPgAdapterHoldCode,
} from './r7D1RealPgAdapter.ts';
import {
  evaluateR7D1ReadonlyPgObservationRuntimeAuthorization,
  type R7D1ReadonlyPgObservationRuntimeHoldCode,
} from './r7D1ReadonlyPgObservationRuntimeAuthorization.ts';
import type { ExecutionPgClientConfig } from './remoteExecutionPgTransport.ts';

export const R7_D1_READONLY_PG_OBSERVATION_WIRE_VERSION = 'R7_D1_READONLY_PG_OBSERVATION_WIRE_v1' as const;

export type R7D1ReadonlyPgObservationWireV1 = {
  readonly wireVersion: typeof R7_D1_READONLY_PG_OBSERVATION_WIRE_VERSION;
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly user: string;
  readonly password: string;
  readonly sslmode: 'require';
  readonly tlsTrustProfile: string;
  readonly tlsServerName: string;
  readonly tlsCaPem: string;
};

export type R7D1ReadonlyPgObservationHoldCode =
  | R7D1ReadonlyPgObservationRuntimeHoldCode
  | 'HOLD_READONLY_PG_OBSERVATION_WIRE_INVALID'
  | 'HOLD_PREVIEW_TARGET_BINDING_MISMATCH'
  | 'HOLD_LIVE_NETWORK_CONNECT_FORBIDDEN'
  | 'HOLD_POST_CONNECT_GUARD_FAILED'
  | 'HOLD_FRESH_READONLY_SESSION_NOT_ESTABLISHED'
  | 'HOLD_PHYSICAL_BACKEND_DISTINCTNESS_UNVERIFIED'
  | 'HOLD_POST_COMMIT_VERIFICATION_FAILED'
  | 'HOLD_REPO_IDENTITY_MISMATCH'
  | 'HOLD_PRODUCER_BOUND_EVIDENCE_MISSING'
  | 'HOLD_PRE_READONLY_CATALOG_EVALUATION_FAILED'
  | 'HOLD_READONLY_SESSION_CLEANUP_UNCERTAIN'
  | R7RealPgAdapterHoldCode;

export type R7D1ReadonlyPgObservationSuccess = {
  readonly mode: 'R7_D1_READONLY_PG_CATALOG_OBSERVATION';
  readonly previewD1ApplyAuthorized: false;
  readonly previewTargetProject: typeof R7_PREVIEW_TARGET_PROJECT;
  readonly previewTargetProjectRef: typeof R7_PREVIEW_TARGET_PROJECT_REF;
  readonly observationProvenanceTier: 'readonly_pg_verified';
  readonly observationPhase: 'PRE_READONLY';
  readonly evidenceDigestSha256: string;
  readonly observedMigrationVersions: readonly string[];
  readonly migrationVersionTail: string | null;
  readonly categoryOutcomesDigestSha256: string;
};

export type R7D1ReadonlyPgObservationResult =
  | { readonly mode: 'R7_D1_READONLY_PG_OBSERVATION_HOLD'; readonly holdReasonCode: R7D1ReadonlyPgObservationHoldCode }
  | R7D1ReadonlyPgObservationSuccess;

export function parseR7D1ReadonlyPgObservationWireV1(
  payload: unknown,
): { readonly ok: true; readonly wire: R7D1ReadonlyPgObservationWireV1 } | { readonly ok: false } {
  if (payload === null || typeof payload !== 'object') {
    return { ok: false };
  }
  const record = payload as Record<string, unknown>;
  if (record.wireVersion !== R7_D1_READONLY_PG_OBSERVATION_WIRE_VERSION) {
    return { ok: false };
  }
  const required = [
    'host',
    'database',
    'user',
    'password',
    'sslmode',
    'tlsTrustProfile',
    'tlsServerName',
    'tlsCaPem',
  ] as const;
  for (const key of required) {
    if (typeof record[key] !== 'string' || record[key].length === 0) {
      return { ok: false };
    }
  }
  if (typeof record.port !== 'number' || !Number.isInteger(record.port) || record.port <= 0) {
    return { ok: false };
  }
  if (record.sslmode !== 'require') {
    return { ok: false };
  }
  return {
    ok: true,
    wire: {
      wireVersion: R7_D1_READONLY_PG_OBSERVATION_WIRE_VERSION,
      host: record.host as string,
      port: record.port as number,
      database: record.database as string,
      user: record.user as string,
      password: record.password as string,
      sslmode: 'require',
      tlsTrustProfile: record.tlsTrustProfile as string,
      tlsServerName: record.tlsServerName as string,
      tlsCaPem: record.tlsCaPem as string,
    },
  };
}

export function redactR7D1ReadonlyPgObservationWireForEvidence(
  wire: R7D1ReadonlyPgObservationWireV1,
): Record<string, string | number> {
  return {
    wireVersion: wire.wireVersion,
    host: wire.host,
    port: wire.port,
    database: wire.database,
    user: wire.user,
    password: '[REDACTED]',
    sslmode: wire.sslmode,
    tlsTrustProfile: wire.tlsTrustProfile,
    tlsServerName: wire.tlsServerName,
    tlsCaPem: `[REDACTED length=${wire.tlsCaPem.length}]`,
  };
}

export function finalizeR7D1ReadonlyPgObservationFromTrustedCollected(
  repoRoot: string,
  trusted: R7D1TrustedCollectedCatalogObservation,
):
  | R7D1ReadonlyPgObservationSuccess
  | { readonly mode: 'R7_D1_READONLY_PG_OBSERVATION_HOLD'; readonly holdReasonCode: R7D1ReadonlyPgObservationHoldCode } {
  const producerEvidence = readR7D1ProducerBoundEvidenceFromTrustedCollected(trusted);
  if (producerEvidence === null) {
    return {
      mode: 'R7_D1_READONLY_PG_OBSERVATION_HOLD',
      holdReasonCode: 'HOLD_PRODUCER_BOUND_EVIDENCE_MISSING',
    };
  }
  const evaluated = evaluateProducerBoundD1CatalogEvidence(repoRoot, producerEvidence);
  if (!evaluated.ok) {
    return {
      mode: 'R7_D1_READONLY_PG_OBSERVATION_HOLD',
      holdReasonCode: 'HOLD_PRE_READONLY_CATALOG_EVALUATION_FAILED',
    };
  }
  const categoryOutcomesDigestSha256 = deriveProducerBoundCategoryOutcomesDigestSha256(producerEvidence);
  return {
    mode: 'R7_D1_READONLY_PG_CATALOG_OBSERVATION',
    previewD1ApplyAuthorized: false,
    previewTargetProject: R7_PREVIEW_TARGET_PROJECT,
    previewTargetProjectRef: R7_PREVIEW_TARGET_PROJECT_REF,
    observationProvenanceTier: 'readonly_pg_verified',
    observationPhase: 'PRE_READONLY',
    evidenceDigestSha256: producerEvidence.evidenceDigestSha256,
    observedMigrationVersions: producerEvidence.observedMigrationVersions,
    migrationVersionTail: producerEvidence.migrationVersionTail,
    categoryOutcomesDigestSha256,
  };
}

async function teardownR7D1ReadonlyPgObservationSession(
  session: R7LiveBridgePgSessionShape,
): Promise<{ readonly ok: true } | { readonly ok: false; readonly holdReasonCode: 'HOLD_READONLY_SESSION_CLEANUP_UNCERTAIN' }> {
  let rollbackAcknowledged = false;
  try {
    const rollback = await session.rollback();
    rollbackAcknowledged = rollback.acknowledged === true;
  } catch {
    rollbackAcknowledged = false;
  }
  if (!rollbackAcknowledged) {
    return { ok: false, holdReasonCode: 'HOLD_READONLY_SESSION_CLEANUP_UNCERTAIN' };
  }
  try {
    await session.close();
  } catch {
    return { ok: false, holdReasonCode: 'HOLD_READONLY_SESSION_CLEANUP_UNCERTAIN' };
  }
  return { ok: true };
}

function wireToExecutionPgClientConfig(wire: R7D1ReadonlyPgObservationWireV1): ExecutionPgClientConfig {
  return {
    host: wire.host,
    port: wire.port,
    database: wire.database,
    user: wire.user,
    password: wire.password,
    sslmode: wire.sslmode,
    tlsCaPem: wire.tlsCaPem,
    tlsTrustProfile: wire.tlsTrustProfile as ExecutionPgClientConfig['tlsTrustProfile'],
    tlsServerName: wire.tlsServerName as ExecutionPgClientConfig['tlsServerName'],
    connectionTimeoutMillis: 30_000,
  };
}

export async function executeR7D1PreviewReadonlyPgCatalogObservation(input: {
  readonly repoRoot: string;
  readonly wire: R7D1ReadonlyPgObservationWireV1;
}): Promise<R7D1ReadonlyPgObservationResult> {
  if (input.repoRoot !== R7_PR249_FROZEN_REPO_ROOT) {
    return { mode: 'R7_D1_READONLY_PG_OBSERVATION_HOLD', holdReasonCode: 'HOLD_REPO_IDENTITY_MISMATCH' };
  }
  const auth = evaluateR7D1ReadonlyPgObservationRuntimeAuthorization();
  if (!auth.ok) {
    return { mode: 'R7_D1_READONLY_PG_OBSERVATION_HOLD', holdReasonCode: auth.holdReasonCode };
  }
  const config = wireToExecutionPgClientConfig(input.wire);
  const binding = validateR7D1ExecutionPgClientConfigPreviewTargetBinding(config);
  if (!binding.ok) {
    return { mode: 'R7_D1_READONLY_PG_OBSERVATION_HOLD', holdReasonCode: 'HOLD_PREVIEW_TARGET_BINDING_MISMATCH' };
  }
  let transport;
  try {
    transport = createR7D1InjectedExecutionPgTransport();
  } catch {
    return { mode: 'R7_D1_READONLY_PG_OBSERVATION_HOLD', holdReasonCode: 'HOLD_LIVE_NETWORK_CONNECT_FORBIDDEN' };
  }
  const factory = createR7LiveBridgeSessionFactoryFromPgTransport(transport, config);
  if (!factory.ok) {
    return { mode: 'R7_D1_READONLY_PG_OBSERVATION_HOLD', holdReasonCode: factory.holdReasonCode };
  }
  const session: R7LiveBridgePgSessionShape = factory.createSession();
  const established = await establishFreshReadOnlyPgSession(session);
  if (!established.ok) {
    return { mode: 'R7_D1_READONLY_PG_OBSERVATION_HOLD', holdReasonCode: established.holdReasonCode };
  }
  let finalized:
    | R7D1ReadonlyPgObservationSuccess
    | { readonly mode: 'R7_D1_READONLY_PG_OBSERVATION_HOLD'; readonly holdReasonCode: R7D1ReadonlyPgObservationHoldCode }
    | null = null;
  try {
    const collected = await collectD1CatalogObservationFromReadonlySession(
      session,
      input.repoRoot,
      'PRE_READONLY',
      null,
    );
    if (!collected.ok) {
      finalized = {
        mode: 'R7_D1_READONLY_PG_OBSERVATION_HOLD',
        holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED',
      };
    } else {
      finalized = finalizeR7D1ReadonlyPgObservationFromTrustedCollected(input.repoRoot, collected.trusted);
    }
  } finally {
    const teardown = await teardownR7D1ReadonlyPgObservationSession(session);
    if (!teardown.ok) {
      finalized = {
        mode: 'R7_D1_READONLY_PG_OBSERVATION_HOLD',
        holdReasonCode: teardown.holdReasonCode,
      };
    }
  }
  return (
    finalized ?? {
      mode: 'R7_D1_READONLY_PG_OBSERVATION_HOLD',
      holdReasonCode: 'HOLD_POST_COMMIT_VERIFICATION_FAILED',
    }
  );
}
