import { NextResponse } from 'next/server';
import { PRIVATE_RESPONSE_HEADERS } from '../../../../../lib/m55/creatorDistribution/security';
import { saveCreatorTaxProfileForSessionV1 } from '../../../../../lib/m55/creatorProvider/onboardingService';
import type { R8TaxProfileInputV1 } from '../../../../../lib/m55/creatorProvider/contract';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function parseBody(raw: unknown): R8TaxProfileInputV1 | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = raw as Record<string, unknown>;
  return {
    payeeType: body.payeeType as R8TaxProfileInputV1['payeeType'],
    invoiceRegistrationStatus: body.invoiceRegistrationStatus as R8TaxProfileInputV1['invoiceRegistrationStatus'],
    invoiceRegistrationNumberIfAny:
      typeof body.invoiceRegistrationNumberIfAny === 'string' ? body.invoiceRegistrationNumberIfAny : null,
  };
}

export async function PUT(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400, headers: PRIVATE_RESPONSE_HEADERS });
  }
  const input = parseBody(json);
  if (!input) {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400, headers: PRIVATE_RESPONSE_HEADERS });
  }

  const result = await saveCreatorTaxProfileForSessionV1(input);
  if (!result.ok) {
    const status =
      result.error === 'UNAUTHORIZED'
        ? 401
        : result.error === 'FORBIDDEN' || result.error === 'CREATOR_PROFILE_REQUIRED'
          ? 403
          : result.error === 'TAX_PROFILE_INVALID'
            ? 400
            : 503;
    return NextResponse.json({ error: result.error }, { status, headers: PRIVATE_RESPONSE_HEADERS });
  }
  return NextResponse.json({ taxProfile: result.taxProfile }, { headers: PRIVATE_RESPONSE_HEADERS });
}
