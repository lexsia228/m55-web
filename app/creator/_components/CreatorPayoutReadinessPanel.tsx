'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { deriveCreatorStripeOnboardingCtaV1 } from '../../../lib/m55/creatorProvider/creatorStripePortalUi';
import { createOnboardingClientIdempotencyKeyV1 } from '../../../lib/m55/creatorProvider/onboardingClientIdempotency';
import type { R8PublicReadinessSnapshotV1 } from '../../../lib/m55/creatorProvider/contract';
import { parseR8StripeLinkStateV1 } from '../../../lib/m55/creatorProvider/parseR8StripeLinkStateV1';
import styles from '../creator.module.css';

type ReadinessBundle = {
  readiness: Pick<
    R8PublicReadinessSnapshotV1,
    | 'blockReasons'
    | 'nextActions'
    | 'taxProfileReady'
    | 'providerPayoutReadinessGreen'
    | 'payoutSettlementAvailable'
    | 'compatibilityNote'
    | 'r7ReferralIssueEligible'
    | 'operatingModelReferralGateMet'
    | 'providerSnapshot'
  > & {
    providerLinkState: R8PublicReadinessSnapshotV1['providerLinkState'];
  };
  taxProfile: null | {
    payeeType: string;
    invoiceRegistrationStatus: string;
    invoiceRegistrationNumberIfAny: string | null;
  };
  adapterMode: string;
};

type Props = {
  profileStatus: string;
  providerReturnSessionId?: string | null;
};

