import { NextResponse } from 'next/server';
import { PRIVATE_RESPONSE_HEADERS, requireReviewerId } from '../../../../lib/m55/creatorDistribution/security';
import { loadOperatorPayoutExceptionsV1 } from '../../../../lib/m55/creatorStatement/operatorPayoutExceptionService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const reviewerId = await requireReviewerId();
  if (!reviewerId) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403, headers: PRIVATE_RESPONSE_HEADERS });
  }

  try {
    const exceptions = await loadOperatorPayoutExceptionsV1();
    return NextResponse.json({ exceptions }, { headers: PRIVATE_RESPONSE_HEADERS });
  } catch {
    return NextResponse.json({ error: 'EXCEPTIONS_UNAVAILABLE' }, { status: 503, headers: PRIVATE_RESPONSE_HEADERS });
  }
}
