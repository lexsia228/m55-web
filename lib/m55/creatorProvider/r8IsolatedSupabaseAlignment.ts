import { isM55ProductionRuntime } from './runtimeEnvironment';

export type PostgresSupabaseConnectionKindV1 =
  | 'supabase_direct'
  | 'supabase_pooler_session'
  | 'supabase_pooler_transaction'
  | 'loopback'
  | 'blocked';

export type IsolatedSupabaseAlignmentResultV1 =
  | {
      ok: true;
      supabaseProjectRefSuffix: string;
      postgresConnectionKind: PostgresSupabaseConnectionKindV1;
      humanProjectRefConfirmed: true;
      serviceRoleJwtRefMatched: true;
    }
  | { ok: false; reason: IsolatedSupabaseAlignmentFailureV1 };

export type IsolatedSupabaseAlignmentFailureV1 =
  | 'PRODUCTION_RUNTIME_BLOCKED'
  | 'SUPABASE_APP_URL_MISSING'
  | 'ISOLATED_DATABASE_URL_MISSING'
  | 'SUPABASE_SERVICE_ROLE_MISSING'
  | 'SUPABASE_PROJECT_REF_UNRESOLVED'
  | 'HUMAN_PROJECT_REF_MISSING'
  | 'HUMAN_PROJECT_REF_MISMATCH'
  | 'SERVICE_ROLE_JWT_REF_UNRESOLVED'
  | 'SERVICE_ROLE_JWT_REF_MISMATCH'
  | 'ISOLATED_DATABASE_PROJECT_MISMATCH'
  | 'ISOLATED_DATABASE_HOST_BLOCKED'
  | 'ISOLATED_DATABASE_URL_UNPARSEABLE'
  | 'SERVICE_ROLE_PROBE_FAILED'
  | 'SERVICE_ROLE_PROBE_HTTP';

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

export function extractSupabaseProjectRefFromServiceRoleJwtV1(rawJwt: string): string | null {
  const parts = rawJwt.trim().split('.');
  if (parts.length < 2) return null;
  try {
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson) as { ref?: unknown };
    return typeof payload.ref === 'string' && /^[a-z0-9]{8,32}$/.test(payload.ref) ? payload.ref : null;
  } catch {
    return null;
  }
}

export type ParsedPostgresSupabaseConnectionV1 = {
  projectRef: string | null;
  connectionKind: PostgresSupabaseConnectionKindV1;
};

export function parsePostgresSupabaseConnectionV1(raw: string): ParsedPostgresSupabaseConnectionV1 {
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    const port = url.port || '5432';

    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return { projectRef: null, connectionKind: 'loopback' };
    }

    const direct = host.match(/^db\.([a-z0-9]{8,32})\.supabase\.co$/);
    if (direct?.[1]) {
      return { projectRef: direct[1], connectionKind: 'supabase_direct' };
    }

    if (host.endsWith('.pooler.supabase.com')) {
      const user = decodeURIComponent(url.username);
      const fromUser = user.match(/^postgres\.([a-z0-9]{8,32})$/i)?.[1]?.toLowerCase() ?? null;
      const kind =
        port === '6543' ? 'supabase_pooler_transaction' : 'supabase_pooler_session';
      return { projectRef: fromUser, connectionKind: kind };
    }

    return { projectRef: null, connectionKind: 'blocked' };
  } catch {
    return { projectRef: null, connectionKind: 'blocked' };
  }
}

/** @deprecated use parsePostgresSupabaseConnectionV1 */
export function extractSupabaseProjectRefFromPostgresUrlV1(raw: string): string | null {
  return parsePostgresSupabaseConnectionV1(raw).projectRef;
}

