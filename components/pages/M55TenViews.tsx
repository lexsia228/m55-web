"use client";

import Link from "next/link";
import { TOP_FREE_ENTRY_PUBLIC_COPY } from "../../lib/m55/topFreeEntryPublicCopy";
import styles from "./M55TenViews.module.css";

const storefrontCopy = TOP_FREE_ENTRY_PUBLIC_COPY.storefront;
const ctaCopy = TOP_FREE_ENTRY_PUBLIC_COPY.cta;

/**
 * M55TenViews — 「10通りの資質」informational page
 *
 * Five-fold structure:
 * 1. Intro
 * 2. Ten qualities gallery
 * 3. Clarifying note
 * 4. Free-entry bridge
 * 5. Gentle paid-depth bridge
 *
 * Card order: 甲→乙→丙→丁→戊→己→庚→辛→壬→癸（正本と擬人名の対応固定）
 */

const viewCards = [
  {
    persona: "プレジデント",
    qualityLabel: "突破の資質",
    desc: "まっすぐ突き進む力。ゼロからイチを作り、自分の旗を立てる。",
    imageSrc: "/ten-views/president.webp",
    imageAlt: "president",
  },
  {
    persona: "プランナー",
    qualityLabel: "適応の資質",
    desc: "しなやかに広がる力。周囲とつながり、形を変えながら根を張る。",
    imageSrc: "/ten-views/planner.webp",
    imageAlt: "planner",
  },
  {
    persona: "インフルエンサー",
    qualityLabel: "発信の資質",
    desc: "太陽のように照らす力。存在自体で注目を集め、人を動かす。",
    imageSrc: "/ten-views/influencer.webp",
    imageAlt: "influencer",
  },
  {
    persona: "クリエイター",
    qualityLabel: "凝縮の資質",
    desc: "静かに燃え続ける力。一点に集中し、深いこだわりで形にする。",
    imageSrc: "/ten-views/creator.webp",
    imageAlt: "creator",
  },
  {
    persona: "マネージャー",
    qualityLabel: "不動の資質",
    desc: "どっしりと構える力。大きな視点で全体を受け止め、安心感を作る。",
    imageSrc: "/ten-views/manager.webp",
    imageAlt: "manager",
  },
  {
    persona: "プロデューサー",
    qualityLabel: "育成の資質",
    desc: "丁寧に育む力。身近な人を支え、知識や経験を着実に蓄える。",
    imageSrc: "/ten-views/producer.webp",
    imageAlt: "producer",
  },
  {
    persona: "エグゼキューター",
    qualityLabel: "変革の資質",
    desc: "古いものを断つ力。迷いを捨てて決断し、新しい秩序を切り拓く。",
    imageSrc: "/ten-views/executor.webp",
    imageAlt: "executor",
  },
  {
    persona: "デザイナー",
    qualityLabel: "研磨の資質",
    desc: "本質を磨く力。繊細な美意識で、物事の完成度を極限まで高める。",
    imageSrc: "/ten-views/designer.webp",
    imageAlt: "designer",
  },
  {
    persona: "グローバルリーダー",
    qualityLabel: "大局の資質",
    desc: "流れを読む力。大きな変化を恐れず、ダイナミックに世界を広げる。",
    imageSrc: "/ten-views/global-leader.webp",
    imageAlt: "global leader",
  },
  {
    persona: "アナリスト",
    qualityLabel: "洞察の資質",
    desc: "深く潜り込む力。目に見えない本質を読み解き、静かに統合する。",
    imageSrc: "/ten-views/analyst.webp",
    imageAlt: "analyst",
  },
] as const;

