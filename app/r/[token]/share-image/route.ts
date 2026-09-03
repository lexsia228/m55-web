import { CANONICAL_PRODUCTION_ORIGIN } from '../../../../lib/m55/freeResult/privacySafeShareCardV1';
import { resolvePublicShareSpecFromToken } from '../../../../lib/m55/narrative/projectPublicShareV1';
import {
  parseShareExportAspectRatio,
  renderPublicShareExportImage,
} from '../../../../lib/m55/narrative/publicShareImageV1';
import { resolvePublicShareArtworkFromToken } from '../../../../lib/m55/narrative/resolvePublicShareArtworkV1';

export const runtime = 'edge';

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { token } = await context.params;
  const aspect = parseShareExportAspectRatio(
    new URL(request.url).searchParams.get('aspect'),
  );
  if (!aspect) {
    return new Response('Invalid aspect', { status: 400 });
  }

  const spec = resolvePublicShareSpecFromToken(token);
  if (!spec) {
    return new Response('Not found', { status: 404 });
  }

  const artPath = resolvePublicShareArtworkFromToken(token);
  const artUrl = artPath ? `${CANONICAL_PRODUCTION_ORIGIN}${artPath}` : null;
  return renderPublicShareExportImage(spec, aspect, artUrl);
}
