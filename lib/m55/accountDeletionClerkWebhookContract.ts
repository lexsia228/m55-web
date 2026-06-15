/** Svix delivery contract: only 2xx is success; non-2xx (including 400) triggers retry. */
export const SVIX_NON_2XX_TRIGGERS_RETRY = true as const;

export const SVIX_HEADER_NAMES = [
  'svix-id',
  'svix-timestamp',
  'svix-signature',
] as const;

export const KNOWN_RPC_ERROR_CODES = new Set([
  'INVALID_INPUT',
  'INVALID_EVENT_TYPE',
  'INVALID_PROCESSING_STATE',
  'LEDGER_CLAIM_FAILED',
  'CLEANUP_FAILED',
  'VERIFICATION_FAILED',
]);

const RPC_ERROR_RESPONSE_KEY: Readonly<Record<string, string>> = {
  INVALID_INPUT: 'invalid_input',
  INVALID_EVENT_TYPE: 'invalid_event_type',
  INVALID_PROCESSING_STATE: 'processing_conflict',
  LEDGER_CLAIM_FAILED: 'ledger_claim_failed',
  CLEANUP_FAILED: 'cleanup_failed',
  VERIFICATION_FAILED: 'verification_failed',
};

export const USER_REF_HASH_RE = /^[0-9a-f]{16}$/;

export function listMissingSvixHeaders(
  hdrs: Pick<Headers, 'get'>
): Array<(typeof SVIX_HEADER_NAMES)[number]> {
  const missing: Array<(typeof SVIX_HEADER_NAMES)[number]> = [];
  for (const name of SVIX_HEADER_NAMES) {
    const value = hdrs.get(name);
    if (value == null || value.trim() === '') {
      missing.push(name);
    }
  }
  return missing;
}

export function isValidClerkUserId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 128 &&
    value === value.trim()
  );
}

export function isValidSvixId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 128 &&
    value === value.trim()
  );
}

export function isRpcSuccess(data: unknown): boolean {
  if (data === null || typeof data !== 'object') {
    return false;
  }
  const row = data as Record<string, unknown>;
  return row.ok === true && row.status === 'succeeded';
}

export function parseKnownRpcFailure(data: unknown): string | null {
  if (data === null || typeof data !== 'object') {
    return null;
  }
  const row = data as Record<string, unknown>;
  if (row.ok !== false || row.status !== 'failed') {
    return null;
  }
  const code = row.error_code;
  if (typeof code !== 'string' || !KNOWN_RPC_ERROR_CODES.has(code)) {
    return null;
  }
  return code;
}

export function rpcFailureResponseKey(errorCode: string): string {
  return RPC_ERROR_RESPONSE_KEY[errorCode] ?? 'invalid_rpc_result';
}

export const SAFE_RPC_TRANSPORT_MESSAGE_CLASSES = [
  'POSTGREST_STRUCTURED_ERROR',
  'FETCH_DNS_ERROR',
  'FETCH_CONNECT_ERROR',
  'FETCH_TLS_ERROR',
  'FETCH_ABORTED',
  'INVALID_URL_OR_CLIENT_CONSTRUCTION',
  'RESPONSE_PARSE_ERROR',
  'SUPABASE_AUTH_OR_API_ERROR',
  'UNKNOWN_TRANSPORT_ERROR',
] as const;

export type SafeRpcTransportMessageClass =
  (typeof SAFE_RPC_TRANSPORT_MESSAGE_CLASSES)[number];

export type SafeRpcTransportFailure = {
  message_class: SafeRpcTransportMessageClass;
  error_name: string | null;
  error_code: string | null;
  error_status: number | null;
  postgrest_code: string | null;
  cause_name: string | null;
  cause_code: string | null;
  cause_errno: number | null;
  request_dispatched: boolean | null;
  response_received: boolean | null;
  timeout_or_abort: boolean | null;
};

const DNS_CAUSE_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN']);
const CONNECT_CAUSE_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
]);
const TLS_CAUSE_CODES = new Set([
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UNABLE_TO_GET_ISSUER_CERT',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'CERT_HAS_EXPIRED',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'ERR_TLS_CERT_ALTNAME_INVALID',
]);
const ALLOWED_ERROR_NAMES = new Set([
  'PostgrestError',
  'AbortError',
  'TypeError',
  'SyntaxError',
  'FetchError',
]);
const INVALID_URL_CODES = new Set(['ERR_INVALID_URL', 'ERR_INVALID_URL_SCHEME']);

