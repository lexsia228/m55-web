import { notFound } from 'next/navigation';
import { requireReviewerId } from '../../../lib/m55/creatorDistribution/security';
import { CreatorReviewQueue } from './_components/CreatorReviewQueue';

export const dynamic = 'force-dynamic';
export default async function CreatorReviewPage() {
  const reviewer = await requireReviewerId();
  if (!reviewer) notFound();
  return <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 80px' }}>
    <h1>Creator 審査キュー</h1>
    <p>人による審査とメディア運営確認が必要です。スカウト招待は承認ではありません。</p>
    <CreatorReviewQueue />
  </main>;
}
