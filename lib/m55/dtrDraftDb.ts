/**
 * Server-only: dtr_guest_drafts + dtr_report_snapshots (Supabase admin).
 */
import { getSupabaseAdmin } from '../supabaseAdmin';
import { DTR_CORE_STATIC_V1 } from '../oneTimeCheckout';
import { buildV2FulfillmentSnapshot } from './compositeStem/buildV2FulfillmentSnapshot';
import {
  resolveFulfillmentProfileFields,
} from './compositeStem/parseFulfillmentMetadata';
import type { EngineContextJson } from './compositeStem/buildV2FulfillmentSnapshot';
import { M55CompositeStemError } from './compositeStem/types';
import type { DtrEnvelope } from './dtrEngine';

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
  engine_version: string | null;
  engine_context_json: EngineContextJson | Record<string, unknown> | null;
};

const DTR_REPORT_SNAPSHOT_SELECT =
  'id,user_id,product_id,checkout_session_id,profile_snapshot,draft_snapshot,envelope_json,engine_version,engine_context_json';

function mapDtrReportSnapshotRow(data: Record<string, unknown>): DtrReportSnapshotRow | null {
  const idRaw = data.id as unknown;
  if (idRaw == null || (typeof idRaw !== 'string' && typeof idRaw !== 'number')) return null;
  return {
    reportInstanceId: String(idRaw),
    user_id: data.user_id as string,
    product_id: data.product_id as string,
    checkout_session_id: (data.checkout_session_id as string | null) ?? null,
    profile_snapshot: data.profile_snapshot as { nickname: string; birthDate: string },
    draft_snapshot: (data.draft_snapshot as Record<string, unknown> | null) ?? null,
    envelope_json: data.envelope_json as DtrEnvelope,
    engine_version: (data.engine_version as string | null) ?? null,
    engine_context_json:
      (data.engine_context_json as EngineContextJson | Record<string, unknown> | null) ?? null,
  };
}

type FetchDtrReportSnapshotOptions = {
  /** When true, only rows with `user_hidden_at IS NULL` (normal UI / ownership display). */
  visibleOnly: boolean;
};

async function fetchDtrReportSnapshotRow(
  userId: string,
  productId: string,
  options: FetchDtrReportSnapshotOptions,
): Promise<DtrReportSnapshotRow | null> {
  try {
    const db = getSupabaseAdmin() as any;
    let query = db
      .from('dtr_report_snapshots')
      .select(DTR_REPORT_SNAPSHOT_SELECT)
      .eq('user_id', userId)
      .eq('product_id', productId);
    if (options.visibleOnly) {
      query = query.is('user_hidden_at', null);
    }
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return mapDtrReportSnapshotRow(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

/**
 * Latest visible snapshot for user-facing read paths (`user_hidden_at IS NULL`).
 */
export async function getVisibleDtrReportSnapshot(
  userId: string,
  productId: string = DTR_CORE_STATIC_V1,
): Promise<DtrReportSnapshotRow | null> {
  return fetchDtrReportSnapshotRow(userId, productId, { visibleOnly: true });
}

/**
 * Visible snapshot for a specific report instance owned by the user (SELECT-only).
 * Used by Lane A consult context — must match wallet `report_instance_id`.
 */
export async function getVisibleDtrReportSnapshotByInstanceId(
  userId: string,
  reportInstanceId: string,
): Promise<DtrReportSnapshotRow | null> {
  try {
    const db = getSupabaseAdmin() as any;
    const { data, error } = await db
      .from('dtr_report_snapshots')
      .select(DTR_REPORT_SNAPSHOT_SELECT)
      .eq('id', reportInstanceId)
      .eq('user_id', userId)
      .is('user_hidden_at', null)
      .maybeSingle();
    if (error || !data) return null;
    return mapDtrReportSnapshotRow(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

/**
 * Latest snapshot row regardless of hide state (checkout block + fulfillment dedupe only).
 * Not for UI envelope display — use {@link getVisibleDtrReportSnapshot}.
 */
export async function getLatestDtrReportSnapshotIncludingHidden(
  userId: string,
  productId: string = DTR_CORE_STATIC_V1,
): Promise<DtrReportSnapshotRow | null> {
  return fetchDtrReportSnapshotRow(userId, productId, { visibleOnly: false });
}

/**
 * @deprecated Prefer {@link getVisibleDtrReportSnapshot} for UI. Delegates to visible-only read.
 */
export async function getDtrReportSnapshot(
  userId: string,
  productId: string = DTR_CORE_STATIC_V1,
): Promise<DtrReportSnapshotRow | null> {
  return getVisibleDtrReportSnapshot(userId, productId);
}

export type UpsertDtrReportSnapshotAtFulfillmentResult =
  | { ok: true; snapshotId: string }
  | { ok: false; reason: string };

/**
 * Build immutable snapshot at fulfillment. INSERT-only for new visible rows.
 * Hidden-only prior rows do not block INSERT (soft-hide repurchase).
 * Canonical v2-only write — buildV2FulfillmentSnapshot; no legacy JDN fallback.
 */
export async function upsertDtrReportSnapshotAtFulfillment(params: {
  userId: string;
  productId: string;
  checkoutSessionId: string;
  sessionMetadata: Record<string, string> | null | undefined;
}): Promise<UpsertDtrReportSnapshotAtFulfillmentResult> {
  const existingVisible = await getVisibleDtrReportSnapshot(params.userId, params.productId);
  if (existingVisible) {
    return { ok: true, snapshotId: existingVisible.reportInstanceId };
  }

  const hiddenOnlyPrior = await getLatestDtrReportSnapshotIncludingHidden(params.userId, params.productId);
  if (hiddenOnlyPrior) {
    console.info(
      '[dtrDraftDb]',
      JSON.stringify({
        event: 'dtr_snapshot_repurchase_fulfillment_insert',
        note: 'hidden-only prior row(s); inserting new visible snapshot',
      }),
    );
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
  let engine_context_json: EngineContextJson;
  let engine_version: string;

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

  const insertRow: Record<string, unknown> = {
    user_id: params.userId,
    product_id: params.productId,
    checkout_session_id: params.checkoutSessionId,
    profile_snapshot,
    draft_snapshot: draftSnapshot,
    envelope_json: envelope as unknown as Record<string, unknown>,
    engine_context_json,
    engine_version,
  };

  try {
    const db = getSupabaseAdmin() as any;
    const { data: insertData, error } = await db
      .from('dtr_report_snapshots')
      .insert(insertRow)
      .select('id')
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        const reread = await getVisibleDtrReportSnapshot(params.userId, params.productId);
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
      const reread = await getVisibleDtrReportSnapshot(params.userId, params.productId);
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
