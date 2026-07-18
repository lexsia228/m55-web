import { TEN_ASSET_PUBLIC_CATALOG } from '../../lib/m55/tenAssetPublicCatalog';
import styles from './HomePanel.module.css';

export default function HomeTenAssetTiles() {
  return (
    <ul className={styles.tenAssetGrid} data-testid="m55-home-ten-asset-grid">
      {TEN_ASSET_PUBLIC_CATALOG.map((tile) => (
        <li key={tile.persona} className={styles.tenAssetTile}>
          <img
            src={tile.imageSrc}
            alt=""
            width={56}
            height={56}
            loading="lazy"
            decoding="async"
            className={styles.tenAssetImage}
          />
          <div className={styles.tenAssetText}>
            <p className={styles.tenAssetPersona}>{tile.persona}</p>
            <p className={styles.tenAssetQuality}>{tile.qualityLabel}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
