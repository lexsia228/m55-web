const LIFECYCLE_ENTITLEMENT_LABELS: Readonly<Record<string, string>> = {
  COMMISSION_PENDING_COMPLIANCE_REVIEW: 'コンプライアンス確認中',
  COMMISSION_HOLD: '保留',
  COMMISSION_PAYABLE: '支払可能',
  COMMISSION_REVERSED: '取消・返金反映',
  COMMISSION_ADJUSTED: '調整済み',
};

const COMPLIANCE_STATUS_LABELS: Readonly<Record<string, string>> = {
  OPEN: '対応中',
  HOLD: '保留',
  RESOLVED: '完了',
  CLOSED: '終了',
};

export function formatLifecycleEntitlementLabelJa(lifecycle: string): string {
  return LIFECYCLE_ENTITLEMENT_LABELS[lifecycle] ?? lifecycle;
}

export function formatComplianceStatusLabelJa(status: string): string {
  return COMPLIANCE_STATUS_LABELS[status] ?? status;
}

export function formatJpyAmountJa(amount: number): string {
  return `${amount.toLocaleString('ja-JP')} 円`;
}

export function formatInstantJstFromIso(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(ms);
}

export function formatInstantJstFromMs(ms: number): string {
  if (!Number.isFinite(ms)) return '—';
  return formatInstantJstFromIso(new Date(ms).toISOString());
}