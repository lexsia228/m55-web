import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { callAdmitQualifiedTouchRpcV1 } from '../../../../../../lib/m55/attribution/r5AdmitQualifiedTouchRpc';
import {
  buildContinuationClearCookieHeader,
  mintContinuationIdBytes,
  parseContinuationCookieValue,
} from '../../../../../../lib/m55/attribution/r5TouchContinuation';
import {
  M55_R5_TOUCH_ADMIT_RPC_TRANSPORT_ERROR,
  M55_R5_TOUCH_CONTEXT_READ_TRANSPORT_ERROR,
  M55_R5_TOUCH_INGEST_PRIVATE_HEADERS,
  M55_R5_TOUCH_SCHEMA_ATTRIBUTION_POLICY_VERSION,
  M55_R5_TOUCH_SCHEMA_TRACKING_CONTRACT_VERSION,
  M55_R5_TOUCH_TERMINAL_COOKIE_CLEAR_ERRORS,
  classifyAdmitQualifiedTouchRpcErrorV1,
  isEmptyHttpRequestBodyV1,
} from '../../../../../../lib/m55/attribution/r5TouchIngestContract';
import { computeQualifiedTouchPayloadFingerprintV1 } from '../../../../../../lib/m55/attribution/r5TouchPayloadFingerprint';
import { deriveAttributionBuyerSubjectLookupDigestV1 } from '../../../../../../lib/m55/attribution/r5TouchSchemaContract';
import { resolveTouchAdmissionServerContextV1 } from '../../../../../../lib/m55/attribution/r5TouchSelfReferralGuard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function responseWithOptionalCookieClear(
  body: Record<string, unknown>,
  status: number,
  clearCookie: boolean,
): NextResponse {
  const headers = new Headers(M55_R5_TOUCH_INGEST_PRIVATE_HEADERS);
  if (clearCookie) {
    headers.append('Set-Cookie', buildContinuationClearCookieHeader());
  }
  return NextResponse.json(body, { status, headers });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!isEmptyHttpRequestBodyV1(rawBody)) {
    return responseWithOptionalCookieClear({ error: 'INVALID_INPUT' }, 400, false);
  }

  const { userId } = await auth();
  if (!userId) {
    return responseWithOptionalCookieClear({ error: 'UNAUTHORIZED' }, 401, false);
  }

  let buyerDigest: string;
  try {
    buyerDigest = deriveAttributionBuyerSubjectLookupDigestV1(userId);
  } catch {
    return responseWithOptionalCookieClear({ error: 'UNAUTHORIZED' }, 401, false);
  }

  const continuationIdBytes = parseContinuationCookieValue(request.headers.get('cookie'));
  if (!continuationIdBytes) {
    return responseWithOptionalCookieClear({ error: 'CONTINUATION_NOT_FOUND' }, 409, true);
  }

  let ctx;
  try {
    ctx = await resolveTouchAdmissionServerContextV1({
      continuationIdBytes,
      buyerClerkUserId: userId,
    });
  } catch {
    return responseWithOptionalCookieClear(
      { error: M55_R5_TOUCH_CONTEXT_READ_TRANSPORT_ERROR },
      503,
      false,
    );
  }

  if (!ctx.ok) {
    const clearCookie = M55_R5_TOUCH_TERMINAL_COOKIE_CLEAR_ERRORS.has(ctx.errorCode);
    return responseWithOptionalCookieClear({ error: ctx.errorCode }, 409, clearCookie);
  }

  const candidateTouchEventKeyBytes = ctx.isBound
    ? (ctx.boundTouchEventKeyBytes as Buffer)
    : mintContinuationIdBytes();
  const candidateQualifiedTouchAtMs = ctx.isBound
    ? (ctx.boundQualifiedTouchAtMs as number)
    : Date.now();
  const payloadFingerprint = ctx.isBound
    ? (ctx.boundPayloadFingerprint as string)
    : computeQualifiedTouchPayloadFingerprintV1({
        qualifiedActionKind: ctx.qualifiedActionKind,
        tokenVersion: ctx.tokenVersion,
        tokenDigest: ctx.tokenDigest,
        qualifiedTouchAtMs: candidateQualifiedTouchAtMs,
        trackingContractVersion: M55_R5_TOUCH_SCHEMA_TRACKING_CONTRACT_VERSION,
        attributionPolicyVersion: M55_R5_TOUCH_SCHEMA_ATTRIBUTION_POLICY_VERSION,
      });

  try {
    const result = await callAdmitQualifiedTouchRpcV1({
      continuationIdBytes,
      clerkSubjectLookupDigest: buyerDigest,
      qualifiedActionKind: ctx.qualifiedActionKind,
      candidateTouchEventKeyBytes,
      candidateQualifiedTouchAtMs,
      payloadFingerprint,
      trackingContractVersion: M55_R5_TOUCH_SCHEMA_TRACKING_CONTRACT_VERSION,
      attributionPolicyVersion: M55_R5_TOUCH_SCHEMA_ATTRIBUTION_POLICY_VERSION,
    });

    return responseWithOptionalCookieClear(
      {
        ok: true,
        outcome: result.outcome,
        qualifiedActionKind: ctx.qualifiedActionKind,
        trackingLane: 'CREATOR',
      },
      200,
      true,
    );
  } catch (error) {
    const classified = classifyAdmitQualifiedTouchRpcErrorV1(
      error instanceof Error ? { message: error.message } : error,
    );
    if (classified === M55_R5_TOUCH_ADMIT_RPC_TRANSPORT_ERROR) {
      return responseWithOptionalCookieClear(
        { error: M55_R5_TOUCH_ADMIT_RPC_TRANSPORT_ERROR },
        503,
        false,
      );
    }
    const clearCookie = M55_R5_TOUCH_TERMINAL_COOKIE_CLEAR_ERRORS.has(classified);
    return responseWithOptionalCookieClear({ error: classified }, 409, clearCookie);
  }
}
