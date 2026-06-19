/**
 * Saved-report tier summary — light / FULL / legacy static (server-only).
 * Upgrade SKU is not an ownership body; used only for canUpgradeFromLight gating.
 */
import {
  DTR_CORE_FULL_V1,
  DTR_CORE_LIGHT_V1,
  DTR_CORE_STATIC_V1,
} from '../oneTimeCheckout';
import { getSupabaseAdmin } from '../supabaseAdmin';
import { getVisibleDtrReportSnapshot } from './dtrDraftDb';
import { hasSavedReportPaymentBacking } from './dtrSavedReportOwnership';

export type SavedReportTierSummary = {
  hasLight: boolean;
  hasFull: boolean;
  hasLegacyStatic: boolean;
  canUpgradeFromLight: boolean;
  reportInstanceId: string | null;
};

export function deriveSavedReportTierSummary(params: {
  lightBacked: boolean;
  fullBacked: boolean;
  legacyStaticBacked: boolean;
  hasPaymentBacking: boolean;
  lightSnapshotReportInstanceId: string | null;
}): SavedReportTierSummary {
  const hasLight = params.lightBacked;
  const hasFull = params.fullBacked;
  const hasLegacyStatic =
    params.legacyStaticBacked && !hasLight && !hasFull;
  const canUpgradeFromLight =
    hasLight &&
    !hasFull &&
    params.hasPaymentBacking &&
    params.lightSnapshotReportInstanceId != null;

  return {
    hasLight,
    hasFull,
    hasLegacyStatic,
    canUpgradeFromLight,
    reportInstanceId: canUpgradeFromLight
      ? params.lightSnapshotReportInstanceId
      : null,
  };
}

async function hasActiveProductBacking(
  db: any,
  userId: string,
  productId: string,
): Promise<boolean> {
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
  return !otfErr && !!otfRow;
}

export async function resolveSavedReportTierSummary(
  userId: string,
): Promise<SavedReportTierSummary> {
  try {
    const db = getSupabaseAdmin();
    const [
      lightBacked,
      fullBacked,
      legacyStaticBacked,
      hasPaymentBacking,
      lightSnap,
    ] = await Promise.all([
      hasActiveProductBacking(db, userId, DTR_CORE_LIGHT_V1),
      hasActiveProductBacking(db, userId, DTR_CORE_FULL_V1),
      hasActiveProductBacking(db, userId, DTR_CORE_STATIC_V1),
      hasSavedReportPaymentBacking(db, userId),
      getVisibleDtrReportSnapshot(userId, DTR_CORE_LIGHT_V1),
    ]);

    return deriveSavedReportTierSummary({
      lightBacked,
      fullBacked,
      legacyStaticBacked,
      hasPaymentBacking,
      lightSnapshotReportInstanceId: lightSnap?.reportInstanceId ?? null,
    });
  } catch {
    return {
      hasLight: false,
      hasFull: false,
      hasLegacyStatic: false,
      canUpgradeFromLight: false,
      reportInstanceId: null,
    };
  }
}
