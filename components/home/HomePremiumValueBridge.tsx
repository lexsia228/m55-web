import styles from './HomePanel.module.css';

type Props = {
  eyebrowJa: string;
  freeHeadingJa: string;
  freeItemsJa: readonly string[];
  premiumHeadingJa: string;
  premiumItemsJa: readonly string[];
};

export default function HomePremiumValueBridge({
  eyebrowJa,
  freeHeadingJa,
  freeItemsJa,
  premiumHeadingJa,
  premiumItemsJa,
}: Props) {
  return (
    <div className={styles.premiumValueBridge} data-testid="m55-home-premium-value-bridge">
      <p className={styles.premiumValueBridgeEyebrow}>{eyebrowJa}</p>
      <div className={styles.premiumValueBridgeCompare}>
        <div className={styles.premiumValueBridgeCol}>
          <p className={styles.premiumValueBridgeColHeading}>{freeHeadingJa}</p>
          <ul className={styles.premiumValueBridgeList}>
            {freeItemsJa.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className={styles.premiumValueBridgeDivider} aria-hidden="true" />
        <div className={styles.premiumValueBridgeCol}>
          <p className={styles.premiumValueBridgeColHeading}>{premiumHeadingJa}</p>
          <ul className={styles.premiumValueBridgeList}>
            {premiumItemsJa.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
