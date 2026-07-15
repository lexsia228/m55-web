import CorePageClient from './CorePageClient';

export const metadata = {
  title: '自分の輪郭を無料で読み解く | M55',
  description:
    '生年月日の暦リズムと5つの選択式質問・今の関心から、現在の5つの視点と最初の小さな行動まで確認できます。',
  alternates: { canonical: '/core' },
};

export default function CorePage() {
  return <CorePageClient />;
}
