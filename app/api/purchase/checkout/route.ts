import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getStripe } from '../../../../lib/stripe';
import { resolveEntryReportOwnership } from '../../../../lib/m55/dtrOwnershipGate';
import { getDtrReportSnapshot } from '../../../../lib/m55/dtrDraftDb';
import { DTR_PROCESSING_PATH } from '../../../../lib/m55/dtrRoutes';
import { DTR_CORE_STATIC_V1 } from '../../../../lib/oneTimeCheckout';

const DTR_CORE_PRODUCT = 'DTR_CORE_STATIC_V1';

const PRODUCT_ID_TO_ENV: Record<string, string> = {
  DTR_CORE_STATIC_V1: 'STRIPE_PRICE_DTR_CORE_STATIC_V1',
};

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 503 }
    );
  }

  let body: {
    productId?: string;
    profile?: { nickname?: string; birthDate?: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const productId = body?.productId;
  if (!productId || typeof productId !== 'string') {
    return NextResponse.json(
      { error: 'productId is required' },
      { status: 400 }
    );
  }

  if (productId === DTR_CORE_PRODUCT) {
    const ownership = await resolveEntryReportOwnership(userId);
    const hasOwnership = ownership.unlockState === 'owned';
    const snap = hasOwnership ? await getDtrReportSnapshot(userId, DTR_CORE_STATIC_V1) : null;
    const hasPurchaseSnapshot = snap != null;

    if (ownership.unlockState === 'owned') {
      if (snap) {
        return NextResponse.json(
          {
            code: 'already_purchased' as const,
            unlockState: ownership.unlockState,
            hasOwnership,
            hasPurchaseSnapshot,
            userId,
            error: 'already_purchased',
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        {
          code: 'fulfillment_pending' as const,
          unlockState: ownership.unlockState,
          hasOwnership,
          hasPurchaseSnapshot,
          userId,
          error: 'fulfillment_pending',
        },
        { status: 409 }
      );
    }
  }

  const envKey = PRODUCT_ID_TO_ENV[productId];
  const priceId = envKey ? process.env[envKey] : undefined;
  if (!priceId) {
    return NextResponse.json(
      { error: `Product ${productId} is not configured (missing env: ${envKey ?? 'N/A'})` },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  const origin = req.headers.get('origin') ?? req.nextUrl.origin;

  // Clerk ユーザーの primary email を取得（prefill 用、失敗しても checkout は続行）
  const clerkUser = await currentUser();
  const customerEmail =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses?.[0]?.emailAddress ??
    undefined;

  const metadata: Record<string, string> = { productId };
  const pn = body.profile?.nickname?.trim();
  const pb = body.profile?.birthDate?.trim().slice(0, 10);
  if (pn && pb) {
    metadata.profileNickname = pn.slice(0, 120);
    metadata.profileBirthDate = pb;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/dtr/processing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dtr/lp?checkout=cancelled`,
      client_reference_id: userId,
      metadata,
      locale: 'ja',
      payment_intent_data: {
        description: 'Reflect Report',
      },
      phone_number_collection: { enabled: false },
      ...(customerEmail ? { customer_email: customerEmail } : {}),
    });

    const url = session.url;
    if (!url) {
      return NextResponse.json(
        { error: 'Stripe session URL not created' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url });
  } catch (e) {
    console.error('[checkout]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Checkout failed' },
      { status: 500 }
    );
  }
}
