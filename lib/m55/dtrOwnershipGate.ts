/**
 * Layer1 ownership gate for DTR reader (M55_ENTITLEMENT_KEY_NORMALIZATION + BINDING_ROLLOUT Step 5).
 * Server-side only. Never call from client.
 *
 * SSOT: Database (`entitlement_rights` + `entitlements`). If Stripe wrote `entitlements` but
 * `entitlement_rights` was missing (partial failure), we repair the right row on read so all
 * routes match webhook + success-sync behavior.
 *
 * Rules:
 * - dtr_unlock_state: 'locked' | 'owned' | 'expired'
 * - mismatch / unknown -> fail-closed (redirect to LP for gated routes)
 */
import { getSupabaseAdmin } from '../supabaseAdmin';
import { DTR_CORE_STATIC_V1 } from '../oneTimeCheckout';
import { DTR_CORE_RIGHT_KEY } from './dtrCoreCheckoutFulfillment';

export type DtrUnlockState = 'owned' | 'locked' | 'expired';

export type DtrOwnershipResult =
  | { unlockState: 'owned'; ownershipType: 'static'; aiConsultIncluded: true; expiresAt: null }
  | { unlockState: 'locked' }
  | { unlockState: 'expired' };

/**
 * Resolves ownership for the static Entry Report (product DTR_CORE_STATIC_V1 / right m55_p:core_origin).
 * Fail-closed: any error returns 'locked'.
 */
export async function resolveEntryReportOwnership(userId: string): Promise<DtrOwnershipResult> {
  try {
    const db = getSupabaseAdmin();

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
      if (exp !== null && exp < Date.now()) return { unlockState: 'expired' };
      return {
        unlockState: 'owned',
        ownershipType: 'static',
        aiConsultIncluded: true,
        expiresAt: null,
      };
    }

    const { data: entRow, error: entErr } = await db
      .from('entitlements')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', DTR_CORE_STATIC_V1)
      .eq('status', 'active')
      .maybeSingle() as unknown as { data: { id: string } | null; error: unknown };

    if (!entErr && entRow) {
      const { error: repairErr } = await (db as any).from('entitlement_rights').upsert(
        { user_id: userId, right_key: DTR_CORE_RIGHT_KEY, right_value: '1' },
        { onConflict: 'user_id,right_key' }
      );
      if (repairErr) {
        console.error('[dtrOwnershipGate] entitlement_rights repair failed', repairErr);
      }
      return {
        unlockState: 'owned',
        ownershipType: 'static',
        aiConsultIncluded: true,
        expiresAt: null,
      };
    }

    return { unlockState: 'locked' };
  } catch (e) {
    console.error('[dtrOwnershipGate] resolve failed', e);
    return { unlockState: 'locked' };
  }
}
