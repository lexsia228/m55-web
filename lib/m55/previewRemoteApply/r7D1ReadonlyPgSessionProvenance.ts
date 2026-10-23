import { R7_PREVIEW_TARGET_PROJECT_REF } from './r7D1D5OfflinePlan.ts';
import {
  executionPgClientHasRealPgBackendProvenanceSource,
  type ExecutionPgClient,
} from './remoteExecutionPgTransport.ts';

export type R7D1ReadonlyPgVerifiedSessionBinding = {
  readonly previewProjectRef: typeof R7_PREVIEW_TARGET_PROJECT_REF;
  readonly queryPlanDigestSha256: string;
  readonly physicalBackendLocatorSha256: string;
};

const readonlyPgVerifiedSessionBindings = new WeakMap<object, R7D1ReadonlyPgVerifiedSessionBinding>();
const verifiedSessionToRealPgClient = new WeakMap<object, ExecutionPgClient>();

function isHexSha256(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

/**
 * Session-bound provenance after PostgreSQL read-only establishment on a real `pg` transport client.
 * Callable only from `establishFreshReadOnlyPgSession` in r7D1RealPgAdapter.ts.
 */
export function bindR7D1ReadonlyPgVerifiedSessionProvenanceFromEstablishedAdapter(
  session: object,
  executionPgClient: ExecutionPgClient,
  binding: R7D1ReadonlyPgVerifiedSessionBinding,
  physicalEvidenceLocatorSha256: string,
):
  | { readonly ok: true }
  | { readonly ok: false; readonly holdReasonCode: 'HOLD_READONLY_PG_SESSION_PROVENANCE_BINDING_INVALID' } {
  if (!executionPgClientHasRealPgBackendProvenanceSource(executionPgClient)) {
    return { ok: false, holdReasonCode: 'HOLD_READONLY_PG_SESSION_PROVENANCE_BINDING_INVALID' };
  }
  if (
    binding.previewProjectRef !== R7_PREVIEW_TARGET_PROJECT_REF ||
    !isHexSha256(binding.queryPlanDigestSha256) ||
    !isHexSha256(binding.physicalBackendLocatorSha256) ||
    binding.physicalBackendLocatorSha256 !== physicalEvidenceLocatorSha256
  ) {
    return { ok: false, holdReasonCode: 'HOLD_READONLY_PG_SESSION_PROVENANCE_BINDING_INVALID' };
  }
  readonlyPgVerifiedSessionBindings.set(session, Object.freeze(binding));
  verifiedSessionToRealPgClient.set(session, executionPgClient);
  return { ok: true };
}

export function resolveR7D1ReadonlyPgVerifiedSessionBinding(
  session: object,
): R7D1ReadonlyPgVerifiedSessionBinding | null {
  return readonlyPgVerifiedSessionBindings.get(session) ?? null;
}

export function isR7D1ReadonlyPgVerifiedSession(session: object): boolean {
  const binding = readonlyPgVerifiedSessionBindings.get(session);
  if (binding === undefined) {
    return false;
  }
  const client = verifiedSessionToRealPgClient.get(session);
  if (client === undefined || !executionPgClientHasRealPgBackendProvenanceSource(client)) {
    return false;
  }
  return true;
}

const trustedCollectedToReadonlySession = new WeakMap<object, object>();

export function registerTrustedCollectedCatalogObservationReadonlySession(
  trustedCollected: object,
  session: object,
): void {
  trustedCollectedToReadonlySession.set(trustedCollected, session);
}

export function resolveTrustedCollectedCatalogObservationReadonlySession(trustedCollected: object): object | null {
  return trustedCollectedToReadonlySession.get(trustedCollected) ?? null;
}
