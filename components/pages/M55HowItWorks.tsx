"use client";

import styles from "./M55HowItWorks.module.css";

export default function M55HowItWorks() {
  return (
    <div className={styles.page}>
      {/* ═══════════════════════════════════════════════════════════════════
          FOLD 1 — Intro
          ═══════════════════════════════════════════════════════════════════ */}
      <section className={styles.foldIntro}>
        <h1 className={styles.pageTitle}>M55の見方</h1>
        <p className={styles.pageLead}>
          無料で見えるものと、その先で深く見えるもの。
        </p>
        <p className={styles.pageSupport}>
          M55 がどんなふうにあなたを読みほどくのかを、先にわかりやすくまとめました。
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOLD 2 — What you can see for free
          ═══════════════════════════════════════════════════════════════════ */}
      <section className={styles.foldFree}>
        <h2 className={styles.sectionTitle}>無料で見えること</h2>
        <div className={styles.freeGrid}>
          <article className={styles.freeCard}>
            <h3 className={styles.freeItemTitle}>本質の輪郭</h3>
            <p className={styles.freeItemDesc}>
              生年月日から導かれる五行のバランスと、あなたを一言で表す象徴的なタイトルを確認できます。
            </p>
          </article>
          <article className={styles.freeCard}>
            <h3 className={styles.freeItemTitle}>今日のリズム</h3>
            <p className={styles.freeItemDesc}>
              その日に意識しやすいテーマや、静かに向き合うとよい観点を毎日更新でお届けします。
            </p>
          </article>
          <article className={styles.freeCard}>
            <h3 className={styles.freeItemTitle}>今週の流れ</h3>
            <p className={styles.freeItemDesc}>
              一週間を俯瞰し、エネルギーの波やバランスの変化を大まかに把握するための手がかりです。
            </p>
          </article>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOLD 3 — What Entry Report adds
          ═══════════════════════════════════════════════════════════════════ */}
      <section className={styles.foldPaid}>
        <h2 className={styles.sectionTitle}>Entry Report で見えてくること</h2>
        <p className={styles.paidIntro}>
          無料で見える輪郭を起点に、より深い構造と具体的なロジックの重なりを読み解きます。
        </p>
        <div className={styles.paidList}>
          <div className={styles.paidRow}>
            <span className={styles.paidRowMarker}>1</span>
            <div className={styles.paidRowContent}>
              <h3 className={styles.paidItemTitle}>10のタイトルの全貌</h3>
              <p className={styles.paidItemDesc}>
                五行の配置から導かれる10の称号すべてを解説し、あなたの内面構造を多角的に示します。
              </p>
            </div>
          </div>
          <div className={styles.paidRow}>
            <span className={styles.paidRowMarker}>2</span>
            <div className={styles.paidRowContent}>
              <h3 className={styles.paidItemTitle}>年・月・日ごとの重なり</h3>
              <p className={styles.paidItemDesc}>
                時間軸ごとに異なるエネルギーの層を分解し、今どの影響が強く出ているかを整理します。
              </p>
            </div>
          </div>
          <div className={styles.paidRow}>
            <span className={styles.paidRowMarker}>3</span>
            <div className={styles.paidRowContent}>
              <h3 className={styles.paidItemTitle}>自己整理のためのヒント</h3>
              <p className={styles.paidItemDesc}>
                レポートに基づいた振り返りの視点と、日々に活かすための静かな示唆を添えます。
              </p>
            </div>
          </div>
        </div>
        <div className={styles.paidCtaWrapper}>
          <button type="button" className={styles.paidCtaButton}>
            Entry Report を詳しく見る
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOLD 4 — What M55 values
          ═══════════════════════════════════════════════════════════════════ */}
      <section className={styles.foldPhilosophy}>
        <h2 className={styles.sectionTitle}>M55 が大事にしていること</h2>
        <p className={styles.philosophyBody}>
          M55 は「答え」を押しつけるものではありません。
          あなた自身が自分を眺め、整理するための静かな鏡でありたいと考えています。
        </p>
        <p className={styles.philosophySupport}>
          外から与えられた結論ではなく、内側から気づく感覚を大切に。
          情報はすべて、自己観察の手がかりとしてお渡ししています。
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOLD 5 — What the consultation room is for
          ═══════════════════════════════════════════════════════════════════ */}
      <section className={styles.foldRoom}>
        <h2 className={styles.sectionTitle}>相談室でできること</h2>
        <div className={styles.roomCard}>
          <p className={styles.roomBody}>
            Entry Report をお持ちの方は、1回の相談チャットをご利用いただけます。
            レポートの内容をもとに、より深く掘り下げたい観点や、日常への活かし方について静かに対話できる空間です。
          </p>
          <p className={styles.roomSupport}>
            回答は数日以内にお届けします。緊急のご相談や医療・法律に関するアドバイスはお受けしておりません。
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOLD 6 — Final bridge
          ═══════════════════════════════════════════════════════════════════ */}
      <section className={styles.foldFinal}>
        <h2 className={styles.finalTitle}>まずは無料で、輪郭を見てみる</h2>
        <p className={styles.finalBody}>
          生年月日を入力するだけで、五行のバランスとあなたの象徴タイトルをすぐに確認できます。
        </p>
        <button type="button" className={styles.finalPrimaryCta}>
          無料で診断をはじめる
        </button>
        <p className={styles.finalNote}>
          登録なしでもご利用いただけます
        </p>
      </section>
    </div>
  );
}
