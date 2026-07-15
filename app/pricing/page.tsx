import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { PublicShell } from "../_components/PublicShell";
import {
  PAID_DTR_PRICING_AUTHORITY_NOTE_JA,
  PAID_DTR_SAVED_REPORT_PRICING,
} from "../../lib/m55/paidDtrProductCopy";
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
  description: "M55の個人保存版ライト・FULLの価格、含まれる4章と追加読み解き件数、買い切り条件を確認できます。",
  alternates: { canonical: "/pricing" },
};

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

  return (
    <PublicShell>
      <div className={styles.page}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>M55 PRODUCT COMPARISON</p>
          <h1>料金とプラン</h1>
          <p>
            個人と二人の保存版について、内容、買い切り価格、現在の提供状態を短く比較できます。
            詳しい説明と購入前の確認は各商品ページで行います。
          </p>
        </header>

        <div className={styles.families}>
          <section
            className={`${styles.family} ${styles.familyPersonal}`}
            aria-labelledby="pricing-personal-title"
          >
            <div className={styles.familyHeader}>
              <div>
                <p className={styles.eyebrow}>自分の読み解き</p>
                <h2 id="pricing-personal-title">個人の4章保存版</h2>
                <p className={styles.familyLead}>
                  ライトとFULLの4章は共通です。違いは、保存版を土台に使える追加読み解きの件数です。
                </p>
              </div>
              {personalOwned ? <span className={styles.state}>購入済み</span> : null}
            </div>

            <div className={styles.plans}>
              <article className={styles.plan}>
                <h3>{PAID_DTR_SAVED_REPORT_PRICING.light.planNameJa}</h3>
                <p className={styles.price}>{PAID_DTR_SAVED_REPORT_PRICING.light.priceLabelJa}</p>
                <ul className={styles.facts}>
                  <li>4章の保存版</li>
                  <li>追加読み解き1件</li>
                  <li>税込・買い切り</li>
                </ul>
                {!personalOwned ? (
                  <Link className={styles.action} href="/dtr/lp">
                    商品内容を見る
                  </Link>
                ) : null}
              </article>

              <article className={styles.plan}>
                <h3>{PAID_DTR_SAVED_REPORT_PRICING.full.planNameJa}</h3>
                <p className={styles.price}>{PAID_DTR_SAVED_REPORT_PRICING.full.priceLabelJa}</p>
                <ul className={styles.facts}>
                  <li>4章の保存版</li>
                  <li>追加読み解き合計5件</li>
                  <li>税込・買い切り</li>
                </ul>
                {!personalOwned ? (
                  <Link className={styles.action} href="/dtr/lp">
                    商品内容を見る
                  </Link>
                ) : null}
              </article>

              <article className={styles.plan}>
                <h3>ライトからFULL化</h3>
                <p className={styles.price}>
                  {PAID_DTR_SAVED_REPORT_PRICING.lightToFullUpgrade.priceLabelJa}
                </p>
                <ul className={styles.facts}>
                  <li>ライト購入者のみ</li>
                  <li>追加読み解きを合計5件へ</li>
                  <li>自動更新なし</li>
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
                <p className={styles.eyebrow}>二人の読み解き</p>
                <h2 id="pricing-compatibility-title">
                  {COMPATIBILITY_REPORT_PRODUCT_AUTHORITY.publicName}
                </h2>
                <p className={styles.familyLead}>
                  二人分の日付と現在の合計6回答を固定ルールで6章に整理し、購入したアカウントから読み返せます。
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

            <article className={styles.plan}>
              <h3>二人の6章保存版</h3>
              <p className={styles.price}>{COMPATIBILITY_REPORT_PRODUCT_AUTHORITY.priceLabel}</p>
              <ul className={styles.facts}>
                <li>6章・1レポート</li>
                <li>追加読み解きなし</li>
                <li>税込・買い切り</li>
              </ul>
              {latestCompatibility ? (
                <Link
                  className={styles.action}
                  href={`/synastry/report/${latestCompatibility.id}`}
                >
                  購入済みレポートを開く
                </Link>
              ) : compatibility.available ? (
                <Link className={styles.action} href="/synastry">
                  {compatibilityCommerceAvailable
                    ? "無料結果から商品を確認する"
                    : "二人を無料で見る"}
                </Link>
              ) : (
                <Link className={styles.secondaryAction} href="/support">
                  利用状況を問い合わせる
                </Link>
              )}
            </article>
          </section>
        </div>

        <aside className={styles.terms} aria-label="購入と提供に関する共通条件">
          <p>{PAID_DTR_PRICING_AUTHORITY_NOTE_JA}</p>
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
