/**
 * dal-v1: DOB → ExpressionAxes lookup (deterministic, fail-closed).
 */

import { createHash } from 'node:crypto';
import type {
  ChangeTendency,
  DayBand,
  DecisionTendency,
  DistanceTendency,
  DobBase,
  ExpressionAxes,
  InternalSelectors,
  RecoveryTendency,
  Result,
  StartTendency,
} from './types';
import { DOB_AXIS_LOOKUP_VERSION } from './versions';

const DOB_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const START_BY_DAY_BAND: Readonly<Record<DayBand, StartTendency>> = {
  early: 'try',
  mid: 'map',
  late: 'ask',
};

/** dayBand × season3 → decision (9 cells). */
const DECISION_TABLE: Readonly<Record<DayBand, readonly DecisionTendency[]>> = {
  early: ['sort', 'deadline', 'wait'],
  mid: ['deadline', 'wait', 'sort'],
  late: ['wait', 'sort', 'deadline'],
};

const RECOVERY_BY_SEASON3: readonly RecoveryTendency[] = ['pause', 'shrink', 'scene'];

const DISTANCE_BY_MOD: readonly DistanceTendency[] = ['close', 'middle', 'solo'];

const CHANGE_BY_KEY: readonly ChangeTendency[] = ['observe', 'adjust', 'rebuild'];

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

function parseDobParts(birthDate: string): { year: number; month: number; day: number } | null {
  const m = birthDate.match(DOB_RE);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  // Calendar validity (incl. leap): construct UTC date-only check
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function buildDobFp(birthDate: string, stemLaneIndex: number): string {
  return createHash('sha256')
    .update(`${DOB_AXIS_LOOKUP_VERSION}|${birthDate}|${stemLaneIndex}`)
    .digest('hex')
    .slice(0, 32);
}

export type DobAxisLookupOk = {
  dobBase: DobBase;
  internalSelectors: InternalSelectors;
};

/**
 * Same birthDate + stemLaneIndex → same axes.
 * Does not timezone-convert; uses YYYY-MM-DD string parts only.
 */
export function buildDobAxisLookupV1(input: {
  birthDate: string;
  stemLaneIndex: number;
}): Result<DobAxisLookupOk> {
  const parts = parseDobParts(input.birthDate);
  if (!parts) return { ok: false, code: 'invalid_dob' };

  if (
    !Number.isFinite(input.stemLaneIndex) ||
    !Number.isInteger(input.stemLaneIndex) ||
    input.stemLaneIndex < 0 ||
    input.stemLaneIndex > 9
  ) {
    return { ok: false, code: 'missing_stem' };
  }

  const dayBand = dayBandFromDay(parts.day);
  const monthBand = parts.month - 1;
  const season3 = monthBand % 3;
  const dbi = dayBandIndex(dayBand);

  const axes: ExpressionAxes = {
    start: START_BY_DAY_BAND[dayBand],
    decision: DECISION_TABLE[dayBand][season3]!,
    recovery: RECOVERY_BY_SEASON3[season3]!,
    distance: DISTANCE_BY_MOD[input.stemLaneIndex % 3]!,
    change: CHANGE_BY_KEY[(input.stemLaneIndex + dbi) % 3]!,
  };

  return {
    ok: true,
    value: {
      dobBase: {
        dobFp: buildDobFp(input.birthDate, input.stemLaneIndex),
        axes,
      },
      internalSelectors: {
        dayBand,
        monthBand,
        stemLaneIndex: input.stemLaneIndex,
      },
    },
  };
}
