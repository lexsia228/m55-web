export const COMPATIBILITY_REPORT_FULL_PRODUCT_KEY =
  'compatibility_report_full_v1' as const;
export const COMPATIBILITY_REPORT_PUBLIC_NAME = '二人の相性レポート' as const;
export const COMPATIBILITY_REPORT_PRICE_YEN = 1480 as const;
export const COMPATIBILITY_REPORT_CURRENCY = 'jpy' as const;
export const COMPATIBILITY_REPORT_QUANTITY = 1 as const;
export const COMPATIBILITY_REPORT_COUNT = 1 as const;
export const COMPATIBILITY_COMMERCE_ENABLED_ENV =
  'M55_COMPATIBILITY_COMMERCE_ENABLED' as const;
export const COMPATIBILITY_STRIPE_PRICE_ENV =
  'STRIPE_PRICE_COMPATIBILITY_REPORT_FULL_V1' as const;

export const COMPATIBILITY_REPORT_INCLUDED = [
  '6つの場面',
  'A／B双方の視点',
  'すれ違いの連鎖',
  '戻し方',
  'そのまま使える一言',
  '小さな実験',
  '振り返り',
] as const;

export const COMPATIBILITY_REPORT_PRODUCT_AUTHORITY = Object.freeze({
  productKey: COMPATIBILITY_REPORT_FULL_PRODUCT_KEY,
  publicName: COMPATIBILITY_REPORT_PUBLIC_NAME,
  priceYen: COMPATIBILITY_REPORT_PRICE_YEN,
  priceLabel: '¥1,480（税込）',
  currency: COMPATIBILITY_REPORT_CURRENCY,
  billing: 'one_time',
  quantity: COMPATIBILITY_REPORT_QUANTITY,
  subscription: false,
  reportCount: COMPATIBILITY_REPORT_COUNT,
  included: COMPATIBILITY_REPORT_INCLUDED,
  additionalReading: false,
  publicSharing: false,
} as const);

export function isCompatibilityCommerceEnabled(
  env: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return env[COMPATIBILITY_COMMERCE_ENABLED_ENV]?.trim().toLowerCase() === 'true';
}

export function getCompatibilityStripePriceId(
  env: Readonly<Record<string, string | undefined>> = process.env,
): string | null {
  const value = env[COMPATIBILITY_STRIPE_PRICE_ENV]?.trim() ?? '';
  return value || null;
}
