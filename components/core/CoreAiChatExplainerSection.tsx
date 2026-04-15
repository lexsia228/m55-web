import { STATIC_AI_EXPLAINER, withNickname } from './corePublicCopy';
import styles from './CoreExperience.module.css';

interface Props {
  nickname?: string;
}

export default function CoreAiChatExplainerSection({ nickname }: Props) {
  const nick = nickname?.trim() ?? '';

  // ニックネームの有無で表示を切り分ける安全なレンダラー
  const renderLead = (text: string) => {
    if (!nick) {
      // ニックネームがない場合は「tさん固有」を自然な表現にフォールバック
      return text.replace('先に見えている tさん固有の傾向を土台にして、', 'すでに見えている傾向を土台にして、');
    }
    // ニックネームがある場合は通常通り置換
    return withNickname(text, nick);
  };

  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.surfaceAi}`}
      aria-labelledby="core-ai-explainer"
    >
      {/* SSOT: データ側のタイトルに完全同期 */}
      <h2 id="core-ai-explainer" className={styles.sectionTitle}>
        {STATIC_AI_EXPLAINER.title}
      </h2>

      <div className={styles.aiExplainerLeadBlock}>
        {STATIC_AI_EXPLAINER.lead.map((p, i) => (
          <p key={i} className={`${styles.sectionLead} ${styles.aiExplainerIntro}`}>
            {renderLead(p)}
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