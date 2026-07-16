import CorePageClient from './CorePageClient';

export const metadata = {
  title: '自分の強みといつものパターンを無料解析 | M55',
  description:
    '生年月日と6つの質問から、自然に力を発揮しやすい場面、自分らしい考え方、迷いや疲れが始まりやすい場面を無料で解析します。',
  alternates: { canonical: '/core' },
};

export default function CorePage() {
  return <CorePageClient />;
}
