import type { ReactNode } from 'react';
import { LABEL_SAVED_REPORT_METADATA_JP } from '../../../lib/m55/dtrProductLabels';
import styles from './processing.module.css';

/**
 * Every post-payment state shares one frame so the buyer sees a single, calm surface whether
 * their report is being prepared, is being recovered, or could not be resolved at all.
 */
export function DtrProcessingShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <main className={styles.page} data-testid="m55-dtr-processing-main">
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{LABEL_SAVED_REPORT_METADATA_JP}</p>
        <h1 className={styles.title} data-testid="m55-dtr-processing-title">
          {title}
        </h1>
        <p className={`${styles.desc} ${styles.descLead}`}>{description}</p>
        {children}
      </div>
    </main>
  );
}

/**
 * Fail-closed state: reached only when the session could not be verified *and* the signed-in
 * account owns nothing. It offers no purchase action — a buyer who is unsure whether they paid
 * must never be nudged into paying again from here.
 */
export function DtrProcessingFallback({
  message,
  supportUrl,
  recoveryRef,
}: {
  message: string;
  supportUrl: string;
  /** Masked support reference only — never a raw Checkout Session id. */
  recoveryRef?: string | null;
}) {
  return (
    <DtrProcessingShell title="接続を確認できませんでした" description={message}>
      {recoveryRef ? (
        <p className={`${styles.desc} ${styles.recoveryRef}`}>お問い合わせ時のお控え: {recoveryRef}</p>
      ) : null}
      <p className={styles.secondaryRow}>
        <a href="/my" className={styles.secondaryLink}>
          マイページ
        </a>
        <span className={styles.linkSep}> · </span>
        <a href={supportUrl} className={styles.supportLink}>
          サポート
        </a>
      </p>
    </DtrProcessingShell>
  );
}
