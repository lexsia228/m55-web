/**
 * One-time checkout lane constants.
 * Webhook と success page で共有。subscription lane は対象外。
 *
 * Checkout route 分岐・Stripe env 実装は別ゲート。ここは許可 SKU と env 名候補の土台のみ。
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

/** 次ゲート以降で checkout / webhook が参照する Stripe Price env 名候補（未設定・未実装） */
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
