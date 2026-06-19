/**
 * Saved-report ownership helpers — light / FULL / legacy static SKU mapping (server-only).
 */
import {
  DTR_SAVED_REPORT_OWNERSHIP_PRODUCT_IDS,
  isDtrCoreSavedReportOneTimeProduct,
} from '../oneTimeCheckout';
import {
  getLatestDtrReportSnapshotIncludingHidden,
  getVisibleDtrReportSnapshot,
  type DtrReportSnapshotRow,
} from './dtrDraftDb';

export { DTR_SAVED_REPORT_OWNERSHIP_PRODUCT_IDS };

export function isDtrSavedReportOwnershipProductId(productId: string): boolean {
  return isDtrCoreSavedReportOneTimeProduct(productId);
}

/** Latest visible snapshot across FULL → light → legacy static. */
export async function getVisibleSavedReportSnapshot(
  userId: string,
): Promise<DtrReportSnapshotRow | null> {
  for (const productId of DTR_SAVED_REPORT_OWNERSHIP_PRODUCT_IDS) {
    const snap = await getVisibleDtrReportSnapshot(userId, productId);
    if (snap) return snap;
  }
  return null;
}

/** Owned with no visible row on any saved-report SKU (soft-hide repurchase path). */
export async function hasHiddenOnlySavedReportSnapshot(userId: string): Promise<boolean> {
  if (await getVisibleSavedReportSnapshot(userId)) return false;
  for (const productId of DTR_SAVED_REPORT_OWNERSHIP_PRODUCT_IDS) {
    const hidden = await getLatestDtrReportSnapshotIncludingHidden(userId, productId);
    if (hidden) return true;
  }
  return false;
}

export async function hasSavedReportPaymentBacking(
  db: any,
  userId: string,
): Promise<boolean> {
  for (const productId of DTR_SAVED_REPORT_OWNERSHIP_PRODUCT_IDS) {
    const { data: entRow, error: entErr } = await db
      .from('entitlements')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .eq('status', 'active')
      .maybeSingle();
    if (!entErr && entRow) return true;

    const { data: otfRow, error: otfErr } = await db
      .from('one_time_fulfillments')
      .select('checkout_session_id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .order('fulfilled_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!otfErr && otfRow) return true;
  }
  return false;
}

export async function findActiveSavedReportEntitlement(
  db: any,
  userId: string,
): Promise<{ id: string; product_id: string; status: string } | null> {
  for (const productId of DTR_SAVED_REPORT_OWNERSHIP_PRODUCT_IDS) {
    const { data: entRow, error: entErr } = await db
      .from('entitlements')
      .select('id, product_id, status')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .eq('status', 'active')
      .maybeSingle();
    if (!entErr && entRow) {
      return entRow as { id: string; product_id: string; status: string };
    }
  }
  return null;
}
