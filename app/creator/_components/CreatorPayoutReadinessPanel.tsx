'use client';

import { useCallback, useEffect, useState } from 'react';
import { createOnboardingClientIdempotencyKeyV1 } from '../../../lib/m55/creatorProvider/onboardingClientIdempotency';
import styles from '../creator.module.css';

type ReadinessBundle = {
  readiness: {
    blockReasons: string[];
    nextActions: string[];
    taxProfileReady: boolean;
    providerLinkState: string;
    providerPayoutReadinessGreen: boolean;
    payoutSettlementAvailable: false;
    compatibilityNote: string;
    r7ReferralIssueEligible: boolean;
    operatingModelReferralGateMet: boolean;
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
    const data = (await response.json()) as ReadinessBundle;
    setBundle(data);
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
      <p className={styles.statusHeading}>受取準備（R8）</p>
      <p className={styles.cardBody}>
        コミッションの出金・精算は R8 完了まで開始されません。ここでは将来の受取に向けた情報登録のみ行います。
      </p>
      <p className={styles.statusMeta}>{readiness.compatibilityNote}</p>
      <ul className={styles.nextAction}>
        {readiness.nextActions.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {(editable && (!readiness.taxProfileReady || bundle.taxProfile)) && (
        <div className={styles.card}>
          <p className={styles.cardTitle}>税務プロフィール</p>
          <label className={styles.statusMeta}>
            区分
            <select value={taxPayeeType} onChange={(e) => setTaxPayeeType(e.target.value as typeof taxPayeeType)}>
              <option value="INDIVIDUAL">個人</option>
              <option value="CORPORATION">法人</option>
            </select>
          </label>
          <label className={styles.statusMeta}>
            適格請求書登録
            <select value={invoiceStatus} onChange={(e) => setInvoiceStatus(e.target.value as typeof invoiceStatus)}>
              <option value="NOT_REGISTERED">未登録</option>
              <option value="REGISTERED">登録済み</option>
              <option value="NOT_APPLICABLE">該当なし</option>
            </select>
          </label>
          {invoiceStatus === 'REGISTERED' && (
            <label className={styles.statusMeta}>
              登録番号（T+13桁）
              <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </label>
          )}
          <div className={styles.cardActions}>
            <button type="button" className={styles.buttonPrimary} disabled={busy} onClick={saveTaxProfile}>
              {readiness.taxProfileReady ? '税務プロフィールを更新' : '税務プロフィールを保存'}
            </button>
          </div>
        </div>
      )}
      {editable && readiness.taxProfileReady && !readiness.providerPayoutReadinessGreen && (
        <div className={styles.cardActions}>
          {bundle.adapterMode === 'DISABLED' || bundle.adapterMode === 'LIVE_BLOCKED' ? (
            <p className={styles.nextAction}>
              Stripe テストモード連携は、運営側の設定（テスト用シークレットキーと明示的な有効化）が整うまで開始できません。
            </p>
          ) : (
            <>
              <button type="button" className={styles.buttonPrimary} disabled={busy} onClick={() => startOnboarding(false)}>
                Stripe 受取設定を開始
              </button>
              {readiness.providerLinkState !== 'NOT_STARTED' && (
                <button type="button" className={styles.secondaryCta} disabled={busy} onClick={() => startOnboarding(true)}>
                  設定を再開
                </button>
              )}
            </>
          )}
        </div>
      )}
      {readiness.r7ReferralIssueEligible && !readiness.operatingModelReferralGateMet && (
        <p className={styles.statusMeta}>
          R7 時点の条件（有効プロフィール＋コンプライアンス）のみ満たしている場合があります。現行ポリシーでは Operating Model §8 の受取準備完了まで紹介URLの新規発行は行いません。出金・精算も開始されません。
        </p>
      )}
      <p className={styles.statusMeta}>
        プロバイダ状態：{readiness.providerLinkState}（ローカル：{bundle.adapterMode}）
      </p>
    </div>
  );
}
