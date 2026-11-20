'use client';

import { useEffect, useState } from 'react';
import {
  formatJpyAmountJa,
  formatLifecycleEntitlementLabelJa,
} from '../../../lib/m55/creatorDashboard/creatorDisplayFormat';
import styles from '../dashboard/dashboard.module.css';

type StatementPayload = {
  statement: {
    productionCashActivation: false;
    payoutTransferNetworkEnabled: false;
    commissionLifecycleCounts: Record<string, number>;
    lockedInstructions: Array<{
      instructionIdSuffix: string;
      settlementPayableJpy: number;
      payoutProcessingFeeJpy: number;
      netPayoutJpy: number;
      payoutDueDateReliable: boolean;
      fundsTransferred: false;
    }>;
    notices: string[];
  };
};

export function CreatorStatementPanel() {
  const [payload, setPayload] = useState<StatementPayload | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/creator/statement', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('STATEMENT_UNAVAILABLE');
        return (await response.json()) as StatementPayload;
      })
      .then(setPayload)
      .catch(() => setError('精算明細を読み込めませんでした。'));
  }, []);

  if (error) return <p className={styles.meta}>{error}</p>;
  if (!payload) return <p className={styles.meta}>精算明細を読み込み中…</p>;

  const { statement } = payload;
  const lifecycleEntries = Object.entries(statement.commissionLifecycleCounts);

  return (
    <section className={styles.panel}>
      <h2 className={styles.sectionTitle}>精算明細</h2>
      <p className={styles.note}>
        銀行振込はまだ開始されていません。ここに表示されるのは、台帳上の残高区分と確定処理の参考情報です。
      </p>
      {lifecycleEntries.length === 0 ? (
        <p className={styles.meta} role="status">
          区分別の残高記録はありません。
        </p>
      ) : (
        <>
          <p className={styles.meta}>区分別の現在残高</p>
          <ul className={styles.activityList}>
            {lifecycleEntries.map(([state, amountJpy]) => (
              <li key={state}>
                <span>{formatLifecycleEntitlementLabelJa(state)}</span>
                <span>{formatJpyAmountJa(amountJpy)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {statement.lockedInstructions.length === 0 ? (
        <p className={styles.meta} role="status">
          確定済みの振込指示はありません。
        </p>
      ) : (
        <ul className={styles.activityList}>
          {statement.lockedInstructions.map((row) => (
            <li key={row.instructionIdSuffix}>
              <span>参照 …{row.instructionIdSuffix}</span>
              <span>
                振込対象額 {formatJpyAmountJa(row.settlementPayableJpy)} / 振込手数料{' '}
                {formatJpyAmountJa(row.payoutProcessingFeeJpy)} / お受け取り見込み{' '}
                {formatJpyAmountJa(row.netPayoutJpy)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {statement.notices.map((line) => (
        <p key={line} className={styles.note}>
          {line}
        </p>
      ))}
    </section>
  );
}