/**
 * Free answer-set completion helpers for Self funnel (post pre-result theme removal).
 * Engine still expects free.primary_theme; UI no longer collects it before result.
 * Default theme keeps composition/checkout compatibility without a pre-result step.
 */

import {
  FREE_AXIS_QUESTION_IDS,
  FREE_QUESTION_IDS,
} from '../individualization/answerIdMapsV1';

/** Canonical default when theme is not chosen before free result (purchase-after theme). */
export const FREE_DEFAULT_PRIMARY_THEME_ANSWER_ID =
  'free.primary_theme.report_preview' as const;

const CORE_FIVE_QUESTION_IDS = [
  FREE_AXIS_QUESTION_IDS.start,
  FREE_AXIS_QUESTION_IDS.decision,
  FREE_AXIS_QUESTION_IDS.recovery,
  FREE_AXIS_QUESTION_IDS.distance,
  FREE_AXIS_QUESTION_IDS.change,
] as const;

export function isCoreFiveAnswersComplete(answers: Record<string, string>): boolean {
  return CORE_FIVE_QUESTION_IDS.every((id) => Boolean(answers[id]));
}

/** Inject default primary theme when absent — does not overwrite an existing choice. */
export function withDefaultPrimaryTheme(
  answers: Record<string, string>,
): Record<string, string> {
  if (answers['free.primary_theme']) return answers;
  return {
    ...answers,
    'free.primary_theme': FREE_DEFAULT_PRIMARY_THEME_ANSWER_ID,
  };
}

/** Complete set for composition / checkout (five core + theme, defaulted if needed). */
export function ensureCompleteFreeAnswerSet(
  answers: Record<string, string>,
): Record<string, string> | null {
  if (!isCoreFiveAnswersComplete(answers)) return null;
  const withTheme = withDefaultPrimaryTheme(answers);
  if (!FREE_QUESTION_IDS.every((id) => Boolean(withTheme[id]))) return null;
  return withTheme;
}

export function isCompleteFreeAnswerSet(answers: Record<string, string>): boolean {
  return ensureCompleteFreeAnswerSet(answers) !== null;
}
