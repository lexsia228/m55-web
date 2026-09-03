'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelAction,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import styles from './CompatibilitySavedReportsSection.module.css';
import { legacyPairDisplayIdentity, type PairDisplayIdentityV1 } from '../../lib/m55/compatibility/pairDisplayIdentity';
import { fetchJsonWithTimeout } from '../../lib/m55/commercialUx/boundedAsync';
import BoundedRecoveryState from '../common/BoundedRecoveryState';

export type CompatibilityReportListItem = {
  id: string;
  createdAt: string;
  chapterCount: 6;
  displayIdentity?: PairDisplayIdentityV1;
};

export function CompatibilitySavedReportsSection({
  reports,
  loading = false,
  error = false,
  preview = false,
}: {
  reports: readonly CompatibilityReportListItem[];
  loading?: boolean;
  error?: boolean;
  preview?: boolean;
}) {
  useEffect(() => {
    if (preview || reports.length === 0) return;
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.compatibilitySavedReportView,
      'compatibility_saved_report',
      'compatibility-saved-report-view',
    );
  }, [preview, reports.length]);

  return (
    <section
      className={styles.card}
      aria-labelledby="compatibility-saved-reports-title"
      data-testid="compatibility-saved-reports"
    >
      <p className={styles.eyebrow}>二人の関係</p>
      <h2 id="compatibility-saved-reports-title">二人の相性レポート</h2>
      {loading ? <p className={styles.body}>購入済みレポートを確認しています…</p> : null}
      {error ? (
        <BoundedRecoveryState
          title="レポートを確認できませんでした"
          description="通信状態を確認して、もう一度読み込んでください。"
          onRetry={() => window.location.reload()}
          escapeHref="/synastry"
          escapeLabel="二人の無料読み解きへ"
        />
      ) : null}
      {!loading && !error && reports.length === 0 ? (
        <>
          <p className={styles.body}>まだ購入済みの相性レポートはありません。</p>
          <Link className={styles.primary} href="/synastry">
            二人の関係を無料で見る
          </Link>
        </>
      ) : null}
      {!loading && !error && reports.length > 0 ? (
        <ul className={styles.list}>
          {reports.map((report) => {
            const identity = report.displayIdentity ?? legacyPairDisplayIdentity();
            return (
            <li key={report.id} className={styles.item}>
              <div>
                <strong>{identity.selfLabel} × {identity.partnerLabel}</strong>
                <span>{identity.relationLabel} · 二人の相性レポート</span>
                <span>
                  購入日 {new Intl.DateTimeFormat('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }).format(new Date(report.createdAt))}
                </span>
                <span>{report.chapterCount}章</span>
              </div>
              <Link
                className={styles.primary}
                href={`/synastry/report/${report.id}`}
                onClick={() => {
                  if (!preview) {
                    trackFunnelAction(
                      M55_FUNNEL_EVENTS.compatibilityOwnedReportOpen,
                      'compatibility_saved_report',
                    );
                  }
                }}
              >
                レポートを開く
              </Link>
            </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

export default function CompatibilitySavedReportsLibrary() {
  const [reports, setReports] = useState<CompatibilityReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { response, data } = await fetchJsonWithTimeout<{
          reports?: CompatibilityReportListItem[];
          available?: boolean;
        }>('/api/compatibility/reports', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('request failed');
        if (active) {
          setReports(Array.isArray(data.reports) ? data.reports : []);
          setAvailable(data.available !== false);
          setError(false);
        }
      } catch {
        if (active) {
          setAvailable(true);
          setError(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (available !== true) return null;

  return (
    <CompatibilitySavedReportsSection
      reports={reports}
      loading={loading}
      error={error}
    />
  );
}
