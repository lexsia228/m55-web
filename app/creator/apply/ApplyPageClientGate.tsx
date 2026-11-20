'use client';

import Link from 'next/link';
import { CreatorApplicationForm } from '../_components/CreatorApplicationForm';
import styles from '../creator.module.css';

export type ApplyPageGateProps =
  | { gate: 'portal_unavailable' }
  | { gate: 'apply'; inviteToken?: string; existingProfileStatus: string | null };

type Props = ApplyPageGateProps;

const PORTAL_FIRST_STATUSES = new Set([
  'ACTIVE',
  'SUSPENDED',
  'REVOKED',
  'APPROVED_PENDING_ACTIVATION',
]);

export function ApplyPageClientGate(props: Props) {
  if (props.gate === 'portal_unavailable') {
    return (
      <div className={styles.card} role="alert">
        <h2 className={styles.cardTitle}>申請状況を確認できませんでした</h2>
        <p className={styles.cardBody}>
          いまは新規申請フォームを開けません。時間をおいて再読み込みするか、
          <Link href="/support" className={styles.tertiaryLink}>サポート</Link>
          へお問い合わせください。
        </p>
        <div className={styles.cardActions}>
          <Link href="/creator/portal" className={styles.secondaryCta}>
            Creatorポータルを試す
          </Link>
        </div>
      </div>
    );
  }

  const { inviteToken, existingProfileStatus } = props;
  if (existingProfileStatus && PORTAL_FIRST_STATUSES.has(existingProfileStatus)) {
    return (
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>すでにCreator登録があります</h2>
        <p className={styles.cardBody}>
          新規の申請フォームは、未承認の初回応募向けです。受取準備・紹介・報酬の確認はポータルとダッシュボードから行ってください。
        </p>
        <div className={styles.cardActions}>
          <Link href="/creator/portal" className={styles.buttonPrimary}>
            Creatorポータルを開く
          </Link>
          {existingProfileStatus === 'ACTIVE' ? (
            <Link href="/creator/dashboard" className={styles.secondaryCta}>
              ダッシュボードへ
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return <CreatorApplicationForm inviteToken={inviteToken} />;
}