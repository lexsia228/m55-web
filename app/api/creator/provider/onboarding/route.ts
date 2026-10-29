import { NextResponse } from 'next/server';
import { PRIVATE_RESPONSE_HEADERS } from '../../../../../lib/m55/creatorDistribution/security';
import { startCreatorProviderOnboardingV1 } from '../../../../../lib/m55/creatorProvider/onboardingService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400, headers: PRIVATE_RESPONSE_HEADERS });
  }
  const body = json as Record<string, unknown>;
  const action = body.action === 'RESUME' ? 'RESUME' : body.action === 'START' ? 'START' : null;
  const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : null;
  if (!action || !idempotencyKey) {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400, headers: PRIVATE_RESPONSE_HEADERS });
  }

  const result = await startCreatorProviderOnboardingV1({ action, idempotencyKey });
  if (!result.ok) {
    const status =
      result.error === 'UNAUTHORIZED'
        ? 401
        : result.error === 'FORBIDDEN' ||
            result.error === 'CREATOR_PROFILE_REQUIRED' ||
            result.error === 'COMPLIANCE_HOLD' ||
            result.error === 'TAX_PROFILE_REQUIRED' ||
            result.error === 'PROVIDER_ADAPTER_DISABLED' ||
            result.error === 'CREATOR_CONTACT_EMAIL_REQUIRED'
          ? 403
          : result.error === 'INVALID_INPUT' || result.error === 'ORIGIN_MISCONFIGURED'
            ? 400
            : 503;
    return NextResponse.json({ error: result.error }, { status, headers: PRIVATE_RESPONSE_HEADERS });
  }
  return NextResponse.json(
    { onboardingUrl: result.onboardingUrl, sessionId: result.sessionId, reused: result.reused },
    { headers: PRIVATE_RESPONSE_HEADERS },
  );
}
