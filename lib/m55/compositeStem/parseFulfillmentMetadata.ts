import { M55CompositeStemError, type M55CompositeCanonicalInput } from './types';

export type FulfillmentDraftRow = {
  nickname: string;
  birth_date: string;
  extra_json: Record<string, unknown> | null;
};

export type FulfillmentProfileFields = {
  nickname: string;
  birthDate: string;
  birthTime: string | null;
  birthTimeUnknown: boolean;
  country: string;
  birthplace: string | null;
  timezone: string | null;
};

function metaString(meta: Record<string, string>, key: string): string {
  return (meta[key] as string | undefined)?.trim() ?? '';
}

function parseBirthTimeUnknown(meta: Record<string, string>, birthTime: string | null): boolean {
  const flag = metaString(meta, 'profileBirthTimeUnknown').toLowerCase();
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return !birthTime;
}

function extraField(extra: Record<string, unknown> | null | undefined, key: string): string {
  const v = extra?.[key];
  return typeof v === 'string' ? v.trim() : '';
}

export function resolveFulfillmentProfileFields(
  sessionMetadata: Record<string, string> | null | undefined,
  draft: FulfillmentDraftRow | null,
): FulfillmentProfileFields | null {
  const meta = sessionMetadata ?? {};
  let nickname = '';
  let birthDate = '';

  if (draft?.nickname && draft.birth_date) {
    nickname = draft.nickname.trim();
    birthDate = String(draft.birth_date).slice(0, 10);
  }

  if (!nickname) nickname = metaString(meta, 'profileNickname');
  if (!birthDate) birthDate = metaString(meta, 'profileBirthDate');

  if (!nickname || !birthDate) return null;

  let birthTime = metaString(meta, 'profileBirthTime') || null;
  let country = metaString(meta, 'profileCountry');
  let birthplace = metaString(meta, 'profileBirthplace') || null;
  let timezone = metaString(meta, 'profileTimezone') || null;

  const extra = draft?.extra_json ?? null;
  if (!birthTime) birthTime = extraField(extra, 'birthTime') || null;
  if (!country) country = extraField(extra, 'country');
  if (!birthplace) birthplace = extraField(extra, 'birthplace') || null;
  if (!timezone) timezone = extraField(extra, 'timezone') || null;

  if (!country) country = 'JP';

  const birthTimeUnknown = parseBirthTimeUnknown(meta, birthTime);

  return {
    nickname,
    birthDate,
    birthTime,
    birthTimeUnknown,
    country,
    birthplace,
    timezone,
  };
}

/** v2 fulfillment requires explicit unknown flag or birth time (no silent JDN path). */
export function isV2FulfillmentProfileComplete(fields: FulfillmentProfileFields): boolean {
  const hasUnknownFlag =
    fields.birthTimeUnknown ||
    (!!fields.birthTime && fields.birthTime.length > 0);
  return !!fields.country && hasUnknownFlag;
}

export function toCompositeCanonicalInput(fields: FulfillmentProfileFields): M55CompositeCanonicalInput {
  return {
    birthDate: fields.birthDate,
    birthTime: fields.birthTime,
    birthTimeUnknown: fields.birthTimeUnknown,
    country: fields.country,
    birthplace: fields.birthplace,
    timezone: fields.timezone,
    locale: 'ja-JP',
    nickname: fields.nickname,
    contextScope: 'dtr',
    calendarSystem: 'gregorian_civil',
  };
}

export function assertV2ProfileOrThrow(fields: FulfillmentProfileFields): void {
  if (!isV2FulfillmentProfileComplete(fields)) {
    throw new M55CompositeStemError('M55_COMPOSITE_INCOMPLETE_PROFILE', 'incomplete_v2_fulfillment_profile');
  }
}
