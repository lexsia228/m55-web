import Link from "next/link";
import {
  M55_PUBLIC_SUPPORT_EMAIL,
  M55_PUBLIC_SUPPORT_MAILTO,
} from "../../../lib/m55/accountDataControlPublicCopy";

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
          <li>
            連絡先メールアドレス：
            <a href={M55_PUBLIC_SUPPORT_MAILTO}>{M55_PUBLIC_SUPPORT_EMAIL}</a>
          </li>
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
          いずれも4章の保存版を含むデジタル商品です。決済完了後にウェブ上で閲覧できます（物理配送はありません）。保存版は購入時点の入力内容をもとにした読み返し用レポートです。日次・週次・月次の鑑定を継続して提供するサービスではありません。
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <p style={{ margin: "0 0 4px" }}>
              <strong>保存版ライト</strong> — まず保存版を読み、輪郭を整理したい方向け
            </p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>販売価格：¥1,000（税込）</li>
              <li>内容：4章の保存版</li>
              <li>相談返書：1件</li>
            </ul>
          </div>

          <div>
            <p style={{ margin: "0 0 4px" }}>
              <strong>保存版FULL</strong> — 保存版を読んだあと、返書で複数回深めたい方向け
            </p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>販売価格：¥1,480（税込）</li>
              <li>内容：4章の保存版</li>
              <li>相談返書：合計5件</li>
            </ul>
          </div>

          <div>
            <p style={{ margin: "0 0 4px" }}>
              <strong>ライトからFULL化</strong> — ライト購入後、相談返書を合計5件まで増やす追加選択
            </p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>販売価格：¥600（税込）</li>
              <li>対象：保存版ライトを購入済みの方</li>
              <li>FULL化後：相談返書を合計5件利用できます</li>
              <li>参考：ライト ¥1,000 ＋ FULL化 ¥600 ＝ 合計¥1,600（最初からFULL ¥1,480）</li>
            </ul>
          </div>
        </div>

        <ul style={{ margin: "14px 0 0", paddingLeft: 18 }}>
          <li>提供方法：決済完了後にウェブ上でデジタル閲覧（ダウンロード販売ではなく、サイト内での閲覧を主とします）。</li>
          <li>相談返書は、保存版に紐づく一つの相談テーマへの返書です。件数内での利用であり、会話を継続する形式ではありません。</li>
          <li>支払方法：クレジットカード（Link対応）</li>
          <li>代金の支払時期：ご注文時に決済が確定します。なお、実際の引落時期は、お客様がご利用の決済手段（クレジットカード等）の契約内容や各社の定めにより異なります。</li>
          <li>表示価格以外の追加料金はありません。ただし、通信料等は利用者の負担となります。</li>
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
          返金・キャンセルの条件は <Link href="/legal/refund">返金・キャンセル</Link> を参照してください。
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
