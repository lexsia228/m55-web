/**
 * Civil DOB delta helpers — client-safe (no node:crypto).
 * Hashing stays in pairReadingFingerprint.ts.
 */

import type { PairAxisId, PairDifferenceType } from './pairReadingTypes';

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
