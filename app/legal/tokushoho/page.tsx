import Link from "next/link";

export const metadata = {
  title: "特定商取引法に基づく表記 | M55",
};

export default function TokushohoPage() {
  return (
    <main style={{
      maxWidth: "min(1320px, calc(100vw - 48px))",
      margin: "0 auto",
      padding: "8px clamp(20px, 3vw, 32px) clamp(48px, 7vw, 72px)",
      lineHeight: 1.7,
    }}>
      <h1 style={{
        fontSize: 22,
        fontWeight: 600,
        margin: "0 0 12px",
      }}>
        特定商取引法に基づく表記
      </h1>

      <p style={{
        margin: "0 0 16px",
        opacity: 0.9,
      }}>
        当サイトは、オンラインで提供するデジタルコンテンツ（レポート）を販売しています。
      </p>

      <section style={{
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: 12,
        padding: 16,
        margin: "0 0 16px",
      }}>
        <h2 style={{
          fontSize: 14,
          fontWeight: 700,
          margin: "0 0 8px",
        }}>
          事業者情報
        </h2>

        <ul style={{
          margin: 0,
          paddingLeft: 18,
        }}>
          <li>販売事業者：M55 Project</li>
          <li>連絡先メールアドレス：lexsia228@gmail.com</li>
          <li>所在地・電話番号：ご請求をいただければ遅滞なく開示いたします。</li>
        </ul>
      </section>

      <section style={{
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: 12,
        padding: 16,
        margin: "0 0 16px",
      }}>
        <h2 style={{
          fontSize: 14,
          fontWeight: 700,
          margin: "0 0 8px",
        }}>
          商品・価格
        </h2>

        <p style={{ margin: "0 0 10px", fontSize: 13, opacity: 0.9 }}>
          いずれも4章の保存版を含むデジタル商品です。決済完了後にウェブ上で閲覧できます（物理配送はありません）。
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <p style={{ margin: "0 0 4px" }}>
              <strong>保存版ライト</strong>
            </p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>販売価格：¥1,000（税込）</li>
              <li>内容：4章の保存版</li>
              <li>相談返書：1件</li>
            </ul>
          </div>

          <div>
            <p style={{ margin: "0 0 4px" }}>
              <strong>保存版FULL</strong>
            </p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>販売価格：¥1,480（税込）</li>
              <li>内容：4章の保存版</li>
              <li>相談返書：合計5件</li>
            </ul>
          </div>

          <div>
            <p style={{ margin: "0 0 4px" }}>
              <strong>ライトからFULL化</strong>
            </p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>販売価格：¥600（税込）</li>
              <li>対象：保存版ライトを購入済みの方</li>
              <li>FULL化後：相談返書を合計5件利用できます</li>
            </ul>
          </div>
        </div>

        <ul style={{ margin: "14px 0 0", paddingLeft: 18 }}>
          <li>提供方法：決済完了後にウェブ上でデジタル閲覧（ダウンロード販売ではなく、サイト内での閲覧を主とします）。</li>
          <li>相談返書は、保存版に紐づく一つの相談テーマへの返書です。会話を継続する形式ではありません。</li>
          <li>支払方法：クレジットカード（Link対応）</li>
          <li>代金の支払時期：ご注文時に決済が確定します。なお、実際の引落時期は、お客様がご利用の決済手段（クレジットカード等）の契約内容や各社の定めにより異なります。</li>
        </ul>
        <p style={{ margin: "10px 0 0", fontSize: 13, opacity: 0.9 }}>
          サポート・お問い合わせは <Link href="/support">サポート窓口</Link> にて受け付けます。
        </p>
      </section>

      <section style={{
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: 12,
        padding: 16,
        margin: "0 0 16px",
      }}>
        <h2 style={{
          fontSize: 14,
          fontWeight: 700,
          margin: "0 0 8px",
        }}>
          返品・返金
        </h2>

        <p style={{
          margin: 0,
        }}>
          返金・キャンセルの条件は <Link href="/legal/refund">/legal/refund</Link> を参照してください。
        </p>
      </section>

      <p style={{
        margin: 0,
        fontSize: 12,
        opacity: 0.75,
      }}>
        本サービスはユーザー入力に基づく情報整理のレポートであり、医療・法律・投資等の助言ではありません。
      </p>
    </main>
  );
}
