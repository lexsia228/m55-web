'use client';
import PremiumDecisionSurface from '../../../../../../components/experience/PremiumDecisionSurface';

/** Negative fixture: Free share incorrectly premium-wrapped. */
export default function FreeSharePremiumWrappedFixture() {
  return (
    <PremiumDecisionSurface stateId="premium.share.card">
      <section data-m55-share-presentation="free">free wrapped</section>
    </PremiumDecisionSurface>
  );
}