export function evaluateIsolatedSupabaseAlignmentStructuralV1(
  env: NodeJS.ProcessEnv = process.env,
): IsolatedSupabaseAlignmentResultV1 {
  if (isM55ProductionRuntime(env)) {
    return { ok: false, reason: 'PRODUCTION_RUNTIME_BLOCKED' };
  }

  const appUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const isolatedDb = env.M55_R8_ISOLATED_DATABASE_URL?.trim() ?? '';
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
  const humanRef = env.M55_R8_ISOLATED_SUPABASE_PROJECT_REF?.trim().toLowerCase() ?? '';

  if (!appUrl) return { ok: false, reason: 'SUPABASE_APP_URL_MISSING' };
  if (!isolatedDb) return { ok: false, reason: 'ISOLATED_DATABASE_URL_MISSING' };
  if (!serviceRole) return { ok: false, reason: 'SUPABASE_SERVICE_ROLE_MISSING' };
  if (!humanRef) return { ok: false, reason: 'HUMAN_PROJECT_REF_MISSING' };

  const appRef = extractSupabaseProjectRefFromHttpUrlV1(appUrl);
  if (!appRef) return { ok: false, reason: 'SUPABASE_PROJECT_REF_UNRESOLVED' };

  if (humanRef !== appRef) {
    return { ok: false, reason: 'HUMAN_PROJECT_REF_MISMATCH' };
  }

  const jwtRef = extractSupabaseProjectRefFromServiceRoleJwtV1(serviceRole);
  if (!jwtRef) return { ok: false, reason: 'SERVICE_ROLE_JWT_REF_UNRESOLVED' };
  if (jwtRef !== appRef) {
    return { ok: false, reason: 'SERVICE_ROLE_JWT_REF_MISMATCH' };
  }

  const lowerDb = isolatedDb.toLowerCase();
  for (const deny of PRODUCTION_HOST_DENY) {
    if (lowerDb.includes(deny)) return { ok: false, reason: 'ISOLATED_DATABASE_HOST_BLOCKED' };
  }

  const parsedPg = parsePostgresSupabaseConnectionV1(isolatedDb);
  if (parsedPg.connectionKind === 'blocked') {
    return { ok: false, reason: 'ISOLATED_DATABASE_HOST_BLOCKED' };
  }

  if (parsedPg.connectionKind === 'loopback') {
    if (humanRef !== appRef) {
      return { ok: false, reason: 'ISOLATED_DATABASE_PROJECT_MISMATCH' };
    }
  } else {
    if (!parsedPg.projectRef || parsedPg.projectRef !== appRef) {
      return { ok: false, reason: 'ISOLATED_DATABASE_PROJECT_MISMATCH' };
    }
  }

  return {
    ok: true,
    supabaseProjectRefSuffix: appRef.slice(-6),
    postgresConnectionKind: parsedPg.connectionKind,
    humanProjectRefConfirmed: true,
    serviceRoleJwtRefMatched: true,
  };
}

