import 'server-only';
import { loadDashboardSummaryV1 } from '../creatorDashboard/dashboardReadModel';
import { listSettlementBundlesForCreatorRuntimeV1 } from '../creatorSettlement/r8SettlementDurableRepository';
import { SettlementPersistedReadError } from '../creatorSettlement/settlementReadErrors';
import { buildCreatorStatementBundleV1 } from './creatorStatementReadModel';

export async function loadCreatorStatementBundleForSessionV1(input: {
  creatorEconomicIdentityId: string;
  fromMs: number;
  toMs: number;
}): Promise<ReturnType<typeof buildCreatorStatementBundleV1>> {
  const summary = await loadDashboardSummaryV1({
    creatorEconomicIdentityId: input.creatorEconomicIdentityId,
    fromMs: input.fromMs,
    toMs: input.toMs,
  });
  let lockedBundles;
  try {
    lockedBundles = await listSettlementBundlesForCreatorRuntimeV1(input.creatorEconomicIdentityId);
  } catch (e) {
    if (e instanceof SettlementPersistedReadError) throw e;
    throw new SettlementPersistedReadError();
  }
  return buildCreatorStatementBundleV1({
    commissionLifecycleCounts: summary.currentEntitlementsByLifecycle,
    lockedBundles,
  });
}
