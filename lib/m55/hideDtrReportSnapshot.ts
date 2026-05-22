/**
 * Server-only: soft-hide visible DTR report snapshot (user-facing 削除).
 * Updates hide columns only — no DELETE, no envelope/profile mutation.
 */
import { getSupabaseAdmin } from '../supabaseAdmin';
import { DTR_CORE_STATIC_V1 } from '../oneTimeCheckout';
import {
  getLatestDtrReportSnapshotIncludingHidden,
  getVisibleDtrReportSnapshot,
} from './dtrDraftDb';

export const DTR_USER_HIDDEN_SOURCE_MY_PANEL = 'my_panel' as const;

/** Non-PII audit slug — no freeform user input. */
export const DTR_USER_HIDDEN_REASON_USER_DELETE = 'user_delete' as const;

const HIDE_UPDATE_KEYS = [
  'user_hidden_at',
  'user_hidden_source',
  'user_hidden_reason',
] as const;

export type HideDtrReportSnapshotErrorCode =
  | 'no_visible_snapshot'
  | 'already_hidden'
  | 'hide_failed';

export type HideDtrReportSnapshotResult =
  | { ok: true }
  | { ok: false; code: HideDtrReportSnapshotErrorCode };

export type UserHideSnapshotUpdateRow = {
  user_hidden_at: string;
  user_hidden_source: typeof DTR_USER_HIDDEN_SOURCE_MY_PANEL;
  user_hidden_reason: typeof DTR_USER_HIDDEN_REASON_USER_DELETE;
};

/** Columns allowed on hide UPDATE (tests + SSOT guard). */
export function buildUserHideSnapshotUpdateRow(now: Date = new Date()): UserHideSnapshotUpdateRow {
  return {
    user_hidden_at: now.toISOString(),
    user_hidden_source: DTR_USER_HIDDEN_SOURCE_MY_PANEL,
    user_hidden_reason: DTR_USER_HIDDEN_REASON_USER_DELETE,
  };
}

export function isAllowedHideUpdatePayload(payload: Record<string, unknown>): boolean {
  const keys = Object.keys(payload);
  if (keys.length !== HIDE_UPDATE_KEYS.length) return false;
  return keys.every((k) => (HIDE_UPDATE_KEYS as readonly string[]).includes(k));
}

/**
 * Soft-hide the current visible snapshot for the user/product.
 * Hidden-only state returns `already_hidden` without a second UPDATE.
 */
export async function hideVisibleDtrReportSnapshotForUser(
  userId: string,
  productId: string = DTR_CORE_STATIC_V1,
): Promise<HideDtrReportSnapshotResult> {
  const visible = await getVisibleDtrReportSnapshot(userId, productId);
  if (!visible) {
    const latest = await getLatestDtrReportSnapshotIncludingHidden(userId, productId);
    if (latest) {
      return { ok: false, code: 'already_hidden' };
    }
    return { ok: false, code: 'no_visible_snapshot' };
  }

  const patch = buildUserHideSnapshotUpdateRow();
  if (!isAllowedHideUpdatePayload(patch)) {
    return { ok: false, code: 'hide_failed' };
  }

  try {
    const db = getSupabaseAdmin() as any;
    const { data, error } = await db
      .from('dtr_report_snapshots')
      .update(patch)
      .eq('id', visible.reportInstanceId)
      .eq('user_id', userId)
      .eq('product_id', productId)
      .is('user_hidden_at', null)
      .select('id')
      .maybeSingle();

    if (error) {
      const e = error as { code?: string; message?: string };
      console.error(
        '[hideDtrReportSnapshot] update failed',
        JSON.stringify({ code: e.code ?? null, message: e.message ?? null }),
      );
      return { ok: false, code: 'hide_failed' };
    }

    if (!data) {
      return { ok: false, code: 'already_hidden' };
    }

    return { ok: true };
  } catch (e) {
    console.error('[hideDtrReportSnapshot] unexpected', String(e));
    return { ok: false, code: 'hide_failed' };
  }
}
