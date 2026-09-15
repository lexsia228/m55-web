import { NextResponse } from 'next/server';
import { getCreatorPortal } from '../../../../lib/m55/creatorDistribution/repository';
import { PRIVATE_RESPONSE_HEADERS, requireCreatorUserId } from '../../../../lib/m55/creatorDistribution/security';

export const dynamic = 'force-dynamic';
export async function GET() {
  const userId = await requireCreatorUserId();
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401, headers: PRIVATE_RESPONSE_HEADERS });
  try {
    return NextResponse.json(await getCreatorPortal(userId), { headers: PRIVATE_RESPONSE_HEADERS });
  } catch {
    return NextResponse.json({ error: 'PORTAL_UNAVAILABLE' }, { status: 503, headers: PRIVATE_RESPONSE_HEADERS });
  }
}
