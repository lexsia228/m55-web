'use client';
/**
 * Negative fixture: an unrelated conditional variable contains the required
 * state, while the JSX `stateId` expression resolves to a different state.
 * Only bindings reachable from the actual attribute expression may count.
 */
import PremiumDecisionSurface from '../../../../../../components/experience/PremiumDecisionSurface';

export default function WrongStateExpressionFixture({ edit }: { edit: boolean }) {
  const unrelatedStateId = edit ? 'premium.share.card' : 'premium.lp.answer_edit';
  const mountedStateId = edit ? 'premium.lp.checkout' : 'premium.lp.plans';
  void unrelatedStateId;

  return (
    <PremiumDecisionSurface stateId={mountedStateId} testId="wrong-state-expression">
      <div>wrong state expression</div>
    </PremiumDecisionSurface>
  );
}
