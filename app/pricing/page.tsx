import Link from "next/link";

export const metadata = { title: "Pricing | M55" };

export default function PricingPage() {
  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px 56px" }}>
      <p style={{ margin: "0 0 10px" }}>
        <Link href="/">M55 Home</Link>
      </p>

      <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 12px" }}>Pricing</h1>

      <p style={{ margin: "0 0 16px", lineHeight: 1.7 }}>
        本ページは料金とサポート導線の説明です。医療・法律・投資等の助言ではありません。
      </p>

      <section style={{ margin: "0 0 18px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 8px" }}>DTR Core Static V1</h2>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
          <li>¥1,000（税込）</li>
          <li>返金・キャンセル：<Link href="/legal/refund">/legal/refund</Link></li>
          <li>サポート：<Link href="/support">/support</Link></li>
        </ul>
      </section>

      <p style={{ margin: "0 0 18px" }}>
        外部確認用ページ：<Link href="/dtr/lp">/dtr/lp</Link>
      </p>
    </main>
  );
}