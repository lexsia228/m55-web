import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import PurchaseButton from "../../../components/PurchaseButton";
import { CheckoutTrustRow } from "../../../components/checkout/CheckoutTrustRow";
import { PublicShell } from "../../_components/PublicShell";
import {
  DTR_OWNED_RECOVERY_PROCESSING_PATH,
  lpCtaModeFromAccess,
  resolveDtrShelfAccess,
  type DtrLpCtaMode,
} from "../../../lib/m55/dtrShelfAccess";
import { PAID_DTR_LP } from "../../../lib/m55/paidDtrProductCopy";
import { PLAN_COMPARISON } from "../../../lib/m55/commercialUx/planComparison";
import { DTR_CORE_FULL_V1, DTR_CORE_LIGHT_V1 } from "../../../lib/oneTimeCheckout";
import { resolveSavedReportTierSummary } from "../../../lib/m55/dtrSavedReportTier";
import LightToFullUpgradeCta from "../../../components/dtr/LightToFullUpgradeCta";
import DtrPaidPurchasePrep from "../../../components/dtr/DtrPaidPurchasePrep";
import styles from "./lp.module.css";

export const metadata = { title: "本質を見つめ直す | M55" };

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

function CompareAnchorLink({ label }: { label: string }) {
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
          {PLAN.consultReplyLabelJa} {PLAN.light.includedItemsJa[1]}
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
    return <CompareAnchorLink label={PAID_DTR_LP.cta.finalCompareLabelJa} />;
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

function TierCard({
  tierKey,
  productId,
  showPurchase,
  variant,
}: {
  tierKey: "full" | "light";
  productId: string;
  showPurchase: boolean;
  variant: "full" | "light";
}) {
  const tier = tierKey === "full" ? PLAN.full : PLAN.light;
  const cardClass = variant === "full" ? styles.lpTierCardFull : styles.lpTierCardLight;
  const ctaClass =
    variant === "full" ? "m55-lp-cta-btn" : "m55-lp-cta-btn m55-lp-cta-btn--muted-primary";
  const ctaLabel = tierKey === "full" ? PLAN.selectFullCtaJa : PLAN.selectLightCtaJa;

  return (
    <div className={cardClass}>
      {variant === "full" ? (
        <span className={styles.lpTierRecommendBadge}>{PLAN.fullRecommendBadgeJa}</span>
      ) : null}
      <div className={styles.lpTierHeader}>
        <span className={styles.lpTierPlanName}>{tier.publicName}</span>
        <span className={styles.lpTierPrice}>{tier.priceLabelJa}</span>
      </div>
      <div className={styles.lpTierMeta}>
        <div>{PLAN.oneTimeLabelJa}</div>
        <div>{PLAN.includedHeadingJa}</div>
        {tier.includedItemsJa.map((item) => (
          <div key={item}>{item}</div>
        ))}
      </div>
      <p className={styles.lpTierBody}>{tier.audienceJa}</p>
      {showPurchase && (
        <PurchaseButton productId={productId} className={ctaClass}>
          <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 12 }}>
            <span>{ctaLabel}</span>
            <ArrowRightIcon />
          </span>
        </PurchaseButton>
      )}
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

  const showTierPurchase = !hidePriceAndTrust && lpCtaMode !== "expired";
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

        {!hidePriceAndTrust && (
          <section
            id="m55-paid-questionnaire"
            aria-labelledby="dtr-lp-funnel-heading"
            className={styles.lpSection}
            style={{ marginTop: 0 }}
          >
            <h2 id="dtr-lp-funnel-heading" className={styles.lpH2}>
              {PAID_DTR_LP.tiers.sectionTitleJa}
            </h2>
            <DtrPaidPurchasePrep />
          </section>
        )}

        {showLightUpgradeCta && tier?.reportInstanceId && (
          <section aria-labelledby="dtr-lp-owned-upgrade" className={styles.lpSection} style={{ marginTop: 0 }}>
            <h2 id="dtr-lp-owned-upgrade" className={styles.lpH2}>
              {PAID_DTR_LP.upgrade.sectionTitleJa}
            </h2>
            <p className={styles.lpBody}>{PAID_DTR_LP.upgrade.paragraphsJa[0]}</p>
            <div style={{ marginTop: 14 }}>
              <LightToFullUpgradeCta reportInstanceId={tier.reportInstanceId} />
            </div>
          </section>
        )}

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
                <CompareAnchorLink label={PAID_DTR_LP.hero.ctaLabelJa} />
              </>
            ) : (
              <FinalCtaBlock lpCtaMode={lpCtaMode} />
            )}
          </div>
        </section>

        {/* 2. M55とは */}
        <section aria-labelledby="dtr-lp-about" className={styles.lpSectionPreTier}>
          <h2 id="dtr-lp-about" className={styles.lpH2}>
            {PAID_DTR_LP.about.sectionTitleJa}
          </h2>
          <p className={styles.lpBody}>{PAID_DTR_LP.about.oneSentenceJa}</p>
          <p className={styles.lpBodyTight}>{PAID_DTR_LP.about.principleJa}</p>
        </section>

        {/* 3. 読み解きの材料 */}
        <section aria-labelledby="dtr-lp-authority" className={styles.lpSectionPreTier}>
          <h2 id="dtr-lp-authority" className={styles.lpH2}>
            {PAID_DTR_LP.authorityNote.sectionTitleJa}
          </h2>
          <p className={styles.lpSavedHeadline}>{PAID_DTR_LP.authorityNote.headlineJa}</p>
          {PAID_DTR_LP.authorityNote.bodyParagraphsJa.map((para, i) => (
            <p key={para} className={i === 0 ? styles.lpBody : styles.lpBodyTight}>
              {para}
            </p>
          ))}
        </section>

        {/* 4. 情報二層 */}
        <section aria-labelledby="dtr-lp-layers" className={styles.lpSectionPreTier}>
          <h2 id="dtr-lp-layers" className={styles.lpH2}>
            {PAID_DTR_LP.informationLayers.sectionTitleJa}
          </h2>
          <p className={styles.lpBody}>{PAID_DTR_LP.informationLayers.savedReportJa}</p>
          <p className={styles.lpBodyTight}>{PAID_DTR_LP.informationLayers.consultReplyJa}</p>
        </section>

        {/* 5. プレミアムレポートとは */}
        <section aria-labelledby="dtr-lp-saved" className={styles.lpSectionPreTier}>
          <h2 id="dtr-lp-saved" className={styles.lpH2}>
            {PAID_DTR_LP.savedReport.sectionTitleJa}
          </h2>
          <p className={styles.lpSavedHeadline}>{PAID_DTR_LP.savedReport.headlineJa}</p>
          <p className={styles.lpBody}>{PAID_DTR_LP.savedReport.bodyJa}</p>
        </section>

        {/* 6. 無料比較 */}
        <section aria-labelledby="dtr-lp-free" className={styles.lpSectionPreTier}>
          <h2 id="dtr-lp-free" className={styles.lpH2}>
            {PAID_DTR_LP.freeComparison.sectionTitleJa}
          </h2>
          <p className={styles.lpBody}>{PAID_DTR_LP.freeComparison.bodyJa}</p>
        </section>

        {/* 7. プレミアムレポート */}
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

        {/* 8. 追加読み解きとは */}
        <section aria-labelledby="dtr-lp-consult" className={styles.lpSectionPreTier}>
          <h2 id="dtr-lp-consult" className={styles.lpH2}>
            {PAID_DTR_LP.consultReply.sectionTitleJa}
          </h2>
          <p className={styles.lpBody}>{PAID_DTR_LP.consultReply.bodyJa}</p>
        </section>

        {/* 9. FULL／ライト比較 */}
        {!hidePriceAndTrust && (
          <section
            id="dtr-lp-tiers"
            aria-labelledby="dtr-lp-tiers-marketing"
            className={styles.lpSection}
          >
            <h2 id="dtr-lp-tiers-marketing" className={styles.lpH2}>
              {PAID_DTR_LP.tiers.sectionTitleJa}
            </h2>
            <p className={styles.lpBody}>{PLAN.upgradeNoteJa}</p>
            <div className={styles.lpTierStack}>
              <TierCard
                tierKey="light"
                productId={DTR_CORE_LIGHT_V1}
                showPurchase={showTierPurchase}
                variant="light"
              />
              <TierCard
                tierKey="full"
                productId={DTR_CORE_FULL_V1}
                showPurchase={showTierPurchase && !showLightUpgradeCta}
                variant="full"
              />
            </div>
            {showTierPurchase && (
              <div className={styles.lpTrustWrap}>
                <CheckoutTrustRow />
              </div>
            )}
          </section>
        )}

        {/* 10. ライトからFULL化 */}
        {!hidePriceAndTrust && (
          <section aria-labelledby="dtr-lp-upgrade" className={styles.lpSection}>
            <h2 id="dtr-lp-upgrade" className={styles.lpH2}>
              {PAID_DTR_LP.upgrade.sectionTitleJa}
            </h2>
            {PAID_DTR_LP.upgrade.paragraphsJa.map((para, i) => (
              <p key={i} className={i === 0 ? styles.lpBody : styles.lpBodyTight}>
                {para}
              </p>
            ))}
          </section>
        )}

        {/* 11. 購入前の確認 */}
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

        {/* 12. FAQ */}
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

        {/* 13. 最終導線 */}
        <section aria-labelledby="dtr-lp-final" className={styles.lpSection}>
          <h2 id="dtr-lp-final" className={styles.lpH2}>
            {PAID_DTR_LP.cta.sectionTitleJa}
          </h2>
          {lpCtaMode !== "purchase" && lpCtaMode !== "signin" && (
            <p className={styles.lpBody}>{OWNED.statusLeadJa}</p>
          )}
          <div className={styles.lpFinalCtaWrap}>
            <FinalCtaBlock lpCtaMode={lpCtaMode} />
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
