import { STATIC_AI_EXPLAINER, withNickname } from './corePublicCopy';
import styles from './CoreExperience.module.css';

interface Props {
  nickname?: string;
}

export default function CoreAiChatExplainerSection({ nickname }: Props) {
  const nick = nickname?.trim() ?? '';

  const renderLead = (text: string) => {
    if (!nick) return text;
    return withNickname(text, nick);
  };

  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.surfaceAi} ${styles.tierBSection}`}
      aria-labelledby="core-ai-explainer"
    >
      <span className={styles.tierBOverline}>追加読み解きの仕組み</span>
      <h2 id="core-ai-explainer" className={styles.sectionTitle}>
        {STATIC_AI_EXPLAINER.title}
      </h2>

      <p className={styles.tierBSummary}>
        {renderLead(STATIC_AI_EXPLAINER.lead[0])}
      </p>

      <ul className={styles.aiExplainerList}>
        {STATIC_AI_EXPLAINER.items.map((item, i) => (
          <li key={item.title} className={styles.aiExplainerItem}>
            <span className={styles.aiExplainerItemNum} aria-hidden>{i + 1}</span>
            <div className={styles.aiExplainerItemHeader}>
              <span className={styles.aiExplainerTitle}>{item.title}</span>
              <span className={styles.aiExplainerBody}>{item.body}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
