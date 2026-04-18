import Link from "next/link";
import PurchaseButton from "../../../components/PurchaseButton";
import { PublicShell } from "../../_components/PublicShell";
import { STATIC_CTA } from "../../../components/core/corePublicCopy";

export const metadata = { title: "本質の読み解き | M55" };

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0, marginTop: 3, color: 'rgba(76, 66, 108, 0.95)' }}
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

/** Minimal expired-state notice (shown when redirected from /dtr/core with ?state=expired). */
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
  const isExpired = params?.state === 'expired';

  return (
    <PublicShell>
      <div style={{
        fontFamily: '"Hiragino Kaku Gothic ProN", "Noto Sans JP", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        color: '#3d3d3d',
        maxWidth: 'min(680px, calc(100vw - 48px))',
        margin: '0 auto',
        padding: 'clamp(16px, 4vw, 32px) 0 clamp(56px, 10vw, 80px)',
        boxSizing: 'border-box',
        lineHeight: 1.75,
      }}>

        {/* パンくず */}
        <p style={{ margin: '0 0 20px', fontSize: 13 }}>
          <Link href="/" style={{ color: '#6b5fa8', textDecoration: 'none' }}>M55</Link>
          <span style={{ margin: '0 6px', opacity: 0.35 }}>›</span>
          <Link href="/core" style={{ color: '#6b5fa8', textDecoration: 'none' }}>本質</Link>
        </p>

        {isExpired && <ExpiredNotice />}

        {/* ────────────────────────────────────
            購入カード（CoreEntryReportCTASection の移植版）
            ──────────────────────────────────── */}
        <section
          aria-labelledby="dtr-lp-title"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            padding: 'clamp(26px, 5vw, 38px) clamp(20px, 4vw, 28px) clamp(28px, 5vw, 40px)',
            borderRadius: 28,
            background: `
              radial-gradient(120% 95% at 50% -2%, rgba(245, 236, 255, 0.6), transparent 58%),
              linear-gradient(172deg, rgba(253, 247, 238, 0.985) 0%, rgba(247, 241, 252, 0.97) 100%)
            `,
            border: '1px solid rgba(107, 95, 168, 0.13)',
            boxShadow: '0 22px 64px rgba(29, 24, 61, 0.075)',
            boxSizing: 'border-box',
          }}
        >
          {/* overline */}
          <span style={{
            display: 'block',
            fontSize: 10.5,
            letterSpacing: '0.2em',
            color: 'rgba(107, 95, 168, 0.7)',
            marginBottom: 8,
            fontWeight: 700,
          }}>
            保存版レポート
          </span>

          {/* タイトル */}
          <h1
            id="dtr-lp-title"
            style={{
              fontFamily: '"Hiragino Mincho ProN", "Noto Serif JP", serif',
              fontSize: 'clamp(22px, 4.6vw, 27px)',
              fontWeight: 500,
              margin: '0 0 16px',
              color: '#1a1a1a',
              letterSpacing: '0.02em',
              lineHeight: 1.4,
            }}
          >
            {STATIC_CTA.title}
          </h1>

          {/* イントロ */}
          <p style={{
            fontSize: 'clamp(15px, 2.85vw, 17px)',
            margin: '0 0 4px',
            maxWidth: '38em',
            lineHeight: 1.78,
            color: 'rgba(40, 38, 44, 0.92)',
            fontWeight: 500,
            whiteSpace: 'pre-line',
          }}>
            {STATIC_CTA.intro}
          </p>

          {/* ベネフィット見出し */}
          <h2 style={{
            fontSize: 'clamp(14px, 2.6vw, 15px)',
            fontWeight: 600,
            margin: '18px 0 10px',
            color: '#1f1f1f',
            letterSpacing: '0.02em',
          }}>
            {STATIC_CTA.benefitsHeading}
          </h2>

          {/* ベネフィットカード */}
          <ul style={{
            margin: '0 0 4px',
            padding: '16px 18px',
            borderRadius: 14,
            background: 'rgba(107, 95, 168, 0.065)',
            border: '1px solid rgba(107, 95, 168, 0.11)',
            listStyle: 'none',
            boxSizing: 'border-box',
          }}>
            {STATIC_CTA.benefits.map((line, i) => (
              <li key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 11,
                marginTop: i > 0 ? 11 : 0,
              }}>
                <CheckIcon />
                <span style={{
                  fontSize: 'clamp(14px, 2.65vw, 15px)',
                  lineHeight: 1.65,
                  color: 'rgba(38, 36, 42, 0.92)',
                }}>
                  {line}
                </span>
              </li>
            ))}
          </ul>

          {/* 価格ブロック */}
          <div style={{ margin: '22px 0 16px' }}>
            <p style={{
              fontSize: 'clamp(13px, 2.5vw, 14px)',
              margin: '0 0 10px',
              lineHeight: 1.55,
              color: 'rgba(55, 52, 58, 0.88)',
            }}>
              {STATIC_CTA.bundleNote}
            </p>
            <p
              style={{ margin: 0, lineHeight: 1.2, letterSpacing: '0.03em' }}
              aria-label={STATIC_CTA.priceLabel}
            >
              <span style={{
                fontSize: 'clamp(17px, 3.4vw, 20px)',
                fontWeight: 700,
                color: '#151515',
              }}>買い切り</span>{' '}
              <span style={{
                fontSize: 'clamp(26px, 5.5vw, 34px)',
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
                color: '#121212',
              }}>1000円</span>
            </p>
          </div>

          {/* 支払い方法 */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            margin: '0 0 16px',
          }} aria-label="対応支払い方法">
            <span style={{
              fontSize: 12,
              color: 'rgba(60, 58, 66, 0.6)',
              letterSpacing: '0.015em',
              lineHeight: 1.4,
            }}>
              クレジットカード / Apple Pay / PayPay 対応
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
              {(['Visa', 'Mastercard', 'JCB', 'AMEX'] as const).map((name) => (
                <span key={name} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '3px 8px',
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  lineHeight: 1,
                  background: 'rgba(255, 255, 255, 0.75)',
                  border: '1px solid rgba(80, 74, 100, 0.18)',
                  color: 'rgba(40, 38, 46, 0.72)',
                }}>
                  {name}
                </span>
              ))}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 8px',
                borderRadius: 5,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.02em',
                lineHeight: 1,
                background: 'rgba(24, 24, 28, 0.88)',
                border: '1px solid transparent',
                color: 'rgba(255, 255, 255, 0.95)',
              }}>
                Apple Pay
              </span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 8px',
                borderRadius: 5,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.02em',
                lineHeight: 1,
                background: 'rgba(215, 20, 20, 0.88)',
                border: '1px solid transparent',
                color: 'rgba(255, 255, 255, 0.97)',
              }}>
                PayPay
              </span>
            </div>
          </div>

          {/* 購入ボタン */}
          <PurchaseButton
            productId="DTR_CORE_STATIC_V1"
            className="inline-flex items-center justify-center rounded-full bg-[#534a72] px-8 py-4 text-white font-bold hover:opacity-90 w-full text-base tracking-wide shadow-lg"
          >
            1000円で本質の読み解きを購入する
          </PurchaseButton>

          {/* 法的注記 */}
          <p style={{
            marginTop: 20,
            fontSize: 12,
            color: 'rgba(60, 60, 60, 0.65)',
            lineHeight: 1.65,
          }}>
            ウェブ上で提供するデジタルコンテンツ（レポート）です。決済完了後すぐに閲覧できます（物理配送なし）。
            本サービスは医療・法律・投資等の助言ではありません。
          </p>
        </section>
      </div>
    </PublicShell>
  );
}
