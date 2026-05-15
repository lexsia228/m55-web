import Image from 'next/image';
import styles from '../how-it-works.module.css';

export function WhatIsSection() {
  return (
    <section className={styles.shellNarrow} aria-labelledby="how-m55-what-is-title">
      <p className={styles.sectionKicker}>01 — M55とは</p>
      <h2 id="how-m55-what-is-title" className={styles.sectionTitle}>
        M55は、生まれた日をもとに見えてくる傾向を、
        <br />
        読みやすい順番で整理し、
        <br />
        自分を見つめ直すための地図として届ける読み物です。
      </h2>
      <div>
        <p className={styles.sectionLead}>
          M55が大切にしているのは、人をひとつの言葉で決めることではありません。
        </p>
        <p className={styles.sectionLead}>
          今どんな流れが出やすいのか。
          <br />
          どんな場面で力が出やすいのか。
          <br />
          どこで負荷がかかりやすいのか。
          <br />
          どこを整えると、動き方が使いやすくなるのか。
        </p>
        <p className={styles.sectionLead}>
          そうした感覚を、見えやすい入口から整理し、言葉に変えていきます。
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
            <p className={styles.inputCalloutTitle}>生まれた日</p>
            <p className={styles.inputCalloutText}>
              生まれた日を入口に、10通りの資質と5つの解析軸を通して、今の自分の輪郭を読み解いていきます。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
