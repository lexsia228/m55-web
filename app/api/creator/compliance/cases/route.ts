import { NextResponse } from 'next/server';
import { resolveCreatorContextFromSession } from '../../../../../lib/m55/creatorDashboard/creatorContext';
import {
  loadOwnedComplianceCasesPageV1,
  parseComplianceCaseKeysetCursorV1,
} from '../../../../../lib/m55/creatorDashboard/dashboardReadModel';
import { deriveDisplayReferenceV1 } from '../../../../../lib/m55/creatorDashboard/displayReference';
import {
  parseBoundedEpochRangeV1,
  parseUtcRangeV1,
} from '../../../../../lib/m55/creatorDashboard/reconciliationExport';
import { PRIVATE_RESPONSE_HEADERS } from '../../../../../lib/m55/creatorDistribution/security';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_RANGE_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const ctx = await resolveCreatorContextFromSession();
  if (!ctx.ok) {
    const status = ctx.error === 'UNAUTHORIZED' ? 401 : 403;
    return NextResponse.json({ error: ctx.error }, { status, headers: PRIVATE_RESPONSE_HEADERS });
  }
  if (!ctx.dashboardHistoryReadable) {
    return NextResponse.json({ error: 'COMPLIANCE_NOT_AVAILABLE' }, { status: 403, headers: PRIVATE_RESPONSE_HEADERS });
  }

  const url = new URL(request.url);
  const fromParam = url.searchParams.get('from');
  const toParam = url.searchParams.get('to');
  let fromMs: number;
  let toMs: number;
  if (fromParam && toParam) {
    const parsedUtc = parseUtcRangeV1(fromParam, toParam);
    if (!parsedUtc.ok) {
      return NextResponse.json({ error: parsedUtc.error }, { status: 400, headers: PRIVATE_RESPONSE_HEADERS });
    }
    fromMs = parsedUtc.fromMs;
    toMs = parsedUtc.toMs;
  } else {
    toMs = url.searchParams.has('toMs') ? Number(url.searchParams.get('toMs')) : Date.now();
    fromMs = url.searchParams.has('fromMs')
      ? Number(url.searchParams.get('fromMs'))
      : toMs - DEFAULT_RANGE_MS;
    const parsed = parseBoundedEpochRangeV1(fromMs, toMs);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400, headers: PRIVATE_RESPONSE_HEADERS });
    }
    fromMs = parsed.fromMs;
    toMs = parsed.toMs;
  }

  const cursor = parseComplianceCaseKeysetCursorV1(url.searchParams.get('cursor'));

  try {
    const page = await loadOwnedComplianceCasesPageV1({
      creatorEconomicIdentityId: ctx.creatorEconomicIdentityId,
      fromMs,
      toMs,
      cursor,
      limit: 50,
      displayReferenceFor: deriveDisplayReferenceV1,
    });
    return NextResponse.json(
      { range: { fromMs, toMs }, cases: page.rows, nextCursor: page.nextCursor },
      { headers: PRIVATE_RESPONSE_HEADERS },
    );
  } catch {
    return NextResponse.json({ error: 'COMPLIANCE_UNAVAILABLE' }, { status: 503, headers: PRIVATE_RESPONSE_HEADERS });
  }
}
