import M55TenViews from '../../components/pages/M55TenViews';
import { PublicShell } from '../_components/PublicShell';

export const metadata = {
  title: 'M55独自の10通りの資質フレーム | M55',
  description:
    'M55の10通りの資質は、暦リズムと選択式の回答を整理するための独自フレームです。科学的な性格診断、医療・臨床上の分類、順位ではありません。',
  alternates: { canonical: '/ten-views' },
};

export default function TenViewsPage() {
  return (
    <PublicShell>
      <M55TenViews />
    </PublicShell>
  );
}
