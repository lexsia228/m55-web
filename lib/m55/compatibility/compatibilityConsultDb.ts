import { createHash } from 'node:crypto';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import {
  getOwnedCompatibilityReport,
  isOpaqueCompatibilityId,
} from './compatibilityCommerceDb';

type DbClient = ReturnType<typeof getSupabaseAdmin>;

export type CompatibilityConsultThreadRow = {
  id: string;
  creditsTotal: 1;
  creditsRemaining: number;
  state: 'writable' | 'read_only';
};

export type CompatibilityConsultMessageRow = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export type CompatibilityConsultRoomState = {
  reportId: string;
  thread: CompatibilityConsultThreadRow;
  messages: CompatibilityConsultMessageRow[];
};

export type CompatibilityConsultCommitResult =
  | {
      ok: true;
      mode: 'commit' | 'replay';
      consumptionApplied: boolean;
      threadState: string;
      threadCreditsRemaining: number;
      threadCreditsTotal: number;
      assistantContent: string;
    }
  | { ok: false; errorCode: string; message: string };

export type CompatibilityConsultReserveResult =
  | {
      ok: true;
      mode: 'replay';
      assistantContent: string;
      threadState: string;
      threadCreditsRemaining: number;
      threadCreditsTotal: number;
    }
  | {
      ok: true;
      mode: 'reserved';
      attemptToken: string;
      threadState: string;
      threadCreditsRemaining: number;
      threadCreditsTotal: number;
    }
  | { ok: false; errorCode: string; message: string };

/** Must match m55_compatibility_consult_reply_commit payload_fingerprint (request-only). */
export function compatibilityConsultRequestFingerprint(params: {
  ownerUserId: string;
  ownedReportId: string;
  idempotencyKey: string;
  userMessage: string;
}): string {
  const payload = [
    params.ownerUserId.trim(),
    params.ownedReportId,
    params.idempotencyKey.trim(),
    params.userMessage.trim(),
  ].join(':');
  return createHash('md5').update(payload).digest('hex');
}

function parseThreadRow(raw: Record<string, unknown>): CompatibilityConsultThreadRow | null {
  if (!isOpaqueCompatibilityId(raw.id)) return null;
  const creditsRemaining = typeof raw.credits_remaining === 'number' ? raw.credits_remaining : -1;
  const state = raw.state === 'writable' || raw.state === 'read_only' ? raw.state : null;
  if (creditsRemaining < 0 || creditsRemaining > 1 || !state) return null;
  return {
    id: String(raw.id),
    creditsTotal: 1,
    creditsRemaining,
    state,
  };
}

async function hasSucceededConsultCommit(
  ownerUserId: string,
  ownedReportId: string,
  db: DbClient,
): Promise<boolean> {
  const { data, error } = await (db as any)
    .from('compatibility_consult_send_commits')
    .select('id')
    .eq('user_id', ownerUserId)
    .eq('owned_report_id', ownedReportId)
    .eq('status', 'succeeded')
    .limit(1)
    .maybeSingle();
  return !error && Boolean(data);
}

function parseReserveRpc(raw: unknown): CompatibilityConsultReserveResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.ok !== 'boolean') return null;
  if (!o.ok) {
    return {
      ok: false,
      errorCode: typeof o.error_code === 'string' ? o.error_code : 'INTERNAL',
      message: typeof o.message === 'string' ? o.message : 'reserve failed',
    };
  }
  if (o.mode === 'replay') {
    if (typeof o.assistant_content !== 'string') return null;
    return {
      ok: true,
      mode: 'replay',
      assistantContent: o.assistant_content,
      threadState: typeof o.thread_state === 'string' ? o.thread_state : 'read_only',
      threadCreditsRemaining:
        typeof o.thread_credits_remaining === 'number' ? o.thread_credits_remaining : 0,
      threadCreditsTotal: typeof o.thread_credits_total === 'number' ? o.thread_credits_total : 1,
    };
  }
  if (o.mode === 'reserved' && typeof o.attempt_token === 'string' && o.attempt_token) {
    return {
      ok: true,
      mode: 'reserved',
      attemptToken: o.attempt_token,
      threadState: typeof o.thread_state === 'string' ? o.thread_state : 'writable',
      threadCreditsRemaining:
        typeof o.thread_credits_remaining === 'number' ? o.thread_credits_remaining : 1,
      threadCreditsTotal: typeof o.thread_credits_total === 'number' ? o.thread_credits_total : 1,
    };
  }
  return null;
}

