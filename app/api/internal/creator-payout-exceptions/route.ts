import { NextResponse } from 'next/server';
import { PRIVATE_RESPONSE_HEADERS, requireReviewerId } from '../../../../lib/m55/creatorDistribution/security';
import { listOperatorPayoutExceptionsV1 } from '../../../../lib/m55/creatorStatement/operatorPayoutExceptionReadModel';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const reviewerId = await requireReviewerId();
  if (!reviewerId) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403, headers: PRIVATE_RESPONSE_HEADERS });
  }

  const exceptions = listOperatorPayoutExceptionsV1({ rows: [] });
  return NextResponse.json({ exceptions }, { headers: PRIVATE_RESPONSE_HEADERS });
}
