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
export const M55_R8_LOCAL_SUPABASE_KONG_CONTAINER_PORT_V1 = 8000;
export const M55_R8_LOCAL_SUPABASE_DB_CONTAINER_PORT_V1 = 5432;
export const M55_R8_LOCAL_STACK_DOCKER_LOOPBACK_HOST_V1 = '127.0.0.1';

/**
 * GoTrue admin list users — requires validated service_role on Supabase local stack (READ-ONLY GET).
 * Anonymous or non–service-role keys must not receive 2xx.
 */
export const M55_R8_LOCAL_STACK_AUTH_ADMIN_USERS_PROBE_PATH_V1 =
  '/auth/v1/admin/users?per_page=1';

/** Sentinel non–service-role key for distinguishing admin authorization from generic API success. */
export const M55_R8_LOCAL_STACK_NON_SERVICE_ROLE_PROBE_KEY_V1 =
  'm55-r8-local-stack-probe-non-service-role-v1';

export type LocalStackDockerPortProtocolV1 = 'tcp' | 'udp';

export type LocalStackDockerHostPortBindingV1 = {
  hostIp: string;
  hostPort: number;
  containerPort: number;
  protocol: LocalStackDockerPortProtocolV1;
};

export type LocalStackDockerNetworkAttachmentV1 = {
  networkName: string;
  networkId: string;
};

export type LocalStackDockerContainerBindingV1 = {
  name: string;
  stateRunning: boolean;
  hostPorts: LocalStackDockerHostPortBindingV1[];
  networks: LocalStackDockerNetworkAttachmentV1[];
};

export type LocalStackDockerBindingEvidenceV1 = {
  stackProjectId: string;
  kong: LocalStackDockerContainerBindingV1;
  db: LocalStackDockerContainerBindingV1;
  auth: LocalStackDockerContainerBindingV1;
};

export type SupabaseServiceRoleKeyFormatV1 = 'supabase_jwt' | 'sb_secret';

