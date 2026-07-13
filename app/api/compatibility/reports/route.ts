import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { listOwnedCompatibilityReports } from '../../../../lib/m55/compatibility/compatibilityCommerceDb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: 'unauthorized' },
      {
        status: 401,
        headers: { 'Cache-Control': 'private, no-store, max-age=0' },
      },
    );
  }
  const result = await listOwnedCompatibilityReports(userId);
  return NextResponse.json(
    result,
    {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
        Vary: 'Cookie',
      },
    },
  );
}
