#!/usr/bin/env node
/**
 * 指定 Clerk user_id の entitlement_rights / entitlements / dtr_report_snapshots を表示する。
 * Usage: node scripts/diag-dtr-user.mjs <clerk_user_id>
 * Requires: .env.local に NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnvLocal() {
  const p = resolve(process.cwd(), '.env.local');
  const raw = readFileSync(p, 'utf8');
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[k] = v;
  }
}

const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node scripts/diag-dtr-user.mjs <clerk_user_id>');
  process.exit(1);
}

loadEnvLocal();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const { data: rights, error: e1 } = await db
  .from('entitlement_rights')
  .select('*')
  .eq('user_id', uid)
  .eq('right_key', 'm55_p:core_origin');

const { data: ents, error: e2 } = await db
  .from('entitlements')
  .select('*')
  .eq('user_id', uid)
  .eq('product_id', 'DTR_CORE_STATIC_V1');

const { data: snaps, error: e3 } = await db
  .from('dtr_report_snapshots')
  .select('user_id, product_id, checkout_session_id')
  .eq('user_id', uid)
  .eq('product_id', 'DTR_CORE_STATIC_V1');

const out = {
  userId: uid,
  entitlement_rights: rights ?? [],
  entitlements: ents ?? [],
  dtr_report_snapshots: snaps ?? [],
  errors: { entitlement_rights: e1?.message, entitlements: e2?.message, snapshots: e3?.message },
};

console.log(JSON.stringify(out, null, 2));

const ownedByRights = Array.isArray(rights) && rights.length > 0;
const ownedByEnts = Array.isArray(ents) && ents.some((r) => r.status === 'active');
const hasSnap = Array.isArray(snaps) && snaps.length > 0;

console.error(
  '[summary]',
  JSON.stringify({
    ownedHintFromDb: ownedByRights || ownedByEnts,
    hasPurchaseSnapshot: hasSnap,
    note: 'resolveEntryReportOwnership は entitlement_rights 優先、無ければ entitlements active で repair',
  })
);
