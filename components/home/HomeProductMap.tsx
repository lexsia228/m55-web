import Link from 'next/link';
import {
  HOME_PAIR_READING_PUBLIC_HREF,
  isHomePairReadingLivePublic,
} from '../../lib/m55/homePairReadingPublicContract';
import styles from './HomePanel.module.css';

type FreeCtaProps = {
  hasProfile: boolean;
  isLoaded: boolean;
  label: string;
  onOpenIntake: () => void;
};

type Props = {
  eyebrowJa: string;
  headlineJa: string;
  selfTitleJa: string;
  selfBodyJa: string;
  selfStatusJa: string;
  selfCtaJa: string;
  pairTitleJa: string;
  pairBodyJa: string;
  pairCtaJa: string;
  pairPreparingTitleJa: string;
  pairPreparingBodyJa: string;
  pairPreparingStatusJa: string;
  premiumTitleJa: string;
  premiumBodyJa: string;
  premiumLinkJa: string;
  freeCta: FreeCtaProps;
};

function ProductMapSelfAction({
  hasProfile,
  isLoaded,
  label,
  onOpenIntake,
}: FreeCtaProps) {
  if (!isLoaded) {
    return (
      <button
        type="button"
        className={styles.productMapActionLink}
        disabled
        aria-busy="true"
        data-testid="m55-home-product-map-self-loading"
      >
        {label}
      </button>
    );
  }
  if (!hasProfile) {
    return (
      <button
        type="button"
        className={styles.productMapActionLink}
        data-testid="m55-home-product-map-self-intake"
        onClick={onOpenIntake}
      >
        {label}
      </button>
    );
  }
  return (
    <Link href="/core" className={styles.productMapActionLink} data-testid="m55-home-product-map-self-core">
      {label}
    </Link>
  );
}

export default function HomeProductMap({
  eyebrowJa,
  headlineJa,
  selfTitleJa,
  selfBodyJa,
  selfStatusJa,
  selfCtaJa,
  pairTitleJa,
  pairBodyJa,
  pairCtaJa,
  pairPreparingTitleJa,
  pairPreparingBodyJa,
  pairPreparingStatusJa,
  premiumTitleJa,
  premiumBodyJa,
  premiumLinkJa,
  freeCta,
}: Props) {
  const pairLive = isHomePairReadingLivePublic();

  return (
    <div data-testid="m55-home-product-map-inner">
      <p className={styles.sectionEyebrow}>{eyebrowJa}</p>
      <h2 id="m55-home-product-map-title" className={styles.sectionHeadline}>{headlineJa}</h2>
      <ol className={styles.productMapEditorial}>
        <li className={styles.productMapItem}>
          <p className={styles.productMapIndex}>01</p>
          <p className={styles.productMapTitle}>{selfTitleJa}</p>
          <p className={styles.productMapBody}>{selfBodyJa}</p>
          <p className={styles.productMapStatus}>{selfStatusJa}</p>
          <ProductMapSelfAction {...freeCta} label={selfCtaJa} />
        </li>
        <li className={styles.productMapItem}>
          <p className={styles.productMapIndex}>02</p>
          {pairLive ? (
            <>
              <p className={styles.productMapTitle}>{pairTitleJa}</p>
              <p className={styles.productMapBody}>{pairBodyJa}</p>
              <Link
                href={HOME_PAIR_READING_PUBLIC_HREF}
                className={styles.productMapActionLink}
                data-testid="m55-home-product-map-pair-link"
              >
                {pairCtaJa}
              </Link>
            </>
          ) : (
            <>
              <p className={styles.productMapTitle}>{pairPreparingTitleJa}</p>
              <p className={styles.productMapBody}>{pairPreparingBodyJa}</p>
              <p className={styles.productMapPreparingStatus} data-testid="m55-home-product-map-pair-preparing">
                {pairPreparingStatusJa}
              </p>
            </>
          )}
        </li>
        <li className={styles.productMapItem}>
          <p className={styles.productMapIndex}>03</p>
          <p className={styles.productMapTitle}>{premiumTitleJa}</p>
          <p className={styles.productMapBody}>{premiumBodyJa}</p>
          <a href="#m55-home-premium-preview" className={styles.productMapActionLink} data-testid="m55-home-product-map-premium-link">
            {premiumLinkJa}
          </a>
        </li>
      </ol>
    </div>
  );
}
