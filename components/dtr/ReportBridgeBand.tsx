'use client';

import { REPORT_BRIDGE_BY_PART, type ReportBridgePartId } from '../../lib/m55/dtrReportBridgeCopy';
import styles from './ReportBridgeBand.module.css';

const ROMAN: Record<ReportBridgePartId, string> = {
  '1': 'Ⅰ',
  '2': 'Ⅱ',
  '3': 'Ⅲ',
  '4': 'Ⅳ',
};

export function ReportBridgeBand({ partId }: { partId: ReportBridgePartId }) {
  const block = REPORT_BRIDGE_BY_PART[partId];

  return (
    <aside
      className={styles.bridge}
      aria-label={`${ROMAN[partId]} 返書への橋渡し`}
    >
      <p className={styles.bridgeOverline}>返書で深める</p>
      <h3 className={styles.bridgeHeading}>
        <span className={styles.bridgeRoman} aria-hidden>
          {ROMAN[partId]}
        </span>
        この章で見えたこと
      </h3>
      <p className={styles.bridgeSeen}>{block.seenOneLiner}</p>
      <h4 className={styles.bridgeSubheading}>返書で扱うと深まる問い</h4>
      <ol className={styles.bridgeList}>
        {block.questions.map((q, i) => (
          <li key={i} className={styles.bridgeItem}>
            {q}
          </li>
        ))}
      </ol>
      <p className={styles.bridgeNote}>
        答え合わせは返書で。ここでは、いま持ち帰る問いだけ置いておきます。
      </p>
    </aside>
  );
}
