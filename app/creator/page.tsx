import Link from 'next/link';
import styles from './creator.module.css';

export const metadata = {
  title: 'Creator / Partner | M55',
  robots: { index: false, follow: false },
};

const STEPS = [
  { number: '01', title: '申請', body: '公開メディアと発信内容を入力して申請します。' },
  { number: '02', title: '審査', body: '申請内容を確認します。必要に応じて追加情報をお願いする場合があります。' },
  {
    number: '03',
    title: '承認・開始準備',
    body: '承認後、紹介機能の利用開始に必要な手続きと開始時期を別途ご案内します。',
  },
] as const;

const TRUST_FACTS = ['参加費なし', '必須購入なし', '投稿ノルマなし', '一律のフォロワー最低数なし'] as const;

const TERMS_SUMMARY = [
  {
    title: '対象商品',
    body: 'M55 プレミアムレポート ライト\n¥1,000\n\nM55 プレミアムレポート フル\n¥1,480\n\nいずれも1回購入\n\nM55 プレミアムレポートは、無料面と同じ土台をもとに、購入時点の入力内容を読み返しやすく整理したWeb上のレポートです。',
  },
  { title: 'Founding Creator 報酬率', body: '承認後180日未満 50%\n180日以上365日未満 40%\n365日以上 30%' },
  {
    title: '紹介の判定',
    body: '紹介から30日間が対象です。\n期間内に複数のCreator紹介がある場合は、\n最後の有効な直接紹介を基準にします。',
  },
  {
    title: '支払スケジュール',
    body: '支払可能残高20,000円以上を月次処理\n原則として締切月の翌月15日\n\n支払申請は不要です\n20,000円未満の残高は繰り越され、失効しません\n\n支払処理手数料があります。\n20,000円を支払う場合の標準手数料は770円です。\n金額に応じた算定方法はCreator Affiliate規約をご確認ください。',
  },
] as const;

const PRE_REFERRAL_LINKS = [
  { label: 'M55の読み解き方', href: '/how-m55-works' },
  { label: '購入後のレポート読み返し', href: '/dtr/core' },
  { label: '返金・キャンセル', href: '/legal/refund' },
  { label: 'プライバシーポリシー', href: '/legal/privacy' },
  { label: 'Creator Affiliate規約', href: '/legal/creator-affiliate-terms' },
  { label: 'サポート', href: '/support' },
] as const;

const FAQ = [
  {
    q: 'フォロワー数の最低条件はありますか？',
    a: '一律の最低数は設けていません。フォロワー数だけで参加可否を判断しません。',
  },
  {
    q: 'M55から招待された場合は承認済みですか？',
    a: 'いいえ。招待は申請のご案内であり、参加承認を保証するものではありません。',
  },
  {
    q: '承認後すぐに紹介・報酬機能を使えますか？',
    a: '紹介計測・報酬機能を利用できる段階になった時点で別途ご案内します。',
  },
  {
    q: '参加費やM55商品の購入は必要ですか？',
    a: '参加費、必須購入、投稿ノルマはありません。',
  },
  {
    q: '紹介するときにPR・広告表示は必要ですか？',
    a: 'はい。紹介時は、利用者が気づきやすい位置に「PR」「広告」「アフィリエイト」等を明示してください。',
  },
  {
    q: '紹介したユーザーの個人情報を見ることはできますか？',
    a: 'Creatorに、紹介先ユーザーのカード情報やM55の非公開・機微な分析内容を開示することはありません。',
  },
] as const;

