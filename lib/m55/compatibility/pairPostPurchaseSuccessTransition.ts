export const PAIR_POST_PURCHASE_SUCCESS_MARKER_VERSION = 'pair_post_purchase_success_v1';
export const PAIR_POST_PURCHASE_SUCCESS_STORAGE_KEY = 'm55.pair_post_purchase_success_v1';
export const PAIR_POST_PURCHASE_SUCCESS_MARKER_TTL_MS = 24 * 60 * 60 * 1000;

const REPORT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PairPostPurchaseSuccessMarkerV1 = {
  version: typeof PAIR_POST_PURCHASE_SUCCESS_MARKER_VERSION;
  ownerUserId: string;
  capturedAtMs: number;
  baselineReportIds: string[];
};

export type PairPostPurchaseSuccessClassification =
  | { kind: 'pending' }
  | { kind: 'ready'; reportId: string }
  | { kind: 'ambiguous' };

export function isUuidShapedReportId(value: string): boolean {
  return REPORT_ID_RE.test(value);
}

export function validateStrictUuidReportIdList(ids: readonly unknown[]): string[] | null {
  const seen = new Set<string>();
  const validated: string[] = [];
  for (const id of ids) {
    if (typeof id !== 'string') return null;
    if (!isUuidShapedReportId(id)) return null;
    if (seen.has(id)) return null;
    seen.add(id);
    validated.push(id);
  }
  return validated;
}

export function classifyOwnedReportsRelativeToBaseline(
  baselineReportIds: readonly string[],
  currentReportIds: readonly string[],
): PairPostPurchaseSuccessClassification {
  const baseline = validateStrictUuidReportIdList(baselineReportIds);
  const current = validateStrictUuidReportIdList(currentReportIds);
  if (!baseline || !current) return { kind: 'ambiguous' };

  const baselineSet = new Set(baseline);
  const newlyAppeared = current.filter((id) => !baselineSet.has(id));
  if (newlyAppeared.length === 0) return { kind: 'pending' };
  if (newlyAppeared.length === 1) return { kind: 'ready', reportId: newlyAppeared[0] };
  return { kind: 'ambiguous' };
}

function parseMarkerPayload(raw: string): PairPostPurchaseSuccessMarkerV1 | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as Record<string, unknown>;
    if (record.version !== PAIR_POST_PURCHASE_SUCCESS_MARKER_VERSION) return null;
    if (typeof record.ownerUserId !== 'string' || record.ownerUserId.length === 0) return null;
    if (typeof record.capturedAtMs !== 'number' || !Number.isFinite(record.capturedAtMs)) return null;
    if (!Array.isArray(record.baselineReportIds)) return null;
    const baselineReportIds = validateStrictUuidReportIdList(record.baselineReportIds);
    if (baselineReportIds === null) return null;
    return {
      version: PAIR_POST_PURCHASE_SUCCESS_MARKER_VERSION,
      ownerUserId: record.ownerUserId,
      capturedAtMs: record.capturedAtMs,
      baselineReportIds,
    };
  } catch {
    return null;
  }
}

export function writePairPostPurchaseSuccessMarker(
  storage: Storage | null | undefined,
  ownerUserId: string,
  baselineReportIds: readonly string[],
  nowMs = Date.now(),
): boolean {
  if (!storage || typeof ownerUserId !== 'string' || ownerUserId.length === 0) return false;
  const validatedBaseline = validateStrictUuidReportIdList(baselineReportIds);
  if (validatedBaseline === null) return false;
  const marker: PairPostPurchaseSuccessMarkerV1 = {
    version: PAIR_POST_PURCHASE_SUCCESS_MARKER_VERSION,
    ownerUserId,
    capturedAtMs: nowMs,
    baselineReportIds: validatedBaseline,
  };
  try {
    storage.setItem(PAIR_POST_PURCHASE_SUCCESS_STORAGE_KEY, JSON.stringify(marker));
    return true;
  } catch {
    return false;
  }
}

export function readPairPostPurchaseSuccessMarker(
  storage: Storage | null | undefined,
  ownerUserId: string,
  nowMs = Date.now(),
): PairPostPurchaseSuccessMarkerV1 | null {
  if (!storage || typeof ownerUserId !== 'string' || ownerUserId.length === 0) return null;
  let raw: string | null;
  try {
    raw = storage.getItem(PAIR_POST_PURCHASE_SUCCESS_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  const marker = parseMarkerPayload(raw);
  if (!marker) return null;
  if (marker.ownerUserId !== ownerUserId) return null;
  if (nowMs - marker.capturedAtMs > PAIR_POST_PURCHASE_SUCCESS_MARKER_TTL_MS) return null;
  if (nowMs < marker.capturedAtMs) return null;
  return marker;
}

export function clearPairPostPurchaseSuccessMarker(storage: Storage | null | undefined): void {
  if (!storage) return;
  try {
    storage.removeItem(PAIR_POST_PURCHASE_SUCCESS_STORAGE_KEY);
  } catch {
    // fail closed
  }
}

export function extractOwnedReportIdsFromReportsApiPayload(data: unknown): string[] | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  if (record.available !== true) return null;
  if (!Array.isArray(record.reports)) return null;

  const ids: unknown[] = [];
  for (const item of record.reports) {
    if (!item || typeof item !== 'object') return null;
    ids.push((item as { id?: unknown }).id);
  }
  return validateStrictUuidReportIdList(ids);
}

export function computeBoundedPollFetchTimeoutMs(
  deadlineAtMs: number,
  nowMs: number,
  maxFetchMs: number,
): number | null {
  const remainingMs = deadlineAtMs - nowMs;
  if (remainingMs <= 0) return null;
  const timeoutMs = Math.min(maxFetchMs, remainingMs);
  return timeoutMs > 0 ? timeoutMs : null;
}

export function computeBoundedPollDelayMs(
  deadlineAtMs: number,
  nowMs: number,
  pollIntervalMs: number,
): number | null {
  const remainingMs = deadlineAtMs - nowMs;
  if (remainingMs <= 0) return null;
  const delayMs = Math.min(pollIntervalMs, remainingMs);
  return delayMs > 0 ? delayMs : null;
}