export type IsolatedSupabaseAlignmentResultV1 =
  | {
      ok: true;
      supabaseProjectRefSuffix: string;
      postgresConnectionKind: PostgresSupabaseConnectionKindV1;
      /**
       * False only for local_stack JWT keys with no `ref` claim — REST/Postgres probes verify
       * connectivity and schema only; JWT does not prove Human project ref identity.
       */
      humanProjectRefConfirmed: boolean;
      serviceRoleKeyFormat: SupabaseServiceRoleKeyFormatV1;
      /** True only when legacy JWT ref claim matches Human/app ref; sb_secret keys use live REST probe instead. */
      serviceRoleJwtRefMatched: boolean;
      /**
       * True only for local_stack JWT service-role keys with no `ref` claim.
       * Structural acceptance only — live REST probe must confirm key↔API binding.
       */
      localStackServiceRoleJwtRefAbsent?: boolean;
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
  | 'HUMAN_PROJECT_REF_NOT_JWT_VERIFIED'
  | 'SERVICE_ROLE_JWT_REF_UNRESOLVED'
  | 'SERVICE_ROLE_JWT_REF_MISMATCH'
  | 'ISOLATED_DATABASE_PROJECT_MISMATCH'
  | 'ISOLATED_DATABASE_HOST_BLOCKED'
  | 'ISOLATED_DATABASE_URL_UNPARSEABLE'
  | 'SERVICE_ROLE_PROBE_FAILED'
  | 'SERVICE_ROLE_PROBE_HTTP'
  | 'POSTGRES_PROBE_FAILED'
  | 'POSTGRES_IDENTITY_NOT_VERIFIED';

/** Supabase CLI `config.toml` project_id / Docker name suffix (underscores allowed; not a JWT ref). */
export const M55_R8_ISOLATED_SUPABASE_STACK_PROJECT_ID_ENV_V1 =
  'M55_R8_ISOLATED_SUPABASE_STACK_PROJECT_ID';

/** Human-declared Docker network name for the isolated Supabase stack (bootstrap non-secret). */
export const M55_R8_ISOLATED_SUPABASE_STACK_DOCKER_NETWORK_ENV_V1 =
  'M55_R8_ISOLATED_SUPABASE_STACK_DOCKER_NETWORK';

export const M55_R8_LOCAL_STACK_PROJECT_ID_PATTERN_V1 = /^[a-z0-9][a-z0-9_]{7,63}$/;

export const M55_R8_LOCAL_STACK_DOCKER_NETWORK_NAME_PATTERN_V1 = /^[a-z0-9][a-z0-9_]{7,63}$/;

export type IsolatedSupabaseLocalStackVerificationFailureV1 =
  | IsolatedSupabaseAlignmentFailureV1
  | 'LOCAL_STACK_VERIFICATION_NOT_APPLICABLE'
  | 'LOCAL_STACK_STACK_PROJECT_ID_MISSING'
  | 'LOCAL_STACK_STACK_PROJECT_ID_INVALID'
  | 'LOCAL_STACK_STACK_DOCKER_NETWORK_MISSING'
  | 'LOCAL_STACK_STACK_DOCKER_NETWORK_INVALID'
  | 'LOCAL_STACK_TOPOLOGY_UNVERIFIED'
  | 'LOCAL_STACK_BINDING_MISMATCH'
  | 'LOCAL_STACK_SERVICE_ROLE_UNAUTHORIZED'
  | 'REST_PROBE_FAILED'
  | 'POSTGRES_PROBE_FAILED';

export type LocalStackVerificationCheckV1 = {
  apiReachable: boolean;
  postgresReachable: boolean;
  serviceRoleAuthorized: boolean;
  stackTopologyVerified: boolean;
};

export type IsolatedSupabaseLocalStackVerificationResultV1 =
  | {
      ok: true;
      verificationKind: 'LOCAL_STACK_READ_PROBE';
      projectRefIdentity: 'VERIFIED' | 'UNVERIFIED';
      humanProjectRefConfirmed: boolean;
      stackProjectId: string;
      checks: LocalStackVerificationCheckV1;
      supabaseProjectRefSuffix: string;
      postgresConnectionKind: PostgresSupabaseConnectionKindV1;
      serviceRoleKeyFormat: SupabaseServiceRoleKeyFormatV1;
      serviceRoleJwtRefMatched: boolean;
      localStackServiceRoleJwtRefAbsent?: boolean;
    }
  | { ok: false; reason: IsolatedSupabaseLocalStackVerificationFailureV1 };

const R8_ISOLATED_PROVIDER_TABLE = 'm55_r8_stripe_connected_accounts_v1';

/** Minimum Supabase local CLI container roles that must share one stack project_id suffix. */
const M55_R8_LOCAL_STACK_TOPOLOGY_REQUIRED_ROLES_V1 = ['db', 'kong', 'auth'] as const;

/** Longer role prefixes first so e.g. `pg_meta` wins over `meta`. */
const M55_R8_LOCAL_STACK_CONTAINER_ROLE_PREFIXES_V1 = [
  'edge_runtime',
  'pg_meta',
  'analytics',
  'realtime',
  'imgproxy',
  'pooler',
  'vector',
  'studio',
  'storage',
  'kong',
  'auth',
  'rest',
  'meta',
  'db',
] as const;

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
  M55_R8_ISOLATED_SUPABASE_STACK_PROJECT_ID_ENV_V1,
  M55_R8_ISOLATED_SUPABASE_STACK_DOCKER_NETWORK_ENV_V1,
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

export type ParsedSupabaseServiceRoleJwtV1 = {
  payloadOk: boolean;
  /** Ref claim only when payload `ref` is a string matching `/^[a-z0-9]{8,32}$/` verbatim (no trim/casefold). */
  ref: string | null;
  /** True only when the JWT payload omits a `ref` property entirely (not empty/invalid values). */
  refClaimAbsent: boolean;
  role: string | null;
};

export function parseSupabaseServiceRoleJwtV1(rawJwt: string): ParsedSupabaseServiceRoleJwtV1 | null {
  if (classifySupabaseServiceRoleKeyFormatV1(rawJwt) !== 'supabase_jwt') return null;
  const parts = rawJwt.trim().split('.');
  if (parts.length < 2) return null;
  try {
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson) as { ref?: unknown; role?: unknown };
    const refClaimAbsent = !('ref' in payload);
    const ref =
      typeof payload.ref === 'string' && /^[a-z0-9]{8,32}$/.test(payload.ref) ? payload.ref : null;
    const role = typeof payload.role === 'string' ? payload.role : null;
    return { payloadOk: true, ref, refClaimAbsent, role };
  } catch {
    return { payloadOk: false, ref: null, refClaimAbsent: false, role: null };
  }
}

