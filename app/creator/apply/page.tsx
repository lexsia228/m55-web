import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { SignInButton } from '@clerk/nextjs';
import { CreatorApplicationForm } from '../_components/CreatorApplicationForm';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Creator申請 | M55',
  robots: { index: false, follow: false },
  other: { referrer: 'no-referrer' },
};
export default async function CreatorApplyPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const { userId } = await auth();
  const { invite } = await searchParams;
  return <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 20px 80px', lineHeight: 1.8 }}>
    <h1>Creator Affiliate 申請</h1>
    <p>審査は人の目で行います。スカウト招待からの申請も、自動承認ではありません。</p>
    {!userId ? <p>申請にはM55アカウントが必要です。<SignInButton mode="modal"><button type="button">ログインして続ける</button></SignInButton></p>
      : <CreatorApplicationForm inviteToken={invite} />}
    <p><Link href="/legal/creator-affiliate-terms">Creator Affiliate 規約</Link> · <Link href="/support">サポート</Link></p>
  </main>;
}
