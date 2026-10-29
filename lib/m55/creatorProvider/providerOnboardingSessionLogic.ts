export type OnboardingSessionPersistedStatusV1 = 'PENDING' | 'COMPLETED' | 'EXPIRED';

export type OnboardingSessionCreateDecisionV1 =
  | { action: 'reuse'; reason: 'pending_row' }
  | { action: 'insert'; reason: 'no_row' }
  | { action: 'reject'; reason: 'client_idempotency_key_exhausted'; priorStatus: OnboardingSessionPersistedStatusV1 };

/**
 * One client idempotency key maps to at most one onboarding session row (unique constraint).
 * COMPLETED/EXPIRED rows are retained for audit; callers must supply a new key for a new attempt.
 */
export function decideOnboardingSessionCreateV1(input: {
  existingStatus: OnboardingSessionPersistedStatusV1 | null;
}): OnboardingSessionCreateDecisionV1 {
  if (input.existingStatus == null) {
    return { action: 'insert', reason: 'no_row' };
  }
  if (input.existingStatus === 'PENDING') {
    return { action: 'reuse', reason: 'pending_row' };
  }
  return {
    action: 'reject',
    reason: 'client_idempotency_key_exhausted',
    priorStatus: input.existingStatus,
  };
}
