export const M55_R7_EXPORT_MAX_RANGE_DAYS = 366 as const;
export const M55_R7_EXPORT_MAX_ROWS = 10_000 as const;
export const M55_R7_EXPORT_KEYSET_PAGE_SIZE = 500 as const;
export const M55_R7_MAX_RANGE_MS = M55_R7_EXPORT_MAX_RANGE_DAYS * 24 * 60 * 60 * 1000;

const UTC_INSTANT_Z_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export type ExportRowV1 = Record<string, string | number>;

export type EntitlementLedgerRowV1 = {
  ledger_event_seq: number;
  recorded_at: string;
  commission_event_id: string;
  origin_commission_event_id: string | null;
  lifecycle_state_after_event: string;
  entitlement_after_event_jpy: number;
};

export function pickLatestEntitlementsByOriginV1(
  rows: readonly EntitlementLedgerRowV1[],
): Map<string, { lifecycle: string; entitlement: number }> {
  const sorted = [...rows].sort((a, b) => b.ledger_event_seq - a.ledger_event_seq);
  const latestByOrigin = new Map<string, { lifecycle: string; entitlement: number }>();
  for (const row of sorted) {
    const originKey = row.origin_commission_event_id ?? row.commission_event_id;
    if (latestByOrigin.has(originKey)) continue;
    latestByOrigin.set(originKey, {
      lifecycle: row.lifecycle_state_after_event,
      entitlement: row.entitlement_after_event_jpy,
    });
  }
  return latestByOrigin;
}

const CSV_INJECTION_PREFIX_RE = /^[=+\-@\t\r]/;

export function normalizeExportCellV1(value: string | number): string {
  const raw = typeof value === 'number' ? String(value) : value;
  const needsInjectionGuard = CSV_INJECTION_PREFIX_RE.test(raw);
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const cell = needsInjectionGuard ? `'${normalized}` : normalized;
  if (/[",\n]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

export function serializeExportCsvV1(headers: readonly string[], rows: ExportRowV1[]): string {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((key) => normalizeExportCellV1(row[key] ?? '')).join(','));
  }
  return `${lines.join('\n')}\n`;
}

export function parseUtcRangeV1(fromRaw: string, toRaw: string): {
  ok: true;
  fromMs: number;
  toMs: number;
} | {
  ok: false;
  error: 'INVALID_RANGE' | 'RANGE_TOO_WIDE';
} {
  if (!UTC_INSTANT_Z_RE.test(fromRaw) || !UTC_INSTANT_Z_RE.test(toRaw)) {
    return { ok: false, error: 'INVALID_RANGE' };
  }
  const fromMs = Date.parse(fromRaw);
  const toMs = Date.parse(toRaw);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs < fromMs) {
    return { ok: false, error: 'INVALID_RANGE' };
  }
  if (toMs - fromMs > M55_R7_MAX_RANGE_MS) {
    return { ok: false, error: 'RANGE_TOO_WIDE' };
  }
  return { ok: true, fromMs, toMs };
}

export function parseBoundedEpochRangeV1(
  fromMs: number,
  toMs: number,
): { ok: true; fromMs: number; toMs: number } | { ok: false; error: 'INVALID_RANGE' | 'RANGE_TOO_WIDE' } {
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs < fromMs) {
    return { ok: false, error: 'INVALID_RANGE' };
  }
  if (toMs - fromMs > M55_R7_MAX_RANGE_MS) {
    return { ok: false, error: 'RANGE_TOO_WIDE' };
  }
  return { ok: true, fromMs, toMs };
}

export function assertRowCountWithinExportLimitV1(rowCount: number): void {
  if (rowCount > M55_R7_EXPORT_MAX_ROWS) {
    throw new Error('EXPORT_ROW_LIMIT_EXCEEDED');
  }
}
