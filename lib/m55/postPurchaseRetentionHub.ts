import {
  hasValidConsultWalletDenominator,
  isConsultWalletDisplaySnapshotUsable,
  type ConsultWalletDisplaySnapshot,
} from './reply/consultWalletDisplaySnapshot';

export type SavedReportPlan = 'light' | 'full' | 'unknown';

export type PostPurchaseRetentionHubModel = {
  plan: SavedReportPlan;
  planLabel: 'M55 プレミアムレポート ライト' | 'M55 プレミアムレポート フル' | 'プレミアムレポート';
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
    plan === 'full' ? 'M55 プレミアムレポート フル' : plan === 'light' ? 'M55 プレミアムレポート ライト' : 'プレミアムレポート';
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
