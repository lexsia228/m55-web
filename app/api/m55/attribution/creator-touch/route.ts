import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { deriveAttributionBuyerSubjectLookupDigestV1 } from '../../../../../lib/m55/attribution/r5TouchSchemaContract';
import {
  mapRegistryErrorToHttpError,
  resolveCreatorTrackingTokenFromRegistryV1,
} from '../../../../../lib/m55/attribution/r5CreatorTrackingToken';
import { callCreateTouchContinuationRpcV1 } from '../../../../../lib/m55/attribution/r5CreateTouchContinuationRpc';
import {
  buildContinuationSetCookieHeader,
  mintContinuationIdBytes,
  parseContinuationCookieValue,
} from '../../../../../lib/m55/attribution/r5TouchContinuation';
import {
  M55_R5_TOUCH_CREATE_RPC_TRANSPORT_ERROR,
  M55_R5_TOUCH_INGEST_PRIVATE_HEADERS,
  classifyCreateTouchContinuationRpcErrorV1,
  parseCreatorTouchPhase1JsonBodyV1,
} from '../../../../../lib/m55/attribution/r5TouchIngestContract';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'INVALID_JSON' },
      { status: 400, headers: M55_R5_TOUCH_INGEST_PRIVATE_HEADERS },
    );
  }

  const parsedBody = parseCreatorTouchPhase1JsonBodyV1(body);
  if (!parsedBody.ok) {
    return NextResponse.json(
      { error: parsedBody.errorCode },
      { status: 400, headers: M55_R5_TOUCH_INGEST_PRIVATE_HEADERS },
    );
  }

  const tokenContext = await resolveCreatorTrackingTokenFromRegistryV1(parsedBody.token);
  if (!tokenContext.ok) {
    return NextResponse.json(
      { error: mapRegistryErrorToHttpError(tokenContext.errorCode) },
      { status: 409, headers: M55_R5_TOUCH_INGEST_PRIVATE_HEADERS },
    );
  }

  const { userId } = await auth();
  const qualifiedActionKind = userId
    ? 'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK'
    : 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION';

  let directBuyerDigest: string | null = null;
  if (qualifiedActionKind === 'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK') {
    if (!userId) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED' },
        { status: 401, headers: M55_R5_TOUCH_INGEST_PRIVATE_HEADERS },
      );
    }
    try {
      directBuyerDigest = deriveAttributionBuyerSubjectLookupDigestV1(userId);
    } catch {
      return NextResponse.json(
        { error: 'UNAUTHORIZED' },
        { status: 401, headers: M55_R5_TOUCH_INGEST_PRIVATE_HEADERS },
      );
    }
  }

  const cookieContinuationIdBytes = parseContinuationCookieValue(
    request.headers.get('cookie'),
  );
  const newContinuationIdBytes = mintContinuationIdBytes();

  try {
    const result = await callCreateTouchContinuationRpcV1({
      cookieContinuationIdBytes,
      newContinuationIdBytes,
      tokenDigest: tokenContext.tokenDigest,
      tokenVersion: tokenContext.tokenVersion,
      qualifiedActionKind,
      directBuyerSubjectLookupDigest: directBuyerDigest,
    });

    const headers = new Headers(M55_R5_TOUCH_INGEST_PRIVATE_HEADERS);
    headers.append('Set-Cookie', buildContinuationSetCookieHeader(result.continuationIdHex));

    return NextResponse.json(
      {
        ok: true,
        phase: result.outcome,
      },
      { status: 200, headers },
    );
  } catch (error) {
    const classified = classifyCreateTouchContinuationRpcErrorV1(
      error instanceof Error ? { message: error.message } : error,
    );
    if (classified === M55_R5_TOUCH_CREATE_RPC_TRANSPORT_ERROR) {
      return NextResponse.json(
        { error: M55_R5_TOUCH_CREATE_RPC_TRANSPORT_ERROR },
        { status: 503, headers: M55_R5_TOUCH_INGEST_PRIVATE_HEADERS },
      );
    }
    return NextResponse.json(
      { error: classified },
      { status: 409, headers: M55_R5_TOUCH_INGEST_PRIVATE_HEADERS },
    );
  }
}
