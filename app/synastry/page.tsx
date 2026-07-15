import { PublicShell } from '../_components/PublicShell';
import CompatibilityGuestExperience from '../../components/compatibility/CompatibilityGuestExperience';
import { isCompatibilityCommerceEnabled } from '../../lib/m55/compatibility/compatibilityCommerceAuthority';
import { M55ExperienceShell } from '../../components/experience/M55ExperienceShell';

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
