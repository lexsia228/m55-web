import Link from 'next/link';
import { buildPremiumProductShelfModel } from '../../../lib/m55/commercialUx/premiumProductShelf';
import styles from './lp.module.css';

const PAIR_DEPTH_CHAPTERS = [
  { no: '01', title: '重なりと違い', note: '二人の土台' },
  { no: '02', title: 'すれ違いの入口', note: '摩擦が出る場面' },
  { no: '03', title: '戻り方', note: '間合いを整える' },
  { no: '04', title: '会話の前', note: '言葉の置き方' },
  { no: '05', title: '続く連鎖', note: 'ループを見る' },
  { no: '06', title: 'これから', note: '関係の段階' },
] as const;

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
      data-m55-visual-subsystem="pair"
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

          <div
            className={styles.lpProductDepthLadder}
            data-testid="m55-premium-shelf-pair-depth"
            aria-label="有料レポートで読める6章の全体像"
          >
            <p className={styles.lpProductDepthHeading}>6章で読む、二人の関係</p>
            <ol className={styles.lpProductDepthList}>
              {PAIR_DEPTH_CHAPTERS.map((chapter) => (
                <li key={chapter.no} className={styles.lpProductDepthItem}>
                  <span className={styles.lpProductDepthNo} aria-hidden>
                    {chapter.no}
                  </span>
                  <span className={styles.lpProductDepthCopy}>
                    <strong>{chapter.title}</strong>
                    <small>{chapter.note}</small>
                  </span>
                </li>
              ))}
            </ol>
          </div>

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
