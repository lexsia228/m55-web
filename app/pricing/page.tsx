import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { PublicShell } from "../_components/PublicShell";
import { PAID_DTR_SAVED_REPORT_PRICING } from "../../lib/m55/paidDtrProductCopy";
import {
  COMPATIBILITY_REPORT_PRODUCT_AUTHORITY,
  isCompatibilityCommerceEnabled,
} from "../../lib/m55/compatibility/compatibilityCommerceAuthority";
import { listOwnedCompatibilityReports } from "../../lib/m55/compatibility/compatibilityCommerceDb";
import { M55_PUBLIC_COMMERCIAL_TRUTH } from "../../lib/m55/analysisAuthorityReferenceModel";
import { resolveDtrShelfAccess } from "../../lib/m55/dtrShelfAccess";
import { resolveSavedReportTierSummary } from "../../lib/m55/dtrSavedReportTier";
import LightToFullUpgradeCta from "../../components/dtr/LightToFullUpgradeCta";
import styles from "./pricing.module.css";

export const metadata = {
  title: "料金とプラン | M55",
  description: "M55の無料解析、個人解析ライト・FULL、FULL化、二人の相性解析レポートの内容と買い切り価格を比較できます。",
  alternates: { canonical: "/pricing" },
};

function oneTimePrice(label: string): string {
  return label.replace("（税込）", "（税込・買い切り）");
}

