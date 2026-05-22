/**
 * Layer1 ownership gate for DTR reader (M55_ENTITLEMENT_KEY_NORMALIZATION + BINDING_ROLLOUT Step 5).
 * Server-side only. Never call from client.
 *
 * SSOT: `dtr_report_snapshots`（保存版）または Stripe 決済完了に裏打ちされた entitlements / one_time_fulfillments。
 * entitlement_rights 単独（手動・残骸・不整合）は owned にしない。
 * If Stripe wrote `entitlements` but `entitlement_rights` was missing (partial failure), we repair the right row on read.
 *
 * Rules:
 * - dtr_unlock_state: 'locked' | 'owned' | 'expired'
 * - mismatch / unknown -> fail-closed (redirect to LP for gated routes)
 */
import { getSupabaseAdmin } from '../supabaseAdmin';
import { DTR_CORE_STATIC_V1 } from '../oneTimeCheckout';
import { DTR_CORE_RIGHT_KEY } from './dtrCoreCheckoutFulfillment';
import { getVisibleDtrReportSnapshot } from './dtrDraftDb';

export type DtrUnlockState = 'owned' | 'locked' | 'expired';

export type DtrOwnershipResult =
  | {
      unlockState: 'owned';
      ownershipType: 'static';
      aiConsultIncluded: true;
      expiresAt: null;
      /** Present when ownership is backed by `dtr_report_snapshots`; equals `reportInstanceId` from snapshot row. */
      reportInstanceId?: string;
    }
  | { unlockState: 'locked' }
  | { unlockState: 'expired' };

/**
 * Resolves ownership for the static Entry Report (product DTR_CORE_STATIC_V1 / right m55_p:core_origin).
 * Fail-closed: any error returns 'locked'.
 */
export async function resolveEntryReportOwnership(userId: string): Promise<DtrOwnershipResult> {
  try {
    const db = getSupabaseAdmin();

    const snapRow = await getVisibleDtrReportSnapshot(userId, DTR_CORE_STATIC_V1);
    if (snapRow) {
      console.info(
        '[dtrOwnershipGate]',
        JSON.stringify({
          userId,
          unlockState: 'owned',
          grantSource: 'dtr_report_snapshots',
          grantDetail: '保存版レポート行あり（購入フロー完了）',
          productId: DTR_CORE_STATIC_V1,
        })
      );
      return {
        unlockState: 'owned',
        ownershipType: 'static',
        aiConsultIncluded: true,
        expiresAt: null,
        reportInstanceId: snapRow.reportInstanceId,
      };
    }

    const { data: rightRow, error: rightErr } = await db
      .from('entitlement_rights')
      .select('right_key, expires_at')
      .eq('user_id', userId)
      .eq('right_key', DTR_CORE_RIGHT_KEY)
      .maybeSingle() as unknown as {
      data: { right_key: string; expires_at: string | null } | null;
      error: unknown;
    };

    if (!rightErr && rightRow) {
      const exp = rightRow.expires_at ? new Date(rightRow.expires_at).getTime() : null;
      if (exp !== null && exp < Date.now()) {
        console.info(
          '[dtrOwnershipGate]',
          JSON.stringify({
            userId,
            unlockState: 'expired',
            basis: 'entitlement_rights_row',
            table: 'entitlement_rights',
            rightKey: DTR_CORE_RIGHT_KEY,
            expiresAt: rightRow.expires_at,
          })
        );
        return { unlockState: 'expired' };
      }

      const { data: entForRights } = await db
        .from('entitlements')
        .select('id, product_id, status')
        .eq('user_id', userId)
        .eq('product_id', DTR_CORE_STATIC_V1)
        .eq('status', 'active')
        .maybeSingle();

      const { data: otfForRights } = await db
        .from('one_time_fulfillments')
        .select('checkout_session_id')
        .eq('user_id', userId)
        .eq('product_id', DTR_CORE_STATIC_V1)
        .order('fulfilled_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const hasPaymentBacking = !!(entForRights ?? otfForRights);

      if (hasPaymentBacking) {
        console.info(
          '[dtrOwnershipGate]',
          JSON.stringify({
            userId,
            unlockState: 'owned',
            grantSource: 'entitlement_rights_plus_payment_backing',
            grantDetail:
              'entitlement_rights に行があり、かつ entitlements(active) または one_time_fulfillments がある（Stripe 決済完了後の通常状態）',
            hasEntitlementsRow: !!entForRights,
            hasOneTimeFulfillmentRow: !!otfForRights,
            rightKey: rightRow.right_key,
            expiresAt: rightRow.expires_at,
          })
        );
        return {
          unlockState: 'owned',
          ownershipType: 'static',
          aiConsultIncluded: true,
          expiresAt: null,
        };
      }

      console.warn(
        '[dtrOwnershipGate]',
        JSON.stringify({
          userId,
          unlockState: 'locked',
          grantSourceRejected: 'entitlement_rights_orphan',
          grantDetail:
            'entitlement_rights のみで entitlements / one_time_fulfillments が無い。手動投入・テスト残骸・削除不整合の可能性。正規の付与は fulfillDtrCoreFromCheckoutSessionId または Stripe webhook（checkout.session.completed）経由のみ。',
        })
      );
      return { unlockState: 'locked' };
    }

    const { data: entRow, error: entErr } = await db
      .from('entitlements')
      .select('id, product_id, status')
      .eq('user_id', userId)
      .eq('product_id', DTR_CORE_STATIC_V1)
      .eq('status', 'active')
      .maybeSingle() as unknown as {
      data: { id: string; product_id: string; status: string } | null;
      error: unknown;
    };

    if (!entErr && entRow) {
      const { error: repairErr } = await (db as any).from('entitlement_rights').upsert(
        { user_id: userId, right_key: DTR_CORE_RIGHT_KEY, right_value: '1' },
        { onConflict: 'user_id,right_key' }
      );
      if (repairErr) {
        console.error('[dtrOwnershipGate] entitlement_rights repair failed', repairErr);
      }
      console.info(
        '[dtrOwnershipGate]',
        JSON.stringify({
          userId,
          unlockState: 'owned',
          grantSource: 'entitlements_active_repair_entitlement_rights',
          grantDetail:
            'entitlements に product_id=DTR_CORE_STATIC_V1 かつ status=active の行があり、entitlement_rights を repair したため owned（Webhook/processing の片側失敗時の補修）',
          table: 'entitlements',
          entitlementId: entRow.id,
          productId: entRow.product_id,
          status: entRow.status,
        })
      );
      return {
        unlockState: 'owned',
        ownershipType: 'static',
        aiConsultIncluded: true,
        expiresAt: null,
      };
    }

    console.info(
      '[dtrOwnershipGate]',
      JSON.stringify({
        userId,
        unlockState: 'locked',
        basis: 'no_row',
        entitlementRightsError: rightErr ? String((rightErr as { message?: string }).message ?? rightErr) : null,
        entitlementsError: entErr ? String((entErr as { message?: string }).message ?? entErr) : null,
      })
    );
    return { unlockState: 'locked' };
  } catch (e) {
    console.error('[dtrOwnershipGate] resolve failed', e);
    return { unlockState: 'locked' };
  }
}
