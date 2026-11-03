const PUBLIC_REASON_LABELS: Readonly<Record<string, string>> = {
  COMPLIANCE_HOLD: 'コンプライアンス確認中',
  FRAUD_SIGNAL: '安全確認のため保留',
  POLICY_REVIEW: 'ポリシー確認中',
  MANUAL_REVIEW: '運営確認中',
  AUTO_PASS: '問題なし',
  AUTO_HOLD: '確認中',
  RELEASE: '保留解除',
  REQUEST_CORRECTION: '修正依頼',
  REFUND_SUCCEEDED: '返金による調整',
  AUTO_CANCEL_OBJECTIVE: '購入取消による調整',
  DISPUTE_HOLD_STARTED: '異議申立て確認中',
  DISPUTE_HOLD_RELEASED: '異議申立て確認終了',
  DISPUTE_WON: '異議申立て成立',
  DISPUTE_LOST: '異議申立て不成立による調整',
  CHARGEBACK: 'チャージバックによる調整',
};

export const PUBLIC_REASON_FALLBACK = '運営確認中';

export function mapPublicReasonLabelV1(reasonCode: string | null | undefined): string {
  if (!reasonCode || typeof reasonCode !== 'string') {
    return PUBLIC_REASON_FALLBACK;
  }
  const key = reasonCode.trim();
  if (!key) return PUBLIC_REASON_FALLBACK;
  return Object.hasOwn(PUBLIC_REASON_LABELS, key)
    ? PUBLIC_REASON_LABELS[key]
    : PUBLIC_REASON_FALLBACK;
}

export function isKnownPublicReasonCodeV1(reasonCode: string): boolean {
  return Object.hasOwn(PUBLIC_REASON_LABELS, reasonCode);
}
