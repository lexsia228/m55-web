import { applyM55ConsultReplyQualityPasses } from '../ai/m55ConsultReplyQualitySanitizer';

/**
 * Display-only cleanup for stored consult replies (legacy pre-patch generations).
 * Does not mutate DB or regenerate content.
 */
export function normalizeConsultReplyDisplayText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  return applyM55ConsultReplyQualityPasses(trimmed).text;
}