export default async function PricingPage() {
  const { userId } = await auth();
  const compatibilityCommerceAvailable = isCompatibilityCommerceEnabled();
  const personalAccess = await resolveDtrShelfAccess(userId);
  const personalTier = userId ? await resolveSavedReportTierSummary(userId) : null;
  const compatibility = userId
    ? await listOwnedCompatibilityReports(userId)
    : { available: true, reports: [] };
  const latestCompatibility = compatibility.reports[0] ?? null;
  const personalOwned =
    personalAccess.kind === "authenticated" &&
    personalAccess.ownershipState === "owned";
  const personalOwnedAction =
    personalAccess.kind === "authenticated" ? personalAccess.shelfCta : null;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: [
      {
        "@type": "Product",
        name: "M55 個人解析ライト",
        offers: {
          "@type": "Offer",
          price: PAID_DTR_SAVED_REPORT_PRICING.light.priceYen,
          priceCurrency: "JPY",
          availability: "https://schema.org/InStock",
        },
      },
      {
        "@type": "Product",
        name: "M55 個人解析FULL",
        offers: {
          "@type": "Offer",
          price: PAID_DTR_SAVED_REPORT_PRICING.full.priceYen,
          priceCurrency: "JPY",
          availability: "https://schema.org/InStock",
        },
      },
      ...(compatibilityCommerceAvailable
        ? [{
            "@type": "Product",
            name: "M55 二人の相性解析レポート",
            offers: {
              "@type": "Offer",
              price: COMPATIBILITY_REPORT_PRODUCT_AUTHORITY.priceYen,
              priceCurrency: "JPY",
              availability: "https://schema.org/InStock",
            },
          }]
        : []),
    ],
  };

  return (
    <PublicShell>
      <div className={styles.page}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <header className={styles.hero}>
          <p className={styles.eyebrow}>M55 PRODUCT COMPARISON</p>
          <h1>料金とプラン</h1>
          <p>
            無料解析で分かる全体像と、有料レポートで詳しく読める場面を比較できます。
            有料レポートはすべて税込の買い切りで、自動更新はありません。
          </p>
        </header>

        <div className={styles.families}>
          <section
            className={`${styles.family} ${styles.familyPersonal}`}
            aria-labelledby="pricing-personal-title"
          >
            <div className={styles.familyHeader}>
              <div>
                <p className={styles.eyebrow}>自分を知る</p>
                <h2 id="pricing-personal-title">M55 個人解析</h2>
                <p className={styles.familyLead}>
                  強み、判断、人との関わり、迷いや疲れにつながりやすい流れを、無料解析から4章の詳しい個人解析へ深めます。
                </p>
              </div>
              {personalOwned ? <span className={styles.state}>購入済み</span> : null}
            </div>

            <div className={styles.plans}>
              <article className={styles.plan}>
                <p className={styles.planLabel}>無料解析</p>
                <h3>自分の強みと、いつものパターン</h3>
                <p className={styles.price}>無料</p>
                <ul className={styles.facts}>
                  <li>自然に力が出やすい場面</li>
                  <li>自分らしい考え方と決め方</li>
                  <li>迷いや疲れが始まりやすい場面</li>
                  <li>ログイン不要</li>
                </ul>
                <Link className={styles.action} href="/home#m55-home-free-intents">
                  自分を無料で解析する
                </Link>
              </article>

              <article className={styles.plan}>
                <p className={styles.planLabel}>M55 個人解析レポート</p>
                <h3>個人解析ライト</h3>
                <p className={styles.price}>
                  {oneTimePrice(PAID_DTR_SAVED_REPORT_PRICING.light.priceLabelJa)}
                </p>
                <ul className={styles.facts}>
                  <li>仕事、人との関わり、判断を詳しく読む4章</li>
                  <li>迷いや疲れにつながる流れ</li>
                  <li>追加読み解き1件</li>
                </ul>
                {!personalOwned ? (
                  <Link className={styles.action} href="/dtr/lp">
                    商品内容を見る
                  </Link>
                ) : null}
              </article>

              <article className={styles.plan}>
                <p className={styles.planLabel}>M55 個人解析レポート</p>
                <h3>個人解析FULL</h3>
                <p className={styles.price}>
                  {oneTimePrice(PAID_DTR_SAVED_REPORT_PRICING.full.priceLabelJa)}
                </p>
                <ul className={styles.facts}>
                  <li>ライトと同じ詳しい4章</li>
                  <li>強みと難しさを場面ごとに確認</li>
                  <li>追加読み解き合計5件</li>
                </ul>
                {!personalOwned ? (
                  <Link className={styles.action} href="/dtr/lp">
                    商品内容を見る
                  </Link>
                ) : null}
              </article>

              <article className={styles.plan}>
                <p className={styles.planLabel}>購入後の選択</p>
                <h3>後からFULL化</h3>
                <p className={styles.price}>
                  {PAID_DTR_SAVED_REPORT_PRICING.lightToFullUpgrade.priceLabelJa}
                </p>
                <ul className={styles.facts}>
                  <li>ライト購入者のみ</li>
                  <li>追加読み解きを合計5件へ</li>
                  <li>一回払い・自動更新なし</li>
                </ul>
                {personalTier?.canUpgradeFromLight && personalTier.reportInstanceId ? (
                  <LightToFullUpgradeCta
                    reportInstanceId={personalTier.reportInstanceId}
                    variant="subtle"
                  />
                ) : (
                  <Link className={styles.secondaryAction} href="/dtr">
                    利用状況を確認する
                  </Link>
                )}
              </article>
            </div>

            {personalOwned && personalOwnedAction ? (
              <div className={styles.ownedAction}>
                <Link className={styles.action} href={personalOwnedAction.href}>
                  {personalOwnedAction.label}
                </Link>
                {" "}
                <Link className={styles.secondaryAction} href="/dtr/lp">
                  詳しい商品条件を見る
                </Link>
              </div>
            ) : null}
          </section>

          <section
            className={`${styles.family} ${styles.familyCompatibility}`}
            aria-labelledby="pricing-compatibility-title"
          >
            <div className={styles.familyHeader}>
              <div>
                <p className={styles.eyebrow}>二人を知る</p>
                <h2 id="pricing-compatibility-title">M55 二人の相性解析</h2>
                <p className={styles.familyLead}>
                  自然に合いやすいところ、互いを補いやすい違い、会話や判断のテンポ、すれ違いやすい場面を読み解きます。
                </p>
              </div>
              <span className={styles.state}>
                {latestCompatibility
                  ? "購入済み"
                  : compatibilityCommerceAvailable
                    ? "提供中"
                    : "準備中"}
              </span>
            </div>

            <div className={styles.compatibilityPlans}>
              <article className={styles.plan}>
                <p className={styles.planLabel}>無料解析</p>
                <h3>二人が合うところと、違うところ</h3>
                <p className={styles.price}>無料</p>
                <ul className={styles.facts}>
                  <li>自然に合いやすいところ</li>
                  <li>互いを補いやすい違い</li>
                  <li>すれ違いが始まりやすい場面</li>
                  <li>ログイン不要</li>
                </ul>
                <Link className={styles.action} href="/synastry">
                  二人の相性を無料で解析する
                </Link>
              </article>

              <article className={styles.plan}>
                <p className={styles.planLabel}>詳しい相性解析</p>
                <h3>M55 二人の相性解析レポート</h3>
                <p className={styles.price}>
                  {oneTimePrice(COMPATIBILITY_REPORT_PRODUCT_AUTHORITY.priceLabel)}
                </p>
                <ul className={styles.facts}>
                  <li>合いやすさと違いを6つの場面から読む</li>
                  <li>会話、判断、距離のずれを詳しく確認</li>
                  <li>6章・1レポート</li>
                </ul>
                {latestCompatibility ? (
                  <Link
                    className={styles.action}
                    href={`/synastry/report/${latestCompatibility.id}`}
                  >
                    購入済みレポートを開く
                  </Link>
                ) : compatibilityCommerceAvailable && compatibility.available ? (
                  <Link className={styles.action} href="/synastry">
                    無料結果から内容を確認する
                  </Link>
                ) : compatibility.available ? (
                  <p className={styles.pausedNote}>
                    現在準備中です。無料の相性解析は利用できます。
                  </p>
                ) : (
                  <Link className={styles.secondaryAction} href="/support">
                    利用状況を問い合わせる
                  </Link>
                )}
              </article>
            </div>
          </section>
        </div>

        <aside className={styles.terms} aria-label="購入と提供に関する共通条件">
          <p>{M55_PUBLIC_COMMERCIAL_TRUTH.commercial.billingJa}</p>
          <p>{M55_PUBLIC_COMMERCIAL_TRUTH.commercial.deliveryJa}</p>
          <p>{M55_PUBLIC_COMMERCIAL_TRUTH.commercial.ownershipJa}</p>
          <nav className={styles.links} aria-label="料金と購入に関する案内">
            <Link href="/support">サポート</Link>
            <Link href="/legal/refund">返金・キャンセル</Link>
            <Link href="/legal/terms">利用規約</Link>
            <Link href="/legal/privacy">プライバシー</Link>
            <Link href="/legal/tokushoho">特定商取引法に基づく表記</Link>
          </nav>
        </aside>
      </div>
    </PublicShell>
  );
}
