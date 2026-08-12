import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import {
  verifyStripeCheckoutSessionForDtrUser,
  type DtrCheckoutVerificationFailureReason,
} from '../../../lib/m55/verifyStripeCheckoutSessionForDtr';
import { fulfillDtrCoreFromCheckoutSessionId } from '../../../lib/m55/dtrCoreCheckoutFulfillment';
import {
  DTR_OWNED_RECOVERY_PROCESSING_PATH,
  isDtrOwnedHiddenOnlyState,
} from '../../../lib/m55/dtrShelfAccess';
import { resolveEntryReportOwnership } from '../../../lib/m55/dtrOwnershipGate';
import { getVisibleSavedReportSnapshot } from '../../../lib/m55/dtrSavedReportOwnership';
import { maskCheckoutRecoveryRef } from '../../../lib/m55/paidResult/checkoutRecoveryRef';
import {
  decideUnverifiedCheckoutReturn,
  type OwnedReturnEvidence,
  type UnverifiedCheckoutReturnDecision,
} from '../../../lib/m55/paidResult/postPaymentReturnDecision';
import { DtrProcessingClient } from '../../../components/dtr/DtrProcessingClient';
import { LABEL_FORMAT_SAVED, LABEL_SAVED_REPORT_METADATA_JP } from '../../../lib/m55/dtrProductLabels';
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

function isSafeUnpaidVerificationFailure(reason: DtrCheckoutVerificationFailureReason): boolean {
  return (
    reason === 'session_status_not_complete' ||
    reason === 'purchase_context_owner_mismatch'
  );
}

function paidProcessingRecoveryMessage(): string {
  return 'お支払いを確認しました。プレミアムレポートの反映に時間がかかっています。再購入する前に、このページを再読み込みするか、下記のお控え番号を添えてサポートへお問い合わせください。';
}

/**
 * Ownership is held in the database, not in the checkout return URL. The Stripe
 * purchase-context transport can be unresolvable on a host that no longer reaches the
 * Supabase project the session was created against, and a buyer whose report is already
 * fulfilled must not be told the purchase failed because of that.
 */
async function resolveOwnedPostPaymentReturn(
  userId: string,
): Promise<UnverifiedCheckoutReturnDecision> {
  let evidence: OwnedReturnEvidence | null = null;
  try {
    const ownership = await resolveEntryReportOwnership(userId);
    evidence = {
      unlockState: ownership.unlockState,
      hasVisibleSnapshot:
        ownership.unlockState === 'owned'
          ? (await getVisibleSavedReportSnapshot(userId)) != null
          : false,
    };
  } catch {
    evidence = null;
  }
  return decideUnverifiedCheckoutReturn(evidence);
}

