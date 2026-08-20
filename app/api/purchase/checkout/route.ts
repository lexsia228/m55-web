import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import type Stripe from 'stripe';
import { getStripe } from '../../../../lib/stripe';
import {
  isStaleSessionEscapeAllowed,
  resolveTrustedCheckoutOrigin,
} from '../../../../lib/m55/trustedCheckoutOrigin';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { resolveEntryReportOwnership } from '../../../../lib/m55/dtrOwnershipGate';
import {
  getLatestDraftForUser,
  getDraftById,
  upsertGuestDraftPurchaseContext,
} from '../../../../lib/m55/dtrDraftDb';
import { resolveDtrCoreCheckoutSnapshotGate } from '../../../../lib/m55/dtrCheckoutRepurchaseLane';
import { DTR_CORE_RIGHT_KEY } from '../../../../lib/m55/dtrCoreCheckoutFulfillment';
import { verifyStripeCheckoutSessionForDtrUser } from '../../../../lib/m55/verifyStripeCheckoutSessionForDtr';
import {
  DTR_CORE_FULL_V1,
  DTR_CORE_LIGHT_V1,
  DTR_CORE_STATIC_V1,
  isDtrCoreLightToFullUpgradeProduct,
  isDtrCoreSavedReportOneTimeProduct,
  resolveOneTimeStripePriceId,
} from '../../../../lib/oneTimeCheckout';
import { STRIPE_CHECKOUT_PUBLIC_COPY } from '../../../../lib/m55/stripeCheckoutPublicCopy';
import { validateDtrCheckoutProfile } from '../../../../lib/m55/compositeStem/checkoutProfileGate';
import { INPUT_VERSION_V1, ENGINE_VERSION_V2 } from '../../../../lib/m55/compositeStem/constants';
import { runM55CompositeStemPipeline } from '../../../../lib/m55/compositeStem/pipeline';
import { toCompositeCanonicalInput } from '../../../../lib/m55/compositeStem/parseFulfillmentMetadata';
import {
  buildPurchaseInputSnapshotV1,
  purchaseInputExtraJson,
} from '../../../../lib/m55/paidResult/purchaseInputSnapshotV1';
import {
  buildOpaqueStripeCheckoutMetadata,
  hashOpaqueUserRef,
} from '../../../../lib/m55/paidResult/stripeOpaqueCheckoutRefs';
import {
  birthProfileFromCheckoutBody,
  mergeBirthProfileWithDraftExtra,
} from '../../../../lib/soul/birthProfileV2';
import {
  buildCheckoutIdempotencyKey,
  readPendingCheckoutExtra,
  resolveCheckoutPurchaseContextId,
} from '../../../../lib/m55/purchaseCheckoutStartedAction';
import type { BirthProfile } from '../../../../lib/soul/profile';

const CHECKOUT_PUBLIC_CODE = 'checkout_unavailable' as const;

function resolveSavedReportPaymentIntentDescriptionJa(productId: string): string | null {
  if (productId === DTR_CORE_FULL_V1) {
    return STRIPE_CHECKOUT_PUBLIC_COPY.full.publicNameJa;
  }
  if (productId === DTR_CORE_LIGHT_V1 || productId === DTR_CORE_STATIC_V1) {
    return STRIPE_CHECKOUT_PUBLIC_COPY.light.publicNameJa;
  }
  return null;
}

function publicCheckoutError(status: number, code: string = CHECKOUT_PUBLIC_CODE) {
  return NextResponse.json({ code, error: CHECKOUT_PUBLIC_CODE }, { status });
}

type CheckoutSessionReuseResult =
  | { kind: 'open'; url: string }
  | { kind: 'paid'; url: string }
  | { kind: 'unusable' }
  | { kind: 'retrieve_failed' };

