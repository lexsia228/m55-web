import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'm55_dtr_draft_id';

/**
 * Attach cookie-bound guest draft to signed-in user (post-login promote).
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const jar = await cookies();
  const draftId = jar.get(COOKIE_NAME)?.value;
  if (!draftId) {
    return NextResponse.json({ ok: true as const, claimed: false });
  }

  try {
    const db = getSupabaseAdmin() as any;
    const now = new Date().toISOString();
    const { error } = await db
      .from('dtr_guest_drafts')
      .update({
        user_id: userId,
        linked_at: now,
        updated_at: now,
      })
      .eq('id', draftId);
    if (error) {
      console.error('[api/dtr/draft/claim]', error);
      return NextResponse.json({ error: 'claim_failed' }, { status: 500 });
    }

    const res = NextResponse.json({ ok: true as const, claimed: true, draftId });
    res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
    return res;
  } catch (e) {
    console.error('[api/dtr/draft/claim]', e);
    return NextResponse.json({ error: 'claim_failed' }, { status: 500 });
  }
}
