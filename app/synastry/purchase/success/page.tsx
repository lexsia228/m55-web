import { PublicShell } from '../../../_components/PublicShell';
import { CompatibilityPurchaseSuccess } from '../../../../components/compatibility/CompatibilityPurchaseExperience';

export const metadata = {
  title: '2人の距離の読み解き 支払い確認中 | M55',
  robots: { index: false, follow: false },
};

export default function CompatibilityPurchaseSuccessPage() {
  return (
    <PublicShell>
      <CompatibilityPurchaseSuccess />
    </PublicShell>
  );
}
