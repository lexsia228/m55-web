import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { applicationInput, CREATOR_TERMS_VERSION } from '../../../../lib/m55/creatorDistribution/contract';
import { submitCreatorApplication } from '../../../../lib/m55/creatorDistribution/repository';
import { canonicalPublicMediaUrl, PRIVATE_RESPONSE_HEADERS, requireCreatorUserId } from '../../../../lib/m55/creatorDistribution/security';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const userId = await requireCreatorUserId();
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401, headers: PRIVATE_RESPONSE_HEADERS });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }
  if (typeof body === 'object' && body !== null && 'action' in body && body.action === 'REACCEPT_TERMS') {
    const candidate = body as Record<string, unknown>;
    if (candidate.termsVersion !== CREATOR_TERMS_VERSION || candidate.termsAccepted !== true ||
        typeof candidate.applicationId !== 'string') return NextResponse.json({ error: 'TERMS_INVALID' }, { status: 400 });
    const { error } = await (getSupabaseAdmin() as any).rpc('m55_creator_reaccept_terms_v1', {
      p_application_id: candidate.applicationId, p_user_id: userId, p_terms_version: CREATOR_TERMS_VERSION,
    });
    if (error) return NextResponse.json({ error: 'TERMS_REACCEPT_FAILED' }, { status: 409 });
    return NextResponse.json({ ok: true }, { headers: PRIVATE_RESPONSE_HEADERS });
  }
  const parsed = applicationInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'APPLICATION_INVALID' }, { status: 400 });
  const mediaUrl = canonicalPublicMediaUrl(parsed.data.mediaUrl);
  if (!mediaUrl) return NextResponse.json({ error: 'MEDIA_URL_INVALID' }, { status: 400 });
  try {
    const id = await submitCreatorApplication(userId, parsed.data, mediaUrl);
    return NextResponse.json({ ok: true, applicationId: id }, { status: 201, headers: PRIVATE_RESPONSE_HEADERS });
  } catch {
    return NextResponse.json({ error: 'APPLICATION_NOT_ACCEPTED' }, { status: 409, headers: PRIVATE_RESPONSE_HEADERS });
  }
}
