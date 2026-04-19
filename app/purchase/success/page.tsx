import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import successStyles from './success.module.css';
import { PurchaseSuccessBridge } from './PurchaseSuccessBridge';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { getStripe } from '../../../lib/stripe';
import {
  ALLOWED_ONE_TIME_PRODUCTS,
  DTR_CORE_STATIC_V1,
} from '../../../lib/oneTimeCheckout';

/** SSOT: post_purchase_alignment_ssot_2026_03_08 */

async function getSupportUrl(): Promise<string> {
  const base =
    process.env.APP_ORIGIN ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  if (base) return `${String(base).replace(/\/$/, '')}/support`;
  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    const proto = h.get('x-forwarded-proto') ?? 'https';
    if (host) return `${proto}://${host}/support`;
  } catch {
    /* ignore */
  }
  return '/support';
}

/**
 * Checkout Session を再取得し、one-time lane と矛盾しないか検証。
 * fulfillment truth-source は webhook。本関数は表示分岐のため READ のみ。
 */
async function verifyOneTimeSession(
  sessionId: string,
  userId: string
): Promise<{ valid: true; sessionId: string } | { valid: false }> {
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const productId = (session.metadata?.productId as string) ?? DTR_CORE_STATIC_V1;
    if (
      session.mode !== 'payment' ||
      session.client_reference_id !== userId ||
      !ALLOWED_ONE_TIME_PRODUCTS.has(productId)
    ) {
      return { valid: false };
    }
    return { valid: true, sessionId };
  } catch {
    return { valid: false };
  }
}

/**
 * 購入成功ページ（Stripe決済直後のリダイレクト先）
 * 分岐: (1) Session 再取得で one-time lane 整合確認 (2) entitlement で happy/delayed 判定。
 * Webhook が fulfillment truth-source。本ページは READ のみ、権限付与は行わない。
 * Client: PurchaseSuccessBridge promotes device-local profile to Clerk; after entitlements apply, navigates to /dtr/core?post_purchase=1 (no server redirect to /dtr/core).
 */
export default async function PurchaseSuccessPage(props: {
  searchParams?: Promise<{ session_id?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  const params = props.searchParams ? await props.searchParams : {};
  const sessionIdFromUrl = typeof params.session_id === 'string' ? params.session_id : undefined;

  let sessionVerified: { valid: true; sessionId: string } | { valid: false } = { valid: false };
  if (sessionIdFromUrl) {
    sessionVerified = await verifyOneTimeSession(sessionIdFromUrl, userId);
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = getSupabaseAdmin();
  } catch {
    return (
      <PurchaseSuccessFallback
        message="現在、接続設定を確認できません。しばらく時間をおいてから、マイページまたはサポートへお問い合わせください。"
        supportUrl={await getSupportUrl()}
      />
    );
  }

  const { data, error } = await supabaseAdmin
    .from('entitlements')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', DTR_CORE_STATIC_V1)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (error) {
    return (
      <PurchaseSuccessFallback
        message="購入の確認を完了できませんでした。しばらくしてからマイページをご確認いただくか、サポートへお問い合わせください。"
        supportUrl={await getSupportUrl()}
      />
    );
  }

  const supportUrl = await getSupportUrl();
  const recoveryRef = sessionVerified.valid ? sessionVerified.sessionId : undefined;

  if (data) {
    return (
      <PurchaseSuccessFallback
        entitlementReady
        supportUrl={supportUrl}
        recoveryRef={recoveryRef}
      />
    );
  }

  if (!sessionVerified.valid && sessionIdFromUrl) {
    return (
      <PurchaseSuccessFallback
        message="セッションを確認できませんでした。サポートまでお問い合わせください。"
        supportUrl={supportUrl}
        recoveryRef={sessionIdFromUrl}
      />
    );
  }

  return (
    <PurchaseSuccessFallback
      message={undefined}
      supportUrl={supportUrl}
      recoveryRef={recoveryRef}
    />
  );
}

const DTR_CORE_HREF = '/dtr/core?post_purchase=1';

function PurchaseSuccessFallback({
  message,
  supportUrl,
  recoveryRef,
  entitlementReady,
}: {
  message?: string;
  supportUrl: string;
  recoveryRef?: string;
  /** true: entitlement already active — no background refresh */
  entitlementReady?: boolean;
}) {
  return (
    <main className={successStyles.page} data-testid="m55-purchase-success-main">
      <div className={successStyles.inner}>
        {message ? (
          <>
            <p className={successStyles.rewardEyebrow}>Entry Report</p>
            <h1 className={successStyles.title} data-testid="m55-purchase-success-headline">
              お手続き、ありがとうございます
            </h1>
            <p className={successStyles.desc}>{message}</p>
            {recoveryRef && (
              <p className={successStyles.desc} style={{ marginTop: 8, fontSize: 11 }}>
                お問い合わせ時のお控え: {recoveryRef}
              </p>
            )}
            <p className={successStyles.secondaryRow}>
              <a href="/my" className={successStyles.secondaryLink}>マイページ</a>
              <span className={successStyles.linkSep}> · </span>
              <a href={supportUrl} className={successStyles.supportLink}>サポート</a>
            </p>
          </>
        ) : (
          <>
            <PurchaseSuccessBridge entitlementInitiallyReady={!!entitlementReady} />
            <p className={successStyles.rewardEyebrow}>Entry Report</p>
            <h1 className={successStyles.title} data-testid="m55-purchase-success-headline">
              レポートへ接続しています
            </h1>
            <p className={successStyles.desc}>
              {entitlementReady
                ? '購入内容を反映し、Entry Report を開きます。しばらくお待ちください。'
                : 'ご購入は完了しています。利用権限の反映を確認してから、Entry Report を開きます。'}
            </p>
            <a
              href={DTR_CORE_HREF}
              className={successStyles.ctaButton}
              data-testid="m55-purchase-success-primary-cta"
            >
              今すぐ Entry Report を開く
            </a>
            {recoveryRef && (
              <p className={successStyles.desc} style={{ marginTop: 8, fontSize: 11 }}>
                お問い合わせ時のお控え: {recoveryRef}
              </p>
            )}
            <p className={successStyles.secondaryRow}>
              <a href="/my" className={successStyles.secondaryLink}>マイページ</a>
              <span className={successStyles.linkSep}> · </span>
              <a href={supportUrl} className={successStyles.supportLink}>サポート</a>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
