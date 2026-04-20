import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import successStyles from './success.module.css';
import { PurchaseSuccessBridge } from './PurchaseSuccessBridge';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { getStripe } from '../../../lib/stripe';
import { ALLOWED_ONE_TIME_PRODUCTS, DTR_CORE_STATIC_V1 } from '../../../lib/oneTimeCheckout';
import { fulfillDtrCoreFromCheckoutSessionId } from '../../../lib/m55/dtrCoreCheckoutFulfillment';
import { resolveEntryReportOwnership } from '../../../lib/m55/dtrOwnershipGate';

/** SSOT: DB entitlements + entitlement_rights; success path syncs paid Session → DB (idempotent). */

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
 * Checkout Session を再取得し、one-time lane と矛盾しないか検証（READ）。
 * payment は fulfill 側で再検証する。
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
      !ALLOWED_ONE_TIME_PRODUCTS.has(productId) ||
      session.payment_status !== 'paid'
    ) {
      return { valid: false };
    }
    return { valid: true, sessionId };
  } catch {
    return { valid: false };
  }
}

/**
 * 購入成功ページ（Stripe success_url）。
 * - Session 検証後、DB へ冪等 upsert（webhook 遅延時のモバイル対策）。
 * - 購入済み判定は resolveEntryReportOwnership（DB のみ）に統一。
 * - revalidatePath は呼ばない（Next 15: RSC レンダー中は不可）。キャッシュ無効化は webhook Route Handler 側。
 * - 購入済みでも /dtr/core へ server redirect しない（報酬画面の監査ガード）。CTA で /dtr/core?post_purchase=1 へ。
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

  try {
    getSupabaseAdmin();
  } catch {
    return (
      <PurchaseSuccessFallback
        message="現在、接続設定を確認できません。しばらく時間をおいてから、マイページまたはサポートへお問い合わせください。"
        supportUrl={await getSupportUrl()}
      />
    );
  }

  const supportUrl = await getSupportUrl();
  const recoveryRef = sessionVerified.valid ? sessionVerified.sessionId : sessionIdFromUrl;

  if (sessionVerified.valid) {
    const fr = await fulfillDtrCoreFromCheckoutSessionId({
      checkoutSessionId: sessionVerified.sessionId,
      expectedUserId: userId,
      eventIdForFulfillmentRow: `purchase_success:${sessionVerified.sessionId}`,
    });
    if (!fr.ok && fr.reason === 'db_error') {
      return (
        <PurchaseSuccessFallback
          message="購入の反映を一時的に完了できませんでした。しばらくしてからマイページをご確認いただくか、サポートへお問い合わせください。"
          supportUrl={supportUrl}
          recoveryRef={recoveryRef}
        />
      );
    }
  }

  const ownership = await resolveEntryReportOwnership(userId);

  if (ownership.unlockState === 'owned') {
    return (
      <PurchaseSuccessFallback
        entitlementReady
        supportUrl={supportUrl}
        recoveryRef={recoveryRef}
      />
    );
  }

  if (ownership.unlockState === 'expired') {
    redirect('/dtr/lp?state=expired');
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

  if (!sessionIdFromUrl) {
    return (
      <PurchaseSuccessFallback
        message="このページは決済完了直後のみ有効です。マイページからレポートへお進みください。"
        supportUrl={supportUrl}
      />
    );
  }

  return (
    <PurchaseSuccessFallback
      message={undefined}
      supportUrl={supportUrl}
      recoveryRef={recoveryRef}
      entitlementReady={false}
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
