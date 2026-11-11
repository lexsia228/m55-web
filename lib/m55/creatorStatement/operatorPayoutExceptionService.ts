import 'server-only';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import {
  getProviderEventStoreSingletonV1,
  isProviderDowngradeActiveV1,
} from '../creatorProvider/providerWebhookEventContract';
import { evaluateProviderDisbursementGateV1 } from '../creatorProvider/providerFreshness';
import { R8_C_BANK_CALENDAR_BLOCKER } from '../creatorSettlement/japaneseBankBusinessDayCalendar';
import { listOperatorPayoutExceptionsV1, type OperatorPayoutExceptionRowV1 } from './operatorPayoutExceptionReadModel';

export async function loadOperatorPayoutExceptionsV1(): Promise<OperatorPayoutExceptionRowV1[]> {
  const db = getSupabaseAdmin() as any;
  const providerRows: Array<{
    creatorEconomicIdentityId: string;
    lastSyncedAt: string | null;
    providerDowngradeActive: boolean;
    snapshotPresent: boolean;
    linkState: string;
  }> = [];

  try {
    const { data, error } = await db
      .from('m55_r8_stripe_connected_accounts_v1')
      .select('creator_economic_identity_id,last_synced_at,last_provider_snapshot,link_state');
    if (!error) {
      for (const row of data ?? []) {
        const creatorEconomicIdentityId = row.creator_economic_identity_id as string;
        providerRows.push({
          creatorEconomicIdentityId,
          lastSyncedAt: (row.last_synced_at as string | null) ?? null,
          providerDowngradeActive: isProviderDowngradeActiveV1(
            getProviderEventStoreSingletonV1(),
            creatorEconomicIdentityId,
          ),
          snapshotPresent: row.last_provider_snapshot != null,
          linkState: row.link_state as string,
        });
      }
    }
  } catch {
    // provider table may be unavailable in some environments
  }

  const exceptions = listOperatorPayoutExceptionsV1({
    rows: providerRows.map((row) => ({
      creatorEconomicIdentityId: row.creatorEconomicIdentityId,
      lastSyncedAt: row.lastSyncedAt,
      providerDowngradeActive: row.providerDowngradeActive,
      snapshotPresent: row.snapshotPresent,
    })),
  });

  try {
    const { data: failedAttempts, error: attemptErr } = await db
      .from('m55_r8_payout_attempts_v1')
      .select('instruction_id,status')
      .in('status', ['FAILED', 'RETURNED']);
    if (attemptErr) {
      if (!/does not exist/i.test(attemptErr.message ?? '') && attemptErr.code !== '42P01') {
        exceptions.push({
          creatorEconomicIdentityIdSuffix: 'GLOBAL',
          exceptionKind: 'SETTLEMENT_READ_UNAVAILABLE',
          escalationRequired: true,
          auditReasonRequired: true,
          redactedSummaryJa: '精算永続化データの読み取りに失敗しました。DB障害の可能性があります。',
        });
      }
    } else {
      for (const attempt of failedAttempts ?? []) {
        exceptions.push({
          creatorEconomicIdentityIdSuffix: String(attempt.instruction_id).slice(-8),
          exceptionKind: attempt.status === 'RETURNED' ? 'PAYOUT_RETURNED' : 'PAYOUT_FAILED',
          escalationRequired: true,
          auditReasonRequired: true,
          redactedSummaryJa: '精算指示の送金試行が失敗または返金されました。人手確認が必要です。',
        });
      }
    }
  } catch {
    exceptions.push({
      creatorEconomicIdentityIdSuffix: 'GLOBAL',
      exceptionKind: 'SETTLEMENT_READ_UNAVAILABLE',
      escalationRequired: true,
      auditReasonRequired: true,
      redactedSummaryJa: '精算永続化データの読み取りに失敗しました。DB障害の可能性があります。',
    });
  }

  if (!exceptions.some((row) => row.exceptionKind === 'BANK_CALENDAR_UNKNOWN')) {
    exceptions.push({
      creatorEconomicIdentityIdSuffix: 'GLOBAL',
      exceptionKind: 'BANK_CALENDAR_UNKNOWN',
      escalationRequired: false,
      auditReasonRequired: true,
      redactedSummaryJa: `日本の銀行営業日カレンダーが未確定のため、公開 due-date は ${R8_C_BANK_CALENDAR_BLOCKER} で保留します。`,
    });
  }

  return exceptions;
}

export async function loadOperatorPayoutExceptionsForCreatorV1(input: {
  creatorEconomicIdentityId: string;
  lastSyncedAt: string | null;
  providerDowngradeActive: boolean;
  snapshotPresent: boolean;
}): Promise<OperatorPayoutExceptionRowV1[]> {
  return listOperatorPayoutExceptionsV1({ rows: [input] });
}
