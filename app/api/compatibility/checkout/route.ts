import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '../../../../lib/stripe';
import { buildCanonicalCompatibilityPurchaseSnapshot } from '../../../../lib/m55/compatibility/buildCanonicalCompatibilityPurchaseSnapshot';
import {
  COMPATIBILITY_REPORT_FULL_PRODUCT_KEY,
  COMPATIBILITY_REPORT_PUBLIC_NAME,
  COMPATIBILITY_REPORT_QUANTITY,
  getCompatibilityStripePriceId,
  isCompatibilityCommerceEnabled,
} from '../../../../lib/m55/compatibility/compatibilityCommerceAuthority';
import {
  attachCompatibilityCheckoutSession,
  createCompatibilityPurchaseContext,
} from '../../../../lib/m55/compatibility/compatibilityCommerceDb';
import {
  isCompleteCompatibilityCurrentContextV2,
  questionsForRelationStage,
  type CompatibilityCurrentContextAnswersV2,
} from '../../../../lib/m55/compatibility/currentContextContract.v2';
import {
  isCompleteCompatibilityGuestInput,
  isValidCompatibilityRelationStatusId,
  type CompatibilityGuestInput,
} from '../../../../lib/m55/compatibility/pairReadingGuestContract';
import type { RelationStatusId } from '../../../../lib/m55/compatibility/pairReadingTypes';
import { buildPairDisplayIdentity, parsePairDisplayIdentity, type PairDisplayIdentityV1 } from '../../../../lib/m55/compatibility/pairDisplayIdentity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CHECKOUT_INPUT_KEYS = [
  'currentContext',
  'displayIdentity',
  'personA',
  'personB',
  'relationStatusId',
] as const;

function isValidCheckoutCurrentContext(
  rawContext: Record<string, unknown>,
  relationStatusId: RelationStatusId,
): rawContext is CompatibilityCurrentContextAnswersV2 {
  const allowedKeys = new Set(
    questionsForRelationStage(relationStatusId).map((question) => question.questionId),
  );
  const keys = Object.keys(rawContext);
  if (!keys.every((key) => allowedKeys.has(key as keyof CompatibilityCurrentContextAnswersV2))) {
    return false;
  }
  return isCompleteCompatibilityCurrentContextV2(rawContext, relationStatusId);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!isCompatibilityCommerceEnabled()) {
    return NextResponse.json({ error: 'not_available' }, { status: 404 });
  }
  const priceId = getCompatibilityStripePriceId();
  if (!priceId || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  let input: CompatibilityGuestInput;
  let currentContext: CompatibilityCurrentContextAnswersV2;
  let relationStatusId: RelationStatusId;
  let displayIdentity: PairDisplayIdentityV1;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    if (
      Object.keys(body).sort().join('|') !==
      [...CHECKOUT_INPUT_KEYS].sort().join('|')
    ) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }
    input = {
      personA: typeof body.personA === 'string' ? body.personA : '',
      personB: typeof body.personB === 'string' ? body.personB : '',
    };
    relationStatusId = isValidCompatibilityRelationStatusId(body.relationStatusId)
      ? body.relationStatusId
      : ('' as RelationStatusId);
    const parsedDisplayIdentity = parsePairDisplayIdentity(body.displayIdentity);
    if (!parsedDisplayIdentity) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }
    displayIdentity = buildPairDisplayIdentity(
      parsedDisplayIdentity.partnerLabel,
      relationStatusId,
    );
    const rawContext =
      body.currentContext &&
      typeof body.currentContext === 'object' &&
      !Array.isArray(body.currentContext)
        ? body.currentContext as Record<string, unknown>
        : {};
    if (!isValidCheckoutCurrentContext(rawContext, relationStatusId)) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }
    currentContext = rawContext;
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  if (!isCompleteCompatibilityGuestInput(input)) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const built = buildCanonicalCompatibilityPurchaseSnapshot(
    input,
    relationStatusId,
    currentContext,
    displayIdentity,
  );
  if (!built.ok) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const contextId = crypto.randomUUID();
  const contextCreated = await createCompatibilityPurchaseContext({
    id: contextId,
    ownerUserId: userId,
    snapshot: built.snapshot,
  });
  if (!contextCreated) {
    return NextResponse.json({ error: 'purchase_context_failed' }, { status: 500 });
  }

  const origin = req.nextUrl.origin;
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: COMPATIBILITY_REPORT_QUANTITY }],
      client_reference_id: contextId,
      metadata: {
        product_key: COMPATIBILITY_REPORT_FULL_PRODUCT_KEY,
        purchase_context_id: contextId,
      },
      success_url: `${origin}/synastry/purchase/success`,
      cancel_url: `${origin}/synastry/purchase/confirm?checkout=cancelled`,
      locale: 'ja',
      payment_intent_data: {
        description: COMPATIBILITY_REPORT_PUBLIC_NAME,
      },
      phone_number_collection: { enabled: false },
    });
    if (!session.url) {
      return NextResponse.json({ error: 'checkout_failed' }, { status: 500 });
    }
    const attached = await attachCompatibilityCheckoutSession({
      contextId,
      ownerUserId: userId,
      checkoutSessionId: session.id,
      expiresAt:
        typeof session.expires_at === 'number'
          ? new Date(session.expires_at * 1000).toISOString()
          : null,
    });
    if (!attached) {
      return NextResponse.json({ error: 'checkout_failed' }, { status: 500 });
    }
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: 'checkout_failed' }, { status: 500 });
  }
}
