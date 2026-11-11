import { evaluateProviderDisbursementGateV1 } from '../creatorProvider/providerFreshness';
import { R8_C_BANK_CALENDAR_BLOCKER } from '../creatorSettlement/japaneseBankBusinessDayCalendar';

export type OperatorPayoutExceptionRowV1 = {
  creatorEconomicIdentityIdSuffix: string;
  exceptionKind:
    | 'PROVIDER_STALE'
    | 'PROVIDER_DOWNGRADE'
    | 'PAYOUT_FAILED'
    | 'PAYOUT_RETURNED'
    | 'LEGAL_DEADLINE_HOLD'
    | 'BANK_CALENDAR_UNKNOWN'
    | 'SETTLEMENT_READ_UNAVAILABLE';
  escalationRequired: boolean;
  auditReasonRequired: true;
  redactedSummaryJa: string;
};

export function listOperatorPayoutExceptionsV1(input: {
  rows: Array<{
    creatorEconomicIdentityId: string;
    lastSyncedAt: string | null;
    providerDowngradeActive: boolean;
    snapshotPresent: boolean;
  }>;
  includeGlobalBankCalendarHold?: boolean;
}): OperatorPayoutExceptionRowV1[] {
  const out: OperatorPayoutExceptionRowV1[] = [];
  for (const row of input.rows) {
    const gate = evaluateProviderDisbursementGateV1({
      stripeAccountId: 'acct_redacted',
      linkState: 'PAYOUTS_CAPABILITY_ACTIVE',
      snapshot: row.snapshotPresent
        ? {
            detailsSubmitted: true,
            chargesEnabled: true,
            payoutsEnabled: true,
            transfersCapability: 'active',
            requirementsCurrentlyDueCount: 0,
          }
        : null,
      taxProfile: null,
      lastSyncedAt: row.lastSyncedAt,
      asOfUtc: new Date(),
      providerDowngradeActive: row.providerDowngradeActive,
    });

    if (gate.freshness === 'STALE' || gate.freshness === 'MISSING') {
      out.push({
        creatorEconomicIdentityIdSuffix: row.creatorEconomicIdentityId.slice(-8),
        exceptionKind: 'PROVIDER_STALE',
        escalationRequired: false,
        auditReasonRequired: true,
        redactedSummaryJa: 'プロバイダ同期が古いか欠落しています。新規送金判断は保留してください。',
      });
    }
    if (row.providerDowngradeActive) {
      out.push({
        creatorEconomicIdentityIdSuffix: row.creatorEconomicIdentityId.slice(-8),
        exceptionKind: 'PROVIDER_DOWNGRADE',
        escalationRequired: true,
        auditReasonRequired: true,
        redactedSummaryJa: 'プロバイダ能力の低下が記録されています。人手確認が必要です。',
      });
    }
  }

  if (input.includeGlobalBankCalendarHold !== false) {
    out.push({
      creatorEconomicIdentityIdSuffix: 'GLOBAL',
      exceptionKind: 'BANK_CALENDAR_UNKNOWN',
      escalationRequired: false,
      auditReasonRequired: true,
      redactedSummaryJa: `日本の銀行営業日カレンダーが未確定のため、公開 due-date は ${R8_C_BANK_CALENDAR_BLOCKER} で保留します。`,
    });
  }

  return out;
}
