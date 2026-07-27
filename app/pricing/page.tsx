import Link from "next/link";
import { getCommercialProduct } from "../../lib/m55/contracts/m55CommercialFunnelContract";
import { PAID_DTR_PRICING_AUTHORITY_NOTE_JA } from "../../lib/m55/paidDtrProductCopy";

export const metadata = { title: "料金とプラン | M55" };

export default function PricingPage() {
  const light = getCommercialProduct("selfPremiumLight");
  const full = getCommercialProduct("selfPremiumFull");

  return (
    <main style={{ maxWidth: "min(56rem, calc(100vw - 32px))", margin: "0 auto", padding: "24px 16px 56px" }}>
      <p style={{ margin: "0 0 10px" }}>
        <Link href="/home">ホームへ戻る</Link>
      </p>

      <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 12px" }}>料金とプラン</h1>

      <p style={{ margin: "0 0 16px", lineHeight: 1.7 }}>
        M55のプレミアムレポートは、現在「{light.publicName}」と「{full.publicName}」から選べます。
        詳しい違いと購入前の確認は、プレミアムレポートの案内ページで確認できます。
      </p>

      <p style={{ margin: "0 0 16px", lineHeight: 1.7 }}>
        {PAID_DTR_PRICING_AUTHORITY_NOTE_JA}
      </p>

      <section style={{ margin: "0 0 18px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 8px" }}>プランの選び方</h2>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
          <li>
            <strong>{light.publicName}</strong>：まずレポートを読み、1テーマだけ整理したい方向け（追加読み解き1件）
          </li>
          <li>
            <strong>{full.publicName}</strong>：追加読み解きで何度か、深く整理したい方向け（追加読み解き合計5件）
          </li>
        </ul>
        <p style={{ margin: "12px 0 0", lineHeight: 1.7 }}>
          ライト購入後でも、必要になったらFULL化できます。
        </p>
      </section>

      <p style={{ margin: "0 0 12px", lineHeight: 1.7 }}>
        <Link href="/dtr/lp">プレミアムレポートのプランを見る</Link>
      </p>
      <p style={{ margin: "0 0 12px", lineHeight: 1.7 }}>
        <Link href="/support">サポートを確認する</Link>
      </p>

      <p style={{ margin: "16px 0 0", fontSize: 14, lineHeight: 1.7, opacity: 0.9 }}>
        本ページは料金とサポート導線の案内です。医療・法律・投資等の助言ではありません。
      </p>
    </main>
  );
}
