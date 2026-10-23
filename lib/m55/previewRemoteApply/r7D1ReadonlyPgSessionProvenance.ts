import { R7_PREVIEW_TARGET_PROJECT_REF } from './r7D1D5OfflinePlan.ts';

export type R7D1ReadonlyPgVerifiedSessionBinding = {
  readonly previewProjectRef: typeof R7_PREVIEW_TARGET_PROJECT_REF;
  readonly queryPlanDigestSha256: string;
  readonly physicalBackendLocatorSha256: string;
};

const readonlyPgVerifiedSessionBindings = new WeakMap<object, R7D1ReadonlyPgVerifiedSessionBinding>();
const adapterOwnedLiveBridgeSessions = new WeakSet<object>();

function isHexSha256(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

/** Called only from `wrapExecutionPgClientAsR7LiveBridgeSession` in r7D1RealPgAdapter.ts. */
export function registerR7D1AdapterOwnedLiveBridgeSession(session: object): void {
  adapterOwnedLiveBridgeSessions.add(session);
}

export function isR7D1AdapterOwnedLiveBridgeSession(session: object): boolean {
  return adapterOwnedLiveBridgeSessions.has(session);
}

/**
 * Session-bound provenance after PostgreSQL read-only establishment — adapter-owned sessions only.
 * Not exported for arbitrary caller registration.
 */
export function bindR7D1ReadonlyPgVerifiedSessionProvenanceFromEstablishedAdapter(
  session: object,
  binding: R7D1ReadonlyPgVerifiedSessionBinding,
  physicalEvidenceLocatorSha256: string,
):
  | { readonly ok: true }
  | { readonly ok: false; readonly holdReasonCode: 'HOLD_READONLY_PG_SESSION_PROVENANCE_BINDING_INVALID' } {
  if (!adapterOwnedLiveBridgeSessions.has(session)) {
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
  return { ok: true };
}

export function resolveR7D1ReadonlyPgVerifiedSessionBinding(
  session: object,
): R7D1ReadonlyPgVerifiedSessionBinding | null {
  return readonlyPgVerifiedSessionBindings.get(session) ?? null;
}

export function isR7D1ReadonlyPgVerifiedSession(session: object): boolean {
  return readonlyPgVerifiedSessionBindings.has(session);
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
