import {
  M55_LEGAL_SAFETY_BOUNDARIES,
  M55_USER_FACING_POSITIONING_COPY,
} from "../../../lib/m55/analysisAuthorityReferenceModel";

export const metadata = {
  title: "利用規約 | M55",
};

export default function TermsPage() {
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
        利用規約
      </h1>

      <p style={{
        margin: "0 0 16px",
        opacity: 0.9,
      }}>
        本規約は、M55 Project（以下「当社」）が提供するデジタルコンテンツ（レポート）の閲覧サービス（以下「本サービス」）の利用条件を定めるものです。
      </p>

      <section style={{ margin: "0 0 16px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>サービスの性質</h2>
        {M55_USER_FACING_POSITIONING_COPY.map((paragraph) => (
          <p key={paragraph.slice(0, 24)} style={{ margin: "0 0 10px", opacity: 0.9 }}>
            {paragraph}
          </p>
        ))}
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {M55_LEGAL_SAFETY_BOUNDARIES.isNotJa.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section style={{ margin: "0 0 16px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>提供内容</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>本サービスは、ユーザー入力に基づく情報整理のレポートを提供します。</li>
          <li>保存版は、購入時点の入力内容をもとにした読み返し用レポートです。</li>
          <li>決済完了後、ウェブ上で閲覧可能です（物理配送はありません）。</li>
        </ul>
      </section>

      <section style={{ margin: "0 0 16px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>禁止事項</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>不正アクセス、またはこれを助長する行為</li>
          <li>本サービスの運営を妨げる行為</li>
          <li>法令または公序良俗に反する行為</li>
        </ul>
      </section>

      <section style={{ margin: "0 0 16px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>追加読み解きの利用条件</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>追加読み解きは、保存版を購入したユーザーのみ利用できます。</li>
          <li>追加読み解きは、保存版に紐づく一つの読み解きテーマを整理する追加読み解きです。件数内での利用であり、会話を継続する形式ではありません。</li>
          <li>保存版ライト（¥1,000）には追加読み解き1件が含まれます。まず保存版を読みたい方向けです。</li>
          <li>保存版FULL（¥1,480）には追加読み解きが合計5件含まれます。追加読み解きで複数回深めたい方向けです。</li>
          <li>ライト購入後にFULL化（¥600）した場合も、利用可能な追加読み解きは合計5件です（合計¥1,600）。</li>
          <li>生成された追加読み解きは、レポートの内容に関する整理を目的としており、医療・法律・投資等の専門的助言ではありません。</li>
          <li>危機的・不適切な内容が検知された場合、送信をブロックします。この場合、追加読み解きの件数は消費されません。</li>
          <li>追加読み解きは当該保存版に付随するサービスであり、一般公開された会話サービスではありません。</li>
        </ul>
      </section>

      <section style={{ margin: "0 0 16px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>免責・責任制限</h2>
        <p style={{ margin: 0 }}>
          本サービスはユーザー入力に基づく情報整理のレポートであり、自己理解・関係性整理のための参考情報です。
          医学的診断、心理検査、治療、カウンセリング、または将来の不確実な事実を断定するものではありません。
          占い・鑑定・診断・相談としての断定サービスではなく、医療・法律・投資等の専門的助言ではありません。
        </p>
      </section>

      <section style={{ margin: "0 0 16px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>返金・問い合わせ</h2>
        <p style={{ margin: 0 }}>
          返金条件およびお問い合わせ方法は、サイト下部の各ページをご確認ください。
        </p>
      </section>

      <p style={{ margin: 0, fontSize: 12, opacity: 0.75 }}>
        本規約は、必要に応じて改定することがあります。改定後の内容は当サイト上に掲載した時点で効力を生じます。
      </p>
    </main>
  );
}
