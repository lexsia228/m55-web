import { PublicShell } from '../_components/PublicShell';
import CompatibilityGuestExperience from '../../components/compatibility/CompatibilityGuestExperience';
import { isCompatibilityCommerceEnabled } from '../../lib/m55/compatibility/compatibilityCommerceAuthority';
import { M55ExperienceShell } from '../../components/experience/M55ExperienceShell';

export const metadata = {
  title: '二人の関係を無料で読み解く | M55',
  description:
    '二人分の生年月日と、入力者から観察できる現在の距離・会話についての6つの回答から、反応の重なりと違いを点数にせず整理します。',
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
