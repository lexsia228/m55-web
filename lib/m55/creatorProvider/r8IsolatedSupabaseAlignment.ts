import { isM55ProductionRuntime } from './runtimeEnvironment';

export type PostgresSupabaseConnectionKindV1 =
  | 'supabase_direct'
  | 'supabase_pooler_session'
  | 'supabase_pooler_transaction'
  | 'loopback'
  | 'blocked';

export type SupabaseServiceRoleKeyFormatV1 = 'supabase_jwt' | 'sb_secret';

export type IsolatedSupabaseAlignmentResultV1 =
  | {
      ok: true;
      supabaseProjectRefSuffix: string;
      postgresConnectionKind: PostgresSupabaseConnectionKindV1;
      humanProjectRefConfirmed: true;
      serviceRoleKeyFormat: SupabaseServiceRoleKeyFormatV1;
      /** True only when legacy JWT ref claim matches Human/app ref; sb_secret keys use live REST probe instead. */
      serviceRoleJwtRefMatched: boolean;
    }
  | { ok: false; reason: IsolatedSupabaseAlignmentFailureV1 };

export type IsolatedSupabaseAlignmentFailureV1 =
  | 'PRODUCTION_RUNTIME_BLOCKED'
  | 'SUPABASE_APP_URL_MISSING'
  | 'ISOLATED_DATABASE_URL_MISSING'
  | 'SUPABASE_SERVICE_ROLE_MISSING'
  | 'SUPABASE_SERVICE_ROLE_KEY_UNRECOGNIZED'
  | 'SUPABASE_PROJECT_REF_UNRESOLVED'
  | 'HUMAN_PROJECT_REF_MISSING'
  | 'HUMAN_PROJECT_REF_MISMATCH'
  | 'SERVICE_ROLE_JWT_REF_UNRESOLVED'
  | 'SERVICE_ROLE_JWT_REF_MISMATCH'
  | 'ISOLATED_DATABASE_PROJECT_MISMATCH'
  | 'ISOLATED_DATABASE_HOST_BLOCKED'
  | 'ISOLATED_DATABASE_URL_UNPARSEABLE'
  | 'SERVICE_ROLE_PROBE_FAILED'
  | 'SERVICE_ROLE_PROBE_HTTP'
  | 'POSTGRES_PROBE_FAILED'
  | 'POSTGRES_IDENTITY_NOT_VERIFIED';

const R8_ISOLATED_PROVIDER_TABLE = 'm55_r8_stripe_connected_accounts_v1';

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

export function classifySupabaseServiceRoleKeyFormatV1(raw: string): SupabaseServiceRoleKeyFormatV1 | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith('sb_secret_')) return 'sb_secret';
  const parts = trimmed.split('.');
  if (parts.length >= 3 && parts.every((p) => p.length > 0)) return 'supabase_jwt';
  return null;
}

export function extractSupabaseProjectRefFromServiceRoleJwtV1(rawJwt: string): string | null {
  if (classifySupabaseServiceRoleKeyFormatV1(rawJwt) !== 'supabase_jwt') return null;
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

  const keyFormat = classifySupabaseServiceRoleKeyFormatV1(serviceRole);
  if (!keyFormat) return { ok: false, reason: 'SUPABASE_SERVICE_ROLE_KEY_UNRECOGNIZED' };

  let serviceRoleJwtRefMatched = false;
  if (keyFormat === 'supabase_jwt') {
    const jwtRef = extractSupabaseProjectRefFromServiceRoleJwtV1(serviceRole);
    if (!jwtRef) return { ok: false, reason: 'SERVICE_ROLE_JWT_REF_UNRESOLVED' };
    if (jwtRef !== appRef) {
      return { ok: false, reason: 'SERVICE_ROLE_JWT_REF_MISMATCH' };
    }
    serviceRoleJwtRefMatched = true;
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
    serviceRoleKeyFormat: keyFormat,
    serviceRoleJwtRefMatched,
  };
}

