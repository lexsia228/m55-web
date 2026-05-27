import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import PurchaseButton from "../../../components/PurchaseButton";
import { CheckoutTrustRow } from "../../../components/checkout/CheckoutTrustRow";
import { PublicShell } from "../../_components/PublicShell";
import "./lp.module.css";
import {
  DTR_OWNED_RECOVERY_PROCESSING_PATH,
  lpCtaModeFromAccess,
  resolveDtrShelfAccess,
  type DtrLpCtaMode,
} from "../../../lib/m55/dtrShelfAccess";
import {
  PAID_DTR_BENEFIT_BULLETS,
  PAID_DTR_BENEFITS_HEADING,
  PAID_DTR_CHAPTERS,
  PAID_DTR_CONSULT_REPLY,
  PAID_DTR_FREE_VS_PAID,
  PAID_DTR_LIFE_USE_CASES,
  PAID_DTR_PRODUCT_IDENTITY,
  PAID_DTR_PURCHASE_ACCESS_FLOW,
  PAID_DTR_TRUST_BOUNDARIES,
  PAID_DTR_VALUE_PROPOSITION,
} from "../../../lib/m55/paidDtrProductCopy";

export const metadata = { title: "本質の読み解き | M55" };


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

function LpCtaBlock({ lpCtaMode }: { lpCtaMode: DtrLpCtaMode }) {
  if (lpCtaMode === "signin") {
    return (
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
    );
  }

  if (lpCtaMode === "expired") {
    return (
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
    );
  }

  if (lpCtaMode === "purchase") {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <PurchaseButton productId="DTR_CORE_STATIC_V1" className="m55-lp-cta-btn">
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
    );
  }

  if (lpCtaMode === "open") {
    return (
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
    );
  }

  if (lpCtaMode === "recovery") {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{
          fontSize: 13,
          color: 'rgba(107, 95, 168, 0.85)',
          margin: 0,
          lineHeight: 1.55,
        }}>
          購入済みです。保存版の準備状況を確認できます（再購入は不要です）。
        </p>
        <Link
          href={DTR_OWNED_RECOVERY_PROCESSING_PATH}
          className="m55-lp-cta-btn"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 12 }}
        >
          <span>準備状況を確認する</span>
          <ArrowRightIcon />
        </Link>
      </div>
    );
  }

  return (
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

  const access = await resolveDtrShelfAccess(userId);
  const lpCtaMode = lpCtaModeFromAccess(access, isExpiredParam);
  const showExpiredBanner =
    isExpiredParam || (access.kind === "authenticated" && access.unlockState === "expired");

  const hidePriceAndTrust =
    !!userId &&
    (lpCtaMode === "open" ||
      lpCtaMode === "pending" ||
      lpCtaMode === "recovery" ||
      lpCtaMode === "expired");

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
                padding: '2px 9px',
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.06em',
                background: 'rgba(177, 156, 255, 0.14)',
                border: '1px solid rgba(177, 156, 255, 0.2)',
                color: 'rgba(177, 156, 255, 0.85)',
              }}>
                {PAID_DTR_PRODUCT_IDENTITY.formatLabel}
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
                {PAID_DTR_PRODUCT_IDENTITY.primaryNameJa}
              </h1>
              <p style={{
                fontSize: 'clamp(13.5px, 2.5vw, 14.5px)',
                margin: 0,
                color: 'rgba(255, 255, 255, 0.55)',
                lineHeight: 1.65,
                whiteSpace: 'pre-line',
              }}>
                {PAID_DTR_VALUE_PROPOSITION.leadParagraphJa}
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

            <div style={{ marginBottom: 6 }}>
              <LpCtaBlock lpCtaMode={lpCtaMode} />
            </div>

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
                {PAID_DTR_BENEFITS_HEADING}
              </h2>
              <ul style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 9,
              }}>
                {PAID_DTR_BENEFIT_BULLETS.map((line, i) => (
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
                  {PAID_DTR_FREE_VS_PAID.bundleNoteJa}
                </p>

                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 10,
                }}>
                  <p
                    style={{ margin: 0, lineHeight: 1.1 }}
                    aria-label={PAID_DTR_TRUST_BOUNDARIES.priceMainProductLabelJa}
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
            ) : lpCtaMode === "recovery" ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{
                  fontSize: 13,
                  color: 'rgba(107, 95, 168, 0.85)',
                  margin: 0,
                  lineHeight: 1.55,
                }}>
                  購入済みです。保存版の準備状況を確認できます（再購入は不要です）。
                </p>
                <Link
                  href={DTR_OWNED_RECOVERY_PROCESSING_PATH}
                  className="m55-lp-cta-btn"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 12 }}
                >
                  <span>準備状況を確認する</span>
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

            <div
              aria-label="販売条件・返金・サポート"
              style={{
                marginTop: 6,
                padding: "12px 14px",
                border: "1px solid rgba(80, 65, 120, 0.16)",
                borderRadius: 14,
                background: "rgba(255,255,255,0.55)",
                fontSize: 12.5,
                lineHeight: 1.7,
                color: "rgba(60, 50, 86, 0.78)"
              }}
            >
              <div>価格：¥1,000（税込）</div>
              <div>支払い：クレジットカード（Stripe）</div>
              <div>返金・キャンセル：<Link href="/legal/refund">/legal/refund</Link></div>
              <div>法務情報：<Link href="/legal/tokushoho">特定商取引法に基づく表記</Link></div>
              <div>サポート：<Link href="/support">/support</Link></div>
            </div>

            {/* Legal note */}
            <p style={{
              margin: 0,
              fontSize: 11.5,
              color: 'rgba(60, 60, 60, 0.55)',
              lineHeight: 1.65,
            }}>
              {lpCtaMode === "pending" || lpCtaMode === "recovery" ? (
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

        {/* B: 無料の見取り図 vs 保存版 */}
        <section aria-labelledby="dtr-lp-free-paid" style={{
          marginTop: 18,
          borderRadius: 20,
          border: "1px solid rgba(107, 95, 168, 0.13)",
          background: "rgba(255,255,255,0.55)",
          boxShadow: "0 18px 60px rgba(29, 24, 61, 0.045)",
          padding: "18px 16px",
        }}>
          <h2 id="dtr-lp-free-paid" style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: "0.02em",
            color: "rgba(60, 50, 86, 0.86)",
          }}>
            無料の見取り図と保存版の違い
          </h2>

          <div style={{ height: 12 }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{
              borderRadius: 16,
              border: "1px solid rgba(107, 95, 168, 0.13)",
              background: "rgba(255,255,255,0.62)",
              padding: 14,
            }}>
              <div style={{ fontSize: 12.8, fontWeight: 900, color: "rgba(107, 95, 168, 0.85)", marginBottom: 8 }}>
                {PAID_DTR_FREE_VS_PAID.freeCoreLabelJa}
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
                {PAID_DTR_FREE_VS_PAID.freeGives.map((line, i) => (
                  <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <CheckIcon />
                    <span style={{ fontSize: 13, color: "rgba(38, 36, 42, 0.88)", lineHeight: 1.6 }}>
                      {line}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{
              borderRadius: 16,
              border: "1px solid rgba(177, 156, 255, 0.2)",
              background: "rgba(177, 156, 255, 0.07)",
              padding: 14,
            }}>
              <div style={{ fontSize: 12.8, fontWeight: 900, color: "rgba(107, 95, 168, 0.85)", marginBottom: 8 }}>
                {PAID_DTR_FREE_VS_PAID.paidSavedLabelJa}
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
                {PAID_DTR_FREE_VS_PAID.paidAdds.map((line, i) => (
                  <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <CheckIcon />
                    <span style={{ fontSize: 13, color: "rgba(38, 36, 42, 0.88)", lineHeight: 1.6 }}>
                      {line}
                    </span>
                  </li>
                ))}
              </ul>
              <p style={{ margin: "10px 0 0", fontSize: 12.7, color: "rgba(60, 50, 86, 0.72)", lineHeight: 1.7 }}>
                {PAID_DTR_FREE_VS_PAID.paidIsNotMerely}
              </p>
            </div>
          </div>
        </section>

        {/* C: 4章の保存版プレビュー */}
        <section aria-labelledby="dtr-lp-chapters" style={{
          marginTop: 18,
          borderRadius: 20,
          border: "1px solid rgba(107, 95, 168, 0.13)",
          background: "rgba(255,255,255,0.55)",
          boxShadow: "0 18px 60px rgba(29, 24, 61, 0.045)",
          padding: "18px 16px",
        }}>
          <h2 id="dtr-lp-chapters" style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: "0.02em",
            color: "rgba(60, 50, 86, 0.9)",
          }}>
            保存版は4章で読み返せるレポート
          </h2>

          <div style={{ height: 12 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {PAID_DTR_CHAPTERS.map((ch) => (
              <div key={ch.id} style={{
                borderRadius: 16,
                border: "1px solid rgba(107, 95, 168, 0.13)",
                background: "rgba(255,255,255,0.62)",
                padding: 14,
              }}>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 900, letterSpacing: "0.08em", color: "rgba(107, 95, 168, 0.85)" }}>
                    {ch.roman}
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: 900, color: "rgba(38, 36, 42, 0.9)" }}>
                    {ch.title}
                  </span>
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 12.9, color: "rgba(60, 50, 86, 0.72)", lineHeight: 1.65 }}>
                  {ch.lifeConcernJa}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* D: 日常での使い方 */}
        <section aria-labelledby="dtr-lp-life-use" style={{
          marginTop: 18,
          borderRadius: 20,
          border: "1px solid rgba(107, 95, 168, 0.13)",
          background: "rgba(255,255,255,0.55)",
          boxShadow: "0 18px 60px rgba(29, 24, 61, 0.045)",
          padding: "18px 16px",
        }}>
          <h2 id="dtr-lp-life-use" style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: "0.02em",
            color: "rgba(60, 50, 86, 0.9)",
          }}>
            日常での使い方
          </h2>
          <div style={{ height: 12 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {PAID_DTR_LIFE_USE_CASES.filter((u) => u.id !== "consult_moment").map((u) => (
              <div key={u.id} style={{
                borderRadius: 16,
                border: "1px solid rgba(107, 95, 168, 0.13)",
                background: "rgba(255,255,255,0.62)",
                padding: 14,
              }}>
                <div style={{ fontSize: 13.5, fontWeight: 900, color: "rgba(38, 36, 42, 0.9)" }}>
                  {u.titleJa}
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 12.9, color: "rgba(60, 50, 86, 0.72)", lineHeight: 1.65 }}>
                  {u.bodyJa}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* E: 相談返書 */}
        <section aria-labelledby="dtr-lp-consult-reply" style={{
          marginTop: 18,
          borderRadius: 20,
          border: "1px solid rgba(177, 156, 255, 0.2)",
          background: "rgba(177, 156, 255, 0.07)",
          boxShadow: "0 18px 60px rgba(29, 24, 61, 0.04)",
          padding: "18px 16px",
        }}>
          <h2 id="dtr-lp-consult-reply" style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: "0.02em",
            color: "rgba(60, 50, 86, 0.9)",
          }}>
            相談返書
          </h2>

          <p style={{ margin: "10px 0 0", fontSize: 12.9, color: "rgba(60, 50, 86, 0.72)", lineHeight: 1.75 }}>
            {PAID_DTR_CONSULT_REPLY.groundedInReportJa}
          </p>

          <div style={{ height: 12 }} />

          <div style={{
            borderRadius: 16,
            border: "1px solid rgba(107, 95, 168, 0.13)",
            background: "rgba(255,255,255,0.62)",
            padding: 14,
          }}>
            <div style={{ fontSize: 13.5, fontWeight: 900, color: "rgba(38, 36, 42, 0.9)" }}>
              付属と追加
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 12.9, color: "rgba(60, 50, 86, 0.72)", lineHeight: 1.7 }}>
              {PAID_DTR_CONSULT_REPLY.capSummaryJa}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 12.9, color: "rgba(60, 50, 86, 0.72)", lineHeight: 1.7 }}>
              {PAID_DTR_CONSULT_REPLY.additionalPriceLabelJa}
            </p>
          </div>

          <div style={{ height: 12 }} />

          <p style={{ margin: 0, fontSize: 12.9, color: "rgba(60, 50, 86, 0.72)", lineHeight: 1.75 }}>
            {PAID_DTR_CONSULT_REPLY.notGenericChatJa}
          </p>

          <div style={{ height: 10 }} />

          <div>
            <div style={{ fontSize: 12.8, fontWeight: 900, color: "rgba(107, 95, 168, 0.85)", marginBottom: 8 }}>
              相談の例（良い使い方）
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
              {PAID_DTR_CONSULT_REPLY.goodQuestionExamplesJa.map((s, i) => (
                <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <CheckIcon />
                  <span style={{ fontSize: 12.9, color: "rgba(38, 36, 42, 0.88)", lineHeight: 1.65 }}>
                    {s}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ height: 10 }} />

          <div>
            <div style={{ fontSize: 12.8, fontWeight: 900, color: "rgba(107, 95, 168, 0.85)", marginBottom: 8 }}>
              対象外の例
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
              {PAID_DTR_CONSULT_REPLY.outOfScopeExamplesJa.map((s, i) => (
                <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <CheckIcon />
                  <span style={{ fontSize: 12.9, color: "rgba(38, 36, 42, 0.88)", lineHeight: 1.65 }}>
                    {s}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ height: 12 }} />

          <p style={{ margin: 0, fontSize: 12.9, color: "rgba(60, 50, 86, 0.72)", lineHeight: 1.75 }}>
            {PAID_DTR_CONSULT_REPLY.whereToUseJa}
          </p>

          <div style={{ marginTop: 8, fontSize: 12.7, color: "rgba(60, 50, 86, 0.68)", lineHeight: 1.7 }}>
            {PAID_DTR_CONSULT_REPLY.avoidOverpromisingJa.slice(0, 2).join(" / ")}
          </div>

          {/* CTA placement (after 相談返書 explanation) */}
          <div style={{ marginTop: 16 }}>
            <LpCtaBlock lpCtaMode={lpCtaMode} />
          </div>
        </section>

        {/* F: 購入〜アクセス */}
        <section aria-labelledby="dtr-lp-flow" style={{
          marginTop: 18,
          borderRadius: 20,
          border: "1px solid rgba(107, 95, 168, 0.13)",
          background: "rgba(255,255,255,0.55)",
          boxShadow: "0 18px 60px rgba(29, 24, 61, 0.045)",
          padding: "18px 16px",
        }}>
          <h2 id="dtr-lp-flow" style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: "0.02em",
            color: "rgba(60, 50, 86, 0.9)",
          }}>
            購入〜アクセスの流れ
          </h2>
          <div style={{ height: 12 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {PAID_DTR_PURCHASE_ACCESS_FLOW.map((step, idx) => (
              <div key={step.id} style={{
                borderRadius: 16,
                border: "1px solid rgba(107, 95, 168, 0.13)",
                background: "rgba(255,255,255,0.62)",
                padding: 14,
              }}>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 900, letterSpacing: "0.08em", color: "rgba(107, 95, 168, 0.85)" }}>
                    {idx + 1}
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: 900, color: "rgba(38, 36, 42, 0.9)" }}>
                    {step.titleJa}
                  </span>
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 12.9, color: "rgba(60, 50, 86, 0.72)", lineHeight: 1.65 }}>
                  {step.bodyJa}
                </p>
              </div>
            ))}
          </div>

          <p style={{ margin: "12px 0 0", fontSize: 12.9, color: "rgba(60, 50, 86, 0.72)", lineHeight: 1.7 }}>
            「レポート棚」から保存版を開く流れです。
          </p>
        </section>

        {/* G: 信頼 / 安全にご利用いただくために */}
        <section aria-labelledby="dtr-lp-trust" style={{
          marginTop: 18,
          borderRadius: 20,
          border: "1px solid rgba(107, 95, 168, 0.13)",
          background: "rgba(255,255,255,0.55)",
          boxShadow: "0 18px 60px rgba(29, 24, 61, 0.045)",
          padding: "18px 16px",
        }}>
          <h2 id="dtr-lp-trust" style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: "0.02em",
            color: "rgba(60, 50, 86, 0.9)",
          }}>
            信頼 / 安全にご利用いただくために
          </h2>

          <div style={{ height: 12 }} />

          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            <li style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <CheckIcon />
              <span style={{ fontSize: 12.9, color: "rgba(38, 36, 42, 0.88)", lineHeight: 1.65 }}>
                {PAID_DTR_TRUST_BOUNDARIES.digitalContentJa}
              </span>
            </li>
            <li style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <CheckIcon />
              <span style={{ fontSize: 12.9, color: "rgba(38, 36, 42, 0.88)", lineHeight: 1.65 }}>
                {PAID_DTR_TRUST_BOUNDARIES.notAdviceJa}
              </span>
            </li>
            <li style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <CheckIcon />
              <span style={{ fontSize: 12.9, color: "rgba(38, 36, 42, 0.88)", lineHeight: 1.65 }}>
                {PAID_DTR_TRUST_BOUNDARIES.noGuaranteedOutcomeJa}
              </span>
            </li>
            <li style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <CheckIcon />
              <span style={{ fontSize: 12.9, color: "rgba(38, 36, 42, 0.88)", lineHeight: 1.65 }}>
                {PAID_DTR_TRUST_BOUNDARIES.profileSnapshotJa}
              </span>
            </li>
          </ul>

          <div style={{ height: 12 }} />

          <div style={{
            borderRadius: 16,
            border: "1px solid rgba(80, 65, 120, 0.16)",
            background: "rgba(255,255,255,0.62)",
            padding: 14,
            fontSize: 12.7,
            lineHeight: 1.7,
            color: "rgba(60, 50, 86, 0.78)",
          }}>
            <div style={{ marginBottom: 6 }}>{PAID_DTR_TRUST_BOUNDARIES.priceMainProductLabelJa}</div>
            <div style={{ marginBottom: 6 }}>
              サポート：<Link href={PAID_DTR_TRUST_BOUNDARIES.supportLinksJa.support}>/support</Link>
            </div>
            <div style={{ marginBottom: 6 }}>
              返金・キャンセル：<Link href={PAID_DTR_TRUST_BOUNDARIES.supportLinksJa.refund}>/legal/refund</Link>
            </div>
            <div>
              法務情報：<Link href={PAID_DTR_TRUST_BOUNDARIES.supportLinksJa.tokushoho}>特定商取引法に基づく表記</Link>
            </div>
          </div>
        </section>

        {/* CTA placement (final area) */}
        <div style={{ marginTop: 18 }}>
          <LpCtaBlock lpCtaMode={lpCtaMode} />
        </div>
      </div>
    </PublicShell>
  );
}
