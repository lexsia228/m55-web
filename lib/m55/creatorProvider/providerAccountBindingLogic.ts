export type StripeAccountBindingDecision =
  | { ok: true; action: 'bind' | 'noop' }
  | { ok: false; error: 'PROVIDER_ACCOUNT_BINDING_CONFLICT' };

export function resolveStripeAccountBindingV1(input: {
  existingStripeAccountId: string | null;
  incomingStripeAccountId: string;
}): StripeAccountBindingDecision {
  if (!input.incomingStripeAccountId.trim()) {
    return { ok: false, error: 'PROVIDER_ACCOUNT_BINDING_CONFLICT' };
  }
  if (input.existingStripeAccountId == null) {
    return { ok: true, action: 'bind' };
  }
  if (input.existingStripeAccountId === input.incomingStripeAccountId) {
    return { ok: true, action: 'noop' };
  }
  return { ok: false, error: 'PROVIDER_ACCOUNT_BINDING_CONFLICT' };
}

export function stableProviderCreateIdempotencyKeyV1(creatorEconomicIdentityId: string): string {
  return `m55_r8_provider_create_v1:${creatorEconomicIdentityId}`;
}
