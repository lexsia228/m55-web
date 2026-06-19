import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { DTR_SAVED_REPORT_OWNERSHIP_PRODUCT_IDS } from '../../../../lib/oneTimeCheckout';
import { DTR_CORE_RIGHT_KEY } from '../../../../lib/m55/dtrCoreCheckoutFulfillment';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Pragma': 'no-cache',
};

const TIER_RETENTION: Record<string, number> = { free: 0, standard: 30, premium: 90 };
const TIER_CHAT_LIMIT: Record<string, number> = { free: 1, standard: 5, premium: -1 };
const TIER_TAROT_LIMIT: Record<string, number> = { free: 1, standard: 5, premium: -1 };

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS });
  }

  try {
    const db = getSupabaseAdmin();

    const [rightsRes, entRes] = await Promise.all([
      db.from('entitlement_rights').select('right_key, right_value, expires_at').eq('user_id', userId),
      db
        .from('entitlements')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .in('product_id', [...DTR_SAVED_REPORT_OWNERSHIP_PRODUCT_IDS])
        .limit(1),
    ]);

    const tier = 'free';
    const dtrRights: string[] = [];

    const rightsRows = (rightsRes.data ?? []) as Array<{ right_key?: string; expires_at?: string | null }>;
    for (const r of rightsRows) {
      const key = r.right_key ?? '';
      const exp = r.expires_at ? new Date(r.expires_at).getTime() : null;
      if (exp !== null && exp < Date.now()) continue;
      if (key.startsWith('m55_p:')) dtrRights.push(key);
    }

    const hasCoreInList = dtrRights.includes(DTR_CORE_RIGHT_KEY);
    const hasActiveProductRow =
      !entRes.error &&
      Array.isArray(entRes.data) &&
      entRes.data.length > 0 &&
      !!(entRes.data[0] as { id?: string } | undefined)?.id;
    if (hasActiveProductRow && !hasCoreInList) {
      dtrRights.push(DTR_CORE_RIGHT_KEY);
    }

    return NextResponse.json(
      {
        tier,
        retention_days: TIER_RETENTION[tier] ?? 0,
        chat_daily_limit: TIER_CHAT_LIMIT[tier] ?? 1,
        tarot_daily_limit: TIER_TAROT_LIMIT[tier] ?? 1,
        dtr_rights: dtrRights,
      },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  } catch {
    return NextResponse.json(
      { tier: 'free', retention_days: 0, chat_daily_limit: 1, tarot_daily_limit: 1, dtr_rights: [] },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  }
}
