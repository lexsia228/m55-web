import { NextResponse } from 'next/server';
import { resolveCreatorContextFromSession } from '../../../../../lib/m55/creatorDashboard/creatorContext';
import {
  loadCommissionActivityPageV1,
  parseCommissionActivityKeysetCursorV1,
} from '../../../../../lib/m55/creatorDashboard/dashboardReadModel';
import { deriveDisplayReferenceV1 } from '../../../../../lib/m55/creatorDashboard/displayReference';
import {
  M55_R7_EXPORT_KEYSET_PAGE_SIZE,
  M55_R7_EXPORT_MAX_ROWS,
  assertRowCountWithinExportLimitV1,
  parseUtcRangeV1,
  serializeExportCsvV1,
} from '../../../../../lib/m55/creatorDashboard/reconciliationExport';
import { PRIVATE_RESPONSE_HEADERS } from '../../../../../lib/m55/creatorDistribution/security';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EXPORT_HEADERS = [
  'displayReference',
  'recordedAt',
  'lifecycleState',
  'commissionDeltaJpy',
  'entitlementAfterEventJpy',
  'releaseAtMs',
  'publicReasonLabel',
  'eventFamily',
] as const;

export async function GET(request: Request) {
  const ctx = await resolveCreatorContextFromSession();
  if (!ctx.ok) {
    const status = ctx.error === 'UNAUTHORIZED' ? 401 : 403;
    return NextResponse.json({ error: ctx.error }, { status, headers: PRIVATE_RESPONSE_HEADERS });
  }
  if (!ctx.dashboardHistoryReadable) {
    return NextResponse.json({ error: 'EXPORT_NOT_AVAILABLE' }, { status: 403, headers: PRIVATE_RESPONSE_HEADERS });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  if (!from || !to) {
    return NextResponse.json({ error: 'INVALID_RANGE' }, { status: 400, headers: PRIVATE_RESPONSE_HEADERS });
  }
  const parsed = parseUtcRangeV1(from, to);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400, headers: PRIVATE_RESPONSE_HEADERS });
  }

  const rows: Record<string, string | number>[] = [];
  let cursor: string | null = null;
  let guard = 0;
  while (rows.length <= M55_R7_EXPORT_MAX_ROWS) {
    const page = await loadCommissionActivityPageV1({
      creatorEconomicIdentityId: ctx.creatorEconomicIdentityId,
      fromMs: parsed.fromMs,
      toMs: parsed.toMs,
      cursor: parseCommissionActivityKeysetCursorV1(cursor),
      displayReferenceFor: deriveDisplayReferenceV1,
      limit: M55_R7_EXPORT_KEYSET_PAGE_SIZE,
    });
    for (const row of page.rows) {
      rows.push({
        displayReference: row.displayReference,
        recordedAt: row.recordedAt,
        lifecycleState: row.lifecycleStateAfterEvent,
        commissionDeltaJpy: row.commissionDeltaJpy,
        entitlementAfterEventJpy: row.entitlementAfterEventJpy,
        releaseAtMs: row.releaseAtMs,
        publicReasonLabel: row.publicReasonLabel,
        eventFamily: row.eventFamily,
      });
      if (rows.length > M55_R7_EXPORT_MAX_ROWS) break;
    }
    if (rows.length > M55_R7_EXPORT_MAX_ROWS) {
      return NextResponse.json(
        { error: 'EXPORT_ROW_LIMIT_EXCEEDED' },
        { status: 400, headers: PRIVATE_RESPONSE_HEADERS },
      );
    }
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
    guard += 1;
    if (guard > 25) break;
  }

  try {
    assertRowCountWithinExportLimitV1(rows.length);
  } catch {
    return NextResponse.json(
      { error: 'EXPORT_ROW_LIMIT_EXCEEDED' },
      { status: 400, headers: PRIVATE_RESPONSE_HEADERS },
    );
  }

  const csv = serializeExportCsvV1(EXPORT_HEADERS, rows);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      ...PRIVATE_RESPONSE_HEADERS,
      'content-type': 'text/csv; charset=utf-8',
    },
  });
}
