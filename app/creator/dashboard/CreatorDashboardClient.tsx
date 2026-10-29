'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import styles from './dashboard.module.css';

type Metric = { kind: 'COUNT'; value: number } | { kind: 'UNAVAILABLE'; explanation: string };

type DashboardPayload = {
  profileStatus: string;
  range: { fromMs: number; toMs: number };
  summary: {
    qualifiedTouches: Metric;
    attributedConversions: Metric;
    eligiblePaidConversions: Metric;
    attributedSales: Metric;
    commissionActivityJpy: Metric;
    currentEntitlementsByLifecycle: Record<string, number>;
    policyVersions: {
      attributionPolicyVersion: string | null;
      financialPolicyVersion: string | null;
      rateScheduleVersion: string | null;
    };
    unavailableMetrics: Record<string, Metric>;
  };
  commissionActivity: {
    rows: Array<{
      displayReference: string;
      recordedAt: string;
      lifecycleStateAfterEvent: string;
      commissionDeltaJpy: number;
      entitlementAfterEventJpy: number;
      releaseAtMs: number;
      publicReasonLabel: string;
      eventFamily: string;
    }>;
    nextCursor?: string | null;
  };
};

type ReferralPayload = {
  activeLinkId: string;
  shareUrl: string;
  linkDisplayReference: string;
  issuedAt: string;
  legacyRotationRequired?: boolean;
};

type ComplianceCaseRow = {
  displayReference: string;
  caseKind: string;
  status: string;
  openedAt: string;
  resolvedAt: string | null;
  publicDecisionLabel: string;
};

type ReferralLoadStatus = 'issued' | 'not_issued' | 'fetch_failed' | 'legacy_rotation';

type ComplianceLoadStatus = 'loading' | 'loaded' | 'failed';

const COMPLIANCE_LOAD_ERROR_MESSAGE =
  'コンプライアンス記録を読み込めませんでした。記録がないとは限りません。';

const ROTATE_CONFIRM_MESSAGE =
  'リンクを再発行すると、現在の紹介URLは直ちに使えなくなります。よろしいですか？';

const REFERRAL_ROTATE_UNCERTAIN_MESSAGE =
  '再発行の成否を確認できません。以前のURLが有効とは限りません。ページを再読み込みして現在のURLを確認してください。';

const REFERRAL_ISSUE_UNCERTAIN_MESSAGE =
  '発行の成否を確認できません。ページを再読み込みして現在のURLを確認してください。';

const LIFECYCLE_ENTITLEMENT_LABELS: Readonly<Record<string, string>> = {
  COMMISSION_PENDING_COMPLIANCE_REVIEW: 'コンプライアンス確認中',
  COMMISSION_HOLD: '保留',
  COMMISSION_PAYABLE: '支払可能',
  COMMISSION_REVERSED: '取消・返金反映',
  COMMISSION_ADJUSTED: '調整済み',
};

function formatCountMetric(metric: Metric): string {
  if (metric.kind === 'UNAVAILABLE') return '—';
  return `${metric.value.toLocaleString('ja-JP')} 件`;
}

function formatJpyMetric(metric: Metric): string {
  if (metric.kind === 'UNAVAILABLE') return '—';
  return `${metric.value.toLocaleString('ja-JP')} 円`;
}

function formatMetricExplanation(metric: Metric): string | null {
  if (metric.kind === 'UNAVAILABLE') return metric.explanation;
  return null;
}

function formatLifecycleEntitlementLabel(lifecycle: string): string {
  return LIFECYCLE_ENTITLEMENT_LABELS[lifecycle] ?? lifecycle;
}

function profileBlocksReferralActions(profileStatus: string): boolean {
  return profileStatus !== 'ACTIVE';
}

