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

function formatMetric(metric: Metric): string {
  if (metric.kind === 'UNAVAILABLE') return '—';
  return String(metric.value);
}

function toUtcZInput(ms: number): string {
  return new Date(ms).toISOString().slice(0, 16);
}

function inputToUtcZ(value: string): string {
  return new Date(`${value}:00.000Z`).toISOString();
}

export function CreatorDashboardClient() {
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [referral, setReferral] = useState<ReferralPayload | null>(null);
  const [complianceCases, setComplianceCases] = useState<ComplianceCaseRow[]>([]);
  const [commissionNextCursor, setCommissionNextCursor] = useState<string | null>(null);
  const [complianceNextCursor, setComplianceNextCursor] = useState<string | null>(null);
  const [commissionMoreError, setCommissionMoreError] = useState('');
  const [complianceMoreError, setComplianceMoreError] = useState('');
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingCommissionMore, setLoadingCommissionMore] = useState(false);
  const [loadingComplianceMore, setLoadingComplianceMore] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setCommissionMoreError('');
    setComplianceMoreError('');
    const [dashRes, refRes] = await Promise.all([
      fetch('/api/creator/dashboard', { cache: 'no-store' }),
      fetch('/api/creator/referrals/current', { cache: 'no-store' }),
    ]);
    if (!dashRes.ok) throw new Error('ダッシュボードを読み込めませんでした。');
    const dashJson = (await dashRes.json()) as DashboardPayload;
    setDashboard(dashJson);
    setCommissionNextCursor(dashJson.commissionActivity.nextCursor ?? null);
    setExportFrom(toUtcZInput(dashJson.range.fromMs));
    setExportTo(toUtcZInput(dashJson.range.toMs));

    const complianceQuery = new URLSearchParams({
      fromMs: String(dashJson.range.fromMs),
      toMs: String(dashJson.range.toMs),
    });
    const complianceRes = await fetch(`/api/creator/compliance/cases?${complianceQuery}`, {
      cache: 'no-store',
    });
    if (complianceRes.ok) {
      const complianceJson = (await complianceRes.json()) as {
        cases: ComplianceCaseRow[];
        nextCursor?: string | null;
      };
      setComplianceCases(complianceJson.cases ?? []);
      setComplianceNextCursor(complianceJson.nextCursor ?? null);
    } else {
      setComplianceCases([]);
      setComplianceNextCursor(null);
    }

    if (refRes.ok) {
      const refJson = (await refRes.json()) as { referral: ReferralPayload | null };
      setReferral(refJson.referral);
    }
  }, []);

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
    load().catch(() => setError('ダッシュボードを読み込めませんでした。'));
  }, [load]);

  async function issueReferral() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/creator/referrals/issue', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) throw new Error('紹介URLを発行できませんでした。');
      setReferral(payload.referral as ReferralPayload);
    } catch {
      setError('紹介URLを発行できませんでした。');
    } finally {
      setBusy(false);
    }
  }

  async function rotateReferral() {
    if (!referral?.activeLinkId) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/creator/referrals/rotate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ expectedActiveLinkId: referral.activeLinkId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error('紹介URLを更新できませんでした。');
      setReferral(payload.referral as ReferralPayload);
    } catch {
      setError('紹介URLを更新できませんでした。');
    } finally {
      setBusy(false);
    }
  }

  function openExport() {
    if (!exportFrom || !exportTo) return;
    const from = inputToUtcZ(exportFrom);
    const to = inputToUtcZ(exportTo);
    const url = `/api/creator/dashboard/export?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  if (error) {
    return <p role="alert" className={styles.error}>{error}</p>;
  }
  if (!dashboard) {
    return <p role="status" className={styles.loading}>読み込み中…</p>;
  }

  const unavailable = dashboard.summary.unavailableMetrics;
  const entitlements = dashboard.summary.currentEntitlementsByLifecycle;
  const policy = dashboard.summary.policyVersions;

  return (
    <div className={styles.stack}>
      <section className={styles.panel}>
        <h2 className={styles.sectionTitle}>紹介リンク</h2>
        {referral?.shareUrl ? (
          <>
            <p className={styles.meta}>参照ID：{referral.linkDisplayReference}</p>
            <p className={styles.shareUrl}>{referral.shareUrl}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.button} disabled={busy} onClick={rotateReferral}>
                リンクを再発行
              </button>
            </div>
          </>
        ) : referral?.legacyRotationRequired && referral.activeLinkId ? (
          <>
            <p className={styles.meta}>参照ID：{referral.linkDisplayReference}</p>
            <p className={styles.note}>
              既存の紹介リンクは互換形式のため、表示用URLを再構築できません。再発行すると新しいURLが作成されます。
            </p>
            <div className={styles.actions}>
              <button type="button" className={styles.button} disabled={busy} onClick={rotateReferral}>
                互換リンクを再発行
              </button>
            </div>
          </>
        ) : (
          <div className={styles.actions}>
            <button type="button" className={styles.button} disabled={busy} onClick={issueReferral}>
              紹介URLを表示
            </button>
          </div>
        )}
        <p className={styles.note}>
          <Link href="/creator/portal" className={styles.link}>Creatorポータル</Link>でも申請状況を確認できます。
        </p>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.sectionTitle}>期間内の記録</h2>
        <dl className={styles.metrics}>
          <div>
            <dt>有効な紹介タッチ</dt>
            <dd>{formatMetric(dashboard.summary.qualifiedTouches)}</dd>
          </div>
          <div>
            <dt>帰属したコンバージョン</dt>
            <dd>{formatMetric(dashboard.summary.attributedConversions)}</dd>
          </div>
          <div>
            <dt>初回 eligible 購入</dt>
            <dd>{formatMetric(dashboard.summary.eligiblePaidConversions)}</dd>
          </div>
          <div>
            <dt>帰属売上（コミッション対象ベース合計）</dt>
            <dd>{formatMetric(dashboard.summary.attributedSales)}</dd>
          </div>
          <div>
            <dt>コミッション活動（差分合計）</dt>
            <dd>{formatMetric(dashboard.summary.commissionActivityJpy)}</dd>
          </div>
        </dl>
        <p className={styles.note}>{unavailable.unique_tracked_visits?.kind === 'UNAVAILABLE' ? unavailable.unique_tracked_visits.explanation : ''}</p>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.sectionTitle}>現在のコミッション残高（ライフサイクル別）</h2>
        {Object.keys(entitlements).length === 0 ? (
          <p className={styles.meta}>記録された残高はありません。</p>
        ) : (
          <ul className={styles.activityList}>
            {Object.entries(entitlements).map(([lifecycle, amount]) => (
              <li key={lifecycle}>
                <span>{lifecycle}</span>
                <span>{amount} 円</span>
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
          <p className={styles.meta}>この期間の活動はありません。</p>
        ) : (
          <ul className={styles.activityList}>
            {dashboard.commissionActivity.rows.map((row) => (
              <li key={row.displayReference}>
                <span className={styles.meta}>{row.displayReference}</span>
                <span>{row.publicReasonLabel}</span>
                <span>活動 {row.commissionDeltaJpy} / 残高 {row.entitlementAfterEventJpy}</span>
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
        {complianceCases.length === 0 ? (
          <p className={styles.meta}>この期間の記録はありません。</p>
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
          <button type="button" className={styles.button} onClick={openExport}>
            CSVをダウンロード
          </button>
        </div>
        <p className={styles.note}>最大366日・10,000行まで。超過時はエラーとなります。</p>
      </section>
    </div>
  );
}
