import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getLatestDraftForUser } from '../../../../../lib/m55/dtrDraftDb';

export const dynamic = 'force-dynamic';

/**
 * Latest server draft for signed-in user (DB SSOT for carry-over).
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const row = await getLatestDraftForUser(userId);
  if (!row?.birth_date || !row.nickname?.trim()) {
    return NextResponse.json({ draft: null });
  }

  return NextResponse.json({
    draft: {
      nickname: row.nickname.trim(),
      birthDate: String(row.birth_date).slice(0, 10),
      extraJson: row.extra_json ?? {},
    },
  });
}
