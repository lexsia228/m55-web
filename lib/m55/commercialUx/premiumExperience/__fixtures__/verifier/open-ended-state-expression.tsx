'use client';
/**
 * Negative fixture: the JSX `stateId` expression is open-ended (a prop), so no
 * finite state set can be proven even though the required state appears in the
 * same file as a string.
 */
import PremiumDecisionSurface from '../../../../../../components/experience/PremiumDecisionSurface';

const DOCUMENTED_STATE = 'premium.share.card';

export default function OpenEndedStateExpressionFixture({ stateId }: { stateId: string }) {
  void DOCUMENTED_STATE;
  return (
    <PremiumDecisionSurface stateId={stateId} testId="open-ended-state-expression">
      <div>open ended state expression</div>
    </PremiumDecisionSurface>
  );
}
