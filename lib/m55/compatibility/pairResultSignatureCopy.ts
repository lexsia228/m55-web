/**
 * Display-only compression of existing pair-result phrases.
 * Does not create new semantic conclusions.
 */

export const PAIR_SIGNATURE_LABELS = {
  you: 'あなた',
  partner: '相手',
  between: '二人の間',
  overlap: '重なりやすいところ',
  difference: '違いが出やすいところ',
} as const;

/** First sentence of existing copy, shortened only for the signature field. */
export function compactExistingPhrase(text: string, maxChars = 72): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  const first = trimmed.split('。')[0]?.trim() ?? trimmed;
  const sentence = trimmed.includes('。') && first ? `${first}。` : first;
  if (sentence.length <= maxChars) return sentence;
  return `${sentence.slice(0, Math.max(8, maxChars - 1)).trim()}…`;
}
