import { NextResponse } from 'next/server';
import { reviewActionInput } from '../../../../../lib/m55/creatorDistribution/contract';
import { performReviewAction } from '../../../../../lib/m55/creatorDistribution/review';
import { PRIVATE_RESPONSE_HEADERS, requireReviewerId } from '../../../../../lib/m55/creatorDistribution/security';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function POST(request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  const reviewerId = await requireReviewerId();
  if (!reviewerId) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403, headers: PRIVATE_RESPONSE_HEADERS });
  const { applicationId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(applicationId)) return NextResponse.json({ error: 'ID_INVALID' }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }
  const parsed = reviewActionInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'ACTION_INVALID' }, { status: 400 });
  try {
    return NextResponse.json(await performReviewAction(applicationId, reviewerId, parsed.data), { headers: PRIVATE_RESPONSE_HEADERS });
  } catch {
    return NextResponse.json({ error: 'REVIEW_NOT_APPLIED' }, { status: 409, headers: PRIVATE_RESPONSE_HEADERS });
  }
}
