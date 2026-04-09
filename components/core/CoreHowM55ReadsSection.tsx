import { STATIC_M55_READ_STEPS, withNickname } from './corePublicCopy';
import styles from './CoreExperience.module.css';

export default function CoreHowM55ReadsSection({ nickname }: { nickname: string }) {
  const nick = nickname.trim();
  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.surfaceReads}`}
      aria-labelledby="core-how-m55-reads"
    >
      <h2 id="core-how-m55-reads" className={styles.sectionTitle}>
        {withNickname('M55は、t の傾向をこう読みます', nick)}
      </h2>
      <p className={styles.sectionLead}>
        {withNickname(
          'M55は、5つの固定観測軸とその組み合わせから、t の本質が生活の中でどう表れやすいかを見ています。',
          nick,
        )}
      </p>
      <ol className={styles.freezeStepList}>
        {STATIC_M55_READ_STEPS.map((step, i) => (
          <li
            key={step.title}
            className={`${styles.freezeStepItem} ${styles.coreReveal}`}
            data-core-reveal
            style={{ ['--reveal-delay' as string]: `${i * 50}ms` }}
          >
            <span className={styles.freezeStepIndex} aria-hidden>
              {i + 1}
            </span>
            <div className={styles.freezeStepCard}>
              <p className={styles.freezeStepTitle}>{step.title}</p>
              <p className={styles.freezeStepBody}>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