function emptySafeRpcTransportFailure(
  messageClass: SafeRpcTransportMessageClass,
  overrides: Partial<SafeRpcTransportFailure> = {},
): SafeRpcTransportFailure {
  return {
    message_class: messageClass,
    error_name: null,
    error_code: null,
    error_status: null,
    postgrest_code: null,
    cause_name: null,
    cause_code: null,
    cause_errno: null,
    request_dispatched: null,
    response_received: null,
    timeout_or_abort: null,
    ...overrides,
  };
}

function safePostgrestCode(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  if (/^PGRST\d{3}$/.test(value)) {
    return value;
  }
  if (/^[0-9A-Z]{5}$/.test(value)) {
    return value;
  }
  return null;
}

function safeHttpStatus(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  const status = Math.trunc(value);
  if (status < 100 || status > 599) {
    return null;
  }
  return status;
}

function safeAllowlistedErrorName(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  return ALLOWED_ERROR_NAMES.has(value) ? value : null;
}

function safeAllowlistedCauseCode(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  if (
    DNS_CAUSE_CODES.has(value) ||
    CONNECT_CAUSE_CODES.has(value) ||
    TLS_CAUSE_CODES.has(value) ||
    INVALID_URL_CODES.has(value)
  ) {
    return value;
  }
  return null;
}

function safeCauseErrno(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return Math.trunc(value);
}

