import {
  compactExistingPhrase,
  PAIR_SIGNATURE_LABELS,
} from '../../lib/m55/compatibility/pairResultSignatureCopy';
import styles from './PairResultSignature.module.css';

export default function PairResultSignature({
  overlap,
  difference,
  tone = 'light',
}: {
  overlap: string;
  difference: string;
  tone?: 'light' | 'night';
}) {
  const overlapLine = compactExistingPhrase(overlap);
  const differenceLine = compactExistingPhrase(difference);

  return (
    <section
      className={tone === 'night' ? `${styles.signature} ${styles.signatureNight}` : styles.signature}
      aria-labelledby="pair-signature-title"
      data-testid="m55-pair-result-signature"
      data-m55-pair-signature-tone={tone}
    >
      <p className={styles.eyebrow}>この二人の間</p>
      <h3 id="pair-signature-title" className={styles.title}>
        私一人の結果ではなく、この二人の間についての読み解きです
      </h3>

      <div className={styles.field} aria-hidden="true">
        <span className={`${styles.origin} ${styles.originYou}`}>
          <span className={styles.originMark} />
          {PAIR_SIGNATURE_LABELS.you}
        </span>
        <svg
          className={styles.rails}
          viewBox="0 0 320 88"
          role="presentation"
          focusable="false"
        >
          <path
            className={styles.railYou}
            d="M28 20 C 92 20, 118 44, 160 44"
          />
          <path
            className={styles.railPartner}
            d="M292 20 C 228 20, 202 44, 160 44"
          />
          <circle className={styles.sharedNode} cx="160" cy="44" r="11" />
        </svg>
        <span className={`${styles.origin} ${styles.originPartner}`}>
          <span className={styles.originMark} />
          {PAIR_SIGNATURE_LABELS.partner}
        </span>
        <p className={styles.between}>{PAIR_SIGNATURE_LABELS.between}</p>
      </div>

      <ul className={styles.chips} aria-label="この二人でいま見えていること">
        <li>
          <span>{PAIR_SIGNATURE_LABELS.overlap}</span>
          <p>{overlapLine}</p>
        </li>
        <li>
          <span>{PAIR_SIGNATURE_LABELS.difference}</span>
          <p>{differenceLine}</p>
        </li>
      </ul>
    </section>
  );
}
