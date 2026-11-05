import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { isM55ProductionRuntime } from './runtimeEnvironment';

export type PostgresSupabaseConnectionKindV1 =
  | 'supabase_direct'
  | 'supabase_pooler_session'
  | 'supabase_pooler_transaction'
  | 'supabase_local_stack'
  | 'loopback'
  | 'blocked';

export type SupabaseAppHttpKindV1 = 'hosted' | 'local_stack' | 'unsupported';

/** Default ports for `supabase start` local full stack (API / Postgres). */
export const M55_R8_LOCAL_SUPABASE_API_PORT_V1 = 54321;
export const M55_R8_LOCAL_SUPABASE_DB_PORT_V1 = 54322;

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

/** Default gitignored file for Human-managed isolated Supabase credentials (see runbook). */
export const M55_R8_ISOLATED_ALIGNMENT_ENV_FILE_DEFAULT_V1 = '.env.m55-r8-isolated.local';

export const M55_R8_ISOLATED_ALIGNMENT_ENV_KEYS_V1 = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'M55_R8_ISOLATED_DATABASE_URL',
  'M55_R8_ISOLATED_SUPABASE_PROJECT_REF',
] as const;

/** Optional keys loaded from the same isolated env file for Stripe smoke scripts (never logged). */
export const M55_R8_ISOLATED_ENV_OPTIONAL_PASSTHROUGH_KEYS_V1 = [
  'M55_STRIPE_CONNECT_SECRET_KEY',
  'STRIPE_SECRET_KEY',
  'M55_STRIPE_CONNECT_TESTMODE_ENABLED',
  'M55_PUBLIC_ORIGIN',
  'NEXT_PUBLIC_SITE_URL',
  'M55_ALLOW_FAKE_STRIPE_CONNECT_ADAPTER',
  'M55_R8_STRIPE_CONNECT_ISOLATED_SMOKE_ECONOMIC_IDENTITY_ID',
  'M55_R8_STRIPE_CONNECT_ISOLATED_SMOKE_RESET',
] as const;

const PRODUCTION_HOST_DENY = ['m55-soul', 'm55-web', 'vercel.app'] as const;

function resolveHttpPortV1(url: URL): number {
  if (url.port) return Number(url.port);
  return url.protocol === 'https:' ? 443 : 80;
}

function isLoopbackHostV1(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

export function parseSupabaseAppHttpUrlV1(raw: string): {
  kind: SupabaseAppHttpKindV1;
  projectRef: string | null;
  localApiPort: number | null;
} {
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    const hostedMatch = host.match(/^([a-z0-9]{8,32})\.supabase\.co$/);
    if (hostedMatch?.[1]) {
      return { kind: 'hosted', projectRef: hostedMatch[1], localApiPort: null };
    }
    if (isLoopbackHostV1(host) && resolveHttpPortV1(url) === M55_R8_LOCAL_SUPABASE_API_PORT_V1) {
      return { kind: 'local_stack', projectRef: null, localApiPort: M55_R8_LOCAL_SUPABASE_API_PORT_V1 };
    }
    return { kind: 'unsupported', projectRef: null, localApiPort: null };
  } catch {
    return { kind: 'unsupported', projectRef: null, localApiPort: null };
  }
}

