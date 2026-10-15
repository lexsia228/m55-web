import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '../../../../lib/stripe';
import { buildCanonicalCompatibilityPurchaseSnapshot } from '../../../../lib/m55/compatibility/buildCanonicalCompatibilityPurchaseSnapshot';
import {
  COMPATIBILITY_REPORT_CURRENCY,
  COMPATIBILITY_REPORT_FULL_PRODUCT_KEY,
  COMPATIBILITY_REPORT_PRICE_YEN,
  COMPATIBILITY_REPORT_PUBLIC_NAME,
  COMPATIBILITY_REPORT_QUANTITY,
  getCompatibilityStripePriceId,
  isCompatibilityCommerceEnabled,
} from '../../../../lib/m55/compatibility/compatibilityCommerceAuthority';
import {
  acquireCompatibilityCheckoutCreateSlot,
  casAttachCompatibilityCheckoutSession,
  compatibilityStripeCheckoutIdempotencyKey,
  findOwnedCompatibilityReportIdByIdentity,
  getCompatibilityPurchaseContextForCheckoutResume,
  releaseExpiredCompatibilityCheckoutContext,
  reserveCompatibilityCheckoutContext,
  type CompatibilityPurchaseContextResumeRow,
} from '../../../../lib/m55/compatibility/compatibilityCommerceDb';
import { isStrictUuidV4 } from '../../../../lib/m55/compatibility/pairOwnedStateIdentity';
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
  'pairIdentityId',
  'paidContextId',
  'personA',
  'personB',
  'relationStatusId',
] as const;

type CheckoutResumeAttempt =
  | { kind: 'resume_url'; url: string }
  | { kind: 'released_expired' }
  | { kind: 'fail_closed' };

function isTrustedStripeCheckoutUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname === 'checkout.stripe.com';
  } catch {
    return false;
  }
}

function lineItemPriceId(item: Stripe.LineItem): string | null {
  if (!item.price) return null;
  return typeof item.price === 'string' ? item.price : item.price.id;
}

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

async function verifyCheckoutSessionPurchaseBinding(
  stripe: Pick<Stripe, 'checkout'>,
  session: Stripe.Checkout.Session,
  params: {
    contextId: string;
    stripePriceId: string;
    dbRow: CompatibilityPurchaseContextResumeRow;
  },
): Promise<boolean> {
  const { contextId, stripePriceId, dbRow } = params;
  if (session.id !== dbRow.stripeCheckoutSessionId) return false;
  if (dbRow.id !== contextId) return false;
  if (dbRow.productKey !== COMPATIBILITY_REPORT_FULL_PRODUCT_KEY) return false;
  if (session.mode !== 'payment' || session.subscription) return false;

  const metadata = session.metadata ?? {};
  const metadataKeys = Object.keys(metadata).sort();
  if (
    metadataKeys.length !== 2 ||
    metadataKeys[0] !== 'product_key' ||
    metadataKeys[1] !== 'purchase_context_id' ||
    metadata.product_key !== COMPATIBILITY_REPORT_FULL_PRODUCT_KEY ||
    metadata.purchase_context_id !== contextId ||
    session.client_reference_id !== contextId
  ) {
    return false;
  }

  let lineItems: Stripe.ApiList<Stripe.LineItem>;
  try {
    lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 2,
      expand: ['data.price'],
    });
  } catch {
    return false;
  }
  if (lineItems.data.length !== 1) return false;
  const item = lineItems.data[0]!;
  if (lineItemPriceId(item) !== stripePriceId) return false;
  if (item.quantity !== COMPATIBILITY_REPORT_QUANTITY) return false;
  if (
    item.amount_total !== COMPATIBILITY_REPORT_PRICE_YEN ||
    session.amount_total !== COMPATIBILITY_REPORT_PRICE_YEN
  ) {
    return false;
  }
  if (
    item.currency?.toLowerCase() !== COMPATIBILITY_REPORT_CURRENCY ||
    session.currency?.toLowerCase() !== COMPATIBILITY_REPORT_CURRENCY
  ) {
    return false;
  }

  return true;
}