export default function M55TenViews() {
  return (
    <div className={styles.page}>
      {/* ══════════════════════════════════════════════════════════════
          FOLD 1 — Intro
          ══════════════════════════════════════════════════════════════ */}
      <section className={styles.introFold}>
        <h1 className={styles.pageTitle}>人生を再構築するための、10通りの『資質』</h1>
        <p className={styles.pageLead}>
          M55 における「資質」は、自己観測のためのラベルです。役職名でも職業診断でもなく、順位や優劣をつけるものでもありません。
        </p>
        <p className={styles.pageSupport}>
          ここは M55 の入口のひとつです。生年月日を手がかりに、あなたの輪郭を10通りの資質の語彙で静かに読み解いていきます。
        </p>
        <p className={styles.pageSupport} style={{ marginTop: 12 }}>
          下の呼び名（例：プレジデント）は、覚えやすさのためのラベルで、実際の肩書きを指すものではありません。
          資質は「性格」という一言より、自分の中にある素材に近い捉え方です。各タイプは独立した観点として並んでいます。
        </p>
        <div className={styles.introCtaRow}>
          <Link href="/how-m55-works" className={styles.introSecondaryCta}>
            M55の見方を見る
          </Link>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          FOLD 2 — Ten qualities gallery
          ══════════════════════════════════════════════════════════════ */}
      <section className={styles.galleryFold}>
        <h2 className={styles.sectionTitle}>10通りの資質</h2>
        <div className={styles.cardGrid}>
          {viewCards.map((card, index) => (
            <article key={card.persona} className={styles.viewCard}>
              <div className={styles.cardImageWrap}>
                <img
                  className={styles.cardImage}
                  src={card.imageSrc}
                  alt={card.imageAlt}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardSymbol} aria-hidden="true">
                  <span className={styles.symbolNumber}>{index + 1}</span>
                </div>
                <h3 className={styles.viewName}>{card.persona}</h3>
                <p className={styles.viewTagline}>{card.qualityLabel}</p>
                <p className={styles.viewDesc}>{card.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          FOLD 3 — Clarifying note
          ══════════════════════════════════════════════════════════════ */}
      <section className={styles.clarifyFold}>
        <h2 className={styles.sectionTitle}>使い方について</h2>
        <p className={styles.clarifyBody}>
          これらの資質は、あなたをひとつの型に押し込むためのものではありません。
          自己整理のための読み取りとして、必要な場面で参照してください。
        </p>
        <ul className={styles.clarifyList}>
          <li className={styles.clarifyPoint}>自己観測のためのラベル読み取りとして設計されています</li>
          <li className={styles.clarifyPoint}>各タイプは独立した観点です</li>
          <li className={styles.clarifyPoint}>
            医療・法律・投資等の専門的判断に代わるものではありません
          </li>
        </ul>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          FOLD 4 — Free-entry bridge → /home
          ══════════════════════════════════════════════════════════════ */}
      <section className={styles.freeBridgeFold}>
        <h2 className={styles.bridgeTitle}>M55 で整理をはじめる</h2>
        <p className={styles.bridgeBody}>
          プロフィールを保存すると、10通りの資質に基づく読み取りを無料で確認できます。
        </p>
        <Link href="/home" className={styles.primaryCta}>
          プロフィールを保存して始める
        </Link>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          FOLD 5 — Gentle paid-depth bridge → /dtr/lp
          ══════════════════════════════════════════════════════════════ */}
      <section className={styles.depthBridgeFold}>
        <h2 className={styles.depthTitle}>さらに深く読む</h2>
        <div className={styles.depthProductBlock}>
          <p className={styles.depthProductEyebrow}>{storefrontCopy.lightPlanNameJa}</p>
          <p className={styles.depthBody}>
            保存版では、10通りの資質の重なりと相互作用を、より詳しく読み解けます。
          </p>
          <p className={styles.depthPriceLine}>
            {storefrontCopy.lightPriceLabelJa}｜ウェブで閲覧するデジタルレポート
          </p>
          <Link href="/dtr/lp" className={styles.depthPrimaryCta}>
            {ctaCopy.viewSavedPlansJa}
          </Link>
        </div>
      </section>
    </div>
  );
}
