import Link from "next/link";
import {
  M55_PUBLIC_COMMERCIAL_TRUTH,
  M55_USER_FACING_POSITIONING_COPY,
} from "../../../lib/m55/analysisAuthorityReferenceModel";
import {
  ACCOUNT_DATA_PRIVACY_AFTER_VERIFY,
  ACCOUNT_DATA_PRIVACY_DEVICE_P1,
  ACCOUNT_DATA_PRIVACY_DEVICE_P2,
  ACCOUNT_DATA_PRIVACY_DEVICE_P3,
  ACCOUNT_DATA_PRIVACY_INTRO,
  ACCOUNT_DATA_PRIVACY_REQUEST_LINK_LABEL,
  ACCOUNT_DATA_PRIVACY_SAVED_REPORT_BOUNDARY,
  ACCOUNT_DATA_PRIVACY_SECTION_TITLE,
  ACCOUNT_DATA_REQUEST_HREF,
} from "../../../lib/m55/accountDataControlPublicCopy";

export const metadata = {
  title: "プライバシーポリシー | M55",
  description: "M55が扱うアカウント情報、生年月日、質問回答、決済確認情報、保存版データの利用目的と管理方法を説明します。",
  alternates: { canonical: "/legal/privacy" },
};

export default function PrivacyPage() {
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
        プライバシーポリシー
      </h1>

      <p style={{
        margin: "0 0 16px",
        opacity: 0.9,
      }}>
        M55 Project（以下「当社」）は、本サービスの提供にあたり取得する情報を、以下の目的の範囲で取り扱います。
      </p>

      <section style={{ margin: "0 0 16px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>取得する情報</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>アカウント情報（認証サービス経由で提供される識別子・メールアドレス等）</li>
          <li>プロフィールとしてお預かりする表示名（ニックネーム）および生年月日（日本の暦文化上の参照と読み取り生成のため）</li>
          <li>連絡先（メールアドレス等）</li>
          <li>
            決済の確認に必要な取引情報（
            {M55_PUBLIC_COMMERCIAL_TRUTH.commercial.dataHandlingJa}
            ）
          </li>
          <li>レポート生成や保存版に紐づく追加読み解きに関するユーザー入力（本人の回答による現在の感じ方・行動傾向の差分補正に必要な範囲）</li>
          <li>アクセスログ等の技術情報（不正対策・障害対応のため）</li>
        </ul>
        <p style={{ margin: "10px 0 0", fontSize: 13, opacity: 0.9 }}>
          購入者専用の追加読み解きに送信された内容は、該当レポートの範囲で処理し、サポート・安全運用のために必要な限度で保存・確認する場合があります。
        </p>
      </section>

      <section style={{ margin: "0 0 16px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>利用目的</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>本サービスの提供、本人確認、購入状況の確認</li>
          <li>生年月日・回答情報に基づく自己理解・関係性整理のための読み取り生成（医学的診断・心理検査・治療・カウンセリングではありません）</li>
          <li>サポート対応および不正利用の防止</li>
          <li>品質改善のための分析（個人を特定しない形で実施します）</li>
        </ul>
      </section>

      <section style={{ margin: "0 0 16px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>第三者提供・委託</h2>
        <p style={{ margin: 0 }}>
          当社は、決済処理やサイト運用等のために、必要な範囲で外部サービス事業者へ取り扱いを委託する場合があります。
        </p>
      </section>

      <section style={{ margin: "0 0 16px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>
          {ACCOUNT_DATA_PRIVACY_SECTION_TITLE}
        </h2>
        <p style={{ margin: "0 0 10px" }}>{ACCOUNT_DATA_PRIVACY_INTRO}</p>
        <p style={{ margin: "0 0 10px" }}>{ACCOUNT_DATA_PRIVACY_AFTER_VERIFY}</p>
        <p style={{ margin: "0 0 10px" }}>{ACCOUNT_DATA_PRIVACY_DEVICE_P1}</p>
        <p style={{ margin: "0 0 10px" }}>{ACCOUNT_DATA_PRIVACY_DEVICE_P2}</p>
        <p style={{ margin: "0 0 10px" }}>{ACCOUNT_DATA_PRIVACY_DEVICE_P3}</p>
        <p style={{ margin: "0 0 10px" }}>{ACCOUNT_DATA_PRIVACY_SAVED_REPORT_BOUNDARY}</p>
        <p style={{ margin: 0 }}>
          申請方法は、下記「開示・訂正・削除等」をご確認ください。
        </p>
      </section>

      <section style={{ margin: "0 0 16px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>開示・訂正・削除等</h2>
        <p style={{ margin: 0 }}>
          お問い合わせは{" "}
          <Link href={ACCOUNT_DATA_REQUEST_HREF}>サポート窓口（{ACCOUNT_DATA_PRIVACY_REQUEST_LINK_LABEL}）</Link>
          {" "}よりご連絡ください。
        </p>
      </section>

      <p style={{ margin: 0, fontSize: 12, opacity: 0.75 }}>
        {M55_USER_FACING_POSITIONING_COPY[2]}
        {" "}
        医療・法律・投資等の専門的助言ではありません。
      </p>
    </div>
  );
}
