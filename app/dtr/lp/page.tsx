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
import { DTR_CORE_FULL_V1, DTR_CORE_LIGHT_V1 } from "../../../lib/oneTimeCheckout";
import { resolveSavedReportTierSummary } from "../../../lib/m55/dtrSavedReportTier";
import LightToFullUpgradeCta from "../../../components/dtr/LightToFullUpgradeCta";
import styles from "./lp.module.css";

export const metadata = { title: "本質の読み解き | M55" };

const OWNED = PAID_DTR_LP.operational.ownedState;

const SECTION_STYLE = {
  marginTop: 18,
  borderRadius: 20,
  border: "1px solid rgba(107, 95, 168, 0.13)",
  background: "rgba(255,255,255,0.55)",
  boxShadow: "0 18px 60px rgba(29, 24, 61, 0.045)",
  padding: "18px 16px",
} as const;

const H2_STYLE = {
  margin: 0,
  fontSize: 14,
  fontWeight: 900,
  letterSpacing: "0.02em",
  color: "rgba(60, 50, 86, 0.9)",
} as const;

const BODY_STYLE = {
  margin: "12px 0 0",
  fontSize: 13,
  color: "rgba(60, 50, 86, 0.78)",
  lineHeight: 1.75,
  whiteSpace: "pre-line" as const,
};

const SAVED_HEADLINE_STYLE = {
  margin: "12px 0 0",
  fontSize: 13.5,
  fontWeight: 800,
  color: "rgba(38, 36, 42, 0.9)",
  lineHeight: 1.65,
} as const;

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
    <a href={`#${PAID_DTR_LP.hero.compareSectionId}`} className="m55-lp-cta-btn">
      <span>{label}</span>
      <ArrowRightIcon />
    </a>
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
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ fontSize: 13, color: "rgba(107, 95, 168, 0.85)", margin: 0, lineHeight: 1.55 }}>
          {OWNED.recoveryLeadJa}
        </p>
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
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ fontSize: 13, color: "rgba(107, 95, 168, 0.85)", margin: 0, lineHeight: 1.55 }}>
        {OWNED.pendingLeadJa}
      </p>
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
  tier,
  productId,
  showPurchase,
}: {
  tier: typeof PAID_DTR_LP.tiers.full | typeof PAID_DTR_LP.tiers.light;
  productId: string;
  showPurchase: boolean;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid rgba(107, 95, 168, 0.16)",
        background: "rgba(255,255,255,0.72)",
        padding: "16px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: "rgba(38, 36, 42, 0.92)" }}>
          {tier.planNameJa}
        </span>
        <span
          style={{
            fontSize: "clamp(22px, 4.8vw, 28px)",
            fontWeight: 800,
            fontVariantNumeric: "tabular-nums",
            color: "#121212",
            letterSpacing: "-0.01em",
          }}
        >
          {tier.priceLabelJa}
        </span>
      </div>
      <div style={{ fontSize: 12.8, color: "rgba(60, 50, 86, 0.82)", lineHeight: 1.65 }}>
        <div>
          {tier.savedReportLabelJa} {tier.savedReportValueJa}
        </div>
        <div>
          {tier.consultReplyLabelJa} {tier.consultReplyValueJa}
        </div>
      </div>
      <p style={{ margin: 0, fontSize: 12.9, color: "rgba(60, 50, 86, 0.75)", lineHeight: 1.7, whiteSpace: "pre-line" }}>
        {tier.bodyJa}
      </p>
      {showPurchase && (
        <PurchaseButton productId={productId} className="m55-lp-cta-btn">
          <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 12 }}>
            <span>{tier.ctaLabelJa}</span>
            <ArrowRightIcon />
          </span>
        </PurchaseButton>
      )}
    </div>
  );
}

