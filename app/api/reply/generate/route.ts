import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { replyGenerateRequestSchema } from '../../../../lib/m55/reply/replyGenerateRequest.zod';
import { generateStubReplyPayload } from '../../../../lib/m55/reply/stubReplyGenerator';
import { replyPayloadV11Schema } from '../../../../lib/m55/reply/replyPayload.zod';
import { logReplyGenerateEvent } from '../../../../lib/m55/reply/observability';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ReplySessionRow = {
  id: string;
  user_id: string;
  theme: string;
  input_mode: string;
  selected_subquestions_json: unknown[];
  free_text: string | null;
  schema_version: string;
  idempotency_key: string;
  status: string;
};

type RpcCommitResult = {
  ok: boolean;
  mode?: string;
  reply_document_id?: string;
  wallet_before?: number;
  wallet_after?: number;
  consumption_applied?: boolean;
  error_code?: string;
  message?: string;
};

function createRequestId() {
  return `req_${crypto.randomUUID().replaceAll('-', '')}`;
}

function invalidRequestResponse(requestId: string, message: string) {
  return NextResponse.json(
    {
      ok: false,
      request_id: requestId,
      error: { code: 'INVALID_REQUEST', message },
    },
    { status: 400 },
  );
}

function samePayload(
  a: ReplySessionRow,
  b: {
    theme: string;
    input_mode: string;
    selected_subquestions_json: string[];
    free_text: string | null;
    schema_version: string;
  },
) {
  return (
    a.theme === b.theme &&
    a.input_mode === b.input_mode &&
    JSON.stringify(a.selected_subquestions_json ?? []) ===
      JSON.stringify(b.selected_subquestions_json) &&
    (a.free_text ?? null) === (b.free_text ?? null) &&
    a.schema_version === b.schema_version
  );
}

function resolveUserIdForRequest(req: NextRequest, clerkUserId: string | null | undefined) {
  if (clerkUserId) {
    return clerkUserId;
  }

  if (process.env.NODE_ENV !== 'production') {
    const testUserId = req.headers.get('x-m55-test-user-id')?.trim();
    if (testUserId) {
      return testUserId;
    }
  }

  return null;
}

function parseRpcResult(raw: unknown): RpcCommitResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.ok !== 'boolean') return null;
  const out: RpcCommitResult = { ok: o.ok };
  if (typeof o.mode === 'string') out.mode = o.mode;
  if (typeof o.reply_document_id === 'string') out.reply_document_id = o.reply_document_id;
  if (typeof o.wallet_before === 'number') out.wallet_before = o.wallet_before;
  if (typeof o.wallet_after === 'number') out.wallet_after = o.wallet_after;
  if (typeof o.consumption_applied === 'boolean') out.consumption_applied = o.consumption_applied;
  if (typeof o.error_code === 'string') out.error_code = o.error_code;
  if (typeof o.message === 'string') out.message = o.message;
  return out;
}

