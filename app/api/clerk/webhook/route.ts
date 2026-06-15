import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { hashUserIdForLedgerLog } from '../../../../lib/m55/reply/readReplyWalletProbe';
import {
  USER_REF_HASH_RE,
  isRpcSuccess,
  isValidClerkUserId,
  isValidSvixId,
  listMissingSvixHeaders,
  classifyRpcTransportFailure,
  formatSafeRpcTransportFailureForLog,
  parseKnownRpcFailure,
  rpcFailureResponseKey,
} from '../../../../lib/m55/accountDeletionClerkWebhookContract';

const SUPABASE_JS_EXACT_VERSION = '2.97.0';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const USER_DELETED_EVENT = 'user.deleted';

function logSafe(payload: Record<string, string>): void {
  console.info(JSON.stringify(payload));
}

function logSafeWarn(payload: Record<string, string>): void {
  console.warn(JSON.stringify(payload));
}

function logSafeError(payload: Record<string, string>): void {
  console.error(JSON.stringify(payload));
}

export async function POST(req: NextRequest) {
  const hdrs = await headers();
  const missingHeaders = listMissingSvixHeaders(hdrs);
  if (missingHeaders.length > 0) {
    logSafeWarn({ stage: 'verify_headers', error_code: 'MISSING_SIGNATURE' });
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
  }

  const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!signingSecret) {
    logSafeWarn({ stage: 'config', error_code: 'WEBHOOK_NOT_CONFIGURED' });
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 503 });
  }

  let evt: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    evt = await verifyWebhook(req, { signingSecret });
  } catch {
    logSafeWarn({ stage: 'verify_signature', error_code: 'INVALID_SIGNATURE' });
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  if (evt.type !== USER_DELETED_EVENT) {
    logSafe({ stage: 'ignored', event_type: evt.type });
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const clerkUserId = (evt.data as { id?: unknown } | null | undefined)?.id;
  if (!isValidClerkUserId(clerkUserId)) {
    logSafeWarn({ stage: 'extract_user_id', error_code: 'INVALID_PAYLOAD' });
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const svixId = hdrs.get('svix-id');
  if (!isValidSvixId(svixId)) {
    logSafeWarn({ stage: 'extract_svix_id', error_code: 'INVALID_PAYLOAD' });
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const userRefHash = hashUserIdForLedgerLog(clerkUserId);
  if (!USER_REF_HASH_RE.test(userRefHash)) {
    logSafeError({ stage: 'hash', error_code: 'INVALID_RPC_INPUT' });
    return NextResponse.json({ error: 'invalid_rpc_input' }, { status: 500 });
  }

  let rpcData: unknown;
  try {
    const db = getSupabaseAdmin() as any;
    const { data, error } = await db.rpc('m55_account_deletion_process_v1', {
      p_svix_id: svixId,
      p_event_type: evt.type,
      p_clerk_user_id: clerkUserId,
      p_user_ref_hash: userRefHash,
    });
    if (error) {
      logSafeError({
        stage: 'rpc_transport',
        runtime: 'nodejs',
        supabase_js_exact_version: SUPABASE_JS_EXACT_VERSION,
        project_ref: 'preview',
        svix_id: svixId,
        ...formatSafeRpcTransportFailureForLog(
          classifyRpcTransportFailure(error, {
            requestDispatched: true,
            responseReceived: true,
          }),
        ),
      });
      return NextResponse.json({ error: 'upstream_error' }, { status: 500 });
    }
    rpcData = data;
  } catch (thrown) {
    logSafeError({
      stage: 'rpc_transport',
      runtime: 'nodejs',
      supabase_js_exact_version: SUPABASE_JS_EXACT_VERSION,
      project_ref: 'preview',
      svix_id: svixId,
      ...formatSafeRpcTransportFailureForLog(classifyRpcTransportFailure(thrown)),
    });
    return NextResponse.json({ error: 'upstream_error' }, { status: 500 });
  }

  if (isRpcSuccess(rpcData)) {
    logSafe({ stage: 'rpc_succeeded' });
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const knownFailure = parseKnownRpcFailure(rpcData);
  if (knownFailure) {
    logSafeError({ stage: 'rpc_failed', error_code: knownFailure });
    return NextResponse.json(
      { error: rpcFailureResponseKey(knownFailure) },
      { status: 500 }
    );
  }

  logSafeError({ stage: 'rpc_result', error_code: 'INVALID_RPC_RESULT' });
  return NextResponse.json({ error: 'invalid_rpc_result' }, { status: 500 });
}
