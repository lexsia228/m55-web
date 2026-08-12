import type { DtrUnlockState } from '../dtrOwnershipGate';

/**
 * Where to send a buyer who came back from Checkout with a session that could not be
 * verified against Stripe's purchase context.
 *
 * The Checkout Session id is deliberately not an input. Ownership is read from the
 * signed-in account's own entitlement, so an arbitrary session id can never stand in for
 * proof of purchase, and an account that owns nothing still falls through to fail-closed.
 */
export type UnverifiedCheckoutReturnDecision = 'open_report' | 'owned_recovery' | 'fail_closed';

export type OwnedReturnEvidence = {
  unlockState: DtrUnlockState;
  hasVisibleSnapshot: boolean;
};

/** `null` evidence means the ownership lookup itself failed — treated as unowned. */
export function decideUnverifiedCheckoutReturn(
  evidence: OwnedReturnEvidence | null,
): UnverifiedCheckoutReturnDecision {
  if (!evidence || evidence.unlockState !== 'owned') return 'fail_closed';
  return evidence.hasVisibleSnapshot ? 'open_report' : 'owned_recovery';
}
