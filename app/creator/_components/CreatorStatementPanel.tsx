'use client';

import { useEffect, useState } from 'react';
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
      .catch(() => setError('精算ステートメントを読み込めませんでした。'));
  }, []);

  if (error) return <p className={styles.meta}>{error}</p>;
  if (!payload) return <p className={styles.meta}>精算ステートメントを読み込み中…</p>;

  const { statement } = payload;
  return (
    <section className={styles.panel}>
      <h2 className={styles.sectionTitle}>精算ステートメント（R8）</h2>
      <p className={styles.note}>
        銀行振込は開始されていません。表示は台帳・ロック済み指示の参考情報です。
      </p>
      <ul className={styles.activityList}>
        {Object.entries(statement.commissionLifecycleCounts).map(([state, count]) => (
          <li key={state}>
            <span>{state}</span>
            <span>{count}</span>
          </li>
        ))}
      </ul>
      {statement.lockedInstructions.length === 0 ? (
        <p className={styles.meta}>ロック済みの出金指示はありません。</p>
      ) : (
        <ul className={styles.activityList}>
          {statement.lockedInstructions.map((row) => (
            <li key={row.instructionIdSuffix}>
              <span>…{row.instructionIdSuffix}</span>
              <span>
                精算 {row.settlementPayableJpy} 円 / 手数料 {row.payoutProcessingFeeJpy} 円 / ネット{' '}
                {row.netPayoutJpy} 円
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
