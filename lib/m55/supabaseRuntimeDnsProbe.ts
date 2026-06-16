import { lookup } from 'node:dns/promises';
import {
  classifyFetchTransportRejection,
  type SafeRpcTransportMessageClass,
} from './accountDeletionClerkWebhookContract.ts';

const CANONICAL_ORIGIN = 'https://sbogwyzldjxxouhqtpnq.supabase.co' as const;
const HTTPS_TARGET_PATH = '/rest/v1/' as const;
const FETCH_TIMEOUT_MS = 5000 as const;
const MAX_DNS_RESULT_COUNT = 16 as const;

const DNS_ERROR_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ETIMEOUT', 'ESERVFAIL', 'ENODATA']);
const DNS_ERROR_NAMES = new Set(['Error', 'AggregateError', 'DNSException']);

export type HttpsStatusClass =
  | 'INFORMATIONAL'
  | 'SUCCESS'
  | 'REDIRECTION'
  | 'CLIENT_ERROR'
  | 'SERVER_ERROR'
  | 'NONE';

export type SupabaseRuntimeDnsProbeResult = {
  diagnostic: 'supabase_runtime_dns_probe_v1';
  runtime: 'nodejs';
  preview_guard_ok: boolean;
  branch_guard_ok: boolean;
  env_present: boolean;
  env_parse_ok: boolean;
  canonical_origin_match: boolean;
  dns_lookup_attempted: boolean;
  dns_lookup_ok: boolean;
  dns_result_count: number | null;
  dns_error_name: string | null;
  dns_error_code: string | null;
  dns_error_errno: number | null;
  https_probe_attempted: boolean;
  https_response_received: boolean;
  https_status_class: HttpsStatusClass;
  https_status_code: number | null;
  fetch_message_class: SafeRpcTransportMessageClass | null;
  fetch_error_name: string | null;
  fetch_error_code: string | null;
  fetch_error_errno: number | null;
  fetch_cause_name: string | null;
  fetch_cause_code: string | null;
  fetch_cause_errno: number | null;
  timeout_or_abort: boolean | null;
  response_body_read: false;
  secret_material_used: false;
};

export type SupabaseRuntimeDnsProbeInput = {
  envValue: string | undefined;
  isPreview: boolean;
  branchMatches: boolean;
};

export type LookupFn = (
  hostname: string,
  options: { all: true; verbatim: true },
) => Promise<Array<{ address: string; family: number }>>;

export type FetchFn = typeof fetch;

export type SupabaseRuntimeDnsProbeDependencies = {
  lookupFn: LookupFn;
  fetchFn: FetchFn;
  fetchTimeoutMs?: number;
};

function baseResult(
  overrides: Partial<Omit<SupabaseRuntimeDnsProbeResult, 'diagnostic' | 'runtime' | 'response_body_read' | 'secret_material_used'>> = {},
): SupabaseRuntimeDnsProbeResult {
  return {
    diagnostic: 'supabase_runtime_dns_probe_v1',
    runtime: 'nodejs',
    preview_guard_ok: false,
    branch_guard_ok: false,
    env_present: false,
    env_parse_ok: false,
    canonical_origin_match: false,
    dns_lookup_attempted: false,
    dns_lookup_ok: false,
    dns_result_count: null,
    dns_error_name: null,
    dns_error_code: null,
    dns_error_errno: null,
    https_probe_attempted: false,
    https_response_received: false,
    https_status_class: 'NONE',
    https_status_code: null,
    fetch_message_class: null,
    fetch_error_name: null,
    fetch_error_code: null,
    fetch_error_errno: null,
    fetch_cause_name: null,
    fetch_cause_code: null,
    fetch_cause_errno: null,
    timeout_or_abort: null,
    response_body_read: false,
    secret_material_used: false,
    ...overrides,
  };
}

