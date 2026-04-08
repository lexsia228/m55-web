import { STATIC_AI_EXPLAINER } from './corePublicCopy';
import styles from './CoreExperience.module.css';

export default function CoreAiChatExplainerSection() {
  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.surfaceAi}`}
      aria-labelledby="core-ai-explainer"
    >
      <h2 id="core-ai-explainer" className={styles.sectionTitle}>
        M55のAIチャットができること
      </h2>
      <div className={styles.aiExplainerLeadBlock}>
        {STATIC_AI_EXPLAINER.lead.map((p) => (
          <p key={p} className={`${styles.sectionLead} ${styles.aiExplainerIntro}`}>
            {p}
          </p>
        ))}
      </div>
      <div className={styles.aiExplainerValueDeck}>
        <ul className={styles.aiExplainerList}>
          {STATIC_AI_EXPLAINER.items.map((item) => (
            <li key={item.title} className={styles.aiExplainerItem}>
              <p className={styles.aiExplainerTitle}>{item.title}</p>
              <p className={styles.aiExplainerBody}>{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
