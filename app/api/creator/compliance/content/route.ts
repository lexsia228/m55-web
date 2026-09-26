import { NextResponse } from 'next/server';
import { registerOrRescanContentV1, loadOwnCreatorEconomicIdentityId } from '../../../../../lib/m55/compliance/r5ComplianceControlPlane';
import { PRIVATE_RESPONSE_HEADERS, requireCreatorUserId } from '../../../../../lib/m55/creatorDistribution/security';

export const dynamic = 'force-dynamic';

const LOCATOR_RE = /^https:\/\/[A-Za-z0-9.-]+\//i;

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
  const platformSource = body.platformSource;
  const sourceLocator = body.sourceLocator;
  const bodyText = body.bodyText ?? null;
  const contentId = body.contentId ?? null;
  if (action !== 'REGISTER' && action !== 'RESCAN' && action !== 'REMOVAL') return fail('INVALID_INPUT', 400);
  if (typeof platformSource !== 'string' || platformSource.length < 1 || platformSource.length > 80) return fail('INVALID_INPUT', 400);
  if (
    typeof sourceLocator !== 'string' ||
    !LOCATOR_RE.test(sourceLocator) ||
    sourceLocator.length > 2000 ||
    sourceLocator.includes('@') ||
    /localhost|127\.0\.0\.1|0\.0\.0\.0|10\.|192\.168\.|169\.254\./i.test(sourceLocator)
  ) return fail('INVALID_INPUT', 400);
  if (bodyText != null && (typeof bodyText !== 'string' || bodyText.length > 8000)) return fail('CONTENT_TEXT_TOO_LARGE', 400);
  if (contentId != null && typeof contentId !== 'string') return fail('INVALID_INPUT', 400);
  try {
    const creatorEconomicIdentityId = await loadOwnCreatorEconomicIdentityId(userId);
    const result = await registerOrRescanContentV1({
      creatorEconomicIdentityId,
      action,
      platformSource,
      sourceLocator,
      bodyText,
      contentId,
    });
    return NextResponse.json(result, { headers: PRIVATE_RESPONSE_HEADERS });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'CONTENT_RECORD_FAILED';
    if (code === 'CONTENT_TEXT_TOO_LARGE') return fail(code, 400);
    if (code === 'CREATOR_PROFILE_REQUIRED') return fail(code, 403);
    return fail('CONTENT_RECORD_FAILED', 503);
  }
}
