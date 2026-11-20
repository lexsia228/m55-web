const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type OwnedComplianceCaseRpcRowV1 = {
  case_id: string;
  case_kind: string;
  status: string;
  opened_at: string;
  resolved_at: string | null;
  decision: string | null;
  decision_reason: string | null;
};

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function assertRpcRowV1(value: unknown): OwnedComplianceCaseRpcRowV1 {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('COMPLIANCE_READ_FAILED');
  }
  const row = value as Record<string, unknown>;
  const caseId = row.case_id;
  if (typeof caseId !== 'string' || !UUID_RE.test(caseId)) {
    throw new Error('COMPLIANCE_READ_FAILED');
  }
  if (typeof row.case_kind !== 'string' || typeof row.status !== 'string') {
    throw new Error('COMPLIANCE_READ_FAILED');
  }
  if (!isIsoTimestamp(row.opened_at)) {
    throw new Error('COMPLIANCE_READ_FAILED');
  }
  const resolvedAt = row.resolved_at;
  if (resolvedAt !== null && resolvedAt !== undefined && !isIsoTimestamp(resolvedAt)) {
    throw new Error('COMPLIANCE_READ_FAILED');
  }
  const decision = row.decision;
  if (decision !== null && decision !== undefined && typeof decision !== 'string') {
    throw new Error('COMPLIANCE_READ_FAILED');
  }
  const decisionReason = row.decision_reason;
  if (
    decisionReason !== null &&
    decisionReason !== undefined &&
    typeof decisionReason !== 'string'
  ) {
    throw new Error('COMPLIANCE_READ_FAILED');
  }
  return {
    case_id: caseId,
    case_kind: row.case_kind,
    status: row.status,
    opened_at: row.opened_at,
    resolved_at: (resolvedAt as string | null | undefined) ?? null,
    decision: (decision as string | null | undefined) ?? null,
    decision_reason: (decisionReason as string | null | undefined) ?? null,
  };
}

export function parseOwnedComplianceCasesRpcPageV1(
  data: unknown,
  pageSize: number,
): { rows: OwnedComplianceCaseRpcRowV1[]; hasMore: boolean } {
  if (data == null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('COMPLIANCE_READ_FAILED');
  }
  const page = data as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(page, 'rows')) {
    throw new Error('COMPLIANCE_READ_FAILED');
  }
  if (!Object.prototype.hasOwnProperty.call(page, 'has_more')) {
    throw new Error('COMPLIANCE_READ_FAILED');
  }
  if (!Array.isArray(page.rows) || typeof page.has_more !== 'boolean') {
    throw new Error('COMPLIANCE_READ_FAILED');
  }

  const rowsRaw = page.rows;
  const hasMore = page.has_more;

  if (rowsRaw.length > pageSize) {
    throw new Error('COMPLIANCE_READ_FAILED');
  }
  if (hasMore && rowsRaw.length !== pageSize) {
    throw new Error('COMPLIANCE_READ_FAILED');
  }
  if (!hasMore && rowsRaw.length === 0) {
    return { rows: [], hasMore: false };
  }

  const rows = rowsRaw.map(assertRpcRowV1);
  return { rows, hasMore };
}