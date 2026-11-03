import { NextResponse } from 'next/server';
import { resolveCreatorContextFromSession } from '../../../../lib/m55/creatorDashboard/creatorContext';
import {
  loadCommissionActivityPageV1,
  loadDashboardSummaryV1,
  parseCommissionActivityKeysetCursorV1,
} from '../../../../lib/m55/creatorDashboard/dashboardReadModel';
import { deriveDisplayReferenceV1 } from '../../../../lib/m55/creatorDashboard/displayReference';
import { parseBoundedEpochRangeV1 } from '../../../../lib/m55/creatorDashboard/reconciliationExport';
import { PRIVATE_RESPONSE_HEADERS } from '../../../../lib/m55/creatorDistribution/security';

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
    return NextResponse.json({ error: 'DASHBOARD_NOT_AVAILABLE' }, { status: 403, headers: PRIVATE_RESPONSE_HEADERS });
  }

  const url = new URL(request.url);
  const toMs = url.searchParams.has('toMs')
    ? Number(url.searchParams.get('toMs'))
    : Date.now();
  const fromMs = url.searchParams.has('fromMs')
    ? Number(url.searchParams.get('fromMs'))
    : toMs - DEFAULT_RANGE_MS;
  const parsed = parseBoundedEpochRangeV1(fromMs, toMs);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400, headers: PRIVATE_RESPONSE_HEADERS });
  }

  const cursor = parseCommissionActivityKeysetCursorV1(url.searchParams.get('cursor'));

  try {
    const summary = await loadDashboardSummaryV1({
      creatorEconomicIdentityId: ctx.creatorEconomicIdentityId,
      fromMs: parsed.fromMs,
      toMs: parsed.toMs,
    });
    const activity = await loadCommissionActivityPageV1({
      creatorEconomicIdentityId: ctx.creatorEconomicIdentityId,
      fromMs: parsed.fromMs,
      toMs: parsed.toMs,
      cursor,
      displayReferenceFor: deriveDisplayReferenceV1,
      limit: 50,
    });
    return NextResponse.json(
      {
        profileStatus: ctx.profileStatus,
        range: { fromMs: parsed.fromMs, toMs: parsed.toMs },
        summary,
        commissionActivity: activity,
      },
      { headers: PRIVATE_RESPONSE_HEADERS },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'DASHBOARD_READ_INCOMPLETE') {
      return NextResponse.json({ error: 'DASHBOARD_READ_INCOMPLETE' }, { status: 503, headers: PRIVATE_RESPONSE_HEADERS });
    }
    return NextResponse.json({ error: 'DASHBOARD_UNAVAILABLE' }, { status: 503, headers: PRIVATE_RESPONSE_HEADERS });
  }
}
