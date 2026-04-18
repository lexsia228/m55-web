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
        {withNickname('M55は、tさんの傾向をこう読みます', nick)}
      </h2>
      <p className={styles.tierBSummary}>生まれた日を起点に、個別の出方を整理しています</p>

      <p className={styles.sectionLead}>
        M55では、生まれた日をもとに、独自のパーソナルアルゴリズムで傾向を整理しています。
      </p>
      <p className={styles.sectionLead}>
        {withNickname(
          'ここに表示されるのは、誰にでも同じ説明文ではなく、tさんの出方として読み出された輪郭です。',
          nick,
        )}
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