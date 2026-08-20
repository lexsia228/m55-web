import {
  draftProfileIdentitiesMatch,
  normalizeDraftProfileIdentity,
  type DraftProfileIdentity,
} from './draftProfileIdentity';

export type MergeDraftExtraJsonOptions = {
  existingIdentity?: DraftProfileIdentity | null;
  incomingIdentity?: DraftProfileIdentity | null;
};

/**
 * Draft extra_json is a bag of independent carry-over keys.
 * Profile saves and answer saves must not wipe each other.
 * When the server draft profile identity changes, stale freeAnswerSet must not
 * remain attached to the new identity unless a new set is explicitly provided.
 */
export function mergeDraftExtraJson(
  existing: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown> | null | undefined,
  options?: MergeDraftExtraJsonOptions,
): Record<string, unknown> {
  const base = existing && typeof existing === 'object' ? { ...existing } : {};
  const patch = incoming && typeof incoming === 'object' ? incoming : {};
  const merged = { ...base, ...patch };

  const existingIdentity =
    normalizeDraftProfileIdentity(options?.existingIdentity) ??
    normalizeDraftProfileIdentity({
      nickname: typeof base.nickname === 'string' ? base.nickname : null,
      birthDate: typeof base.birthDate === 'string' ? base.birthDate : null,
    });
  const incomingIdentity = normalizeDraftProfileIdentity(options?.incomingIdentity);

  if (
    existingIdentity &&
    incomingIdentity &&
    !draftProfileIdentitiesMatch(existingIdentity, incomingIdentity)
  ) {
    const hasIncomingFreeAnswerSet =
      Object.prototype.hasOwnProperty.call(patch, 'freeAnswerSet') &&
      patch.freeAnswerSet != null;
    if (!hasIncomingFreeAnswerSet) {
      delete merged.freeAnswerSet;
    }
  }

  return merged;
}
