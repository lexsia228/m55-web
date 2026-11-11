import { NextRequest, NextResponse } from 'next/server';
import {
  canAcceptIsolatedConnectWebhookRequestV1,
  mapConnectWebhookPersistResultToHttpV1,
  verifyStripeConnectWebhookSignatureV1,
} from '../../../../../lib/m55/creatorProvider/providerStripeConnectWebhookIngress';
import { handleVerifiedStripeConnectWebhookEventV1 } from '../../../../../lib/m55/creatorProvider/providerStripeConnectWebhookService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const gate = canAcceptIsolatedConnectWebhookRequestV1();
  if (!gate.ok) {
    return NextResponse.json(
      { error: 'CONNECT_WEBHOOK_DISABLED', checklist: gate.checklist },
      { status: gate.httpStatus },
    );
  }

  const webhookSecret =
    process.env.M55_R8_STRIPE_CONNECT_WEBHOOK_SECRET?.trim() ||
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET?.trim() ||
    '';

  let rawBody = '';
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const verified = verifyStripeConnectWebhookSignatureV1({
    rawBody,
    signatureHeader: req.headers.get('stripe-signature'),
    webhookSecret,
  });
  if (!verified.ok) {
    return NextResponse.json({ error: 'SIGNATURE_INVALID' }, { status: 400 });
  }

  const handled = await handleVerifiedStripeConnectWebhookEventV1(verified.event);
  const disposition = mapConnectWebhookPersistResultToHttpV1(handled);
  return NextResponse.json(disposition.body, { status: disposition.status });
}
