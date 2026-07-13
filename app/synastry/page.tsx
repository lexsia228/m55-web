import { PublicShell } from '../_components/PublicShell';
import CompatibilityGuestExperience from '../../components/compatibility/CompatibilityGuestExperience';
import { isCompatibilityCommerceEnabled } from '../../lib/m55/compatibility/compatibilityCommerceAuthority';

export default function SynastryPage() {
  return (
    <PublicShell>
      <CompatibilityGuestExperience
        commerceEnabled={isCompatibilityCommerceEnabled()}
      />
    </PublicShell>
  );
}
