/**
 * M55 additional reply-ticket Checkout / Webhook Phase I — constants & types only.
 * SSOT: docs/ssot/M55_REPLY_TICKET_CHECKOUT_WEBHOOK_API_CONTRACT_DESIGN_v1.md
 * SSOT: docs/ssot/M55_REPLY_TICKET_CHECKOUT_WEBHOOK_IMPLEMENTATION_READINESS_v1.md
 *
 * Do not import this from DTR checkout or oneTimeCheckout paths; keep lanes separate.
 */

import type { WalletLedgerEventType, WalletSourceOfGrant } from './constants';

/** Stripe / app metadata: product_key value for additional reply ticket SKU (1 checkout = 1 ticket). */
export const ADDITIONAL_REPLY_TICKET_PRODUCT_KEY = 'additional_reply_ticket' as const;

export type AdditionalReplyTicketProductKey = typeof ADDITIONAL_REPLY_TICKET_PRODUCT_KEY;

/** 1 report_instance: included 1 + purchased max 4 = 5 total capability. */
export const REPLY_TICKET_TOTAL_CAP_PER_REPORT = 5 as const;

/** First included ticket per product rules. */
export const REPLY_TICKET_INCLUDED_COUNT = 1 as const;

/** Max additional purchases (not including the included ticket). */
export const REPLY_TICKET_ADDITIONAL_MAX_PURCHASED = 4 as const;

/** One Stripe Checkout session grants exactly one ticket. */
export const REPLY_TICKET_PURCHASE_QUANTITY = 1 as const;

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
