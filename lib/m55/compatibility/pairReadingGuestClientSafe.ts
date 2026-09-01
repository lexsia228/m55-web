import {
  COMPATIBILITY_GUEST_SESSION_KEY,
  COMPATIBILITY_GUEST_SESSION_KEY_V3,
  isCompleteCompatibilityGuestInput,
  isValidCompatibilityRelationStatusId,
  type CompatibilityGuestJourneyV3,
} from './pairReadingGuestContract';
import {
  isCompleteCompatibilityCurrentContextV2,
  type CompatibilityCurrentContextAnswersV2,
  type CompatibilityCurrentQuestionIdV2,
} from './currentContextContract.v2';
import { parsePairDisplayIdentity } from './pairDisplayIdentity';

/** Strip legacy optional focus before primary guest/public projection. Paid snapshots keep focus when passed separately. */
export function stripFocusForPublicGuestAnswers(
  answers: CompatibilityCurrentContextAnswersV2,
): CompatibilityCurrentContextAnswersV2 {
  if (!('focus' in answers)) {
    return answers;
  }
  const { focus: _focus, ...publicAnswers } = answers;
  return publicAnswers as CompatibilityCurrentContextAnswersV2;
}

/** Production alias used by guest session restore and submit paths. */
export function sanitizeGuestSessionAnswers(
  answers: CompatibilityCurrentContextAnswersV2,
): CompatibilityCurrentContextAnswersV2 {
  return stripFocusForPublicGuestAnswers(answers);
}

export function prepareGuestSubmitAnswers(
  answers: CompatibilityCurrentContextAnswersV2,
): CompatibilityCurrentContextAnswersV2 {
  return stripFocusForPublicGuestAnswers(answers);
}

export function mergeGuestAnswerSelection(
  current: Partial<CompatibilityCurrentContextAnswersV2>,
  questionId: CompatibilityCurrentQuestionIdV2,
  answerId: string,
): Partial<CompatibilityCurrentContextAnswersV2> {
  const next = { ...current, [questionId]: answerId };
  if (!('focus' in next)) {
    return next;
  }
  return stripFocusForPublicGuestAnswers(next as CompatibilityCurrentContextAnswersV2);
}

export function clearGuestRelationStageAnswers(): Partial<CompatibilityCurrentContextAnswersV2> {
  return {};
}

export function backFromGuestQuestionnaire(
  inQuestionnaire: boolean,
  questionIndex: number,
  currentAnswers: Partial<CompatibilityCurrentContextAnswersV2>,
): {
  inQuestionnaire: boolean;
  questionIndex: number;
  answers: Partial<CompatibilityCurrentContextAnswersV2>;
} {
  if (inQuestionnaire && questionIndex === 0) {
    return { inQuestionnaire: false, questionIndex: 0, answers: clearGuestRelationStageAnswers() };
  }
  if (inQuestionnaire && questionIndex > 0) {
    return {
      inQuestionnaire: true,
      questionIndex: Math.max(0, questionIndex - 1),
      answers: currentAnswers,
    };
  }
  return { inQuestionnaire, questionIndex, answers: currentAnswers };
}

export function parseSanitizedGuestJourneyV3(raw: string): CompatibilityGuestJourneyV3 | null {
  try {
    const value = JSON.parse(raw) as Partial<CompatibilityGuestJourneyV3>;
    if (
      value.version !== 'journey_v3' ||
      !value.input ||
      !isCompleteCompatibilityGuestInput(value.input) ||
      !isValidCompatibilityRelationStatusId(value.relationStatusId) ||
      !isCompleteCompatibilityCurrentContextV2(value.answers, value.relationStatusId)
    ) {
      return null;
    }
    return {
      ...value,
      answers: sanitizeGuestSessionAnswers(value.answers),
      ...(() => {
        const displayIdentity = parsePairDisplayIdentity(value.displayIdentity);
        return displayIdentity ? { displayIdentity } : {};
      })(),
    } as CompatibilityGuestJourneyV3;
  } catch {
    return null;
  }
}

export const GUEST_SESSION_STORAGE_KEYS = Object.freeze({
  legacy: COMPATIBILITY_GUEST_SESSION_KEY,
  journeyV3: COMPATIBILITY_GUEST_SESSION_KEY_V3,
} as const);

/** Production guest reset — removes journey and legacy session keys only. */
export function clearGuestSessionStorage(storage: Pick<Storage, 'removeItem'>): void {
  storage.removeItem(COMPATIBILITY_GUEST_SESSION_KEY);
  storage.removeItem(COMPATIBILITY_GUEST_SESSION_KEY_V3);
}
