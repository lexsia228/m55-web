import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "M55",
  description: "オンラインで提供するデジタルコンテンツ（レポート）を販売しています。",
};

export default function HomePage() {
  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px 56px", lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px" }}>M55</h1>

      <p style={{ margin: "0 0 18px", opacity: 0.9 }}>
        オンラインで提供するデジタルコンテンツ（レポート）を販売しています。決済完了後、ウェブ上で閲覧できます。
      </p>

      <section style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 16, margin: "0 0 18px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>商品</h2>
        <p style={{ margin: "0 0 6px" }}><strong>DTR Core Static V1</strong></p>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>価格：<strong>¥1,000（税込）</strong></li>
          <li>提供：決済完了後に閲覧可能（物理配送なし）</li>
        </ul>
        <p style={{ margin: "12px 0 0" }}>
          <Link href="/dtr/lp">商品ページへ（/dtr/lp）</Link>
        </p>
      </section>

      <section style={{ margin: "0 0 18px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>サポート</h2>
        <p style={{ margin: 0 }}>
          お問い合わせは <Link href="/support">/support</Link> に集約しています。
        </p>
      </section>

      <section style={{ margin: "0 0 18px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>返金・キャンセル</h2>
        <p style={{ margin: 0 }}>
          条件は <Link href="/legal/refund">/legal/refund</Link> を参照してください。
        </p>
      </section>

      <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>
        法務情報：<Link href="/legal/tokushoho">特商法</Link> / <Link href="/legal/terms">利用規約</Link> /{" "}
        <Link href="/legal/privacy">プライバシー</Link> / <Link href="/legal/refund">返金</Link> /{" "}
        <Link href="/support">サポート</Link>
      </p>
    </main>
  );
}
