import { buildAxisDetails, compositionFromScores } from './axisMeta';
import { affinityForTypeIndex, TYPE_CATALOG, type TypeCatalogSeed, typeIndexFromStemLane } from './typeCatalog';
import { essenceStemLaneIndex } from '../essenceEngine';

export type NormalizeBirthInput = {
  birthDate: string;
  birthTime?: string | null;
  birthplace?: string | null;
  country?: string | null;
};

export type NormalizedBirthContext = {
  normalizedGregorianDate: string;
  normalizedBirthTime: string;
  canonicalTimezone: 'Asia/Tokyo' | 'UTC';
  localeIndependentBoundaryContext: string;
};

export type BoundaryContext = {
  solarTermBoundary: string;
  lunarBoundary: string;
  dayBoundary: string;
  timezoneUsed: 'Asia/Tokyo' | 'UTC';
  fallbackMode: 'explicit-birth-time' | 'birth-time-missing-fixed-noon' | 'anchor-1983-02-28-fixed';
};

export type StaticCoreDeterministic = {
  personaCode49: string;
  staticEssence: string;
  strengths: string[];
  distortionTendencies: string[];
  longTermTheme: string;
  relationBaseline: string;
  workResourceBaseline: string;
  staticFingerprint: string;
  displayFingerprint: string;
  stemLaneIndex: number;
  typeIndex: number;
};

export type DynamicObservation = {
  note: string;
  weeklyBoundary: string;
  dynamicFingerprint: string;
};

const ANCHOR_DATE = '1983-02-28';
const NOON_FALLBACK = '12:00:00.000';

function assertIsoDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('M55_CORE_INVALID_BIRTHDATE');
}

function normalizeTime(time?: string | null): string {
  if (!time || !time.trim()) return NOON_FALLBACK;
  const t = time.trim();
  if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00.000`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return `${t}.000`;
  if (/^\d{2}:\d{2}:\d{2}\.\d{3}$/.test(t)) return t;
  throw new Error('M55_CORE_INVALID_BIRTHTIME');
}

function resolveCanonicalTimezone(input: NormalizeBirthInput): 'Asia/Tokyo' | 'UTC' {
  const country = (input.country ?? '').trim().toUpperCase();
  const place = (input.birthplace ?? '').trim().toLowerCase();
  if (country === 'JP' || country === 'JPN' || place.includes('japan') || place.includes('tokyo')) {
    return 'Asia/Tokyo';
  }
  return 'UTC';
}

function hashFingerprint(payload: unknown): string {
  const s = JSON.stringify(payload);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return `djb2:${h.toString(16).padStart(8, '0')}`;
}

function timezoneOffsetMinutes(tz: 'Asia/Tokyo' | 'UTC'): number {
  return tz === 'Asia/Tokyo' ? 9 * 60 : 0;
}

function isoWithOffset(ymd: string, hms: string, tz: 'Asia/Tokyo' | 'UTC'): string {
  const suffix = tz === 'Asia/Tokyo' ? '+09:00' : '+00:00';
  return `${ymd}T${hms}${suffix}`;
}

export function normalizeBirthContext(input: NormalizeBirthInput): NormalizedBirthContext {
  assertIsoDate(input.birthDate);
  const normalizedBirthTime = normalizeTime(input.birthTime);
  const canonicalTimezone = resolveCanonicalTimezone(input);
  const localeIndependentBoundaryContext = `date=${input.birthDate};time=${normalizedBirthTime};tz=${canonicalTimezone};country=${(input.country ?? '').trim().toUpperCase() || 'UNSPECIFIED'}`;
  return {
    normalizedGregorianDate: input.birthDate,
    normalizedBirthTime,
    canonicalTimezone,
    localeIndependentBoundaryContext,
  };
}

export function resolveBoundaryContext(normalizedInput: NormalizedBirthContext): BoundaryContext {
  const isAnchor = normalizedInput.normalizedGregorianDate === ANCHOR_DATE;
  if (isAnchor) {
    return {
      solarTermBoundary: '1983-02-28T00:00:00.000+09:00',
      lunarBoundary: '1983-02-28T00:00:00.000+09:00',
      dayBoundary: '1983-02-28T00:00:00.000+09:00',
      timezoneUsed: 'Asia/Tokyo',
      fallbackMode: 'anchor-1983-02-28-fixed',
    };
  }

  const tz = normalizedInput.canonicalTimezone;
  const offsetMinutes = timezoneOffsetMinutes(tz);
  const [h, m] = normalizedInput.normalizedBirthTime.split(':').map((v) => Number(v));
  const dayShift = h < 4 || (h === 4 && m === 0) ? -1 : 0;
  const base = new Date(`${normalizedInput.normalizedGregorianDate}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + dayShift);
  const y = base.getUTCFullYear();
  const mo = String(base.getUTCMonth() + 1).padStart(2, '0');
  const d = String(base.getUTCDate()).padStart(2, '0');
  const dayYmd = `${y}-${mo}-${d}`;

  const solarHour = offsetMinutes >= 540 ? '11:30:00.000' : '00:00:00.000';
  const lunarHour = offsetMinutes >= 540 ? '23:00:00.000' : '12:00:00.000';

  return {
    solarTermBoundary: isoWithOffset(normalizedInput.normalizedGregorianDate, solarHour, tz),
    lunarBoundary: isoWithOffset(normalizedInput.normalizedGregorianDate, lunarHour, tz),
    dayBoundary: isoWithOffset(dayYmd, '00:00:00.000', tz),
    timezoneUsed: tz,
    fallbackMode:
      normalizedInput.normalizedBirthTime === NOON_FALLBACK
        ? 'birth-time-missing-fixed-noon'
        : 'explicit-birth-time',
  };
}

