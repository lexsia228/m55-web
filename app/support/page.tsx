import Link from "next/link";
import {
  M55_LEGAL_SAFETY_BOUNDARIES,
  M55_USER_FACING_POSITIONING_COPY,
} from "../../lib/m55/analysisAuthorityReferenceModel";
import {
  M55_PUBLIC_SUPPORT_EMAIL,
  M55_PUBLIC_SUPPORT_MAILTO,
  ACCOUNT_DATA_SUPPORT_AFTER_VERIFY,
  ACCOUNT_DATA_SUPPORT_CONTACT_NOTE,
  ACCOUNT_DATA_SUPPORT_INTRO,
  ACCOUNT_DATA_SUPPORT_REQUEST_INFO,
  ACCOUNT_DATA_SUPPORT_RETENTION_BOUNDARY,
  ACCOUNT_DATA_SUPPORT_SAVED_REPORT_BOUNDARY,
  ACCOUNT_DATA_SUPPORT_SECTION_ID,
  ACCOUNT_DATA_SUPPORT_SECTION_TITLE,
  ACCOUNT_DATA_SUPPORT_SECURITY_NOTE,
  ACCOUNT_DATA_SUPPORT_TARGET_EXAMPLES,
} from "../../lib/m55/accountDataControlPublicCopy";

export const metadata = {
  title: "サポート | M55",
  description: "M55の購入、利用、請求、返金、保存版、追加読み解き、入力データに関する問い合わせ窓口です。",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <div style={{ maxWidth: "min(1320px, calc(100vw - 48px))", margin: "0 auto", padding: "8px clamp(20px, 3vw, 32px) clamp(48px, 7vw, 72px)", lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 12px" }}>サポート</h1>

      <section style={{ margin: "0 0 18px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>お問い合わせについて</h2>
        <p style={{ margin: "0 0 6px", opacity: 0.9 }}>
          このページでは、よくある質問と、
          ご連絡前に確認していただきたい内容をまとめています。
        </p>
        <p style={{ margin: 0, opacity: 0.9 }}>
          購入・利用・請求・返金に関するお問い合わせは{" "}
          <a href={M55_PUBLIC_SUPPORT_MAILTO}>{M55_PUBLIC_SUPPORT_EMAIL}</a>
          {" "}までご連絡ください。
        </p>
      </section>

      <section style={{ margin: "0 0 18px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>返信について</h2>
        <p style={{ margin: 0, opacity: 0.9 }}>
          通常、2〜5営業日程度でご返信するよう努めております（状況により前後します）。
        </p>
      </section>

      <section id={ACCOUNT_DATA_SUPPORT_SECTION_ID} style={{ margin: "0 0 18px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>
          {ACCOUNT_DATA_SUPPORT_SECTION_TITLE}
        </h2>
        <p style={{ margin: "0 0 10px", opacity: 0.9 }}>{ACCOUNT_DATA_SUPPORT_INTRO}</p>
        <p style={{ margin: "0 0 10px", opacity: 0.9 }}>{ACCOUNT_DATA_SUPPORT_REQUEST_INFO}</p>
        <p style={{ margin: "0 0 6px", opacity: 0.9 }}>対象例：</p>
        <ul style={{ margin: "0 0 10px", paddingLeft: 18, lineHeight: 1.8 }}>
          {ACCOUNT_DATA_SUPPORT_TARGET_EXAMPLES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p style={{ margin: "0 0 10px", opacity: 0.9 }}>{ACCOUNT_DATA_SUPPORT_AFTER_VERIFY}</p>
        <p style={{ margin: "0 0 10px", opacity: 0.9 }}>{ACCOUNT_DATA_SUPPORT_SECURITY_NOTE}</p>
        <p style={{ margin: "0 0 10px", opacity: 0.9 }}>{ACCOUNT_DATA_SUPPORT_SAVED_REPORT_BOUNDARY}</p>
        <p style={{ margin: "0 0 10px", opacity: 0.9 }}>{ACCOUNT_DATA_SUPPORT_RETENTION_BOUNDARY}</p>
        <p style={{ margin: 0, opacity: 0.9 }}>{ACCOUNT_DATA_SUPPORT_CONTACT_NOTE}</p>
      </section>

      <section style={{ margin: "0 0 18px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>プランと購入済みレポート</h2>
        <p style={{ margin: "0 0 8px", opacity: 0.9 }}>
          保存版ライト、保存版FULL、FULL化の内容と価格は、料金ページで比較できます。
        </p>
        <p style={{ margin: "0 0 8px" }}>
          <Link href="/pricing">料金とプランを見る</Link>
          {" · "}
          <Link href="/dtr/lp">個人保存版の商品詳細を見る</Link>
        </p>
        <p style={{ margin: 0, opacity: 0.9 }}>
          購入済みの保存版は<Link href="/dtr">読み解きホーム</Link>から再開できます。
          返金・キャンセル条件は<Link href="/legal/refund">専用ページ</Link>をご確認ください。
        </p>
      </section>

      <section style={{ margin: "0 0 18px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>よくあるお問い合わせ</h2>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
          <li><strong>決済・請求</strong>：クレジットカードの請求不整合、未承認の課金、請求額の確認</li>
          <li><strong>閲覧できない</strong>：購入後にレポートが見つからない、反映が遅い</li>
          <li><strong>二重請求・明細の確認</strong>：同じ商品が複数回請求された、明細の照合</li>
          <li><strong>削除・保存期間</strong>：データの削除依頼、保存期間についての質問</li>
        </ul>
      </section>

      <section style={{ margin: "0 0 18px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>サービスの境界</h2>
        <p style={{ margin: "0 0 8px", opacity: 0.9 }}>
          {M55_USER_FACING_POSITIONING_COPY[0]}
        </p>
        <p style={{ margin: 0, opacity: 0.9 }}>
          {M55_LEGAL_SAFETY_BOUNDARIES.isNotJa.join(" ")}
        </p>
      </section>

      <section style={{ margin: "0 0 18px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>ご連絡時に必要な情報</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>決済日時</li>
          <li>メールアドレス</li>
          <li>発生している状況</li>
        </ul>
      </section>

      <p style={{ margin: 0 }}>
        <Link href="/home">ホームへ戻る</Link>
      </p>
    </div>
  );
}
