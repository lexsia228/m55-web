/**
 * Pair reading fingerprint — pure deterministic helper.
 * No production runtime wiring. No raw DOB in hashes/outputs.
 */

import { createHash } from 'node:crypto';
import type {
  PairAxisId,
  PairFingerprint,
  PairReadingInput,
  TemperatureId,
} from './pairReadingTypes';
import {
  derivePairAxisId,
  derivePairDifferenceType,
} from './pairReadingCivilDelta';

export {
  derivePairAxisId,
  derivePairDifferenceType,
  isValidBirthDate,
} from './pairReadingCivilDelta';

export const PAIR_FP_VERSION = 'pair_fp_v1' as const;

function shaShort(payload: string): string {
  return createHash('sha256').update(payload).digest('hex').slice(0, 32);
}

export function hashDob(birthDate: string): string {
  return shaShort(`${PAIR_FP_VERSION}|dob|${birthDate}`);
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
