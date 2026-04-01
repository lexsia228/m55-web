/**
 * Layer1 ownership gate for DTR reader (M55_ENTITLEMENT_KEY_NORMALIZATION + BINDING_ROLLOUT Step 5).
 * Server-side only. Never call from client.
 *
 * Rules:
 * - dtr_unlock_state enum: 'locked' | 'owned' | 'expired'
 * - fullSections visible only when dtr_unlock_state = 'owned'
 * - mismatch / unknown state -> fail (redirect to LP, not to error page)
 * - no unlock logic guessing
 */
import { getSupabaseAdmin } from '../supabaseAdmin';

export type DtrUnlockState = 'owned' | 'locked' | 'expired';

export type DtrOwnershipResult =
  | { unlockState: 'owned'; ownershipType: 'static'; aiConsultIncluded: true; expiresAt: null }
  | { unlockState: 'locked' }
  | { unlockState: 'expired' };

const ENTRY_REPORT_RIGHT_KEY = 'm55_p:core_origin';

/**
 * Resolves ownership state for the static Entry Report (m55_p:core_origin).
 * Fail-closed: any error returns 'locked'.
 */
export async function resolveEntryReportOwnership(userId: string): Promise<DtrOwnershipResult> {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('entitlement_rights')
      .select('right_key, expires_at')
      .eq('user_id', userId)
      .eq('right_key', ENTRY_REPORT_RIGHT_KEY)
      .maybeSingle() as unknown as { data: { right_key: string; expires_at: string | null } | null; error: unknown };

    if (error || !data) return { unlockState: 'locked' };

    const exp = data.expires_at ? new Date(data.expires_at).getTime() : null;
    if (exp !== null && exp < Date.now()) return { unlockState: 'expired' };

    return {
      unlockState: 'owned',
      ownershipType: 'static',
      aiConsultIncluded: true,
      expiresAt: null,
    };
  } catch {
    return { unlockState: 'locked' };
  }
}
