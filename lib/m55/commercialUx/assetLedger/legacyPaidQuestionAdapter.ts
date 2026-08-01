/**
 * Legacy paid question IDs — readable for snapshots only; never valid for new UI.
 */
export const LEGACY_PAID_QUESTION_IDS = [
  'paid.report_usage',
  'paid.reading_style',
] as const;

export const LEGACY_PAID_REPORT_USAGE_IDS = [
  'paid.report_usage.reread_scene',
  'paid.report_usage.chapter_pick',
  'paid.report_usage.note_take',
] as const;

export const LEGACY_PAID_READING_STYLE_IDS = [
  'paid.reading_style.headline',
  'paid.reading_style.story',
  'paid.reading_style.compare',
] as const;

export const LEGACY_PAID_ANSWER_IDS = [
  ...LEGACY_PAID_REPORT_USAGE_IDS,
  ...LEGACY_PAID_READING_STYLE_IDS,
] as const;

export type LegacyPaidQuestionId = (typeof LEGACY_PAID_QUESTION_IDS)[number];

export function isLegacyPaidQuestionId(id: string): id is LegacyPaidQuestionId {
  return (LEGACY_PAID_QUESTION_IDS as readonly string[]).includes(id);
}

export function isLegacyPaidAnswerId(id: string): boolean {
  return (LEGACY_PAID_ANSWER_IDS as readonly string[]).includes(id);
}

/**
 * Sanitize in-progress unpaid answers: preserve Q1–Q4, clear obsolete Q5/Q6.
 * Never reinterpret legacy answers as new semantics.
 */
export function sanitizeInProgressPaidAnswers(
  answers: Record<string, string>,
): { answers: Record<string, string>; clearedLegacy: boolean; resumeClearedFrom: string | null } {
  const next = { ...answers };
  let clearedLegacy = false;
  let resumeClearedFrom: string | null = null;

  for (const legacyQ of LEGACY_PAID_QUESTION_IDS) {
    if (next[legacyQ]) {
      delete next[legacyQ];
      clearedLegacy = true;
      if (!resumeClearedFrom) resumeClearedFrom = legacyQ;
    }
  }

  return { answers: next, clearedLegacy, resumeClearedFrom };
}

/**
 * For immutable purchased/generated snapshots: legacy fields remain as stored.
 * New generation requires current PAID_QUESTION_IDS only.
 */
export function isLegacyPaidAnswerSet(answers: Record<string, string>): boolean {
  return LEGACY_PAID_QUESTION_IDS.some((id) => Boolean(answers[id]));
}
