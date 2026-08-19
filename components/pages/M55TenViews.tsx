"use client";

import Link from "next/link";
import { TEN_ASSET_PUBLIC_CATALOG } from "../../lib/m55/tenAssetPublicCatalog";
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

const TEN_VIEW_CARD_DESCRIPTIONS: Record<
  (typeof TEN_ASSET_PUBLIC_CATALOG)[number]["persona"],
  string
> = {
  プレジデント: "まっすぐ突き進む力。ゼロからイチを作り、自分の旗を立てる。",
  プランナー: "しなやかに広がる力。周囲とつながり、形を変えながら根を張る。",
  インフルエンサー: "太陽のように照らす力。存在自体で注目を集め、人を動かす。",
  クリエイター: "静かに燃え続ける力。一点に集中し、深いこだわりで形にする。",
  マネージャー: "どっしりと構える力。大きな視点で全体を受け止め、安心感を作る。",
  プロデューサー: "丁寧に育む力。身近な人を支え、知識や経験を着実に蓄える。",
  エグゼキューター: "古いものを断つ力。迷いを捨てて決断し、新しい秩序を切り拓く。",
  デザイナー: "本質を磨く力。繊細な美意識で、物事の完成度を極限まで高める。",
  グローバルリーダー: "流れを読む力。大きな変化を恐れず、ダイナミックに世界を広げる。",
  アナリスト: "深く潜り込む力。目に見えない本質を読み解き、静かに統合する。",
};

const TEN_VIEW_IMAGE_ALT: Record<
  (typeof TEN_ASSET_PUBLIC_CATALOG)[number]["persona"],
  string
> = {
  プレジデント: "president",
  プランナー: "planner",
  インフルエンサー: "influencer",
  クリエイター: "creator",
  マネージャー: "manager",
  プロデューサー: "producer",
  エグゼキューター: "executor",
  デザイナー: "designer",
  グローバルリーダー: "global leader",
  アナリスト: "analyst",
};

const viewCards = TEN_ASSET_PUBLIC_CATALOG.map((entry) => ({
  persona: entry.persona,
  qualityLabel: entry.qualityLabel,
  desc: TEN_VIEW_CARD_DESCRIPTIONS[entry.persona],
  imageSrc: entry.imageSrc,
  imageAlt: TEN_VIEW_IMAGE_ALT[entry.persona],
}));

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
        <section
          className={styles.systemOverview}
          data-testid="m55-ten-views-system-overview"
          aria-label="10通りの資質の一覧"
        >
          <p className={styles.systemOverviewLead}>10通りの資質は、ひとつの視覚語彙です。順位ではありません。</p>
          <ul className={styles.systemOverviewGrid}>
            {viewCards.map((card) => (
              <li key={`overview-${card.persona}`} className={styles.systemOverviewItem}>
                <img src={card.imageSrc} alt="" decoding="async" />
                <span>{card.persona}</span>
              </li>
            ))}
          </ul>
        </section>
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
            プレミアムレポートでは、10通りの資質の重なりと相互作用を、より詳しく読み解けます。
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
