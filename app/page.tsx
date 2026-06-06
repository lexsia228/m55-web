import type { Metadata } from "next";
import Link from "next/link";
import { TOP_FREE_ENTRY_PUBLIC_COPY } from "../lib/m55/topFreeEntryPublicCopy";

const copy = TOP_FREE_ENTRY_PUBLIC_COPY;

export const metadata: Metadata = {
  title: "M55",
  description: copy.m55Definition.shortJa.replace(/\n/g, " "),
};

export default function HomePage() {
  const { storefront, cta } = copy;

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px 56px", lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px" }}>M55</h1>

      <p style={{ margin: "0 0 18px", opacity: 0.9 }}>
        {storefront.introJa}
      </p>

      <section style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 16, margin: "0 0 14px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>商品</h2>
        <p style={{ margin: "0 0 6px" }}>
          <strong>{storefront.fullPlanNameJa}</strong>
        </p>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>価格：<strong>{storefront.fullPriceLabelJa}</strong></li>
          <li>内容：{storefront.fullSavedReportJa}</li>
          <li>{storefront.fullConsultReplyJa}</li>
          <li>提供：決済完了後に閲覧可能（物理配送なし）</li>
        </ul>
      </section>

      <section style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 16, margin: "0 0 14px" }}>
        <p style={{ margin: "0 0 6px" }}>
          <strong>{storefront.lightPlanNameJa}</strong>
        </p>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>価格：<strong>{storefront.lightPriceLabelJa}</strong></li>
          <li>内容：{storefront.lightSavedReportJa}</li>
          <li>{storefront.lightConsultReplyJa}</li>
          <li>提供：決済完了後に閲覧可能（物理配送なし）</li>
        </ul>
        <p style={{ margin: "12px 0 0", fontSize: 13, opacity: 0.9 }}>
          {storefront.upgradeNoteJa}
        </p>
      </section>

      <section style={{ margin: "0 0 18px" }}>
        <p style={{ margin: "0 0 8px" }}>
          <Link href={cta.homeHref}>{cta.viewFreeMapJa}</Link>
        </p>
        <p style={{ margin: 0 }}>
          <Link href={cta.viewSavedPlansHref}>{cta.viewSavedPlansJa}</Link>
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
