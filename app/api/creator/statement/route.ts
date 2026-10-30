import { NextResponse } from 'next/server';
import { resolveCreatorContextFromSession } from '../../../../lib/m55/creatorDashboard/creatorContext';
import { parseBoundedEpochRangeV1 } from '../../../../lib/m55/creatorDashboard/reconciliationExport';
import { PRIVATE_RESPONSE_HEADERS } from '../../../../lib/m55/creatorDistribution/security';
import { loadCreatorStatementBundleForSessionV1 } from '../../../../lib/m55/creatorStatement/creatorStatementService';

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
    return NextResponse.json({ error: 'STATEMENT_NOT_AVAILABLE' }, { status: 403, headers: PRIVATE_RESPONSE_HEADERS });
  }

  const url = new URL(request.url);
  const economicIdentityParam = url.searchParams.get('economicIdentityId');
  if (economicIdentityParam && economicIdentityParam !== ctx.creatorEconomicIdentityId) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403, headers: PRIVATE_RESPONSE_HEADERS });
  }

  const toMs = url.searchParams.has('toMs') ? Number(url.searchParams.get('toMs')) : Date.now();
  const fromMs = url.searchParams.has('fromMs') ? Number(url.searchParams.get('fromMs')) : toMs - DEFAULT_RANGE_MS;
  const parsed = parseBoundedEpochRangeV1(fromMs, toMs);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400, headers: PRIVATE_RESPONSE_HEADERS });
  }

  try {
    const statement = await loadCreatorStatementBundleForSessionV1({
      creatorEconomicIdentityId: ctx.creatorEconomicIdentityId,
      fromMs: parsed.fromMs,
      toMs: parsed.toMs,
    });
    return NextResponse.json({ profileStatus: ctx.profileStatus, statement }, { headers: PRIVATE_RESPONSE_HEADERS });
  } catch {
    return NextResponse.json({ error: 'STATEMENT_UNAVAILABLE' }, { status: 503, headers: PRIVATE_RESPONSE_HEADERS });
  }
}
