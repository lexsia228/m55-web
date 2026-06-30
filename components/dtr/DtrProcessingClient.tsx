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

const CORE_READY = '/dtr/core?post_purchase=1';
const HIDDEN_ONLY_REPURCHASE_LP = '/dtr/lp';

export function DtrProcessingClient({
  supportUrl,
  recoveryRef,
  recoveryMode,
}: {
  supportUrl: string;
  recoveryRef?: string;
  /** Owned user without checkout session: snapshot read-path recovery (no purchase retry). */
  recoveryMode?: 'checkout' | 'owned';
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
            setPendingNav(HIDDEN_ONLY_REPURCHASE_LP);
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
  }, [isLoaded, userId, isOwnedRecovery]);

  const handleAnimationComplete = () => {
    setShowAnimation(false);
    if (pendingNav) {
      router.replace(pendingNav);
    }
  };

  return (
    <>
      <PaidDtrAnalysisLoading
        open={showAnimation}
        nickname={nickname}
        birthDate={birthDate}
        processingComplete={processingComplete}
        onComplete={handleAnimationComplete}
      />

      {!showAnimation && (
        <>
          <p className={styles.desc} data-testid="m55-dtr-processing-headline" style={{ margin: '0 0 8px' }}>
            {isOwnedRecovery ? '保存版を確認中です' : '保存版を準備しています'}
          </p>
          <p className={styles.desc} style={{ margin: 0 }}>
            {isOwnedRecovery
              ? '購入済みの保存版を読み込んでいます。準備が整うと自動で開きます（再購入は不要です）。'
              : '購入済みレポートの保存版を準備しています。完了すると自動で開きます。'}
          </p>
        </>
      )}

      {stuck && (
        <p role="alert" className={styles.desc} style={{ marginTop: 16, color: '#5a4ea0' }}>
          準備に時間がかかっています。保存版が未生成の間は /dtr/core へ直接進みません。
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
        <p className={styles.desc} style={{ marginTop: 12, fontSize: 11 }}>
          お問い合わせ時のお控え: {recoveryRef}
        </p>
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
