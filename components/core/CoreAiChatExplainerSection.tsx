import { STATIC_AI_EXPLAINER, withNickname } from './corePublicCopy';
import styles from './CoreExperience.module.css';

interface Props {
  nickname?: string;
}

export default function CoreAiChatExplainerSection({ nickname }: Props) {
  const nick = nickname?.trim() ?? '';

  const renderLead = (text: string) => {
    if (!nick) {
      return text.replace('先に見えている tさん固有の傾向を土台にして、', 'すでに見えている傾向を土台にして、');
    }
    return withNickname(text, nick);
  };

  return (
    <section
      className={`${styles.tierCBridge} ${styles.coreReveal}`}
      aria-labelledby="core-ai-explainer"
      data-core-reveal
    >
      <h2 id="core-ai-explainer" className={styles.sectionTitle}>
        {STATIC_AI_EXPLAINER.title}
      </h2>

      <p className={styles.tierCBridgeLead}>
        {renderLead(STATIC_AI_EXPLAINER.lead[0])}
      </p>

      <ul className={styles.tierCBridgeList}>
        {STATIC_AI_EXPLAINER.items.map((item) => (
          <li key={item.title} className={styles.tierCBridgeItem}>
            <span className={styles.tierCBridgeItemTitle}>{item.title}</span>
            <span className={styles.tierCBridgeItemBody}>{item.body}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
