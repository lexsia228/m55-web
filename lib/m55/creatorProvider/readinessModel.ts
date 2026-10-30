import type { CreatorProfileStatus } from '../creatorDashboard/creatorContext';
import {
  R8_A_COMPATIBILITY_NOTE_JA,
  type R8PublicReadinessSnapshotV1,
  type R8ProviderAccountSnapshotV1,
  type R8ReadinessBlockReasonV1,
  type R8StripeLinkStateV1,
  type R8TaxProfileRecordV1,
} from './contract';
import { evaluateCreatorProviderPayoutReadinessV1 } from './providerPayoutReadinessPredicate';
import { evaluateProviderSnapshotFreshnessV1 } from './providerFreshness';
import { isR8AProviderPlaneEditableV1 } from './providerEligibility';

export type ReadinessInputsV1 = {
  profileStatus: CreatorProfileStatus;
  r7ReferralIssueEligible: boolean;
  complianceBlocksReferral: boolean;
  taxProfileReady: boolean;
  taxProfile: R8TaxProfileRecordV1 | null;
  linkState: R8StripeLinkStateV1;
  providerSnapshot: R8ProviderAccountSnapshotV1 | null;
  stripeAccountId: string | null;
  providerLastSyncedAt: string | null;
  providerDowngradeActive: boolean;
  v1JapanBlocked: boolean;
};

function canProgressOnboardingStepsV1(profileStatus: CreatorProfileStatus): boolean {
  return isR8AProviderPlaneEditableV1(profileStatus);
}

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
  } else if (input.profileStatus === 'APPROVED_PENDING_ACTIVATION') {
    blockReasons.push('PROFILE_PENDING_FINAL_APPROVAL');
    nextActions.push('最終有効化（運営承認）前です。受取準備の入力は進められますが、紹介URLの新規発行や出金は開始されません。');
  }

  if (input.complianceBlocksReferral) {
    blockReasons.push('COMPLIANCE_HOLD');
    nextActions.push('コンプライアンス確認が完了するまで、一部の操作が制限されます。');
  }

  if (input.v1JapanBlocked) {
    blockReasons.push('V1_NON_JAPAN_RESIDENT_BLOCKED');
    nextActions.push('現行バージョンでは日本在住のCreatorのみ受取準備が対象です。');
  }

  if (input.taxProfileReady) {
    operatingModelSteps.push('TAX_PROFILE_READY');
  } else if (canProgressOnboardingStepsV1(input.profileStatus)) {
    blockReasons.push('TAX_PROFILE_MISSING');
    nextActions.push('税務プロフィール（適格請求書登録状況など）を入力してください。');
  }

  if (input.linkState !== 'NOT_STARTED') {
    operatingModelSteps.push('STRIPE_HOSTED_ONBOARDING');
  } else if (canProgressOnboardingStepsV1(input.profileStatus) && input.taxProfileReady && !input.v1JapanBlocked) {
    blockReasons.push('PROVIDER_NOT_LINKED');
    nextActions.push('Stripe の受取口座登録（ホスト型）を開始してください。');
  }

  const snapshotFreshness = evaluateProviderSnapshotFreshnessV1({
    lastSyncedAt: input.providerLastSyncedAt,
    asOfUtc: new Date(),
    snapshot: input.providerSnapshot,
  });

  let providerGreen = evaluateCreatorProviderPayoutReadinessV1({
    stripeAccountId: input.stripeAccountId,
    linkState: input.linkState,
    snapshot: input.providerSnapshot,
    taxProfile: input.taxProfile,
  });
  // R8-C gap: providerGreen reflects last synced snapshot only — not webhook freshness or live payout proof.
  if (snapshotFreshness !== 'FRESH' || input.providerDowngradeActive) {
    providerGreen = false;
  }
  if (providerGreen) {
    operatingModelSteps.push('PROVIDER_PAYOUT_READINESS_GREEN');
    if (input.profileStatus === 'APPROVED_PENDING_ACTIVATION') {
      blockReasons.push('AWAITING_HUMAN_FINAL_APPROVAL');
      nextActions.push(
        'Stripe 受取準備はプロバイダ側で完了しました。最終承認・本人確認（運営）後に Creator プロフィールが有効化されます。',
      );
    }
  } else if (input.linkState === 'BLOCKED') {
    blockReasons.push('PROVIDER_ERROR');
    nextActions.push('決済プロバイダ側の受取準備がブロックされています。サポートへお問い合わせください。');
  } else if (input.linkState === 'ERROR') {
    blockReasons.push('PROVIDER_ERROR');
    nextActions.push('決済プロバイダ側の設定で問題が発生しました。時間をおいて再試行するか、サポートへご連絡ください。');
  } else if (input.linkState !== 'NOT_STARTED' && input.providerSnapshot) {
    if (input.providerDowngradeActive || snapshotFreshness === 'STALE' || snapshotFreshness === 'MISSING') {
      blockReasons.push('PROVIDER_PAYOUTS_NOT_READY');
      nextActions.push(
        '決済プロバイダの受取状態を再確認してください。表示は最後の同期時点であり、リアルタイムの送金可否は保証されません。',
      );
    } else if (!input.providerSnapshot.detailsSubmitted) {
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

  if (providerGreen && input.profileStatus === 'ACTIVE') {
    operatingModelSteps.push('REFERRAL_URL_ACTIVE_OPERATING_MODEL');
  }
  if (input.r7ReferralIssueEligible) {
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
    r7ReferralIssueEligible: input.r7ReferralIssueEligible,
    operatingModelReferralGateMet: providerGreen && input.profileStatus === 'ACTIVE',
    compatibilityNote: R8_A_COMPATIBILITY_NOTE_JA,
    providerSnapshot: input.providerSnapshot,
    nextActions: [...new Set(nextActions)],
  };
}