export function extractSupabaseProjectRefFromHttpUrlV1(raw: string): string | null {
  const parsed = parseSupabaseAppHttpUrlV1(raw);
  return parsed.kind === 'hosted' ? parsed.projectRef : null;
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

    if (isLoopbackHostV1(host)) {
      const portNum = Number(port);
      if (portNum === M55_R8_LOCAL_SUPABASE_DB_PORT_V1) {
        return { projectRef: null, connectionKind: 'supabase_local_stack' };
      }
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

  const appParsed = parseSupabaseAppHttpUrlV1(appUrl);
  if (appParsed.kind === 'unsupported') {
    return { ok: false, reason: 'SUPABASE_PROJECT_REF_UNRESOLVED' };
  }

  let canonicalRef: string;
  if (appParsed.kind === 'hosted') {
    canonicalRef = appParsed.projectRef!;
    if (humanRef !== canonicalRef) {
      return { ok: false, reason: 'HUMAN_PROJECT_REF_MISMATCH' };
    }
  } else {
    if (!/^[a-z0-9]{8,32}$/.test(humanRef)) {
      return { ok: false, reason: 'HUMAN_PROJECT_REF_MISSING' };
    }
    canonicalRef = humanRef;
  }

  const keyFormat = classifySupabaseServiceRoleKeyFormatV1(serviceRole);
  if (!keyFormat) return { ok: false, reason: 'SUPABASE_SERVICE_ROLE_KEY_UNRECOGNIZED' };

  let serviceRoleJwtRefMatched = false;
  if (keyFormat === 'supabase_jwt') {
    const jwtRef = extractSupabaseProjectRefFromServiceRoleJwtV1(serviceRole);
    if (!jwtRef) return { ok: false, reason: 'SERVICE_ROLE_JWT_REF_UNRESOLVED' };
    if (jwtRef !== canonicalRef) {
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

  if (appParsed.kind === 'local_stack') {
    if (parsedPg.connectionKind !== 'supabase_local_stack') {
      return { ok: false, reason: 'ISOLATED_DATABASE_PROJECT_MISMATCH' };
    }
  } else if (parsedPg.connectionKind === 'supabase_local_stack') {
    return { ok: false, reason: 'ISOLATED_DATABASE_PROJECT_MISMATCH' };
  } else if (parsedPg.connectionKind === 'loopback') {
    if (humanRef !== canonicalRef) {
      return { ok: false, reason: 'ISOLATED_DATABASE_PROJECT_MISMATCH' };
    }
  } else if (!parsedPg.projectRef || parsedPg.projectRef !== canonicalRef) {
    return { ok: false, reason: 'ISOLATED_DATABASE_PROJECT_MISMATCH' };
  }

  return {
    ok: true,
    supabaseProjectRefSuffix: canonicalRef.slice(-6),
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

/** Supabase REST auth: sb_secret_* uses apikey only; legacy JWT uses apikey + Bearer. */
export function buildSupabaseServiceRoleRestProbeHeadersV1(
  serviceRoleKey: string,
): Record<string, string> {
  const format = classifySupabaseServiceRoleKeyFormatV1(serviceRoleKey);
  if (format === 'sb_secret') {
    return { apikey: serviceRoleKey };
  }
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
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
      headers: buildSupabaseServiceRoleRestProbeHeadersV1(input.serviceRoleKey),
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

export function parseEnvFileLinesV1(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
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
    out[k] = v;
  }
  return out;
}

/**
 * Loads Human-managed isolated Supabase credentials from a dedicated env file only.
 * Does not read Production/Preview `.env.local` or shell-inherited Supabase vars.
 */
export function loadM55R8IsolatedAlignmentEnvV1(
  cwd: string = process.cwd(),
  osEnv: NodeJS.ProcessEnv = process.env,
): { ok: true; env: NodeJS.ProcessEnv; envFile: string; parsed: Record<string, string> } | { ok: false; checklist: string[] } {
  const rel = osEnv.M55_R8_ISOLATED_ENV_FILE?.trim() || M55_R8_ISOLATED_ALIGNMENT_ENV_FILE_DEFAULT_V1;
  const abs = isAbsolute(rel) ? rel : join(cwd, rel);
  if (!existsSync(abs)) {
    return {
      ok: false,
      checklist: [
        `Create ${rel} with isolated Supabase credentials (gitignored via .env.*.local)`,
        'Optional: set M55_R8_ISOLATED_ENV_FILE to a custom path — do not reuse Production .env.local for this probe',
      ],
    };
  }

  let raw: string;
  try {
    raw = readFileSync(abs, 'utf8');
  } catch {
    return { ok: false, checklist: [`Cannot read isolated env file: ${rel}`] };
  }

  const parsed = parseEnvFileLinesV1(raw);
  const checklist: string[] = [];
  const env: NodeJS.ProcessEnv = {};

  if (parsed.NODE_ENV?.trim()) env.NODE_ENV = parsed.NODE_ENV.trim();
  if (parsed.VERCEL_ENV?.trim()) env.VERCEL_ENV = parsed.VERCEL_ENV.trim();

  for (const key of M55_R8_ISOLATED_ALIGNMENT_ENV_KEYS_V1) {
    const v = parsed[key]?.trim();
    if (!v) checklist.push(`Set ${key} in ${rel}`);
    else env[key] = v;
  }

  if (parsed.NODE_ENV?.trim() === 'production' || parsed.VERCEL_ENV?.trim() === 'production') {
    checklist.push(`${rel} must not declare production runtime`);
  }

  for (const key of M55_R8_ISOLATED_ENV_OPTIONAL_PASSTHROUGH_KEYS_V1) {
    const v = parsed[key]?.trim();
    if (v) env[key] = v;
  }

  if (checklist.length > 0) return { ok: false, checklist };
  return { ok: true, env, envFile: rel, parsed };
}

/** Fail-closed on shell Production **before** isolated env file is applied to `process.env`. */
export function listIsolatedStripeSmokeShellBlockedChecklistV1(
  osEnv: NodeJS.ProcessEnv = process.env,
): string[] {
  if (!isM55ProductionRuntime(osEnv)) return [];
  return ['Isolated Stripe smoke is blocked on Production runtime (shell env before isolated file load)'];
}

/** Stripe smoke credentials must be declared in the isolated file — no shell fallback. */
export function listIsolatedStripeSmokeCredentialsFileMissingV1(
  parsed: Record<string, string>,
  envFile: string,
): string[] {
  const missing: string[] = [];
  const secret =
    parsed.M55_STRIPE_CONNECT_SECRET_KEY?.trim() || parsed.STRIPE_SECRET_KEY?.trim() || '';
  if (!secret) {
    missing.push(
      `Set M55_STRIPE_CONNECT_SECRET_KEY or STRIPE_SECRET_KEY in ${envFile} (shell fallback prohibited)`,
    );
  }
  if (parsed.M55_STRIPE_CONNECT_TESTMODE_ENABLED?.trim() !== 'true') {
    missing.push(
      `Set M55_STRIPE_CONNECT_TESTMODE_ENABLED=true in ${envFile} (shell fallback prohibited)`,
    );
  }
  if (!parsed.M55_PUBLIC_ORIGIN?.trim() && !parsed.NEXT_PUBLIC_SITE_URL?.trim()) {
    missing.push(`Set M55_PUBLIC_ORIGIN in ${envFile} (shell fallback prohibited)`);
  }
  return missing;
}

const M55_R8_ISOLATED_SMOKE_PROCESS_ENV_KEYS_V1 = [
  ...M55_R8_ISOLATED_ALIGNMENT_ENV_KEYS_V1,
  ...M55_R8_ISOLATED_ENV_OPTIONAL_PASSTHROUGH_KEYS_V1,
] as const;

/** Apply isolated-file vars to `process.env`, clearing shell fallbacks for the same keys. */
export function applyIsolatedStripeSmokeEnvToProcessV1(isolatedOnly: NodeJS.ProcessEnv): void {
  for (const key of M55_R8_ISOLATED_SMOKE_PROCESS_ENV_KEYS_V1) {
    const v = isolatedOnly[key];
    if (typeof v === 'string' && v.length > 0) process.env[key] = v;
    else delete process.env[key];
  }
  if (isolatedOnly.NODE_ENV) process.env.NODE_ENV = isolatedOnly.NODE_ENV;
  if (isolatedOnly.VERCEL_ENV) process.env.VERCEL_ENV = isolatedOnly.VERCEL_ENV;
}

/** Merge isolated env file vars over shell for Stripe smoke / alignment scripts. */
export function mergeM55R8IsolatedEnvOverProcessV1(
  loadedEnv: NodeJS.ProcessEnv,
  osEnv: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  return { ...osEnv, ...loadedEnv };
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
      return [
        'NEXT_PUBLIC_SUPABASE_URL must be a hosted *.supabase.co project URL or local Supabase API (http://127.0.0.1:54321)',
      ];
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
        'Local Supabase full stack requires API on port 54321 and Postgres on 127.0.0.1:54322 with matching Human project ref',
        'Generic loopback Postgres requires the same Human project ref as the hosted Supabase app URL',
      ];
    case 'ISOLATED_DATABASE_HOST_BLOCKED':
      return [
        'Isolated database URL must be Supabase direct/pooler, local stack Postgres (127.0.0.1:54322), or declared loopback tunnel — not Production/Preview hosts',
      ];
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
