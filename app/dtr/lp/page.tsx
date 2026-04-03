import Link from "next/link";
import PurchaseButton from "../../../components/PurchaseButton";
import { SiteFooter } from "../../_components/SiteFooter";

export const metadata = { title: "DTR | M55" };

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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f9f7f4" }}>
    <main
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: "32px 20px 56px",
        lineHeight: 1.8,
        flex: "1 0 auto",
        fontFamily: '"Hiragino Kaku Gothic ProN", "Noto Sans JP", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        color: "#3d3d3d",
      }}
    >
      <p style={{ margin: "0 0 10px", fontSize: 13 }}>
        <Link href="/" style={{ color: "#6b5fa8" }}>M55 Home</Link>
      </p>

      {isExpired && <ExpiredNotice />}

      <h1
        style={{
          fontFamily: '"Hiragino Mincho ProN", "Noto Serif JP", serif',
          fontSize: 24,
          fontWeight: 500,
          margin: "0 0 16px",
          color: "#1a1a1a",
          letterSpacing: "0.02em",
        }}
      >
        DTR Core Static V1
      </h1>

      <p style={{ margin: "0 0 18px", fontSize: 14 }}>
        ウェブ上で提供するデジタルコンテンツ（レポート）です。決済完了後に閲覧できます（物理配送なし）。
      </p>

      <section style={{ margin: "0 0 16px" }}>
        <h2
          style={{
            fontFamily: '"Hiragino Mincho ProN", "Noto Serif JP", serif',
            fontSize: 18,
            fontWeight: 500,
            margin: "0 0 8px",
            color: "#1a1a1a",
          }}
        >
          価格
        </h2>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.8 }}>
          <li>¥1,000（税込）</li>
        </ul>
      </section>

      <section style={{ margin: "0 0 20px" }}>
        <PurchaseButton
          productId="DTR_CORE_STATIC_V1"
          className="inline-flex items-center justify-center rounded-full bg-[#9aa3ff] px-8 py-3 text-white font-semibold hover:opacity-90"
        >
          ¥1,000で購入する
        </PurchaseButton>
        <p style={{ margin: "12px 0 0", fontSize: 12, color: "rgba(60,60,60,0.7)" }}>
          <Link href="/legal/tokushoho" style={{ color: "#6b5fa8" }}>特定商取引法</Link>
          {' · '}
          <Link href="/legal/terms" style={{ color: "#6b5fa8" }}>利用規約</Link>
          {' · '}
          <Link href="/legal/refund" style={{ color: "#6b5fa8" }}>返金・キャンセル</Link>
          {' · '}
          <Link href="/support" style={{ color: "#6b5fa8" }}>サポート</Link>
        </p>
      </section>

      <section style={{ margin: "0 0 16px" }}>
        <h2
          style={{
            fontFamily: '"Hiragino Mincho ProN", "Noto Serif JP", serif',
            fontSize: 18,
            fontWeight: 500,
            margin: "0 0 8px",
            color: "#1a1a1a",
          }}
        >
          提供・支払い
        </h2>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.8 }}>
          <li>提供：決済完了後に閲覧可能</li>
          <li>支払い：クレジットカード（Stripe）</li>
        </ul>
      </section>

      <p style={{ margin: 0, fontSize: 12, color: "rgba(60,60,60,0.7)" }}>
        本サービスは医療・法律・投資等の助言ではありません。
      </p>
    </main>
    <SiteFooter />
    </div>
  );
}
