/**
 * DTR core checkout snapshot gate — visible blocks; hidden-only enables repurchase lane.
 * Server-only. No Stripe calls.
 */
import { DTR_CORE_STATIC_V1 } from '../oneTimeCheckout';
import {
  getLatestDtrReportSnapshotIncludingHidden,
  getVisibleDtrReportSnapshot,
  type DtrReportSnapshotRow,
} from './dtrDraftDb';

export type DtrCoreCheckoutSnapshotGateResult =
  | { action: 'block_already_purchased' }
  | { action: 'allow'; repurchaseLane: boolean };

export type DtrCheckoutSnapshotReaders = {
  getVisible: (userId: string, productId: string) => Promise<DtrReportSnapshotRow | null>;
  getLatestIncludingHidden: (userId: string, productId: string) => Promise<DtrReportSnapshotRow | null>;
};

const defaultReaders: DtrCheckoutSnapshotReaders = {
  getVisible: getVisibleDtrReportSnapshot,
  getLatestIncludingHidden: getLatestDtrReportSnapshotIncludingHidden,
};

/**
 * Resolves whether checkout must block on an existing saved report.
 * - Visible snapshot → block (already_purchased).
 * - Hidden-only rows → allow checkout (repurchase lane); entitlement alone must not block.
 * - No rows → allow; fulfillment_pending rules apply separately when owned without snapshot.
 */
export async function resolveDtrCoreCheckoutSnapshotGate(
  userId: string,
  readers: DtrCheckoutSnapshotReaders = defaultReaders,
  productId: string = DTR_CORE_STATIC_V1,
): Promise<DtrCoreCheckoutSnapshotGateResult> {
  const visible = await readers.getVisible(userId, productId);
  if (visible) {
    return { action: 'block_already_purchased' };
  }
  const latestIncludingHidden = await readers.getLatestIncludingHidden(userId, productId);
  return {
    action: 'allow',
    repurchaseLane: latestIncludingHidden != null,
  };
}
