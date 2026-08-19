import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { PublicShell } from "../../_components/PublicShell";
import {
  DTR_OWNED_RECOVERY_PROCESSING_PATH,
  lpCtaModeFromAccess,
  resolveDtrShelfAccess,
  type DtrLpCtaMode,
} from "../../../lib/m55/dtrShelfAccess";
import { PAID_DTR_LP, PAID_DTR_LP_METADATA_TITLE_JA } from "../../../lib/m55/paidDtrProductCopy";
import { PLAN_COMPARISON } from "../../../lib/m55/commercialUx/planComparison";
import { resolveSavedReportTierSummary } from "../../../lib/m55/dtrSavedReportTier";
import LightToFullUpgradeCta from "../../../components/dtr/LightToFullUpgradeCta";
import DtrPaidPurchasePrep from "../../../components/dtr/DtrPaidPurchasePrep";
import DtrLpPremiumContinuityIntro from "../../../components/dtr/DtrLpPremiumContinuityIntro";
import styles from "./lp.module.css";

export const metadata: Metadata = {
  title: PAID_DTR_LP_METADATA_TITLE_JA,
  description:
    "M55 プレミアムレポートは、生年月日と6問の回答から自分の出方を一つの流れで読み返せるデジタルレポートです。ライト ¥1,000・フル ¥1,480の買い切り。追加読み解き付き。",
  alternates: {
    canonical: "/dtr/lp",
  },
  openGraph: {
    title: "M55 プレミアムレポート",
    description:
      "自分の出方を一つの流れで読み返す。ライト・フルは買い切り。追加読み解きで一テーマずつ深められます。",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "M55 プレミアムレポート",
    description:
      "自分の出方を一つの流れで読み返す。ライト・フルは買い切り。追加読み解き付き。",
  },
};

const OWNED = PAID_DTR_LP.operational.ownedState;
const PLAN = PLAN_COMPARISON;

function ArrowRightIcon() {
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
      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlanAnchorLink({ label }: { label: string }) {
  return (
    <a
      href={`#${PAID_DTR_LP.hero.compareSectionId}`}
      className="m55-lp-cta-btn m55-lp-cta-btn--secondary"
    >
      <span>{label}</span>
      <ArrowRightIcon />
    </a>
  );
}

function HeroPriceChips() {
  return (
    <div className={styles.lpPriceChips} aria-label="プレミアムレポートプランの価格">
      <div className={styles.lpPriceChip}>
        <span className={styles.lpPriceChipLabel}>{PLAN.light.publicName}</span>
        <span className={styles.lpPriceChipValue}>{PLAN.light.priceLabelJa}</span>
        <span className={styles.lpPriceChipMeta}>
          {PLAN.consultReplyLabelJa} {PLAN.light.includedItemsJa[1]?.replace('追加読み解き ', '')}
        </span>
      </div>
      <div className={styles.lpPriceChipFull}>
        <span className={styles.lpPriceChipLabel}>{PLAN.full.publicName}</span>
        <span className={styles.lpPriceChipValue}>{PLAN.full.priceLabelJa}</span>
        <span className={styles.lpPriceChipMeta}>
          {PLAN.consultReplyLabelJa} {PLAN.full.includedItemsJa[1]?.replace('追加読み解き ', '')}
        </span>
      </div>
    </div>
  );
}

function FinalCtaBlock({ lpCtaMode }: { lpCtaMode: DtrLpCtaMode }) {
  if (lpCtaMode === "purchase" || lpCtaMode === "signin") {
    return <PlanAnchorLink label={PAID_DTR_LP.cta.finalCompareLabelJa} />;
  }
  if (lpCtaMode === "open") {
    return (
      <Link href="/dtr/core" className="m55-lp-cta-btn">
        <span>{OWNED.openReportCtaJa}</span>
        <ArrowRightIcon />
      </Link>
    );
  }
  if (lpCtaMode === "recovery") {
    return (
      <div className={styles.lpOwnedBlock}>
        <p className={styles.lpOwnedLead}>{OWNED.recoveryLeadJa}</p>
        <Link href={DTR_OWNED_RECOVERY_PROCESSING_PATH} className="m55-lp-cta-btn">
          <span>{OWNED.recoveryCtaJa}</span>
          <ArrowRightIcon />
        </Link>
      </div>
    );
  }
  if (lpCtaMode === "expired") {
    return (
      <Link href="/support" className="m55-lp-cta-btn">
        <span>{OWNED.supportCtaJa}</span>
        <ArrowRightIcon />
      </Link>
    );
  }
  return (
    <div className={styles.lpOwnedBlock}>
      <p className={styles.lpOwnedLead}>{OWNED.pendingLeadJa}</p>
      <button type="button" disabled aria-disabled className="m55-lp-cta-btn">
        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 12 }}>
          <span>{OWNED.pendingCtaJa}</span>
          <ArrowRightIcon />
        </span>
      </button>
    </div>
  );
}

