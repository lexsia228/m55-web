import CorePageClient from './CorePageClient';

export const metadata = {
  title: '自分の輪郭を無料で読み解く | M55',
  description:
    '生年月日から得る無料用の暦の手がかりと、5つの傾向質問・今の関心1問の合計6回答から、現在の5つの視点と最初の小さな行動まで確認できます。',
  alternates: { canonical: '/core' },
};

export default function CorePage() {
  return <CorePageClient />;
}
