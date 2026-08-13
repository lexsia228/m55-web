/**
 * One-time checkout lane constants.
 * Webhook と success page で共有。subscription lane は対象外。
 *
 * Price env names stay in this module so checkout can resolve Light to the
 * documented Production STATIC ¥1,000 price when LIGHT env is unset.
 */
import {
  DTR_CORE_FULL_V1_PRODUCT_KEY,
  DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1_PRODUCT_KEY,
  DTR_CORE_LIGHT_V1_PRODUCT_KEY,
} from './m55/reply/replyTicketCheckoutConstants';

/** @legacy 現行 Production checkout が使用中。移行後は {@link DTR_CORE_LIGHT_V1} に相当。 */
export const DTR_CORE_STATIC_V1 = 'DTR_CORE_STATIC_V1';

export const DTR_CORE_LIGHT_V1 = DTR_CORE_LIGHT_V1_PRODUCT_KEY;
export const DTR_CORE_FULL_V1 = DTR_CORE_FULL_V1_PRODUCT_KEY;
export const DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1 = DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1_PRODUCT_KEY;

export const ONE_TIME_STRIPE_PRICE_ENV_CANDIDATES = {
  [DTR_CORE_STATIC_V1]: 'STRIPE_PRICE_DTR_CORE_STATIC_V1',
  [DTR_CORE_LIGHT_V1]: 'STRIPE_PRICE_DTR_CORE_LIGHT_V1',
  [DTR_CORE_FULL_V1]: 'STRIPE_PRICE_DTR_CORE_FULL_V1',
  [DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1]: 'STRIPE_PRICE_DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1',
} as const satisfies Record<string, string>;

export const ALLOWED_ONE_TIME_PRODUCTS: ReadonlySet<string> = new Set([
  DTR_CORE_STATIC_V1,
  DTR_CORE_LIGHT_V1,
  DTR_CORE_FULL_V1,
  DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1,
]);

/** Saved-report checkout (/api/purchase/checkout): static legacy + light + FULL (not upgrade). */
export const DTR_CORE_SAVED_REPORT_ONE_TIME_PRODUCTS: ReadonlySet<string> = new Set([
  DTR_CORE_STATIC_V1,
  DTR_CORE_LIGHT_V1,
  DTR_CORE_FULL_V1,
]);

/**
 * Saved-report ownership / visible snapshot resolution order (highest tier first).
 * Upgrade SKU is excluded — it grants wallet delta, not a separate saved-report body.
 */
export const DTR_SAVED_REPORT_OWNERSHIP_PRODUCT_IDS = [
  DTR_CORE_FULL_V1,
  DTR_CORE_LIGHT_V1,
  DTR_CORE_STATIC_V1,
] as const;

export function isAllowedOneTimeProduct(productId: string): boolean {
  return ALLOWED_ONE_TIME_PRODUCTS.has(productId);
}

export function isDtrCoreSavedReportOneTimeProduct(productId: string): boolean {
  return DTR_CORE_SAVED_REPORT_ONE_TIME_PRODUCTS.has(productId);
}

export function isDtrCoreLightToFullUpgradeProduct(productId: string): boolean {
  return productId === DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1;
}

export function getOneTimeStripePriceEnvName(productId: string): string | undefined {
  if (!isAllowedOneTimeProduct(productId)) return undefined;
  return ONE_TIME_STRIPE_PRICE_ENV_CANDIDATES[
    productId as keyof typeof ONE_TIME_STRIPE_PRICE_ENV_CANDIDATES
  ];
}

export type ResolvedOneTimeStripePrice = {
  envKey: string | undefined;
  priceId: string | undefined;
  fallbackEnvKey?: typeof ONE_TIME_STRIPE_PRICE_ENV_CANDIDATES[typeof DTR_CORE_STATIC_V1];
};

function readTrimmedEnv(env: NodeJS.Dict<string>, key: string | undefined): string | undefined {
  if (!key) return undefined;
  const value = env[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

/**
 * Light may reuse the Production STATIC ¥1,000 price env when LIGHT is unset.
 * Full and upgrade have no STATIC equivalent — missing env stays fail-closed.
 */
export function resolveOneTimeStripePriceId(
  productId: string,
  env: NodeJS.Dict<string> = process.env,
): ResolvedOneTimeStripePrice {
  const envKey = getOneTimeStripePriceEnvName(productId);
  const primary = readTrimmedEnv(env, envKey);
  if (primary) return { envKey, priceId: primary };
  if (productId === DTR_CORE_LIGHT_V1) {
    const fallbackEnvKey = ONE_TIME_STRIPE_PRICE_ENV_CANDIDATES[DTR_CORE_STATIC_V1];
    const fallback = readTrimmedEnv(env, fallbackEnvKey);
    if (fallback) return { envKey, priceId: fallback, fallbackEnvKey };
  }
  return { envKey, priceId: undefined };
}
