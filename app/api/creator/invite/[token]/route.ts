import { NextResponse } from 'next/server';
import { findValidScoutInvite } from '../../../../../lib/m55/creatorDistribution/invite';
import { PRIVATE_RESPONSE_HEADERS } from '../../../../../lib/m55/creatorDistribution/security';

export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const invite = await findValidScoutInvite(token);
    return NextResponse.json({ valid: Boolean(invite), source: invite ? 'M55_SCOUT' : null }, {
      status: invite ? 200 : 404, headers: PRIVATE_RESPONSE_HEADERS,
    });
  } catch {
    return NextResponse.json({ valid: false }, { status: 503, headers: PRIVATE_RESPONSE_HEADERS });
  }
}
