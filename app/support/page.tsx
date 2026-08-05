import Link from "next/link";
import {
  M55_LEGAL_SAFETY_BOUNDARIES,
  M55_USER_FACING_POSITIONING_COPY,
} from "../../lib/m55/analysisAuthorityReferenceModel";
import { TOP_FREE_ENTRY_PUBLIC_COPY } from "../../lib/m55/topFreeEntryPublicCopy";
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
};

export default function SupportPage() {
  return (
    <main style={{ maxWidth: "min(1320px, calc(100vw - 48px))", margin: "0 auto", padding: "8px clamp(20px, 3vw, 32px) clamp(48px, 7vw, 72px)", lineHeight: 1.7 }}>
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
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>プレミアムレポートのプランの違い</h2>
        <p style={{ margin: "0 0 8px", opacity: 0.9 }}>
          M55 プレミアムレポート ライトとM55 プレミアムレポート フルでは、プレミアムレポートの内容は共通です。違いは追加読み解きの件数と、選び方です。
        </p>
        <ul style={{ margin: "0 0 10px", paddingLeft: 18, lineHeight: 1.8 }}>
          <li><strong>M55 プレミアムレポート ライト（¥1,000）</strong>：まずプレミアムレポートを読み、輪郭を整理したい方向け。追加読み解き1件。</li>
          <li><strong>M55 プレミアムレポート フル（¥1,480）</strong>：プレミアムレポートを読んだあと、追加読み解きで複数回深めたい方向け。追加読み解き合計5件。</li>
        </ul>
        <p style={{ margin: 0, opacity: 0.9 }}>
          ライトは追加読み解き1件、FULLは合計5件です。プレミアムレポートは共通です。ライト購入後でも、必要になったらFULL化できます。
        </p>
      </section>

      <section style={{ margin: "0 0 18px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>ライトからFULL化</h2>
        <p style={{ margin: "0 0 8px", opacity: 0.9 }}>
          M55 プレミアムレポート ライトを購入済みの方は、¥600でFULL化できます。
        </p>
        <p style={{ margin: 0, opacity: 0.9 }}>
          FULL化後は、追加読み解きを合計5件利用できます。
        </p>
      </section>

      <section style={{ margin: "0 0 18px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>M55の説明</h2>
        {M55_USER_FACING_POSITIONING_COPY.map((paragraph) => (
          <p key={paragraph.slice(0, 24)} style={{ margin: "0 0 10px", opacity: 0.9 }}>
            {paragraph}
          </p>
        ))}
        <p style={{ margin: 0, opacity: 0.9 }}>
          {M55_LEGAL_SAFETY_BOUNDARIES.isNotJa.join(" ")}
        </p>
      </section>

      <section style={{ margin: "0 0 22px" }} aria-labelledby="m55-faq-service">
        <h2 id="m55-faq-service" style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px" }}>
          よくある質問（M55について）
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <article>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>M55は何を見るのですか</h3>
            <p style={{ margin: 0, opacity: 0.9 }}>
              生年月日から得られる日本の暦文化上の手がかりと、本人の回答による現在の感じ方を組み合わせて、自己理解と関係性の距離を読み解く参考情報です。
              {" "}
              {TOP_FREE_ENTRY_PUBLIC_COPY.home.tierFreeJa}
              {" "}
              吉凶の断定や順位づけではなく、自己観測のための読み取りです。
            </p>
          </article>
          <article>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>無料でどこまで見られますか</h3>
            <p style={{ margin: 0, opacity: 0.9 }}>
              プロフィール保存後、無料の見取り図を読めます。より詳しい読み返し用のプレミアムレポートと追加読み解きは、有料のプレミアムレポートの対象です。
            </p>
          </article>
          <article>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>有料のプレミアムレポートで見られる内容は？</h3>
            <p style={{ margin: 0, opacity: 0.9 }}>
              無料面と同じ土台の本質を、購入時点の入力内容をもとにプレミアムレポートとしてウェブ上で読み返せる形に整理したものです。物理の発送はありません。追加読み解きはプランにより1件または合計5件です。
            </p>
          </article>
          <article>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>追加読み解きでは何ができますか</h3>
            <p style={{ margin: 0, opacity: 0.9 }}>
              プレミアムレポートを購入した方だけが利用できる、プレミアムレポートに紐づく一つの読み解きテーマを整理する追加読み解きです。件数内で一テーマずつ整理できます。会話を継続する形式ではありません。
            </p>
          </article>
          <article>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>ログインできない場合</h3>
            <p style={{ margin: 0, opacity: 0.9 }}>
              登録に使ったメールアドレスやログイン方法（メール/Google 等）をご確認ください。解決しない場合は、本ページ上部の問い合わせ先へご連絡ください。購入済みでレポートが見られない場合は、決済日時と登録メールを添えると確認しやすくなります。
            </p>
          </article>
          <article>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>入力した情報は何に使われますか</h3>
            <p style={{ margin: 0, opacity: 0.9 }}>
              ニックネーム・生年月日などのプロフィールは、自己理解・関係性整理のための読み取り生成に使います。
              追加読み解きでは、本人の回答による現在の感じ方・行動傾向の差分を補正するために、選択したテーマと質問への回答を使います。
              決済やアカウントに関する情報は提供・決済のために必要な範囲で取り扱います。詳細はプライバシーポリシーをご覧ください。
            </p>
          </article>
          <article>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>同じ入力で結果は変わりますか</h3>
            <p style={{ margin: 0, opacity: 0.9 }}>
              同じ入力を同じルールで読む限り、骨組みはぶれにくい設計です。無料の見取り図のうち、日付に応じて更新される部分は自然に変わります。プレミアムレポートは購入時点の内容をもとにした読み返し用レポートです。
            </p>
          </article>
        </div>
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
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>追加読み解きについて</h2>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
          <li>
            <strong>追加読み解きとは何ですか？</strong>
            ：プレミアムレポートに紐づく一つの読み解きテーマを整理する追加読み解きです。件数内での利用であり、会話を継続する形式ではありません。
          </li>
          <li>
            <strong>何件まで利用できますか？</strong>
            ：M55 プレミアムレポート ライトは追加読み解き1件、M55 プレミアムレポート フルは追加読み解き合計5件です。ライト購入後にFULL化した場合も、合計5件です。
          </li>
          <li>
            <strong>どこで利用できますか？</strong>
            ：プレミアムレポートを購入した方は、プレミアムレポートの閲覧ページ内から利用できます。
          </li>
          <li>
            <strong>送信がブロックされた場合、件数は消費されますか？</strong>
            ：危機的・不適切と判断された内容はブロックされますが、その場合は追加読み解きの件数を消費しません。
          </li>
        </ul>
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
        <Link href="/">トップページへ戻る</Link>
      </p>
    </main>
  );
}