function ProcessingFallback({
  message,
  supportUrl,
  recoveryRef,
}: {
  message: string;
  supportUrl: string;
  recoveryRef?: string | null;
}) {
  return (
    <main className={styles.page} data-testid="m55-dtr-processing-main">
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{LABEL_SAVED_REPORT_METADATA_JP}</p>
        <h1 className={styles.title} data-testid="m55-dtr-processing-title">
          接続を確認できませんでした
        </h1>
        <p className={styles.desc}>{message}</p>
        {recoveryRef && (
          <p className={`${styles.desc} ${styles.recoveryRef}`}>お問い合わせ時のお控え: {recoveryRef}</p>
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

  const supportUrl = await getSupportUrl();

  if (isOwnedRecovery && !sessionIdFromUrl) {
    const ownership = await resolveEntryReportOwnership(userId);

    if (ownership.unlockState === 'expired') {
      redirect('/dtr/lp?state=expired');
    }
    if (ownership.unlockState === 'locked') {
      redirect('/dtr/lp');
    }

    const snap = await getVisibleSavedReportSnapshot(userId);
    if (snap) {
      redirect('/dtr/core');
    }

    const hiddenOnlyRepurchase = await isDtrOwnedHiddenOnlyState(userId);

    return (
      <main className={styles.page} data-testid="m55-dtr-processing-main">
        <div className={styles.inner}>
          <p className={styles.eyebrow}>{LABEL_SAVED_REPORT_METADATA_JP}</p>
          <h1 className={styles.title} data-testid="m55-dtr-processing-title">
            {hiddenOnlyRepurchase ? '新しいプレミアムレポートの購入' : `${LABEL_FORMAT_SAVED}を確認しています`}
          </h1>
          <p className={styles.desc} style={{ margin: '0 0 16px' }}>
            {hiddenOnlyRepurchase
              ? '以前のプレミアムレポートは非表示の状態です。新しいレポートを購入する場合は、追加のお支払いが発生します。'
              : '購入済みのプレミアムレポートを読み込んでいます。準備が整うと自動で開きます。'}
          </p>
          <DtrProcessingClient
            supportUrl={supportUrl}
            recoveryMode="owned"
            hiddenOnlyRepurchase={hiddenOnlyRepurchase}
          />
        </div>
      </main>
    );
  }

  if (!sessionIdFromUrl) {
    redirect('/dtr/lp');
  }

  const sessionVerified = await verifyStripeCheckoutSessionForDtrUser(sessionIdFromUrl, userId);
  if (!sessionVerified.valid) {
    if (isSafeUnpaidVerificationFailure(sessionVerified.reason)) {
      redirect('/dtr/lp?checkout=cancelled');
    }

    const ownedReturn = await resolveOwnedPostPaymentReturn(userId);
    if (ownedReturn === 'open_report') {
      redirect('/dtr/core?post_purchase=1');
    }
    if (ownedReturn === 'owned_recovery') {
      redirect(DTR_OWNED_RECOVERY_PROCESSING_PATH);
    }

    const unpaidPendingMessage =
      sessionVerified.reason === 'payment_status_not_paid'
        ? 'お支払いの確認を待っています。再購入する前に、このページを再読み込みするか、下記のお控え番号を添えてサポートへお問い合わせください。'
        : 'お支払いの確認に時間がかかっています。再購入する前に、このページを再読み込みするか、下記のお控え番号を添えてサポートへお問い合わせください。';
    return (
      <ProcessingFallback
        message={unpaidPendingMessage}
        supportUrl={supportUrl}
        recoveryRef={maskCheckoutRecoveryRef(sessionIdFromUrl)}
      />
    );
  }

  const recoveryRef = maskCheckoutRecoveryRef(sessionVerified.sessionId);

  try {
    getSupabaseAdmin();
  } catch {
    return (
      <ProcessingFallback
        message="現在、接続設定を確認できません。しばらく時間をおいてから、マイページまたはサポートへお問い合わせください。"
        supportUrl={supportUrl}
        recoveryRef={recoveryRef}
      />
    );
  }

  const fr = await fulfillDtrCoreFromCheckoutSessionId({
    checkoutSessionId: sessionVerified.sessionId,
    expectedUserId: userId,
    eventIdForFulfillmentRow: `processing_page:${sessionVerified.sessionId}`,
  });
  if (!fr.ok) {
    const message =
      fr.reason === 'db_error'
        ? '購入の反映を一時的に完了できませんでした。しばらくしてからこのページを再読み込みするか、サポートへお問い合わせください。'
        : paidProcessingRecoveryMessage();
    return (
      <main className={styles.page} data-testid="m55-dtr-processing-main">
        <div className={styles.inner}>
          <p className={styles.eyebrow}>{LABEL_SAVED_REPORT_METADATA_JP}</p>
          <h1 className={styles.title} data-testid="m55-dtr-processing-title">
            レポートを準備しています
          </h1>
          <p className={styles.desc} style={{ margin: '0 0 16px' }}>
            {message}
          </p>
          <DtrProcessingClient supportUrl={supportUrl} recoveryRef={recoveryRef} paymentConfirmed />
        </div>
      </main>
    );
  }

  const ownership = await resolveEntryReportOwnership(userId);

  const snap = await getVisibleSavedReportSnapshot(userId);
  if (snap) {
    redirect('/dtr/core?post_purchase=1');
  }

  if (ownership.unlockState === 'expired' || ownership.unlockState === 'locked') {
    return (
      <main className={styles.page} data-testid="m55-dtr-processing-main">
        <div className={styles.inner}>
          <p className={styles.eyebrow}>{LABEL_SAVED_REPORT_METADATA_JP}</p>
          <h1 className={styles.title} data-testid="m55-dtr-processing-title">
            レポートを準備しています
          </h1>
          <p className={styles.desc} style={{ margin: '0 0 16px' }}>
            {paidProcessingRecoveryMessage()}
          </p>
          <DtrProcessingClient supportUrl={supportUrl} recoveryRef={recoveryRef} paymentConfirmed />
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page} data-testid="m55-dtr-processing-main">
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{LABEL_SAVED_REPORT_METADATA_JP}</p>
        <h1 className={styles.title} data-testid="m55-dtr-processing-title">
          レポートを準備しています
        </h1>
        <p className={styles.desc} style={{ margin: '0 0 16px' }}>
          お支払いを確認しました。プレミアムレポートを準備しています（反映まで時間がかかる場合があります）。
        </p>
        <DtrProcessingClient supportUrl={supportUrl} recoveryRef={recoveryRef} paymentConfirmed />
      </div>
    </main>
  );
}
