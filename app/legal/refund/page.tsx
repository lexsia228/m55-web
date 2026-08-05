import Link from "next/link";

export const metadata = {
  title: "返金・キャンセル | M55",
};

export default function RefundPage() {
  return (
    <main style={{ maxWidth: "min(1320px, calc(100vw - 48px))", margin: "0 auto", padding: "8px clamp(20px, 3vw, 32px) clamp(48px, 7vw, 72px)", lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 12px" }}>返金・キャンセル</h1>

      <section style={{ margin: "0 0 18px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 8px" }}>提供形態</h2>
        <p style={{ margin: 0 }}>
          M55のプレミアムレポートは、決済完了後にウェブ上で閲覧できるデジタル提供です。物理配送はありません。
          ログイン状態、通信環境、決済の反映状況などにより、すぐに閲覧できない場合があります。そのときは、下記手続きに従ってご連絡ください。
        </p>
      </section>

      <section style={{ margin: "0 0 18px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 8px" }}>返金について</h2>
        <p style={{ margin: 0 }}>
          デジタルコンテンツの性質上、原則として返金は行いません。
          内容の好みの違いや、閲覧後の自己都合によるキャンセルは、原則として返金対象外です。
        </p>
      </section>

      <section style={{ margin: "0 0 18px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>例外的に対応するケース</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>誤請求・二重請求が確認できる場合</li>
          <li>決済完了後も長時間閲覧できないなど、提供が成立しない障害が確認できる場合</li>
          <li>その他、当社が個別に必要と判断した場合</li>
        </ul>
      </section>

      <section style={{ margin: "0 0 18px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>手続き</h2>
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          <li>
            <Link href="/support">サポート窓口</Link>
            からご連絡ください（状況確認のため、決済日時などを伺うことがあります）。
          </li>
          <li>内容確認のうえ、対応可否と手続きをご案内します。</li>
          <li>通常、2〜5営業日程度でご返信するよう努めております（状況により前後します）。</li>
        </ol>
      </section>
    </main>
  );
}