function ExpiredNotice() {
  return (
    <p
      style={{
        margin: "0 0 20px",
        fontSize: 13,
        color: "#5a4ea0",
        padding: "10px 14px",
        background: "rgba(124, 111, 214, 0.06)",
        borderRadius: 8,
        lineHeight: 1.65,
      }}
    >
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
      <div
        className={styles.lpRoot}
        style={{
          fontFamily:
            '"Hiragino Kaku Gothic ProN", "Noto Sans JP", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          color: "#3d3d3d",
          maxWidth: "min(640px, calc(100vw - 40px))",
          margin: "0 auto",
          padding: "clamp(16px, 4vw, 32px) 0 clamp(64px, 10vw, 96px)",
          boxSizing: "border-box",
          lineHeight: 1.75,
        }}
      >
        <p style={{ margin: "0 0 20px", fontSize: 12.5, letterSpacing: "0.01em" }}>
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

        {showLightUpgradeCta && tier?.reportInstanceId && (
          <section aria-labelledby="dtr-lp-owned-upgrade" style={{ ...SECTION_STYLE, marginTop: 0 }}>
            <h2 id="dtr-lp-owned-upgrade" style={H2_STYLE}>
              {PAID_DTR_LP.upgrade.sectionTitleJa}
            </h2>
            <p style={{ ...BODY_STYLE, marginTop: 12 }}>
              {PAID_DTR_LP.upgrade.paragraphsJa[0]}
            </p>
            <div style={{ marginTop: 14 }}>
              <LightToFullUpgradeCta reportInstanceId={tier.reportInstanceId} />
            </div>
          </section>
        )}

        {/* 1. Hero */}
        <section
          aria-labelledby="dtr-lp-hero"
          style={{
            ...SECTION_STYLE,
            marginTop: 0,
            overflow: "hidden",
            padding: 0,
            border: "1px solid rgba(107, 95, 168, 0.13)",
          }}
        >
          <div
            style={{
              background: "linear-gradient(145deg, #1a1230 0%, #261740 55%, #1c1438 100%)",
              padding: "clamp(20px, 4vw, 28px) clamp(20px, 4vw, 28px) clamp(18px, 3.5vw, 24px)",
            }}
          >
            <p
              style={{
                margin: "0 0 10px",
                fontSize: 12.5,
                color: "rgba(255, 255, 255, 0.55)",
                lineHeight: 1.6,
              }}
            >
              {PAID_DTR_LP.hero.subheadlineJa}
            </p>
            <h1
              id="dtr-lp-hero"
              style={{
                fontFamily: '"Hiragino Mincho ProN", "Noto Serif JP", serif',
                fontSize: "clamp(21px, 4.2vw, 25px)",
                fontWeight: 500,
                margin: "0 0 12px",
                color: "rgba(255, 255, 255, 0.94)",
                letterSpacing: "0.02em",
                lineHeight: 1.42,
                whiteSpace: "pre-line",
              }}
            >
              {PAID_DTR_LP.hero.headlineJa}
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: "clamp(13px, 2.5vw, 14px)",
                color: "rgba(255, 255, 255, 0.55)",
                lineHeight: 1.7,
                whiteSpace: "pre-line",
              }}
            >
              {PAID_DTR_LP.hero.bodyJa}
            </p>
          </div>
          <div
            style={{
              padding: "clamp(18px, 3.5vw, 22px) clamp(18px, 3.5vw, 24px)",
              background: `
                radial-gradient(120% 90% at 50% -4%, rgba(245, 236, 255, 0.55), transparent 55%),
                linear-gradient(172deg, rgba(253, 247, 238, 0.99) 0%, rgba(247, 241, 252, 0.98) 100%)
              `,
            }}
          >
            {!hidePriceAndTrust ? (
              <CompareAnchorLink label={PAID_DTR_LP.hero.ctaLabelJa} />
            ) : (
              <FinalCtaBlock lpCtaMode={lpCtaMode} />
            )}
          </div>
        </section>

        {/* 2. M55とは */}
        <section aria-labelledby="dtr-lp-about" style={SECTION_STYLE}>
          <h2 id="dtr-lp-about" style={H2_STYLE}>
            {PAID_DTR_LP.about.sectionTitleJa}
          </h2>
          <p style={BODY_STYLE}>{PAID_DTR_LP.about.oneSentenceJa}</p>
          <p style={{ ...BODY_STYLE, marginTop: 10 }}>{PAID_DTR_LP.about.principleJa}</p>
        </section>

        {/* 3. 情報二層 */}
        <section aria-labelledby="dtr-lp-layers" style={SECTION_STYLE}>
          <h2 id="dtr-lp-layers" style={H2_STYLE}>
            {PAID_DTR_LP.informationLayers.sectionTitleJa}
          </h2>
          <p style={BODY_STYLE}>{PAID_DTR_LP.informationLayers.savedReportJa}</p>
          <p style={{ ...BODY_STYLE, marginTop: 12 }}>{PAID_DTR_LP.informationLayers.consultReplyJa}</p>
        </section>

        {/* 4. 保存版とは */}
        <section aria-labelledby="dtr-lp-saved" style={SECTION_STYLE}>
          <h2 id="dtr-lp-saved" style={H2_STYLE}>
            {PAID_DTR_LP.savedReport.sectionTitleJa}
          </h2>
          <p style={SAVED_HEADLINE_STYLE}>{PAID_DTR_LP.savedReport.headlineJa}</p>
          <p style={BODY_STYLE}>{PAID_DTR_LP.savedReport.bodyJa}</p>
        </section>

        {/* 5. 無料比較 */}
        <section aria-labelledby="dtr-lp-free" style={SECTION_STYLE}>
          <h2 id="dtr-lp-free" style={H2_STYLE}>
            {PAID_DTR_LP.freeComparison.sectionTitleJa}
          </h2>
          <p style={BODY_STYLE}>{PAID_DTR_LP.freeComparison.bodyJa}</p>
        </section>

        {/* 6. 正式4章 */}
        <section aria-labelledby="dtr-lp-chapters" style={SECTION_STYLE}>
          <h2 id="dtr-lp-chapters" style={H2_STYLE}>
            {PAID_DTR_LP.chapters.sectionTitleJa}
          </h2>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {PAID_DTR_LP.chapters.items.map((ch) => (
              <div
                key={ch.titleJa}
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(107, 95, 168, 0.12)",
                  background: "rgba(255,255,255,0.62)",
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "rgba(38, 36, 42, 0.9)" }}>
                  {ch.roman} {ch.titleJa}
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 12.9, color: "rgba(60, 50, 86, 0.75)", lineHeight: 1.65 }}>
                  {ch.introJa}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 7. 相談返書とは */}
        <section aria-labelledby="dtr-lp-consult" style={SECTION_STYLE}>
          <h2 id="dtr-lp-consult" style={H2_STYLE}>
            {PAID_DTR_LP.consultReply.sectionTitleJa}
          </h2>
          <p style={BODY_STYLE}>{PAID_DTR_LP.consultReply.bodyJa}</p>
        </section>

        {/* 8. FULL／ライト比較 */}
        {!hidePriceAndTrust && (
          <section
            id={PAID_DTR_LP.hero.compareSectionId}
            aria-labelledby="dtr-lp-tiers-heading"
            style={SECTION_STYLE}
          >
            <h2 id="dtr-lp-tiers-heading" style={H2_STYLE}>
              {PAID_DTR_LP.tiers.sectionTitleJa}
            </h2>
            <div
              style={{
                marginTop: 14,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <TierCard tier={PAID_DTR_LP.tiers.full} productId={DTR_CORE_FULL_V1} showPurchase={showTierPurchase && !showLightUpgradeCta} />
              <TierCard tier={PAID_DTR_LP.tiers.light} productId={DTR_CORE_LIGHT_V1} showPurchase={showTierPurchase} />
            </div>
            {showTierPurchase && (
              <div style={{ marginTop: 14 }}>
                <CheckoutTrustRow />
              </div>
            )}
          </section>
        )}

        {/* 9. ライトからFULL化 */}
        {!hidePriceAndTrust && (
          <section aria-labelledby="dtr-lp-upgrade" style={SECTION_STYLE}>
            <h2 id="dtr-lp-upgrade" style={H2_STYLE}>
              {PAID_DTR_LP.upgrade.sectionTitleJa}
            </h2>
            {PAID_DTR_LP.upgrade.paragraphsJa.map((para, i) => (
              <p key={i} style={{ ...BODY_STYLE, marginTop: i === 0 ? 12 : 10 }}>
                {para}
              </p>
            ))}
          </section>
        )}

        {/* 10. 購入前の確認 */}
        {!hidePriceAndTrust && (
          <section aria-labelledby="dtr-lp-purchase-notes" style={SECTION_STYLE}>
            <h2 id="dtr-lp-purchase-notes" style={H2_STYLE}>
              {PAID_DTR_LP.purchaseNotes.sectionTitleJa}
            </h2>
            {PAID_DTR_LP.purchaseNotes.paragraphsJa.map((para, i) => (
              <p key={i} style={{ ...BODY_STYLE, marginTop: i === 0 ? 12 : 10 }}>
                {para}
              </p>
            ))}
            <div
              style={{
                marginTop: 14,
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid rgba(80, 65, 120, 0.16)",
                background: "rgba(255,255,255,0.62)",
                fontSize: 12.7,
                lineHeight: 1.75,
                color: "rgba(60, 50, 86, 0.78)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {PAID_DTR_LP.purchaseNotes.legalLinks.map((link) => (
                <div key={link.href}>
                  <Link href={link.href} style={{ color: "#6b5fa8" }}>
                    {link.labelJa}
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 11. FAQ */}
        <section aria-labelledby="dtr-lp-faq" style={SECTION_STYLE}>
          <h2 id="dtr-lp-faq" style={H2_STYLE}>
            {PAID_DTR_LP.faq.sectionTitleJa}
          </h2>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
            {PAID_DTR_LP.faq.items.map((item) => (
              <div
                key={item.questionJa}
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(107, 95, 168, 0.12)",
                  background: "rgba(255,255,255,0.62)",
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: "rgba(38, 36, 42, 0.9)" }}>
                  Q. {item.questionJa}
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 12.9, color: "rgba(60, 50, 86, 0.75)", lineHeight: 1.7, whiteSpace: "pre-line" }}>
                  {item.answerJa}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 12. 最終導線 */}
        <section aria-labelledby="dtr-lp-final" style={SECTION_STYLE}>
          <h2 id="dtr-lp-final" style={H2_STYLE}>
            {PAID_DTR_LP.cta.sectionTitleJa}
          </h2>
          {lpCtaMode !== "purchase" && lpCtaMode !== "signin" && (
            <p style={{ ...BODY_STYLE, marginTop: 12 }}>{OWNED.statusLeadJa}</p>
          )}
          <div style={{ marginTop: 14 }}>
            <FinalCtaBlock lpCtaMode={lpCtaMode} />
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
