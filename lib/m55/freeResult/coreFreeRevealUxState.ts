/**
 * Presentation-only UX phases for /core free onboarding → result reveal.
 * Does not alter individualization, answer IDs, or composition logic.
 */

export type FreeRevealUxPhase = 'INTRO' | 'QUESTIONNAIRE' | 'REVEALING' | 'RESULT';

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

export function shouldHideResultDuringQuestionnaire(phase: FreeRevealUxPhase): boolean {
  return phase === 'INTRO' || phase === 'QUESTIONNAIRE' || phase === 'REVEALING';
}

export function resolveInitialUxPhase(): FreeRevealUxPhase {
  return 'INTRO';
}

export function transitionOnIntroStart(): FreeRevealUxPhase {
  return 'QUESTIONNAIRE';
}

export function transitionOnQuestionnaireComplete(): FreeRevealUxPhase {
  return 'REVEALING';
}

export function transitionOnRevealComplete(): FreeRevealUxPhase {
  return 'RESULT';
}

export function transitionOnReanswer(): FreeRevealUxPhase {
  return 'QUESTIONNAIRE';
}

export function revealTransitionDurationMs(prefersReducedMotion: boolean): number {
  return prefersReducedMotion ? 0 : FREE_REVEAL_TRANSITION_MS;
}

export function isQuestionnaireCompleteForComposition(
  phase: FreeRevealUxPhase,
  answersComplete: boolean,
): boolean {
  return phase === 'RESULT' && answersComplete;
}