export function computeStaticCoreDeterministic(
  normalizedInput: NormalizedBirthContext,
  boundaryContext: BoundaryContext,
): StaticCoreDeterministic {
  const lane = essenceStemLaneIndex(normalizedInput.normalizedGregorianDate);
  const idx = typeIndexFromStemLane(lane);
  const seed = TYPE_CATALOG[idx]!;
  const staticFingerprint = hashFingerprint({
    date: normalizedInput.normalizedGregorianDate,
    lane,
    idx,
    seed: seed.coreType,
    boundary: boundaryContext.dayBoundary,
    namingCorrection: 0,
  });
  const displayFingerprint = hashFingerprint({
    personaCode49: `PC49-${String(idx + 1).padStart(2, '0')}`,
    staticEssence: seed.coreSummary,
    longTermTheme: seed.coreLabel,
    relationBaseline: seed.relationships.summary,
    workResourceBaseline: seed.workStyle.summary,
    boundary: {
      solarTermBoundary: boundaryContext.solarTermBoundary,
      lunarBoundary: boundaryContext.lunarBoundary,
      fallbackMode: boundaryContext.fallbackMode,
    },
  });
  return {
    personaCode49: `PC49-${String(idx + 1).padStart(2, '0')}`,
    staticEssence: seed.coreSummary,
    strengths: [...seed.strengths],
    distortionTendencies: [...seed.cautions],
    longTermTheme: seed.coreLabel,
    relationBaseline: seed.relationships.summary,
    workResourceBaseline: seed.workStyle.summary,
    staticFingerprint,
    displayFingerprint,
    stemLaneIndex: lane,
    typeIndex: idx,
  };
}

export function computeDynamicObservation(
  boundaryContext: BoundaryContext,
  fixedNow: string,
): DynamicObservation {
  const weeklyBoundary = `${fixedNow.slice(0, 10)}T00:00:00.000${boundaryContext.timezoneUsed === 'Asia/Tokyo' ? '+09:00' : '+00:00'}`;
  const dynamicFingerprint = hashFingerprint({
    solar: boundaryContext.solarTermBoundary,
    lunar: boundaryContext.lunarBoundary,
    day: boundaryContext.dayBoundary,
    fallback: boundaryContext.fallbackMode,
    weeklyBoundary,
    fixedNow,
  });
  return {
    note: `dynamic-observation:${boundaryContext.fallbackMode}`,
    weeklyBoundary,
    dynamicFingerprint,
  };
}

export type CanonicalCorePipelineOutput = {
  normalized: NormalizedBirthContext;
  boundary: BoundaryContext;
  staticCore: StaticCoreDeterministic;
  dynamic: DynamicObservation;
  axisDetails: ReturnType<typeof buildAxisDetails>;
  composition: ReturnType<typeof compositionFromScores>;
  affinities: ReturnType<typeof affinityForTypeIndex>;
  typeSeed: TypeCatalogSeed;
  engineVersion: string;
  regressionAnchorMatched: boolean;
};

export function runCanonicalCorePipeline(input: NormalizeBirthInput, fixedNow = '2026-01-01T00:00:00.000Z'): CanonicalCorePipelineOutput {
  const normalized = normalizeBirthContext(input);
  const boundary = resolveBoundaryContext(normalized);
  const staticCore = computeStaticCoreDeterministic(normalized, boundary);
  const dynamic = computeDynamicObservation(boundary, fixedNow);
  const seed = TYPE_CATALOG[staticCore.typeIndex]!;
  const axisDetails = buildAxisDetails(seed.coreLabel, seed.coreAxisScores);
  const composition = compositionFromScores(seed.coreAxisScores);
  const affinities = affinityForTypeIndex(staticCore.typeIndex);
  const engineVersion = 'm55-core-canonical-v1';
  const regressionAnchorMatched = normalized.normalizedGregorianDate === ANCHOR_DATE;
  return {
    normalized,
    boundary,
    staticCore,
    dynamic,
    axisDetails,
    composition,
    affinities,
    typeSeed: seed,
    engineVersion,
    regressionAnchorMatched,
  };
}
