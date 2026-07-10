/**
 * Pair reading fingerprint — pure deterministic helper.
 * No production runtime wiring. No raw DOB in hashes/outputs.
 */

import { createHash } from 'node:crypto';
import type {
  PairAxisId,
  PairDifferenceType,
  PairFingerprint,
  PairReadingInput,
  TemperatureId,
} from './pairReadingTypes';

export const PAIR_FP_VERSION = 'pair_fp_v1' as const;

const DOB_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidBirthDate(birthDate: string): boolean {
  const m = birthDate.match(DOB_RE);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

function shaShort(payload: string): string {
  return createHash('sha256').update(payload).digest('hex').slice(0, 32);
}

export function hashDob(birthDate: string): string {
  return shaShort(`${PAIR_FP_VERSION}|dob|${birthDate}`);
}

function dayBand(day: number): 0 | 1 | 2 {
  if (day <= 10) return 0;
  if (day <= 20) return 1;
  return 2;
}

function parseParts(birthDate: string): { year: number; month: number; day: number } {
  const m = birthDate.match(DOB_RE);
  if (!m) throw new Error('invalid_dob');
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

function axisSignal(birthDate: string): number {
  const p = parseParts(birthDate);
  return (p.year * 12 + p.month) * 3 + dayBand(p.day);
}

export function derivePairAxisId(personADob: string, personBDob: string): PairAxisId {
  const a = axisSignal(personADob);
  const b = axisSignal(personBDob);
  const diff = Math.abs(a - b);
  const axes: PairAxisId[] = ['A1', 'A2', 'A3', 'A4'];
  return axes[diff % 4]!;
}

export function derivePairDifferenceType(
  personADob: string,
  personBDob: string,
  pairAxisId: PairAxisId,
): PairDifferenceType {
  if (personADob === personBDob) return 'same_dob_pair';
  const a = parseParts(personADob);
  const b = parseParts(personBDob);
  const yearDiff = Math.abs(a.year - b.year);
  const monthDiff = Math.abs(a.month - b.month);
  const dayDiff = Math.abs(a.day - b.day);
  if (yearDiff <= 1 && monthDiff <= 1 && dayDiff <= 3) return 'near_dob_shift';
  switch (pairAxisId) {
    case 'A1':
      return 'pace_gap';
    case 'A2':
      return 'response_gap';
    case 'A3':
      return 'friction_gap';
    case 'A4':
      return 'entry_gap';
  }
}

export function buildLaneId(args: {
  relationStatusId: string;
  paidTopicId: string;
  temperatureId: TemperatureId;
  pairAxisId: PairAxisId;
}): string {
  return `pair_v1__${args.relationStatusId}__${args.paidTopicId}__${args.temperatureId}__${args.pairAxisId}`;
}

export function buildPairFingerprint(input: PairReadingInput): PairFingerprint {
  const temperatureId: TemperatureId = input.temperatureId ?? 'E0';
  const pairAxisId = input.pairAxisOverride ?? derivePairAxisId(input.personA.birthDate, input.personB.birthDate);
  const pairDifferenceType = derivePairDifferenceType(
    input.personA.birthDate,
    input.personB.birthDate,
    pairAxisId,
  );
  const personADobHash = hashDob(input.personA.birthDate);
  const personBDobHash = hashDob(input.personB.birthDate);
  const inputHash = shaShort(
    [
      PAIR_FP_VERSION,
      personADobHash,
      personBDobHash,
      input.relationStatusId,
      input.paidTopicId,
      temperatureId,
      pairAxisId,
      input.productInternalName,
      input.safetyProfile,
    ].join('|'),
  );
  const pairHash = shaShort(
    [
      PAIR_FP_VERSION,
      personADobHash,
      personBDobHash,
      pairAxisId,
      pairDifferenceType,
      'roleOrderPreserved',
    ].join('|'),
  );

  return {
    pairFingerprintVersion: PAIR_FP_VERSION,
    pairAxisId,
    pairDifferenceType,
    personADobHash,
    personBDobHash,
    inputHash,
    pairHash,
    roleOrderPreserved: true,
  };
}

export function buildOutputHash(args: {
  inputHash: string;
  pairHash: string;
  laneId: string;
  teaserText: string;
  chapterBodies: readonly string[];
  fragmentIds: readonly string[];
}): string {
  // Intentionally excludes raw birthDate strings.
  return shaShort(
    [
      PAIR_FP_VERSION,
      'pair_renderer_v1',
      args.inputHash,
      args.pairHash,
      args.laneId,
      ...args.fragmentIds,
      args.teaserText,
      ...args.chapterBodies,
    ].join('|'),
  );
}
