import { createHash, randomBytes, X509Certificate } from 'node:crypto';
import { stdin } from 'node:process';

import {
  EXPECTED_DATABASE_NAME,
  EXPECTED_PORT,
  EXPECTED_SSLMODE,
  SUPABASE_ROOT_2021_CA_DER_SHA256,
  TLS_CA_PEM_MAX_BYTES,
  URI_SCHEME_PATTERN,
  type ExpectedAuthorizationBinding,
  type TargetBindingReceipt,
} from './remoteConnectionAuthority.ts';
import {
  sanitizePreviewRemoteApplyHoldCode,
  type CredentialMethodId,
  type PreviewRemoteApplyHoldCode,
} from './types.ts';

export const SECURE_STDIN_MAX_BYTES = 8192 as const;

export const SECURE_STDIN_ALLOWED_FIELDS = [
  'host',
  'port',
  'database',
  'user',
  'password',
  'sslmode',
  'tlsCaPem',
] as const;

export type SecureStdinAllowedField = (typeof SECURE_STDIN_ALLOWED_FIELDS)[number];

export type ParsedConnectionSecrets = {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly user: string;
  readonly password: string;
  readonly sslmode: typeof EXPECTED_SSLMODE;
  readonly tlsCaPem: string;
};

export type ExecutionCredentialPublicHandle = {
  readonly credentialMethod: CredentialMethodId;
  readonly cleanupToken: string;
};

type SealedConnectionSecrets = ParsedConnectionSecrets & {
  readonly __sealed: unique symbol;
};

export type ExecutionCredentialAcquisitionResult =
  | {
      readonly ok: true;
      readonly handle: ExecutionCredentialPublicHandle;
      readonly releaseConnectionSecrets: () => ParsedConnectionSecrets;
      readonly cleanup: () => void;
    }
  | { readonly ok: false; readonly holdReasonCode: PreviewRemoteApplyHoldCode };

export type CredentialAcquirerDeps = {
  readonly readBytes?: () => Buffer | Promise<Buffer>;
  readonly readSecretLine?: () => string | Promise<string>;
  readonly effectiveUid?: number;
  readonly tempRoot?: string;
  readonly randomSuffix?: () => string;
  readonly nowMs?: () => number;
};

const SEALED_SECRETS = new WeakMap<ExecutionCredentialPublicHandle, SealedConnectionSecrets>();
const CLEANUP_REGISTRY = new WeakMap<ExecutionCredentialPublicHandle, () => void>();
const PEM_BEGIN = '-----BEGIN CERTIFICATE-----';
const PEM_END = '-----END CERTIFICATE-----';

function redactedHold(code: PreviewRemoteApplyHoldCode): PreviewRemoteApplyHoldCode {
  return sanitizePreviewRemoteApplyHoldCode(code);
}

function zeroizeBuffer(buffer: Buffer): void {
  buffer.fill(0);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function decodeJsonObjectKey(jsonSlice: string, match: RegExpMatchArray): string {
  const keyStart = match.index ?? 0;
  const colonOffset = match[0].indexOf(':');
  if (colonOffset < 0) {
    throw new SyntaxError('invalid_json_key');
  }
  const keyToken = jsonSlice.slice(keyStart, keyStart + colonOffset);
  return JSON.parse(keyToken) as string;
}

function hasDuplicateJsonKeys(jsonSlice: string): boolean {
  const pattern = /"((?:\\.|[^"\\])*)"\s*:/g;
  const seen = new Set<string>();
  for (const match of jsonSlice.matchAll(pattern)) {
    const decodedKey = decodeJsonObjectKey(jsonSlice, match);
    if (seen.has(decodedKey)) return true;
    seen.add(decodedKey);
  }
  return false;
}

function hasAccessorOrGetter(value: object): boolean {
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(descriptors)) {
    const descriptor = descriptors[key as string];
    if (!descriptor) continue;
    if (descriptor.get !== undefined || descriptor.set !== undefined) return true;
  }
  return false;
}

function rejectNonPrimitiveField(value: unknown): boolean {
  if (value === null) return true;
  const kind = typeof value;
  if (kind === 'string' || kind === 'number' || kind === 'boolean') return false;
  return true;
}

export function validatePinnedTlsCaPem(tlsCaPem: string): boolean {
  if (typeof tlsCaPem !== 'string') return false;
  if (Buffer.byteLength(tlsCaPem, 'utf8') > TLS_CA_PEM_MAX_BYTES) return false;
  const beginCount = tlsCaPem.split(PEM_BEGIN).length - 1;
  const endCount = tlsCaPem.split(PEM_END).length - 1;
  if (beginCount !== 1 || endCount !== 1) return false;
  const firstBegin = tlsCaPem.indexOf(PEM_BEGIN);
  const firstEnd = tlsCaPem.indexOf(PEM_END);
  if (firstBegin < 0 || firstEnd < 0 || firstEnd <= firstBegin) return false;
  const afterBlock = tlsCaPem.slice(firstEnd + PEM_END.length);
  if (afterBlock.trim().length > 0) return false;
  try {
    const cert = new X509Certificate(tlsCaPem.trim());
    const derSha256 = createHash('sha256').update(cert.raw).digest('hex');
    return derSha256 === SUPABASE_ROOT_2021_CA_DER_SHA256;
  } catch {
    return false;
  }
}