export async function reserveCompatibilityConsultSend(
  params: {
    ownerUserId: string;
    ownedReportId: string;
    threadId: string;
    idempotencyKey: string;
    userMessage: string;
  },
  db: DbClient = getSupabaseAdmin(),
): Promise<CompatibilityConsultReserveResult> {
  const { data, error } = await (db as any).rpc('m55_compatibility_consult_send_reserve_v1', {
    p_user_id: params.ownerUserId,
    p_owned_report_id: params.ownedReportId,
    p_thread_id: params.threadId,
    p_idempotency_key: params.idempotencyKey,
    p_user_message: params.userMessage,
  });
  if (error) {
    return { ok: false, errorCode: 'RPC_ERROR', message: 'reserve rpc failed' };
  }
  return parseReserveRpc(data) ?? { ok: false, errorCode: 'RPC_PARSE', message: 'invalid reserve payload' };
}

export async function releaseCompatibilityConsultSendReservation(
  params: {
    ownerUserId: string;
    ownedReportId: string;
    idempotencyKey: string;
    attemptToken: string;
  },
  db: DbClient = getSupabaseAdmin(),
): Promise<{ ok: true } | { ok: false; errorCode: string }> {
  const { data, error } = await (db as any).rpc('m55_compatibility_consult_send_release_v1', {
    p_user_id: params.ownerUserId,
    p_owned_report_id: params.ownedReportId,
    p_idempotency_key: params.idempotencyKey,
    p_attempt_token: params.attemptToken,
  });
  if (error) return { ok: false, errorCode: 'RPC_ERROR' };
  const ok = Boolean((data as { ok?: unknown } | null)?.ok);
  return ok ? { ok: true } : { ok: false, errorCode: 'RELEASE_NOT_APPLIED' };
}

export async function ensureCompatibilityIncludedReplyThread(
  ownerUserId: string,
  ownedReportId: string,
  db: DbClient = getSupabaseAdmin(),
): Promise<boolean> {
  if (!ownerUserId.trim() || !isOpaqueCompatibilityId(ownedReportId)) return false;
  const { data, error } = await (db as any).rpc('m55_ensure_compatibility_included_reply_thread_v1', {
    p_owned_report_id: ownedReportId,
    p_owner_user_id: ownerUserId,
  });
  return !error && Boolean((data as { ok?: unknown } | null)?.ok);
}

export async function getCompatibilityConsultThread(
  ownerUserId: string,
  ownedReportId: string,
  db: DbClient = getSupabaseAdmin(),
): Promise<CompatibilityConsultThreadRow | null> {
  if (!ownerUserId.trim() || !isOpaqueCompatibilityId(ownedReportId)) return null;
  const { data, error } = await (db as any)
    .from('compatibility_consult_threads')
    .select('id, credits_remaining, state')
    .eq('owner_user_id', ownerUserId)
    .eq('owned_report_id', ownedReportId)
    .maybeSingle();
  if (error || !data) return null;
  return parseThreadRow(data as Record<string, unknown>);
}

export async function loadCompatibilityConsultRoom(
  ownerUserId: string,
  ownedReportId: string,
  db: DbClient = getSupabaseAdmin(),
): Promise<
  | { ok: true; room: CompatibilityConsultRoomState }
  | { ok: false; reason: 'invalid' | 'not_owned' | 'thread_missing' | 'unavailable' }
