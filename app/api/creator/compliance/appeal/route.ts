import { NextResponse } from 'next/server';
import { loadOwnCreatorEconomicIdentityId, openOrCorrectCaseV1 } from '../../../../../lib/m55/compliance/r5ComplianceControlPlane';
import { PRIVATE_RESPONSE_HEADERS, requireCreatorUserId } from '../../../../../lib/m55/creatorDistribution/security';

export const dynamic = 'force-dynamic';

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: PRIVATE_RESPONSE_HEADERS });
}

export async function POST(request: Request) {
  const userId = await requireCreatorUserId();
  if (!userId) return fail('UNAUTHORIZED', 401);
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return fail('INVALID_INPUT', 400);
  }
  const action = body.action;
  const reason = body.reason;
  const evidence = body.evidence;
  if (action !== 'OPEN_APPEAL' && action !== 'OPEN_DISCREPANCY' && action !== 'CORRECTION') {
    return fail('INVALID_INPUT', 400);
  }
  if (typeof reason !== 'string' || reason.length < 1 || reason.length > 500) return fail('INVALID_INPUT', 400);
  if (typeof evidence !== 'string' || evidence.length < 1 || evidence.length > 4000) return fail('INVALID_INPUT', 400);
  if (action === 'OPEN_APPEAL' && typeof body.adverseDecisionId !== 'string') return fail('INVALID_INPUT', 400);
  if (action === 'OPEN_APPEAL' && ('contentId' in body || 'purchaseAttemptId' in body)) return fail('INVALID_INPUT', 400);
  if (action === 'OPEN_DISCREPANCY' && body.adverseDecisionId != null) return fail('INVALID_INPUT', 400);
  if (action === 'CORRECTION' && typeof body.caseId !== 'string') return fail('INVALID_INPUT', 400);
  try {
    const creatorEconomicIdentityId = await loadOwnCreatorEconomicIdentityId(userId);
    const result = await openOrCorrectCaseV1({
      creatorEconomicIdentityId,
      action,
      caseId: typeof body.caseId === 'string' ? body.caseId : null,
      adverseDecisionId: typeof body.adverseDecisionId === 'string' ? body.adverseDecisionId : null,
      contentId: action === 'OPEN_APPEAL' ? null : typeof body.contentId === 'string' ? body.contentId : null,
      purchaseAttemptId: action === 'OPEN_APPEAL' ? null : typeof body.purchaseAttemptId === 'string' ? body.purchaseAttemptId : null,
      reason,
      evidence,
    });
    return NextResponse.json(result, { headers: PRIVATE_RESPONSE_HEADERS });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'CASE_WRITE_FAILED';
    if (code === 'CREATOR_PROFILE_REQUIRED') return fail(code, 403);
    return fail('CASE_WRITE_FAILED', 503);
  }
}