function parseSingleJsonObject(text: string): Record<string, unknown> | null {
  const trimmedStart = text.trimStart();
  if (trimmedStart.length === 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  let objectStart = -1;
  let objectEnd = -1;
  for (let index = 0; index < trimmedStart.length; index += 1) {
    const char = trimmedStart[index]!;
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      if (depth === 0) objectStart = index;
      depth += 1;
      continue;
    }
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        objectEnd = index;
        break;
      }
      if (depth < 0) return null;
    }
  }
  if (objectStart !== 0 || objectEnd < 0) return null;
  const jsonSlice = trimmedStart.slice(objectStart, objectEnd + 1);
  const trailing = trimmedStart.slice(objectEnd + 1).trim();
  if (trailing.length > 0) return null;
  try {
    const parsed = JSON.parse(jsonSlice) as unknown;
    if (hasDuplicateJsonKeys(jsonSlice)) return null;
    if (!isPlainObject(parsed)) return null;
    if (hasAccessorOrGetter(parsed)) return null;
    for (const key of Reflect.ownKeys(parsed)) {
      if (typeof key === 'symbol') return null;
    }
    const keys = Object.keys(parsed);
    if (new Set(keys).size !== keys.length) return null;
    for (const key of keys) {
      if (!SECURE_STDIN_ALLOWED_FIELDS.includes(key as SecureStdinAllowedField)) return null;
      if (rejectNonPrimitiveField(parsed[key])) return null;
    }
    for (const required of SECURE_STDIN_ALLOWED_FIELDS) {
      if (!(required in parsed)) return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function validateSecureStdinObject(record: Record<string, unknown>): ParsedConnectionSecrets | null {
  const host = record.host;
  const port = record.port;
  const database = record.database;
  const user = record.user;
  const password = record.password;
  const sslmode = record.sslmode;
  const tlsCaPem = record.tlsCaPem;
  if (typeof host !== 'string' || host.trim().length === 0) return null;
  if (URI_SCHEME_PATTERN.test(host)) return null;
  if (host.includes('@')) return null;
  if (typeof port !== 'number' || !Number.isFinite(port) || port !== Math.trunc(port) || port <= 0) {
    return null;
  }
  if (typeof database !== 'string' || database.trim().length === 0) return null;
  if (typeof user !== 'string' || user.trim().length === 0) return null;
  if (typeof password !== 'string' || password.length === 0) return null;
  if (sslmode !== EXPECTED_SSLMODE) return null;
  if (typeof tlsCaPem !== 'string' || tlsCaPem.length === 0) return null;
  if (!validatePinnedTlsCaPem(tlsCaPem)) return null;
  if (database !== EXPECTED_DATABASE_NAME) return null;
  if (port !== EXPECTED_PORT) return null;
  return {
    host,
    port,
    database,
    user,
    password,
    sslmode: EXPECTED_SSLMODE,
    tlsCaPem,
  };
}

export function parseSecureStdinConnectionConfig(
  bytes: Buffer,
): { ok: true; secrets: ParsedConnectionSecrets } | { ok: false; holdReasonCode: PreviewRemoteApplyHoldCode } {
  if (bytes.length > SECURE_STDIN_MAX_BYTES) {
    return { ok: false, holdReasonCode: redactedHold('HOLD_CREDENTIAL_METHOD_INVALID') };
  }
  const text = bytes.toString('utf8');
  const parsed = parseSingleJsonObject(text);
  if (!parsed) {
    return { ok: false, holdReasonCode: redactedHold('HOLD_CREDENTIAL_METHOD_INVALID') };
  }
  const secrets = validateSecureStdinObject(parsed);
  if (!secrets) {
    return { ok: false, holdReasonCode: redactedHold('HOLD_CREDENTIAL_METHOD_INVALID') };
  }
  return { ok: true, secrets };
}

function buildCleanupToken(method: CredentialMethodId, suffix: string): string {
  return createHash('sha256')
    .update(`${method}:${suffix}`, 'utf8')
    .digest('hex')
    .slice(0, 16);
}

function registerHandle(
  method: CredentialMethodId,
  secrets: ParsedConnectionSecrets,
  cleanup: () => void,
  suffix: string,
): ExecutionCredentialAcquisitionResult {
  const handle: ExecutionCredentialPublicHandle = {
    credentialMethod: method,
    cleanupToken: buildCleanupToken(method, suffix),
  };
  SEALED_SECRETS.set(handle, secrets as SealedConnectionSecrets);
  CLEANUP_REGISTRY.set(handle, cleanup);
  return {
    ok: true,
    handle,
    releaseConnectionSecrets: () => {
      const sealed = SEALED_SECRETS.get(handle);
      if (!sealed) {
        throw new Error('HOLD_UNEXPECTED_INTERNAL');
      }
      return {
        host: sealed.host,
        port: sealed.port,
        database: sealed.database,
        user: sealed.user,
        password: sealed.password,
        sslmode: sealed.sslmode,
        tlsCaPem: sealed.tlsCaPem,
      };
    },
    cleanup: () => {
      const fn = CLEANUP_REGISTRY.get(handle);
      fn?.();
      SEALED_SECRETS.delete(handle);
      CLEANUP_REGISTRY.delete(handle);
    },
  };
}

export async function readBoundedBytesOnceFromStream(
  stream: NodeJS.ReadableStream,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    const zeroizeChunks = (): void => {
      for (const chunk of chunks) {
        zeroizeBuffer(chunk);
      }
      chunks.length = 0;
    };
    const onData = (chunk: Buffer | string): void => {
      const piece = typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk;
      total += piece.length;
      if (total > SECURE_STDIN_MAX_BYTES) {
        zeroizeBuffer(piece);
        zeroizeChunks();
        cleanup();
        reject(new Error('HOLD_CREDENTIAL_METHOD_INVALID'));
        return;
      }
      chunks.push(piece);
    };
    const onEnd = (): void => {
      cleanup();
      const copied = Buffer.concat(chunks);
      zeroizeChunks();
      resolve(copied);
    };
    const onError = (error: Error): void => {
      zeroizeChunks();
      cleanup();
      reject(error);
    };
    const cleanup = (): void => {
      stream.off('data', onData);
      stream.off('end', onEnd);
      stream.off('error', onError);
    };
    stream.on('data', onData);
    stream.on('end', onEnd);
    stream.on('error', onError);
    if ('resume' in stream && typeof stream.resume === 'function') {
      stream.resume();
    }
  });
}

