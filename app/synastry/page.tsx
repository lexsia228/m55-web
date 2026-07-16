import { PublicShell } from '../_components/PublicShell';
import CompatibilityGuestExperience from '../../components/compatibility/CompatibilityGuestExperience';
import { isCompatibilityCommerceEnabled } from '../../lib/m55/compatibility/compatibilityCommerceAuthority';
import { M55ExperienceShell } from '../../components/experience/M55ExperienceShell';

export const metadata = {
  title: '二人の無料相性解析 | M55',
  description:
    '二人の生年月日と6つの質問から、自然に合いやすいところ、互いを補いやすい違い、すれ違いが始まりやすい場面を見る無料相性解析です。',
  alternates: { canonical: '/synastry' },
};

export default function SynastryPage() {
  return (
    <PublicShell>
      <M55ExperienceShell kind="compatibility" depth="free">
        <CompatibilityGuestExperience
          commerceEnabled={isCompatibilityCommerceEnabled()}
        />
      </M55ExperienceShell>
    </PublicShell>
  );
}
