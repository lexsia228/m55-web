import { NextResponse } from 'next/server';
import { lookup } from 'node:dns/promises';
import {
  defaultFetchFn,
  runSupabaseRuntimeDnsProbe,
} from '../../../../lib/m55/supabaseRuntimeDnsProbe.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const APPROVED_BRANCH = 'feat/m55-paid-lp-canonical-wave1' as const;

const NOT_FOUND_BODY = { error: 'not_found' } as const;
const INTERNAL_ERROR_BODY = { error: 'internal_error' } as const;

export async function GET() {
  const isPreview = process.env.VERCEL_ENV === 'preview';
  const branchMatches = process.env.VERCEL_GIT_COMMIT_REF === APPROVED_BRANCH;

  if (!isPreview || !branchMatches) {
    return NextResponse.json(NOT_FOUND_BODY, {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  try {
    const result = await runSupabaseRuntimeDnsProbe(
      {
        envValue: process.env.NEXT_PUBLIC_SUPABASE_URL,
        isPreview,
        branchMatches,
      },
      {
        lookupFn: lookup,
        fetchFn: defaultFetchFn,
      },
    );

    return NextResponse.json(result, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json(INTERNAL_ERROR_BODY, {
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
