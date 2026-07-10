import assert from 'node:assert/strict';

/** Shared authority vocabulary for legal / DTR LP / pricing storefront surfaces. */
export const REQUIRED_AUTHORITY_TERMS = [
  '日本の暦文化',
  '回答差分',
  '自己理解',
  '関係性整理',
  '参考情報',
] as const;

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
