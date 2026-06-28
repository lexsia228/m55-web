/**
 * Feature flag: paid DTR chapter body AI generation pipeline.
 *
 * Default OFF — Production must NOT activate until a separate authorization gate.
 * Stripe webhook / fulfillment stability must not be affected by AI generation.
 */

/**
 * When true, the AI chapter body generation pipeline is active for new fulfillments.
 * Default: false.
 * Production activation requires a separate gate — do NOT set this to true in production env.
 */
export function isDtrChapterBodyGenEnabled(): boolean {
  return process.env.M55_DTR_CHAPTER_BODY_GEN_ENABLED === 'true';
}

/**
 * When true, AI generation failure falls back to STEM_SEED_BODIES instead of throwing.
 * Default: false (strict fail-closed).
 * Only enable during cautious staged rollout — a separate gate decision.
 */
export function isDtrChapterBodyGenFailFallbackEnabled(): boolean {
  return process.env.M55_DTR_CHAPTER_BODY_GEN_FAIL_FALLBACK === 'true';
}
