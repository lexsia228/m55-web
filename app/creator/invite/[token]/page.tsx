import Link from 'next/link';
import { findValidScoutInvite } from '../../../../lib/m55/creatorDistribution/invite';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Creator招待 | M55',
  robots: { index: false, follow: false },
  other: { referrer: 'no-referrer' },
};
export default async function CreatorInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let valid = false;
  try { valid = Boolean(await findValidScoutInvite(token)); } catch { valid = false; }
  return <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 20px 80px', lineHeight: 1.8 }}>
    <h1>M55 Creator 招待</h1>
    {valid ? <>
      <p>M55からの招待は、Creator Affiliateへの申請をご案内するものです。招待を受けたことにより、参加承認または報酬の発生が保証されるものではありません。</p>
      <p><Link href={`/creator/apply?invite=${encodeURIComponent(token)}`}>申請へ進む</Link></p>
    </> : <p>この招待は利用できません。有効期限・利用済み・取り消しをご確認ください。</p>}
    <p><Link href="/creator">募集ページへ</Link> · <Link href="/support">サポート</Link></p>
  </div>;
}