function safeDnsErrorName(value: unknown): string | null {
  try {
    return typeof value === 'string' && DNS_ERROR_NAMES.has(value) ? value : null;
  } catch {
    return null;
  }
}

function safeDnsErrorCode(value: unknown): string | null {
  try {
    return typeof value === 'string' && DNS_ERROR_CODES.has(value) ? value : null;
  } catch {
    return null;
  }
}

function safeDnsErrorErrno(value: unknown): number | null {
  try {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return null;
    }
    return Math.trunc(value);
  } catch {
    return null;
  }
}

function readDnsErrorFields(error: unknown): {
  dns_error_name: string | null;
  dns_error_code: string | null;
  dns_error_errno: number | null;
} {
  try {
    if (error === null || typeof error !== 'object') {
      return { dns_error_name: null, dns_error_code: null, dns_error_errno: null };
    }
    const row = error as Record<string, unknown>;
    const dns_error_code = safeDnsErrorCode(row.code);
    const dns_error_name =
      dns_error_code === null ? null : safeDnsErrorName(row.name);
    const dns_error_errno =
      dns_error_code === null ? null : safeDnsErrorErrno(row.errno);
    return {
      dns_error_name,
      dns_error_code,
      dns_error_errno,
    };
  } catch {
    return { dns_error_name: null, dns_error_code: null, dns_error_errno: null };
  }
}

function mapHttpsStatusClass(status: number): HttpsStatusClass {
  if (status >= 100 && status <= 199) {
    return 'INFORMATIONAL';
  }
  if (status >= 200 && status <= 299) {
    return 'SUCCESS';
  }
  if (status >= 300 && status <= 399) {
    return 'REDIRECTION';
  }
  if (status >= 400 && status <= 499) {
    return 'CLIENT_ERROR';
  }
  if (status >= 500 && status <= 599) {
    return 'SERVER_ERROR';
  }
  return 'NONE';
}

function safeHttpStatusCode(status: number): number | null {
  if (!Number.isFinite(status)) {
    return null;
  }
  const normalized = Math.trunc(status);
  if (normalized < 100 || normalized > 599) {
    return null;
  }
  return normalized;
}

function parseEnvUrl(envValue: string | undefined): URL | null {
  try {
    if (envValue == null || envValue.trim() === '') {
      return null;
    }
    return new URL(envValue);
  } catch {
    return null;
  }
}

function observationToFetchFields(observation: ReturnType<typeof classifyFetchTransportRejection>): Pick<
  SupabaseRuntimeDnsProbeResult,
  | 'fetch_message_class'
  | 'fetch_error_name'
  | 'fetch_error_code'
  | 'fetch_error_errno'
  | 'fetch_cause_name'
  | 'fetch_cause_code'
  | 'fetch_cause_errno'
  | 'timeout_or_abort'
> {
  return {
    fetch_message_class: observation.message_class,
    fetch_error_name: observation.error_name,
    fetch_error_code: observation.error_code,
    fetch_error_errno: observation.error_errno,
    fetch_cause_name: observation.cause_name,
    fetch_cause_code: observation.cause_code,
    fetch_cause_errno: observation.cause_errno,
    timeout_or_abort: observation.timeout_or_abort,
  };
}

async function runHttpsProbe(
  origin: string,
  fetchFn: FetchFn,
  fetchTimeoutMs: number,
): Promise<Pick<
  SupabaseRuntimeDnsProbeResult,
  | 'https_probe_attempted'
  | 'https_response_received'
  | 'https_status_class'
  | 'https_status_code'
  | 'fetch_message_class'
  | 'fetch_error_name'
  | 'fetch_error_code'
  | 'fetch_error_errno'
  | 'fetch_cause_name'
  | 'fetch_cause_code'
  | 'fetch_cause_errno'
  | 'timeout_or_abort'
