/**
 * M55 additional reply-ticket Checkout / Webhook Phase I — constants & types only.
 * SSOT: docs/ssot/M55_REPLY_TICKET_CHECKOUT_WEBHOOK_API_CONTRACT_DESIGN_v1.md
 * SSOT: docs/ssot/M55_REPLY_TICKET_CHECKOUT_WEBHOOK_IMPLEMENTATION_READINESS_v1.md
 *
 * Do not import this from DTR checkout or oneTimeCheckout paths; keep lanes separate.
 */

import type { WalletLedgerEventType, WalletSourceOfGrant } from './constants';

/** Saved report — light tier (¥1,000): report + 1 included consult reply. */
export const DTR_CORE_LIGHT_V1_PRODUCT_KEY = 'dtr_core_light_v1' as const;

/** Saved report — FULL tier (¥1,480): report + consult replies up to total cap 5 (1+4 wallet model). */
export const DTR_CORE_FULL_V1_PRODUCT_KEY = 'dtr_core_full_v1' as const;

/**
 * Light → FULL upgrade (¥600): grants purchased_count delta up to {@link REPLY_TICKET_FULL_MAX_PURCHASED_COUNT}.
 * Not per-ticket add-on sales.
 */
export const DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1_PRODUCT_KEY =
  'dtr_core_light_to_full_upgrade_v1' as const;

export type DtrCoreLightV1ProductKey = typeof DTR_CORE_LIGHT_V1_PRODUCT_KEY;
export type DtrCoreFullV1ProductKey = typeof DTR_CORE_FULL_V1_PRODUCT_KEY;
export type DtrCoreLightToFullUpgradeV1ProductKey =
  typeof DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1_PRODUCT_KEY;

/**
 * @legacy Stripe / app metadata: ¥500 additional reply ticket (1 checkout = +1 purchased).
 * New sales stopped in Product Truth; keep for in-flight checkout + webhook fulfillment until DB lane retires path.
 */
export const ADDITIONAL_REPLY_TICKET_PRODUCT_KEY = 'additional_reply_ticket' as const;

export type AdditionalReplyTicketProductKey = typeof ADDITIONAL_REPLY_TICKET_PRODUCT_KEY;

/** @legacy ¥500 per checkout session (legacy additional_reply_ticket lane only). */
export const LEGACY_ADDITIONAL_REPLY_TICKET_PRICE_YEN = 500 as const;

/**
 * Product keys fulfilled via {@link m55_reply_ticket_fulfill_checkout_event} (webhook reply lane).
 * DTR core light/full grants use {@link grantInitialIncludedReplyIfNeeded} on DTR fulfill path.
 */
export const REPLY_TICKET_FULFILLMENT_PRODUCT_KEYS = [
  ADDITIONAL_REPLY_TICKET_PRODUCT_KEY,
  DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1_PRODUCT_KEY,
] as const;

export type ReplyTicketFulfillmentProductKey =
  (typeof REPLY_TICKET_FULFILLMENT_PRODUCT_KEYS)[number];

export function isReplyTicketFulfillmentProductKey(productKey: string): boolean {
  const normalized = productKey.trim().toLowerCase();
  return REPLY_TICKET_FULFILLMENT_PRODUCT_KEYS.some(
    (key) => key.toLowerCase() === normalized
  );
}

/** Legacy +1 lane only (not upgrade bulk). */
export function isLegacyAdditionalReplyTicketProductKey(productKey: string): boolean {
  return productKey.trim().toLowerCase() === ADDITIONAL_REPLY_TICKET_PRODUCT_KEY;
}

export function isLightToFullUpgradeProductKey(productKey: string): boolean {
  return (
    productKey.trim().toLowerCase() === DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1_PRODUCT_KEY
  );
}

/** POST /api/reply-tickets/checkout — legacy ¥500 lane or light→FULL upgrade. */
export function isAllowedReplyTicketCheckoutProductKey(productKey: string): boolean {
  return (
    isLegacyAdditionalReplyTicketProductKey(productKey) ||
    isLightToFullUpgradeProductKey(productKey)
  );
}

/** 1 report_instance: included 1 + purchased max 4 = 5 total capability. */
export const REPLY_TICKET_TOTAL_CAP_PER_REPORT = 5 as const;

