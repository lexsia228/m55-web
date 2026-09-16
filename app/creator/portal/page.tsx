import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { SignInButton } from '@clerk/nextjs';
import { CreatorPortalPanel } from '../_components/CreatorPortalPanel';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Creator申請状況 | M55',
  robots: { index: false, follow: false },
};
export default async function CreatorPortalPage() {
  const { userId } = await auth();
  return <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 20px 80px', lineHeight: 1.8 }}>
    <h1>Creator 申請状況</h1>
    {userId ? <CreatorPortalPanel /> : <p>状況の確認にはログインが必要です。<SignInButton mode="modal"><button type="button">ログイン</button></SignInButton></p>}
    <p><Link href="/support">サポートに相談</Link></p>
  </div>;
}
