import Image from 'next/image';
import styles from '../how-it-works.module.css';

export function WhatIsSection() {
  return (
    <section className={styles.shellNarrow} aria-labelledby="how-m55-what-is-title">
      <p className={styles.sectionKicker}>01 — M55とは</p>
      <h2 id="how-m55-what-is-title" className={styles.sectionTitle}>
        M55は、生年月日をもとにした
        <br />
        自己観察と解釈のためのシステムです。
      </h2>
      <div>
        <p className={styles.sectionLead}>
          M55が提供するのは、
          <span className={styles.emphasisInline}>一貫した入力ルールと、一貫した読み解きの型</span>
          ——自分を眺めるための、安定した視点です。
        </p>
        <p className={styles.sectionLead}>
          同じ入力からは、同じ構造が導かれます。
          <br />
          その一貫性が、自分を観察するための土台になります。
        </p>
      </div>

      <div className={styles.inputCallout}>
        <div className={styles.inputCalloutInner}>
          <div className={styles.inputCalloutThumb} aria-hidden>
            <Image
              src="/home/card-core-brain.webp"
              alt=""
              fill
              sizes="48px"
              className={styles.inputCalloutThumbImg}
            />
          </div>
          <div>
            <p className={styles.inputCalloutTitle}>生年月日</p>
            <p className={styles.inputCalloutText}>
              この入力を手がかりに、10通りの資質と5つの解析軸を通じて、傾向を読み解きます。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