function profileReferralBlockedMessage(profileStatus: string): string | null {
  if (profileStatus === 'SUSPENDED') {
    return 'Creatorアカウントが停止中のため、紹介URLの発行・再発行はできません。';
  }
  if (profileStatus === 'REVOKED') {
    return 'Creatorアカウントが無効のため、紹介URLの発行・再発行はできません。';
  }
  if (profileStatus === 'APPROVED_PENDING_ACTIVATION') {
    return 'Creatorアカウントが有効化されるまで、紹介URLの発行・再発行はできません。';
  }
  return null;
}

function mapExportErrorCode(code: string | undefined): string {
  switch (code) {
    case 'INVALID_RANGE':
      return '期間の指定が正しくありません（UTCの開始・終了を確認してください）。';
    case 'RANGE_TOO_WIDE':
      return '期間は最大366日までです。';
    case 'EXPORT_ROW_LIMIT_EXCEEDED':
      return '行数が上限（10,000行）を超えています。期間を短くしてください。';
    case 'EXPORT_NOT_AVAILABLE':
      return 'このアカウントでは照合CSVを出力できません。';
    case 'UNAUTHORIZED':
    case 'FORBIDDEN':
      return 'CSVを出力する権限がありません。';
    default:
      return 'CSVを出力できませんでした。';
  }
}

function toUtcZInput(ms: number): string {
  return new Date(ms).toISOString().slice(0, 16);
}

function inputToUtcZ(value: string): string {
  return new Date(`${value}:00.000Z`).toISOString();
}

function tryInputToUtcZ(value: string): string | null {
  try {
    const iso = inputToUtcZ(value);
    if (!Number.isFinite(Date.parse(iso))) return null;
    return iso;
  } catch {
    return null;
  }
}