export function extractSupabaseProjectRefFromServiceRoleJwtV1(rawJwt: string): string | null {
  return parseSupabaseServiceRoleJwtV1(rawJwt)?.ref ?? null;
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
  let localStackServiceRoleJwtRefAbsent = false;
  if (keyFormat === 'supabase_jwt') {
    const jwtParsed = parseSupabaseServiceRoleJwtV1(serviceRole);
    if (!jwtParsed?.payloadOk) {
      return { ok: false, reason: 'SUPABASE_SERVICE_ROLE_KEY_UNRECOGNIZED' };
    }

    if (jwtParsed.ref) {
      if (jwtParsed.ref !== canonicalRef) {
        return { ok: false, reason: 'SERVICE_ROLE_JWT_REF_MISMATCH' };
      }
      serviceRoleJwtRefMatched = true;
    } else if (
      appParsed.kind === 'local_stack' &&
      jwtParsed.refClaimAbsent &&
      jwtParsed.role === 'service_role'
    ) {
      localStackServiceRoleJwtRefAbsent = true;
    } else if (appParsed.kind === 'hosted') {
      return { ok: false, reason: 'SERVICE_ROLE_JWT_REF_UNRESOLVED' };
    } else {
      return { ok: false, reason: 'SERVICE_ROLE_JWT_REF_UNRESOLVED' };
    }
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

  const humanProjectRefConfirmed = !localStackServiceRoleJwtRefAbsent;

  return {
    ok: true,
    supabaseProjectRefSuffix: canonicalRef.slice(-6),
    postgresConnectionKind: parsedPg.connectionKind,
    humanProjectRefConfirmed,
    serviceRoleKeyFormat: keyFormat,
    serviceRoleJwtRefMatched,
    ...(localStackServiceRoleJwtRefAbsent ? { localStackServiceRoleJwtRefAbsent: true } : {}),
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

export type IsolatedSupabaseLocalStackVerificationDepsV1 = IsolatedSupabaseLiveProbeDepsV1 & {
  /**
   * Docker inspect–derived binding for kong/db/auth (host ports, running state, shared network).
   * Required for local stack verification — container-name lists alone are insufficient.
   */
  inspectLocalStackDockerBindingImpl?: (
    stackProjectId: string,
  ) => Promise<LocalStackDockerBindingEvidenceV1 | null>;
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

  if (structural.humanProjectRefConfirmed === false) {
    return { ok: false, reason: 'HUMAN_PROJECT_REF_NOT_JWT_VERIFIED' };
  }

  return structural;
}

export function parseLocalStackContainerStackProjectIdV1(
  containerName: string,
): { role: string; stackProjectId: string } | null {
  if (!containerName.startsWith('supabase_')) return null;
  const body = containerName.slice('supabase_'.length);
  for (const role of M55_R8_LOCAL_STACK_CONTAINER_ROLE_PREFIXES_V1) {
    const prefix = `${role}_`;
    if (!body.startsWith(prefix)) continue;
    const stackProjectId = body.slice(prefix.length);
    if (!M55_R8_LOCAL_STACK_PROJECT_ID_PATTERN_V1.test(stackProjectId)) return null;
    return { role, stackProjectId };
  }
  return null;
}

/** Docker container names must include required roles for exactly one declared stack project_id. */
export function probeLocalSupabaseStackTopologyV1(input: {
  stackProjectId: string;
  containerNames: string[];
}): { ok: true } | { ok: false; reason: 'LOCAL_STACK_TOPOLOGY_UNVERIFIED' | 'LOCAL_STACK_BINDING_MISMATCH' } {
  const declared = input.stackProjectId.trim();
  if (!M55_R8_LOCAL_STACK_PROJECT_ID_PATTERN_V1.test(declared)) {
    return { ok: false, reason: 'LOCAL_STACK_BINDING_MISMATCH' };
  }
  const suffix = `_${declared}`;
  const stackContainers = input.containerNames.filter(
    (n) => n.startsWith('supabase_') && n.endsWith(suffix),
  );
  if (stackContainers.length === 0) {
    return { ok: false, reason: 'LOCAL_STACK_TOPOLOGY_UNVERIFIED' };
  }
  const roles = new Set<string>();
  for (const name of stackContainers) {
    const parsed = parseLocalStackContainerStackProjectIdV1(name);
    if (!parsed || parsed.stackProjectId !== declared) {
      return { ok: false, reason: 'LOCAL_STACK_BINDING_MISMATCH' };
    }
    roles.add(parsed.role);
  }
  for (const required of M55_R8_LOCAL_STACK_TOPOLOGY_REQUIRED_ROLES_V1) {
    if (!roles.has(required)) {
      return { ok: false, reason: 'LOCAL_STACK_TOPOLOGY_UNVERIFIED' };
    }
  }
  return { ok: true };
}

export function expectedLocalStackSupabaseContainerNameV1(
  role: 'db' | 'kong' | 'auth',
  stackProjectId: string,
): string {
  return `supabase_${role}_${stackProjectId}`;
}

function isForbiddenDockerPublishHostIpV1(hostIp: string): boolean {
  const ip = hostIp.trim();
  return (
    ip === '' ||
    ip === '0.0.0.0' ||
    ip === '::' ||
    ip === '[::]' ||
    ip !== M55_R8_LOCAL_STACK_DOCKER_LOOPBACK_HOST_V1
  );
}

function validateExclusiveLoopbackTcpServiceBindingV1(
  hostPorts: LocalStackDockerHostPortBindingV1[],
  expectedHostPort: number,
  expectedContainerPort: number,
): boolean {
  const tcpBindings = hostPorts.filter((p) => p.protocol === 'tcp');
  const exactLoopback = tcpBindings.filter(
    (p) =>
      p.hostIp === M55_R8_LOCAL_STACK_DOCKER_LOOPBACK_HOST_V1 &&
      p.hostPort === expectedHostPort &&
      p.containerPort === expectedContainerPort,
  );
  if (exactLoopback.length !== 1) return false;

  for (const binding of tcpBindings) {
    const touchesService =
      binding.hostPort === expectedHostPort || binding.containerPort === expectedContainerPort;
    if (!touchesService) continue;
    if (
      binding.hostIp !== M55_R8_LOCAL_STACK_DOCKER_LOOPBACK_HOST_V1 ||
      binding.hostPort !== expectedHostPort ||
      binding.containerPort !== expectedContainerPort
    ) {
      return false;
    }
  }

  for (const binding of hostPorts) {
    if (binding.protocol !== 'tcp') {
      const touchesService =
        binding.hostPort === expectedHostPort || binding.containerPort === expectedContainerPort;
      if (touchesService) return false;
    }
  }

  return true;
}

export function probeLocalStackDockerNetworkIdentityV1(input: {
  expectedNetworkName: string;
  kong: LocalStackDockerContainerBindingV1;
  db: LocalStackDockerContainerBindingV1;
  auth: LocalStackDockerContainerBindingV1;
}): { ok: true; networkId: string } | { ok: false; reason: 'LOCAL_STACK_BINDING_MISMATCH' } {
  const expectedName = input.expectedNetworkName.trim();
  const resolve = (container: LocalStackDockerContainerBindingV1): string | null => {
    if (container.networks.length !== 1) return null;
    const attachment = container.networks[0]!;
    if (attachment.networkName !== expectedName) return null;
    const id = attachment.networkId.trim();
    if (!id) return null;
    return id;
  };

  const kongId = resolve(input.kong);
  const dbId = resolve(input.db);
  const authId = resolve(input.auth);
  if (!kongId || !dbId || !authId) {
    return { ok: false, reason: 'LOCAL_STACK_BINDING_MISMATCH' };
  }
  if (kongId !== dbId || dbId !== authId) {
    return { ok: false, reason: 'LOCAL_STACK_BINDING_MISMATCH' };
  }
  return { ok: true, networkId: kongId };
}

export function probeLocalStackDockerHostBindingV1(input: {
  stackProjectId: string;
  expectedDockerNetworkName: string;
  evidence: LocalStackDockerBindingEvidenceV1;
}): { ok: true } | { ok: false; reason: 'LOCAL_STACK_BINDING_MISMATCH' | 'LOCAL_STACK_TOPOLOGY_UNVERIFIED' } {
  const declared = input.stackProjectId.trim();
  const { kong, db, auth } = input.evidence;
  if (input.evidence.stackProjectId !== declared) {
    return { ok: false, reason: 'LOCAL_STACK_BINDING_MISMATCH' };
  }
  if (
    kong.name !== expectedLocalStackSupabaseContainerNameV1('kong', declared) ||
    db.name !== expectedLocalStackSupabaseContainerNameV1('db', declared) ||
    auth.name !== expectedLocalStackSupabaseContainerNameV1('auth', declared)
  ) {
    return { ok: false, reason: 'LOCAL_STACK_BINDING_MISMATCH' };
  }
  if (!kong.stateRunning || !db.stateRunning || !auth.stateRunning) {
    return { ok: false, reason: 'LOCAL_STACK_TOPOLOGY_UNVERIFIED' };
  }

  if (
    !validateExclusiveLoopbackTcpServiceBindingV1(
      kong.hostPorts,
      M55_R8_LOCAL_SUPABASE_API_PORT_V1,
      M55_R8_LOCAL_SUPABASE_KONG_CONTAINER_PORT_V1,
    )
  ) {
    return { ok: false, reason: 'LOCAL_STACK_BINDING_MISMATCH' };
  }
  if (
    !validateExclusiveLoopbackTcpServiceBindingV1(
      db.hostPorts,
      M55_R8_LOCAL_SUPABASE_DB_PORT_V1,
      M55_R8_LOCAL_SUPABASE_DB_CONTAINER_PORT_V1,
    )
  ) {
    return { ok: false, reason: 'LOCAL_STACK_BINDING_MISMATCH' };
  }

  for (const binding of [...kong.hostPorts, ...db.hostPorts]) {
    if (isForbiddenDockerPublishHostIpV1(binding.hostIp)) {
      return { ok: false, reason: 'LOCAL_STACK_BINDING_MISMATCH' };
    }
  }

  const networkIdentity = probeLocalStackDockerNetworkIdentityV1({
    expectedNetworkName: input.expectedDockerNetworkName,
    kong,
    db,
    auth,
  });
  if (!networkIdentity.ok) {
    return { ok: false, reason: networkIdentity.reason };
  }

  return { ok: true };
}

function buildLocalStackAdminUsersProbeUrlV1(supabaseHttpUrl: string): string {
  return `${supabaseHttpUrl.replace(/\/$/, '')}${M55_R8_LOCAL_STACK_AUTH_ADMIN_USERS_PROBE_PATH_V1}`;
}

const M55_R8_LOCAL_STACK_API_UNAUTH_ALLOWED_STATUSES_V1 = new Set([401, 403]);

/** Auth admin route must reject unauthenticated callers with 401/403 only — not 5xx/2xx/redirect. */
export async function probeLocalStackApiReachabilityV1(input: {
  supabaseHttpUrl: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true } | { ok: false; reason: 'REST_PROBE_FAILED' }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const url = buildLocalStackAdminUsersProbeUrlV1(input.supabaseHttpUrl);
  try {
    const res = await fetchImpl(url, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(8_000),
    });
    if (M55_R8_LOCAL_STACK_API_UNAUTH_ALLOWED_STATUSES_V1.has(res.status)) {
      return { ok: true };
    }
    return { ok: false, reason: 'REST_PROBE_FAILED' };
  } catch {
    return { ok: false, reason: 'REST_PROBE_FAILED' };
  }
}

/**
 * Service-role authorization via GoTrue admin users (server-validated role; not `/rest/v1/` root).
 * Unauthenticated must be 401/403; authenticated must be exactly 200. No response body inspection.
 */
export async function probeLocalStackServiceRoleAuthorizationV1(input: {
  supabaseHttpUrl: string;
  serviceRoleKey: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true } | { ok: false; reason: 'LOCAL_STACK_SERVICE_ROLE_UNAUTHORIZED' }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const url = buildLocalStackAdminUsersProbeUrlV1(input.supabaseHttpUrl);
  try {
    const unauthenticated = await fetchImpl(url, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(8_000),
    });
    if (!M55_R8_LOCAL_STACK_API_UNAUTH_ALLOWED_STATUSES_V1.has(unauthenticated.status)) {
      return { ok: false, reason: 'LOCAL_STACK_SERVICE_ROLE_UNAUTHORIZED' };
    }
    const nonServiceRole = await fetchImpl(url, {
      method: 'GET',
      headers: { apikey: M55_R8_LOCAL_STACK_NON_SERVICE_ROLE_PROBE_KEY_V1 },
      redirect: 'manual',
      signal: AbortSignal.timeout(8_000),
    });
    if (!M55_R8_LOCAL_STACK_API_UNAUTH_ALLOWED_STATUSES_V1.has(nonServiceRole.status)) {
      return { ok: false, reason: 'LOCAL_STACK_SERVICE_ROLE_UNAUTHORIZED' };
    }
    const authenticated = await fetchImpl(url, {
      method: 'GET',
      headers: buildSupabaseServiceRoleRestProbeHeadersV1(input.serviceRoleKey),
      redirect: 'manual',
      signal: AbortSignal.timeout(8_000),
    });
    if (authenticated.status !== 200) {
      return { ok: false, reason: 'LOCAL_STACK_SERVICE_ROLE_UNAUTHORIZED' };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'LOCAL_STACK_SERVICE_ROLE_UNAUTHORIZED' };
  }
}

export async function probeLocalStackPostgresReachabilityV1(input: {
  connectionUrl: string;
  postgresQueryImpl?: IsolatedSupabaseLiveProbeDepsV1['postgresQueryImpl'];
}): Promise<{ ok: true } | { ok: false; reason: 'POSTGRES_PROBE_FAILED' }> {
  const queryImpl = input.postgresQueryImpl ?? defaultPostgresQueryImpl;
  try {
    const result = await queryImpl({
      connectionUrl: input.connectionUrl,
      sql: 'SELECT 1 AS local_stack_reachability',
      values: [],
    });
    if (result.rows.length !== 1) {
      return { ok: false, reason: 'POSTGRES_PROBE_FAILED' };
    }
    const value = result.rows[0]?.local_stack_reachability;
    if (value !== 1 && value !== '1') {
      return { ok: false, reason: 'POSTGRES_PROBE_FAILED' };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'POSTGRES_PROBE_FAILED' };
  }
}

/**
 * Local stack connectivity / topology verification only — does not upgrade PROJECT REF IDENTITY.
 * Requires Human-declared stack project_id plus live probes (opt-in via verify CLI flag).
 */
export async function evaluateIsolatedSupabaseLocalStackVerificationLiveV1(
  env: NodeJS.ProcessEnv = process.env,
  deps: IsolatedSupabaseLocalStackVerificationDepsV1 = {},
): Promise<IsolatedSupabaseLocalStackVerificationResultV1> {
  const structural = evaluateIsolatedSupabaseAlignmentStructuralV1(env);
  if (!structural.ok) {
    return { ok: false, reason: structural.reason };
  }

  const appUrl = env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  if (parseSupabaseAppHttpUrlV1(appUrl).kind !== 'local_stack') {
    return { ok: false, reason: 'LOCAL_STACK_VERIFICATION_NOT_APPLICABLE' };
  }

  const stackProjectId = env[M55_R8_ISOLATED_SUPABASE_STACK_PROJECT_ID_ENV_V1]?.trim() ?? '';
  if (!stackProjectId) {
    return { ok: false, reason: 'LOCAL_STACK_STACK_PROJECT_ID_MISSING' };
  }
  if (!M55_R8_LOCAL_STACK_PROJECT_ID_PATTERN_V1.test(stackProjectId)) {
    return { ok: false, reason: 'LOCAL_STACK_STACK_PROJECT_ID_INVALID' };
  }

  const expectedDockerNetwork =
    env[M55_R8_ISOLATED_SUPABASE_STACK_DOCKER_NETWORK_ENV_V1]?.trim() ?? '';
  if (!expectedDockerNetwork) {
    return { ok: false, reason: 'LOCAL_STACK_STACK_DOCKER_NETWORK_MISSING' };
  }
  if (!M55_R8_LOCAL_STACK_DOCKER_NETWORK_NAME_PATTERN_V1.test(expectedDockerNetwork)) {
    return { ok: false, reason: 'LOCAL_STACK_STACK_DOCKER_NETWORK_INVALID' };
  }

  const inspectBinding = deps.inspectLocalStackDockerBindingImpl;
  if (!inspectBinding) {
    return { ok: false, reason: 'LOCAL_STACK_TOPOLOGY_UNVERIFIED' };
  }

  let dockerEvidence: LocalStackDockerBindingEvidenceV1 | null;
  try {
    dockerEvidence = await inspectBinding(stackProjectId);
  } catch {
    return { ok: false, reason: 'LOCAL_STACK_TOPOLOGY_UNVERIFIED' };
  }
  if (!dockerEvidence) {
    return { ok: false, reason: 'LOCAL_STACK_TOPOLOGY_UNVERIFIED' };
  }

  const dockerBinding = probeLocalStackDockerHostBindingV1({
    stackProjectId,
    expectedDockerNetworkName: expectedDockerNetwork,
    evidence: dockerEvidence,
  });
  if (!dockerBinding.ok) {
    return { ok: false, reason: dockerBinding.reason };
  }

  const containerNames = [dockerEvidence.db.name, dockerEvidence.kong.name, dockerEvidence.auth.name];
  const topology = probeLocalSupabaseStackTopologyV1({ stackProjectId, containerNames });
  if (!topology.ok) {
    return { ok: false, reason: topology.reason };
  }

  const apiReach = await probeLocalStackApiReachabilityV1({
    supabaseHttpUrl: appUrl,
    fetchImpl: deps.fetchImpl,
  });
  if (!apiReach.ok) {
    return { ok: false, reason: apiReach.reason };
  }

  const serviceRoleAuth = await probeLocalStackServiceRoleAuthorizationV1({
    supabaseHttpUrl: appUrl,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    fetchImpl: deps.fetchImpl,
  });
  if (!serviceRoleAuth.ok) {
    return { ok: false, reason: serviceRoleAuth.reason };
  }

  const pgReach = await probeLocalStackPostgresReachabilityV1({
    connectionUrl: env.M55_R8_ISOLATED_DATABASE_URL!.trim(),
    postgresQueryImpl: deps.postgresQueryImpl,
  });
  if (!pgReach.ok) {
    return { ok: false, reason: pgReach.reason };
  }

  const checks: LocalStackVerificationCheckV1 = {
    apiReachable: true,
    postgresReachable: true,
    serviceRoleAuthorized: true,
    stackTopologyVerified: true,
  };

  const projectRefIdentity: 'VERIFIED' | 'UNVERIFIED' = structural.humanProjectRefConfirmed
    ? 'VERIFIED'
    : 'UNVERIFIED';

  return {
    ok: true,
    verificationKind: 'LOCAL_STACK_READ_PROBE',
    projectRefIdentity,
    humanProjectRefConfirmed: structural.humanProjectRefConfirmed,
    stackProjectId,
    checks,
    supabaseProjectRefSuffix: structural.supabaseProjectRefSuffix,
    postgresConnectionKind: structural.postgresConnectionKind,
    serviceRoleKeyFormat: structural.serviceRoleKeyFormat,
    serviceRoleJwtRefMatched: structural.serviceRoleJwtRefMatched,
    ...(structural.localStackServiceRoleJwtRefAbsent
      ? { localStackServiceRoleJwtRefAbsent: true }
      : {}),
  };
}

export function localStackVerificationFailureChecklistV1(
  reason: IsolatedSupabaseLocalStackVerificationFailureV1,
): string[] {
  if (
    reason !== 'LOCAL_STACK_VERIFICATION_NOT_APPLICABLE' &&
    reason !== 'LOCAL_STACK_STACK_PROJECT_ID_MISSING' &&
    reason !== 'LOCAL_STACK_STACK_PROJECT_ID_INVALID' &&
    reason !== 'LOCAL_STACK_STACK_DOCKER_NETWORK_MISSING' &&
    reason !== 'LOCAL_STACK_STACK_DOCKER_NETWORK_INVALID' &&
    reason !== 'LOCAL_STACK_TOPOLOGY_UNVERIFIED' &&
    reason !== 'LOCAL_STACK_BINDING_MISMATCH' &&
    reason !== 'LOCAL_STACK_SERVICE_ROLE_UNAUTHORIZED' &&
    reason !== 'REST_PROBE_FAILED' &&
    reason !== 'POSTGRES_PROBE_FAILED'
  ) {
    return alignmentFailureChecklistV1(reason);
  }
  switch (reason) {
    case 'LOCAL_STACK_VERIFICATION_NOT_APPLICABLE':
      return ['Local stack verification requires NEXT_PUBLIC_SUPABASE_URL on http://127.0.0.1:54321'];
    case 'LOCAL_STACK_STACK_PROJECT_ID_MISSING':
      return [
        `Set ${M55_R8_ISOLATED_SUPABASE_STACK_PROJECT_ID_ENV_V1} to the Supabase CLI config project_id for the isolated stack`,
      ];
    case 'LOCAL_STACK_STACK_PROJECT_ID_INVALID':
      return [
        `${M55_R8_ISOLATED_SUPABASE_STACK_PROJECT_ID_ENV_V1} must match the Supabase local stack project_id (lowercase alphanumeric and underscores)`,
      ];
    case 'LOCAL_STACK_STACK_DOCKER_NETWORK_MISSING':
      return [
        `Set ${M55_R8_ISOLATED_SUPABASE_STACK_DOCKER_NETWORK_ENV_V1} to the Human-declared isolated Supabase Docker network name`,
      ];
    case 'LOCAL_STACK_STACK_DOCKER_NETWORK_INVALID':
      return [
        `${M55_R8_ISOLATED_SUPABASE_STACK_DOCKER_NETWORK_ENV_V1} must be a lowercase Docker network name (alphanumeric and underscores)`,
      ];
    case 'LOCAL_STACK_TOPOLOGY_UNVERIFIED':
      return [
        'Docker inspect could not verify running db/kong/auth containers, host port bindings, and shared network for the isolated stack',
      ];
    case 'LOCAL_STACK_BINDING_MISMATCH':
      return [
        'Docker must bind Kong TCP 127.0.0.1:54321→8000 and Postgres TCP 127.0.0.1:54322→5432 exclusively, with db/kong/auth on the declared isolated Docker network name and matching NetworkID',
      ];
    case 'LOCAL_STACK_SERVICE_ROLE_UNAUTHORIZED':
      return [
        'Service role key must authorize GoTrue admin users READ probe (401/403 unauthenticated, exactly 200 with service role) — not generic REST success',
      ];
    case 'REST_PROBE_FAILED':
      return ['Local API reachability requires unauthenticated GoTrue admin probe to return 401 or 403 only'];
    case 'POSTGRES_PROBE_FAILED':
      return ['Postgres reachability requires exactly one row with local_stack_reachability=1'];
    default:
      return ['Local stack verification failed'];
  }
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
  const env = {} as NodeJS.ProcessEnv;

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
    case 'HUMAN_PROJECT_REF_NOT_JWT_VERIFIED':
      return [
        'Local JWT has no verifiable ref claim — Human project ref cannot be cryptographically confirmed from the key',
        'REST and Postgres probes passed — connectivity and target table OK; full identity alignment requires JWT ref or sb_secret workflow',
      ];
    case 'SERVICE_ROLE_JWT_REF_UNRESOLVED':
      return [
        'Hosted isolated projects require a Supabase JWT with a valid ref claim matching the Human project ref',
        'Local full stack may omit ref only with service_role JWT plus live REST probe against http://127.0.0.1:54321',
      ];
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
