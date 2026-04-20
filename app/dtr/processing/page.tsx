import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { getStripe } from '../../../lib/stripe';
import { ALLOWED_ONE_TIME_PRODUCTS, DTR_CORE_STATIC_V1 } from '../../../lib/oneTimeCheckout';
import { fulfillDtrCoreFromCheckoutSessionId } from '../../../lib/m55/dtrCoreCheckoutFulfillment';
import { resolveEntryReportOwnership } from '../../../lib/m55/dtrOwnershipGate';
import { getDtrReportSnapshot } from '../../../lib/m55/dtrDraftDb';
import { DTR_PROCESSING_PATH } from '../../../lib/m55/dtrRoutes';
import { DtrProcessingClient } from '../../../components/dtr/DtrProcessingClient';
import styles from './processing.module.css';

export const metadata = { title: 'レポート準備中 | M55' };

export const dynamic = 'force-dynamic';

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

function ProcessingFallback({
  message,
  supportUrl,
  recoveryRef,
}: {
  message: string;
  supportUrl: string;
  recoveryRef?: string;
}) {
  return (
    <main className={styles.page} data-testid="m55-dtr-processing-main">
      <div className={styles.inner}>
        <p className={styles.eyebrow}>Entry Report</p>
        <h1 className={styles.title} data-testid="m55-dtr-processing-title">
          接続を確認できませんでした
        </h1>
        <p className={styles.desc}>{message}</p>
        {recoveryRef && (
          <p className={styles.desc} style={{ marginTop: 8, fontSize: 11 }}>
            お問い合わせ時のお控え: {recoveryRef}
          </p>
        )}
        <p className={styles.secondaryRow}>
          <a href="/my" className={styles.secondaryLink}>
            マイページ
          </a>
          <span className={styles.linkSep}> · </span>
          <a href={supportUrl} className={styles.supportLink}>
            サポート
          </a>
        </p>
      </div>
    </main>
  );
}

export default async function DtrProcessingPage(props: {
  searchParams?: Promise<{ session_id?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) {
    // ログイン後は LP でチェックアウト導線を見せる（processing 直送はしない）
    redirect(`/sign-in?redirect_url=${encodeURIComponent('/dtr/lp')}`);
  }

  const params = props.searchParams ? await props.searchParams : {};
  const sessionIdFromUrl = typeof params.session_id === 'string' ? params.session_id : undefined;

  let sessionVerified: { valid: true; sessionId: string } | { valid: false } = { valid: false };
  if (sessionIdFromUrl) {
    sessionVerified = await verifyOneTimeSession(sessionIdFromUrl, userId);
  }

  const supportUrl = await getSupportUrl();
  const recoveryRef = sessionVerified.valid ? sessionVerified.sessionId : sessionIdFromUrl;

  try {
    getSupabaseAdmin();
  } catch {
    return (
      <ProcessingFallback
        message="現在、接続設定を確認できません。しばらく時間をおいてから、マイページまたはサポートへお問い合わせください。"
        supportUrl={supportUrl}
      />
    );
  }

  if (sessionVerified.valid) {
    const fr = await fulfillDtrCoreFromCheckoutSessionId({
      checkoutSessionId: sessionVerified.sessionId,
      expectedUserId: userId,
      eventIdForFulfillmentRow: `processing_page:${sessionVerified.sessionId}`,
    });
    if (!fr.ok && fr.reason === 'db_error') {
      return (
        <ProcessingFallback
          message="購入の反映を一時的に完了できませんでした。しばらくしてからこのページを再読み込みするか、サポートへお問い合わせください。"
          supportUrl={supportUrl}
          recoveryRef={recoveryRef}
        />
      );
    }
  }

  const ownership = await resolveEntryReportOwnership(userId);

  if (ownership.unlockState === 'expired') {
    redirect('/dtr/lp?state=expired');
  }

  if (ownership.unlockState === 'locked') {
    if (sessionIdFromUrl && !sessionVerified.valid) {
      return (
        <ProcessingFallback
          message="セッションを確認できませんでした。サポートまでお問い合わせください。"
          supportUrl={supportUrl}
          recoveryRef={sessionIdFromUrl}
        />
      );
    }
    redirect('/dtr/lp');
  }

  const snap = await getDtrReportSnapshot(userId, DTR_CORE_STATIC_V1);
  if (snap) {
    redirect('/dtr/core');
  }

  // 以降: owned かつ snapshot 未生成。locked は上で除外済み（未購入の URL 直叩きは /dtr/lp へ）。

  return (
    <main className={styles.page} data-testid="m55-dtr-processing-main">
      <div className={styles.inner}>
        <p className={styles.eyebrow}>Entry Report</p>
        <h1 className={styles.title} data-testid="m55-dtr-processing-title">
          レポートを準備しています
        </h1>
        <DtrProcessingClient supportUrl={supportUrl} recoveryRef={recoveryRef} />
      </div>
    </main>
  );
}
