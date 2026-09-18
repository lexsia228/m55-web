'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ApplicationStatus, ProfileStatus } from '../../../lib/m55/creatorDistribution/contract';
import styles from '../creator.module.css';

const UNKNOWN_PUBLIC_STATUS_LABEL = '状態を確認中';

const APPLICATION_PUBLIC_LABELS = {
  SUBMITTED: '申請受付済み',
  UNDER_REVIEW: '審査中',
  NEED_MORE_INFO: '追加情報が必要です',
  TERMS_REACCEPT_REQUIRED: '規約への再同意が必要です',
  APPROVED_PENDING_ACTIVATION: '承認済み・有効化待ち',
  REJECTED: '今回は承認されませんでした',
  BLOCKED: '現在ご利用いただけません',
} as const satisfies Record<ApplicationStatus, string>;

const PROFILE_PUBLIC_LABELS = {
  APPROVED_PENDING_ACTIVATION: '承認済み・有効化待ち',
  ACTIVE: '有効',
  SUSPENDED: '一時停止中',
  REVOKED: '利用停止',
} as const satisfies Record<ProfileStatus, string>;

function publicStatusLabel(status: string, labels: Record<string, string>): string {
  return Object.hasOwn(labels, status) ? labels[status] : UNKNOWN_PUBLIC_STATUS_LABEL;
}

type PrimaryMediaVerification = null | 'ACTION_REQUIRED' | 'VERIFIED' | 'FAILED';

type Portal = {
  application: null | {
    id: string;
    status: ApplicationStatus;
    terms_version: string;
    submitted_at: string;
    rejected_reapply_after: string | null;
    primary_media_verification: PrimaryMediaVerification;
  };
  profile: null | { creator_code: string; first_final_approved_at: string; status: ProfileStatus; terms_version: string };
};

function mediaVerificationNextAction(verification: PrimaryMediaVerification) {
  if (verification === 'ACTION_REQUIRED') {
    return (
      <p className={styles.nextAction}>
        運営確認が必要です。M55から届いた確認案内に従ってください。
        案内が見当たらない場合は<Link href="/support" className={styles.tertiaryLink}>サポート</Link>へお問い合わせください。
      </p>
    );
  }
  if (verification === 'FAILED') {
    return (
      <p className={styles.nextAction}>
        運営確認を完了できていません。
        <Link href="/support" className={styles.tertiaryLink}>サポート</Link>へお問い合わせください。
      </p>
    );
  }
  return null;
}

export function CreatorPortalPanel() {
  const [portal, setPortal] = useState<Portal | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function load() {
    const response = await fetch('/api/creator/portal', { cache: 'no-store' });
    if (!response.ok) throw new Error('申請状況を取得できませんでした。');
    setPortal(await response.json());
  }
  useEffect(() => { load().catch(() => setError('申請状況を取得できませんでした。')); }, []);
  async function reaccept() {
    if (!portal?.application) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/creator/application', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REACCEPT_TERMS', applicationId: portal.application.id,
          termsVersion: '2026-09-13-v1', termsAccepted: true }) });
      if (!response.ok) throw new Error('規約への再同意を記録できませんでした。');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '再同意できませんでした。'); }
    finally { setBusy(false); }
  }
  if (error) return <p role="alert" className={styles.error}>{error}</p>;
  if (!portal) return <p role="status" className={styles.loading}>読み込み中…</p>;
  const app = portal.application;
  const profile = portal.profile;
  return (
    <section className={styles.portalSection}>
      {!app && !profile && (
        <div className={styles.statusPanel}>
          <p className={styles.nextAction}>申請はまだありません。<Link href="/creator/apply" className={styles.tertiaryLink}>申請する</Link></p>
        </div>
      )}
      {app && (
        <div className={styles.statusPanel}>
          <p className={styles.statusHeading}>現在の状況</p>
          <span className={styles.statusBadge}>{publicStatusLabel(app.status, APPLICATION_PUBLIC_LABELS)}</span>
          <p className={styles.statusMeta}>申請日：{new Date(app.submitted_at).toLocaleDateString('ja-JP')}</p>
          {app.status === 'SUBMITTED' && (
            mediaVerificationNextAction(app.primary_media_verification) ?? (
              <p className={styles.nextAction}>結果をお待ちください。</p>
            )
          )}
          {app.status === 'UNDER_REVIEW' && (
            mediaVerificationNextAction(app.primary_media_verification) ?? (
              <p className={styles.nextAction}>審査結果をお待ちください。</p>
            )
          )}
          {app.status === 'NEED_MORE_INFO' && (
            <p className={styles.nextAction}>
              <Link href="/support" className={styles.tertiaryLink}>サポートに連絡してください。</Link>
            </p>
          )}
          {app.status === 'TERMS_REACCEPT_REQUIRED' && (
            <div className={styles.nextAction}>
              <p>規約の再確認が必要です。<Link href="/legal/creator-affiliate-terms" className={styles.tertiaryLink}>現在の規約</Link>を確認してから</p>
              <button type="button" disabled={busy} onClick={reaccept} className={styles.buttonPrimary}>再同意する</button>
            </div>
          )}
          {app.status === 'APPROVED_PENDING_ACTIVATION' && !profile && <p>有効化は別途ご案内します。</p>}
          {app.status === 'REJECTED' && (
            <p className={styles.nextAction}>
              再申請可能日：{app.rejected_reapply_after ? new Date(app.rejected_reapply_after).toLocaleDateString('ja-JP') : '個別案内'}。
              <Link href="/creator/apply" className={styles.tertiaryLink}>再申請</Link>
            </p>
          )}
          {app.status === 'BLOCKED' && (
            <p className={styles.nextAction}>
              再申請はできません。<Link href="/support" className={styles.tertiaryLink}>サポート</Link>へお問い合わせください。
            </p>
          )}
        </div>
      )}
      {profile && (
        <div className={`${styles.statusPanel} ${styles.profileBlock}`}>
          <p className={styles.statusHeading}>Creatorプロフィール</p>
          <p className={styles.statusMeta}>Creatorコード：<strong>{profile.creator_code}</strong></p>
          <p className={styles.statusMeta}>初回最終承認日：{new Date(profile.first_final_approved_at).toLocaleDateString('ja-JP')}</p>
          <p className={styles.statusMeta}>規約バージョン：{profile.terms_version}</p>
          <p className={styles.statusMeta}>
            有効化状況：<span className={styles.statusBadge}>{publicStatusLabel(profile.status, PROFILE_PUBLIC_LABELS)}</span>
          </p>
          {profile.status === 'APPROVED_PENDING_ACTIVATION' && <p>有効化は別途ご案内します。</p>}
          {(profile.status === 'SUSPENDED' || profile.status === 'REVOKED') && (
            <p className={styles.nextAction}>
              <Link href="/support" className={styles.tertiaryLink}>サポートへお問い合わせください。</Link>
            </p>
          )}
        </div>
      )}
      <p className={styles.callout}>
        紹介計測・報酬レポート・支払機能はまだ有効ではありません。現在使えるアフィリエイトURLは表示していません。
      </p>
    </section>
  );
}