async function getReplyWalletState(db: any, userId: string) {
  const walletRes = await db
    .from('reply_ticket_wallets')
    .select('available_count,status')
    .eq('user_id', userId)
    .maybeSingle();

  if (walletRes.error) {
    throw walletRes.error;
  }

  const available =
    typeof walletRes.data?.available_count === 'number'
      ? walletRes.data.available_count
      : 0;
  const isActive = walletRes.data?.status === 'active';
  return {
    available,
    isUsable: isActive && available > 0,
  };
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const requestId = createRequestId();
  const idemKey = req.headers.get('x-idempotency-key')?.trim() ?? '';
  let userId = '';
  let replySessionId: string | null = null;
  let themeForLog = '';
  let inputModeForLog = '';
  let selectedSubquestionCount = 0;
  let freeTextLength = 0;
  let schemaValidationResult: 'pass' | 'fail' | 'not_run' = 'not_run';

  const traceLog: {
    stub_mode?: boolean;
    wallet_before?: number | null;
    wallet_after?: number | null;
    reply_document_id?: string | null;
    consumption_applied?: boolean | null;
    rpc_result_status?: string | null;
  } = { stub_mode: false };

  const logAndReturn = (response: NextResponse, errorCode?: string) => {
    logReplyGenerateEvent({
      request_id: requestId,
      user_id: userId || 'anonymous',
      reply_session_id: replySessionId,
      idempotency_key: idemKey,
      theme: themeForLog,
      input_mode: inputModeForLog,
      selected_subquestion_count: selectedSubquestionCount,
      free_text_length: freeTextLength,
      stub_mode: traceLog.stub_mode ?? false,
      response_status: response.status,
      schema_validation_result: schemaValidationResult,
      latency_ms: Date.now() - startedAt,
      error_code: errorCode,
      wallet_before: traceLog.wallet_before ?? null,
      wallet_after: traceLog.wallet_after ?? null,
      reply_document_id: traceLog.reply_document_id ?? null,
      consumption_applied: traceLog.consumption_applied ?? null,
      rpc_result_status: traceLog.rpc_result_status ?? null,
    });
    return response;
  };

  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return logAndReturn(
      invalidRequestResponse(requestId, 'Content-Type must be application/json'),
      'INVALID_REQUEST',
    );
  }

  const { userId: clerkUserId } = await auth();
  const resolvedUserId = resolveUserIdForRequest(req, clerkUserId);
  if (!resolvedUserId) {
    return logAndReturn(
      NextResponse.json(
        {
          ok: false,
          request_id: requestId,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        },
        { status: 401 },
      ),
      'UNAUTHORIZED',
    );
  }
  userId = resolvedUserId;

  if (!idemKey) {
    return logAndReturn(
      invalidRequestResponse(requestId, 'X-Idempotency-Key is required'),
      'INVALID_REQUEST',
    );
  }

  let bodyRaw: unknown;
  try {
    bodyRaw = await req.json();
  } catch {
    return logAndReturn(
      invalidRequestResponse(requestId, 'Invalid JSON body'),
      'INVALID_REQUEST',
    );
  }

  const parsedReq = replyGenerateRequestSchema.safeParse(bodyRaw);
  if (!parsedReq.success) {
    return logAndReturn(
      invalidRequestResponse(requestId, 'Request body does not match contract'),
      'INVALID_REQUEST',
    );
  }

  const payload = parsedReq.data;
  themeForLog = payload.theme;
  inputModeForLog = payload.input_mode;
  selectedSubquestionCount = payload.selected_subquestions.length;
  freeTextLength = payload.free_text?.length ?? 0;

  const db = getSupabaseAdmin() as any;
  const sessionPayload = {
    theme: payload.theme,
    input_mode: payload.input_mode,
    selected_subquestions_json: payload.selected_subquestions,
    free_text: payload.free_text,
    schema_version: payload.schema_version,
  };

  try {
    let sessionRow: ReplySessionRow | null = null;

    const existingRes = await db
      .from('reply_sessions')
      .select(
        'id,user_id,theme,input_mode,selected_subquestions_json,free_text,schema_version,idempotency_key,status',
      )
      .eq('user_id', userId)
      .eq('idempotency_key', idemKey)
      .maybeSingle();

    if (existingRes.error) {
      throw existingRes.error;
    }
    sessionRow = (existingRes.data as ReplySessionRow | null) ?? null;

    if (!sessionRow) {
      const insertRes = await db
        .from('reply_sessions')
        .insert({
          user_id: userId,
          idempotency_key: idemKey,
          theme: sessionPayload.theme,
          input_mode: sessionPayload.input_mode,
          selected_subquestions_json: sessionPayload.selected_subquestions_json,
          free_text: sessionPayload.free_text,
          schema_version: sessionPayload.schema_version,
          status: 'accepted',
          core_profile_ref: null,
        })
        .select(
          'id,user_id,theme,input_mode,selected_subquestions_json,free_text,schema_version,idempotency_key,status',
        )
        .single();

      if (insertRes.error) {
        const raceRes = await db
          .from('reply_sessions')
          .select(
            'id,user_id,theme,input_mode,selected_subquestions_json,free_text,schema_version,idempotency_key,status',
          )
          .eq('user_id', userId)
          .eq('idempotency_key', idemKey)
          .maybeSingle();

        if (raceRes.error || !raceRes.data) {
          throw insertRes.error;
        }
        sessionRow = raceRes.data as ReplySessionRow;
      } else {
        sessionRow = insertRes.data as ReplySessionRow;
      }
    }

    if (!sessionRow) {
      throw new Error('failed to resolve reply session');
    }

    replySessionId = sessionRow.id;
    const isReplay = samePayload(sessionRow, sessionPayload);

    if (!isReplay) {
      return logAndReturn(
        NextResponse.json(
          {
            ok: false,
            request_id: requestId,
            error: {
              code: 'IDEMPOTENCY_CONFLICT',
              message: 'Different payload for the same idempotency key',
            },
          },
          { status: 409 },
        ),
        'IDEMPOTENCY_CONFLICT',
      );
    }

    if (sessionRow.status === 'succeeded') {
      const docRes = await db
        .from('reply_documents')
        .select('id,payload_json')
        .eq('reply_session_id', sessionRow.id)
        .maybeSingle();

      if (!docRes.error && docRes.data?.payload_json) {
        const walletRes = await db
          .from('reply_ticket_wallets')
          .select('available_count')
          .eq('user_id', userId)
          .maybeSingle();
        const avail =
          typeof walletRes.data?.available_count === 'number'
            ? walletRes.data.available_count
            : 0;

        const storedDoc = replyPayloadV11Schema.safeParse(docRes.data.payload_json);
        if (!storedDoc.success) {
          return logAndReturn(
            NextResponse.json(
              {
                ok: false,
                request_id: requestId,
                error: {
                  code: 'INTERNAL_ERROR',
                  message: 'Unexpected server error',
                },
              },
              { status: 500 },
            ),
            'INTERNAL_ERROR',
          );
        }

        traceLog.consumption_applied = false;
        traceLog.wallet_before = avail;
        traceLog.wallet_after = avail;
        traceLog.reply_document_id =
          typeof docRes.data.id === 'string' ? docRes.data.id : String(docRes.data.id);
        traceLog.rpc_result_status = 'replay_route_short_circuit';
        schemaValidationResult = 'pass';

        return logAndReturn(
          NextResponse.json(
            {
              ok: true,
              stub_mode: false,
              request_id: requestId,
              reply_session_id: sessionRow.id,
              idempotency_key: idemKey,
              consumption_applied: false,
              wallet_before: avail,
              wallet_after: avail,
              reply_document: storedDoc.data,
            },
            { status: 200 },
          ),
        );
      }
    }

    const walletState = await getReplyWalletState(db, userId);
    if (!walletState.isUsable) {
      return logAndReturn(
        NextResponse.json(
          {
            ok: false,
            request_id: requestId,
            error: {
              code: 'FORBIDDEN',
              message: '現在ご利用いただける返書がありません',
            },
          },
          { status: 403 },
        ),
        'FORBIDDEN',
      );
    }

    const replyDocument = generateStubReplyPayload({
      theme: payload.theme,
      inputMode: payload.input_mode,
      selectedSubquestions: payload.selected_subquestions,
      freeText: payload.free_text,
    });

    const schemaResult = replyPayloadV11Schema.safeParse(replyDocument);
    if (!schemaResult.success) {
      schemaValidationResult = 'fail';
      await db
        .from('reply_sessions')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', sessionRow.id);

      return logAndReturn(
        NextResponse.json(
          {
            ok: false,
            request_id: requestId,
            error: {
              code: 'SCHEMA_VALIDATION_FAILED',
              message: 'Generated reply payload failed schema validation',
            },
          },
          { status: 422 },
        ),
        'SCHEMA_VALIDATION_FAILED',
      );
    }

    schemaValidationResult = 'pass';

    const { data: rpcRaw, error: rpcErr } = await db.rpc('m55_reply_generate_commit', {
      p_user_id: userId,
      p_reply_session_id: sessionRow.id,
      p_payload_json: schemaResult.data,
      p_theme: payload.theme,
      p_generator_version: null,
    });

    if (rpcErr) {
      traceLog.rpc_result_status = 'rpc_transport_error';
      console.error('[api/reply/generate] RPC transport error', {
        request_id: requestId,
        reply_session_id: sessionRow.id,
        rpcErr,
      });
      return logAndReturn(
        NextResponse.json(
          {
            ok: false,
            request_id: requestId,
            error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' },
          },
          { status: 500 },
        ),
        'INTERNAL_ERROR',
      );
    }

    const rpcResult = parseRpcResult(rpcRaw);
    if (!rpcResult) {
      traceLog.rpc_result_status = 'rpc_parse_failed';
      return logAndReturn(
        NextResponse.json(
          {
            ok: false,
            request_id: requestId,
            error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' },
          },
          { status: 500 },
        ),
        'INTERNAL_ERROR',
      );
    }

    if (!rpcResult.ok) {
      traceLog.rpc_result_status = rpcResult.error_code ?? 'rpc_error';
      const code = rpcResult.error_code ?? 'INTERNAL_ERROR';
      if (code === 'FORBIDDEN') {
        return logAndReturn(
          NextResponse.json(
            {
              ok: false,
              request_id: requestId,
              error: {
                code: 'FORBIDDEN',
                message: rpcResult.message ?? 'Forbidden',
              },
            },
            { status: 403 },
          ),
          'FORBIDDEN',
        );
      }
      return logAndReturn(
        NextResponse.json(
          {
            ok: false,
            request_id: requestId,
            error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' },
          },
          { status: 500 },
        ),
        'INTERNAL_ERROR',
      );
    }

    traceLog.rpc_result_status = 'ok';
    traceLog.wallet_before = rpcResult.wallet_before ?? null;
    traceLog.wallet_after = rpcResult.wallet_after ?? null;
    traceLog.reply_document_id = rpcResult.reply_document_id ?? null;
    traceLog.consumption_applied = rpcResult.consumption_applied ?? null;

    return logAndReturn(
      NextResponse.json(
        {
          ok: true,
          stub_mode: false,
          request_id: requestId,
          reply_session_id: sessionRow.id,
          idempotency_key: idemKey,
          consumption_applied: !!rpcResult.consumption_applied,
          wallet_before: rpcResult.wallet_before ?? null,
          wallet_after: rpcResult.wallet_after ?? null,
          reply_document: schemaResult.data,
        },
        { status: 200 },
      ),
    );
  } catch (error) {
    console.error('[api/reply/generate] INTERNAL_ERROR', { request_id: requestId, error });
    return logAndReturn(
      NextResponse.json(
        {
          ok: false,
          request_id: requestId,
          error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' },
        },
        { status: 500 },
      ),
      'INTERNAL_ERROR',
    );
  }
}