export type IsolatedSupabaseLiveProbeDepsV1 = {
  fetchImpl?: typeof fetch;
  postgresQueryImpl?: (input: {
    connectionUrl: string;
    sql: string;
    values?: unknown[];
  }) => Promise<{ rows: Record<string, unknown>[] }>;
};

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
    if (res.status < 200 || res.status >= 300) {
      return {
        ok: false,
        reason: res.status >= 500 ? 'SERVICE_ROLE_PROBE_HTTP' : 'SERVICE_ROLE_PROBE_FAILED',
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'SERVICE_ROLE_PROBE_FAILED' };
  }
}

async function defaultPostgresQueryImpl(input: {
  connectionUrl: string;
  sql: string;
  values?: unknown[];
}): Promise<{ rows: Record<string, unknown>[] }> {
  const pg = await import('pg');
  const client = new pg.default.Client({
    connectionString: input.connectionUrl,
    connectionTimeoutMillis: 8_000,
    query_timeout: 8_000,
    statement_timeout: 8_000,
  });
  await client.connect();
  try {
    const result = await client.query(input.sql, input.values);
    return { rows: result.rows as Record<string, unknown>[] };
  } finally {
    await client.end();
  }
}

export async function probeIsolatedPostgresReadOnlyV1(input: {
  connectionUrl: string;
  connectionKind: PostgresSupabaseConnectionKindV1;
  postgresQueryImpl?: IsolatedSupabaseLiveProbeDepsV1['postgresQueryImpl'];
}): Promise<{ ok: true } | { ok: false; reason: 'POSTGRES_PROBE_FAILED' | 'POSTGRES_IDENTITY_NOT_VERIFIED' }> {
  const queryImpl = input.postgresQueryImpl ?? defaultPostgresQueryImpl;
  try {
    if (input.connectionKind === 'loopback') {
      const ping = await queryImpl({
        connectionUrl: input.connectionUrl,
        sql: 'SELECT 1 AS ok',
      });
      if (ping.rows[0]?.ok !== 1) {
        return { ok: false, reason: 'POSTGRES_PROBE_FAILED' };
      }
      return { ok: true };
    }

    const identity = await queryImpl({
      connectionUrl: input.connectionUrl,
      sql: `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      ) AS present`,
      values: [R8_ISOLATED_PROVIDER_TABLE],
    });
    if (identity.rows[0]?.present !== true) {
      return { ok: false, reason: 'POSTGRES_IDENTITY_NOT_VERIFIED' };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'POSTGRES_PROBE_FAILED' };
  }
}

export async function evaluateIsolatedSupabaseAlignmentLiveV1(
  env: NodeJS.ProcessEnv = process.env,
  deps: IsolatedSupabaseLiveProbeDepsV1 = {},
): Promise<IsolatedSupabaseAlignmentResultV1> {
  const structural = evaluateIsolatedSupabaseAlignmentStructuralV1(env);
  if (!structural.ok) return structural;

  const restProbe = await probeSupabaseServiceRoleReadOnlyV1({
    supabaseHttpUrl: env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    fetchImpl: deps.fetchImpl,
  });
  if (!restProbe.ok) {
    return { ok: false, reason: restProbe.reason };
  }

  const pgProbe = await probeIsolatedPostgresReadOnlyV1({
    connectionUrl: env.M55_R8_ISOLATED_DATABASE_URL!.trim(),
    connectionKind: structural.postgresConnectionKind,
    postgresQueryImpl: deps.postgresQueryImpl,
  });
  if (!pgProbe.ok) {
    return { ok: false, reason: pgProbe.reason };
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
    case 'SUPABASE_SERVICE_ROLE_KEY_UNRECOGNIZED':
      return [
        'SUPABASE_SERVICE_ROLE_KEY must be a legacy Supabase JWT (eyJ…) or new sb_secret_* service role key',
      ];
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
    case 'POSTGRES_PROBE_FAILED':
      return ['Postgres READ-ONLY probe failed — verify M55_R8_ISOLATED_DATABASE_URL credentials and network'];
    case 'POSTGRES_IDENTITY_NOT_VERIFIED':
      return [
        `Postgres READ probe did not find public.${R8_ISOLATED_PROVIDER_TABLE} — apply R8 provider migration on the Human-confirmed isolated project`,
      ];
    default:
      return ['Isolated Supabase alignment failed'];
  }
}
