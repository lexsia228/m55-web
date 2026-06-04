/**
 * Lane A consult reply — map plaintext assistant body to ConsultReplyCard sections.
 * Paragraphs are split on blank lines (same contract as LLM prompt output).
 */

export type ConsultReplyDisplayBodies = {
  scene: string;
  report: string;
  alt: string;
  aux: string;
  today: string;
};

/** Normalize assistant plaintext into display paragraphs (blank-line separated). */
export function normalizeConsultReplyParagraphs(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n+/g, ' ').trim())
    .filter(Boolean);
}

/**
 * Map paragraphs to renderer slots.
 * - Preferred: 5 paragraphs → scene / report / alt / aux / today
 * - Legacy: fewer paragraphs → today from last segment heuristic
 */
export function mapConsultReplyBodyForDisplay(paragraphs: string[]): ConsultReplyDisplayBodies {
  if (paragraphs.length >= 5) {
    return {
      scene: paragraphs[0] ?? '',
      report: paragraphs[1] ?? '',
      alt: paragraphs[2] ?? '',
      aux: paragraphs[3] ?? '',
      today: paragraphs[4] ?? '',
    };
  }

  const scene = paragraphs[0] ?? '';
  const report = paragraphs[1] ?? '';
  const alt = paragraphs[2] ?? paragraphs[1] ?? '';

  if (paragraphs.length <= 3) {
    const today = pickTodayStepFromParagraphs(paragraphs) ?? '';
    return { scene, report, alt, aux: '', today };
  }

  const aux = paragraphs[3] ?? '';
  const today = pickTodayStepFromParagraphs(paragraphs) ?? paragraphs[paragraphs.length - 1] ?? '';
  return { scene, report, alt, aux, today };
}

/** Heuristic for legacy replies when the 5-paragraph contract is missing. */
export function pickTodayStepFromParagraphs(paragraphs: string[]): string | null {
  const last = paragraphs[paragraphs.length - 1]?.trim() ?? '';
  if (!last) return null;
  if (last.length > 160) return null;
  if (/(別れ|辞め|やめ|投資|医療|法律|転職)/.test(last)) return null;
  if (/(分け|書く|整え|休む|戻す|決める前|一手|試す|見直|読み返)/.test(last)) return last;
  return null;
}
