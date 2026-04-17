import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import ConsultationRoomInput from '../../components/reply/ConsultationRoomInput';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin';

export default async function ReplyPage() {
  const { userId: clerkUserId } = await auth();
  let userId = clerkUserId;
  if (!userId && process.env.NODE_ENV !== 'production') {
    const h = await headers();
    const testUserId = h.get('x-m55-test-user-id')?.trim();
    if (testUserId) {
      userId = testUserId;
    }
  }

  let availableCount = 0;
  if (userId) {
    const db = getSupabaseAdmin() as any;
    const { data } = await db
      .from('reply_ticket_wallets')
      .select('available_count,status')
      .eq('user_id', userId)
      .maybeSingle();

    const count =
      typeof data?.available_count === 'number' ? data.available_count : 0;
    const isActive = data?.status === 'active';
    availableCount = isActive ? count : 0;
  }

  return (
    <main className="min-h-screen bg-background">
      <ConsultationRoomInput
        canGenerateReply={availableCount > 0}
        availableCount={availableCount}
      />
    </main>
  );
}