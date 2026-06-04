/**
 * Reply wallet fulfillment math — Product Truth SSOT (1+4, cap 5).
 * Pure functions for app grants and RPC parity tests.
 *
 * Invariant (DB CHECK): available_count = initial_included_count + purchased_count - consumed_count
 */
import {
  computeLightToFullUpgradePurchasedDelta,
  isFullEquivalentReplyWallet,
  REPLY_TICKET_TOTAL_CAP_PER_REPORT,
} from './replyTicketCheckoutConstants';

export type ReplyWalletCounts = {
  initialIncludedCount: number;
  purchasedCount: number;
  consumedCount: number;
  availableCount: number;
};

export type PurchasedTopUpPlan = {
  skipped: boolean;
  purchasedDelta: number;
  nextPurchasedCount: number;
  nextAvailableCount: number;
  availableGrantDelta: number;
};

function normalizeNonNegativeInt(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

/**
 * Top up purchased_count toward FULL (max 4) without exceeding total cap 5.
 * Used for FULL初回 (after included 1) and ライト→FULL upgrade.
 */
export function computePurchasedTopUpToFullEquivalent(
  wallet: ReplyWalletCounts
): PurchasedTopUpPlan {
  const initial = normalizeNonNegativeInt(wallet.initialIncludedCount);
  const purchased = normalizeNonNegativeInt(wallet.purchasedCount);
  const consumed = normalizeNonNegativeInt(wallet.consumedCount);
  const available = normalizeNonNegativeInt(wallet.availableCount);

  if (isFullEquivalentReplyWallet(initial, purchased)) {
    return {
      skipped: true,
      purchasedDelta: 0,
      nextPurchasedCount: purchased,
      nextAvailableCount: available,
      availableGrantDelta: 0,
    };
  }

  const purchasedDelta = computeLightToFullUpgradePurchasedDelta(purchased);
  const nextPurchasedCount = purchased + purchasedDelta;
  const nextAvailableCount = Math.min(
    REPLY_TICKET_TOTAL_CAP_PER_REPORT,
    initial + nextPurchasedCount - consumed
  );
  const availableGrantDelta = Math.max(0, nextAvailableCount - available);

  return {
    skipped: false,
    purchasedDelta,
    nextPurchasedCount,
    nextAvailableCount,
    availableGrantDelta,
  };
}
