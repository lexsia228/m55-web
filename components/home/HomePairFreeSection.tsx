import Link from 'next/link';
import {
  PAIR_READING_FREE_STRUCTURE_ITEMS,
  PAIR_READING_GUEST_SUPPORT_LINES,
} from '../../lib/m55/compatibility/pairReadingPublicStructure';
import { HOME_PAIR_READING_PUBLIC_HREF } from '../../lib/m55/homePairReadingPublicContract';
import HomeEditorialHeadline from './HomeEditorialHeadline';
import { renderProtectedJapaneseLine } from './homeEditorialJapaneseLine';
import styles from './HomePanel.module.css';

type Props = {
  eyebrowJa: string;
  headlineJa: string;
  bodyJa: string;
  statusJa: string;
  preparingStatusJa: string;
  ctaJa: string;
  pairLive: boolean;
};

export default function HomePairFreeSection({
  eyebrowJa,
  headlineJa,
  bodyJa,
  statusJa,
  preparingStatusJa,
  ctaJa,
  pairLive,
}: Props) {
  return (
    <section
      className={`${styles.lowerSection} ${styles.pairFreeStage}`}
      data-testid="m55-home-pair-free"
      aria-labelledby="m55-home-pair-free-title"
    >
      <p className={styles.sectionEyebrow}>{eyebrowJa}</p>
      <HomeEditorialHeadline
        id="m55-home-pair-free-title"
        className={styles.sectionHeadline}
        textJa={headlineJa}
      />
      <p className={styles.sectionLead}>{bodyJa}</p>
      <ul
        className={styles.pairStructureIndex}
        data-testid="m55-home-pair-free-structure"
        aria-label={eyebrowJa}
      >
        {PAIR_READING_FREE_STRUCTURE_ITEMS.map((item) => (
          <li key={item.index} className={styles.pairStructureIndexItem}>
            <p className={styles.pairStructureIndexNumber}>{item.index}</p>
            <p className={styles.pairStructureIndexTitle}>
              {renderProtectedJapaneseLine(item.titleJa, styles.headlineSemanticUnit, item.index)}
            </p>
          </li>
        ))}
      </ul>
      <div className={styles.pairFreeSupport}>
        {PAIR_READING_GUEST_SUPPORT_LINES.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      {pairLive ? (
        <>
          <p className={styles.pairFreeStatus}>{statusJa}</p>
          <Link
            href={HOME_PAIR_READING_PUBLIC_HREF}
            className={styles.pairFreeCtaLink}
            data-testid="m55-home-pair-free-cta"
          >
            {ctaJa}
          </Link>
        </>
      ) : (
        <p className={styles.pairFreePreparingStatus} data-testid="m55-home-pair-free-preparing">
          {preparingStatusJa}
        </p>
      )}
    </section>
  );
}
