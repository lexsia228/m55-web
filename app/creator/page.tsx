import Link from 'next/link';

export const metadata = {
  title: 'Creator / Partner | M55',
  robots: { index: false, follow: false },
};

export default function CreatorRecruitmentPage() {
  return <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 20px 80px', lineHeight: 1.8 }}>
    <h1>M55 Creator / Partner</h1>
    <p>通常のM55利用とは分かれた、個別審査制のCreator / Partnerプログラムです。M55を利用するだけで登録されるものではなく、誰でも自動参加できるオープンアクセス型ではありません。</p>
    <h2>参加までの流れ</h2>
    <ol>
      <li>ご自身の公開メディアと発信内容を添えて申請します。</li>
      <li>M55が公開メディアの運営確認、継続的な活動、真正な反応と発信品質、内容との適合、PR・広告表示への対応を人の目で審査します。</li>
      <li>承認後も、紹介計測と報酬機能の開始は別途ご案内します。</li>
    </ol>
    <h2>申請の目安</h2>
    <p>満18歳以上・日本国内居住で、現在活動中の公開メディアを少なくとも一つご自身で運営している方が対象です。一律のフォロワー最低数は設けず、フォロワー数だけで承認しません。</p>
    <p>購入した反応や偽装された反応、長期に活動のないアカウント、誤認を招く広告、PR・広告表示に対応できない発信、M55の安全な紹介方針との大きな不一致は、承認できない場合があります。</p>
    <p>通常は3〜5営業日を目安に審査します。確認が必要な場合は追加でお時間をいただくことがあります。申請やM55からのスカウトは承認を保証しません。</p>
    <p><Link href="/legal/creator-affiliate-terms">Creator Affiliate 規約を確認</Link></p>
    <p><Link href="/creator/apply">Creatorとして申請する</Link> · <Link href="/creator/portal">申請状況を見る</Link></p>
    <p>このページの公開は、紹介計測・報酬支払の開始を意味しません。お問い合わせは<Link href="/support">サポート</Link>へ。</p>
  </main>;
}
