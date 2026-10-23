import { R7_PREVIEW_TARGET_PROJECT_REF } from './r7D1D5OfflinePlan.ts';

export type R7D1ReadonlyPgVerifiedSessionBinding = {
  readonly previewProjectRef: typeof R7_PREVIEW_TARGET_PROJECT_REF;
  readonly queryPlanDigestSha256: string;
  readonly physicalBackendLocatorSha256: string;
};

const readonlyPgVerifiedSessionBindings = new WeakMap<object, R7D1ReadonlyPgVerifiedSessionBinding>();

function isHexSha256(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

export function bindR7D1ReadonlyPgVerifiedSessionProvenance(
  session: object,
  binding: R7D1ReadonlyPgVerifiedSessionBinding,
):
  | { readonly ok: true }
  | { readonly ok: false; readonly holdReasonCode: 'HOLD_READONLY_PG_SESSION_PROVENANCE_BINDING_INVALID' } {
  if (
    binding.previewProjectRef !== R7_PREVIEW_TARGET_PROJECT_REF ||
    !isHexSha256(binding.queryPlanDigestSha256) ||
    !isHexSha256(binding.physicalBackendLocatorSha256)
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

/** Test-only: never use for operational readonly_pg_verified tier in production paths. */
export function bindR7D1ReadonlyPgVerifiedSessionProvenanceForTestsOnly(
  session: object,
  binding: R7D1ReadonlyPgVerifiedSessionBinding,
): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return bindR7D1ReadonlyPgVerifiedSessionProvenance(session, binding).ok;
}
