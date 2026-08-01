'use client';
/**
 * Positive control: imports through the real components/experience barrel.
 * Proves the re-export chain is actually followed to the canonical module rather
 * than being accepted only for direct imports.
 */
import { PremiumDecisionSurface } from '../../../../../../components/experience';

export default function CanonicalBarrelShareFixture() {
  return (
    <PremiumDecisionSurface stateId="premium.share.card">
      <div>canonical barrel</div>
    </PremiumDecisionSurface>
  );
}
