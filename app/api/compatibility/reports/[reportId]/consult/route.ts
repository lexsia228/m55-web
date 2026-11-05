import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  isOpaqueCompatibilityId,
} from '../../../../../../lib/m55/compatibility/compatibilityCommerceDb';
import { loadCompatibilityConsultRoom } from '../../../../../../lib/m55/compatibility/compatibilityConsultDb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0' };

type RouteParams = { params: Promise<{ reportId: string }> };

export async function GET(_req: Request, ctx: RouteParams) {
  const { reportId: rawId } = await ctx.params;
  const reportId = rawId?.trim() ?? '';

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: NO_STORE });
  }
  if (!isOpaqueCompatibilityId(reportId)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
  }

  const loaded = await loadCompatibilityConsultRoom(userId, reportId);
  if (!loaded.ok) {
    if (loaded.reason === 'not_owned') {
      return NextResponse.json({ error: 'not_owned' }, { status: 403, headers: NO_STORE });
    }
    if (loaded.reason === 'invalid') {
      return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
    }
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: NO_STORE });
  }

  const { room } = loaded;
  return NextResponse.json(
    {
      reportId: room.reportId,
      creditsRemaining: room.thread.creditsRemaining,
      creditsTotal: room.thread.creditsTotal,
      state: room.thread.state,
      messages: room.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      })),
    },
    { headers: { ...NO_STORE, Vary: 'Cookie' } },
  );
}
