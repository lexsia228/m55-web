export const R8_A_TAX_PROFILE_SCHEMA_VERSION = '2026-10-29-v1' as const;

export const R8_A_V1_TAX_RESIDENCY = ['JAPAN_RESIDENT'] as const;
export type R8TaxResidencyV1 = (typeof R8_A_V1_TAX_RESIDENCY)[number];

export const R8_A_PAYEE_TYPES = ['INDIVIDUAL', 'CORPORATION'] as const;
export type R8PayeeTypeV1 = (typeof R8_A_PAYEE_TYPES)[number];

export const R8_A_INVOICE_REGISTRATION_STATUSES = [
  'NOT_REGISTERED',
  'REGISTERED',
  'NOT_APPLICABLE',
] as const;
export type R8InvoiceRegistrationStatusV1 = (typeof R8_A_INVOICE_REGISTRATION_STATUSES)[number];

export const R8_A_WITHHOLDING_CLASSIFICATIONS = ['ORDINARY_JP_AFFILIATE_V1_ZERO'] as const;
export type R8WithholdingClassificationV1 = (typeof R8_A_WITHHOLDING_CLASSIFICATIONS)[number];

export type R8TaxProfileInputV1 = {
  payeeType: R8PayeeTypeV1;
  invoiceRegistrationStatus: R8InvoiceRegistrationStatusV1;
  invoiceRegistrationNumberIfAny?: string | null;
};

export type R8TaxProfileRecordV1 = R8TaxProfileInputV1 & {
  schemaVersion: typeof R8_A_TAX_PROFILE_SCHEMA_VERSION;
  taxResidency: R8TaxResidencyV1;
  withholdingClassification: R8WithholdingClassificationV1;
  taxProfileEffectiveAt: string;
  v1JapanResidentAttested: true;
  v1Age18PlusAttested: true;
};

export const R8_A_STRIPE_LINK_STATES = [
  'NOT_STARTED',
  'ACCOUNT_STUB',
  'ONBOARDING_LINK_ISSUED',
  'PROVIDER_DETAILS_SUBMITTED',
  'PAYOUTS_CAPABILITY_ACTIVE',
  'BLOCKED',
  'ERROR',
] as const;
export type R8StripeLinkStateV1 = (typeof R8_A_STRIPE_LINK_STATES)[number];

export type R8ProviderAccountSnapshotV1 = {
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  transfersCapability: 'inactive' | 'pending' | 'active' | 'unknown';
  requirementsCurrentlyDueCount: number;
};

export type R8OperatingModelStepV1 =
  | 'CREATOR_TERMS_ACCEPTED'
  | 'TAX_PROFILE_READY'
  | 'STRIPE_HOSTED_ONBOARDING'
  | 'PROVIDER_PAYOUT_READINESS_GREEN'
  | 'FINAL_CREATOR_ACTIVE'
  | 'REFERRAL_URL_ACTIVE_OPERATING_MODEL'
  | 'REFERRAL_URL_ACTIVE_DEPLOYED_R7';

export type R8ReadinessBlockReasonV1 =
  | 'PROFILE_NOT_ACTIVE'
  | 'PROFILE_PENDING_FINAL_APPROVAL'
  | 'PROFILE_SUSPENDED'
  | 'PROFILE_REVOKED'
  | 'COMPLIANCE_HOLD'
  | 'TAX_PROFILE_MISSING'
  | 'TAX_PROFILE_INVALID'
  | 'V1_NON_JAPAN_RESIDENT_BLOCKED'
  | 'CORPORATION_STRIPE_NOT_SUPPORTED_V1'
  | 'AWAITING_HUMAN_FINAL_APPROVAL'
  | 'PROVIDER_NOT_LINKED'
  | 'PROVIDER_ONBOARDING_INCOMPLETE'
  | 'PROVIDER_KYC_INCOMPLETE'
  | 'PROVIDER_PAYOUTS_NOT_READY'
  | 'PAYOUT_SETTLEMENT_NOT_IMPLEMENTED'
  | 'PROVIDER_ERROR';

export type R8PublicReadinessSnapshotV1 = {
  schemaVersion: typeof R8_A_TAX_PROFILE_SCHEMA_VERSION;
  profileStatus: string;
  operatingModelSteps: R8OperatingModelStepV1[];
  blockReasons: R8ReadinessBlockReasonV1[];
  taxProfileReady: boolean;
  providerLinkState: R8StripeLinkStateV1;
  providerPayoutReadinessGreen: boolean;
  payoutSettlementAvailable: false;
  productionCashActivation: false;
  /** R7-deployed rules only (ACTIVE profile + compliance). Not effective referral permission. */
  r7ReferralIssueEligible: boolean;
  operatingModelReferralGateMet: boolean;
  compatibilityNote: string;
  providerSnapshot: R8ProviderAccountSnapshotV1 | null;
  nextActions: string[];
};

export const R8_A_COMPATIBILITY_NOTE_JA =
  '紹介URLの発行は現行のR7ルール（有効プロフィール＋コンプライアンス）に従います。' +
  'Operating Model §8 の REFERRAL_URL_ACTIVE は Stripe 受取準備完了後の段階です。' +
  'R8-A では出金・精算は未実装のため、コミッションの受取は開始されません。';

export function normalizeInvoiceRegistrationNumber(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (!/^T\d{13}$/.test(upper)) return null;
  return upper;
}

export function validateTaxProfileInputV1(input: R8TaxProfileInputV1): { ok: true } | { ok: false; error: 'TAX_PROFILE_INVALID' } {
  if (!R8_A_PAYEE_TYPES.includes(input.payeeType)) return { ok: false, error: 'TAX_PROFILE_INVALID' };
  if (!R8_A_INVOICE_REGISTRATION_STATUSES.includes(input.invoiceRegistrationStatus)) {
    return { ok: false, error: 'TAX_PROFILE_INVALID' };
  }
  const number = normalizeInvoiceRegistrationNumber(input.invoiceRegistrationNumberIfAny ?? null);
  if (input.invoiceRegistrationStatus === 'REGISTERED') {
    if (!number) return { ok: false, error: 'TAX_PROFILE_INVALID' };
  } else if (number) {
    return { ok: false, error: 'TAX_PROFILE_INVALID' };
  }
  return { ok: true };
}

export function redactProviderSnapshotForStorage(
  snapshot: R8ProviderAccountSnapshotV1,
): R8ProviderAccountSnapshotV1 {
  return {
    detailsSubmitted: snapshot.detailsSubmitted,
    chargesEnabled: snapshot.chargesEnabled,
    payoutsEnabled: snapshot.payoutsEnabled,
    transfersCapability: snapshot.transfersCapability,
    requirementsCurrentlyDueCount: snapshot.requirementsCurrentlyDueCount,
  };
}

export function parseClientIdempotencyKey(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length < 8 || trimmed.length > 128) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) return null;
  return trimmed;
}
