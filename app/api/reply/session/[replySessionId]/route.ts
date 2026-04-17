import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';
import { replyPayloadV11Schema } from '../../../../../lib/m55/reply/replyPayload.zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ replySessionId: string }> },
) {
  const { replySessionId: rawId } = await ctx.params;
  const replySessionId = rawId?.trim() ?? '';

  if (!UUID_RE.test(replySessionId)) {
    return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
  }

  const { userId: clerkUserId } = await auth();
  const userId = resolveUserIdForRequest(req, clerkUserId);
  if (!userId) {
    return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const db = getSupabaseAdmin() as any;

  const docRes = await db
    .from('reply_documents')
    .select('id,reply_session_id,theme,version,created_at,payload_json')
    .eq('reply_session_id', replySessionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (docRes.error) {
    console.error('[api/reply/session] query error', docRes.error);
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
  }

  const row = docRes.data;
  if (!row) {
    return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
  }

  const parsed = replyPayloadV11Schema.safeParse(row.payload_json);
  if (!parsed.success) {
    console.error('[api/reply/session] payload schema mismatch', parsed.error.flatten());
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    reply_session_id: row.reply_session_id,
    reply_document_id: row.id,
    theme: row.theme,
    version: row.version,
    created_at: row.created_at,
    reply_document: parsed.data,
  });
}
