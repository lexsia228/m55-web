import Link from "next/link";

export const metadata = {
  title: "Creator Affiliate 規約 | M55",
};

const CREATOR_AFFILIATE_TERMS_VERSION = "2026-09-13-v1";

const mainStyle = {
  maxWidth: "min(1320px, calc(100vw - 48px))",
  margin: "0 auto",
  padding: "8px clamp(20px, 3vw, 32px) clamp(48px, 7vw, 72px)",
  lineHeight: 1.7,
} as const;

const h1Style = {
  fontSize: 22,
  fontWeight: 600,
  margin: "0 0 12px",
} as const;

const sectionStyle = {
  margin: "0 0 16px",
} as const;

const h2Style = {
  fontSize: 14,
  fontWeight: 700,
  margin: "0 0 8px",
} as const;

const pStyle = {
  margin: "0 0 10px",
  opacity: 0.9,
} as const;

const ulStyle = {
  margin: 0,
  paddingLeft: 18,
} as const;

export default function CreatorAffiliateTermsPage() {
  return (
    <main style={mainStyle}>
      <h1 style={h1Style}>M55 Creator Affiliate 規約</h1>

      <p style={{ ...pStyle, fontSize: 12, opacity: 0.75 }}>
        契約バージョン: {CREATOR_AFFILIATE_TERMS_VERSION} · 制定日: 2026年9月13日
      </p>

      <p style={pStyle}>
        本規約は、M55 Project（以下「当社」）が提供する Creator Affiliate プログラム（以下「本プログラム」）の参加条件を定めます。
        本規約は、当社の一般ユーザー向け
        <Link href="/legal/terms">利用規約</Link>
        とは別の、承認済み Creator 向けの契約です。
      </p>

      <section style={sectionStyle}>
        <h2 style={h2Style}>第1条（プログラムの性質）</h2>
        <ul style={ulStyle}>
          <li>本プログラムは、当社が承認した Creator（以下「Creator」）のみが参加できます。</li>
          <li>Creator は、当社が提供する専用 URL 等による任意の紹介（URL-only voluntary referral）のみを行います。</li>
          <li>投稿スケジュール、成果物、投稿回数、専属契約、紹介ノルマ等の義務はありません。</li>
          <li>Creator の募集・下位組織に対する報酬はありません（単層・非 MLM）。</li>
          <li>参加費、必須購入、必須在庫保有等はありません。</li>
          <li>
            スポンサード Creator、成果物の提出を前提とする業務委託、または別種の雇用・請負関係は、本 Affiliate 契約の対象外です。
            当該関係には、別途の区分・契約が必要です。
          </li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>第2条（参加資格）</h2>
        <ul style={ulStyle}>
          <li>満18歳以上であること。</li>
          <li>日本国内に居住し、日本円（JPY）での精算を受けられること。</li>
          <li>日本国内の金融機関口座へ振込を受けられること。</li>
          <li>当社による Creator 承認を得ていること。</li>
          <li>非居住者向けの現金払いは、本プログラム v1 では提供しません。</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>第3条（経済条件の同一性・Founding Creator 料率）</h2>
        <p style={pStyle}>
          各 Creator の初回最終承認日時（FIRST_FINAL_CREATOR_APPROVED_AT）を起点とし、以下の半開区間で報酬率が適用されます。
        </p>
        <ul style={ulStyle}>
          <li>
            50%：承認日時以上かつ承認日時から180日未満の期間に、対象購入の支払成功が発生した場合
          </li>
          <li>
            40%：承認日時から180日以上かつ365日未満の期間に、対象購入の支払成功が発生した場合
          </li>
          <li>
            30%：承認日時から365日以上経過後に、対象購入の支払成功が発生した場合
          </li>
        </ul>
        <p style={pStyle}>
          上記 50% 料率は、同一 Creator 経済条件（economic identity）につき一度のみ適用されます。
          再申請、別メールアドレス、別 SNS、別紹介トークン、別 Stripe 口座、停止・再開等により、料率期間をリセットすることはありません。
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>第4条（対象商品）</h2>
        <ul style={ulStyle}>
          <li>プレミアムレポート ライト</li>
          <li>プレミアムレポート フル</li>
          <li>追加読み解きは、Affiliate v1 の報酬対象外です。</li>
          <li>既存の無料ユーザーが、初めて対象の有料商品を購入した場合、報酬が発生し得ます。</li>
          <li>過去の有料購入に対する遡及的な報酬は発生しません。</li>
          <li>アップグレード等は、実際に新たに回収された増分金額のみが対象です。</li>
          <li>ローンチ時点では、紹介による顧客割引は提供しません。</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>第5条（アトリビューション）</h2>
        <ul style={ulStyle}>
          <li>アトリビューション期間は 30 日です。</li>
          <li>方式は、最後の有効な直接 Creator 接触（LAST_QUALIFIED_DIRECT_CREATOR_TOUCH）です。</li>
          <li>1 件の購入に対し、最大 1 名の Creator のみが報酬対象となります。</li>
          <li>遡及的なアトリビューションの付与・変更は行いません。</li>
          <li>古いチェックアウト状態の固定により、無期限のアトリビューションが生じることはありません。</li>
          <li>同時接触等のタイブレークは、当社システムの決定を正とします。</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>第6条（報酬算定基準・発生時点）</h2>
        <ul style={ulStyle}>
          <li>
            算定の起点は、実際に当社が回収した顧客支払金額（割引後）です。割引を二重に控除しません。
          </li>
          <li>報酬算定基礎から除外する税額相当分、および直ちに報酬対象外となる金額は、算定対象から除外します。</li>
          <li>報酬額は、適用料率を適用した整数円（JPY）です。</li>
          <li>
            料率適用の正準時点は、当該 PaymentIntent に対する最初の正規 Stripe
            <code>payment_intent.succeeded</code>
            イベントの Event.created です。Webhook 受信時刻や内部処理時刻を、料率の権威として表示・契約上の基準とすることはありません。
          </li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>第7条（審査・保留・取消・調整）</h2>
        <ul style={ulStyle}>
          <li>標準審査期間は 30 日です。</li>
          <li>不正、資格、アトリビューション、返金、チャージバック等の確認を行います。</li>
          <li>報酬は保留、取消、または調整され得ます。</li>
          <li>台帳上の修正は追記方式であり、過去の事実を黙って書き換えません。</li>
          <li>返金・チャージバック後は、経済差分のみを再計算し、二重控除は行いません。</li>
          <li>報酬の発生・支払いを保証するものではありません。</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>第8条（遅延チャージバック・回収）</h2>
        <ul style={ulStyle}>
          <li>未払いの保留・支払可能残高からの相殺が行われ得ます。</li>
          <li>将来の報酬からの相殺が行われ得ます。</li>
          <li>Stripe 等の送金 reversal が利用可能な場合は、それを用い得ます。</li>
          <li>回収不能残高は、Creator への未収金・支払保留の対象となり得ます。</li>
          <li>二重回収は行いません。</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>第9条（標準支払）</h2>
        <ul style={ulStyle}>
          <li>支払申請は不要です。標準スケジュールに従い自動処理されます。</li>
          <li>標準支払閾値は 20,000 円（JPY）です。</li>
          <li>月次で処理します。</li>
          <li>締切は、直前の暦月末日 23:59:59（日本標準時）です。</li>
          <li>支払期日は、締切月の翌月 15 日です。</li>
          <li>期日が金融機関の休業日の場合は、規約上あらかじめ翌営業日へ移動することに合意します。</li>
          <li>有効な相殺は、支払手数料・源泉等の前に適用されます。</li>
          <li>閾値未満の残高は失効せず、繰越されます。</li>
          <li>法令上の支払期限が適用される場合は、経済上の閾値より優先します。</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>第10条（テール精算）</h2>
        <p style={pStyle}>
          最古の未精算 PAYABLE から 180 日経過した場合、テール精算が行われ得ます。
          これは Founding Creator の 180 日料率区間とは別の精算ルールです。
          微小残高の無期限繰越を防ぐことを目的とします。
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>第11条（支払処理手数料）</h2>
        <p style={pStyle}>
          精算対象支払可能額（SETTLEMENT_PAYABLE）に対し、以下の式で算出する標準支払処理手数料（税込）を、別途のサービス提供の対価として Creator が負担します。
        </p>
        <ul style={ulStyle}>
          <li>精算対象額 20,000 円のときの基本手数料は 770 円です。</li>
          <li>20,000 円超過分に 55 bps（0.55%）を適用し、10 円単位で切り上げます。</li>
          <li>
            計算式（整数演算）：
            excess = max(SETTLEMENT_PAYABLE − 20,000, 0) · increment_tens = floor((excess × 55 + 99,999) / 100,000) ·
            手数料 = 770 + 10 × increment_tens
          </li>
          <li>例：20,000 円 → 770 円、30,000 円 → 830 円、50,000 円 → 940 円、100,000 円 → 1,210 円</li>
          <li>テール精算時の実効手数料は、標準手数料と精算対象額の 25%（切り捨て）のいずれか低い方です。</li>
          <li>手数料は税込の別サービス対価であり、Creator は開示された契約上の相殺に同意します。</li>
          <li>マイナス支払い、手数料のみによる失効は行いません。</li>
          <li>1 回の経済上の支払指示（再試行チェーンを含む）につき、手数料は 1 回です。</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>第12条（税務・源泉）</h2>
        <ul style={ulStyle}>
          <li>表示・契約上の報酬額は、税込の契約総額です。自動的に「+10%」等の追加はありません。</li>
          <li>
            現時点の当社運用（日本国内居住、URL-only Affiliate、給与支払者に該当しない事業者）において、
            通常の日本居住 Creator へのデフォルト源泉税率は 0 です。
          </li>
          <li>支払性質、事業者事実、非居住者化等が変わった場合、当社は支払前に再区分し得ます。</li>
          <li>Creator は、自身の申告・記帳等の義務を負います。申告不要等を意味するものではありません。</li>
          <li>行政機関・専門家による事前承認を得ている旨を表明するものではありません。</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>第13条（広告表示・禁止行為）</h2>
        <p style={pStyle}>
          Creator は、紹介に際し、状況に応じて「広告」「PR」「アフィリエイト」等の表示を明確に行うものとします。
        </p>
        <ul style={ulStyle}>
          <li>ステルスマーケティング</li>
          <li>自分自身を紹介先とする行為（self-referral）・関連者による不正利用</li>
          <li>当社ポリシーで禁止するブランドキーワード有料検索</li>
          <li>クッキー・スタッフィング</li>
          <li>クーポン乗っ取り</li>
          <li>強制リダイレクト</li>
          <li>虚偽・誤解を招く表示、収入保証の表明</li>
          <li>不正、重複する本人情報・決済を用いた濫用</li>
          <li>募集・下位組織に対する報酬行為</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>第14条（プライバシー・データ）</h2>
        <ul style={ulStyle}>
          <li>Creator は、顧客のカード情報等を取得・要求してはなりません。</li>
          <li>Creator 個人情報は必要最小限とします。</li>
          <li>顧客の機微な分析回答・非公開コンテンツを Creator に開示しません。</li>
          <li>
            当社は、本人確認、支払・精算、アトリビューション、コンプライアンス、税務・会計に必要なデータを、
            本プログラム運営のために利用し得ます。
          </li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>第15条（停止・終了）</h2>
        <ul style={ulStyle}>
          <li>不正、濫用、法令・決済事業者・コンプライアンス上のリスクがある場合、紹介・支払機能を停止し得ます。</li>
          <li>将来の規約変更のみを理由に、既に発生した正当な報酬を黙って失効させるものではありません。</li>
          <li>契約に基づく取消・相殺は引き続き行われ得ます。</li>
          <li>重大な濫用の場合、契約終了および回収を行い得ます。</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>第16条（規約変更・再同意）</h2>
        <ul style={ulStyle}>
          <li>重要な変更は、変更後の条件で新たな成果を得る前に、再同意が必要です。</li>
          <li>過去に発生した報酬を、後から変更した規約で再価格設定することはありません。</li>
          <li>バージョン・効力発生日の管理モデルを前提とします（本掲載のみでは同意記録は行いません）。</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>第17条（電子取引に関する表示）</h2>
        <p style={pStyle}>
          本契約が適用される電子取引上の表示義務の対象となる場合でも、当社は本規約上、料率・算定方式、支払スケジュール・期日規則、手数料算定式をあらかじめ示します。
          個別取引の確定額・確定日が未確定の場合は、その理由と確定方法を示し、確定後は不当に遅滞することなく、当該取引に紐づく補充の電子通知を行います。
          現時点の当社運用が「特定業務委託事業者」に該当し、フリーランス法第5条の適用対象であることを前提とするものではありません。
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>第18条（問い合わせ・関連ページ）</h2>
        <ul style={ulStyle}>
          <li>
            お問い合わせ：
            <Link href="/support">サポート窓口</Link>
          </li>
          <li>
            プライバシー：
            <Link href="/legal/privacy">プライバシーポリシー</Link>
          </li>
          <li>
            特定商取引法に基づく表記：
            <Link href="/legal/tokushoho">特定商取引法に基づく表記</Link>
          </li>
          <li>
            返金・キャンセル：
            <Link href="/legal/refund">返金・キャンセル</Link>
          </li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>第19条（公開と開始の関係）</h2>
        <p style={pStyle}>
          本規約の掲載自体が、Creator 申請の受付開始、本プログラムの一般公開、または報酬支払の開始を意味するものではありません。
          参加可否・オンボーディング・ローンチは、当社の別途の承認および運用ゲートにより制御されます。
        </p>
      </section>

      <p style={{ margin: 0, fontSize: 12, opacity: 0.75 }}>
        契約バージョン {CREATOR_AFFILIATE_TERMS_VERSION} · M55 Project
      </p>
    </main>
  );
}
