import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getStripe } from '../../../../lib/stripe';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { resolveEntryReportOwnership } from '../../../../lib/m55/dtrOwnershipGate';
import { getDtrReportSnapshot, getLatestDraftForUser } from '../../../../lib/m55/dtrDraftDb';
import { DTR_CORE_RIGHT_KEY } from '../../../../lib/m55/dtrCoreCheckoutFulfillment';
import { verifyStripeCheckoutSessionForDtrUser } from '../../../../lib/m55/verifyStripeCheckoutSessionForDtr';
import { DTR_CORE_STATIC_V1 } from '../../../../lib/oneTimeCheckout';

const DTR_CORE_PRODUCT = 'DTR_CORE_STATIC_V1';

/** 準備中フロー用: DB に残る Checkout Session ID（画面には出さずリダイレクトのみに使う） */
async function getResumeCheckoutSessionIdForDtr(userId: string): Promise<string | null> {
  try {
    const db = getSupabaseAdmin() as any;
    const { data: ent } = await db
      .from('entitlements')
      .select('stripe_session_id')
      .eq('user_id', userId)
      .eq('product_id', DTR_CORE_STATIC_V1)
      .eq('status', 'active')
      .maybeSingle();
    const sid = (ent as { stripe_session_id?: string | null } | null)?.stripe_session_id;
    if (typeof sid === 'string' && sid.trim().length > 0) return sid.trim();

    const { data: otf } = await db
      .from('one_time_fulfillments')
      .select('checkout_session_id')
      .eq('user_id', userId)
      .eq('product_id', DTR_CORE_STATIC_V1)
      .order('fulfilled_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const cs = (otf as { checkout_session_id?: string } | null)?.checkout_session_id;
    if (typeof cs === 'string' && cs.trim().length > 0) return cs.trim();
  } catch (e) {
    console.error('[checkout] getResumeCheckoutSessionIdForDtr failed', e);
  }
  return null;
}

/**
 * 既存の paid Checkout Session に profileNickname / profileBirthDate が無い場合、
 * processing では missing_profile_for_snapshot のままになる。dev/staging で新規 Session を発行する escape hatch。
 * 本番では原則未設定（二重課金リスクのため）。
 */
async function resumeSessionMissingProfileMetadata(sessionId: string): Promise<boolean> {
  try {
    const stripe = getStripe();
    const s = await stripe.checkout.sessions.retrieve(sessionId);
    const m = s.metadata ?? {};
    return !m.profileNickname?.trim() || !m.profileBirthDate?.trim();
  } catch {
    return false;
  }
}

/** unlockState / 行の有無はクライアントに返さず、ログ用 whyOwned のみ */
async function logCheckout409(
  userId: string,
  code: 'already_purchased' | 'fulfillment_pending',
  hasPurchaseSnapshot: boolean,
  resumeCheckoutSessionId: string | null
): Promise<void> {
  try {
    const db = getSupabaseAdmin() as any;
    const { data: rightRow } = await db
      .from('entitlement_rights')
      .select('right_key, expires_at')
      .eq('user_id', userId)
      .eq('right_key', DTR_CORE_RIGHT_KEY)
      .maybeSingle();
    const { data: entRow } = await db
      .from('entitlements')
      .select('id, stripe_session_id')
      .eq('user_id', userId)
      .eq('product_id', DTR_CORE_STATIC_V1)
      .eq('status', 'active')
      .maybeSingle();

    let whyOwned: string;
    if (rightRow) {
      whyOwned =
        'entitlement_rights に m55_p:core_origin 行あり（期限切れでなければ SSOT で owned）';
    } else if (entRow) {
      whyOwned =
        'entitlements に DTR_CORE_STATIC_V1 active のみ → 読取時 repair で entitlement_rights が付く可能性（部分失敗・テスト残骸・手動投入の切り分け用）';
    } else {
      whyOwned =
        'owned だが entitlement_rights / entitlements の両方が取れない（不整合・要調査）';
    }

    console.info(
      '[checkout] 409',
      JSON.stringify({
        code,
        userId,
        hasPurchaseSnapshot,
        resumeCheckoutSessionId,
        whyOwned,
        hasEntitlementRightsRow: !!rightRow,
        hasActiveEntitlementsRow: !!entRow,
      })
    );
  } catch (e) {
    console.error('[checkout] logCheckout409 failed', e);
  }
}

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
    const snap = await getDtrReportSnapshot(userId, DTR_CORE_STATIC_V1);
    if (snap) {
      console.info(
        '[checkout]',
        JSON.stringify({
          event: 'dtr_purchase_path',
          path: 'purchased_resume_already_purchased_snapshot',
          userId,
          note: 'SSOT: dtr_report_snapshots row exists → 409 already_purchased',
        })
      );
      await logCheckout409(userId, 'already_purchased', true, null);
      return NextResponse.json({ code: 'already_purchased' as const }, { status: 409 });
    }

    const ownership = await resolveEntryReportOwnership(userId);
    if (ownership.unlockState === 'owned') {
      const resumeCheckoutSessionId = await getResumeCheckoutSessionIdForDtr(userId);
      const allowNewCheckoutForStaleProfile =
        process.env.DTR_ALLOW_STALE_SESSION_NEW_CHECKOUT === '1';

      let skip409IssueNewCheckout = false;
      if (allowNewCheckoutForStaleProfile && resumeCheckoutSessionId) {
        const missingProf = await resumeSessionMissingProfileMetadata(resumeCheckoutSessionId);
        if (missingProf) {
          skip409IssueNewCheckout = true;
          console.info(
            '[checkout]',
            JSON.stringify({
              event: 'dtr_purchase_path',
              path: 'fresh_purchase_stripe_session_create',
              subreason: 'stale_resume_missing_profile_metadata',
              userId,
              resumeCheckoutSessionId,
              note: 'DTR_ALLOW_STALE_SESSION_NEW_CHECKOUT=1 → new Stripe Checkout',
            })
          );
        }
      }

      if (!skip409IssueNewCheckout) {
        if (resumeCheckoutSessionId) {
          const vr = await verifyStripeCheckoutSessionForDtrUser(resumeCheckoutSessionId, userId);
          if (vr.valid) {
            console.info(
              '[checkout]',
              JSON.stringify({
                event: 'dtr_purchase_path',
                path: 'purchased_resume_fulfillment_pending',
                userId,
                resumeCheckoutSessionId: vr.sessionId,
                note: 'owned + no snapshot + valid paid session in DB → 409 resume processing',
              })
            );
            await logCheckout409(userId, 'fulfillment_pending', false, resumeCheckoutSessionId);
            return NextResponse.json(
              {
                code: 'fulfillment_pending' as const,
                resumeCheckoutSessionId: vr.sessionId,
              },
              { status: 409 }
            );
          }
          console.warn(
            '[checkout] DTR owned without snapshot; resume session id failed Stripe verify',
            JSON.stringify({ userId, resumeCheckoutSessionId })
          );
        } else {
          console.warn(
            '[checkout] DTR owned without snapshot; no resume checkout session id in DB',
            JSON.stringify({ userId })
          );
        }
        console.info(
          '[checkout]',
          JSON.stringify({
            event: 'dtr_purchase_path',
            path: 'purchased_resume_fulfillment_pending',
            userId,
            resumeCheckoutSessionId: null,
            note: 'owned + no snapshot + no resume id or verify failed → 409',
          })
        );
        await logCheckout409(userId, 'fulfillment_pending', false, null);
        return NextResponse.json({ code: 'fulfillment_pending' as const }, { status: 409 });
      }
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
  let pn = body.profile?.nickname?.trim();
  let pb = body.profile?.birthDate?.trim().slice(0, 10);
  // クライアント未送信でも、サーバー側 dtr_guest_drafts があれば Checkout Session metadata に載せる（fulfill で優先利用）
  if (!pn || !pb) {
    try {
      const draft = await getLatestDraftForUser(userId);
      if (draft?.nickname && draft.birth_date) {
        if (!pn) pn = draft.nickname.trim();
        if (!pb) pb = String(draft.birth_date).slice(0, 10);
      }
    } catch {
      /* no-op */
    }
  }
  if (pn && pb) {
    metadata.profileNickname = pn.slice(0, 120);
    metadata.profileBirthDate = pb;
  }

  if (productId === DTR_CORE_PRODUCT) {
    console.info(
      '[checkout]',
      JSON.stringify({
        event: 'dtr_purchase_path',
        path: 'fresh_purchase_stripe_session_create',
        userId,
        note: 'Stripe checkout.sessions.create (new user, unowned, or stale-session escape)',
      })
    );
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

    console.info(
      '[checkout]',
      JSON.stringify({
        event: 'stripe_checkout_session_created',
        sessionId: session.id,
        hasProfileMetadata: !!(metadata.profileNickname && metadata.profileBirthDate),
      })
    );

    return NextResponse.json({ url });
  } catch (e) {
    console.error('[checkout]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Checkout failed' },
      { status: 500 }
    );
  }
}
