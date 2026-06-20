import Link from "next/link";
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
        <p style={{ margin: "0 0 6px", opacity: 0.9 }}>
          購入・利用・請求・返金に関するお問い合わせは{" "}
          <a href={M55_PUBLIC_SUPPORT_MAILTO}>{M55_PUBLIC_SUPPORT_EMAIL}</a>
          {" "}までご連絡ください。
        </p>
        <p style={{ margin: 0, opacity: 0.9 }}>
          事業者情報は「<Link href="/legal/tokushoho">特定商取引法に基づく表記</Link>」に記載しています。
          ご連絡前に、「<Link href="/legal/refund">返金・キャンセル</Link>」もご確認ください。
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
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>保存版のプランの違い</h2>
        <p style={{ margin: "0 0 8px", opacity: 0.9 }}>
          保存版ライトと保存版FULLでは、4章の保存版の内容は共通です。
        </p>
        <p style={{ margin: "0 0 8px", opacity: 0.9 }}>
          違いは相談返書の件数です。
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
          <li><strong>保存版ライト</strong>：相談返書1件</li>
          <li><strong>保存版FULL</strong>：相談返書合計5件</li>
        </ul>
      </section>

      <section style={{ margin: "0 0 18px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>ライトからFULL化</h2>
        <p style={{ margin: "0 0 8px", opacity: 0.9 }}>
          保存版ライトの購入後は、¥600でFULL化できます。
        </p>
        <p style={{ margin: 0, opacity: 0.9 }}>
          FULL化後は、相談返書を合計5件利用できます。
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
              生年月日を手がかりに、10通りの資質と5つの解析軸から、本質・今日・今週といった輪郭を文章で整理します。吉凶の断定や順位づけではなく、自己観測のための読み取りです。
            </p>
          </article>
          <article>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>無料でどこまで見られますか</h3>
            <p style={{ margin: 0, opacity: 0.9 }}>
              プロフィール保存後、本質・今日・今週の見取り図と、5つの解析軸のバランスを無料で読めます。より詳しい内容や相談返書は、有料の保存版の対象です。
            </p>
          </article>
          <article>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>有料の保存版で見られる内容は？</h3>
            <p style={{ margin: 0, opacity: 0.9 }}>
              無料面と同じ土台の本質を、4章の保存版としてウェブ上で閲覧できる形に整理したものです。物理の発送はありません。相談返書の件数はプランにより異なります（詳細は商品ページと特商法表記をご確認ください）。
            </p>
          </article>
          <article>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>相談返書では何ができますか</h3>
            <p style={{ margin: 0, opacity: 0.9 }}>
              保存版を購入した方だけが利用できる、保存版に紐づく一つの相談テーマへの返書です。会話を継続する形式ではありません。レポートの内容に沿った整理を目的としています。
            </p>
          </article>
          <article>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>ログインできない場合</h3>
            <p style={{ margin: 0, opacity: 0.9 }}>
              登録に使ったメールアドレスやログイン方法（メール/Google 等）をご確認ください。解決しない場合は
              <Link href="/legal/tokushoho">特定商取引法に基づく表記</Link>
              の連絡先、または本ページ下部のご連絡についてからお問い合わせください。購入済みでレポートが見られない場合は、決済日時と登録メールを添えると確認しやすくなります。
            </p>
          </article>
          <article>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>入力した情報は何に使われますか</h3>
            <p style={{ margin: 0, opacity: 0.9 }}>
              ニックネーム・生年月日などのプロフィールは読み取りの生成に使います。決済やアカウントに関する情報は提供・決済のために必要な範囲で取り扱います。詳細はプライバシーポリシーをご覧ください。
            </p>
          </article>
          <article>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>同じ入力で結果は変わりますか</h3>
            <p style={{ margin: 0, opacity: 0.9 }}>
              同じ入力を同じルールで読む限り、骨組みはぶれにくい設計です。日付が変わる「今日」「今週」など、時間に応じて更新される部分は自然に変わります。
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
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>相談返書について</h2>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
          <li>
            <strong>相談返書とは何ですか？</strong>
            ：保存版に紐づく一つの相談テーマへの返書です。会話を継続する形式ではありません。
          </li>
          <li>
            <strong>何件まで利用できますか？</strong>
            ：保存版ライトは相談返書1件、保存版FULLは相談返書合計5件です。ライト購入後にFULL化した場合も、合計5件です。
          </li>
          <li>
            <strong>どこで利用できますか？</strong>
            ：保存版を購入した方は、保存版の閲覧ページ内から利用できます。
          </li>
          <li>
            <strong>送信がブロックされた場合、件数は消費されますか？</strong>
            ：危機的・不適切と判断された内容はブロックされますが、その場合は相談返書の件数を消費しません。
          </li>
        </ul>
      </section>

      <section style={{ margin: "0 0 18px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>ご連絡について</h2>
        <p style={{ margin: "0 0 6px", opacity: 0.9 }}>お問い合わせについて</p>
        <p style={{ margin: "0 0 6px", opacity: 0.9 }}>
          購入、利用、返金に関するお問い合わせは{" "}
          <a href={M55_PUBLIC_SUPPORT_MAILTO}>{M55_PUBLIC_SUPPORT_EMAIL}</a>
          {" "}までご連絡ください。
        </p>
        <p style={{ margin: 0, opacity: 0.9 }}>
          返金・閲覧不具合に関するご連絡も同じ窓口で受け付けています。
          ご連絡前に、「<Link href="/legal/refund">返金・キャンセル</Link>」のページもご確認ください。
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
        <Link href="/">トップページへ戻る</Link>
      </p>
    </main>
  );
}
