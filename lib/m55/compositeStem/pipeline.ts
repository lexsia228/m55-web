import {
  CALENDAR_RANGE_END,
  CALENDAR_RANGE_START,
  CORRECTION_VERSION,
  DAY_BOUNDARY_RULE_ID,
  ENGINE_VERSION_V2,
  INPUT_VERSION_V1,
} from './constants';
import { applyDayBoundaryV1 } from './dayBoundary';
import { resolveLunarCivilRow, lunarBoundaryMetadata } from './lunarDay';
import { parseAndNormalizeInput } from './normalize';
import { resolveSolarTermMetadata } from './solarTerm';
import { stemFromLunarRow } from './stemLane';
import {
  buildLocalDateTime,
  calculationModeFor,
  resolveTimezone,
} from './timezone';
import {
  M55CompositeStemError,
  type CompositeStemResult,
  type M55CompositeCanonicalInput,
} from './types';

function djb2Fingerprint(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return `djb2:${h.toString(16).padStart(8, '0')}`;
}

function assertDateInRange(isoDate: string): void {
  if (isoDate < CALENDAR_RANGE_START || isoDate > CALENDAR_RANGE_END) {
    throw new M55CompositeStemError('M55_COMPOSITE_DATE_OUT_OF_RANGE', isoDate);
  }
}

/**
 * HYBRID H-SOLAR-LUNAR-01: P-LUNAR sets stem; P-SOLAR metadata only.
 * Fail-closed on missing calendar rows; no civil JDN terminus.
 */
export function runM55CompositeStemPipeline(
  input: M55CompositeCanonicalInput,
): CompositeStemResult {
  const parsed = parseAndNormalizeInput(input);
  assertDateInRange(parsed.birthDate);

  const resolved = resolveTimezone(parsed);
  const calculationMode = calculationModeFor(parsed, resolved.tzSource);
  const localDateTime = buildLocalDateTime(parsed.birthDate, parsed.birthTime, resolved);

  const { effectiveLocalDate } = applyDayBoundaryV1(parsed.birthDate, parsed.birthTime);
  assertDateInRange(effectiveLocalDate);

  const lunarRow = resolveLunarCivilRow(effectiveLocalDate);
  const stem = stemFromLunarRow(lunarRow);

  const solarMeta = resolveSolarTermMetadata(
    effectiveLocalDate,
    parsed.birthTime,
    resolved.offsetMinutes,
    lunarRow.solarYearKey,
  );

  const normalizedBirthContext = {
    birthDate: parsed.birthDate,
    birthTime: parsed.birthTime,
    birthTimeUnknown: parsed.birthTimeUnknown,
    country: parsed.country,
    birthplace: parsed.birthplace,
    timezone: resolved.timezone,
    locale: parsed.locale,
    nickname: parsed.nickname,
    contextScope: parsed.contextScope,
    localDateTime,
    effectiveLocalDate,
    calculationMode,
    tzSource: resolved.tzSource,
  };

  const boundaryMetadata = {
    ...lunarBoundaryMetadata(lunarRow, resolved.tzSource, resolved.timezone),
    ...solarMeta,
    dayBoundaryRule: DAY_BOUNDARY_RULE_ID,
  };

  const staticPayload = {
    engineVersion: ENGINE_VERSION_V2,
    correctionVersion: CORRECTION_VERSION,
    effectiveLocalDate,
    lunarDayKey: lunarRow.lunarDayKey,
    stemLaneIndex: stem.stemLaneIndex,
  };

  const displayPayload = {
    ...staticPayload,
    stemChar: stem.stemChar,
    paidTitle: stem.paid.publicTitle,
    calculationMode,
  };

  return {
    engineVersion: ENGINE_VERSION_V2,
    inputVersion: INPUT_VERSION_V1,
    correctionVersion: CORRECTION_VERSION,
    calculationMode,
    stemLaneIndex: stem.stemLaneIndex,
    stemChar: stem.stemChar,
    paid: stem.paid,
    normalizedBirthContext,
    boundaryMetadata,
    staticFingerprint: djb2Fingerprint(JSON.stringify(staticPayload)),
    displayFingerprint: djb2Fingerprint(JSON.stringify(displayPayload)),
  };
}
