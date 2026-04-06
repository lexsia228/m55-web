import type { CoreResult } from '../../lib/m55/coreResult/types';
import { lifestyleTriptych } from './corePublicCopy';
import styles from './CoreExperience.module.css';

export default function CoreTypeEaseSection({ result }: { result: CoreResult }) {
  const cards = lifestyleTriptych(result);
  return (
    <section className={styles.section} aria-labelledby="core-type-ease">
      <h2 id="core-type-ease" className={styles.sectionTitle}>
        このタイプは、こう出やすい
      </h2>
      <p className={styles.sectionLead}>見えている傾向は、生活の中でこう表れやすくなります。</p>
      <div className={styles.cardGrid}>
        {cards.map((c) => (
          <div key={c.title} className={styles.card}>
            <h3 className={styles.cardTitle}>{c.title}</h3>
            <p className={styles.cardBody}>{c.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