export default function CreatorRecruitmentPage() {
  return (
    <div className={styles.page}>
      <section className={styles.section}>
        <h1 className={styles.pageTitle}>M55 Creator / Partner</h1>
        <p className={styles.lead}>
          M55を紹介するCreator向けの、承認制Creator Affiliateプログラムです。
        </p>
        <p className={styles.lead}>
          申請内容と公開メディアを確認し、当社所定の基準に基づき参加可否を審査します。
        </p>
        <p className={styles.lead}>
          M55は、自分や関係性を決めつけずに読み解くための参考情報を提供するWebサービスです。
        </p>
        <p className={styles.lead}>
          Creator Affiliateの対象は、Web上で提供する「M55 プレミアムレポート ライト」と「M55 プレミアムレポート フル」です。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>参加までの3ステップ</h2>
        <div className={styles.stepFlow}>
          {STEPS.map((step) => (
            <article key={step.number} className={styles.stepCard}>
              <span className={styles.stepNumber}>{step.number}</span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepBody}>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>参加前に確認できること</h2>
        <div className={styles.factGrid}>
          {TRUST_FACTS.map((fact) => (
            <div key={fact} className={styles.factChip}>{fact}</div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>開始時に適用される現行規約上の主な条件</h2>
        <div className={styles.termsGrid}>
          {TERMS_SUMMARY.map((item) => (
            <article key={item.title} className={styles.termsCard}>
              <h3 className={styles.termsCardTitle}>{item.title}</h3>
              <p className={styles.termsCardBody}>{item.body}</p>
            </article>
          ))}
        </div>
        <div className={styles.trustDisclosure}>
          <p>
            報酬率は、規約で定める報酬算定対象額に適用されます。
            表示価格へ単純に掛けた金額を保証するものではありません。
          </p>
          <p>
            報酬率は収入を保証するものではありません。
            実際の報酬は、対象購入、審査、返金・チャージバック、取消・調整等の影響を受けます。
          </p>
        </div>
        <div className={styles.callout}>
          <p className={styles.calloutTitle}>報酬の確定</p>
          <p>
            対象購入には標準30日間の確認期間があります。
            返金、チャージバック、紹介判定、規約違反等の確認により、
            報酬が保留・取消・調整される場合があります。
          </p>
        </div>
        <p className={styles.termsNote}>
          詳細な算定条件、保留・取消・調整、支払処理手数料等は
          <Link href="/legal/creator-affiliate-terms" className={styles.tertiaryLink}>Creator Affiliate規約</Link>
          をご確認ください。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>申請の目安</h2>
        <p className={styles.lead}>
          満18歳以上・日本国内居住で、現在活動中の公開メディアを少なくとも一つご自身で運営している方が対象です。
          一律のフォロワー最低数は設けず、フォロワー数だけで参加可否を判断しません。
        </p>
        <p className={styles.lead}>
          PR・広告表示に対応でき、M55の紹介方針に沿った発信であることなどを確認します。
          当社所定の基準に基づき審査します。確認のため、追加情報の提出をお願いする場合があります。
        </p>
        <p className={styles.lead}>
          報酬の受け取りには、日本国内の金融機関口座で日本円の精算を受けられることが必要です。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>紹介前に確認する</h2>
        <nav className={styles.preReferralLinks} aria-label="紹介前に確認する">
          {PRE_REFERRAL_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className={styles.tertiaryLink}>
              {item.label}
            </Link>
          ))}
        </nav>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>よくある質問</h2>
        <div className={styles.faqList}>
          {FAQ.map((item) => (
            <article key={item.q} className={styles.faqItem}>
              <h3 className={styles.faqQuestion}>Q. {item.q}</h3>
              <p className={styles.faqAnswer}>A. {item.a}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.ctaStack}>
          <Link href="/creator/apply" className={styles.primaryCta}>Creatorとして申請する</Link>
          <Link href="/creator/portal" className={styles.secondaryCta}>申請状況を見る</Link>
        </div>
        <p className={styles.footerLinks}>
          <Link href="/legal/creator-affiliate-terms" className={styles.tertiaryLink}>Creator Affiliate利用規約</Link>
        </p>
        <p className={styles.disclaimer}>
          このページの公開は、紹介計測・報酬発生・報酬支払の開始を意味しません。
          お問い合わせは<Link href="/support" className={styles.tertiaryLink}>サポート</Link>へ。
        </p>
      </section>
    </div>
  );
}
