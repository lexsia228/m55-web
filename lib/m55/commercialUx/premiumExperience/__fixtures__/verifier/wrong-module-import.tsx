'use client';
/** Negative fixture: same-named import from wrong module path. */
import PremiumDecisionSurface from '../../../../../../components/experience/PremiumExperienceSurface';

export default function WrongModuleShareFixture() {
  return (
    <PremiumDecisionSurface stateId="premium.share.card">
      <div>wrong module</div>
    </PremiumDecisionSurface>
  );
}
