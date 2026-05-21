import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { DTR_CORE_STATIC_V1 } from '../../../lib/oneTimeCheckout';
import { verifyStripeCheckoutSessionForDtrUser } from '../../../lib/m55/verifyStripeCheckoutSessionForDtr';
import { fulfillDtrCoreFromCheckoutSessionId } from '../../../lib/m55/dtrCoreCheckoutFulfillment';
import { DTR_OWNED_RECOVERY_PROCESSING_PATH } from '../../../lib/m55/dtrShelfAccess';
import { resolveEntryReportOwnership } from '../../../lib/m55/dtrOwnershipGate';
import { getDtrReportSnapshot } from '../../../lib/m55/dtrDraftDb';
import { DtrProcessingClient } from '../../../components/dtr/DtrProcessingClient';
import { LABEL_FORMAT_SAVED, LABEL_PRODUCT_JP } from '../../../lib/m55/dtrProductLabels';
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
        <p className={styles.eyebrow}>{LABEL_PRODUCT_JP}</p>
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
  searchParams?: Promise<{ session_id?: string; recovery?: string }>;
}) {
  const params = props.searchParams ? await props.searchParams : {};
  const sessionIdFromUrl = typeof params.session_id === 'string' ? params.session_id : undefined;
  const isOwnedRecovery = params.recovery === 'owned';

  const processingReturnPath =
    sessionIdFromUrl != null
      ? `/dtr/processing?session_id=${encodeURIComponent(sessionIdFromUrl)}`
      : isOwnedRecovery
        ? DTR_OWNED_RECOVERY_PROCESSING_PATH
        : '/dtr/processing';

  const { userId } = await auth();
  if (!userId) {
    const back = sessionIdFromUrl != null || isOwnedRecovery ? processingReturnPath : '/dtr/lp';
    redirect(`/sign-in?redirect_url=${encodeURIComponent(back)}`);
  }

  if (isOwnedRecovery && !sessionIdFromUrl) {
    const supportUrl = await getSupportUrl();
    const ownership = await resolveEntryReportOwnership(userId);

    if (ownership.unlockState === 'expired') {
      redirect('/dtr/lp?state=expired');
    }
    if (ownership.unlockState === 'locked') {
      redirect('/dtr/lp');
    }

    const snap = await getDtrReportSnapshot(userId, DTR_CORE_STATIC_V1);
    if (snap) {
      redirect('/dtr/core');
    }

    return (
      <main className={styles.page} data-testid="m55-dtr-processing-main">
        <div className={styles.inner}>
          <p className={styles.eyebrow}>{LABEL_PRODUCT_JP}</p>
          <h1 className={styles.title} data-testid="m55-dtr-processing-title">
            {LABEL_FORMAT_SAVED}を確認しています
          </h1>
          <p className={styles.desc} style={{ margin: '0 0 16px' }}>
            購入済みです。保存版の読み込み経路を再確認しています（再購入は不要です）。
          </p>
          <DtrProcessingClient supportUrl={supportUrl} recoveryMode="owned" />
        </div>
      </main>
    );
  }

  if (!sessionIdFromUrl) {
    redirect('/dtr/lp');
  }

  const sessionVerified = await verifyStripeCheckoutSessionForDtrUser(sessionIdFromUrl, userId);
  if (!sessionVerified.valid) {
    redirect('/dtr/lp');
  }

  const supportUrl = await getSupportUrl();
  const recoveryRef = sessionVerified.sessionId;

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

  const ownership = await resolveEntryReportOwnership(userId);

  if (ownership.unlockState === 'expired') {
    redirect('/dtr/lp?state=expired');
  }

  if (ownership.unlockState === 'locked') {
    redirect('/dtr/lp');
  }

  const snap = await getDtrReportSnapshot(userId, DTR_CORE_STATIC_V1);
  if (snap) {
    redirect('/dtr/core');
  }

  return (
    <main className={styles.page} data-testid="m55-dtr-processing-main">
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{LABEL_PRODUCT_JP}</p>
        <h1 className={styles.title} data-testid="m55-dtr-processing-title">
          レポートを準備しています
        </h1>
        <DtrProcessingClient supportUrl={supportUrl} recoveryRef={recoveryRef} />
      </div>
    </main>
  );
}
