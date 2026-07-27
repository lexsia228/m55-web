/**
 * Presentation-only UX phases for /core free onboarding → result reveal.
 * Does not alter individualization, answer IDs, or composition logic.
 */

export type FreeRevealUxPhase =
  | 'INTRO'
  | 'QUESTIONNAIRE'
  | 'REANSWER_FINAL'
  | 'REVEALING'
  | 'RESULT';

export type FreeJourneyStep = 'profile' | 'questions' | 'result';

export const FREE_REVEAL_TRANSITION_MS = 750 as const;

export function shouldShowHero(phase: FreeRevealUxPhase): boolean {
  return phase === 'RESULT';
}

export function shouldShowResultSections(phase: FreeRevealUxPhase): boolean {
  return phase === 'RESULT';
}

export function shouldShowIntro(phase: FreeRevealUxPhase): boolean {
  return phase === 'INTRO';
}

export function shouldShowQuestionnaire(phase: FreeRevealUxPhase): boolean {
  return phase === 'QUESTIONNAIRE';
}

export function shouldShowRevealing(phase: FreeRevealUxPhase): boolean {
  return phase === 'REVEALING';
}

export function shouldShowReanswerFinalize(phase: FreeRevealUxPhase): boolean {
  return phase === 'REANSWER_FINAL';
}

export function shouldHideResultDuringQuestionnaire(phase: FreeRevealUxPhase): boolean {
  return phase !== 'RESULT';
}

export function resolveJourneyStep(
  phase: FreeRevealUxPhase,
  questionIndex?: number,
  questionTotal?: number,
  profileComplete = false,
): { step: FreeJourneyStep; questionLabel?: string; profileComplete?: boolean } {
  if (phase === 'RESULT') return { step: 'result', profileComplete: true };
  if (phase === 'QUESTIONNAIRE' || phase === 'REANSWER_FINAL' || phase === 'REVEALING') {
    const label =
      typeof questionIndex === 'number' && typeof questionTotal === 'number'
        ? `${questionIndex + 1}/${questionTotal}`
        : undefined;
    return { step: 'questions', questionLabel: label, profileComplete: true };
  }
  if (phase === 'INTRO') {
    return { step: profileComplete ? 'questions' : 'profile', profileComplete };
  }
  return { step: 'profile', profileComplete: false };
}

/** Profile from Home modal skips INTRO — questionnaire begins immediately. */
export function resolveInitialUxPhase(hasCompleteProfile = false): FreeRevealUxPhase {
  return hasCompleteProfile ? 'QUESTIONNAIRE' : 'INTRO';
}

export function transitionOnIntroStart(): FreeRevealUxPhase {
  return 'QUESTIONNAIRE';
}

export function transitionOnQuestionnaireComplete(isReanswerFlow: boolean): FreeRevealUxPhase {
  return isReanswerFlow ? 'REANSWER_FINAL' : 'REVEALING';
}

export function transitionOnRevealComplete(): FreeRevealUxPhase {
  return 'RESULT';
}

export function transitionOnReanswerEditStart(): FreeRevealUxPhase {
  return 'QUESTIONNAIRE';
}

export function revealTransitionDurationMs(prefersReducedMotion: boolean): number {
  return prefersReducedMotion ? 0 : FREE_REVEAL_TRANSITION_MS;
}

export function isQuestionnaireCompleteForComposition(
  phase: FreeRevealUxPhase,
  committedAnswersComplete: boolean,
): boolean {
  return phase === 'RESULT' && committedAnswersComplete;
}
