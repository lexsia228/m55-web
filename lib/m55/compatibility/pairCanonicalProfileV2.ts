import {
  CANONICAL_BIRTH_PROFILE_VERSION,
  resolveCanonicalBirthProfileV2,
  type CanonicalBirthProfileV2,
} from '../individualization/canonicalBirthProfileV2';
import type { CompatibilityCurrentContextAnswers } from './currentContextContract.v1';

export const PAIR_CANONICAL_PROFILE_VERSION = 'pair_canonical_profile_v2' as const;

export type StemDeltaClass = 'same' | 'near' | 'far';

export type PairCanonicalProfileV2 = {
  readonly version: typeof PAIR_CANONICAL_PROFILE_VERSION;
  readonly a: CanonicalBirthProfileV2;
  readonly b: CanonicalBirthProfileV2;
  readonly stemDeltaClass: StemDeltaClass;
  readonly lunarAligned: boolean;
  readonly startSplit: boolean;
  readonly stableFingerprint: string;
};

function djb2(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return `djb2:${h.toString(16).padStart(8, '0')}`;
}

export function stemDeltaClass(aLane: number, bLane: number): StemDeltaClass {
  const raw = Math.abs(aLane - bLane);
  const d = Math.min(raw, 10 - raw);
  if (d === 0) return 'same';
  if (d <= 2) return 'near';
  return 'far';
}

export function resolvePairCanonicalProfileV2(input: {
  personABirthDate: string;
  personBBirthDate: string;
}): PairCanonicalProfileV2 | null {
  const a = resolveCanonicalBirthProfileV2({ birthDate: input.personABirthDate });
  const b = resolveCanonicalBirthProfileV2({ birthDate: input.personBBirthDate });
  if (!a.ok || !b.ok) return null;
  const delta = stemDeltaClass(a.value.stemLane, b.value.stemLane);
  const lunarAligned = a.value.lunarMonth === b.value.lunarMonth;
  const startSplit = a.value.civil.start !== b.value.civil.start;
  return {
    version: PAIR_CANONICAL_PROFILE_VERSION,
    a: a.value,
    b: b.value,
    stemDeltaClass: delta,
    lunarAligned,
    startSplit,
    stableFingerprint: djb2(
      [
        PAIR_CANONICAL_PROFILE_VERSION,
        CANONICAL_BIRTH_PROFILE_VERSION,
        a.value.stableFingerprint,
        b.value.stableFingerprint,
        delta,
        lunarAligned ? 'l1' : 'l0',
      ].join('|'),
    ),
  };
}

export function pairAnswerFingerprint(answers: CompatibilityCurrentContextAnswers): string {
  return [
    answers.decisionPace,
    answers.disagreement,
    answers.distance,
    answers.expressionPace,
    answers.returnPattern,
  ].join('|');
}
