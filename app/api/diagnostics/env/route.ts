import { NextResponse } from "next/server";

export const runtime = "nodejs";

const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
] as const;

export async function GET() {
  const present = Object.fromEntries(
    KEYS.map((k) => [k, process.env[k] ? `len=${String(process.env[k]).length}` : "MISSING"])
  );
  return NextResponse.json({ ok: true, present });
}
