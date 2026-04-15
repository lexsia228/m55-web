import { STATIC_M55_READ_STEPS, withNickname } from './corePublicCopy';
import styles from './CoreExperience.module.css';

export default function CoreHowM55ReadsSection({ nickname }: { nickname: string }) {
  const nick = nickname.trim();
  
  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.surfaceReads}`}
      aria-labelledby="core-how-m55-reads"
    >
      {/* 見出し：呼び捨てを解消し、敬称付きへ */}
      <h2 id="core-how-m55-reads" className={styles.sectionTitle}>
        {withNickname('M55は、tさんの傾向をこう読みます', nick)}
      </h2>

      {/* 導入：V3正本の「生まれた日」「独自のアルゴリズム」定義を注入 */}
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
            className={`${styles.freezeStepItem} ${styles.coreReveal}`}
            data-core-reveal
            style={{ ['--reveal-delay' as string]: `${i * 50}ms` }}
          >
            <span className={styles.freezeStepIndex} aria-hidden>
              {i + 1}
            </span>
            <div className={styles.freezeStepCard}>
              <h3 className={styles.freezeStepTitle}>{step.title}</h3>
              <p className={styles.freezeStepBody}>
                {/* ステップ内テキストも置換を適用 */}
                {withNickname(step.body, nick)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}