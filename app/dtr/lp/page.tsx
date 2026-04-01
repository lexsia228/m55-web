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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px 56px", lineHeight: 1.75, flex: "1 0 auto" }}>
      <p style={{ margin: "0 0 10px" }}><Link href="/">M55 Home</Link></p>

      {isExpired && <ExpiredNotice />}

      <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px" }}>DTR Core Static V1</h1>

      <p style={{ margin: "0 0 14px" }}>
        ウェブ上で提供するデジタルコンテンツ（レポート）です。決済完了後に閲覧できます（物理配送なし）。
      </p>

      <section style={{ margin: "0 0 16px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 6px" }}>価格</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
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
        <p style={{ margin: "12px 0 0", fontSize: 12, color: "rgba(0,0,0,0.6)" }}>
          <Link href="/legal/tokushoho">特定商取引法</Link>
          {' · '}
          <Link href="/legal/terms">利用規約</Link>
          {' · '}
          <Link href="/legal/refund">返金・キャンセル</Link>
          {' · '}
          <Link href="/support">サポート</Link>
        </p>
      </section>

      <section style={{ margin: "0 0 16px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 6px" }}>提供・支払い</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>提供：決済完了後に閲覧可能</li>
          <li>支払い：クレジットカード（Stripe）</li>
        </ul>
      </section>

      <p style={{ margin: 0, fontSize: 12, opacity: 0.75 }}>
        本サービスは医療・法律・投資等の助言ではありません。
      </p>
    </main>
    <SiteFooter />
    </div>
  );
}
