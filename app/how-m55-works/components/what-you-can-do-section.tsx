import styles from '../how-it-works.module.css';

export function WhatYouCanDoSection() {
  return (
    <section className={`${styles.shellNarrow} ${styles.foldAlt}`} aria-labelledby="how-m55-receive-title">
      <p className={styles.sectionKicker}>04 — M55で受け取れるもの</p>
      <h2 id="how-m55-receive-title" className={styles.visuallyHidden}>
        M55で受け取れるもの
      </h2>

      <p className={styles.sectionLead}>まず無料 /core では、自分の輪郭を受け取ります。</p>
      <p className={styles.sectionLead}>
        本質ポスター、傾向の輪郭、M55の読み方、傾向と負荷、このタイプはどう出やすいか、まず整えるとよいこと、観測までを通して、今の自分がどう出やすいかをつかんでいきます。
      </p>
      <p className={styles.sectionLead}>
        ここで渡すのは、すべての答えではなく、まず見取り図です。
      </p>

      <p className={styles.sectionLead}>
        次に Entry Report では、入口として見えていた傾向が、生活の中でどう表れやすいか、どこで負荷になりやすいか、どの順番で整えると使いやすいかを、より深く章立てで受け取れます。
      </p>
      <p className={styles.sectionLead}>無料が輪郭なら、Entry Report は構造です。</p>
      <p className={styles.sectionLead}>
        Entry Report では、
        <br />
        レポートに加えて相談返書も受け取れます。
      </p>
      <p className={styles.sectionLead}>
        見えている傾向を前提に、
        <br />
        人間関係、疲れやすさ、動き方の迷いなどを、
        <br />
        その人の流れに沿って整理し直せます。
      </p>
      <p className={styles.sectionLead}>
        その場の入力だけを広げるのではなく、
        <br />
        すでに見えている傾向や組み合わせを踏まえて、
        <br />
        今の悩みへつなげていきます。
      </p>

      <div className={`${styles.depthDiagram} ${styles.receiveFlowBlock}`}>
        <p className={styles.depthDiagramKicker}>無料（輪郭）→ Entry Report（構造＋相談返書）</p>
        <p className={`${styles.sectionLead} ${styles.receiveFlowNote}`}>
          相談返書は独立した商品ではなく、
          <br />
          Entry Report に含まれる価値です。
        </p>
      </div>
    </section>
  );
}
