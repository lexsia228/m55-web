'use client';
/**
 * Negative fixture: imports the canonical Premium name through a decoy barrel.
 * A regex or shallow import check would accept this; re-export resolution must not.
 */
import { PremiumDecisionSurface } from './decoy-surface-barrel';

export default function DecoyBarrelShareFixture() {
  return (
    <PremiumDecisionSurface stateId="premium.share.card">
      <div>decoy barrel</div>
    </PremiumDecisionSurface>
  );
}
