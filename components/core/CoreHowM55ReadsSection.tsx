import { STATIC_M55_READ_STEPS, withNickname } from './corePublicCopy';
import styles from './CoreExperience.module.css';

export default function CoreHowM55ReadsSection({ nickname }: { nickname: string }) {
  const nick = nickname.trim();
  
  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.surfaceReads} ${styles.tierBSection}`}
      aria-labelledby="core-how-m55-reads"
    >
      <h2 id="core-how-m55-reads" className={styles.sectionTitle}>
        {withNickname('M55は、tさんの輪郭をこう見ています', nick)}
      </h2>
      <p className={styles.tierBSummary}>
        生まれた日と入力情報から、いま出やすい傾向を短く整理しています
      </p>

      <p className={styles.sectionLead}>
        同じ資質名でも、生まれた日や入力情報の組み合わせによって、見え方は少しずつ変わります。
      </p>
      <p className={styles.sectionLead}>
        ここでは、その入口になる輪郭だけを短く確認します。
      </p>

      <ol className={styles.freezeStepList}>
        {STATIC_M55_READ_STEPS.map((step, i) => (
          <li
            key={step.title}
            className={styles.freezeStepItem}
          >
            <span className={styles.freezeStepIndex} aria-hidden>
              {i + 1}
            </span>
            <div className={styles.freezeStepCard}>
              <h3 className={styles.freezeStepTitle}>{step.title}</h3>
              <p className={styles.freezeStepBody}>
                {withNickname(step.body, nick)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}