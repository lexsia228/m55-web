import type {
  ChapterId,
  CompatibilityFreeResultFragments,
  PaidTopicId,
  RelationStatusId,
  TemperatureId,
} from './pairReadingTypes';

export const COMPATIBILITY_GUEST_SESSION_KEY = 'm55_compatibility_guest_input_v1' as const;

export const COMPATIBILITY_GUEST_DEFAULT_STATE = {
  relationStatusId: 'R2',
  paidTopicId: 'T3',
  temperatureId: 'E0',
} as const satisfies {
  relationStatusId: RelationStatusId;
  paidTopicId: PaidTopicId;
  temperatureId: TemperatureId;
};

export type CompatibilityGuestInput = {
  personA: string;
  personB: string;
};

export type CompatibilityPublicChapter = {
  chapterId: ChapterId;
  chapterTitle: string;
  actualContent: string;
};

export type CompatibilityMappedChapter = CompatibilityPublicChapter & {
  freeConnection: string;
};

export type CompatibilityPublicResult = {
  free: CompatibilityFreeResultFragments;
  freeTeaser: string;
  mappedChapters: [CompatibilityMappedChapter, CompatibilityMappedChapter];
  allChapters: CompatibilityPublicChapter[];
};

export type CompatibilityGuestResultOutcome =
  | { ok: true; value: CompatibilityPublicResult }
  | { ok: false; message: string };

const DOB_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidCompatibilityBirthDate(
  value: string,
  todayIso = new Date().toISOString().slice(0, 10),
): boolean {
  const match = value.match(DOB_RE);
  if (!match || value > todayIso) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function isCompleteCompatibilityGuestInput(
  input: CompatibilityGuestInput,
  todayIso?: string,
): boolean {
  return (
    isValidCompatibilityBirthDate(input.personA, todayIso) &&
    isValidCompatibilityBirthDate(input.personB, todayIso)
  );
}
