/**
 * Structured BirthSignature from the existing dal-v1 / resolveDobAxes math.
 * No second calendar. No prose. Client-safe (no crypto).
 */

import type {
  ChangeTendency,
  DayBand,
  DecisionTendency,
  DistanceTendency,
  ExpressionAxes,
  ExpressionAxisId,
  RecoveryTendency,
  Result,
  StartTendency,
} from './types';

export const BIRTH_SIGNATURE_SOURCE_VERSION = 'dal-v1' as const;

export type BirthEvidenceId =
  | 'civil.dayBand'
  | 'civil.season3'
  | 'stem.laneMod3'
  | 'stem.lanePlusDayBand';

export type CivilBirthDimensionsV1 = {
  readonly start: StartTendency;
  readonly decision: DecisionTendency;
  readonly recovery: RecoveryTendency;
  readonly dayBand: DayBand;
  readonly season3: 0 | 1 | 2;
  readonly dayBandIndex: 0 | 1 | 2;
};

export type BirthSignatureV1 = {
  readonly birthSignatureId: string;
  readonly birthEvidenceIds: readonly BirthEvidenceId[];
  readonly dimensions: ExpressionAxes;
  readonly tensions: readonly ExpressionAxisId[];
  readonly contextModifiers: {
    readonly dayBand: DayBand;
    readonly season3: 0 | 1 | 2;
    readonly stemLaneIndex: number;
  };
  readonly confidence: 'high';
  readonly sourceVersion: typeof BIRTH_SIGNATURE_SOURCE_VERSION;
};

export const START_BY_DAY_BAND: Readonly<Record<DayBand, StartTendency>> = {
  early: 'try',
  mid: 'map',
  late: 'ask',
};

export const DECISION_TABLE: Readonly<
  Record<DayBand, readonly DecisionTendency[]>
> = {
  early: ['sort', 'deadline', 'wait'],
  mid: ['deadline', 'wait', 'sort'],
  late: ['wait', 'sort', 'deadline'],
};

export const RECOVERY_BY_SEASON3: readonly RecoveryTendency[] = [
  'pause',
  'shrink',
  'scene',
];
export const DISTANCE_BY_MOD: readonly DistanceTendency[] = [
  'close',
  'middle',
  'solo',
];
export const CHANGE_BY_KEY: readonly ChangeTendency[] = [
  'observe',
  'adjust',
  'rebuild',
];

const DOB_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function dayBandFromDay(day: number): DayBand {
  if (day <= 10) return 'early';
  if (day <= 20) return 'mid';
  return 'late';
}

export function dayBandIndex(dayBand: DayBand): 0 | 1 | 2 {
  if (dayBand === 'early') return 0;
  if (dayBand === 'mid') return 1;
  return 2;
}

export function evidenceIdsForAxis(axisId: ExpressionAxisId): BirthEvidenceId[] {
  switch (axisId) {
    case 'start':
      return ['civil.dayBand'];
    case 'decision':
      return ['civil.dayBand', 'civil.season3'];
    case 'recovery':
      return ['civil.season3'];
    case 'distance':
      return ['stem.laneMod3'];
    case 'change':
      return ['stem.lanePlusDayBand'];
  }
}

export function resolveCivilBirthDimensions(
  birthDate: string,
): Result<CivilBirthDimensionsV1> {
  const m = birthDate.match(DOB_RE);
  if (!m) return { ok: false, code: 'invalid_dob' };
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return { ok: false, code: 'invalid_dob' };
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { ok: false, code: 'invalid_dob' };
  }
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return { ok: false, code: 'invalid_dob' };
  }
  const band = dayBandFromDay(day);
  const season3 = ((month - 1) % 3) as 0 | 1 | 2;
  const dbi = dayBandIndex(band);
  return {
    ok: true,
    value: {
      start: START_BY_DAY_BAND[band],
      decision: DECISION_TABLE[band][season3]!,
      recovery: RECOVERY_BY_SEASON3[season3]!,
      dayBand: band,
      season3,
      dayBandIndex: dbi,
    },
  };
}

export function buildBirthSignatureV1(input: {
  birthDate: string;
  stemLaneIndex: number;
}): Result<BirthSignatureV1> {
  const civil = resolveCivilBirthDimensions(input.birthDate);
  if (!civil.ok) return civil;
  if (
    !Number.isFinite(input.stemLaneIndex) ||
    !Number.isInteger(input.stemLaneIndex) ||
    input.stemLaneIndex < 0 ||
    input.stemLaneIndex > 9
  ) {
    return { ok: false, code: 'missing_stem' };
  }
  const { start, decision, recovery, dayBand, season3, dayBandIndex: dbi } =
    civil.value;
  const distance = DISTANCE_BY_MOD[input.stemLaneIndex % 3]!;
  const change = CHANGE_BY_KEY[(input.stemLaneIndex + dbi) % 3]!;
  const dimensions: ExpressionAxes = {
    start,
    decision,
    recovery,
    distance,
    change,
  };
  const tensions: ExpressionAxisId[] = [];
  if (start === 'try' && decision === 'wait') tensions.push('start', 'decision');
  if (distance === 'close' && recovery === 'scene') tensions.push('distance', 'recovery');
  if (decision === 'deadline' && change === 'observe') tensions.push('decision', 'change');
  return {
    ok: true,
    value: {
      birthSignatureId: `${BIRTH_SIGNATURE_SOURCE_VERSION}:${start}-${decision}-${recovery}-${distance}-${change}`,
      birthEvidenceIds: [
        'civil.dayBand',
        'civil.season3',
        'stem.laneMod3',
        'stem.lanePlusDayBand',
      ],
      dimensions,
      tensions,
      contextModifiers: {
        dayBand,
        season3,
        stemLaneIndex: input.stemLaneIndex,
      },
      confidence: 'high',
      sourceVersion: BIRTH_SIGNATURE_SOURCE_VERSION,
    },
  };
}
