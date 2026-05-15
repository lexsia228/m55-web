import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    vercel_env: process.env.VERCEL_ENV ?? null,
    vercel_git_sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    vercel_branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    node_env: process.env.NODE_ENV ?? null,
  });
}
