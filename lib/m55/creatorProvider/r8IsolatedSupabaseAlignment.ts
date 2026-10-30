import { isM55ProductionRuntime } from './runtimeEnvironment';

export type IsolatedSupabaseAlignmentResultV1 =
  | {
      ok: true;
      supabaseProjectRefSuffix: string;
      postgresHostKind: 'supabase_direct' | 'loopback' | 'other';
    }
  | { ok: false; reason: IsolatedSupabaseAlignmentFailureV1 };

export type IsolatedSupabaseAlignmentFailureV1 =
  | 'PRODUCTION_RUNTIME_BLOCKED'
  | 'SUPABASE_APP_URL_MISSING'
  | 'ISOLATED_DATABASE_URL_MISSING'
  | 'SUPABASE_SERVICE_ROLE_MISSING'
  | 'SUPABASE_PROJECT_REF_UNRESOLVED'
  | 'ISOLATED_DATABASE_PROJECT_MISMATCH'
  | 'ISOLATED_DATABASE_HOST_BLOCKED'
  | 'ISOLATED_DATABASE_URL_UNPARSEABLE';

const PRODUCTION_HOST_DENY = ['m55-soul', 'm55-web', 'vercel.app'] as const;

export function extractSupabaseProjectRefFromHttpUrlV1(raw: string): string | null {
  try {
    const host = new URL(raw.trim()).hostname.toLowerCase();
    const match = host.match(/^([a-z0-9]{8,32})\.supabase\.co$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function extractSupabaseProjectRefFromPostgresUrlV1(raw: string): string | null {
  try {
    const host = new URL(raw.trim()).hostname.toLowerCase();
    const direct = host.match(/^db\.([a-z0-9]{8,32})\.supabase\.co$/);
    if (direct?.[1]) return direct[1];
    const pooler = host.match(/^([a-z0-9]{8,32})\.pooler\.supabase\.com$/);
    if (pooler?.[1]) return pooler[1];
    return null;
  } catch {
    return null;
  }
}

function postgresHostKindV1(hostname: string): 'supabase_direct' | 'loopback' | 'other' {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return 'loopback';
  if (/\.supabase\.co$/.test(host) || /\.pooler\.supabase\.com$/.test(host)) return 'supabase_direct';
  return 'other';
}

export function evaluateIsolatedSupabaseAlignmentV1(
  env: NodeJS.ProcessEnv = process.env,
): IsolatedSupabaseAlignmentResultV1 {
  if (isM55ProductionRuntime(env)) {
    return { ok: false, reason: 'PRODUCTION_RUNTIME_BLOCKED' };
  }

  const appUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const isolatedDb = env.M55_R8_ISOLATED_DATABASE_URL?.trim() ?? '';
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';

  if (!appUrl) return { ok: false, reason: 'SUPABASE_APP_URL_MISSING' };
  if (!isolatedDb) return { ok: false, reason: 'ISOLATED_DATABASE_URL_MISSING' };
  if (!serviceRole) return { ok: false, reason: 'SUPABASE_SERVICE_ROLE_MISSING' };

  const appRef = extractSupabaseProjectRefFromHttpUrlV1(appUrl);
  if (!appRef) return { ok: false, reason: 'SUPABASE_PROJECT_REF_UNRESOLVED' };

  let pgHostname = '';
  try {
    pgHostname = new URL(isolatedDb).hostname.toLowerCase();
  } catch {
    return { ok: false, reason: 'ISOLATED_DATABASE_URL_UNPARSEABLE' };
  }

  const lowerDb = isolatedDb.toLowerCase();
  for (const deny of PRODUCTION_HOST_DENY) {
    if (lowerDb.includes(deny)) return { ok: false, reason: 'ISOLATED_DATABASE_HOST_BLOCKED' };
  }

  const hostKind = postgresHostKindV1(pgHostname);
  const pgRef = extractSupabaseProjectRefFromPostgresUrlV1(isolatedDb);

  if (hostKind === 'supabase_direct') {
    if (!pgRef || pgRef !== appRef) {
      return { ok: false, reason: 'ISOLATED_DATABASE_PROJECT_MISMATCH' };
    }
  } else if (hostKind === 'loopback') {
    const declared = env.M55_R8_ISOLATED_SUPABASE_PROJECT_REF?.trim().toLowerCase();
    if (!declared || declared !== appRef) {
      return { ok: false, reason: 'ISOLATED_DATABASE_PROJECT_MISMATCH' };
    }
  } else {
    return { ok: false, reason: 'ISOLATED_DATABASE_HOST_BLOCKED' };
  }

  return {
    ok: true,
    supabaseProjectRefSuffix: appRef.slice(-6),
    postgresHostKind: hostKind,
  };
}

export function listIsolatedSupabaseAlignmentChecklistV1(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const result = evaluateIsolatedSupabaseAlignmentV1(env);
  if (result.ok) return [];
  switch (result.reason) {
    case 'PRODUCTION_RUNTIME_BLOCKED':
      return ['Isolated Stripe E2E is blocked on Production runtime'];
    case 'SUPABASE_APP_URL_MISSING':
      return ['Set NEXT_PUBLIC_SUPABASE_URL to the isolated Supabase project (app uses getSupabaseAdmin)'];
    case 'ISOLATED_DATABASE_URL_MISSING':
      return ['Set M55_R8_ISOLATED_DATABASE_URL to the same isolated Postgres as the Supabase project'];
    case 'SUPABASE_SERVICE_ROLE_MISSING':
      return ['Set SUPABASE_SERVICE_ROLE_KEY for the isolated Supabase project'];
    case 'SUPABASE_PROJECT_REF_UNRESOLVED':
      return ['NEXT_PUBLIC_SUPABASE_URL must be a *.supabase.co project URL'];
    case 'ISOLATED_DATABASE_PROJECT_MISMATCH':
      return [
        'M55_R8_ISOLATED_DATABASE_URL db.*.supabase.co project must match NEXT_PUBLIC_SUPABASE_URL',
        'For loopback Postgres, set M55_R8_ISOLATED_SUPABASE_PROJECT_REF to the same project ref',
      ];
    case 'ISOLATED_DATABASE_HOST_BLOCKED':
      return ['Isolated database URL must be loopback or Supabase direct/pooler — not Production/Preview hosts'];
    case 'ISOLATED_DATABASE_URL_UNPARSEABLE':
      return ['M55_R8_ISOLATED_DATABASE_URL is not a valid URL'];
    default:
      return ['Isolated Supabase alignment failed'];
  }
}
