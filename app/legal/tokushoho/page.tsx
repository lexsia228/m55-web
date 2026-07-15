import Link from "next/link";
import {
  M55_USER_FACING_POSITIONING_COPY,
  M55_PUBLIC_COMMERCIAL_TRUTH,
} from "../../../lib/m55/analysisAuthorityReferenceModel";
import { PAID_DTR_SAVED_REPORT_PRICING } from "../../../lib/m55/paidDtrProductCopy";
import {
  M55_PUBLIC_SUPPORT_EMAIL,
  M55_PUBLIC_SUPPORT_MAILTO,
} from "../../../lib/m55/accountDataControlPublicCopy";

export const metadata = {
  title: "特定商取引法に基づく表記 | M55",
  description: "M55の販売事業者、所在地、連絡先、商品価格、提供時期、支払方法、返金条件を掲載しています。",
  alternates: { canonical: "/legal/tokushoho" },
};

export default function TokushohoPage() {
  return (
    <div style={{
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
        {M55_USER_FACING_POSITIONING_COPY[0]}
        表示内容は、自己理解・関係性整理のための参考情報であり、医学的診断・心理検査・治療・カウンセリング、または将来の不確実な事実を断定するものではありません。
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
          <li>所在地：〒107-0062 東京都港区南青山3丁目1番36号 青山丸竹ビル6F</li>
          <li>電話番号：ご請求をいただければ遅滞なく開示いたします。</li>
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
          いずれも4章の保存版を含むデジタル商品です。決済完了後にウェブ上で閲覧できます（物理配送はありません）。保存版は購入時点の入力内容をもとにした読み返し用レポートです。
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <p style={{ margin: "0 0 4px" }}>
              <strong>保存版ライト</strong> — まず保存版を読み、輪郭を整理したい方向け
            </p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>
                販売価格：{PAID_DTR_SAVED_REPORT_PRICING.light.priceLabelJa}・日本円（JPY）
              </li>
              <li>内容：4章の保存版</li>
              <li>追加読み解き：1件</li>
            </ul>
          </div>

          <div>
            <p style={{ margin: "0 0 4px" }}>
              <strong>保存版FULL</strong> — 保存版を読んだあと、追加読み解きで複数回深めたい方向け
            </p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>
                販売価格：{PAID_DTR_SAVED_REPORT_PRICING.full.priceLabelJa}・日本円（JPY）
              </li>
              <li>内容：4章の保存版</li>
              <li>追加読み解き：合計5件</li>
            </ul>
          </div>

          <div>
            <p style={{ margin: "0 0 4px" }}>
              <strong>ライトからFULL化</strong> — ライト購入後、追加読み解きを合計5件まで増やす追加選択
            </p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>
                販売価格：{PAID_DTR_SAVED_REPORT_PRICING.lightToFullUpgrade.priceLabelJa}・日本円（JPY）
              </li>
              <li>対象：保存版ライトを購入済みの方</li>
              <li>FULL化後：追加読み解きを合計5件利用できます</li>
            </ul>
          </div>
        </div>

        <ul style={{ margin: "14px 0 0", paddingLeft: 18 }}>
          <li>提供方法：{M55_PUBLIC_COMMERCIAL_TRUTH.commercial.deliveryJa}</li>
          <li>追加読み解きは、保存版に紐づく一つの読み解きテーマを整理する追加読み解きです。件数内での利用であり、会話を継続する形式ではありません。</li>
          <li>支払方法：{M55_PUBLIC_COMMERCIAL_TRUTH.commercial.paymentProcessorJa}</li>
          <li>{M55_PUBLIC_COMMERCIAL_TRUTH.commercial.billingJa}</li>
          <li>代金の支払時期：ご注文時に決済が確定します。なお、実際の引落時期は、お客様がご利用の決済手段（クレジットカード等）の契約内容や各社の定めにより異なります。</li>
          <li>表示価格以外の追加料金はありません。ただし、通信料等は利用者の負担となります。</li>
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
        {M55_USER_FACING_POSITIONING_COPY[2]}
        {" "}
        医療・法律・投資等の専門的助言ではありません。
      </p>
    </div>
  );
}
