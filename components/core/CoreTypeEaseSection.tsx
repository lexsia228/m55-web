import type { CoreResult } from '../../lib/m55/coreResult/types';
import { lifestyleTriptych } from './corePublicCopy';
import styles from './CoreExperience.module.css';

export default function CoreTypeEaseSection({ result }: { result: CoreResult }) {
  const cards = lifestyleTriptych(result);
  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.surfaceTypeEase} ${styles.tierBSection}`}
      aria-labelledby="core-type-ease"
    >
      <h2 id="core-type-ease" className={styles.sectionTitle}>
        このタイプは、こう出やすい
      </h2>
      <p className={styles.tierBSummary}>仕事・対人・近い関係での感触の目安です</p>
      <p className={styles.sectionLead}>
        見えている傾向は、仕事や判断、人との距離、近い関係の中で、次のような感触として立ち上がりやすいです。
      </p>
      <div className={`${styles.cardGrid} ${styles.typeEaseGrid}`}>
        {cards.map((c) => (
          <div
            key={c.title}
            className={styles.card}
          >
            <h3 className={styles.cardTitle}>{c.title}</h3>
            <p className={styles.cardBody}>{c.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
