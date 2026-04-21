import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import PurchaseButton from "../../../components/PurchaseButton";
import { CheckoutTrustRow } from "../../../components/checkout/CheckoutTrustRow";
import { PublicShell } from "../../_components/PublicShell";
import { STATIC_CTA } from "../../../components/core/corePublicCopy";
import { resolveEntryReportOwnership } from "../../../lib/m55/dtrOwnershipGate";
import { getDtrReportSnapshot } from "../../../lib/m55/dtrDraftDb";
import { DTR_CORE_STATIC_V1 } from "../../../lib/oneTimeCheckout";

export const metadata = { title: "本質の読み解き | M55" };

/** LP 下部 CTA（サーバで解決。内部コードは画面に出さない） */
type DtrLpCtaMode = "signin" | "expired" | "purchase" | "open" | "pending";

function CheckIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0, marginTop: 2, color: 'rgba(107, 95, 168, 0.75)' }}
    >
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

/** Minimal expired-state notice. */
function ExpiredNotice() {
  return (
    <p style={{
      margin: '0 0 20px',
      fontSize: 13,
      color: '#5a4ea0',
      padding: '10px 14px',
      background: 'rgba(124, 111, 214, 0.06)',
      borderRadius: 8,
      lineHeight: 1.65,
    }}>
      このレポートへのアクセス有効期限が切れています。
      ご不明な点は<Link href="/support" style={{ color: '#7c6fd6' }}>サポート</Link>までご連絡ください。
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

  let lpCtaMode: DtrLpCtaMode = "signin";
  let showExpiredBanner = isExpiredParam;

  if (userId) {
    const ownership = await resolveEntryReportOwnership(userId);
    if (ownership.unlockState === "expired" || isExpiredParam) {
      lpCtaMode = "expired";
      showExpiredBanner = true;
    } else if (ownership.unlockState === "locked") {
      lpCtaMode = "purchase";
    } else if (ownership.unlockState === "owned") {
      const snap = await getDtrReportSnapshot(userId, DTR_CORE_STATIC_V1);
      lpCtaMode = snap ? "open" : "pending";
    } else {
      lpCtaMode = "purchase";
    }
  }

  const hidePriceAndTrust =
    !!userId && (lpCtaMode === "open" || lpCtaMode === "pending" || lpCtaMode === "expired");

  return (
    <PublicShell>
      <div style={{
        fontFamily: '"Hiragino Kaku Gothic ProN", "Noto Sans JP", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        color: '#3d3d3d',
        maxWidth: 'min(640px, calc(100vw - 40px))',
        margin: '0 auto',
        padding: 'clamp(16px, 4vw, 32px) 0 clamp(64px, 10vw, 96px)',
        boxSizing: 'border-box',
        lineHeight: 1.75,
      }}>

        {/* パンくず — 棚（/dtr）→ 商品ページ（LP）の流れを明示 */}
        <p style={{ margin: '0 0 20px', fontSize: 12.5, letterSpacing: '0.01em' }}>
          <Link href="/" style={{ color: '#6b5fa8', textDecoration: 'none' }}>M55</Link>
          <span style={{ margin: '0 6px', opacity: 0.35 }}>›</span>
          <Link href="/dtr" style={{ color: '#6b5fa8', textDecoration: 'none' }}>レポート</Link>
          <span style={{ margin: '0 6px', opacity: 0.35 }}>›</span>
          <span style={{ color: 'rgba(60, 60, 60, 0.55)' }}>商品ページ</span>
        </p>

        {showExpiredBanner && <ExpiredNotice />}

        {/* ── Purchase card ───────────────────────────────────────── */}
        <section
          aria-labelledby="dtr-lp-title"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            borderRadius: 24,
            border: '1px solid rgba(107, 95, 168, 0.13)',
            boxShadow: '0 24px 72px rgba(29, 24, 61, 0.085)',
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          {/* ── Dark identity header ─────────────────────────────── */}
          <div style={{
            background: 'linear-gradient(145deg, #1a1230 0%, #261740 55%, #1c1438 100%)',
            padding: 'clamp(18px, 3.5vw, 24px) clamp(20px, 4vw, 28px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}>
            {/* Badge row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 11.5,
                fontWeight: 800,
                letterSpacing: '0.12em',
                color: 'rgba(255, 255, 255, 0.45)',
              }}>
                M55
              </span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 10px',
                borderRadius: 999,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.08em',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: 'rgba(255, 255, 255, 0.78)',
              }}>
                Entry Report
              </span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 9px',
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.06em',
                background: 'rgba(177, 156, 255, 0.14)',
                border: '1px solid rgba(177, 156, 255, 0.2)',
                color: 'rgba(177, 156, 255, 0.85)',
              }}>
                保存版
              </span>
            </div>

            {/* Product headline */}
            <div>
              <h1
                id="dtr-lp-title"
                style={{
                  fontFamily: '"Hiragino Mincho ProN", "Noto Serif JP", serif',
                  fontSize: 'clamp(21px, 4.2vw, 25px)',
                  fontWeight: 500,
                  margin: '0 0 8px',
                  color: 'rgba(255, 255, 255, 0.94)',
                  letterSpacing: '0.02em',
                  lineHeight: 1.42,
                }}
              >
                {STATIC_CTA.title}
              </h1>
              <p style={{
                fontSize: 'clamp(13.5px, 2.5vw, 14.5px)',
                margin: 0,
                color: 'rgba(255, 255, 255, 0.55)',
                lineHeight: 1.65,
                whiteSpace: 'pre-line',
              }}>
                {STATIC_CTA.intro}
              </p>
            </div>
          </div>

          {/* ── Card body: benefits + price + CTA ───────────────── */}
          <div style={{
            background: `
              radial-gradient(120% 90% at 50% -4%, rgba(245, 236, 255, 0.55), transparent 55%),
              linear-gradient(172deg, rgba(253, 247, 238, 0.99) 0%, rgba(247, 241, 252, 0.98) 100%)
            `,
            padding: 'clamp(22px, 4vw, 30px) clamp(20px, 4vw, 28px) clamp(24px, 4.5vw, 32px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}>

            {/* Benefits */}
            <div>
              <h2 style={{
                fontSize: 12.5,
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: 'rgba(107, 95, 168, 0.7)',
                margin: '0 0 10px',
                textTransform: 'uppercase',
              }}>
                {STATIC_CTA.benefitsHeading}
              </h2>
              <ul style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 9,
              }}>
                {STATIC_CTA.benefits.map((line, i) => (
                  <li key={i} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}>
                    <CheckIcon />
                    <span style={{
                      fontSize: 'clamp(13.5px, 2.6vw, 14.5px)',
                      lineHeight: 1.62,
                      color: 'rgba(38, 36, 42, 0.88)',
                    }}>
                      {line}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Divider */}
            <div style={{
              height: 1,
              background: 'rgba(107, 95, 168, 0.1)',
              borderRadius: 1,
            }} />

            {/* Price block — 未購入の購入導線でのみ表示（既購入・期限切れでは違和感を避ける） */}
            {!hidePriceAndTrust && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{
                  fontSize: 12,
                  color: 'rgba(55, 52, 58, 0.6)',
                  margin: 0,
                  lineHeight: 1.5,
                }}>
                  {STATIC_CTA.bundleNote}
                </p>

                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 10,
                }}>
                  <p
                    style={{ margin: 0, lineHeight: 1.1 }}
                    aria-label={STATIC_CTA.priceLabel}
                  >
                    <span style={{
                      fontSize: 'clamp(28px, 5.8vw, 36px)',
                      fontWeight: 800,
                      fontVariantNumeric: 'tabular-nums',
                      color: '#121212',
                      letterSpacing: '-0.01em',
                    }}>¥1,000</span>
                  </p>
                  <span style={{
                    fontSize: 12,
                    color: 'rgba(55, 52, 58, 0.55)',
                    letterSpacing: '0.02em',
                    paddingBottom: 2,
                  }}>買い切り</span>
                </div>
              </div>
            )}

            {!hidePriceAndTrust && (
              <CheckoutTrustRow />
            )}

            {/* CTA block */}
            {lpCtaMode === "signin" ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{
                  fontSize: 13,
                  color: 'rgba(107, 95, 168, 0.78)',
                  margin: 0,
                  lineHeight: 1.55,
                }}>
                  購入にはログインが必要です。
                </p>
                <a
                  href={`/sign-in?redirect_url=${encodeURIComponent('/dtr/lp')}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #3d3262 0%, #534a72 100%)',
                    padding: '16px 22px',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 'clamp(14.5px, 2.8vw, 16px)',
                    letterSpacing: '0.02em',
                    textDecoration: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                    boxShadow: '0 8px 28px rgba(61, 50, 98, 0.38)',
                  }}
                >
                  <span>ログインして入手する</span>
                  <ArrowRightIcon />
                </a>
              </div>
            ) : lpCtaMode === "expired" ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <Link
                  href="/support"
                  className="m55-lp-cta-btn"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 12 }}
                >
                  <span>サポートに相談する</span>
                  <ArrowRightIcon />
                </Link>
              </div>
            ) : lpCtaMode === "purchase" ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <PurchaseButton
                  productId="DTR_CORE_STATIC_V1"
                  className="m55-lp-cta-btn"
                >
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    gap: 12,
                  }}>
                    <span>購入する</span>
                    <ArrowRightIcon />
                  </span>
                </PurchaseButton>
              </div>
            ) : lpCtaMode === "open" ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <Link
                  href="/dtr/core"
                  className="m55-lp-cta-btn"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 12 }}
                >
                  <span>レポートを開く</span>
                  <ArrowRightIcon />
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{
                  fontSize: 13,
                  color: 'rgba(107, 95, 168, 0.85)',
                  margin: 0,
                  lineHeight: 1.55,
                }}>
                  本文の準備が完了すると閲覧できます。しばらくしてから再度お試しください。
                </p>
                <button
                  type="button"
                  disabled
                  className="m55-lp-cta-btn"
                  aria-disabled
                >
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    gap: 12,
                  }}>
                    <span>レポートの準備中</span>
                    <ArrowRightIcon />
                  </span>
                </button>
              </div>
            )}

            {/* Legal note */}
            <p style={{
              margin: 0,
              fontSize: 11.5,
              color: 'rgba(60, 60, 60, 0.55)',
              lineHeight: 1.65,
            }}>
              {lpCtaMode === "pending" ? (
                <>
                  ウェブ上で提供するデジタルコンテンツ（レポート）です（物理配送なし）。
                  本文の生成が完了次第、閲覧いただけます。
                  本サービスは医療・法律・投資等の助言ではありません。
                </>
              ) : (
                <>
                  ウェブ上で提供するデジタルコンテンツ（レポート）です。決済完了後すぐに閲覧できます（物理配送なし）。
                  本サービスは医療・法律・投資等の助言ではありません。
                </>
              )}
            </p>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
