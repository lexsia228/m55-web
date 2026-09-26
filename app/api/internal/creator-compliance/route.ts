import { NextResponse } from 'next/server';
import {
  listOpenComplianceCasesV1,
  resolveComplianceCaseV1,
  reviewerActorRefV1,
} from '../../../../lib/m55/compliance/r5ComplianceControlPlane';
import { PRIVATE_RESPONSE_HEADERS, requireReviewerId } from '../../../../lib/m55/creatorDistribution/security';

export const dynamic = 'force-dynamic';

const KEEP_HOLD_DECISIONS = new Set(['KEEP_HOLD', 'REQUEST_CORRECTION']);
const RESOLVE_DECISIONS = new Set(['RELEASE', 'PAUSE_CREATOR', 'TERMINATE_PARTNERSHIP']);

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: PRIVATE_RESPONSE_HEADERS });
}

export async function GET() {
  const reviewerId = await requireReviewerId();
  if (!reviewerId) return fail('FORBIDDEN', 403);
  try {
    return NextResponse.json({ cases: await listOpenComplianceCasesV1() }, { headers: PRIVATE_RESPONSE_HEADERS });
  } catch {
    return fail('QUEUE_UNAVAILABLE', 503);
  }
}

export async function POST(request: Request) {
  const reviewerId = await requireReviewerId();
  if (!reviewerId) return fail('FORBIDDEN', 403);
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return fail('INVALID_INPUT', 400);
  }
  const action = body.action;
  const decision = body.decision;
  const decisionReason = body.decisionReason;
  const caseId = body.caseId;
  if (action !== 'RESOLVE' && action !== 'KEEP_HOLD') return fail('INVALID_INPUT', 400);
  if (typeof caseId !== 'string' || typeof decision !== 'string' || typeof decisionReason !== 'string') {
    return fail('INVALID_INPUT', 400);
  }
  if (decisionReason.length < 1 || decisionReason.length > 500) return fail('INVALID_INPUT', 400);
  if (action === 'KEEP_HOLD' && !KEEP_HOLD_DECISIONS.has(decision)) return fail('INVALID_INPUT', 400);
  if (action === 'RESOLVE' && !RESOLVE_DECISIONS.has(decision)) return fail('INVALID_INPUT', 400);
  try {
    const result = await resolveComplianceCaseV1({
      caseId,
      reviewerActorRef: reviewerActorRefV1(reviewerId),
      action,
      decision,
      decisionReason,
    });
    return NextResponse.json(result, { headers: PRIVATE_RESPONSE_HEADERS });
  } catch {
    return fail('CASE_RESOLVE_FAILED', 503);
  }
}
