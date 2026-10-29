import { NextResponse } from 'next/server';
import { PRIVATE_RESPONSE_HEADERS } from '../../../../../lib/m55/creatorDistribution/security';
import { buildProviderStatusBundleV1 } from '../../../../../lib/m55/creatorProvider/onboardingService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const refreshProvider = url.searchParams.get('refreshProvider') === '1';
  const returnSessionId = url.searchParams.get('session');

  try {
    const result = await buildProviderStatusBundleV1({
      refreshProvider,
      returnSessionId,
    });
    if (!result.ok) {
      const status = result.error === 'UNAUTHORIZED' ? 401 : 403;
      return NextResponse.json({ error: result.error }, { status, headers: PRIVATE_RESPONSE_HEADERS });
    }
    return NextResponse.json(result.bundle, { headers: PRIVATE_RESPONSE_HEADERS });
  } catch {
    return NextResponse.json({ error: 'PROVIDER_STATUS_UNAVAILABLE' }, { status: 503, headers: PRIVATE_RESPONSE_HEADERS });
  }
}