>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), fetchTimeoutMs);
  try {
    const response = await fetchFn(`${origin}${HTTPS_TARGET_PATH}`, {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
      signal: controller.signal,
    });
    const statusCode = safeHttpStatusCode(response.status);
    return {
      https_probe_attempted: true,
      https_response_received: true,
      https_status_class: statusCode === null ? 'NONE' : mapHttpsStatusClass(statusCode),
      https_status_code: statusCode,
      fetch_message_class: null,
      fetch_error_name: null,
      fetch_error_code: null,
      fetch_error_errno: null,
      fetch_cause_name: null,
      fetch_cause_code: null,
      fetch_cause_errno: null,
      timeout_or_abort: null,
    };
  } catch (error) {
    const observation = classifyFetchTransportRejection(error);
    return {
      https_probe_attempted: true,
      https_response_received: false,
      https_status_class: 'NONE',
      https_status_code: null,
      ...observationToFetchFields(observation),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function runSupabaseRuntimeDnsProbe(
  input: SupabaseRuntimeDnsProbeInput,
  deps: SupabaseRuntimeDnsProbeDependencies,
): Promise<SupabaseRuntimeDnsProbeResult> {
  const previewGuardOk = input.isPreview;
  const branchGuardOk = input.branchMatches;

  if (!previewGuardOk || !branchGuardOk) {
    return baseResult({
      preview_guard_ok: previewGuardOk,
      branch_guard_ok: branchGuardOk,
    });
  }

  const envPresent = input.envValue != null && input.envValue.trim() !== '';
  if (!envPresent) {
    return baseResult({
      preview_guard_ok: true,
      branch_guard_ok: true,
      env_present: false,
    });
  }

  const parsed = parseEnvUrl(input.envValue);
  if (parsed === null) {
    return baseResult({
      preview_guard_ok: true,
      branch_guard_ok: true,
      env_present: true,
      env_parse_ok: false,
    });
  }

  const canonicalOriginMatch = parsed.origin === CANONICAL_ORIGIN;
  if (!canonicalOriginMatch) {
    return baseResult({
      preview_guard_ok: true,
      branch_guard_ok: true,
      env_present: true,
      env_parse_ok: true,
      canonical_origin_match: false,
    });
  }

  let dnsLookupAttempted = false;
  let dnsLookupOk = false;
  let dnsResultCount: number | null = null;
  let dnsErrorName: string | null = null;
  let dnsErrorCode: string | null = null;
  let dnsErrorErrno: number | null = null;

  try {
    dnsLookupAttempted = true;
    const lookupResults = await deps.lookupFn(parsed.hostname, { all: true, verbatim: true });
    dnsLookupOk = true;
    dnsResultCount = Math.min(lookupResults.length, MAX_DNS_RESULT_COUNT);
  } catch (error) {
    const fields = readDnsErrorFields(error);
    dnsErrorName = fields.dns_error_name;
    dnsErrorCode = fields.dns_error_code;
    dnsErrorErrno = fields.dns_error_errno;
  }

  const partial: SupabaseRuntimeDnsProbeResult = baseResult({
    preview_guard_ok: true,
    branch_guard_ok: true,
    env_present: true,
    env_parse_ok: true,
    canonical_origin_match: true,
    dns_lookup_attempted: dnsLookupAttempted,
    dns_lookup_ok: dnsLookupOk,
    dns_result_count: dnsResultCount,
    dns_error_name: dnsErrorName,
    dns_error_code: dnsErrorCode,
    dns_error_errno: dnsErrorErrno,
  });

  if (!dnsLookupOk) {
    return partial;
  }

  const httpsFields = await runHttpsProbe(
    parsed.origin,
    deps.fetchFn,
    deps.fetchTimeoutMs ?? FETCH_TIMEOUT_MS,
  );

  return {
    ...partial,
    ...httpsFields,
  };
}

export const defaultLookupFn: LookupFn = lookup;

export const defaultFetchFn: FetchFn = globalThis.fetch.bind(globalThis);
