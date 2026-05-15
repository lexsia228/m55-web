/** SSOT: M55_REPLY_DATA_MODEL_AND_DB_CONTRACT_v1, M55_REPLY_JSON_SCHEMA_v1 */

export const REPLY_SCHEMA_VERSION = '1.1' as const;

export const REPLY_SESSION_STATUSES = [
  'accepted',
  'generating',
  'succeeded',
  'failed',
  'cancelled',
] as const;

export type ReplySessionStatus = (typeof REPLY_SESSION_STATUSES)[number];

export const REPLY_WALLET_STATUSES = ['active', 'suspended', 'closed'] as const;

export type ReplyTicketWalletStatus = (typeof REPLY_WALLET_STATUSES)[number];

export const WALLET_LEDGER_EVENT_TYPES = [
  'included_grant',
  'purchase_grant',
  'reply_consume',
  'recovery_adjust',
  'admin_adjust',
] as const;

export type WalletLedgerEventType = (typeof WALLET_LEDGER_EVENT_TYPES)[number];

export const WALLET_SOURCE_OF_GRANT_VALUES = [
  'PURCHASE',
  'INCLUDED',
  'RECOVERY',
  'ADMIN_ADJUST',
] as const;

export type WalletSourceOfGrant = (typeof WALLET_SOURCE_OF_GRANT_VALUES)[number];
