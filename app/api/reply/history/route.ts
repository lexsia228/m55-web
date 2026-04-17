import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { replyPayloadV11Schema } from '../../../../lib/m55/reply/replyPayload.zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HISTORY_LIMIT = 10;

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

export async function GET(req: NextRequest) {
  const { userId: clerkUserId } = await auth();
  const userId = resolveUserIdForRequest(req, clerkUserId);
  if (!userId) {
    return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const db = getSupabaseAdmin() as any;

  const listRes = await db
    .from('reply_documents')
    .select('id,reply_session_id,theme,version,created_at,payload_json')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT);

  if (listRes.error) {
    console.error('[api/reply/history] query error', listRes.error);
    return NextResponse.json({ ok: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
  }

  const rows = (listRes.data ?? []) as Array<{
    id: string;
    reply_session_id: string;
    theme: string;
    version: string;
    created_at: string;
    payload_json: unknown;
  }>;

  const items = rows.map((row) => {
    const parsed = replyPayloadV11Schema.safeParse(row.payload_json);
    const issue_summary = parsed.success ? parsed.data.issue_summary : '（要約を表示できません）';
    const next_question = parsed.success ? parsed.data.next_question : '';

    return {
      reply_session_id: row.reply_session_id,
      reply_document_id: row.id,
      theme: row.theme,
      version: row.version,
      created_at: row.created_at,
      issue_summary,
      next_question,
    };
  });

  return NextResponse.json({ ok: true, items });
}
