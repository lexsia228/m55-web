/**
 * Visual grammar for public share cards. Presentation only.
 * Does not change tokens, fingerprints, or reconstructed identity body.
 */

import { PUBLIC_DOB_PROVENANCE_CUE_JA } from './narrativeSafetyV1';
import type { ShareCandidateVariant } from './m55NarrativeSpecV1';

export function cardCSupportEligible(heroJa: string, extraJa: string): boolean {
  const extra = extraJa.trim();
  if (!extra) return false;
  if (/頻度を、あまり変えずに|距離感を言葉にする|連絡や会う頻度/.test(extra)) return false;
  const keys = ['置く', '一人', '期限', 'ここまで'] as const;
  return keys.some((key) => heroJa.includes(key) && extra.includes(key));
}

/** Display-only poster breaks. Does not change token / fingerprint body. */
export function posterHeroLinesJa(heroJa: string): readonly string[] {
  const sentences = heroJa
    .split('。')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const lines: string[] = [];
  for (const sentence of sentences) {
    const idx = sentence.indexOf('のは、');
    if (idx > 0) {
      lines.push(sentence.slice(0, idx + 'のは、'.length));
      const rest = sentence.slice(idx + 'のは、'.length).trim();
      if (rest) lines.push(`${rest}。`);
    } else {
      lines.push(`${sentence}。`);
    }
  }
  return lines.length > 0 ? lines : heroJa.trim() ? [heroJa.trim()] : [];
}

export type PublicCardRowV1 = {
  readonly label: string;
  readonly body: string;
};

export type PublicCardDisplayV1 = {
  readonly variant: ShareCandidateVariant;
  readonly headline: string;
  readonly cueJa: string;
  readonly cta: string;
  readonly heroJa: string;
  readonly supportJa: string;
  readonly rows: readonly PublicCardRowV1[];
  readonly seenJa: string;
  readonly actualJa: string;
  readonly entryJa: string;
  readonly returnJa: string;
  readonly sideAJa: string;
  readonly sideBJa: string;
};

function splitCue(body: string): { main: string; cueJa: string } {
  const cue = PUBLIC_DOB_PROVENANCE_CUE_JA;
  if (body.includes(cue)) {
    return { main: body.replace(cue, '').trim(), cueJa: cue };
  }
  return { main: body.trim(), cueJa: '' };
}

/**
 * Extract quoted Japanese after a label, supporting nested 「」 inside the outer pair.
 * Naive [^」]+ truncation breaks on e.g. 近い関係で「ここまで」が見えたところで…
 */
export function extractJapaneseLabelQuoteJa(block: string, label: string): string {
  const labelIdx = block.indexOf(label);
  if (labelIdx < 0) return '';
  const afterLabel = block.slice(labelIdx + label.length);
  const openRel = afterLabel.search(/\n?「/);
  if (openRel < 0) return '';
  let i = openRel + (afterLabel[openRel] === '\n' ? 1 : 0) + 1;
  let depth = 1;
  const start = i;
  while (i < afterLabel.length && depth > 0) {
    const ch = afterLabel[i];
    if (ch === '「') depth += 1;
    else if (ch === '」') depth -= 1;
    i += 1;
  }
  if (depth !== 0) return '';
  return afterLabel.slice(start, i - 1).trim();
}

export function parsePublicCardDisplayV1(input: {
  variant: ShareCandidateVariant;
  headline: string;
  body: string;
  cta: string;
}): PublicCardDisplayV1 {
  const { main, cueJa } = splitCue(input.body);
  const rows: PublicCardRowV1[] = [];
  for (const line of main.split('\n')) {
    const idx = line.indexOf('：');
    if (idx > 0) {
      rows.push({ label: line.slice(0, idx).trim(), body: line.slice(idx + 1).trim() });
    }
  }

  let heroJa = '';
  let supportJa = '';
  if (input.variant === 'hidden_spec' || input.variant === 'premium_takeaway') {
    const lines = main.split('\n').map((line) => line.trim()).filter(Boolean);
    heroJa = lines[0] ?? '';
    const extra = lines.slice(1).join('\n');
    supportJa = cardCSupportEligible(heroJa, extra) ? extra : '';
  }

  const seenJa = extractJapaneseLabelQuoteJa(main, '人から見える私');
  const actualJa = extractJapaneseLabelQuoteJa(main, '実際の私');

  const entryWithReturnMatch = /すれ違いの入口\n([\s\S]*?)\n\n戻りやすい方法/.exec(main);
  const entryOnlyMatch =
    input.variant === 'pair_manual'
      ? /すれ違いの入口\n([\s\S]+)$/.exec(main)
      : null;
  const returnMatch = /戻りやすい方法\n([\s\S]+)$/.exec(main);
  const entryJa = (entryWithReturnMatch?.[1] ?? entryOnlyMatch?.[1] ?? '').trim();
  const returnJa = (returnMatch?.[1] ?? '').trim();
  const sideA = /一方は、([^\n。]+)/.exec(entryJa)?.[1]?.trim() ?? '';
  const sideB = /もう一方は、([^\n。]+)/.exec(entryJa)?.[1]?.trim() ?? '';

  return {
    variant: input.variant,
    headline: input.headline,
    cueJa,
    cta: input.cta,
    heroJa,
    supportJa,
    rows,
    seenJa,
    actualJa,
    entryJa,
    returnJa,
    sideAJa: sideA,
    sideBJa: sideB,
  };
}

export function shareVariantEnum(
  variant: ShareCandidateVariant,
): 'manual' | 'mirror' | 'hidden_spec' | 'pair' | undefined {
  if (variant === 'manual') return 'manual';
  if (variant === 'seen_vs_actual') return 'mirror';
  if (variant === 'hidden_spec' || variant === 'premium_takeaway') return 'hidden_spec';
  if (variant === 'pair_manual' || variant === 'pair_generic') return 'pair';
  return undefined;
}
