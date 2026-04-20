import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'm55_dtr_draft_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function isDraftTableMissingError(error: unknown): boolean {
  const o = error as { code?: string; message?: string; details?: string } | null;
  const code = o?.code;
  const msg = `${o?.message ?? ''} ${o?.details ?? ''} ${String(error)}`;
  if (code === '42P01' || code === 'PGRST205') return true;
  if (/dtr_guest_drafts/i.test(msg) && /relation|does not exist|not find|schema cache/i.test(msg)) return true;
  return false;
}

/**
 * UPSERT guest/logged-in draft. Sets httpOnly cookie with draft UUID (guest carry-over).
 */
export async function POST(req: NextRequest) {
  const { userId: clerkFromAuth } = await auth();

  let body: {
    nickname?: string;
    birthDate?: string;
    extraJson?: Record<string, unknown>;
    clerkUserId?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : '';
  const birthRaw = typeof body.birthDate === 'string' ? body.birthDate.trim().slice(0, 10) : '';
  if (!nickname || !birthRaw) {
    return NextResponse.json({ error: 'nickname and birthDate required' }, { status: 400 });
  }

  const userId = clerkFromAuth ?? (typeof body.clerkUserId === 'string' ? body.clerkUserId : null);

  const jar = await cookies();
  const fromCookie = jar.get(COOKIE_NAME)?.value ?? null;

  let draftId: string;
  try {
    const db = getSupabaseAdmin() as any;

    if (userId) {
      const { data: existingUserDraft, error: selectErr } = await db
        .from('dtr_guest_drafts')
        .select('id')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (selectErr) {
        console.error('[api/dtr/draft]', selectErr);
        if (isDraftTableMissingError(selectErr)) {
          return NextResponse.json({ error: 'draft_schema_unavailable' }, { status: 503 });
        }
        return NextResponse.json({ error: 'draft_save_failed' }, { status: 500 });
      }
      if (existingUserDraft?.id) {
        draftId = existingUserDraft.id as string;
      } else if (fromCookie && isUuid(fromCookie)) {
        draftId = fromCookie;
      } else {
        draftId = crypto.randomUUID();
      }
    } else {
      draftId = fromCookie && isUuid(fromCookie) ? fromCookie : crypto.randomUUID();
    }

    const now = new Date().toISOString();
    const { error } = await db.from('dtr_guest_drafts').upsert(
      {
        id: draftId,
        nickname,
        birth_date: birthRaw,
        extra_json: body.extraJson ?? {},
        user_id: userId,
        linked_at: userId ? now : null,
        updated_at: now,
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.error('[api/dtr/draft]', error);
      if (isDraftTableMissingError(error)) {
        return NextResponse.json({ error: 'draft_schema_unavailable' }, { status: 503 });
      }
      return NextResponse.json({ error: 'draft_save_failed' }, { status: 500 });
    }

    const res = NextResponse.json({ ok: true as const, draftId });
    res.cookies.set(COOKIE_NAME, draftId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
    return res;
  } catch (e) {
    console.error('[api/dtr/draft]', e);
    if (isDraftTableMissingError(e)) {
      return NextResponse.json({ error: 'draft_schema_unavailable' }, { status: 503 });
    }
    return NextResponse.json({ error: 'draft_save_failed' }, { status: 500 });
  }
}
