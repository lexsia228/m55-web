/**
 * Server-only: dtr_guest_drafts + dtr_report_snapshots (Supabase admin).
 */
import { getSupabaseAdmin } from '../supabaseAdmin';
import { DTR_CORE_STATIC_V1 } from '../oneTimeCheckout';
import { runDtrEngine, type DtrCanonicalInput, type DtrEnvelope } from './dtrEngine';

export type GuestDraftRow = {
  id: string;
  nickname: string;
  birth_date: string;
  extra_json: Record<string, unknown> | null;
  user_id: string | null;
  linked_at: string | null;
  updated_at: string;
};

/** Latest draft row for this Clerk user (after guest promote or logged-in sync). */
export async function getLatestDraftForUser(userId: string): Promise<GuestDraftRow | null> {
  try {
    const db = getSupabaseAdmin() as any;
    const { data, error } = await db
      .from('dtr_guest_drafts')
      .select('id,nickname,birth_date,extra_json,user_id,linked_at,updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return data as GuestDraftRow;
  } catch {
    return null;
  }
}

export type DtrReportSnapshotRow = {
  user_id: string;
  product_id: string;
  checkout_session_id: string | null;
  profile_snapshot: { nickname: string; birthDate: string };
  draft_snapshot: Record<string, unknown> | null;
  envelope_json: DtrEnvelope;
};

export async function getDtrReportSnapshot(
  userId: string,
  productId: string = DTR_CORE_STATIC_V1
): Promise<DtrReportSnapshotRow | null> {
  try {
    const db = getSupabaseAdmin() as any;
    const { data, error } = await db
      .from('dtr_report_snapshots')
      .select('user_id,product_id,checkout_session_id,profile_snapshot,draft_snapshot,envelope_json')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      user_id: data.user_id,
      product_id: data.product_id,
      checkout_session_id: data.checkout_session_id ?? null,
      profile_snapshot: data.profile_snapshot as { nickname: string; birthDate: string },
      draft_snapshot: (data.draft_snapshot as Record<string, unknown> | null) ?? null,
      envelope_json: data.envelope_json as DtrEnvelope,
    };
  } catch {
    return null;
  }
}

/**
 * Build immutable snapshot at fulfillment. Idempotent upsert on (user_id, product_id).
 */
export async function upsertDtrReportSnapshotAtFulfillment(params: {
  userId: string;
  productId: string;
  checkoutSessionId: string;
  sessionMetadata: Record<string, string> | null | undefined;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const meta = params.sessionMetadata ?? {};
  let nickname = (meta.profileNickname as string | undefined)?.trim() ?? '';
  let birthDate = (meta.profileBirthDate as string | undefined)?.trim() ?? '';

  const draft = await getLatestDraftForUser(params.userId);
  if (draft?.nickname && draft.birth_date) {
    nickname = draft.nickname.trim();
    birthDate = String(draft.birth_date).slice(0, 10);
  }

  if (!birthDate || !nickname) {
    return { ok: false, reason: 'missing_profile_for_snapshot' };
  }

  const input: DtrCanonicalInput = {
    birthDate,
    nickname,
    locale: 'ja-JP',
    contextScope: 'dtr',
  };

  let envelope: DtrEnvelope;
  try {
    envelope = runDtrEngine(input);
  } catch (e) {
    return { ok: false, reason: String(e) };
  }

  const draftSnapshot = draft
    ? {
        draft_id: draft.id,
        nickname: draft.nickname,
        birth_date: draft.birth_date,
        extra_json: draft.extra_json ?? {},
      }
    : null;

  try {
    const db = getSupabaseAdmin() as any;
    const { error } = await db.from('dtr_report_snapshots').upsert(
      {
        user_id: params.userId,
        product_id: params.productId,
        checkout_session_id: params.checkoutSessionId,
        profile_snapshot: { nickname, birthDate },
        draft_snapshot: draftSnapshot,
        envelope_json: envelope as unknown as Record<string, unknown>,
      },
      { onConflict: 'user_id,product_id' }
    );
    if (error) {
      return { ok: false, reason: String(error.message ?? error) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}
