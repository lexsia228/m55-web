/**
 * Public share post text serialization — flat quotes, tier-specific CTA voice.
 */

/** Canonical Pair share CTA — card and post must import from here. */
export const PAIR_SHARE_CTA_JA = 'あなたと誰かの関係も、見てみる？' as const;

const PAIR_SHARE_CTA_MARKER = PAIR_SHARE_CTA_JA;

/** Same-bracket nesting: 「…「…」…」 or 『…『…』…』 */
const NESTED_SAME_BRACKET = /(「[^」\n]*「)|(『[^』\n]*『)/;

export function normalizeJapaneseTerminalPunctuation(text: string): string {
  return text
    .replace(/。{2,}/g, '。')
    .replace(/、{2,}/g, '、')
    .replace(/。、/g, '。')
    .replace(/、。/g, '。')
    .trim();
}

export function hasInvalidQuoteNesting(text: string): boolean {
  return NESTED_SAME_BRACKET.test(text);
}

export function hasInvalidSeenVsActualShareNesting(text: string): boolean {
  if (/見える私は/.test(text) && /実際の私は/.test(text)) {
    return /\n\n「見える私は/.test(text) || /「[^」\n]*見える私は「/.test(text);
  }
  return hasInvalidQuoteNesting(text);
}

function flattenNestedGovernedQuote(text: string): string {
  const inner = /「([^」]*「ここまで」[^」]*)」/.exec(text);
  if (inner) {
    return text.replace(inner[0], inner[1]!.replace(/[「」]/g, ''));
  }
  if (hasInvalidQuoteNesting(text)) {
    return text.replace(/[「」]/g, '');
  }
  return text;
}

export function formatShareInsightForPost(insightJa: string): string {
  let trimmed = normalizeJapaneseTerminalPunctuation(insightJa.trim());
  if (/見える私は/.test(trimmed) && /実際の私は/.test(trimmed)) {
    trimmed = trimmed
      .replace(/見える私は「([^」]+)」/g, '見える私は、$1')
      .replace(/実際の私は「([^」]*)」/g, (_match, actual: string) => {
        const flat = actual.includes('「') ? actual.replace(/[「」]/g, '') : actual;
        return `実際の私は、${flat}`;
      });
    return trimmed;
  }
  trimmed = flattenNestedGovernedQuote(trimmed);
  if ((trimmed.match(/「/g) ?? []).length >= 1) {
    return trimmed;
  }
  return `「${trimmed}」`;
}

export function buildSelfSharePostText(titleJa: string, insightJa: string): string {
  const body = formatShareInsightForPost(insightJa);
  return normalizeJapaneseTerminalPunctuation(
    `M55で「${titleJa}」が出た。\n\n${body}\n\nこれ、私っぽい？\nあなたはどう出る？\n#M55`,
  );
}

export function buildPairSharePostText(titleJa: string, insightJa: string): string {
  const body = formatShareInsightForPost(insightJa);
  return normalizeJapaneseTerminalPunctuation(
    `M55で「${titleJa}」が出た。\n\n${body}\n\n${PAIR_SHARE_CTA_MARKER}\n#M55`,
  );
}

export function buildPremiumSharePostText(insightJa: string): string {
  const body = formatShareInsightForPost(insightJa);
  return normalizeJapaneseTerminalPunctuation(
    `M55 プレミアムレポートから。\n\n${body}\n\n#M55`,
  );
}
