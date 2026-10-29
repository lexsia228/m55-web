import type { CreatorProfileStatus } from '../creatorDashboard/creatorContext';
import {
  R8_A_COMPATIBILITY_NOTE_JA,
  type R8PublicReadinessSnapshotV1,
  type R8ProviderAccountSnapshotV1,
  type R8ReadinessBlockReasonV1,
  type R8StripeLinkStateV1,
  isProviderPayoutReadinessGreenV1,
} from './contract';

export type ReadinessInputsV1 = {
  profileStatus: CreatorProfileStatus;
  referralIssuePermittedDeployedR7: boolean;
  complianceBlocksReferral: boolean;
  taxProfileReady: boolean;
  linkState: R8StripeLinkStateV1;
  providerSnapshot: R8ProviderAccountSnapshotV1 | null;
  v1JapanBlocked: boolean;
};

export function buildPublicReadinessSnapshotV1(input: ReadinessInputsV1): R8PublicReadinessSnapshotV1 {
  const blockReasons: R8ReadinessBlockReasonV1[] = [];
  const nextActions: string[] = [];
  const operatingModelSteps: R8PublicReadinessSnapshotV1['operatingModelSteps'] = [
    'CREATOR_TERMS_ACCEPTED',
  ];

  if (input.profileStatus === 'SUSPENDED') {
    blockReasons.push('PROFILE_SUSPENDED');
    nextActions.push('プロフィールが一時停止中です。サポートへお問い合わせください。');
  } else if (input.profileStatus === 'REVOKED') {
    blockReasons.push('PROFILE_REVOKED');
    nextActions.push('プロフィールが停止されています。サポートへお問い合わせください。');
  } else if (input.profileStatus !== 'ACTIVE') {
    blockReasons.push('PROFILE_NOT_ACTIVE');
    nextActions.push('Creatorプロフィールが有効化されると、受取準備の設定を進められます。');
  }

  if (input.complianceBlocksReferral) {
    blockReasons.push('COMPLIANCE_HOLD');
    nextActions.push('コンプライアンス確認が完了するまで、受取準備を進められません。');
  }

  if (input.v1JapanBlocked) {
    blockReasons.push('V1_NON_JAPAN_RESIDENT_BLOCKED');
    nextActions.push('現行バージョンでは日本在住のCreatorのみ受取準備が対象です。');
  }

  if (input.taxProfileReady) {
    operatingModelSteps.push('TAX_PROFILE_READY');
  } else if (input.profileStatus === 'ACTIVE') {
    blockReasons.push('TAX_PROFILE_MISSING');
    nextActions.push('税務プロフィール（適格請求書登録状況など）を入力してください。');
  }

  if (input.linkState !== 'NOT_STARTED') {
    operatingModelSteps.push('STRIPE_HOSTED_ONBOARDING');
  } else if (input.profileStatus === 'ACTIVE' && input.taxProfileReady && !input.v1JapanBlocked) {
    blockReasons.push('PROVIDER_NOT_LINKED');
    nextActions.push('Stripe の受取口座登録（ホスト型）を開始してください。');
  }

  const providerGreen = isProviderPayoutReadinessGreenV1(input.linkState, input.providerSnapshot);
  if (providerGreen) {
    operatingModelSteps.push('PROVIDER_PAYOUT_READINESS_GREEN');
  } else if (input.linkState === 'ERROR') {
    blockReasons.push('PROVIDER_ERROR');
    nextActions.push('決済プロバイダ側の設定で問題が発生しました。時間をおいて再試行するか、サポートへご連絡ください。');
  } else if (input.linkState !== 'NOT_STARTED' && input.providerSnapshot) {
    if (!input.providerSnapshot.detailsSubmitted) {
      blockReasons.push('PROVIDER_KYC_INCOMPLETE');
      nextActions.push('Stripe の本人確認・口座情報の入力を完了してください。');
    } else if (!input.providerSnapshot.payoutsEnabled || input.providerSnapshot.transfersCapability !== 'active') {
      blockReasons.push('PROVIDER_PAYOUTS_NOT_READY');
      nextActions.push('Stripe 側の受取準備が完了していません。オンボーディングを再開してください。');
    } else {
      blockReasons.push('PROVIDER_ONBOARDING_INCOMPLETE');
      nextActions.push('受取準備の入力を続けてください。');
    }
  }

  if (input.profileStatus === 'ACTIVE') {
    operatingModelSteps.push('FINAL_CREATOR_ACTIVE');
  }

  if (providerGreen) {
    operatingModelSteps.push('REFERRAL_URL_ACTIVE_OPERATING_MODEL');
  }
  if (input.referralIssuePermittedDeployedR7) {
    operatingModelSteps.push('REFERRAL_URL_ACTIVE_DEPLOYED_R7');
  }

  blockReasons.push('PAYOUT_SETTLEMENT_NOT_IMPLEMENTED');
  nextActions.push('コミッションの出金・精算は R8 完了までは開始されません（現金送金は無効）。');

  return {
    schemaVersion: '2026-10-29-v1',
    profileStatus: input.profileStatus,
    operatingModelSteps,
    blockReasons: [...new Set(blockReasons)],
    taxProfileReady: input.taxProfileReady,
    providerLinkState: input.linkState,
    providerPayoutReadinessGreen: providerGreen,
    payoutSettlementAvailable: false,
    productionCashActivation: false,
    referralIssuePermittedDeployedR7: input.referralIssuePermittedDeployedR7,
    operatingModelReferralGateMet: providerGreen,
    compatibilityNote: R8_A_COMPATIBILITY_NOTE_JA,
    providerSnapshot: input.providerSnapshot,
    nextActions: [...new Set(nextActions)],
  };
}