async function verifyOpenCheckoutSessionForResume(
  stripe: Pick<Stripe, 'checkout'>,
  session: Stripe.Checkout.Session,
  params: {
    contextId: string;
    stripePriceId: string;
    dbRow: CompatibilityPurchaseContextResumeRow;
  },
): Promise<string | null> {
  if (session.status !== 'open' || session.payment_status !== 'unpaid') return null;
  if (!session.url || !isTrustedStripeCheckoutUrl(session.url)) return null;
  if (
    typeof session.expires_at === 'number' &&
    session.expires_at * 1000 <= Date.now()
  ) {
    return null;
  }
  const bindingOk = await verifyCheckoutSessionPurchaseBinding(stripe, session, params);
  if (!bindingOk) return null;
  return session.url;
}

async function attemptCheckoutInProgressResume(
  stripe: Pick<Stripe, 'checkout'>,
  params: {
    contextId: string;
    ownerUserId: string;
    pairIdentityId: string;
    paidContextId: string;
    stripePriceId: string;
  },
): Promise<CheckoutResumeAttempt> {
  const dbRow = await getCompatibilityPurchaseContextForCheckoutResume(params.contextId);
  if (
    !dbRow ||
    dbRow.ownerUserId !== params.ownerUserId ||
    dbRow.pairIdentityId !== params.pairIdentityId ||
    dbRow.paidContextId !== params.paidContextId ||
    !dbRow.stripeCheckoutSessionId
  ) {
    return { kind: 'fail_closed' };
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(dbRow.stripeCheckoutSessionId);
  } catch {
    return { kind: 'fail_closed' };
  }

  if (session.status === 'open' && session.payment_status === 'unpaid') {
    const url = await verifyOpenCheckoutSessionForResume(stripe, session, {
      contextId: params.contextId,
      stripePriceId: params.stripePriceId,
      dbRow,
    });
    if (url) {
      return { kind: 'resume_url', url };
    }
    return { kind: 'fail_closed' };
  }

  if (session.status === 'expired' && session.payment_status === 'unpaid') {
    const bindingOk = await verifyCheckoutSessionPurchaseBinding(stripe, session, {
      contextId: params.contextId,
      stripePriceId: params.stripePriceId,
      dbRow,
    });
    if (!bindingOk) {
      return { kind: 'fail_closed' };
    }
    const released = await releaseExpiredCompatibilityCheckoutContext({
      contextId: params.contextId,
      ownerUserId: params.ownerUserId,
      checkoutSessionId: session.id,
    });
    return released ? { kind: 'released_expired' } : { kind: 'fail_closed' };
  }

  return { kind: 'fail_closed' };
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
  let pairIdentityId: string;
  let paidContextId: string;
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
    pairIdentityId = typeof body.pairIdentityId === 'string' ? body.pairIdentityId : '';
    paidContextId = typeof body.paidContextId === 'string' ? body.paidContextId : '';
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  if (
    !isCompleteCompatibilityGuestInput(input) ||
    !isStrictUuidV4(pairIdentityId) ||
    !isStrictUuidV4(paidContextId)
  ) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const ownedLookup = await findOwnedCompatibilityReportIdByIdentity({
    ownerUserId: userId,
    pairIdentityId,
    paidContextId,
  });
  if (ownedLookup.kind === 'owned') {
    return NextResponse.json({
      kind: 'already_owned',
      reportId: ownedLookup.reportId,
    });
  }
  if (ownedLookup.kind === 'unavailable' || ownedLookup.kind === 'ambiguous') {
    return NextResponse.json({ error: 'ownership_unavailable' }, { status: 503 });
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

  let clerkUser: Awaited<ReturnType<typeof currentUser>>;
  try {
    clerkUser = await currentUser();
  } catch {
    return NextResponse.json({ kind: 'checkout_unknown' }, { status: 503 });
  }
  const customerEmail =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses?.[0]?.emailAddress ??
    undefined;

  const checkoutOriginFrozen = req.nextUrl.origin;
  const stripe = getStripe();
  let contextId = crypto.randomUUID();
  let leaseToken = crypto.randomUUID();
  let reserved = await reserveCompatibilityCheckoutContext({
    contextId,
    ownerUserId: userId,
    pairIdentityId,
    paidContextId,
    snapshot: built.snapshot,
    checkoutOriginFrozen,
  });

  if (reserved.kind === 'already_owned') {
    return NextResponse.json({
      kind: 'already_owned',
      reportId: reserved.reportId,
    });
  }

  if (reserved.kind === 'checkout_in_progress') {
    const resume = await attemptCheckoutInProgressResume(stripe, {
      contextId: reserved.contextId,
      ownerUserId: userId,
      pairIdentityId,
      paidContextId,
      stripePriceId: priceId,
    });
    if (resume.kind === 'resume_url') {
      return NextResponse.json({ kind: 'checkout', url: resume.url });
    }
    if (resume.kind === 'released_expired') {
      contextId = crypto.randomUUID();
      leaseToken = crypto.randomUUID();
      reserved = await reserveCompatibilityCheckoutContext({
        contextId,
        ownerUserId: userId,
        pairIdentityId,
        paidContextId,
        snapshot: built.snapshot,
        checkoutOriginFrozen,
      });
      if (reserved.kind === 'already_owned') {
        return NextResponse.json({
          kind: 'already_owned',
          reportId: reserved.reportId,
        });
      }
    } else {
      return NextResponse.json({ kind: 'checkout_unknown' }, { status: 503 });
    }
  }

  if (reserved.kind === 'checkout_unknown') {
    return NextResponse.json({ kind: 'checkout_unknown' }, { status: 503 });
  }
  if (reserved.kind === 'unavailable') {
    return NextResponse.json({ error: 'purchase_context_failed' }, { status: 503 });
  }
  if (reserved.kind === 'checkout_in_progress') {
    return NextResponse.json({ kind: 'checkout_unknown' }, { status: 503 });
  }

  const slotAcquired = await acquireCompatibilityCheckoutCreateSlot({
    contextId: reserved.contextId,
    ownerUserId: userId,
    leaseToken,
  });
  if (!slotAcquired) {
    return NextResponse.json({ kind: 'checkout_unknown' }, { status: 503 });
  }

  const stripeCreateParams = {
    mode: 'payment' as const,
    line_items: [{ price: priceId, quantity: COMPATIBILITY_REPORT_QUANTITY }],
    client_reference_id: reserved.contextId,
    metadata: {
      product_key: COMPATIBILITY_REPORT_FULL_PRODUCT_KEY,
      purchase_context_id: reserved.contextId,
    },
    success_url: `${checkoutOriginFrozen}/synastry/purchase/success`,
    cancel_url: `${checkoutOriginFrozen}/synastry/purchase/confirm?checkout=cancelled`,
    locale: 'ja' as const,
    payment_intent_data: {
      description: COMPATIBILITY_REPORT_PUBLIC_NAME,
    },
    phone_number_collection: { enabled: false },
    ...(customerEmail ? { customer_email: customerEmail } : {}),
  };

  try {
    const session = await stripe.checkout.sessions.create(stripeCreateParams, {
      idempotencyKey: compatibilityStripeCheckoutIdempotencyKey(reserved.contextId),
      maxNetworkRetries: 0,
    });
    if (!session.url) {
      return NextResponse.json({ kind: 'checkout_unknown' }, { status: 503 });
    }
    const attached = await casAttachCompatibilityCheckoutSession({
      contextId: reserved.contextId,
      ownerUserId: userId,
      checkoutSessionId: session.id,
      expiresAt:
        typeof session.expires_at === 'number'
          ? new Date(session.expires_at * 1000).toISOString()
          : null,
      leaseToken,
    });
    if (!attached) {
      return NextResponse.json({ kind: 'checkout_unknown' }, { status: 503 });
    }
    return NextResponse.json({ kind: 'checkout', url: session.url });
  } catch {
    return NextResponse.json({ kind: 'checkout_unknown' }, { status: 503 });
  }
}
