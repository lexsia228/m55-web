import {
  hasValidConsultWalletDenominator,
  isConsultWalletDisplaySnapshotUsable,
  type ConsultWalletDisplaySnapshot,
} from './reply/consultWalletDisplaySnapshot';

export type SavedReportPlan = 'light' | 'full' | 'unknown';

export type PostPurchaseRetentionHubModel = {
  plan: SavedReportPlan;
  planLabel: '保存版ライト' | '保存版FULL' | '保存版';
  usage: {
    total: number;
    remaining: number;
    used: number;
  } | null;
  primaryAction: 'additional_reading' | 'saved_report';
  secondaryAction: 'saved_report' | null;
};

export function resolveSavedReportPlan(tier: {
  hasLight: boolean;
  hasFull: boolean;
}): SavedReportPlan {
  if (tier.hasFull) return 'full';
  if (tier.hasLight) return 'light';
  return 'unknown';
}

export function buildPostPurchaseRetentionHubModel(input: {
  tier: {
    hasLight: boolean;
    hasFull: boolean;
  };
  wallet?: ConsultWalletDisplaySnapshot | null;
}): PostPurchaseRetentionHubModel {
  const plan = resolveSavedReportPlan(input.tier);
  const planLabel =
    plan === 'full' ? '保存版FULL' : plan === 'light' ? '保存版ライト' : '保存版';
  const wallet =
    isConsultWalletDisplaySnapshotUsable(input.wallet) &&
    hasValidConsultWalletDenominator(input.wallet)
      ? input.wallet
      : null;
  const usage = wallet
    ? {
        total: wallet.totalGrantedCount,
        remaining: wallet.availableCount,
        used: Math.max(0, wallet.totalGrantedCount - wallet.availableCount),
      }
    : null;
  const canStartAdditionalReading = usage !== null && usage.remaining > 0;

  return {
    plan,
    planLabel,
    usage,
    primaryAction: canStartAdditionalReading ? 'additional_reading' : 'saved_report',
    secondaryAction: canStartAdditionalReading ? 'saved_report' : null,
  };
}
