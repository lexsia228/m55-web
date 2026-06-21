import type { DtrProfileSnapshotStored } from './buildV2FulfillmentSnapshot';
import type { FulfillmentProfileFields } from './parseFulfillmentMetadata';
import type { DtrReportSnapshotReadRow } from './storedEnvelopeRead';

export type ParseStoredSnapshotProfileFieldsResult =
  | { ok: true; fields: FulfillmentProfileFields }
  | { ok: false; reason: string };

function readStringField(
  source: Record<string, unknown> | null | undefined,
  keys: readonly string[],
): string {
  if (!source || typeof source !== 'object') return '';
  for (const key of keys) {
    const v = source[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function readBooleanField(
  source: Record<string, unknown> | null | undefined,
  keys: readonly string[],
): boolean | undefined {
  if (!source || typeof source !== 'object') return undefined;
  for (const key of keys) {
    const v = source[key];
    if (typeof v === 'boolean') return v;
    if (v === 'true') return true;
    if (v === 'false') return false;
  }
  return undefined;
}

function extractDraftExtraJson(
  draftSnapshot: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!draftSnapshot || typeof draftSnapshot !== 'object') return null;
  const extra = draftSnapshot.extra_json;
  if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
    return extra as Record<string, unknown>;
  }
  return null;
}

function firstNonEmptyString(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function resolveBirthTimeUnknown(
  explicit: boolean | undefined,
  birthTime: string | null,
): boolean {
  if (explicit === true) return true;
  if (explicit === false) return false;
  return !birthTime;
}

/**
 * Build v2 fulfillment fields from immutable stored snapshot row (read-time rebuild).
 * Required: profile_snapshot nickname + birthDate (camelCase or snake_case).
 * Optional best-effort: profile_snapshot extended fields, draft_snapshot.extra_json.
 */
export function parseStoredSnapshotProfileFields(
  row: DtrReportSnapshotReadRow,
): ParseStoredSnapshotProfileFieldsResult {
  const profileRaw = row.profile_snapshot as Record<string, unknown> | null | undefined;
  const ps = row.profile_snapshot as DtrProfileSnapshotStored;
  const draftExtra = extractDraftExtraJson(row.draft_snapshot);

  const nickname = readStringField(profileRaw, ['nickname', 'nickName', 'name']);
  const birthDateRaw = readStringField(profileRaw, ['birthDate', 'birth_date']);
  const birthDate = birthDateRaw ? birthDateRaw.slice(0, 10) : '';

  if (!nickname) return { ok: false, reason: 'missing_nickname' };
  if (!birthDate) return { ok: false, reason: 'missing_birth_date' };

  const birthTime = firstNonEmptyString(
    readStringField(profileRaw, ['birthTime', 'birth_time']),
    readStringField(draftExtra, ['birthTime', 'birth_time']),
  );

  const country =
    firstNonEmptyString(
      readStringField(profileRaw, ['country']),
      readStringField(draftExtra, ['country']),
    ) ?? 'JP';

  const birthplace = firstNonEmptyString(
    readStringField(profileRaw, ['birthplace', 'birth_place', 'birthPlace']),
    readStringField(draftExtra, ['birthplace', 'birth_place', 'birthPlace']),
  );

  const timezone = firstNonEmptyString(
    readStringField(profileRaw, ['timezone', 'time_zone', 'timeZone']),
    readStringField(draftExtra, ['timezone', 'time_zone', 'timeZone']),
  );

  const birthTimeUnknown = resolveBirthTimeUnknown(
    readBooleanField(profileRaw, ['birthTimeUnknown', 'birth_time_unknown']) ??
      readBooleanField(draftExtra, ['birthTimeUnknown', 'birth_time_unknown']) ??
      (typeof ps.birthTimeUnknown === 'boolean' ? ps.birthTimeUnknown : undefined),
    birthTime,
  );

  return {
    ok: true,
    fields: {
      nickname,
      birthDate,
      birthTime,
      birthTimeUnknown,
      country,
      birthplace,
      timezone,
    },
  };
}
