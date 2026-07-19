import Link from 'next/link';
import { PUBLIC_NAV_TEN_VIEWS_LABEL_JA } from '../../lib/m55/topFreeEntryPublicCopy';
import { TEN_ASSET_PUBLIC_CATALOG } from '../../lib/m55/tenAssetPublicCatalog';
import styles from './HomePanel.module.css';

type Props = {
  eyebrowJa: string;
  headlineJa: string;
  bodyJa: string;
  linkJa: string;
};

export default function HomeTenAssetTeaser({ eyebrowJa, headlineJa, bodyJa, linkJa }: Props) {
  return (
    <div className={styles.tenAssetTeaserBand} data-testid="m55-home-ten-asset-teaser">
      <p className={styles.tenAssetTeaserEyebrow}>{eyebrowJa}</p>
      <h3 className={styles.tenAssetTeaserHeadline}>{headlineJa}</h3>
      <p className={styles.tenAssetTeaserBody}>{bodyJa}</p>
      <ul className={styles.tenAssetIndexGrid} aria-label={PUBLIC_NAV_TEN_VIEWS_LABEL_JA}>
        {TEN_ASSET_PUBLIC_CATALOG.map((entry) => (
          <li key={entry.stemChar} className={styles.tenAssetIndexCell}>
            <p className={styles.tenAssetIndexPersona}>{entry.persona}</p>
            <p className={styles.tenAssetIndexQuality}>{entry.qualityLabel}</p>
          </li>
        ))}
      </ul>
      <Link href="/ten-views" className={styles.tenAssetTeaserLink} data-testid="m55-home-ten-asset-teaser-link">
        {linkJa}
      </Link>
    </div>
  );
}