export function CreatorDashboardClient() {
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [referral, setReferral] = useState<ReferralPayload | null>(null);
  const [referralLoadStatus, setReferralLoadStatus] = useState<ReferralLoadStatus>('not_issued');
  const [complianceCases, setComplianceCases] = useState<ComplianceCaseRow[]>([]);
  const [complianceLoadStatus, setComplianceLoadStatus] = useState<ComplianceLoadStatus>('loading');
  const [complianceLoadError, setComplianceLoadError] = useState('');
  const [commissionNextCursor, setCommissionNextCursor] = useState<string | null>(null);
  const [complianceNextCursor, setComplianceNextCursor] = useState<string | null>(null);
  const [commissionMoreError, setCommissionMoreError] = useState('');
  const [complianceMoreError, setComplianceMoreError] = useState('');
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [loadError, setLoadError] = useState('');
  const [referralActionError, setReferralActionError] = useState('');
  const [exportError, setExportError] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [loadingCommissionMore, setLoadingCommissionMore] = useState(false);
  const [loadingComplianceMore, setLoadingComplianceMore] = useState(false);

  const applyReferralPayload = useCallback((payload: ReferralPayload | null) => {
    setReferral(payload);
    if (!payload) {
      setReferralLoadStatus('not_issued');
    } else if (payload.legacyRotationRequired) {
      setReferralLoadStatus('legacy_rotation');
    } else {
      setReferralLoadStatus('issued');
    }
  }, []);

  const loadReferralCurrentIndependent = useCallback(async () => {
    try {
      const refRes = await fetch('/api/creator/referrals/current', { cache: 'no-store' });
      if (!refRes.ok) {
        setReferral(null);
        setReferralLoadStatus('fetch_failed');
        return;
      }
      let refJson: { referral: ReferralPayload | null };
      try {
        refJson = (await refRes.json()) as { referral: ReferralPayload | null };
      } catch {
        setReferral(null);
        setReferralLoadStatus('fetch_failed');
        return;
      }
      applyReferralPayload(refJson.referral);
    } catch {
      setReferral(null);
      setReferralLoadStatus('fetch_failed');
    }
  }, [applyReferralPayload]);

  const loadComplianceCasesIndependent = useCallback(async (range: { fromMs: number; toMs: number }) => {
    setComplianceLoadStatus('loading');
    setComplianceLoadError('');
    try {
      const complianceQuery = new URLSearchParams({
        fromMs: String(range.fromMs),
        toMs: String(range.toMs),
      });
      const complianceRes = await fetch(`/api/creator/compliance/cases?${complianceQuery}`, {
        cache: 'no-store',
      });
      if (!complianceRes.ok) {
        setComplianceLoadStatus('failed');
        setComplianceLoadError(COMPLIANCE_LOAD_ERROR_MESSAGE);
        return;
      }
      let complianceJson: {
        cases: ComplianceCaseRow[];
        nextCursor?: string | null;
      };
      try {
        complianceJson = (await complianceRes.json()) as {
          cases: ComplianceCaseRow[];
          nextCursor?: string | null;
        };
      } catch {
        setComplianceLoadStatus('failed');
        setComplianceLoadError(COMPLIANCE_LOAD_ERROR_MESSAGE);
        return;
      }
      setComplianceCases(complianceJson.cases ?? []);
      setComplianceNextCursor(complianceJson.nextCursor ?? null);
      setComplianceLoadStatus('loaded');
    } catch {
      setComplianceLoadStatus('failed');
      setComplianceLoadError(COMPLIANCE_LOAD_ERROR_MESSAGE);
    }
  }, []);

  const load = useCallback(async () => {
    setLoadError('');
    setCommissionMoreError('');
    setComplianceMoreError('');
    const dashRes = await fetch('/api/creator/dashboard', { cache: 'no-store' });
    if (!dashRes.ok) throw new Error('DASHBOARD_LOAD_FAILED');
    const dashJson = (await dashRes.json()) as DashboardPayload;
    setDashboard(dashJson);
    setCommissionNextCursor(dashJson.commissionActivity.nextCursor ?? null);
    setExportFrom(toUtcZInput(dashJson.range.fromMs));
    setExportTo(toUtcZInput(dashJson.range.toMs));

    await loadComplianceCasesIndependent(dashJson.range);
    await loadReferralCurrentIndependent();
  }, [loadComplianceCasesIndependent, loadReferralCurrentIndependent]);

  async function loadMoreCommissionActivity() {
    if (!dashboard || !commissionNextCursor || loadingCommissionMore) return;
    setLoadingCommissionMore(true);
    setCommissionMoreError('');
    try {
      const query = new URLSearchParams({
        fromMs: String(dashboard.range.fromMs),
        toMs: String(dashboard.range.toMs),
        cursor: commissionNextCursor,
      });
      const response = await fetch(`/api/creator/dashboard?${query}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('COMMISSION_PAGE_FAILED');
      const payload = (await response.json()) as DashboardPayload;
      setDashboard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          commissionActivity: {
            rows: [...prev.commissionActivity.rows, ...payload.commissionActivity.rows],
            nextCursor: payload.commissionActivity.nextCursor ?? null,
          },
        };
      });
      setCommissionNextCursor(payload.commissionActivity.nextCursor ?? null);
    } catch {
      setCommissionMoreError('コミッション活動の続きを読み込めませんでした。');
    } finally {
      setLoadingCommissionMore(false);
    }
  }

  async function loadMoreComplianceCases() {
    if (!dashboard || !complianceNextCursor || loadingComplianceMore) return;
    setLoadingComplianceMore(true);
    setComplianceMoreError('');
    try {
      const query = new URLSearchParams({
        fromMs: String(dashboard.range.fromMs),
        toMs: String(dashboard.range.toMs),
        cursor: complianceNextCursor,
      });
      const response = await fetch(`/api/creator/compliance/cases?${query}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('COMPLIANCE_PAGE_FAILED');
      const payload = (await response.json()) as {
        cases: ComplianceCaseRow[];
        nextCursor?: string | null;
      };
      setComplianceCases((prev) => [...prev, ...(payload.cases ?? [])]);
      setComplianceNextCursor(payload.nextCursor ?? null);
    } catch {
      setComplianceMoreError('コンプライアンス記録の続きを読み込めませんでした。');
    } finally {
      setLoadingComplianceMore(false);
    }
  }

  useEffect(() => {
    load().catch(() => setLoadError('ダッシュボードを読み込めませんでした。'));
  }, [load]);

  async function issueReferral() {
    setBusy(true);
    setReferralActionError('');
    try {
      const response = await fetch('/api/creator/referrals/issue', { method: 'POST' });
      let payload: { referral?: ReferralPayload };
      try {
        payload = (await response.json()) as { referral?: ReferralPayload };
      } catch {
        throw new Error('ISSUE_UNCERTAIN');
      }
      if (!response.ok || !payload.referral) throw new Error('ISSUE_UNCERTAIN');
      applyReferralPayload(payload.referral);
    } catch {
      setReferral(null);
      setReferralLoadStatus('fetch_failed');
      setReferralActionError(REFERRAL_ISSUE_UNCERTAIN_MESSAGE);
    } finally {
      setBusy(false);
    }
  }

  async function rotateReferral() {
    if (!referral?.activeLinkId) return;
    if (!window.confirm(ROTATE_CONFIRM_MESSAGE)) return;
    setBusy(true);
    setReferralActionError('');
    try {
      const response = await fetch('/api/creator/referrals/rotate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ expectedActiveLinkId: referral.activeLinkId }),
      });
      let payload: { referral?: ReferralPayload };
      try {
        payload = (await response.json()) as { referral?: ReferralPayload };
      } catch {
        throw new Error('ROTATE_UNCERTAIN');
      }
      if (!response.ok || !payload.referral) throw new Error('ROTATE_UNCERTAIN');
      applyReferralPayload(payload.referral);
    } catch {
      setReferral(null);
      setReferralLoadStatus('fetch_failed');
      setReferralActionError(REFERRAL_ROTATE_UNCERTAIN_MESSAGE);
    } finally {
      setBusy(false);
    }
  }

  async function copyShareUrl() {
    if (!referral?.shareUrl) return;
    setCopyFeedback('');
    try {
      await navigator.clipboard.writeText(referral.shareUrl);
      setCopyFeedback('コピーしました');
    } catch {
      setCopyFeedback('コピーできませんでした。URLを手動で選択してください。');
    }
  }

  async function downloadExport() {
    if (!exportFrom || !exportTo) return;
    setExportBusy(true);
    setExportError('');
    try {
      const from = tryInputToUtcZ(exportFrom);
      const to = tryInputToUtcZ(exportTo);
      if (!from || !to) {
        setExportError('期間の指定が正しくありません（UTCの開始・終了を確認してください）。');
        return;
      }
      const url = `/api/creator/dashboard/export?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const response = await fetch(url, { cache: 'no-store' });
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok || !contentType.includes('text/csv')) {
        let code: string | undefined;
        try {
          const body = (await response.json()) as { error?: string };
          code = body.error;
        } catch {
          code = undefined;
        }
        setExportError(mapExportErrorCode(code));
        return;
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `m55-creator-reconciliation-${from.slice(0, 10)}_${to.slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setExportError('CSVを出力できませんでした。');
    } finally {
      setExportBusy(false);
    }
  }

  if (loadError) {
    return <p role="alert" className={styles.error}>{loadError}</p>;
  }
  if (!dashboard) {
    return <p role="status" className={styles.loading}>読み込み中…</p>;
  }

  const unavailable = dashboard.summary.unavailableMetrics;
  const entitlements = dashboard.summary.currentEntitlementsByLifecycle;
  const policy = dashboard.summary.policyVersions;
  const referralBlockedMessage = profileReferralBlockedMessage(dashboard.profileStatus);
  const referralActionsDisabled = busy || profileBlocksReferralActions(dashboard.profileStatus);

  return (
    <div className={styles.stack}>
      <section className={styles.panel}>
        <h2 className={styles.sectionTitle}>紹介リンク</h2>
        {referralBlockedMessage ? (
          <p className={styles.note} role="status">{referralBlockedMessage}</p>
        ) : null}
        {referralLoadStatus === 'fetch_failed' ? (
          <p className={styles.error} role="alert">
            紹介URLの状態を取得できませんでした。記録・コミッションの表示は引き続き確認できます。
          </p>
        ) : null}
        {referral?.shareUrl ? (
          <>
            <p className={styles.meta}>参照ID：{referral.linkDisplayReference}</p>
            <p className={styles.shareUrl}>{referral.shareUrl}</p>
            <p className={styles.note}>
              再発行すると、上記のURLは直ちに無効になり、新しいURLのみが有効になります。
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.buttonSecondary}
                disabled={!referral.shareUrl}
                onClick={copyShareUrl}
              >
                URLをコピー
              </button>
              <button
                type="button"
                className={styles.button}
                disabled={referralActionsDisabled}
                onClick={rotateReferral}
              >
                リンクを再発行
              </button>
            </div>
            {copyFeedback ? <p className={styles.feedback} role="status">{copyFeedback}</p> : null}
          </>
        ) : referral?.legacyRotationRequired && referral.activeLinkId ? (
          <>
            <p className={styles.meta}>参照ID：{referral.linkDisplayReference}</p>
            <p className={styles.note}>
              既存の紹介リンクは互換形式のため、表示用URLを再構築できません。再発行すると新しいURLが作成され、旧リンクは無効になります。
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.button}
                disabled={referralActionsDisabled}
                onClick={rotateReferral}
              >
                互換リンクを再発行
              </button>
            </div>
          </>
        ) : referralLoadStatus === 'not_issued' && !referralBlockedMessage ? (
          <>
            <p className={styles.meta} role="status">
              紹介URLはまだ発行されていません。下のボタンから表示できます。
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.button}
                disabled={referralActionsDisabled}
                onClick={issueReferral}
              >
                紹介URLを表示
              </button>
            </div>
          </>
        ) : referralLoadStatus === 'fetch_failed' ? null : (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.button}
              disabled={referralActionsDisabled}
              onClick={issueReferral}
            >
              紹介URLを表示
            </button>
          </div>
        )}
        {referralActionError ? (
          <p role="alert" className={styles.error}>{referralActionError}</p>
        ) : null}
        <p className={styles.note}>
          <Link href="/creator/portal" className={styles.link}>Creatorポータル</Link>
          でも申請状況を確認できます。
        </p>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.sectionTitle}>期間内の記録</h2>
        <dl className={styles.metrics}>
          <div>
            <dt>有効な紹介タッチ</dt>
            <dd>{formatCountMetric(dashboard.summary.qualifiedTouches)}</dd>
            {formatMetricExplanation(dashboard.summary.qualifiedTouches) ? (
              <dd className={styles.metricNote}>
                {formatMetricExplanation(dashboard.summary.qualifiedTouches)}
              </dd>
            ) : null}
          </div>
          <div>
            <dt>帰属した購入（件数）</dt>
            <dd>{formatCountMetric(dashboard.summary.attributedConversions)}</dd>
          </div>
          <div>
            <dt>対象となる初回購入（件数）</dt>
            <dd>{formatCountMetric(dashboard.summary.eligiblePaidConversions)}</dd>
          </div>
          <div>
            <dt>帰属売上（コミッション対象ベース）</dt>
            <dd>{formatJpyMetric(dashboard.summary.attributedSales)}</dd>
          </div>
          <div>
            <dt>コミッション活動額</dt>
            <dd>{formatJpyMetric(dashboard.summary.commissionActivityJpy)}</dd>
          </div>
        </dl>
        {unavailable.unique_tracked_visits?.kind === 'UNAVAILABLE' ? (
          <p className={styles.note}>{unavailable.unique_tracked_visits.explanation}</p>
        ) : null}
      </section>

      <section className={styles.panel}>
        <h2 className={styles.sectionTitle}>現在のコミッション残高</h2>
        {Object.keys(entitlements).length === 0 ? (
          <p className={styles.meta} role="status">
            記録された残高はありません（0円）。
          </p>
        ) : (
          <ul className={styles.activityList}>
            {Object.entries(entitlements).map(([lifecycle, amount]) => (
              <li key={lifecycle}>
                <span>{formatLifecycleEntitlementLabel(lifecycle)}</span>
                <span>{amount.toLocaleString('ja-JP')} 円</span>
              </li>
            ))}
          </ul>
        )}
        <p className={styles.meta}>
          適用ポリシー：
          {policy.attributionPolicyVersion ?? '—'} / {policy.financialPolicyVersion ?? '—'} /{' '}
          {policy.rateScheduleVersion ?? '—'}
        </p>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.sectionTitle}>コミッション活動</h2>
        {dashboard.commissionActivity.rows.length === 0 ? (
          <p className={styles.meta} role="status">この期間の活動は0件です。</p>
        ) : (
          <ul className={styles.activityList}>
            {dashboard.commissionActivity.rows.map((row) => (
              <li key={row.displayReference}>
                <span className={styles.meta}>{row.displayReference}</span>
                <span>{row.publicReasonLabel}</span>
                <span>
                  活動額 {row.commissionDeltaJpy.toLocaleString('ja-JP')} 円 / 残高{' '}
                  {row.entitlementAfterEventJpy.toLocaleString('ja-JP')} 円
                </span>
              </li>
            ))}
          </ul>
        )}
        {commissionNextCursor ? (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.button}
              disabled={loadingCommissionMore}
              onClick={loadMoreCommissionActivity}
            >
              コミッション活動をさらに読み込む
            </button>
          </div>
        ) : null}
        {commissionMoreError ? (
          <p role="alert" className={styles.error}>{commissionMoreError}</p>
        ) : null}
        <p className={styles.note}>release 時刻は審査・解放の目安であり、支払日ではありません。</p>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.sectionTitle}>コンプライアンス記録</h2>
        {complianceLoadStatus === 'loading' ? (
          <p className={styles.meta} role="status">コンプライアンス記録を読み込み中…</p>
        ) : complianceLoadStatus === 'failed' ? (
          <>
            <p role="alert" className={styles.error}>
              {complianceLoadError || COMPLIANCE_LOAD_ERROR_MESSAGE}
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.button}
                onClick={() => loadComplianceCasesIndependent(dashboard.range)}
              >
                コンプライアンス記録を再読み込み
              </button>
            </div>
          </>
        ) : complianceCases.length === 0 ? (
          <p className={styles.meta} role="status">この期間の記録は0件です。</p>
        ) : (
          <ul className={styles.activityList}>
            {complianceCases.map((row) => (
              <li key={row.displayReference}>
                <span className={styles.meta}>{row.displayReference}</span>
                <span>{row.publicDecisionLabel}</span>
                <span>{row.status}</span>
              </li>
            ))}
          </ul>
        )}
        {complianceNextCursor ? (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.button}
              disabled={loadingComplianceMore}
              onClick={loadMoreComplianceCases}
            >
              コンプライアンス記録をさらに読み込む
            </button>
          </div>
        ) : null}
        {complianceMoreError ? (
          <p role="alert" className={styles.error}>{complianceMoreError}</p>
        ) : null}
      </section>

      <section className={styles.panel}>
        <h2 className={styles.sectionTitle}>照合エクスポート（CSV）</h2>
        <div className={styles.exportRow}>
          <label>
            開始（UTC）
            <input
              type="datetime-local"
              value={exportFrom}
              onChange={(e) => setExportFrom(e.target.value)}
            />
          </label>
          <label>
            終了（UTC）
            <input
              type="datetime-local"
              value={exportTo}
              onChange={(e) => setExportTo(e.target.value)}
            />
          </label>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.button} disabled={exportBusy} onClick={downloadExport}>
            CSVをダウンロード
          </button>
        </div>
        {exportError ? <p role="alert" className={styles.error}>{exportError}</p> : null}
        <p className={styles.note}>
          列見出しは日本語です。最大366日・10,000行まで。超過時は画面にエラーを表示します。
        </p>
      </section>
    </div>
  );
}