async function resolveCheckoutSessionReuse(
  stripe: Stripe,
  sessionId: string,
  productId: string,
  origin: string,
): Promise<CheckoutSessionReuseResult> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (
      session.status === 'open' &&
      session.metadata?.productId === productId &&
      typeof session.url === 'string' &&
      session.url.trim().length > 0
    ) {
      return { kind: 'open', url: session.url.trim() };
    }
    if (
      session.status === 'complete' &&
      session.payment_status === 'paid' &&
      session.metadata?.productId === productId
    ) {
      return {
        kind: 'paid',
        url: `${origin}/dtr/processing?session_id=${encodeURIComponent(sessionId)}`,
      };
    }
    return { kind: 'unusable' };
  } catch (e) {
    console.warn(
      '[checkout]',
      JSON.stringify({
        lane: 'personal_premium',
        event: 'session_reuse_retrieve',
        status: 'retrieve_failed',
        failure_reason: e instanceof Error ? e.name : 'unknown',
        session_id_present: true,
      }),
    );
    return { kind: 'retrieve_failed' };
  }
}

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
    console.error(
      '[checkout]',
      JSON.stringify({
        lane: 'personal_premium',
        event: 'resume_session_lookup',
        status: 'failed',
        failure_reason: e instanceof Error ? e.name : 'unknown',
      }),
    );
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
        user_id_present: true,
        hasPurchaseSnapshot,
        resume_checkout_session_id_present: !!resumeCheckoutSessionId,
        whyOwned,
        hasEntitlementRightsRow: !!rightRow,
        hasActiveEntitlementsRow: !!entRow,
      })
    );
  } catch (e) {
    console.error(
      '[checkout]',
      JSON.stringify({
        lane: 'personal_premium',
        event: 'log_checkout_409',
        status: 'failed',
        failure_reason: e instanceof Error ? e.name : 'unknown',
      }),
    );
  }
}


