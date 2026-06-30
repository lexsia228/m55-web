import type { CoreResult } from '../../lib/m55/coreResult/types';
import { freeCoreClosingSummary } from '../../lib/m55/coreFreePublicDisplay';
import { withNickname } from './corePublicCopy';
import styles from './CoreExperience.module.css';

interface Props {
  result: CoreResult;
  nickname: string;
}

export default function CoreClosingSummarySection({ result, nickname }: Props) {
  const nick = nickname.trim();
  const { line1, line2 } = freeCoreClosingSummary(result);
  const render = (line: string) => (nick ? withNickname(line, nick) : line);

  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.surfaceClosingSummary} ${styles.tierBSection}`}
      aria-labelledby="core-closing-summary"
    >
      <span className={styles.tierBOverline}>まとめ</span>
      <h2 id="core-closing-summary" className={styles.sectionTitle}>
        最後に、ひとことで言うと
      </h2>
      <div className={styles.closingSummaryCard}>
        <p className={styles.closingSummaryLead}>{render(line1)}</p>
        <p className={styles.closingSummaryBridge}>{render(line2)}</p>
      </div>
    </section>
  );
}
