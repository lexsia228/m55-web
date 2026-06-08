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
