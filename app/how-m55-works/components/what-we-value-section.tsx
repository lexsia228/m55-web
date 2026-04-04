import styles from '../how-it-works.module.css';

const VALUES = [
  '一貫した読み解きの型を提供すること',
  'どの資質にも優劣をつけないこと',
  '「当たる/当たらない」ではなく、観察の補助線として機能すること',
  '購入前に無料で概要を確認できること',
  '相談室では、レポートを読んだうえでの対話を前提とすること',
] as const;

const AVOIDS = [
  '「あなたはこうです」と断定すること',
  '科学的な証明や統計的エビデンスを主張すること',
  '他のサービスと優劣を競うこと',
  '万人に効果があると約束すること',
  '購入を急かすこと',
] as const;

export function WhatWeValueSection() {
  return (
    <section className={styles.shellWide} aria-labelledby="how-m55-values-title">
      <p className={styles.sectionKicker}>06 — M55の姿勢</p>
      <div className={styles.visibleIntro}>
        <h2 id="how-m55-values-title" className={styles.sectionTitle}>
          M55が重視すること。
          <br />
          M55がしないこと。
        </h2>
        <p className={styles.sectionLead}>
          M55は、自分を責め続ける負担を減らす手がかりになりたいと考えています。
          <br />
          そのために、次の姿勢を大切にしています。
        </p>
      </div>

      <div className={styles.valuesGrid}>
        <div>
          <div className={styles.valuesColTitle}>
            <div className={styles.valuesColRule} aria-hidden />
            <span className={styles.valuesColLabel}>重視すること</span>
          </div>
          <ul className={styles.valuesList}>
            {VALUES.map((v) => (
              <li key={v}>
                <span className={styles.valuesBullet} aria-hidden />
                <p className={styles.valuesItemText}>{v}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className={styles.valuesColTitle}>
            <div className={styles.valuesColRuleMuted} aria-hidden />
            <span className={`${styles.valuesColLabel} ${styles.valuesColLabelMuted}`}>しないこと</span>
          </div>
          <ul className={styles.valuesList}>
            {AVOIDS.map((a) => (
              <li key={a}>
                <span className={`${styles.valuesBullet} ${styles.valuesBulletMuted}`} aria-hidden />
                <p className={`${styles.valuesItemText} ${styles.valuesItemTextMuted}`}>{a}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.valuesClosing}>
        <p className={styles.valuesClosingLead}>
          なぜ自分はこうなのか。
          <br />
          なぜ人と同じようにできないのか。
        </p>
        <p>
          そう問い続けて疲れてしまったとき、M55は「こういう傾向が読み取れる」という視点を差し出します。
        </p>
        <p>
          それは答えではありません。
          <br />
          でも、自分を眺めるための<span className={styles.emphasisInline}>静かな地図</span>にはなり得ます。
        </p>
      </div>
    </section>
  );
}
