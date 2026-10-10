import { NextResponse } from 'next/server';
import { deriveDisplayReferenceV1 } from '../../../../../lib/m55/creatorDashboard/displayReference';
import { resolveCreatorContextFromSession } from '../../../../../lib/m55/creatorDashboard/creatorContext';
import { rotateReferralShareV1 } from '../../../../../lib/m55/creatorDashboard/referralLifecycle';
import { resolveCreatorReferralShareOriginV1 } from '../../../../../lib/m55/creatorDashboard/referralToken';
import { PRIVATE_RESPONSE_HEADERS } from '../../../../../lib/m55/creatorDistribution/security';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const ctx = await resolveCreatorContextFromSession();
  if (!ctx.ok) {
    const status = ctx.error === 'UNAUTHORIZED' ? 401 : 403;
    return NextResponse.json({ error: ctx.error }, { status, headers: PRIVATE_RESPONSE_HEADERS });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400, headers: PRIVATE_RESPONSE_HEADERS });
  }
  const expectedActiveLinkId = body.expectedActiveLinkId;
  if (typeof expectedActiveLinkId !== 'string') {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400, headers: PRIVATE_RESPONSE_HEADERS });
  }
  const origin = resolveCreatorReferralShareOriginV1({
    requestOrigin: new URL(request.url).origin,
  });
  const result = await rotateReferralShareV1({
    ctx,
    canonicalOrigin: origin,
    expectedActiveLinkId,
    linkDisplayReferenceFor: deriveDisplayReferenceV1,
  });
  if (!result.ok) {
    const status =
      result.error === 'REFERRAL_TOKEN_SECRET_UNAVAILABLE'
        ? 503
        : result.error === 'CREATOR_REFERRAL_NOT_PERMITTED'
          ? 403
          : result.error === 'STALE_ACTIVE_LINK'
            ? 409
            : 409;
    return NextResponse.json({ error: result.error }, { status, headers: PRIVATE_RESPONSE_HEADERS });
  }
  return NextResponse.json({ referral: result.snapshot }, { headers: PRIVATE_RESPONSE_HEADERS });
}
