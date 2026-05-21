/**
 * Server-only: dtr_guest_drafts + dtr_report_snapshots (Supabase admin).
 */
import { getSupabaseAdmin } from '../supabaseAdmin';
import { DTR_CORE_STATIC_V1 } from '../oneTimeCheckout';
import { buildV2FulfillmentSnapshot } from './compositeStem/buildV2FulfillmentSnapshot';
import { isCompositeV2FulfillmentWriteEnabled } from './compositeStem/featureFlag';
import {
  resolveFulfillmentProfileFields,
} from './compositeStem/parseFulfillmentMetadata';
import { M55CompositeStemError } from './compositeStem/types';
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

/** Immutable snapshot row; `reportInstanceId` === `dtr_report_snapshots.id` (canonical report instance key). */
export type DtrReportSnapshotRow = {
  reportInstanceId: string;
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
      .select('id,user_id,product_id,checkout_session_id,profile_snapshot,draft_snapshot,envelope_json')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle();
    if (error || !data) return null;
    const idRaw = data.id as unknown;
    if (idRaw == null || (typeof idRaw !== 'string' && typeof idRaw !== 'number')) return null;
    return {
      reportInstanceId: String(idRaw),
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

export type UpsertDtrReportSnapshotAtFulfillmentResult =
  | { ok: true; snapshotId: string }
  | { ok: false; reason: string };

/**
 * Build immutable snapshot at fulfillment. INSERT-only for new rows; existing rows are not updated.
 * v2 columns written only when M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED=true and pipeline succeeds.
 */
export async function upsertDtrReportSnapshotAtFulfillment(params: {
  userId: string;
  productId: string;
  checkoutSessionId: string;
  sessionMetadata: Record<string, string> | null | undefined;
}): Promise<UpsertDtrReportSnapshotAtFulfillmentResult> {
  const existing = await getDtrReportSnapshot(params.userId, params.productId);
  if (existing) {
    return { ok: true, snapshotId: existing.reportInstanceId };
  }

  const draft = await getLatestDraftForUser(params.userId);
  const fields = resolveFulfillmentProfileFields(params.sessionMetadata, draft);
  if (!fields) {
    return { ok: false, reason: 'missing_profile_for_snapshot' };
  }

  const draftSnapshot = draft
    ? {
        draft_id: draft.id,
        nickname: draft.nickname,
        birth_date: draft.birth_date,
        extra_json: draft.extra_json ?? {},
      }
    : null;

  let profile_snapshot: Record<string, unknown>;
  let envelope: DtrEnvelope;
  let engine_context_json: Record<string, unknown> | undefined;
  let engine_version: string | undefined;

  if (isCompositeV2FulfillmentWriteEnabled()) {
    try {
      const v2 = buildV2FulfillmentSnapshot(params.sessionMetadata, draft);
      profile_snapshot = v2.profile_snapshot;
      envelope = v2.envelope_json;
      engine_context_json = v2.engine_context_json;
      engine_version = v2.engine_version;
    } catch (e) {
      const code = e instanceof M55CompositeStemError ? e.code : 'composite_v2_build_failed';
      return { ok: false, reason: code };
    }
  } else {
    const input: DtrCanonicalInput = {
      birthDate: fields.birthDate,
      nickname: fields.nickname,
      locale: 'ja-JP',
      contextScope: 'dtr',
    };
    try {
      envelope = runDtrEngine(input);
    } catch (e) {
      return { ok: false, reason: String(e) };
    }
    profile_snapshot = { nickname: fields.nickname, birthDate: fields.birthDate };
  }

  const insertRow: Record<string, unknown> = {
    user_id: params.userId,
    product_id: params.productId,
    checkout_session_id: params.checkoutSessionId,
    profile_snapshot,
    draft_snapshot: draftSnapshot,
    envelope_json: envelope as unknown as Record<string, unknown>,
  };
  if (engine_context_json != null && engine_version != null) {
    insertRow.engine_context_json = engine_context_json;
    insertRow.engine_version = engine_version;
  }

  try {
    const db = getSupabaseAdmin() as any;
    const { data: insertData, error } = await db
      .from('dtr_report_snapshots')
      .insert(insertRow)
      .select('id')
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        const reread = await getDtrReportSnapshot(params.userId, params.productId);
        if (reread) return { ok: true, snapshotId: reread.reportInstanceId };
      }
      const e = error as { code?: string; message?: string; details?: string; hint?: string };
      const reason = [e.code, e.message, e.details, e.hint].filter(Boolean).join(' | ');
      console.error('[dtrDraftDb] dtr_report_snapshots insert failed', JSON.stringify({ code: e.code, message: e.message }));
      return { ok: false, reason: reason || String(error) };
    }

    let snapshotId: string | undefined =
      insertData?.id != null ? String((insertData as { id: unknown }).id) : undefined;
    if (!snapshotId) {
      const reread = await getDtrReportSnapshot(params.userId, params.productId);
      snapshotId = reread?.reportInstanceId;
    }
    if (!snapshotId) {
      console.error('[dtrDraftDb] dtr_report_snapshots insert succeeded but snapshot id unavailable');
      return { ok: false, reason: 'snapshot_id_missing_after_insert' };
    }

    return { ok: true, snapshotId };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}
