import assert from 'node:assert/strict';

/**
 * Durable public storefront authority vocabulary.
 * 「回答差分」 is internal analysis-model jargon, not required public copy.
 */
export const REQUIRED_AUTHORITY_TERMS = [
  '日本の暦文化',
  '自己理解',
  '関係性整理',
  '参考情報',
] as const;

export type LayeredAuthorityDensity = 'full' | 'lightweight';

/** Affirmative public copy must not include these on strict storefront surfaces. */
export const STRICT_STOREFRONT_FORBIDDEN_TERMS = [
  '占い',
  '鑑定',
  '相談返書',
  '当たる',
  '相性が良い',
  '相性が悪い',
] as const;

export const POSITIONING_DANGEROUS_TERMS = [
  '規約回避',
  'クローラー無力化',
  'Stripe通過保証',
  '審査突破保証',
  '検知回避',
  '言葉のロンダリング',
  '絶対に安全',
] as const;

/**
 * Realistic DOB/calendar + Premium 6 complete-model formulas.
 * Shared by full and lightweight modes. Sequential three-layer copy that
 * names 次の6問 as later emphasis is not listed here.
 */
export const DOB_PLUS_PREMIUM_SIX_COMPLETE_MODEL_PATTERNS: readonly RegExp[] = [
  /生年月日と6問の回答から/,
  /生年月日と6問から/,
  /生年月日と6問の回答をもとに/,
  /生年月日と6問をもとに/,
  /生年月日と6問(の回答)?だけで/,
  /生年月日＋6問/,
  /生年月日\s*\+\s*6問/,
  /初期ベースと6問の回答をもとに/,
  /初期ベースと6問をもとに/,
  /6問の回答をもとに/,
  /6問をもとに/,
];

/** Phrases that actually mean Premium report emphasis/focus — not 組み合わせて. */
export const PREMIUM_EMPHASIS_EVIDENCE_PHRASES = [
  '重点的に読む',
  '重点を合わせ',
  '読むところを合わせ',
  '深く読む',
] as const;

export function assertAuthorityVocabularyPresent(
  blob: string,
  requiredTerms: readonly string[] = REQUIRED_AUTHORITY_TERMS,
): void {
  for (const term of requiredTerms) {
    assert.ok(
      blob.includes(term),
      `authority vocabulary must include: ${term}`,
    );
  }
}

export function findDobPlusPremiumSixCompleteModelHits(blob: string): readonly string[] {
  return DOB_PLUS_PREMIUM_SIX_COMPLETE_MODEL_PATTERNS.filter((pattern) => pattern.test(blob)).map(
    (pattern) => pattern.source,
  );
}

export function hasPremiumEmphasisFraming(blob: string): boolean {
  return PREMIUM_EMPHASIS_EVIDENCE_PHRASES.some((phrase) => blob.includes(phrase));
}

export function findLayeredAuthorityTruthViolations(
  blob: string,
  density: LayeredAuthorityDensity = 'full',
): readonly string[] {
  const violations: string[] = [];
  for (const term of REQUIRED_AUTHORITY_TERMS) {
    if (!blob.includes(term)) violations.push(`missing durable term: ${term}`);
  }
  if (!/日本の暦文化|暦の土台|暦に基づ/.test(blob)) {
    violations.push('calendar foundation layer missing');
  }
  if (!/本人の回答|今の出方|現在の感じ方/.test(blob)) {
    violations.push('user-answer / current-expression layer missing');
  }
  const completeModelHits = findDobPlusPremiumSixCompleteModelHits(blob);
  if (completeModelHits.length > 0) {
    violations.push(`DOB+Premium-6 complete model: ${completeModelHits.join(', ')}`);
  }
  if (blob.includes('回答差分')) {
    violations.push('public authority copy must not revive 回答差分 jargon');
  }
  if (density === 'full') {
    if (!blob.includes('6問')) {
      violations.push('full authority copy should mention Premium 6');
    }
    if (!hasPremiumEmphasisFraming(blob)) {
      violations.push('Premium 6 must be framed as emphasis/focus, not generic 合わせ/組み合わせて');
    }
  }
  return violations;
}

/**
 * Product Truth for public LP/pricing authority copy.
 * Lightweight notes need calendar + current answers and must not treat DOB+6Q
 * as the complete authority basis. Full notes also require Premium-6 emphasis
 * phrasing (not 組み合わせて).
 */
export function assertLayeredAuthorityTruthPresent(
  blob: string,
  density: LayeredAuthorityDensity = 'full',
): void {
  const violations = findLayeredAuthorityTruthViolations(blob, density);
  assert.equal(violations.length, 0, violations.join('; '));
}

export function assertTermsAbsent(
  blob: string,
  forbiddenTerms: readonly string[],
): void {
  for (const term of forbiddenTerms) {
    assert.equal(
      blob.includes(term),
      false,
      `forbidden term must not appear: ${term}`,
    );
  }
  assert.equal(/相性[0-9０-９]+%/.test(blob), false, 'forbidden percent compatibility term');
}

export function assertStrictStorefrontVocabularySafe(blob: string): void {
  assertTermsAbsent(blob, STRICT_STOREFRONT_FORBIDDEN_TERMS);
}

export function assertPositioningDangerousTermsAbsent(blob: string): void {
  assertTermsAbsent(blob, POSITIONING_DANGEROUS_TERMS);
}

/** Semantic fixtures for the helper. Not product copy. */
export const LAYERED_AUTHORITY_HELPER_FIXTURES = {
  OLD_FULL_AUTHORITY_CORPUS:
    '日本の暦文化上の手がかりと、本人の回答による現在の感じ方を組み合わせて読み解きます。プレミアムレポートでは、その初期ベースと6問の回答をもとに、自己理解と関係性整理に使える参考情報へ整えます。',
  DOB_PLUS_6Q_FROM:
    '日本の暦文化に基づく自己理解と関係性整理の参考情報です。生年月日と6問の回答から読み解きます。本人の回答もあります。',
  DOB_PLUS_6Q_BASED_ON:
    '日本の暦文化に基づく自己理解と関係性整理の参考情報です。生年月日と6問の回答をもとに整えます。本人の回答もあります。',
  GENERIC_COMBINATION_ONLY:
    '日本の暦文化上の手がかりと、本人の回答による現在の感じ方を組み合わせて読み解きます。プレミアムレポートでは6問を加え、自己理解と関係性整理に使える参考情報へ整えます。',
  CURRENT_THREE_LAYER_FULL:
    '日本の暦文化の土台があります。無料の5つの回答は今の出方です。次の6問では、深く読むところを合わせます。自己理解と関係性整理に使える参考情報です。',
} as const;
