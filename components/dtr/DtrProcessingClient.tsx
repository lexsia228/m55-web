'use client';

/**
 * Waits for persisted purchase snapshot only (fail-closed). Promotes local guest profile on mount.
 */
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { promoteGuestCoreSnapshotToClerkUser } from '../../lib/m55/coreResult/store';
import { ProfileRepository, promoteGuestProfileToClerkUser } from '../../lib/soul/profile';
import styles from '../../app/dtr/processing/processing.module.css';
import PaidDtrAnalysisLoading from './PaidDtrAnalysisLoading';

const POLL_MS = 2500;
const MAX_POLLS = 120;
const EARLY_REVEAL_MS = 8000;

const CORE_READY = '/dtr/core?post_purchase=1';
/** Client-safe mirror of lib/m55/dtrShelfAccess DTR_HIDDEN_ONLY_REPURCHASE_LP_PATH (no server barrel import). */
const HIDDEN_ONLY_REPURCHASE_LP_PATH = '/dtr/lp?repurchase=1';

export function DtrProcessingClient({
  supportUrl,
  recoveryRef,
  recoveryMode,
  hiddenOnlyRepurchase,
  paymentConfirmed,
}: {
  supportUrl: string;
  /** Masked support reference only — never a raw Checkout Session id. */
  recoveryRef?: string | null;
  recoveryMode?: 'checkout' | 'owned';
  hiddenOnlyRepurchase?: boolean;
  paymentConfirmed?: boolean;
}) {
  const isOwnedRecovery = recoveryMode === 'owned';
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const [stuck, setStuck] = useState(false);
  const [showAnimation, setShowAnimation] = useState(true);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [pendingNav, setPendingNav] = useState<string | null>(null);

  const profile = useMemo(() => {
    if (!isLoaded || !userId) return null;
    return ProfileRepository.get(userId);
  }, [isLoaded, userId]);

  const nickname = profile?.nickname?.trim() ?? '';
  const birthDate = profile?.birthDate?.trim().slice(0, 10) ?? '';

  useEffect(() => {
    if (!isLoaded || !userId) return;
    try {
      promoteGuestProfileToClerkUser(userId);
      promoteGuestCoreSnapshotToClerkUser(userId);
      window.dispatchEvent(new Event('m55:profile_updated'));
    } catch {
      /* no-op */
    }
  }, [isLoaded, userId]);

  useEffect(() => {
    if (hiddenOnlyRepurchase) {
      setProcessingComplete(true);
      setPendingNav(HIDDEN_ONLY_REPURCHASE_LP_PATH);
      return;
    }

    if (!isLoaded || !userId) return;
    let cancelled = false;
    let polls = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      if (cancelled) return;
      polls += 1;
      try {
        const r = await fetch('/api/dtr/report-snapshot-ready', { cache: 'no-store', credentials: 'include' });
        if (r.ok) {
          const d = (await r.json()) as {
            ready?: boolean;
            hasOwnership?: boolean;
            hasPurchaseSnapshot?: boolean;
            showPurchaseCta?: boolean;
          };
          if (d.ready === true && d.hasOwnership === true && d.hasPurchaseSnapshot === true) {
            setProcessingComplete(true);
            setPendingNav(CORE_READY);
            return;
          }
          if (
            isOwnedRecovery &&
            d.hasOwnership === true &&
            d.hasPurchaseSnapshot !== true &&
            d.showPurchaseCta === true
          ) {
            setProcessingComplete(true);
            setPendingNav(HIDDEN_ONLY_REPURCHASE_LP_PATH);
            return;
          }
        }
      } catch {
        /* retry */
      }
      if (cancelled) return;
      if (polls >= MAX_POLLS) {
        setShowAnimation(false);
        setStuck(true);
        return;
      }
      timeoutId = setTimeout(() => {
        void poll();
      }, POLL_MS);
    };

    void poll();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [isLoaded, userId, isOwnedRecovery, hiddenOnlyRepurchase]);

  useEffect(() => {
    if (!showAnimation || processingComplete) return;
    const timer = window.setTimeout(() => {
      setShowAnimation(false);
    }, EARLY_REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [showAnimation, processingComplete]);

  useEffect(() => {
    if (!processingComplete || !pendingNav) return;
    router.replace(pendingNav);
  }, [processingComplete, pendingNav, router]);

  const handleAnimationComplete = () => {
    setShowAnimation(false);
  };

  return (
    <>
      <PaidDtrAnalysisLoading
        open={showAnimation}
        nickname={nickname}
        birthDate={birthDate}
        processingComplete={processingComplete}
        supportUrl={supportUrl}
        recoveryRef={recoveryRef}
        onComplete={handleAnimationComplete}
      />

      {/*
        The page already states which state the buyer is in. This line only adds what the page
        cannot: that waiting is safe. Restating the status here printed the same sentence twice.
      */}
      {!showAnimation && (
        <p className={styles.desc} data-testid="m55-dtr-processing-headline" style={{ margin: 0 }}>
          {isOwnedRecovery
            ? hiddenOnlyRepurchase
              ? '購入手続きのページへ移動します。'
              : '読み込みに時間がかかっても、再購入は不要です。'
            : '反映に時間がかかっても、再購入は不要です。準備が整うと自動で開きます。'}
        </p>
      )}

      {stuck && (
        <p role="alert" className={styles.desc} style={{ marginTop: 16, color: '#5a4ea0' }}>
          {paymentConfirmed
            ? 'お支払いは確認済みです。準備に時間がかかっています。再購入する前に、このページを再読み込みしてください。'
            : '準備に時間がかかっています。再購入する前に、このページを再読み込みしてください。'}
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginLeft: 8,
              color: '#6b5fa8',
              fontWeight: 600,
              textDecoration: 'underline',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              font: 'inherit',
            }}
          >
            このページを再読み込み
          </button>
          するか、サポートへお問い合わせください。
        </p>
      )}
      {recoveryRef && !showAnimation && (
        <p className={`${styles.desc} ${styles.recoveryRef}`}>お問い合わせ時のお控え: {recoveryRef}</p>
      )}
      {!showAnimation && (
        <p className={styles.secondaryRow}>
          <a href="/my" className={styles.secondaryLink}>
            マイページ
          </a>
          <span className={styles.linkSep}> · </span>
          <a href={supportUrl} className={styles.supportLink}>
            サポート
          </a>
        </p>
      )}
    </>
  );
}