export async function readBoundedStdinBytesOnce(): Promise<Buffer> {
  if (stdin.isTTY) {
    return Buffer.alloc(0);
  }
  return readBoundedBytesOnceFromStream(stdin);
}

export async function acquireSecureStdinConnectionConfig(
  deps: CredentialAcquirerDeps = {},
): Promise<ExecutionCredentialAcquisitionResult> {
  let buffer: Buffer | null = null;
  try {
    const reader = deps.readBytes ?? readBoundedStdinBytesOnce;
    buffer = await Promise.resolve(reader());
    if (buffer.length > SECURE_STDIN_MAX_BYTES) {
      zeroizeBuffer(buffer);
      buffer = null;
      return { ok: false, holdReasonCode: redactedHold('HOLD_CREDENTIAL_METHOD_INVALID') };
    }
    const parsed = parseSecureStdinConnectionConfig(buffer);
    if (!parsed.ok) {
      zeroizeBuffer(buffer);
      buffer = null;
      return parsed;
    }
    const suffix = (deps.randomSuffix ?? (() => randomBytes(8).toString('hex')))();
    const capturedBuffer = buffer;
    return registerHandle('SECURE_STDIN_CONNECTION_CONFIG_v1', parsed.secrets, () => {
      if (capturedBuffer) zeroizeBuffer(capturedBuffer);
    }, suffix);
  } catch {
    if (buffer) {
      zeroizeBuffer(buffer);
      buffer = null;
    }
    return { ok: false, holdReasonCode: redactedHold('HOLD_UNEXPECTED_INTERNAL') };
  }
}

export async function acquireExecutionCredentials(
  method: CredentialMethodId,
  receipt: TargetBindingReceipt,
  binding: ExpectedAuthorizationBinding,
  deps: CredentialAcquirerDeps = {},
): Promise<ExecutionCredentialAcquisitionResult> {
  if (receipt.credentialMethod !== method) {
    return { ok: false, holdReasonCode: redactedHold('HOLD_CREDENTIAL_METHOD_INVALID') };
  }
  if (binding.credentialMethod !== method) {
    return { ok: false, holdReasonCode: redactedHold('HOLD_CREDENTIAL_METHOD_INVALID') };
  }
  switch (method) {
    case 'SECURE_STDIN_CONNECTION_CONFIG_v1':
      return acquireSecureStdinConnectionConfig(deps);
    case 'TEMP_PGPASSFILE_0600_v1':
      return { ok: false, holdReasonCode: redactedHold('HOLD_CREDENTIAL_METHOD_INVALID') };
    default:
      return { ok: false, holdReasonCode: redactedHold('HOLD_CREDENTIAL_METHOD_INVALID') };
  }
}

export function publicHandleToJson(handle: ExecutionCredentialPublicHandle): Record<string, unknown> {
  return {
    credentialMethod: handle.credentialMethod,
    cleanupToken: handle.cleanupToken,
  };
}