export async function probeSupabaseServiceRoleReadOnlyV1(input: {
  supabaseHttpUrl: string;
  serviceRoleKey: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true } | { ok: false; reason: 'SERVICE_ROLE_PROBE_FAILED' | 'SERVICE_ROLE_PROBE_HTTP' }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const base = input.supabaseHttpUrl.replace(/\/$/, '');
  try {
    const res = await fetchImpl(`${base}/rest/v1/`, {
      method: 'GET',
      headers: {
        apikey: input.serviceRoleKey,
        Authorization: `Bearer ${input.serviceRoleKey}`,
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, reason: 'SERVICE_ROLE_PROBE_FAILED' };
    }
    if (res.status >= 500) {
      return { ok: false, reason: 'SERVICE_ROLE_PROBE_HTTP' };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'SERVICE_ROLE_PROBE_FAILED' };
  }
}

export async function evaluateIsolatedSupabaseAlignmentLiveV1(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl?: typeof fetch,
): Promise<IsolatedSupabaseAlignmentResultV1> {
  const structural = evaluateIsolatedSupabaseAlignmentStructuralV1(env);
  if (!structural.ok) return structural;

  const probe = await probeSupabaseServiceRoleReadOnlyV1({
    supabaseHttpUrl: env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    fetchImpl,
  });
  if (!probe.ok) {
    return { ok: false, reason: probe.reason };
  }
  return structural;
}

/** Structural checks only — not sufficient alone for isolated E2E GREEN. */
export function evaluateIsolatedSupabaseAlignmentV1(
  env: NodeJS.ProcessEnv = process.env,
): IsolatedSupabaseAlignmentResultV1 {
  return evaluateIsolatedSupabaseAlignmentStructuralV1(env);
}

export function listIsolatedSupabaseAlignmentChecklistV1(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const result = evaluateIsolatedSupabaseAlignmentStructuralV1(env);
  if (result.ok) return [];
  return checklistForFailure(result.reason);
}

export function listIsolatedSupabaseLiveAlignmentChecklistV1(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const structural = listIsolatedSupabaseAlignmentChecklistV1(env);
  if (structural.length > 0) return structural;
  return [];
}

export function alignmentFailureChecklistV1(
  reason: IsolatedSupabaseAlignmentFailureV1,
): string[] {
  return checklistForFailure(reason);
}

function checklistForFailure(reason: IsolatedSupabaseAlignmentFailureV1): string[] {
  switch (reason) {
    case 'PRODUCTION_RUNTIME_BLOCKED':
      return ['Isolated Stripe E2E is blocked on Production runtime'];
    case 'SUPABASE_APP_URL_MISSING':
      return ['Set NEXT_PUBLIC_SUPABASE_URL to the isolated Supabase project (app uses getSupabaseAdmin)'];
    case 'ISOLATED_DATABASE_URL_MISSING':
      return ['Set M55_R8_ISOLATED_DATABASE_URL (direct db.*.supabase.co or pooler with postgres.<ref> user)'];
    case 'SUPABASE_SERVICE_ROLE_MISSING':
      return ['Set SUPABASE_SERVICE_ROLE_KEY for the isolated Supabase project'];
    case 'SUPABASE_PROJECT_REF_UNRESOLVED':
      return ['NEXT_PUBLIC_SUPABASE_URL must be a *.supabase.co project URL'];
    case 'HUMAN_PROJECT_REF_MISSING':
      return [
        'Set M55_R8_ISOLATED_SUPABASE_PROJECT_REF to the Human-confirmed non-Production Supabase project ref',
      ];
    case 'HUMAN_PROJECT_REF_MISMATCH':
      return ['M55_R8_ISOLATED_SUPABASE_PROJECT_REF must exactly match NEXT_PUBLIC_SUPABASE_URL project ref'];
    case 'SERVICE_ROLE_JWT_REF_UNRESOLVED':
      return ['SUPABASE_SERVICE_ROLE_KEY must be a Supabase JWT with ref claim matching the isolated project'];
    case 'SERVICE_ROLE_JWT_REF_MISMATCH':
      return ['SUPABASE_SERVICE_ROLE_KEY ref claim must match NEXT_PUBLIC_SUPABASE_URL and Human project ref'];
    case 'ISOLATED_DATABASE_PROJECT_MISMATCH':
      return [
        'M55_R8_ISOLATED_DATABASE_URL project must match app URL (direct host or pooler postgres.<ref> username)',
        'Loopback Postgres requires the same Human project ref as NEXT_PUBLIC_SUPABASE_URL',
      ];
    case 'ISOLATED_DATABASE_HOST_BLOCKED':
      return ['Isolated database URL must be loopback or Supabase direct/pooler — not Production/Preview hosts'];
    case 'ISOLATED_DATABASE_URL_UNPARSEABLE':
      return ['M55_R8_ISOLATED_DATABASE_URL is not a valid URL'];
    case 'SERVICE_ROLE_PROBE_FAILED':
      return ['Service role READ probe failed (401/403 or network) — key does not reach isolated project'];
    case 'SERVICE_ROLE_PROBE_HTTP':
      return ['Service role READ probe returned server error — retry or verify isolated project health'];
    default:
      return ['Isolated Supabase alignment failed'];
  }
}
