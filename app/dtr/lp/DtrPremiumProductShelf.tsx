import Link from 'next/link';
import { buildPremiumProductShelfModel } from '../../../lib/m55/commercialUx/premiumProductShelf';
import styles from './lp.module.css';

function ShelfArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M5 12h14M12 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function DtrPremiumProductShelf() {
  const shelf = buildPremiumProductShelfModel();

  return (
    <section
      id={shelf.sectionId}
      aria-labelledby="dtr-premium-shelf-title"
      className={styles.lpProductShelf}
      data-testid="m55-premium-product-shelf"
    >
      <h2 id="dtr-premium-shelf-title" className={styles.lpH2}>
        {shelf.sectionTitleJa}
      </h2>

      <div className={styles.lpProductShelfList} aria-label="ほかのプレミアム商品">
        <article className={styles.lpProductPairCard} aria-labelledby="dtr-premium-shelf-pair-name">
          <p id="dtr-premium-shelf-pair-name" className={styles.lpProductTierName}>
            {shelf.pairProduct.productNameJa}
          </p>
          <p className={styles.lpProductTierPrice}>{shelf.pairProduct.priceLabelJa}</p>
          <p className={styles.lpProductFamilyMeta}>{shelf.pairProduct.oneTimeNoteJa}</p>
          <p className={styles.lpProductValueSentence}>{shelf.pairProduct.valueSentenceJa}</p>

          <Link
            href={shelf.pairProduct.ctaHref}
            className="m55-lp-cta-btn"
            data-testid="m55-premium-shelf-pair-cta"
          >
            <span>{shelf.pairProduct.ctaLabelJa}</span>
            <ShelfArrowIcon />
          </Link>
          <p className={styles.lpProductPurchaseNote}>{shelf.pairProduct.purchaseNoteJa}</p>
        </article>
      </div>
    </section>
  );
}
