/**
 * Pair reading safety audit — allowlist-first, then denylist.
 * Pure. No network/DB/AI/ticket.
 */

import type { SafetyAuditResult } from './pairReadingTypes';

export const SAFETY_AUDIT_VERSION = 'pair_safety_audit_v1' as const;

/** Negation / disclaimer phrases that may contain otherwise-forbidden tokens. */
export const FORBIDDEN_ALLOWLIST_PHRASES: readonly string[] = [
  '占いではありません',
  '鑑定ではありません',
  '診断ではありません',
  '相談ではありません',
  'カウンセリングではありません',
  '助言ではありません',
  '関係や気持ちを断定するものではありません',
  '関係や相手の気持ちを断定・保証するものではありません',
  '医療・法律・投資等の助言ではありません',
  '出会い・マッチングサービスではありません',
  '占い・鑑定・診断・相談・カウンセリングではありません',
] as const;

const DENYLIST_TOKENS: readonly string[] = [
  '霊視',
  '運命',
  '本音',
  '告白すべき',
  '別れるべき',
  '夜の相性',
  '体の相性',
  'セックス',
  '相性%',
  'ranking',
  'score',
  '未来がわかる',
  'いつ付き合える',
  '必ず',
  '絶対',
] as const;

/** Affirmative uses that are not covered by allowlist masking alone. */
const DENYLIST_AFFIRMATIVE_PATTERNS: readonly RegExp[] = [
  /(?<!では)占い(?!では)/u,
  /(?<!では)鑑定(?!では)/u,
  /(?<!・)(?<!では)診断(?!では)/u,
  /(?<!・)(?<!では)相談(?!では)/u,
  /アドバイス/u,
  /助言(?!では)/u,
] as const;

const DANGEROUS_DEKIMASU = /(復縁|結婚|必ず進展).{0,12}できます/u;

const COMMAND_PATTERNS: readonly RegExp[] = [
  /すべき/u,
  /してください/u,
  /今すぐ/u,
  /しなさい/u,
  /した方がいい/u,
];

const PAID_DEEPENING_MARKERS: readonly string[] = [
  'あなた側に出やすい反応とペース',
  'お相手側に出やすい反応とペース',
  '2人の距離に出やすいズレ',
  '今日見る一つの手がかり',
  'この読み解きについて',
  '深掘りの一点',
];

const MASK = '⟦ALLOW⟧';

export function maskAllowlistedPhrases(text: string): string {
  let out = text;
  // Longer phrases first to avoid partial collisions.
  const sorted = [...FORBIDDEN_ALLOWLIST_PHRASES].sort((a, b) => b.length - a.length);
  for (const phrase of sorted) {
    if (out.includes(phrase)) {
      out = out.split(phrase).join(MASK);
    }
  }
  return out;
}

export function findForbiddenHits(text: string): string[] {
  const masked = maskAllowlistedPhrases(text);
  const hits: string[] = [];

  for (const token of DENYLIST_TOKENS) {
    if (masked.includes(token)) hits.push(`token:${token}`);
  }

  for (const re of DENYLIST_AFFIRMATIVE_PATTERNS) {
    if (re.test(masked)) hits.push(`pattern:${re.source}`);
  }

  if (DANGEROUS_DEKIMASU.test(masked)) {
    hits.push('collocation:危険+できます');
  }

  // Bare 「できます」 must not fail by itself.
  // Percentage / ranking markers.
  if (/\d+\s*%/.test(masked) || /相性\s*\d/.test(masked)) {
    hits.push('score-like:%');
  }
  if (/ランキング/u.test(masked)) hits.push('token:ランキング');

  return hits;
}

export function findCommandHits(text: string): string[] {
  const hits: string[] = [];
  for (const re of COMMAND_PATTERNS) {
    if (re.test(text)) hits.push(`command:${re.source}`);
  }
  return hits;
}

export function findRawDobHits(text: string, dobs: readonly string[]): string[] {
  const hits: string[] = [];
  for (const dob of dobs) {
    if (dob && text.includes(dob)) hits.push(`raw_dob:${dob}`);
  }
  // Generic ISO date leak heuristic in visible copy (strict for outputs).
  return hits;
}

export function findTeaserDeepeningLeakage(teaserText: string): string[] {
  const hits: string[] = [];
  for (const marker of PAID_DEEPENING_MARKERS) {
    if (teaserText.includes(marker)) hits.push(`teaser_deepening:${marker}`);
  }
  return hits;
}

export function auditPairReadingText(
  text: string,
  options?: { dobs?: readonly string[]; checkCommands?: boolean },
): SafetyAuditResult {
  const hits = [
    ...findForbiddenHits(text),
    ...(options?.dobs ? findRawDobHits(text, options.dobs) : []),
    ...(options?.checkCommands ? findCommandHits(text) : []),
  ];
  return { ok: hits.length === 0, hits };
}

export function countFullWidthChars(text: string): number {
  // Count Unicode code points (adequate for JP copy length gates).
  return [...text].length;
}

export function countSentencesJa(text: string): number {
  const parts = text
    .split(/[。！？]/u)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length;
}

export function textsAreNearDuplicates(a: string, b: string): boolean {
  const na = a.replace(/\s+/g, '');
  const nb = b.replace(/\s+/g, '');
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 40 && nb.includes(na)) return true;
  if (nb.length >= 40 && na.includes(nb)) return true;
  return false;
}