export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    console.error('[checkout] STRIPE_SECRET_KEY missing');
    return publicCheckoutError(503);
  }

  let body: {
    productId?: string;
    repurchaseAcknowledged?: boolean;
    profile?: {
      nickname?: string;
      birthDate?: string;
      birthTime?: string | null;
      birthTimeUnknown?: boolean;
      country?: string;
      birthplace?: string | null;
      timezone?: string | null;
    };
    freeAnswerSet?: Record<string, string>;
    paidAnswerSet?: Record<string, string>;
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

  if (isDtrCoreLightToFullUpgradeProduct(productId)) {
    return NextResponse.json(
      {
        error: 'invalid_product',
        message: 'Use POST /api/reply-tickets/checkout with product_key dtr_core_light_to_full_upgrade_v1',
      },
      { status: 400 }
    );
  }

  if (!isDtrCoreSavedReportOneTimeProduct(productId)) {
    return NextResponse.json(
      { error: `Product ${productId} is not allowed on this route` },
      { status: 400 }
    );
  }

  let dtrRepurchaseLane = false;

  if (isDtrCoreSavedReportOneTimeProduct(productId)) {
    const snapGate = await resolveDtrCoreCheckoutSnapshotGate(userId);
    if (snapGate.action === 'block_already_purchased') {
      console.info(
        '[checkout]',
        JSON.stringify({
          event: 'dtr_purchase_path',
          path: 'purchased_resume_already_purchased_visible_snapshot',
          user_id_present: true,
          note: 'SSOT: visible dtr_report_snapshots row → 409 already_purchased',
        })
      );
      await logCheckout409(userId, 'already_purchased', true, null);
      return NextResponse.json({ code: 'already_purchased' as const }, { status: 409 });
    }

    dtrRepurchaseLane = snapGate.action === 'allow' && snapGate.repurchaseLane;

    const ownership = await resolveEntryReportOwnership(userId);
    if (ownership.unlockState === 'owned' && !dtrRepurchaseLane) {
      const resumeCheckoutSessionId = await getResumeCheckoutSessionIdForDtr(userId);
      const allowNewCheckoutForStaleProfile = isStaleSessionEscapeAllowed();

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
              user_id_present: true,
              resume_checkout_session_id_present: true,
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
                user_id_present: true,
                resume_checkout_session_id_present: true,
                session_id_present: !!vr.sessionId,
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
            JSON.stringify({
              user_id_present: true,
              resume_checkout_session_id_present: true,
            })
          );
        } else {
          console.warn(
            '[checkout] DTR owned without snapshot; no resume checkout session id in DB',
            JSON.stringify({
              user_id_present: true,
              resume_checkout_session_id_present: false,
            })
          );
        }
        console.info(
          '[checkout]',
          JSON.stringify({
            event: 'dtr_purchase_path',
            path: 'purchased_resume_fulfillment_pending',
            user_id_present: true,
            resume_checkout_session_id_present: false,
            note: 'owned + no snapshot + no resume id or verify failed → 409',
          })
        );
        await logCheckout409(userId, 'fulfillment_pending', false, null);
        return NextResponse.json({ code: 'fulfillment_pending' as const }, { status: 409 });
      }
    }

    if (dtrRepurchaseLane && ownership.unlockState === 'owned') {
      console.info(
        '[checkout]',
        JSON.stringify({
          event: 'dtr_purchase_path',
          path: 'repurchase_lane_hidden_only',
          user_id_present: true,
          note: 'owned + hidden-only snapshot(s) → allow new Stripe Checkout (no fulfillment_pending 409)',
        })
      );
    }
  }

  if (dtrRepurchaseLane && body.repurchaseAcknowledged !== true) {
    return NextResponse.json(
      { code: 'repurchase_ack_required', error: 'repurchase_ack_required' },
      { status: 400 },
    );
  }

  const resolvedPrice = resolveOneTimeStripePriceId(productId);
  const priceId = resolvedPrice.priceId;
  if (!priceId) {
    console.error('[checkout] price env missing', {
      productId,
      envKey: resolvedPrice.envKey ?? null,
    });
    return publicCheckoutError(503);
  }
  if (resolvedPrice.fallbackEnvKey) {
    console.info('[checkout] price env fallback', {
      productId,
      envKey: resolvedPrice.envKey ?? null,
      fallbackEnvKey: resolvedPrice.fallbackEnvKey,
    });
  }

  const stripe = getStripe();
  const origin = resolveTrustedCheckoutOrigin({
    requestOrigin: req.headers.get('origin'),
    fallbackOrigin: req.nextUrl.origin,
  });

  // Clerk ユーザーの primary email を取得（prefill 用、失敗しても checkout は続行）
  const clerkUser = await currentUser();
  const customerEmail =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses?.[0]?.emailAddress ??
    undefined;

  let resolvedProfile: BirthProfile | null = birthProfileFromCheckoutBody(body.profile);
  let draftExtra: Record<string, unknown> | null = null;
  let draftIdForContext: string | null = null;
  try {
    const draft = await getLatestDraftForUser(userId);
    if (draft?.nickname && draft.birth_date) {
      draftIdForContext = draft.id;
      const base =
        resolvedProfile ??
        ({
          nickname: draft.nickname.trim(),
          birthDate: String(draft.birth_date).slice(0, 10),
        } as BirthProfile);
      draftExtra = (draft.extra_json as Record<string, unknown> | null) ?? null;
      resolvedProfile = mergeBirthProfileWithDraftExtra(base, draftExtra);
    }
  } catch {
    /* no-op */
  }

  if (isDtrCoreSavedReportOneTimeProduct(productId)) {
    const gate = validateDtrCheckoutProfile(resolvedProfile);
    if (!gate.ok) {
      console.info(
        '[checkout]',
        JSON.stringify({
          event: 'dtr_checkout_blocked',
          code: gate.code,
          reason: gate.reason,
          user_id_present: true,
        }),
      );
      return NextResponse.json(
        {
          code: gate.code,
          error: 'composite_profile_incomplete',
          redirectMy: '/my',
        },
        { status: 400 },
      );
    }
  }

  const freeAnswerSet =
    body.freeAnswerSet ??
    ((draftExtra?.freeAnswerSet as Record<string, string> | undefined) ?? {});
  const paidAnswerSet =
    body.paidAnswerSet ??
    ((draftExtra?.paidAnswerSet as Record<string, string> | undefined) ?? {});

  let purchaseContextId = resolveCheckoutPurchaseContextId({
    userId,
    productId,
    repurchaseLane: dtrRepurchaseLane,
    existingDraftId: draftIdForContext,
  });
  let metadata: Record<string, string> = { productId };
  let latestDraftExtra: Record<string, unknown> = draftExtra ?? {};

  if (isDtrCoreSavedReportOneTimeProduct(productId) && resolvedProfile) {
    const fields = toCompositeCanonicalInput({
      nickname: resolvedProfile.nickname.trim(),
      birthDate: resolvedProfile.birthDate,
      birthTime: resolvedProfile.birthTime ?? null,
      birthTimeUnknown: resolvedProfile.birthTimeUnknown ?? !resolvedProfile.birthTime,
      country: resolvedProfile.country ?? 'JP',
      birthplace: resolvedProfile.birthplace ?? null,
      timezone: resolvedProfile.timezone ?? null,
    });
    const composite = runM55CompositeStemPipeline(fields);
    const snapBuilt = buildPurchaseInputSnapshotV1({
      userId,
      productId,
      profile: {
        nickname: resolvedProfile.nickname.trim(),
        birthDate: resolvedProfile.birthDate,
        birthTime: resolvedProfile.birthTime ?? null,
        birthTimeUnknown: resolvedProfile.birthTimeUnknown,
        country: resolvedProfile.country,
        birthplace: resolvedProfile.birthplace ?? null,
        timezone: resolvedProfile.timezone ?? null,
      },
      freeAnswerSet,
      paidAnswerSet,
      stemLaneIndex: composite.stemLaneIndex,
    });
    if (!snapBuilt.ok) {
      return NextResponse.json(
        { code: 'purchase_input_incomplete', error: snapBuilt.code },
        { status: 400 },
      );
    }

    const extraJson = purchaseInputExtraJson(snapBuilt.value, draftExtra);
    extraJson.freeAnswerSet = freeAnswerSet;
    extraJson.paidAnswerSet = paidAnswerSet;

    const upserted = await upsertGuestDraftPurchaseContext({
      userId,
      draftId: purchaseContextId,
      nickname: resolvedProfile.nickname.trim(),
      birthDate: resolvedProfile.birthDate,
      extraJson,
    });
    if (!upserted.ok) {
      console.error('[checkout] draft_save_failed', {
        user_id_present: true,
        productId,
      });
      return publicCheckoutError(500);
    }
    purchaseContextId = upserted.draftId;
    latestDraftExtra = extraJson;

    metadata = buildOpaqueStripeCheckoutMetadata({
      productId,
      purchaseContextId,
      opaqueUserRef: hashOpaqueUserRef(userId),
      inputVersion: INPUT_VERSION_V1,
      engineVersionCandidate: ENGINE_VERSION_V2,
    });
  }

  if (isDtrCoreSavedReportOneTimeProduct(productId)) {
    console.info(
      '[checkout]',
      JSON.stringify({
        event: 'dtr_purchase_path',
        productId,
        path: dtrRepurchaseLane ? 'repurchase_lane_stripe_session_create' : 'fresh_purchase_stripe_session_create',
        user_id_present: true,
        repurchaseLane: dtrRepurchaseLane,
        note: dtrRepurchaseLane
          ? 'hidden-only snapshot → new Stripe Checkout for repurchase'
          : 'Stripe checkout.sessions.create (new user, unowned, or stale-session escape)',
      })
    );
  }

  let checkoutSessionGeneration = 0;
  let pendingExtraSource: Record<string, unknown> = latestDraftExtra;
  if (isDtrCoreSavedReportOneTimeProduct(productId)) {
    try {
      const anchoredDraft = await getDraftById(purchaseContextId);
      if (anchoredDraft?.extra_json && typeof anchoredDraft.extra_json === 'object') {
        pendingExtraSource = {
          ...pendingExtraSource,
          ...(anchoredDraft.extra_json as Record<string, unknown>),
        };
      }
    } catch {
      /* no-op */
    }

    const pendingMeta = readPendingCheckoutExtra(pendingExtraSource);
    checkoutSessionGeneration = pendingMeta.checkoutSessionGeneration ?? 0;
    if (
      pendingMeta.pendingCheckoutSessionId &&
      pendingMeta.pendingCheckoutProductId === productId
    ) {
      const reuse = await resolveCheckoutSessionReuse(
        stripe,
        pendingMeta.pendingCheckoutSessionId,
        productId,
        origin,
      );
      if (reuse.kind === 'open' || reuse.kind === 'paid') {
        console.info(
          '[checkout]',
          JSON.stringify({
            event: reuse.kind === 'open' ? 'stripe_checkout_session_reused' : 'stripe_checkout_session_paid_resume',
            session_id_present: true,
            productId,
            user_id_present: true,
            dedupe: reuse.kind === 'open' ? 'session_reused_open' : 'session_paid_resume',
          }),
        );
        return NextResponse.json({ url: reuse.url });
      }
      if (reuse.kind === 'retrieve_failed') {
        console.warn('[checkout] pending session retrieve failed — blocking new session', {
          user_id_present: true,
          productId,
          session_id_present: true,
          dedupe: 'retrieve_failed_block_new',
        });
        return NextResponse.json({ code: 'fulfillment_pending' as const }, { status: 409 });
      }
      checkoutSessionGeneration += 1;
    }
  }

  const idempotencyKey = buildCheckoutIdempotencyKey(
    userId,
    productId,
    purchaseContextId,
    checkoutSessionGeneration,
  );

  const paymentIntentDescription = resolveSavedReportPaymentIntentDescriptionJa(productId);
  if (!paymentIntentDescription) {
    console.error('[checkout] payment intent description unresolved', { productId });
    return publicCheckoutError(500);
  }

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${origin}/dtr/processing?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/dtr/lp?checkout=cancelled`,
        client_reference_id: purchaseContextId,
        metadata,
        locale: 'ja',
        payment_intent_data: {
          description: paymentIntentDescription,
        },
        phone_number_collection: { enabled: false },
        ...(customerEmail ? { customer_email: customerEmail } : {}),
      },
      { idempotencyKey },
    );

    const url = session.url;
    if (!url) {
      console.error('[checkout] Stripe session URL not created', {
        session_id_present: !!session.id,
      });
      return publicCheckoutError(500);
    }

    if (isDtrCoreSavedReportOneTimeProduct(productId) && resolvedProfile) {
      const mergedExtra = {
        ...pendingExtraSource,
        pendingCheckoutSessionId: session.id,
        pendingCheckoutProductId: productId,
        checkoutSessionGeneration,
      };
      const persistPending = await upsertGuestDraftPurchaseContext({
        userId,
        draftId: purchaseContextId,
        nickname: resolvedProfile.nickname.trim(),
        birthDate: resolvedProfile.birthDate,
        extraJson: mergedExtra,
      });
      if (!persistPending.ok) {
        console.warn('[checkout] pending session persist failed', {
          user_id_present: true,
          session_id_present: !!session.id,
          reason: persistPending.reason,
        });
      }
    }

    console.info(
      '[checkout]',
      JSON.stringify({
        event: 'stripe_checkout_session_created',
        session_id_present: !!session.id,
        hasPurchaseContext: !!metadata.purchaseContextId,
        hasOpaqueUserRef: !!metadata.opaqueUserRef,
        idempotency_key_present: !!idempotencyKey,
      }),
    );

    return NextResponse.json({ url });
  } catch (e) {
    console.error(
      '[checkout]',
      JSON.stringify({
        lane: 'personal_premium',
        event: 'stripe_session_create',
        status: 'failed',
        failure_reason: e instanceof Error ? e.name : 'unknown',
      }),
    );
    return publicCheckoutError(500);
  }
}
