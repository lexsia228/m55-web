/**
 * POST /api/reply-tickets/checkout — M55 additional reply-ticket lane (Phase II skeleton).
 * Isolated from DTR /purchase/checkout and oneTime ALLOWED_ONE_TIME_PRODUCTS.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getStripe } from '../../../../lib/stripe';
import {
  ADDITIONAL_REPLY_TICKET_PRODUCT_KEY,
  REPLY_TICKET_CHECKOUT_METADATA_KEYS,
  REPLY_TICKET_PURCHASE_QUANTITY,
} from '../../../../lib/m55/reply/replyTicketCheckoutConstants';
import type { ReplyTicketCheckoutErrorCode } from '../../../../lib/m55/reply/replyTicketCheckoutConstants';
import {
  validateReplyTicketCheckoutBody,
  validateReplyTicketCheckoutGate,
} from '../../../../lib/m55/reply/replyTicketCheckoutValidate';
import { hashUserIdForLedgerLog } from '../../../../lib/m55/reply/readReplyWalletProbe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STRIPE_PRICE_ENV = 'STRIPE_PRICE_ADDITIONAL_REPLY_TICKET';

function jsonError(code: ReplyTicketCheckoutErrorCode, status: number, message?: string) {
  return NextResponse.json({ error: { code, ...(message ? { message } : {}) } }, { status });
}

/** Maps contract errors to HTTP (skeleton Phase II). */
function statusForError(code: ReplyTicketCheckoutErrorCode): number {
  switch (code) {
    case 'unauthenticated':
      return 401;
    case 'forbidden_not_owner':
      return 403;
    case 'wallet_not_found':
      return 404;
    case 'invalid_request':
    case 'invalid_product':
    case 'wallet_not_active':
    case 'cap_reached':
      return 422;
    case 'stripe_error':
      return 502;
    default:
      return 500;
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return jsonError('unauthenticated', 401);
  }

  let bodyUnknown: unknown;
  try {
    bodyUnknown = await req.json();
  } catch {
    return jsonError('invalid_request', 422, 'Invalid JSON body');
  }

  const parsed = validateReplyTicketCheckoutBody(bodyUnknown);
  if ('error' in parsed) {
    return jsonError(parsed.error, statusForError(parsed.error));
  }

  const gate = await validateReplyTicketCheckoutGate({
    userId,
    reportInstanceId: parsed.reportInstanceId,
  });
  if (!gate.ok) {
    return jsonError(gate.code, statusForError(gate.code));
  }

  const priceId = process.env[STRIPE_PRICE_ENV]?.trim();
  const stripeSecretPresent = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  if (!priceId) {
    console.error(
      '[reply-tickets/checkout] failed',
      JSON.stringify({
        stage: 'price_env_missing',
        userHash: hashUserIdForLedgerLog(userId),
        reportInstanceIdPresent: Boolean(parsed.reportInstanceId),
        stripePricePresent: Boolean(priceId),
        stripeSecretPresent,
      })
    );
    return jsonError(
      'stripe_error',
      503,
      `Stripe price not configured (env ${STRIPE_PRICE_ENV})`
    );
  }

  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe();
  } catch (e) {
    console.error(
      '[reply-tickets/checkout] failed',
      JSON.stringify({
        stage: 'stripe_client_create_failed',
        userHash: hashUserIdForLedgerLog(userId),
        reportInstanceIdPresent: Boolean(parsed.reportInstanceId),
        stripePricePresent: Boolean(priceId),
        stripeSecretPresent,
        errorMessage: e instanceof Error ? e.message : 'unknown',
      })
    );
    return jsonError('stripe_error', 503, 'Stripe client not configured');
  }

  const origin = req.headers.get('origin') ?? req.nextUrl.origin;
  const clerkUser = await currentUser();
  const customerEmail =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses?.[0]?.emailAddress ??
    undefined;

  const mdKey = REPLY_TICKET_CHECKOUT_METADATA_KEYS;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: REPLY_TICKET_PURCHASE_QUANTITY }],
      success_url: `${origin}/dtr/core?checkout=complete`,
      cancel_url: `${origin}/dtr/core?checkout=cancelled`,
      client_reference_id: userId,
      locale: 'ja',
      metadata: {
        [mdKey.productKey]: ADDITIONAL_REPLY_TICKET_PRODUCT_KEY,
        [mdKey.reportInstanceId]: parsed.reportInstanceId,
        [mdKey.userRefHash]: hashUserIdForLedgerLog(userId),
        [mdKey.quantity]: String(REPLY_TICKET_PURCHASE_QUANTITY),
      },
      ...(customerEmail ? { customer_email: customerEmail } : {}),
    });

    const checkout_url = session.url;
    const session_id = session.id;
    if (!checkout_url) {
      console.warn(
        '[reply-tickets/checkout] failed',
        JSON.stringify({
          stage: 'session_url_missing',
          userHash: hashUserIdForLedgerLog(userId),
          reportInstanceIdPresent: Boolean(parsed.reportInstanceId),
          stripePricePresent: Boolean(priceId),
          stripeSecretPresent,
          sessionIdPresent: Boolean(session_id),
        })
      );
      return jsonError('stripe_error', 502, 'Stripe session URL not created');
    }

    console.info(
      '[reply-tickets/checkout]',
      JSON.stringify({
        event: 'reply_ticket_checkout_session_created',
        session_id_present: Boolean(session_id),
        report_instance_id_present: Boolean(parsed.reportInstanceId),
        product_key: ADDITIONAL_REPLY_TICKET_PRODUCT_KEY,
        checkout_url_created: Boolean(checkout_url),
      })
    );

    return NextResponse.json({ checkout_url, session_id });
  } catch (e) {
    const stripeError = e as { type?: string; code?: string; message?: string };
    console.error(
      '[reply-tickets/checkout] failed',
      JSON.stringify({
        stage: 'stripe_session_create_failed',
        userHash: hashUserIdForLedgerLog(userId),
        reportInstanceIdPresent: Boolean(parsed.reportInstanceId),
        stripePricePresent: Boolean(priceId),
        stripeSecretPresent,
        errorType: typeof stripeError?.type === 'string' ? stripeError.type : 'unknown',
        errorCode: typeof stripeError?.code === 'string' ? stripeError.code : 'unknown',
        errorMessage: typeof stripeError?.message === 'string' ? stripeError.message : 'unknown',
      })
    );
    return jsonError('stripe_error', 502);
  }
}
