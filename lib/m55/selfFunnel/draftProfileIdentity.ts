export type DraftProfileIdentity = {
  nickname: string;
  birthDate: string;
};

/** Canonical draft profile identity: trimmed nickname + YYYY-MM-DD birthDate. */
export function normalizeDraftProfileIdentity(
  input: { nickname?: string | null; birthDate?: string | null } | null | undefined,
): DraftProfileIdentity | null {
  if (!input) return null;
  const nickname = typeof input.nickname === 'string' ? input.nickname.trim() : '';
  const birthDate =
    typeof input.birthDate === 'string' ? input.birthDate.trim().slice(0, 10) : '';
  if (!nickname || !birthDate) return null;
  return { nickname, birthDate };
}

export function draftProfileIdentitiesMatch(
  a: DraftProfileIdentity | null | undefined,
  b: DraftProfileIdentity | null | undefined,
): boolean {
  if (!a || !b) return false;
  return a.nickname === b.nickname && a.birthDate === b.birthDate;
}