> {
  if (!ownerUserId.trim() || !isOpaqueCompatibilityId(ownedReportId)) {
    return { ok: false, reason: 'invalid' };
  }

  const owned = await getOwnedCompatibilityReport(ownerUserId, ownedReportId, db);
  if (!owned) return { ok: false, reason: 'not_owned' };

  const ensured = await ensureCompatibilityIncludedReplyThread(ownerUserId, ownedReportId, db);
  if (!ensured) return { ok: false, reason: 'unavailable' };

  const thread = await getCompatibilityConsultThread(ownerUserId, ownedReportId, db);
  if (!thread) return { ok: false, reason: 'thread_missing' };

  const { data: messages, error: msgErr } = await (db as any)
    .from('compatibility_consult_messages')
    .select('id, role, content, created_at')
    .eq('thread_id', thread.id)
    .order('created_at', { ascending: true });

  if (msgErr) return { ok: false, reason: 'unavailable' };

  const parsedMessages = (messages ?? []).flatMap((row: Record<string, unknown>) => {
    const role = row.role === 'user' || row.role === 'assistant' ? row.role : null;
    const content = typeof row.content === 'string' ? row.content : '';
    const createdAt = typeof row.created_at === 'string' ? row.created_at : '';
    const id = typeof row.id === 'string' ? row.id : '';
    if (!role || !content.trim() || !createdAt || !id) return [];
    return [{ id, role, content, createdAt } as CompatibilityConsultMessageRow];
  });

  const assistantCount = parsedMessages.filter(
    (m: CompatibilityConsultMessageRow) => m.role === 'assistant',
  ).length;

  if (thread.creditsRemaining > 0 && assistantCount > 0) {
    return { ok: false, reason: 'unavailable' };
  }

  const succeededCommit = await hasSucceededConsultCommit(ownerUserId, ownedReportId, db);

  if (thread.creditsRemaining <= 0 && !succeededCommit) {
    return { ok: false, reason: 'unavailable' };
  }

  if (succeededCommit && assistantCount === 0) {
    return { ok: false, reason: 'unavailable' };
  }

  return {
    ok: true,
    room: {
      reportId: ownedReportId,
      thread,
      messages: parsedMessages,
    },
  };
}

function parseCommitRpc(raw: unknown): CompatibilityConsultCommitResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.ok !== 'boolean') return null;
  if (!o.ok) {
    return {
      ok: false,
      errorCode: typeof o.error_code === 'string' ? o.error_code : 'INTERNAL',
      message: typeof o.message === 'string' ? o.message : 'commit failed',
    };
  }
  if (typeof o.assistant_content !== 'string') return null;
  return {
    ok: true,
    mode: o.mode === 'replay' ? 'replay' : 'commit',
    consumptionApplied: o.consumption_applied === true,
    threadState: typeof o.thread_state === 'string' ? o.thread_state : 'read_only',
    threadCreditsRemaining:
      typeof o.thread_credits_remaining === 'number' ? o.thread_credits_remaining : 0,
    threadCreditsTotal: typeof o.thread_credits_total === 'number' ? o.thread_credits_total : 1,
    assistantContent: o.assistant_content,
  };
}

export async function commitCompatibilityConsultReply(
  params: {
    ownerUserId: string;
    ownedReportId: string;
    threadId: string;
    idempotencyKey: string;
    userMessage: string;
    assistantMessage: string;
    attemptToken: string;
  },
  db: DbClient = getSupabaseAdmin(),
): Promise<CompatibilityConsultCommitResult> {
  const { data, error } = await (db as any).rpc('m55_compatibility_consult_reply_commit', {
    p_user_id: params.ownerUserId,
    p_owned_report_id: params.ownedReportId,
    p_thread_id: params.threadId,
    p_idempotency_key: params.idempotencyKey,
    p_user_message: params.userMessage,
    p_assistant_message: params.assistantMessage,
    p_attempt_token: params.attemptToken,
  });
  if (error) {
    return { ok: false, errorCode: 'RPC_ERROR', message: 'commit rpc failed' };
  }
  return parseCommitRpc(data) ?? { ok: false, errorCode: 'RPC_PARSE', message: 'invalid rpc payload' };
}
