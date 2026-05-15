'use client';

/**
 * Waits for persisted purchase snapshot only (fail-closed). Promotes local guest profile on mount.
 */
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { promoteGuestProfileToClerkUser } from '../../lib/soul/profile';
import { promoteGuestCoreSnapshotToClerkUser } from '../../lib/m55/coreResult/store';
import styles from '../../app/dtr/processing/processing.module.css';

const POLL_MS = 2500;
const MAX_POLLS = 120;

const CORE_READY = '/dtr/core?post_purchase=1';

export function DtrProcessingClient({
  supportUrl,
  recoveryRef,
}: {
  supportUrl: string;
  recoveryRef?: string;
}) {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const [stuck, setStuck] = useState(false);

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
          };
          if (d.ready === true && d.hasOwnership === true && d.hasPurchaseSnapshot === true) {
            router.replace(CORE_READY);
            return;
          }
        }
      } catch {
        /* retry */
      }
      if (cancelled) return;
      if (polls >= MAX_POLLS) {
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
  }, [isLoaded, userId, router]);

  return (
    <>
      <p className={styles.desc} data-testid="m55-dtr-processing-headline" style={{ margin: '0 0 8px' }}>
        解析中です
      </p>
      <div className={styles.animWrap} aria-hidden>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
      <p className={styles.desc} style={{ margin: 0 }}>
        購入済みレポートの保存版を準備しています。完了すると自動で開きます。
      </p>
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
      {recoveryRef && (
        <p className={styles.desc} style={{ marginTop: 12, fontSize: 11 }}>
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
    </>
  );
}