function readCause(input: unknown): Record<string, unknown> | null {
  if (input === null || typeof input !== 'object') {
    return null;
  }
  try {
    const row = input as Record<string, unknown>;
    const cause = row.cause;
    if (cause === null || typeof cause !== 'object') {
      return null;
    }
    return cause as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readErrorRow(input: unknown): Record<string, unknown> | null {
  if (input === null || typeof input !== 'object') {
    return null;
  }
  try {
    return input as Record<string, unknown>;
  } catch {
    return null;
  }
}

function classifyFromCause(
  causeName: string | null,
  causeCode: string | null,
  causeErrno: number | null,
  timeoutOrAbort: boolean,
): SafeRpcTransportFailure | null {
  if (timeoutOrAbort || causeName === 'AbortError') {
    return emptySafeRpcTransportFailure('FETCH_ABORTED', {
      error_name: causeName,
      cause_name: causeName,
      cause_code: causeCode,
      cause_errno: causeErrno,
      timeout_or_abort: true,
    });
  }
  if (causeCode && DNS_CAUSE_CODES.has(causeCode)) {
    return emptySafeRpcTransportFailure('FETCH_DNS_ERROR', {
      cause_name: causeName,
      cause_code: causeCode,
      cause_errno: causeErrno,
    });
  }
  if (causeCode && CONNECT_CAUSE_CODES.has(causeCode)) {
    return emptySafeRpcTransportFailure('FETCH_CONNECT_ERROR', {
      cause_name: causeName,
      cause_code: causeCode,
      cause_errno: causeErrno,
    });
  }
  if (causeCode && TLS_CAUSE_CODES.has(causeCode)) {
    return emptySafeRpcTransportFailure('FETCH_TLS_ERROR', {
      cause_name: causeName,
      cause_code: causeCode,
      cause_errno: causeErrno,
    });
  }
  if (causeCode && INVALID_URL_CODES.has(causeCode)) {
    return emptySafeRpcTransportFailure('INVALID_URL_OR_CLIENT_CONSTRUCTION', {
      cause_name: causeName,
      cause_code: causeCode,
      cause_errno: causeErrno,
    });
  }
  return null;
}

export function classifyRpcTransportFailure(
  input: unknown,
  options: { requestDispatched?: boolean | null; responseReceived?: boolean | null } = {},
): SafeRpcTransportFailure {
  const requestDispatched =
    options.requestDispatched === undefined ? null : options.requestDispatched;
  const responseReceived =
    options.responseReceived === undefined ? null : options.responseReceived;

  const row = readErrorRow(input);
  if (!row) {
    return emptySafeRpcTransportFailure('UNKNOWN_TRANSPORT_ERROR', {
      request_dispatched: requestDispatched,
      response_received: responseReceived,
    });
  }

  const errorName = safeAllowlistedErrorName(row.name);
  const errorCode = safeAllowlistedCauseCode(row.code);
  const errorStatus = safeHttpStatus(row.status);
  const postgrestCode = safePostgrestCode(row.code);
  const cause = readCause(row);
  const causeName = cause ? safeAllowlistedErrorName(cause.name) : null;
  const causeCode = cause ? safeAllowlistedCauseCode(cause.code) : null;
  const causeErrno = cause ? safeCauseErrno(cause.errno) : null;
  const timeoutOrAbort =
    errorName === 'AbortError' ||
    causeName === 'AbortError';

  if (postgrestCode) {
    if (errorStatus === 401 || errorStatus === 403) {
      return emptySafeRpcTransportFailure('SUPABASE_AUTH_OR_API_ERROR', {
        error_name: errorName,
        error_code: postgrestCode,
        error_status: errorStatus,
        postgrest_code: postgrestCode,
        request_dispatched: requestDispatched ?? true,
        response_received: responseReceived ?? true,
      });
    }
    return emptySafeRpcTransportFailure('POSTGREST_STRUCTURED_ERROR', {
      error_name: errorName,
      error_code: postgrestCode,
      error_status: errorStatus,
      postgrest_code: postgrestCode,
      request_dispatched: requestDispatched ?? true,
      response_received: responseReceived ?? true,
    });
  }

  if (errorStatus === 401 || errorStatus === 403) {
    return emptySafeRpcTransportFailure('SUPABASE_AUTH_OR_API_ERROR', {
      error_name: errorName,
      error_status: errorStatus,
      request_dispatched: requestDispatched ?? true,
      response_received: responseReceived ?? true,
    });
  }

  const causeClassification = classifyFromCause(
    causeName ?? errorName,
    causeCode ?? errorCode,
    causeErrno,
    timeoutOrAbort,
  );
  if (causeClassification) {
    return {
      ...causeClassification,
      request_dispatched: requestDispatched ?? causeClassification.request_dispatched,
      response_received: responseReceived ?? causeClassification.response_received,
    };
  }

  if (errorName === 'SyntaxError') {
    return emptySafeRpcTransportFailure('RESPONSE_PARSE_ERROR', {
      error_name: errorName,
      request_dispatched: requestDispatched,
      response_received: responseReceived ?? true,
    });
  }

  if (errorName === 'TypeError' && errorCode && INVALID_URL_CODES.has(errorCode)) {
    return emptySafeRpcTransportFailure('INVALID_URL_OR_CLIENT_CONSTRUCTION', {
      error_name: errorName,
      error_code: errorCode,
      request_dispatched: requestDispatched ?? false,
      response_received: responseReceived ?? false,
    });
  }

  return emptySafeRpcTransportFailure('UNKNOWN_TRANSPORT_ERROR', {
    error_name: errorName,
    error_code: errorCode,
    error_status: errorStatus,
    cause_name: causeName,
    cause_code: causeCode,
    cause_errno: causeErrno,
    request_dispatched: requestDispatched,
    response_received: responseReceived,
    timeout_or_abort: timeoutOrAbort ? true : null,
  });
}

export function formatSafeRpcTransportFailureForLog(
  failure: SafeRpcTransportFailure,
): Record<string, string> {
  const out: Record<string, string> = {
    message_class: failure.message_class,
  };
  if (failure.error_name !== null) {
    out.error_name = failure.error_name;
  }
  if (failure.error_code !== null) {
    out.error_code = failure.error_code;
  }
  if (failure.error_status !== null) {
    out.error_status = String(failure.error_status);
  }
  if (failure.postgrest_code !== null) {
    out.postgrest_code = failure.postgrest_code;
  }
  if (failure.cause_name !== null) {
    out.cause_name = failure.cause_name;
  }
  if (failure.cause_code !== null) {
    out.cause_code = failure.cause_code;
  }
  if (failure.cause_errno !== null) {
    out.cause_errno = String(failure.cause_errno);
  }
  if (failure.request_dispatched !== null) {
    out.request_dispatched = failure.request_dispatched ? 'true' : 'false';
  }
  if (failure.response_received !== null) {
    out.response_received = failure.response_received ? 'true' : 'false';
  }
  if (failure.timeout_or_abort !== null) {
    out.timeout_or_abort = failure.timeout_or_abort ? 'true' : 'false';
  }
  return out;
}
