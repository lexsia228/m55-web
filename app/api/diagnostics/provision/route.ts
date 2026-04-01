import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`ENV_MISSING:${name}`);
  return v;
}

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, stage: "auth", error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const u = await currentUser();

    const url = mustEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = mustEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabaseAdmin = createClient(url, serviceKey, {
      db: { schema: "app" },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    // まずテーブルが見えるか確認（未作成schema未公開権限問題がここで出る）
    const ping = await supabaseAdmin.from("user_profiles").select("clerk_user_id").limit(1);
    if (ping.error) {
      return NextResponse.json(
        { ok: false, stage: "supabase_ping", error: ping.error.message },
        { status: 500 }
      );
    }

    const displayName =
      u?.fullName ||
      [u?.lastName, u?.firstName].filter(Boolean).join(" ").trim() ||
      userId;

    const up = await supabaseAdmin
      .from("user_profiles")
      .upsert(
        {
          clerk_user_id: userId,
          display_name: displayName,
          given_name: u?.firstName ?? null,
          family_name: u?.lastName ?? null,
          expires_at: "9999-12-31T23:59:59.000Z",
          meta_json: {},
        },
        { onConflict: "clerk_user_id" }
      );

    if (up.error) {
      return NextResponse.json(
        { ok: false, stage: "db_write", error: up.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, stage: "done" });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, stage: "exception", error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
