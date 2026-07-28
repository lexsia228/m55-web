/**
 * Negative fixture: a decoy barrel that re-exports a *different* component under
 * the canonical Premium name. Resolving the re-export chain must land on the
 * decoy module, not on components/experience/PremiumDecisionSurface.tsx.
 */
export { default as PremiumDecisionSurface } from './decoy-surface';
