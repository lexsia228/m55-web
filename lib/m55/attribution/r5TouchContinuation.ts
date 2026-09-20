import 'server-only';
import { randomBytes } from 'node:crypto';
import {
  M55_R5_TOUCH_CONTINUATION_COOKIE_MAX_AGE_SECONDS,
  M55_R5_TOUCH_CONTINUATION_COOKIE_NAME,
  M55_R5_TOUCH_CONTINUATION_COOKIE_PATH,
} from './r5TouchIngestContract';

const CONTINUATION_HEX_RE = /^[0-9a-f]{32}$/;
const POSTGREST_BYTEA_TEXT_RE = /^\\x[0-9a-f]{32}$/;

export function encodeByteaForPostgrestRpcV1(bytes: Buffer): string {
  if (!Buffer.isBuffer(bytes) || bytes.length !== 16) {
    throw new Error('INVALID_BYTEA_LENGTH');
  }
  return `\\x${bytes.toString('hex')}`;
}

export function encodeNullableByteaForPostgrestRpcV1(bytes: Buffer | null): string | null {
  if (bytes === null) return null;
  return encodeByteaForPostgrestRpcV1(bytes);
}

export function decodePostgrestByteaToBufferV1(value: unknown): Buffer | null {
  if (value === null || value === undefined) return null;
  if (Buffer.isBuffer(value)) {
    if (value.length !== 16) {
      throw new Error('INVALID_BYTEA_LENGTH');
    }
    return value;
  }
  if (typeof value === 'string' && POSTGREST_BYTEA_TEXT_RE.test(value)) {
    return Buffer.from(value.slice(2), 'hex');
  }
  throw new Error('INVALID_BYTEA_TEXT');
}

export function mintContinuationIdBytes(): Buffer {
  return randomBytes(16);
}

export function continuationIdBytesToHex(bytes: Buffer): string {
  if (bytes.length !== 16) {
    throw new Error('INVALID_CONTINUATION_ID_LENGTH');
  }
  return bytes.toString('hex');
}

export function parseContinuationIdHex(hex: string): Buffer | null {
  if (!CONTINUATION_HEX_RE.test(hex)) {
    return null;
  }
  return Buffer.from(hex, 'hex');
}

export function parseContinuationCookieValue(cookieHeader: string | null): Buffer | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${M55_R5_TOUCH_CONTINUATION_COOKIE_NAME}=`)) continue;
    const value = trimmed.slice(M55_R5_TOUCH_CONTINUATION_COOKIE_NAME.length + 1);
    return parseContinuationIdHex(value);
  }
  return null;
}

export function buildContinuationSetCookieHeader(continuationIdHex: string): string {
  if (!CONTINUATION_HEX_RE.test(continuationIdHex)) {
    throw new Error('INVALID_CONTINUATION_ID_HEX');
  }
  return [
    `${M55_R5_TOUCH_CONTINUATION_COOKIE_NAME}=${continuationIdHex}`,
    'Path=' + M55_R5_TOUCH_CONTINUATION_COOKIE_PATH,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${M55_R5_TOUCH_CONTINUATION_COOKIE_MAX_AGE_SECONDS}`,
  ].join('; ');
}

export function buildContinuationClearCookieHeader(): string {
  return [
    `${M55_R5_TOUCH_CONTINUATION_COOKIE_NAME}=`,
    'Path=' + M55_R5_TOUCH_CONTINUATION_COOKIE_PATH,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Max-Age=0',
  ].join('; ');
}

export function isContinuationTouchTripleBound(row: {
  touch_event_key_bytes: Buffer | null;
  qualified_touch_at_ms: number | null;
  payload_fingerprint: string | null;
}): boolean {
  return (
    row.touch_event_key_bytes !== null &&
    row.qualified_touch_at_ms !== null &&
    row.payload_fingerprint !== null
  );
}
