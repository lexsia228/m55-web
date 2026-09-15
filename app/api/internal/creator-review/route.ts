import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { issueScoutInvite } from '../../../../lib/m55/creatorDistribution/invite';
import { getReviewQueue } from '../../../../lib/m55/creatorDistribution/repository';
import { PRIVATE_RESPONSE_HEADERS, requireReviewerId } from '../../../../lib/m55/creatorDistribution/security';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const reviewerId = await requireReviewerId();
  if (!reviewerId) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403, headers: PRIVATE_RESPONSE_HEADERS });
  try { return NextResponse.json({ applications: await getReviewQueue() }, { headers: PRIVATE_RESPONSE_HEADERS }); }
  catch { return NextResponse.json({ error: 'QUEUE_UNAVAILABLE' }, { status: 503, headers: PRIVATE_RESPONSE_HEADERS }); }
}

export async function POST(request: Request) {
  const reviewerId = await requireReviewerId();
  if (!reviewerId) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403, headers: PRIVATE_RESPONSE_HEADERS });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }
  if (body.action === 'ISSUE_INVITE') {
    if (body.campaign != null && (typeof body.campaign !== 'string' || body.campaign.length > 120))
      return NextResponse.json({ error: 'CAMPAIGN_INVALID' }, { status: 400 });
    try {
      const invite = await issueScoutInvite(reviewerId, body.campaign as string | undefined);
      return NextResponse.json({ ...invite, url: `https://m-55.jp/creator/invite/${invite.token}` }, { status: 201, headers: PRIVATE_RESPONSE_HEADERS });
    } catch { return NextResponse.json({ error: 'INVITE_ISSUE_FAILED' }, { status: 503 }); }
  }
  if (body.action === 'REVOKE_INVITE' && typeof body.inviteId === 'string' && /^[0-9a-f-]{36}$/i.test(body.inviteId)) {
    const { data, error } = await (getSupabaseAdmin() as any).from('m55_creator_invites')
      .update({ status: 'REVOKED', revoked_at: new Date().toISOString(), revoked_by_reviewer_clerk_user_id: reviewerId })
      .eq('id', body.inviteId).eq('status', 'ISSUED').select('id').maybeSingle();
    if (error || !data) return NextResponse.json({ error: 'INVITE_REVOKE_FAILED' }, { status: 409 });
    return NextResponse.json({ ok: true }, { headers: PRIVATE_RESPONSE_HEADERS });
  }
  return NextResponse.json({ error: 'ACTION_INVALID' }, { status: 400 });
}