export function CreatorPayoutReadinessPanel({ profileStatus, providerReturnSessionId }: Props) {
  const [bundle, setBundle] = useState<ReadinessBundle | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [taxPayeeType, setTaxPayeeType] = useState<'INDIVIDUAL' | 'CORPORATION'>('INDIVIDUAL');
  const [invoiceStatus, setInvoiceStatus] = useState<'NOT_REGISTERED' | 'REGISTERED' | 'NOT_APPLICABLE'>('NOT_REGISTERED');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  const showPanel =
    profileStatus === 'APPROVED_PENDING_ACTIVATION' ||
    profileStatus === 'ACTIVE' ||
    profileStatus === 'SUSPENDED' ||
    profileStatus === 'REVOKED';

  const load = useCallback(async (refreshProvider: boolean) => {
    const params = new URLSearchParams();
    if (refreshProvider) params.set('refreshProvider', '1');
    if (providerReturnSessionId) params.set('session', providerReturnSessionId);
    const qs = params.toString();
    const response = await fetch(`/api/creator/provider/status${qs ? `?${qs}` : ''}`, { cache: 'no-store' });
    if (response.status === 401 || response.status === 403) return;
    if (!response.ok) throw new Error('受取準備の状況を取得できませんでした。');
    const data = (await response.json()) as {
      readiness?: Record<string, unknown>;
      taxProfile?: ReadinessBundle['taxProfile'];
      adapterMode?: string;
    };
    const linkState = parseR8StripeLinkStateV1(data.readiness?.providerLinkState);
    if (!linkState || !data.readiness) {
      throw new Error('受取準備の状況を取得できませんでした。');
    }
    const readiness = data.readiness as R8PublicReadinessSnapshotV1;
    setBundle({
      readiness: { ...readiness, providerLinkState: linkState },
      taxProfile: data.taxProfile ?? null,
      adapterMode: data.adapterMode ?? '',
    });
    if (data.taxProfile) {
      setTaxPayeeType(data.taxProfile.payeeType as 'INDIVIDUAL' | 'CORPORATION');
      setInvoiceStatus(data.taxProfile.invoiceRegistrationStatus as typeof invoiceStatus);
      setInvoiceNumber(data.taxProfile.invoiceRegistrationNumberIfAny ?? '');
    }
  }, [providerReturnSessionId]);

  useEffect(() => {
    if (!showPanel) return;
    load(Boolean(providerReturnSessionId)).catch(() => setError('受取準備の状況を取得できませんでした。'));
  }, [showPanel, load, providerReturnSessionId]);

  async function saveTaxProfile() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/creator/provider/tax-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payeeType: taxPayeeType,
          invoiceRegistrationStatus: invoiceStatus,
          invoiceRegistrationNumberIfAny: invoiceStatus === 'REGISTERED' ? invoiceNumber : null,
        }),
      });
      if (!response.ok) throw new Error('税務プロフィールを保存できませんでした。');
      await load(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存できませんでした。');
    } finally {
      setBusy(false);
    }
  }

  async function startOnboarding(resume: boolean) {
    setBusy(true);
    setError('');
    const clientKey = createOnboardingClientIdempotencyKeyV1();
    try {
      let response: Response | null = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          response = await fetch('/api/creator/provider/onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: resume ? 'RESUME' : 'START',
              idempotencyKey: clientKey,
            }),
          });
          break;
        } catch {
          if (attempt === 1) throw new Error('Stripe 受取設定を開始できませんでした。');
        }
      }
      if (!response || !response.ok) throw new Error('Stripe 受取設定を開始できませんでした。');
      const data = (await response.json()) as { onboardingUrl: string };
      window.location.assign(data.onboardingUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '開始できませんでした。');
    } finally {
      setBusy(false);
    }
  }

  if (!showPanel) return null;
  if (error) return <p role="alert" className={styles.error}>{error}</p>;
  if (!bundle) return <p role="status" className={styles.loading}>受取準備を読み込み中…</p>;

  const editable =
    profileStatus === 'ACTIVE' || profileStatus === 'APPROVED_PENDING_ACTIVATION';
  const { readiness } = bundle;

  return (
    <div className={`${styles.statusPanel} ${styles.profileBlock}`}>
      <p className={styles.statusHeading}>受取準備</p>
      <p className={styles.cardBody}>
        承認後に、税務プロフィールとStripe上での受取準備の入力が必要になる場合があります。
        コミッションの振込はまだ開始されていません。ここでは将来の受取に向けた情報登録のみ行います。
      </p>
      <p className={styles.statusMeta}>
        Stripeでの本人確認・口座登録を完了しても、M55での振込開始が直ちに保証されるわけではありません。
        紹介URLの利用には、所定の受取準備とコンプライアンス条件を満たす必要があります。
      </p>
      <ul className={styles.nextAction}>
        {readiness.nextActions.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {(editable && (!readiness.taxProfileReady || bundle.taxProfile)) && (
        <div className={styles.card}>
          <p className={styles.cardTitle}>
            税務プロフィール
            {readiness.taxProfileReady ? '（登録済み）' : '（未登録）'}
          </p>
          {!readiness.taxProfileReady ? (
            <p className={styles.cardBody}>個人/法人・適格請求書登録状況を入力して保存してください。</p>
          ) : (
            <p className={styles.cardBody}>登録内容は下から更新できます。未保存の変更がある場合のみ保存してください。</p>
          )}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="tax-payee-type">区分（必須）</label>
            <select
              id="tax-payee-type"
              className={styles.input}
              value={taxPayeeType}
              onChange={(e) => setTaxPayeeType(e.target.value as typeof taxPayeeType)}
            >
              <option value="INDIVIDUAL">個人</option>
              <option value="CORPORATION">法人</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="tax-invoice-status">適格請求書登録（必須）</label>
            <select
              id="tax-invoice-status"
              className={styles.input}
              value={invoiceStatus}
              onChange={(e) => setInvoiceStatus(e.target.value as typeof invoiceStatus)}
            >
              <option value="NOT_REGISTERED">未登録</option>
              <option value="REGISTERED">登録済み</option>
              <option value="NOT_APPLICABLE">該当なし</option>
            </select>
          </div>
          {invoiceStatus === 'REGISTERED' && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="tax-invoice-number">登録番号（T+13桁）</label>
              <input
                id="tax-invoice-number"
                className={styles.input}
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>
          )}
          <div className={styles.cardActions}>
            <button type="button" className={styles.buttonPrimary} disabled={busy} onClick={saveTaxProfile}>
              {readiness.taxProfileReady ? '変更を保存' : '税務プロフィールを保存'}
            </button>
          </div>
        </div>
      )}
      {editable && (() => {
        const stripeCta = deriveCreatorStripeOnboardingCtaV1({
          providerPayoutReadinessGreen: readiness.providerPayoutReadinessGreen,
          providerLinkState: readiness.providerLinkState,
          taxProfileReady: readiness.taxProfileReady,
          blockReasons: readiness.blockReasons,
          providerSnapshot: readiness.providerSnapshot,
        });
        if (stripeCta === 'COMPLETE') {
          return (
            <p className={styles.statusMeta}>
              Stripe 受取準備は、直近の同期時点で要件を満たしています。表示は送金開始を意味しません。
            </p>
          );
        }
        if (stripeCta === 'AWAITING_PROVIDER_SYNC') {
          return (
            <p className={styles.statusMeta}>
              Stripe 側の記録は要件を満たしているように見えますが、M55の保存同期が古いか未確認のため、受取準備完了として扱えません。
              紹介URLの新規発行もまだできません。再登録は不要な場合があります。
            </p>
          );
        }
        if (stripeCta === 'PROVIDER_ERROR_SUPPORT') {
          return (
            <p className={styles.statusMeta}>
              決済プロバイダ側で確認が必要な状態です。
              <Link href="/support" className={styles.tertiaryLink}>サポート</Link>
              へお問い合わせください。
            </p>
          );
        }
        if (stripeCta === 'NONE') {
          return null;
        }
        if (bundle.adapterMode === 'DISABLED' || bundle.adapterMode === 'LIVE_BLOCKED') {
          return (
            <p className={styles.nextAction}>
              Stripe テストモード連携は、運営側の設定が整うまで開始できません。
            </p>
          );
        }
        return (
          <div className={styles.cardActions}>
            {stripeCta === 'START' ? (
              <button type="button" className={styles.buttonPrimary} disabled={busy} onClick={() => startOnboarding(false)}>
                Stripe 受取設定を開始
              </button>
            ) : (
              <button type="button" className={styles.buttonPrimary} disabled={busy} onClick={() => startOnboarding(true)}>
                Stripe 受取設定を再開
              </button>
            )}
          </div>
        );
      })()}
      {readiness.r7ReferralIssueEligible && !readiness.operatingModelReferralGateMet && (
        <p className={styles.statusMeta}>
          プロフィールは有効ですが、税務・受取準備（直近同期）が完了するまで紹介URLの新規発行はできません。振込も開始されていません。
        </p>
      )}
    </div>
  );
}
