export function describeReferralIssueGateJa(input: {
  profileStatus: string;
  referralIssuePermitted: boolean;
  r7ReferralIssueEligible: boolean;
  hasExistingLink: boolean;
}): string | null {
  if (input.profileStatus !== 'ACTIVE') {
    return null;
  }
  if (input.referralIssuePermitted) {
    return null;
  }
  if (!input.r7ReferralIssueEligible) {
    return '紹介URLの新規発行には、有効なCreatorプロフィールとコンプライアンス条件の両方が必要です。';
  }
  if (input.hasExistingLink) {
    return '既存の紹介URLはダッシュボードで参照できます。新規発行は税務プロフィールとStripe受取準備（直近同期が有効な状態）が揃うまでできません。';
  }
  return '紹介URLの新規発行は、税務プロフィールとStripe受取準備（直近同期が有効な状態）が揃うまでできません。銀行振込はまだ開始されていません。';
}