function ExpiredNotice() {
  return (
    <p className={styles.lpExpiredNotice}>
      {OWNED.expiredNoticeLeadJa}
      {OWNED.expiredNoticeSupportPrefixJa}
      <Link href="/support" style={{ color: "#7c6fd6" }}>
        {OWNED.expiredNoticeSupportLinkJa}
      </Link>
      {OWNED.expiredNoticeSupportSuffixJa}
    </p>
  );
}

export default async function DtrLpPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const params = await searchParams;
  const isExpiredParam = params?.state === "expired";
  const { userId } = await auth();

  const access = await resolveDtrShelfAccess(userId);
  const tier = userId ? await resolveSavedReportTierSummary(userId) : null;
  const lpCtaMode = lpCtaModeFromAccess(access, isExpiredParam);
  const showExpiredBanner =
    isExpiredParam || (access.kind === "authenticated" && access.unlockState === "expired");

  const hidePriceAndTrust =
    !!userId &&
    (lpCtaMode === "open" ||
      lpCtaMode === "pending" ||
      lpCtaMode === "recovery" ||
      lpCtaMode === "expired");

  const showLightUpgradeCta =
    Boolean(tier?.canUpgradeFromLight && tier.reportInstanceId);

  return (
    <PublicShell>
      <div className={styles.lpRoot}>
        <p className={styles.lpBreadcrumb}>
          <Link href="/" style={{ color: "#6b5fa8", textDecoration: "none" }}>
            M55
          </Link>
          <span style={{ margin: "0 6px", opacity: 0.35 }}>›</span>
          <Link href="/dtr" style={{ color: "#6b5fa8", textDecoration: "none" }}>
            レポート
          </Link>
          <span style={{ margin: "0 6px", opacity: 0.35 }}>›</span>
          <span style={{ color: "rgba(60, 60, 60, 0.55)" }}>商品ページ</span>
        </p>

        {showExpiredBanner && <ExpiredNotice />}

        {/* 1. Hero */}
        <section aria-labelledby="dtr-lp-hero" className={styles.lpHeroSection}>
          <div className={styles.lpHeroDark}>
            <p className={styles.lpHeroSubhead}>{PAID_DTR_LP.hero.subheadlineJa}</p>
            <h1 id="dtr-lp-hero" className={styles.lpHeroTitle}>
              {PAID_DTR_LP.hero.headlineJa}
            </h1>
            <p className={styles.lpHeroBody}>{PAID_DTR_LP.hero.bodyJa}</p>
          </div>
          <div className={styles.lpHeroFooter}>
            {!hidePriceAndTrust ? (
              <>
                <HeroPriceChips />
                <PlanAnchorLink label={PAID_DTR_LP.hero.ctaLabelJa} />
              </>
            ) : (
              <FinalCtaBlock lpCtaMode={lpCtaMode} />
            )}
          </div>
        </section>

        {/* 2. プレミアムレポートとは */}
        <section aria-labelledby="dtr-lp-saved" className={styles.lpSectionPreTier}>
          <h2 id="dtr-lp-saved" className={styles.lpH2}>
            {PAID_DTR_LP.savedReport.sectionTitleJa}
          </h2>
          <p className={styles.lpSavedHeadline}>{PAID_DTR_LP.savedReport.headlineJa}</p>
          <p className={styles.lpBody}>{PAID_DTR_LP.savedReport.bodyJa}</p>
        </section>

        {/* 3. レポートで読む流れ */}
        <section aria-labelledby="dtr-lp-chapters" className={styles.lpSectionPreTier}>
          <h2 id="dtr-lp-chapters" className={styles.lpH2}>
            {PAID_DTR_LP.chapters.sectionTitleJa}
          </h2>
          <div className={styles.lpChapterList}>
            {PAID_DTR_LP.chapters.items.map((ch) => (
              <div key={ch.titleJa} className={styles.lpChapterItem}>
                <div className={styles.lpChapterTitle}>
                  {ch.roman} {ch.titleJa}
                </div>
                <p className={styles.lpChapterIntro}>{ch.introJa}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. 無料比較 */}
        <section aria-labelledby="dtr-lp-free" className={styles.lpSectionPreTier}>
          <h2 id="dtr-lp-free" className={styles.lpH2}>
            {PAID_DTR_LP.freeComparison.sectionTitleJa}
          </h2>
          <p className={styles.lpBody}>{PAID_DTR_LP.freeComparison.bodyJa}</p>
        </section>

        {/* 5. 追加読み解きとは */}
        <section aria-labelledby="dtr-lp-consult" className={styles.lpSectionPreTier}>
          <h2 id="dtr-lp-consult" className={styles.lpH2}>
            {PAID_DTR_LP.consultReply.sectionTitleJa}
          </h2>
          <p className={styles.lpBody}>{PAID_DTR_LP.consultReply.bodyJa}</p>
        </section>

        {/* 6. プラン選択・6問・お支払い */}
        {!hidePriceAndTrust && (
          <section
            id="m55-paid-questionnaire"
            aria-labelledby="dtr-lp-funnel-heading"
            className={`${styles.lpSection} ${styles.lpQuestionnaireAnchor}`}
          >
            <h2 id="dtr-lp-funnel-heading" className={styles.lpH2}>
              プラン選択・お支払い
            </h2>
            <p className={styles.lpBody}>{PLAN.upgradeNoteJa}</p>
            <DtrLpPremiumContinuityIntro />
            <DtrPaidPurchasePrep />
          </section>
        )}

        {/* 7. 購入済みライトのFULL化導線 */}
        {showLightUpgradeCta && tier?.reportInstanceId && (
          <section aria-labelledby="dtr-lp-owned-upgrade" className={styles.lpSection}>
            <h2 id="dtr-lp-owned-upgrade" className={styles.lpH2}>
              {PAID_DTR_LP.upgrade.sectionTitleJa}
            </h2>
            <p className={styles.lpBody}>{PAID_DTR_LP.upgrade.paragraphsJa[0]}</p>
            <div style={{ marginTop: 14 }}>
              <LightToFullUpgradeCta reportInstanceId={tier.reportInstanceId} />
            </div>
          </section>
        )}

        {/* 8. 読み解きの考え方（M55とは + 材料） */}
        <section aria-labelledby="dtr-lp-trust" className={styles.lpSectionPreTier}>
          <h2 id="dtr-lp-trust" className={styles.lpH2}>
            {PAID_DTR_LP.about.sectionTitleJa}
          </h2>
          <p className={styles.lpBody}>{PAID_DTR_LP.about.oneSentenceJa}</p>
          <p className={styles.lpBodyTight}>{PAID_DTR_LP.about.principleJa}</p>
          <p className={styles.lpSavedHeadline}>{PAID_DTR_LP.authorityNote.headlineJa}</p>
          {PAID_DTR_LP.authorityNote.bodyParagraphsJa.map((para, i) => (
            <p key={para} className={i === 0 ? styles.lpBody : styles.lpBodyTight}>
              {para}
            </p>
          ))}
        </section>

        {/* 9. 購入前の確認 */}
        {!hidePriceAndTrust && (
          <section aria-labelledby="dtr-lp-purchase-notes" className={styles.lpSection}>
            <h2 id="dtr-lp-purchase-notes" className={styles.lpH2}>
              {PAID_DTR_LP.purchaseNotes.sectionTitleJa}
            </h2>
            {PAID_DTR_LP.purchaseNotes.paragraphsJa.map((para, i) => (
              <p key={i} className={i === 0 ? styles.lpBody : styles.lpBodyTight}>
                {para}
              </p>
            ))}
          </section>
        )}

        {/* 10. FAQ */}
        <section aria-labelledby="dtr-lp-faq" className={styles.lpSection}>
          <h2 id="dtr-lp-faq" className={styles.lpH2}>
            {PAID_DTR_LP.faq.sectionTitleJa}
          </h2>
          <div className={styles.lpFaqList}>
            {PAID_DTR_LP.faq.items.map((item) => (
              <div key={item.questionJa} className={styles.lpFaqItem}>
                <div className={styles.lpFaqQuestion}>Q. {item.questionJa}</div>
                <p className={styles.lpFaqAnswer}>{item.answerJa}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