/** First included ticket per product rules. */
export const REPLY_TICKET_INCLUDED_COUNT = 1 as const;

/** Max purchased_count for FULL-equivalent wallet (light 1 + purchased 4 = 5 total capability). */
export const REPLY_TICKET_ADDITIONAL_MAX_PURCHASED = 4 as const;

/** Alias — FULL初回・ライト→FULLアップグレードの purchased_count 上限（SSOT: 1+4 方式）. */
export const REPLY_TICKET_FULL_MAX_PURCHASED_COUNT =
  REPLY_TICKET_ADDITIONAL_MAX_PURCHASED;

/**
 * FULL初回付与: initial_included_count=1 のまま purchased_count を 4 まで（合計5枠）。
 * ライト→FULLアップグレードも同じ purchased_count 上限まで差分付与。
 */
export const REPLY_TICKET_FULL_INITIAL_PURCHASED_GRANT =
  REPLY_TICKET_FULL_MAX_PURCHASED_COUNT;

/** One Stripe Checkout session grants exactly one ticket (legacy ¥500 lane only). */
export const REPLY_TICKET_PURCHASE_QUANTITY = 1 as const;

/** Upgrade checkout grants purchased delta in one fulfillment (not legacy +1 RPC quantity). */
export const REPLY_TICKET_UPGRADE_TARGET_PURCHASED_COUNT =
  REPLY_TICKET_FULL_MAX_PURCHASED_COUNT;

/**
 * purchased_count を FULL 相当（最大4）まで埋める差分。例: 2 → 2, 0 → 4, 4 → 0.
 * DB/RPC レーンで upgrade fulfillment に使用（今回は定数のみ）。
 */
export function computeLightToFullUpgradePurchasedDelta(
  currentPurchasedCount: number
): number {
  const current = Number.isFinite(currentPurchasedCount)
    ? Math.max(0, Math.floor(currentPurchasedCount))
    : 0;
  return Math.max(0, REPLY_TICKET_UPGRADE_TARGET_PURCHASED_COUNT - current);
}

/**
 * FULL 相当: upgrade CTA 非表示・legacy 単品購入 cap と同型判定。
 */
export function isFullEquivalentReplyWallet(
  initialIncludedCount: number,
  purchasedCount: number
): boolean {
  const initial = Number.isFinite(initialIncludedCount)
    ? Math.max(0, Math.floor(initialIncludedCount))
    : 0;
  const purchased = Number.isFinite(purchasedCount)
    ? Math.max(0, Math.floor(purchasedCount))
    : 0;
  return (
    purchased >= REPLY_TICKET_FULL_MAX_PURCHASED_COUNT ||
    initial + purchased >= REPLY_TICKET_TOTAL_CAP_PER_REPORT
  );
}

/** Stripe Session metadata field names (Stripe object keys are strings). */
export const REPLY_TICKET_CHECKOUT_METADATA_KEYS = {
  productKey: 'product_key',
  reportInstanceId: 'report_instance_id',
  userRefHash: 'user_ref_hash',
  userIdHash: 'user_id_hash',
  quantity: 'quantity',
} as const;

/** ledger.reply_wallet_ledgers.event_type — must stay within DB CHECK (see WALLET_LEDGER_EVENT_TYPES). */
export const REPLY_TICKET_PURCHASE_LEDGER_EVENT_TYPE: Extract<
  WalletLedgerEventType,
  'purchase_grant'
> = 'purchase_grant';

/** ledger.reply_wallet_ledgers.source_of_grant — must stay within DB CHECK (see WALLET_SOURCE_OF_GRANT_VALUES). */
export const REPLY_TICKET_PURCHASE_SOURCE_OF_GRANT: Extract<
  WalletSourceOfGrant,
  'PURCHASE'
> = 'PURCHASE';

/** POST /api/reply-tickets/checkout logical error codes (contract SSOT). */
export const REPLY_TICKET_CHECKOUT_ERROR_CODES = [
  'unauthenticated',
  'invalid_request',
  'forbidden_not_owner',
  'wallet_not_found',
  'wallet_not_active',
  'cap_reached',
  'invalid_product',
  'stripe_error',
] as const;

export type ReplyTicketCheckoutErrorCode =
  (typeof REPLY_TICKET_CHECKOUT_ERROR_CODES)[number];
