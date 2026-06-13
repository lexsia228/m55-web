import { createHash } from 'node:crypto';
import { constants as fsConstants, lstat, open } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';

import {
  BASELINE_STAGE_A_COMMIT,
  EXPECTED_BRANCH,
  EXPECTED_REPO_ROOT,
  EXPECTED_SOURCE_AUTHORITY_BASE,
  isGitAncestor,
  loadStageABindingAddendum,
  readWorkspaceFacts,
  STAGE_A_BINDING_ADDENDUM_REL_PATH,
} from './transactionNormalizedCore.ts';

export type InvocationAuthority = 'UNTRUSTED_CALLER_INPUT';

export type TechnicalVerificationOutcome = 'ATTESTATION_CONTENT_VERIFIED' | 'VERIFICATION_HOLD';

export type HumanGateOutcome = 'HUMAN_GATE_REVIEW_REQUIRED';

export type VerifierHoldReasonCode =
  | 'VERIFIER_INVOCATION_ARGUMENT_MISSING'
  | 'VERIFIER_INVOCATION_ARGUMENT_DUPLICATE'
  | 'VERIFIER_INVOCATION_ARGUMENT_UNEXPECTED'
  | 'VERIFIER_INVOCATION_SHA_FORMAT_INVALID'
  | 'VERIFIER_INVOCATION_PATH_INVALID'
  | 'VERIFIER_INVOCATION_NETWORK_PATH_FORBIDDEN'
  | 'PLAN_REVIEW_RECORD_MISSING'
  | 'PLAN_REVIEW_RECORD_SHA_MISMATCH'
  | 'PLAN_REVIEW_RECORD_MALFORMED'
  | 'PLAN_REVIEW_RECORD_AUTHORIZATION_MISMATCH'
  | 'PLAN_ATTESTATION_MISSING'
  | 'PLAN_ATTESTATION_SHA_MISMATCH'
  | 'PLAN_ATTESTATION_MALFORMED'
  | 'PLAN_ATTESTATION_CANONICAL_PAYLOAD_MISMATCH'
  | 'PLAN_ATTESTATION_REBIND_COMMIT_MISMATCH'
  | 'PLAN_ATTESTATION_ADDENDUM_IDENTITY_MISMATCH'
  | 'PLAN_ATTESTATION_PROTECTED_MANIFEST_MISMATCH'
  | 'PLAN_ATTESTATION_PARENT_AUTHORITY_MISMATCH'
  | 'PLAN_ATTESTATION_SCOPE_MISMATCH'
  | 'PLAN_ATTESTATION_AUTHORIZATION_FLAG_MISMATCH'
  | 'PLAN_ATTESTATION_WORKSPACE_MISMATCH'
  | 'PLAN_ATTESTATION_RUNTIME_IDENTITY_MISMATCH'
  | 'PLAN_ATTESTATION_REVIEW_BINDING_MISMATCH'
  | 'VERIFIER_HUMAN_APPROVAL_NOT_ESTABLISHED'
  | 'VERIFIER_IMPLEMENTATION_REVIEW_REQUIRED';

export type UntrustedPlanAttestationInvocation = {
  attestationPath: string;
  expectedAttestationSha256: string;
  reviewRecordPath: string;
  expectedReviewRecordSha256: string;
  repoRoot: string;
};

export type PlanAttestationVerificationSuccess = {
  invocationAuthority: InvocationAuthority;
  technicalOutcome: 'ATTESTATION_CONTENT_VERIFIED';
  humanGateOutcome: HumanGateOutcome;
  humanGateRequired: true;
  planOnlyPass: false;
  executionLocked: true;
  automaticNextGate: false;
  verifierImplementationReviewRequired: true;
};

export type PlanAttestationVerificationHold = {
  invocationAuthority: InvocationAuthority;
  technicalOutcome: 'VERIFICATION_HOLD';
  humanGateOutcome: HumanGateOutcome;
  humanGateRequired: true;
  planOnlyPass: false;
  executionLocked: true;
  automaticNextGate: false;
  verifierImplementationReviewRequired: true;
  holdReasonCode: VerifierHoldReasonCode;
};

export type PlanAttestationVerificationResult =
  | PlanAttestationVerificationSuccess
  | PlanAttestationVerificationHold;

export type ParsedVerifierCliArgs = {
  attestationPath: string;
  expectedAttestationSha256: string;
  reviewRecordPath: string;
  expectedReviewRecordSha256: string;
};

const SHA256_HEX_RE = /^[0-9a-f]{64}$/;
const MAX_FILE_BYTES = 1_048_576;
const CANONICAL_SERIALIZATION = 'm55.canonical_json.sorted_keys_utf8_no_whitespace.v1';
const MANIFEST_PROJECTION_ID = 'm55.protected_runtime_manifest.v1';
const MANIFEST_SHA256 = '1b2c954bc0c093404c38d01f48c0f5d7d6b52ac3e3f349a8694def7c44fa2744';

const FROZEN_REBIND_COMMIT = 'a8ad7d7f29ba8065fb206bf5d5b6ec98bb199866';
const FROZEN_REBIND_TREE = '839c29954854c20b7bab926cd1a6cef3cb6c0ef6';
const FROZEN_ADDENDUM_BYTES = 7692;
const FROZEN_ADDENDUM_SHA = '812933a338050aded58f2185a66af4a2a8e00c1f46445fbc8ce0f7e9fe2c77df';
const FROZEN_ADDENDUM_CANONICAL = '71215fdf5cd34c1025c69b498b8e8bbf9806af7a10f4deab1c616ad90335e52e';

const REVIEW_RECORD_TOP_LEVEL_KEYS = [
  'schema',
  'schema_version',
  'revision',
  'status',
  'authority_role',
  'review_gate_id',
  'reviewed_at_utc',
  'review_scope',
  'reviewed_attestation',
  'supporting_artifacts',
  'review_checks',
  'authorization',
  'next_gate',
  'self_identity',
] as const;

const ATTESTATION_TOP_LEVEL_KEYS = [
  'schema',
  'schema_version',
  'revision',
  'status',
  'authority_role',
  'execution_status',
  'generated_at_utc',
  'attestation_scope',
  'repository_binding',
  'binding_addendum',
  'protected_runtime_manifest',
  'parent_authority',
  'review_contract',
  'authorization',
  'integrity',
] as const;

const REVIEW_CHECK_KEYS = [
  'attestation_schema_exact',
  'duplicate_json_keys_absent',
  'canonical_payload_property_deletion_verified',
  'canonical_payload_sha_exact',
  'protected_runtime_manifest_projection_exact',
  'protected_runtime_manifest_sha_exact',
  'self_full_file_identity_absent',
  'embedded_human_review_data_absent',
  'authorization_flags_fail_closed',
  'review_bundle_exact_three_members',
  'review_bundle_member_order_exact',
  'review_bundle_directory_entries_absent',
  'review_bundle_member_bytes_match_sources',
  'review_bundle_metadata_normalized',
  'secret_or_credential_material_absent',
] as const;

const REVIEWED_ATTESTATION_KEYS = [
  'filename',
  'bytes',
  'full_file_sha256',
  'canonical_payload_sha256',
  'protected_runtime_manifest_sha256',
  'rebind_commit_sha',
  'rebind_commit_tree_sha',
  'binding_addendum_full_file_sha256',
  'binding_addendum_canonical_payload_sha256',
] as const;

const SUPPORTING_ARTIFACT_ENTRY_KEYS = ['filename', 'bytes', 'sha256'] as const;

const REVIEW_AUTHORIZATION_KEYS = [
  'plan_attestation_review_green',
  'plan_only_pass_authorized',
  'execution_authorization',
  'remote_apply_authorization',
  'local_db_authorization',
  'push_authorization',
] as const;

const REPOSITORY_BINDING_KEYS = [
  'expected_repo_root',
  'expected_branch',
  'rebind_commit_sha',
  'parent_baseline_commit_sha',
  'source_authority_base_commit_sha',
  'rebind_commit_tree_sha',
] as const;

const BINDING_ADDENDUM_KEYS = ['path', 'bytes', 'full_file_sha256', 'canonical_payload_sha256'] as const;

const PROTECTED_RUNTIME_MANIFEST_KEYS = [
  'projection_identifier',
  'canonical_serialization',
  'entry_count',
  'sha256',
] as const;

const PARENT_AUTHORITY_KEYS = ['contract', 'matrix', 'parser_evidence'] as const;

const PARENT_AUTHORITY_ENTRY_KEYS = ['path', 'bytes', 'sha256'] as const;

const REVIEW_CONTRACT_KEYS = [
  'review_gate_id',
  'external_review_record_required',
  'review_record_embedded',
  'full_file_sha_frozen_externally',
  'review_timestamp_embedded',
  'reviewer_identity_embedded',
] as const;

const ATTESTATION_AUTHORIZATION_KEYS = [
  'plan_only_source_validation_authority',
  'plan_only_pass_is_not_execution_authorization',
  'execution_authorization',
  'remote_apply_authorization',
  'local_db_authorization',
  'automatic_next_gate_authorization',
] as const;

const INTEGRITY_KEYS = [
  'self_full_file_sha_forbidden',
  'self_git_blob_id_forbidden',
  'self_git_commit_sha_forbidden',
  'canonical_serialization',
  'canonical_payload_exclusions',
  'canonical_payload_sha256',
  'canonical_payload_sha256_role',
  'external_full_file_sha_review_required',
] as const;

const RFC3339_UTC_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/;

export const VERIFIER_HOLD_REASON_CODES: readonly VerifierHoldReasonCode[] = [
  'VERIFIER_INVOCATION_ARGUMENT_MISSING',
  'VERIFIER_INVOCATION_ARGUMENT_DUPLICATE',
  'VERIFIER_INVOCATION_ARGUMENT_UNEXPECTED',
  'VERIFIER_INVOCATION_SHA_FORMAT_INVALID',
  'VERIFIER_INVOCATION_PATH_INVALID',
  'VERIFIER_INVOCATION_NETWORK_PATH_FORBIDDEN',
  'PLAN_REVIEW_RECORD_MISSING',
  'PLAN_REVIEW_RECORD_SHA_MISMATCH',
  'PLAN_REVIEW_RECORD_MALFORMED',
  'PLAN_REVIEW_RECORD_AUTHORIZATION_MISMATCH',
  'PLAN_ATTESTATION_MISSING',
  'PLAN_ATTESTATION_SHA_MISMATCH',
  'PLAN_ATTESTATION_MALFORMED',
  'PLAN_ATTESTATION_CANONICAL_PAYLOAD_MISMATCH',
  'PLAN_ATTESTATION_REBIND_COMMIT_MISMATCH',
  'PLAN_ATTESTATION_ADDENDUM_IDENTITY_MISMATCH',
  'PLAN_ATTESTATION_PROTECTED_MANIFEST_MISMATCH',
  'PLAN_ATTESTATION_PARENT_AUTHORITY_MISMATCH',
  'PLAN_ATTESTATION_SCOPE_MISMATCH',
  'PLAN_ATTESTATION_AUTHORIZATION_FLAG_MISMATCH',
  'PLAN_ATTESTATION_WORKSPACE_MISMATCH',
  'PLAN_ATTESTATION_RUNTIME_IDENTITY_MISMATCH',
  'PLAN_ATTESTATION_REVIEW_BINDING_MISMATCH',
  'VERIFIER_HUMAN_APPROVAL_NOT_ESTABLISHED',
  'VERIFIER_IMPLEMENTATION_REVIEW_REQUIRED',
] as const;

const CONTROLLED_HOLD_REASON_CODE_SET = new Set<string>(VERIFIER_HOLD_REASON_CODES);

const SUPPORTING_ARTIFACTS = [
  {
    filename: 'M55_TRANSACTION_NORMALIZED_STAGE_A_PLAN_ATTESTATION_GENERATION_REPORT.txt',
    bytes: 1423,
    sha256: '94177d24bd5c6fcf9a0392e493c836d1cc1e7552e7a2585a9731766d4e1ddb56',
  },
  {
    filename: 'M55_TRANSACTION_NORMALIZED_STAGE_A_PLAN_ATTESTATION_FILE_IDENTITIES.json',
    bytes: 1926,
    sha256: '2cfe270a04e9c14dfaf52d190778a071bd5d2fa28d672e168bc45741ef954c9a',
  },
  {
    filename: 'M55_TRANSACTION_NORMALIZED_STAGE_A_PLAN_ATTESTATION_REVIEW_BUNDLE.zip',
    bytes: 3882,
    sha256: 'e106479d9fbe69386614a45c62cbb4ebed613ea5f1f3a41282aa4a2022e74bb9',
  },
] as const;

class VerifierHoldError extends Error {
  readonly holdReasonCode: VerifierHoldReasonCode;

  constructor(holdReasonCode: VerifierHoldReasonCode) {
    super(holdReasonCode);
    this.holdReasonCode = holdReasonCode;
  }
}

function validateInvocationInput(input: UntrustedPlanAttestationInvocation): void {
  const attestationPathError = validateLocalPathCandidate(input.attestationPath);
  if (attestationPathError) hold(attestationPathError);
  const reviewPathError = validateLocalPathCandidate(input.reviewRecordPath);
  if (reviewPathError) hold(reviewPathError);
  if (!validateSha256Hex(input.expectedAttestationSha256)) hold('VERIFIER_INVOCATION_SHA_FORMAT_INVALID');
  if (!validateSha256Hex(input.expectedReviewRecordSha256)) hold('VERIFIER_INVOCATION_SHA_FORMAT_INVALID');
  if (resolve(input.repoRoot) !== EXPECTED_REPO_ROOT) hold('PLAN_ATTESTATION_WORKSPACE_MISMATCH');
}

function hold(code: VerifierHoldReasonCode): never {
  throw new VerifierHoldError(code);
}

function sha256Bytes(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertExactObjectKeys(
  value: unknown,
  expectedKeys: readonly string[],
  code: VerifierHoldReasonCode,
): Record<string, unknown> {
  if (!isPlainObject(value)) hold(code);
  const actualKeys = Object.keys(value);
  if (actualKeys.length !== expectedKeys.length) hold(code);
  for (const key of expectedKeys) {
    if (!actualKeys.includes(key)) hold(code);
  }
  for (const key of actualKeys) {
    if (!expectedKeys.includes(key)) hold(code);
  }
  return value;
}

function assertExactTopLevelKeys(
  value: unknown,
  expectedKeys: readonly string[],
  code: VerifierHoldReasonCode,
): Record<string, unknown> {
  return assertExactObjectKeys(value, expectedKeys, code);
}

function assertStrictRfc3339Utc(value: unknown, code: VerifierHoldReasonCode): string {
  if (typeof value !== 'string') hold(code);
  const match = RFC3339_UTC_RE.exec(value);
  if (!match) hold(code);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (month < 1 || month > 12) hold(code);
  if (hour > 23 || minute > 59 || second > 59) hold(code);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) hold(code);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const roundTrip =
    `${date.getUTCFullYear().toString().padStart(4, '0')}-` +
    `${(date.getUTCMonth() + 1).toString().padStart(2, '0')}-` +
    `${date.getUTCDate().toString().padStart(2, '0')}T` +
    `${date.getUTCHours().toString().padStart(2, '0')}:` +
    `${date.getUTCMinutes().toString().padStart(2, '0')}:` +
    `${date.getUTCSeconds().toString().padStart(2, '0')}Z`;
  if (roundTrip !== value) hold(code);
  return value;
}

export function normalizeToControlledHoldReasonCode(value: unknown): VerifierHoldReasonCode {
  if (value instanceof VerifierHoldError) {
    return value.holdReasonCode;
  }
  if (typeof value === 'string' && CONTROLLED_HOLD_REASON_CODE_SET.has(value)) {
    return value as VerifierHoldReasonCode;
  }
  return 'VERIFIER_INVOCATION_ARGUMENT_UNEXPECTED';
}

export function assertExactObjectKeysForTests(
  value: unknown,
  expectedKeys: readonly string[],
  code: VerifierHoldReasonCode,
): Record<string, unknown> {
  return assertExactObjectKeys(value, expectedKeys, code);
}

export function assertStrictRfc3339UtcForTests(value: unknown, code: VerifierHoldReasonCode): string {
  return assertStrictRfc3339Utc(value, code);
}

function assertBoolean(value: unknown, code: VerifierHoldReasonCode): boolean {
  if (typeof value !== 'boolean') hold(code);
  return value;
}

function assertString(value: unknown, code: VerifierHoldReasonCode): string {
  if (typeof value !== 'string') hold(code);
  return value;
}

function assertNumber(value: unknown, code: VerifierHoldReasonCode): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) hold(code);
  return value;
}

function assertStringArray(value: unknown, code: VerifierHoldReasonCode): string[] {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string')) hold(code);
  return value;
}

export function canonicalSerializeForTests(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) hold('PLAN_ATTESTATION_MALFORMED');
    return JSON.stringify(value);
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalSerializeForTests(entry)).join(',')}]`;
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${canonicalSerializeForTests(value[key])}`)
      .join(',')}}`;
  }
  hold('PLAN_ATTESTATION_MALFORMED');
}

export function computeAttestationCanonicalPayloadSha256(attestation: Record<string, unknown>): string {
  const clone = JSON.parse(JSON.stringify(attestation)) as Record<string, unknown>;
  const integrity = clone.integrity;
  if (!isPlainObject(integrity)) hold('PLAN_ATTESTATION_MALFORMED');
  delete integrity.canonical_payload_sha256;
  return sha256Bytes(Buffer.from(canonicalSerializeForTests(clone), 'utf8'));
}

type JsonToken =
  | { type: 'lbrace' | 'rbrace' | 'lbracket' | 'rbracket' | 'colon' | 'comma' | 'eof' }
  | { type: 'string'; value: string }
  | { type: 'number'; value: number }
  | { type: 'boolean'; value: boolean }
  | { type: 'null' };

class JsonTokenizer {
  private readonly text: string;
  private index = 0;

  constructor(text: string) {
    this.text = text;
  }

  private peek(): string {
    return this.text[this.index] ?? '';
  }

  private advance(count = 1): void {
    this.index += count;
  }

  private skipWhitespace(): void {
    while (this.index < this.text.length) {
      const ch = this.text[this.index];
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        this.index += 1;
        continue;
      }
      break;
    }
  }

  nextToken(): JsonToken {
    this.skipWhitespace();
    if (this.index >= this.text.length) return { type: 'eof' };
    const ch = this.text[this.index];
    switch (ch) {
      case '{':
        this.advance();
        return { type: 'lbrace' };
      case '}':
        this.advance();
        return { type: 'rbrace' };
      case '[':
        this.advance();
        return { type: 'lbracket' };
      case ']':
        this.advance();
        return { type: 'rbracket' };
      case ':':
        this.advance();
        return { type: 'colon' };
      case ',':
        this.advance();
        return { type: 'comma' };
      case '"':
        return { type: 'string', value: this.readString() };
      case 't':
        this.readLiteral('true');
        return { type: 'boolean', value: true };
      case 'f':
        this.readLiteral('false');
        return { type: 'boolean', value: false };
      case 'n':
        this.readLiteral('null');
        return { type: 'null' };
      default:
        if (ch === '-' || (ch >= '0' && ch <= '9')) {
          return { type: 'number', value: this.readNumber() };
        }
        hold('PLAN_ATTESTATION_MALFORMED');
    }
  }

  private readLiteral(expected: string): void {
    if (!this.text.startsWith(expected, this.index)) hold('PLAN_ATTESTATION_MALFORMED');
    this.advance(expected.length);
  }

  private readNumber(): number {
    const start = this.index;
    if (this.peek() === '-') this.advance();
    if (this.peek() === '0') {
      this.advance();
    } else if (this.peek() >= '1' && this.peek() <= '9') {
      while (this.peek() >= '0' && this.peek() <= '9') this.advance();
    } else {
      hold('PLAN_ATTESTATION_MALFORMED');
    }
    if (this.peek() === '.') {
      this.advance();
      if (!(this.peek() >= '0' && this.peek() <= '9')) hold('PLAN_ATTESTATION_MALFORMED');
      while (this.peek() >= '0' && this.peek() <= '9') this.advance();
    }
    if (this.peek() === 'e' || this.peek() === 'E') {
      this.advance();
      if (this.peek() === '+' || this.peek() === '-') this.advance();
      if (!(this.peek() >= '0' && this.peek() <= '9')) hold('PLAN_ATTESTATION_MALFORMED');
      while (this.peek() >= '0' && this.peek() <= '9') this.advance();
    }
    const slice = this.text.slice(start, this.index);
    const value = Number(slice);
    if (!Number.isFinite(value)) hold('PLAN_ATTESTATION_MALFORMED');
    return value;
  }

  private readString(): string {
    if (this.peek() !== '"') hold('PLAN_ATTESTATION_MALFORMED');
    this.advance();
    let result = '';
    while (this.index < this.text.length) {
      const ch = this.text[this.index];
      if (ch === '"') {
        this.advance();
        return result;
      }
      if (ch === '\\') {
        this.advance();
        const esc = this.text[this.index];
        if (esc === undefined) hold('PLAN_ATTESTATION_MALFORMED');
        switch (esc) {
          case '"':
          case '\\':
          case '/':
            result += esc;
            this.advance();
            break;
          case 'b':
            result += '\b';
            this.advance();
            break;
          case 'f':
            result += '\f';
            this.advance();
            break;
          case 'n':
            result += '\n';
            this.advance();
            break;
          case 'r':
            result += '\r';
            this.advance();
            break;
          case 't':
            result += '\t';
            this.advance();
            break;
          case 'u': {
            this.advance();
            const hex = this.text.slice(this.index, this.index + 4);
            if (!/^[0-9a-fA-F]{4}$/.test(hex)) hold('PLAN_ATTESTATION_MALFORMED');
            result += String.fromCharCode(parseInt(hex, 16));
            this.advance(4);
            break;
          }
          default:
            hold('PLAN_ATTESTATION_MALFORMED');
        }
        continue;
      }
      if (ch < '\u0020') hold('PLAN_ATTESTATION_MALFORMED');
      result += ch;
      this.advance();
    }
    hold('PLAN_ATTESTATION_MALFORMED');
  }
}

class DuplicateKeyJsonParser {
  private readonly tokenizer: JsonTokenizer;
  private current: JsonToken;

  constructor(text: string) {
    this.tokenizer = new JsonTokenizer(text);
    this.current = this.tokenizer.nextToken();
  }

  parse(): unknown {
    const value = this.parseValue();
    if (this.current.type !== 'eof') hold('PLAN_ATTESTATION_MALFORMED');
    return value;
  }

  private eat(type: JsonToken['type']): void {
    if (this.current.type !== type) hold('PLAN_ATTESTATION_MALFORMED');
    this.current = this.tokenizer.nextToken();
  }

  private parseValue(): unknown {
    switch (this.current.type) {
      case 'string':
        return this.parseString();
      case 'number':
        return this.parseNumber();
      case 'boolean':
        return this.parseBoolean();
      case 'null':
        return this.parseNull();
      case 'lbrace':
        return this.parseObject();
      case 'lbracket':
        return this.parseArray();
      default:
        hold('PLAN_ATTESTATION_MALFORMED');
    }
  }

  private parseString(): string {
    if (this.current.type !== 'string') hold('PLAN_ATTESTATION_MALFORMED');
    const value = this.current.value;
    this.current = this.tokenizer.nextToken();
    return value;
  }

  private parseNumber(): number {
    if (this.current.type !== 'number') hold('PLAN_ATTESTATION_MALFORMED');
    const value = this.current.value;
    this.current = this.tokenizer.nextToken();
    return value;
  }

  private parseBoolean(): boolean {
    if (this.current.type !== 'boolean') hold('PLAN_ATTESTATION_MALFORMED');
    const value = this.current.value;
    this.current = this.tokenizer.nextToken();
    return value;
  }

  private parseNull(): null {
    if (this.current.type !== 'null') hold('PLAN_ATTESTATION_MALFORMED');
    this.current = this.tokenizer.nextToken();
    return null;
  }

  private parseArray(): unknown[] {
    this.eat('lbracket');
    const result: unknown[] = [];
    if (this.current.type === 'rbracket') {
      this.eat('rbracket');
      return result;
    }
    result.push(this.parseValue());
    while (this.current.type === 'comma') {
      this.eat('comma');
      result.push(this.parseValue());
    }
    this.eat('rbracket');
    return result;
  }

  private parseObject(): Record<string, unknown> {
    this.eat('lbrace');
    const result: Record<string, unknown> = {};
    const seen = new Set<string>();
    if (this.current.type === 'rbrace') {
      this.eat('rbrace');
      return result;
    }
    do {
      if (this.current.type !== 'string') hold('PLAN_ATTESTATION_MALFORMED');
      const key = this.current.value;
      if (seen.has(key)) hold('PLAN_ATTESTATION_MALFORMED');
      seen.add(key);
      this.current = this.tokenizer.nextToken();
      this.eat('colon');
      result[key] = this.parseValue();
      if (this.current.type === 'comma') {
        this.eat('comma');
        continue;
      }
      break;
    } while (true);
    this.eat('rbrace');
    return result;
  }
}

export function parseJsonRejectingDuplicateKeysForTests(text: string): unknown {
  return new DuplicateKeyJsonParser(text).parse();
}

function parseJsonRejectingDuplicateKeys(text: string): Record<string, unknown> {
  const value = parseJsonRejectingDuplicateKeysForTests(text);
  if (!isPlainObject(value)) hold('PLAN_ATTESTATION_MALFORMED');
  return value;
}

export function validateSha256Hex(value: string): boolean {
  return SHA256_HEX_RE.test(value);
}

export function validateLocalPathCandidate(pathValue: string): VerifierHoldReasonCode | null {
  if (pathValue.length === 0) return 'VERIFIER_INVOCATION_PATH_INVALID';
  if (pathValue.includes('\0') || pathValue.includes('\n') || pathValue.includes('\r')) {
    return 'VERIFIER_INVOCATION_PATH_INVALID';
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(pathValue)) return 'VERIFIER_INVOCATION_NETWORK_PATH_FORBIDDEN';
  if (pathValue.startsWith('file://')) return 'VERIFIER_INVOCATION_NETWORK_PATH_FORBIDDEN';
  if (!isAbsolute(pathValue)) return 'VERIFIER_INVOCATION_PATH_INVALID';
  return null;
}

async function readVerifiedLocalFile(
  pathValue: string,
  expectedSha256: string,
  missingCode: VerifierHoldReasonCode,
  mismatchCode: VerifierHoldReasonCode,
): Promise<Buffer> {
  const pathError = validateLocalPathCandidate(pathValue);
  if (pathError) hold(pathError);
  if (!validateSha256Hex(expectedSha256)) hold('VERIFIER_INVOCATION_SHA_FORMAT_INVALID');

  let stat;
  try {
    stat = await lstat(pathValue);
  } catch {
    hold(missingCode);
  }
  if (!stat.isFile()) hold(missingCode);
  if (stat.isSymbolicLink()) hold(missingCode);
  if (stat.size > MAX_FILE_BYTES) hold(missingCode);

  let handle;
  try {
    handle = await open(pathValue, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  } catch {
    hold(missingCode);
  }

  try {
    const fdStat = await handle.stat();
    if (!fdStat.isFile()) hold(missingCode);
    if (fdStat.size > MAX_FILE_BYTES) hold(missingCode);
    const buffer = Buffer.alloc(fdStat.size);
    const { bytesRead } = await handle.read(buffer, 0, fdStat.size, 0);
    if (bytesRead !== fdStat.size) hold(missingCode);
    const actualSha = sha256Bytes(buffer);
    if (actualSha !== expectedSha256) hold(mismatchCode);
    return buffer;
  } finally {
    await handle.close();
  }
}

function validateParentAuthorityBlock(
  parentAuthority: unknown,
  code: VerifierHoldReasonCode,
): void {
  const parent = assertExactObjectKeys(parentAuthority, PARENT_AUTHORITY_KEYS, code);
  const contract = assertExactObjectKeys(parent.contract, PARENT_AUTHORITY_ENTRY_KEYS, code);
  const matrix = assertExactObjectKeys(parent.matrix, PARENT_AUTHORITY_ENTRY_KEYS, code);
  const parserEvidence = assertExactObjectKeys(parent.parser_evidence, PARENT_AUTHORITY_ENTRY_KEYS, code);
  if (assertString(contract.path, code) !==
    'docs/planning/preview-remote-apply/M55_PREVIEW_TRANSACTION_NORMALIZED_EXECUTION_CONTRACT_v1_REVISION-7.json') {
    hold(code);
  }
  if (assertNumber(contract.bytes, code) !== 309607) hold(code);
  if (assertString(contract.sha256, code) !==
    'd6231f698850a16760704c08052986194c3059d95ec9df2ba1ea47d83904954c') {
    hold(code);
  }
  if (assertString(matrix.path, code) !==
    'docs/planning/preview-remote-apply/M55_PREVIEW_TRANSACTION_NORMALIZED_STEP_MATRIX_v1_REVISION-7.json') {
    hold(code);
  }
  if (assertNumber(matrix.bytes, code) !== 110904) hold(code);
  if (assertString(matrix.sha256, code) !==
    '6d677b02ff9c73591cbea151444d5dc61ea766bda7ed6cd0598e63ad16ca9f93') {
    hold(code);
  }
  if (assertString(parserEvidence.path, code) !==
    'docs/planning/preview-remote-apply/M55_TRANSACTION_NORMALIZATION_EXACT_PARSER_EVIDENCE.json') {
    hold(code);
  }
  if (assertNumber(parserEvidence.bytes, code) !== 208050) hold(code);
  if (assertString(parserEvidence.sha256, code) !==
    'bd05c68a337abbe5a29dff04d8d1e46ca3509f664e9b2d0d89959c387d822442') {
    hold(code);
  }
}

function buildManifestProjection(entries: Array<Record<string, unknown>>): Record<string, unknown> {
  return {
    projection_identifier: MANIFEST_PROJECTION_ID,
    canonical_serialization: CANONICAL_SERIALIZATION,
    entry_count: 7,
    entries: entries.map((entry) => ({
      path: assertString(entry.path, 'PLAN_ATTESTATION_PROTECTED_MANIFEST_MISMATCH'),
      bytes: assertNumber(entry.bytes, 'PLAN_ATTESTATION_PROTECTED_MANIFEST_MISMATCH'),
      sha256: assertString(entry.sha256, 'PLAN_ATTESTATION_PROTECTED_MANIFEST_MISMATCH'),
      classification: assertString(entry.classification, 'PLAN_ATTESTATION_PROTECTED_MANIFEST_MISMATCH'),
    })),
  };
}

function computeManifestSha256(entries: Array<Record<string, unknown>>): string {
  const projection = buildManifestProjection(entries);
  return sha256Bytes(Buffer.from(canonicalSerializeForTests(projection), 'utf8'));
}

export function validateReviewRecordDocumentForTests(
  reviewRecord: Record<string, unknown>,
): VerifierHoldReasonCode | null {
  try {
    validateReviewRecordDocument(reviewRecord);
    return null;
  } catch (error) {
    if (error instanceof VerifierHoldError) {
      return error.holdReasonCode;
    }
    return 'PLAN_REVIEW_RECORD_MALFORMED';
  }
}

export function validateAttestationDocumentForTests(
  attestation: Record<string, unknown>,
): VerifierHoldReasonCode | null {
  try {
    validateAttestationDocument(attestation);
    return null;
  } catch (error) {
    if (error instanceof VerifierHoldError) {
      return error.holdReasonCode;
    }
    return 'PLAN_ATTESTATION_MALFORMED';
  }
}

export function evaluateVerifiedDocumentsForTests(input: {
  reviewRecord: Record<string, unknown>;
  attestation: Record<string, unknown>;
  expectedAttestationSha256?: string;
}): VerifierHoldReasonCode | 'ATTESTATION_CONTENT_VERIFIED' {
  try {
    validateReviewRecordDocument(input.reviewRecord);
    validateAttestationDocument(input.attestation);
    if (input.expectedAttestationSha256) {
      validateCrossBinding(input.reviewRecord, input.attestation, input.expectedAttestationSha256);
    }
    return 'ATTESTATION_CONTENT_VERIFIED';
  } catch (error) {
    if (error instanceof VerifierHoldError) {
      return error.holdReasonCode;
    }
    return 'PLAN_ATTESTATION_MALFORMED';
  }
}

function validateReviewRecordDocument(reviewRecord: Record<string, unknown>): void {
  assertExactTopLevelKeys(reviewRecord, REVIEW_RECORD_TOP_LEVEL_KEYS, 'PLAN_REVIEW_RECORD_MALFORMED');
  if (assertString(reviewRecord.schema, 'PLAN_REVIEW_RECORD_MALFORMED') !==
    'm55.preview.transaction_normalized.stage_a_plan_attestation_review_record.v1') {
    hold('PLAN_REVIEW_RECORD_MALFORMED');
  }
  if (assertString(reviewRecord.schema_version, 'PLAN_REVIEW_RECORD_MALFORMED') !==
    'm55.preview.transaction_normalized.stage_a_plan_attestation_review_record.v1') {
    hold('PLAN_REVIEW_RECORD_MALFORMED');
  }
  if (assertString(reviewRecord.revision, 'PLAN_REVIEW_RECORD_MALFORMED') !==
    'STAGE-A-PLAN-ATTESTATION-REVIEW-RECORD-v1') {
    hold('PLAN_REVIEW_RECORD_MALFORMED');
  }
  if (assertString(reviewRecord.status, 'PLAN_REVIEW_RECORD_MALFORMED') !== 'CLOSED_GREEN') hold('PLAN_REVIEW_RECORD_MALFORMED');
  if (assertString(reviewRecord.authority_role, 'PLAN_REVIEW_RECORD_MALFORMED') !==
    'STAGE_A_PLAN_ONLY_ATTESTATION_EXTERNAL_REVIEW_RECORD') {
    hold('PLAN_REVIEW_RECORD_MALFORMED');
  }
  if (assertString(reviewRecord.review_gate_id, 'PLAN_REVIEW_RECORD_MALFORMED') !==
    'CATEGORY-1-M55-STAGE-A-PLAN-ATTESTATION-REVIEW') {
    hold('PLAN_REVIEW_RECORD_MALFORMED');
  }
  assertStrictRfc3339Utc(reviewRecord.reviewed_at_utc, 'PLAN_REVIEW_RECORD_MALFORMED');
  if (assertString(reviewRecord.review_scope, 'PLAN_REVIEW_RECORD_MALFORMED') !==
    'PLAN_ONLY_ATTESTATION_ARTIFACT_REVIEW') {
    hold('PLAN_REVIEW_RECORD_MALFORMED');
  }

  const reviewed = assertExactObjectKeys(
    reviewRecord.reviewed_attestation,
    REVIEWED_ATTESTATION_KEYS,
    'PLAN_REVIEW_RECORD_MALFORMED',
  );
  if (assertString(reviewed.filename, 'PLAN_REVIEW_RECORD_MALFORMED') !==
    'M55_TRANSACTION_NORMALIZED_STAGE_A_PLAN_ATTESTATION_v1.json') {
    hold('PLAN_REVIEW_RECORD_MALFORMED');
  }
  if (assertNumber(reviewed.bytes, 'PLAN_REVIEW_RECORD_MALFORMED') !== 3491) hold('PLAN_REVIEW_RECORD_MALFORMED');
  if (assertString(reviewed.full_file_sha256, 'PLAN_REVIEW_RECORD_MALFORMED') !==
    '9b919d3a4aa1c701c49bf597e26d7d69db9977399287ad55960f4a06a75e5751') {
    hold('PLAN_REVIEW_RECORD_MALFORMED');
  }
  if (assertString(reviewed.canonical_payload_sha256, 'PLAN_REVIEW_RECORD_MALFORMED') !==
    '9fdc9ecda6f7257a6651027d4d44f7a5f19533f900729069823b35cb7c55e94d') {
    hold('PLAN_REVIEW_RECORD_MALFORMED');
  }
  if (assertString(reviewed.protected_runtime_manifest_sha256, 'PLAN_REVIEW_RECORD_MALFORMED') !== MANIFEST_SHA256) {
    hold('PLAN_REVIEW_RECORD_MALFORMED');
  }
  if (assertString(reviewed.rebind_commit_sha, 'PLAN_REVIEW_RECORD_MALFORMED') !== FROZEN_REBIND_COMMIT) {
    hold('PLAN_REVIEW_RECORD_MALFORMED');
  }
  if (assertString(reviewed.rebind_commit_tree_sha, 'PLAN_REVIEW_RECORD_MALFORMED') !== FROZEN_REBIND_TREE) {
    hold('PLAN_REVIEW_RECORD_MALFORMED');
  }
  if (assertString(reviewed.binding_addendum_full_file_sha256, 'PLAN_REVIEW_RECORD_MALFORMED') !== FROZEN_ADDENDUM_SHA) {
    hold('PLAN_REVIEW_RECORD_MALFORMED');
  }
  if (assertString(reviewed.binding_addendum_canonical_payload_sha256, 'PLAN_REVIEW_RECORD_MALFORMED') !==
    FROZEN_ADDENDUM_CANONICAL) {
    hold('PLAN_REVIEW_RECORD_MALFORMED');
  }

  const supporting = reviewRecord.supporting_artifacts;
  if (!Array.isArray(supporting) || supporting.length !== 3) hold('PLAN_REVIEW_RECORD_MALFORMED');
  for (let i = 0; i < SUPPORTING_ARTIFACTS.length; i++) {
    const expected = SUPPORTING_ARTIFACTS[i];
    const actual = assertExactObjectKeys(
      supporting[i],
      SUPPORTING_ARTIFACT_ENTRY_KEYS,
      'PLAN_REVIEW_RECORD_MALFORMED',
    );
    if (assertString(actual.filename, 'PLAN_REVIEW_RECORD_MALFORMED') !== expected.filename) hold('PLAN_REVIEW_RECORD_MALFORMED');
    if (assertNumber(actual.bytes, 'PLAN_REVIEW_RECORD_MALFORMED') !== expected.bytes) hold('PLAN_REVIEW_RECORD_MALFORMED');
    if (assertString(actual.sha256, 'PLAN_REVIEW_RECORD_MALFORMED') !== expected.sha256) hold('PLAN_REVIEW_RECORD_MALFORMED');
  }

  const checks = assertExactObjectKeys(
    reviewRecord.review_checks,
    REVIEW_CHECK_KEYS,
    'PLAN_REVIEW_RECORD_MALFORMED',
  );
  for (const key of REVIEW_CHECK_KEYS) {
    if (assertBoolean(checks[key], 'PLAN_REVIEW_RECORD_MALFORMED') !== true) hold('PLAN_REVIEW_RECORD_MALFORMED');
  }

  const authorization = assertExactObjectKeys(
    reviewRecord.authorization,
    REVIEW_AUTHORIZATION_KEYS,
    'PLAN_REVIEW_RECORD_MALFORMED',
  );
  if (assertBoolean(authorization.plan_attestation_review_green, 'PLAN_REVIEW_RECORD_AUTHORIZATION_MISMATCH') !== true) {
    hold('PLAN_REVIEW_RECORD_AUTHORIZATION_MISMATCH');
  }
  if (assertBoolean(authorization.plan_only_pass_authorized, 'PLAN_REVIEW_RECORD_AUTHORIZATION_MISMATCH') !== false) {
    hold('PLAN_REVIEW_RECORD_AUTHORIZATION_MISMATCH');
  }
  if (assertBoolean(authorization.execution_authorization, 'PLAN_REVIEW_RECORD_AUTHORIZATION_MISMATCH') !== false) {
    hold('PLAN_REVIEW_RECORD_AUTHORIZATION_MISMATCH');
  }
  if (assertBoolean(authorization.remote_apply_authorization, 'PLAN_REVIEW_RECORD_AUTHORIZATION_MISMATCH') !== false) {
    hold('PLAN_REVIEW_RECORD_AUTHORIZATION_MISMATCH');
  }
  if (assertBoolean(authorization.local_db_authorization, 'PLAN_REVIEW_RECORD_AUTHORIZATION_MISMATCH') !== false) {
    hold('PLAN_REVIEW_RECORD_AUTHORIZATION_MISMATCH');
  }
  if (assertBoolean(authorization.push_authorization, 'PLAN_REVIEW_RECORD_AUTHORIZATION_MISMATCH') !== false) {
    hold('PLAN_REVIEW_RECORD_AUTHORIZATION_MISMATCH');
  }

  if (assertString(reviewRecord.next_gate, 'PLAN_REVIEW_RECORD_MALFORMED') !==
    'STAGE-A EXTERNAL PLAN-ONLY ATTESTATION VERIFIER IMPLEMENTATION PLANNING') {
    hold('PLAN_REVIEW_RECORD_MALFORMED');
  }
  if (assertString(reviewRecord.self_identity, 'PLAN_REVIEW_RECORD_MALFORMED') !==
    'SELF_IDENTITY_REPORTED_EXTERNALLY_ONLY') {
    hold('PLAN_REVIEW_RECORD_MALFORMED');
  }
}

function validateAttestationDocument(attestation: Record<string, unknown>): void {
  assertExactTopLevelKeys(attestation, ATTESTATION_TOP_LEVEL_KEYS, 'PLAN_ATTESTATION_MALFORMED');
  if (assertString(attestation.schema, 'PLAN_ATTESTATION_MALFORMED') !==
    'm55.preview.transaction_normalized.stage_a_plan_attestation.v1') {
    hold('PLAN_ATTESTATION_MALFORMED');
  }
  if (assertString(attestation.schema_version, 'PLAN_ATTESTATION_MALFORMED') !==
    'm55.preview.transaction_normalized.stage_a_plan_attestation.v1.draft') {
    hold('PLAN_ATTESTATION_MALFORMED');
  }
  if (assertString(attestation.revision, 'PLAN_ATTESTATION_MALFORMED') !== 'STAGE-A-PLAN-ATTESTATION-v1') hold('PLAN_ATTESTATION_MALFORMED');
  if (assertString(attestation.status, 'PLAN_ATTESTATION_MALFORMED') !== 'DRAFT') hold('PLAN_ATTESTATION_MALFORMED');
  if (assertString(attestation.authority_role, 'PLAN_ATTESTATION_MALFORMED') !==
    'STAGE_A_PLAN_ONLY_REVIEW_ATTESTATION') {
    hold('PLAN_ATTESTATION_MALFORMED');
  }
  if (assertString(attestation.execution_status, 'PLAN_ATTESTATION_MALFORMED') !== 'NOT EXECUTED') hold('PLAN_ATTESTATION_MALFORMED');
  assertStrictRfc3339Utc(attestation.generated_at_utc, 'PLAN_ATTESTATION_MALFORMED');
  if (assertString(attestation.attestation_scope, 'PLAN_ATTESTATION_SCOPE_MISMATCH') !== 'PLAN_ONLY_SOURCE_VALIDATION') {
    hold('PLAN_ATTESTATION_SCOPE_MISMATCH');
  }

  const repo = assertExactObjectKeys(
    attestation.repository_binding,
    REPOSITORY_BINDING_KEYS,
    'PLAN_ATTESTATION_MALFORMED',
  );
  if (assertString(repo.expected_repo_root, 'PLAN_ATTESTATION_MALFORMED') !== EXPECTED_REPO_ROOT) hold('PLAN_ATTESTATION_MALFORMED');
  if (assertString(repo.expected_branch, 'PLAN_ATTESTATION_MALFORMED') !== EXPECTED_BRANCH) hold('PLAN_ATTESTATION_MALFORMED');
  if (assertString(repo.rebind_commit_sha, 'PLAN_ATTESTATION_REBIND_COMMIT_MISMATCH') !== FROZEN_REBIND_COMMIT) {
    hold('PLAN_ATTESTATION_REBIND_COMMIT_MISMATCH');
  }
  if (assertString(repo.parent_baseline_commit_sha, 'PLAN_ATTESTATION_MALFORMED') !== BASELINE_STAGE_A_COMMIT) {
    hold('PLAN_ATTESTATION_MALFORMED');
  }
  if (assertString(repo.source_authority_base_commit_sha, 'PLAN_ATTESTATION_MALFORMED') !== EXPECTED_SOURCE_AUTHORITY_BASE) {
    hold('PLAN_ATTESTATION_MALFORMED');
  }
  if (assertString(repo.rebind_commit_tree_sha, 'PLAN_ATTESTATION_REBIND_COMMIT_MISMATCH') !== FROZEN_REBIND_TREE) {
    hold('PLAN_ATTESTATION_REBIND_COMMIT_MISMATCH');
  }

  const addendum = assertExactObjectKeys(
    attestation.binding_addendum,
    BINDING_ADDENDUM_KEYS,
    'PLAN_ATTESTATION_MALFORMED',
  );
  if (assertString(addendum.path, 'PLAN_ATTESTATION_MALFORMED') !== STAGE_A_BINDING_ADDENDUM_REL_PATH) hold('PLAN_ATTESTATION_MALFORMED');
  if (assertNumber(addendum.bytes, 'PLAN_ATTESTATION_ADDENDUM_IDENTITY_MISMATCH') !== FROZEN_ADDENDUM_BYTES) {
    hold('PLAN_ATTESTATION_ADDENDUM_IDENTITY_MISMATCH');
  }
  if (assertString(addendum.full_file_sha256, 'PLAN_ATTESTATION_ADDENDUM_IDENTITY_MISMATCH') !== FROZEN_ADDENDUM_SHA) {
    hold('PLAN_ATTESTATION_ADDENDUM_IDENTITY_MISMATCH');
  }
  if (assertString(addendum.canonical_payload_sha256, 'PLAN_ATTESTATION_ADDENDUM_IDENTITY_MISMATCH') !==
    FROZEN_ADDENDUM_CANONICAL) {
    hold('PLAN_ATTESTATION_ADDENDUM_IDENTITY_MISMATCH');
  }

  const manifest = assertExactObjectKeys(
    attestation.protected_runtime_manifest,
    PROTECTED_RUNTIME_MANIFEST_KEYS,
    'PLAN_ATTESTATION_MALFORMED',
  );
  if (assertString(manifest.projection_identifier, 'PLAN_ATTESTATION_MALFORMED') !== MANIFEST_PROJECTION_ID) hold('PLAN_ATTESTATION_MALFORMED');
  if (assertString(manifest.canonical_serialization, 'PLAN_ATTESTATION_MALFORMED') !== CANONICAL_SERIALIZATION) {
    hold('PLAN_ATTESTATION_MALFORMED');
  }
  if (assertNumber(manifest.entry_count, 'PLAN_ATTESTATION_MALFORMED') !== 7) hold('PLAN_ATTESTATION_MALFORMED');
  if (assertString(manifest.sha256, 'PLAN_ATTESTATION_PROTECTED_MANIFEST_MISMATCH') !== MANIFEST_SHA256) {
    hold('PLAN_ATTESTATION_PROTECTED_MANIFEST_MISMATCH');
  }

  validateParentAuthorityBlock(attestation.parent_authority, 'PLAN_ATTESTATION_PARENT_AUTHORITY_MISMATCH');

  const reviewContract = assertExactObjectKeys(
    attestation.review_contract,
    REVIEW_CONTRACT_KEYS,
    'PLAN_ATTESTATION_MALFORMED',
  );
  if (assertString(reviewContract.review_gate_id, 'PLAN_ATTESTATION_MALFORMED') !==
    'CATEGORY-1-M55-STAGE-A-PLAN-ATTESTATION-REVIEW') {
    hold('PLAN_ATTESTATION_MALFORMED');
  }
  if (assertBoolean(reviewContract.external_review_record_required, 'PLAN_ATTESTATION_MALFORMED') !== true) hold('PLAN_ATTESTATION_MALFORMED');
  if (assertBoolean(reviewContract.review_record_embedded, 'PLAN_ATTESTATION_MALFORMED') !== false) hold('PLAN_ATTESTATION_MALFORMED');
  if (assertBoolean(reviewContract.full_file_sha_frozen_externally, 'PLAN_ATTESTATION_MALFORMED') !== true) hold('PLAN_ATTESTATION_MALFORMED');
  if (assertBoolean(reviewContract.review_timestamp_embedded, 'PLAN_ATTESTATION_MALFORMED') !== false) hold('PLAN_ATTESTATION_MALFORMED');
  if (assertBoolean(reviewContract.reviewer_identity_embedded, 'PLAN_ATTESTATION_MALFORMED') !== false) hold('PLAN_ATTESTATION_MALFORMED');

  const authorization = assertExactObjectKeys(
    attestation.authorization,
    ATTESTATION_AUTHORIZATION_KEYS,
    'PLAN_ATTESTATION_MALFORMED',
  );
  if (assertBoolean(authorization.plan_only_source_validation_authority, 'PLAN_ATTESTATION_AUTHORIZATION_FLAG_MISMATCH') !== true) {
    hold('PLAN_ATTESTATION_AUTHORIZATION_FLAG_MISMATCH');
  }
  if (assertBoolean(authorization.plan_only_pass_is_not_execution_authorization, 'PLAN_ATTESTATION_AUTHORIZATION_FLAG_MISMATCH') !== true) {
    hold('PLAN_ATTESTATION_AUTHORIZATION_FLAG_MISMATCH');
  }
  if (assertBoolean(authorization.execution_authorization, 'PLAN_ATTESTATION_AUTHORIZATION_FLAG_MISMATCH') !== false) {
    hold('PLAN_ATTESTATION_AUTHORIZATION_FLAG_MISMATCH');
  }
  if (assertBoolean(authorization.remote_apply_authorization, 'PLAN_ATTESTATION_AUTHORIZATION_FLAG_MISMATCH') !== false) {
    hold('PLAN_ATTESTATION_AUTHORIZATION_FLAG_MISMATCH');
  }
  if (assertBoolean(authorization.local_db_authorization, 'PLAN_ATTESTATION_AUTHORIZATION_FLAG_MISMATCH') !== false) {
    hold('PLAN_ATTESTATION_AUTHORIZATION_FLAG_MISMATCH');
  }
  if (assertBoolean(authorization.automatic_next_gate_authorization, 'PLAN_ATTESTATION_AUTHORIZATION_FLAG_MISMATCH') !== false) {
    hold('PLAN_ATTESTATION_AUTHORIZATION_FLAG_MISMATCH');
  }

  const integrity = assertExactObjectKeys(attestation.integrity, INTEGRITY_KEYS, 'PLAN_ATTESTATION_MALFORMED');
  if (assertBoolean(integrity.self_full_file_sha_forbidden, 'PLAN_ATTESTATION_MALFORMED') !== true) hold('PLAN_ATTESTATION_MALFORMED');
  if (assertBoolean(integrity.self_git_blob_id_forbidden, 'PLAN_ATTESTATION_MALFORMED') !== true) hold('PLAN_ATTESTATION_MALFORMED');
  if (assertBoolean(integrity.self_git_commit_sha_forbidden, 'PLAN_ATTESTATION_MALFORMED') !== true) hold('PLAN_ATTESTATION_MALFORMED');
  if (assertString(integrity.canonical_serialization, 'PLAN_ATTESTATION_MALFORMED') !== CANONICAL_SERIALIZATION) {
    hold('PLAN_ATTESTATION_MALFORMED');
  }
  const exclusions = assertStringArray(integrity.canonical_payload_exclusions, 'PLAN_ATTESTATION_MALFORMED');
  if (exclusions.length !== 1 || exclusions[0] !== '/integrity/canonical_payload_sha256') hold('PLAN_ATTESTATION_MALFORMED');
  const storedCanonical = assertString(integrity.canonical_payload_sha256, 'PLAN_ATTESTATION_MALFORMED');
  const computedCanonical = computeAttestationCanonicalPayloadSha256(attestation);
  if (storedCanonical !== computedCanonical) hold('PLAN_ATTESTATION_CANONICAL_PAYLOAD_MISMATCH');
  if (assertString(integrity.canonical_payload_sha256_role, 'PLAN_ATTESTATION_MALFORMED') !==
    'ACCIDENTAL_INTERNAL_CORRUPTION_DETECTION_ONLY') {
    hold('PLAN_ATTESTATION_MALFORMED');
  }
  if (assertBoolean(integrity.external_full_file_sha_review_required, 'PLAN_ATTESTATION_MALFORMED') !== true) {
    hold('PLAN_ATTESTATION_MALFORMED');
  }
}

function validateCrossBinding(
  reviewRecord: Record<string, unknown>,
  attestation: Record<string, unknown>,
  expectedAttestationSha256: string,
): void {
  const reviewed = reviewRecord.reviewed_attestation as Record<string, unknown>;
  const addendum = attestation.binding_addendum as Record<string, unknown>;
  const repo = attestation.repository_binding as Record<string, unknown>;
  const manifest = attestation.protected_runtime_manifest as Record<string, unknown>;

  if (assertString(reviewed.full_file_sha256, 'PLAN_ATTESTATION_REVIEW_BINDING_MISMATCH') !==
    expectedAttestationSha256) {
    hold('PLAN_ATTESTATION_REVIEW_BINDING_MISMATCH');
  }
  if (assertString(reviewed.canonical_payload_sha256, 'PLAN_ATTESTATION_REVIEW_BINDING_MISMATCH') !==
    computeAttestationCanonicalPayloadSha256(attestation)) {
    hold('PLAN_ATTESTATION_REVIEW_BINDING_MISMATCH');
  }
  if (assertString(reviewed.protected_runtime_manifest_sha256, 'PLAN_ATTESTATION_REVIEW_BINDING_MISMATCH') !==
    assertString(manifest.sha256, 'PLAN_ATTESTATION_REVIEW_BINDING_MISMATCH')) {
    hold('PLAN_ATTESTATION_REVIEW_BINDING_MISMATCH');
  }
  if (assertString(reviewed.rebind_commit_sha, 'PLAN_ATTESTATION_REVIEW_BINDING_MISMATCH') !==
    assertString(repo.rebind_commit_sha, 'PLAN_ATTESTATION_REVIEW_BINDING_MISMATCH')) {
    hold('PLAN_ATTESTATION_REVIEW_BINDING_MISMATCH');
  }
  if (assertString(reviewed.rebind_commit_tree_sha, 'PLAN_ATTESTATION_REVIEW_BINDING_MISMATCH') !==
    assertString(repo.rebind_commit_tree_sha, 'PLAN_ATTESTATION_REVIEW_BINDING_MISMATCH')) {
    hold('PLAN_ATTESTATION_REVIEW_BINDING_MISMATCH');
  }
  if (assertString(reviewed.binding_addendum_full_file_sha256, 'PLAN_ATTESTATION_REVIEW_BINDING_MISMATCH') !==
    assertString(addendum.full_file_sha256, 'PLAN_ATTESTATION_REVIEW_BINDING_MISMATCH')) {
    hold('PLAN_ATTESTATION_REVIEW_BINDING_MISMATCH');
  }
  if (assertString(reviewed.binding_addendum_canonical_payload_sha256, 'PLAN_ATTESTATION_REVIEW_BINDING_MISMATCH') !==
    assertString(addendum.canonical_payload_sha256, 'PLAN_ATTESTATION_REVIEW_BINDING_MISMATCH')) {
    hold('PLAN_ATTESTATION_REVIEW_BINDING_MISMATCH');
  }
}

async function validateWorkspaceAndProtectedRuntime(): Promise<void> {
  const repoRoot = EXPECTED_REPO_ROOT;
  if (resolve(repoRoot) !== EXPECTED_REPO_ROOT) hold('PLAN_ATTESTATION_WORKSPACE_MISMATCH');

  const workspace = readWorkspaceFacts(repoRoot);
  if (workspace.branch !== EXPECTED_BRANCH) hold('PLAN_ATTESTATION_WORKSPACE_MISMATCH');
  if (!workspace.cleanWorktree || !workspace.cleanIndex) hold('PLAN_ATTESTATION_WORKSPACE_MISMATCH');
  if (!isGitAncestor(repoRoot, FROZEN_REBIND_COMMIT, workspace.head)) hold('PLAN_ATTESTATION_WORKSPACE_MISMATCH');

  const binding = loadStageABindingAddendum(repoRoot);
  const files = binding.addendum.generation_1_protected_runtime_identities.files;
  if (files.length !== 7) hold('PLAN_ATTESTATION_RUNTIME_IDENTITY_MISMATCH');

  const entries = files.map((file) => ({
    path: file.path,
    bytes: file.bytes,
    sha256: file.sha256,
    classification: file.classification,
  }));
  const manifestSha = computeManifestSha256(entries as Array<Record<string, unknown>>);
  if (manifestSha !== MANIFEST_SHA256) hold('PLAN_ATTESTATION_PROTECTED_MANIFEST_MISMATCH');
}

function buildHoldResult(holdReasonCode: VerifierHoldReasonCode): PlanAttestationVerificationHold {
  return {
    invocationAuthority: 'UNTRUSTED_CALLER_INPUT',
    technicalOutcome: 'VERIFICATION_HOLD',
    humanGateOutcome: 'HUMAN_GATE_REVIEW_REQUIRED',
    humanGateRequired: true,
    planOnlyPass: false,
    executionLocked: true,
    automaticNextGate: false,
    verifierImplementationReviewRequired: true,
    holdReasonCode,
  };
}

function buildSuccessResult(): PlanAttestationVerificationSuccess {
  return {
    invocationAuthority: 'UNTRUSTED_CALLER_INPUT',
    technicalOutcome: 'ATTESTATION_CONTENT_VERIFIED',
    humanGateOutcome: 'HUMAN_GATE_REVIEW_REQUIRED',
    humanGateRequired: true,
    planOnlyPass: false,
    executionLocked: true,
    automaticNextGate: false,
    verifierImplementationReviewRequired: true,
  };
}

export function parseVerifierCliArgs(argv: string[]): ParsedVerifierCliArgs {
  const allowed = new Set([
    '--attestation-path',
    '--attestation-sha256',
    '--review-record-path',
    '--review-record-sha256',
  ]);
  const values = new Map<string, string>();

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') continue;
    if (!arg.startsWith('--')) hold('VERIFIER_INVOCATION_ARGUMENT_UNEXPECTED');
    if (!allowed.has(arg)) hold('VERIFIER_INVOCATION_ARGUMENT_UNEXPECTED');
    if (values.has(arg)) hold('VERIFIER_INVOCATION_ARGUMENT_DUPLICATE');
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) hold('VERIFIER_INVOCATION_ARGUMENT_MISSING');
    values.set(arg, value);
    i += 1;
  }

  for (const key of allowed) {
    if (!values.has(key)) hold('VERIFIER_INVOCATION_ARGUMENT_MISSING');
  }

  return {
    attestationPath: values.get('--attestation-path') as string,
    expectedAttestationSha256: values.get('--attestation-sha256') as string,
    reviewRecordPath: values.get('--review-record-path') as string,
    expectedReviewRecordSha256: values.get('--review-record-sha256') as string,
  };
}

export async function verifyPlanAttestationContent(
  input: UntrustedPlanAttestationInvocation,
): Promise<PlanAttestationVerificationResult> {
  try {
    validateInvocationInput(input);

    const reviewBytes = await readVerifiedLocalFile(
      input.reviewRecordPath,
      input.expectedReviewRecordSha256,
      'PLAN_REVIEW_RECORD_MISSING',
      'PLAN_REVIEW_RECORD_SHA_MISMATCH',
    );
    const reviewRecord = parseJsonRejectingDuplicateKeys(reviewBytes.toString('utf8'));
    validateReviewRecordDocument(reviewRecord);

    const attestationBytes = await readVerifiedLocalFile(
      input.attestationPath,
      input.expectedAttestationSha256,
      'PLAN_ATTESTATION_MISSING',
      'PLAN_ATTESTATION_SHA_MISMATCH',
    );
    const attestation = parseJsonRejectingDuplicateKeys(attestationBytes.toString('utf8'));
    validateAttestationDocument(attestation);
    validateCrossBinding(reviewRecord, attestation, input.expectedAttestationSha256);

    await validateWorkspaceAndProtectedRuntime();
    return buildSuccessResult();
  } catch (error) {
    if (error instanceof VerifierHoldError) {
      return buildHoldResult(error.holdReasonCode);
    }
    return buildHoldResult('PLAN_ATTESTATION_MALFORMED');
  }
}

export async function verifyPlanAttestationContentForTests(
  input: UntrustedPlanAttestationInvocation,
  options: { skipWorkspaceValidation?: boolean } = {},
): Promise<PlanAttestationVerificationResult> {
  try {
    if (!options.skipWorkspaceValidation) {
      validateInvocationInput(input);
    } else {
      const attestationPathError = validateLocalPathCandidate(input.attestationPath);
      if (attestationPathError) hold(attestationPathError);
      const reviewPathError = validateLocalPathCandidate(input.reviewRecordPath);
      if (reviewPathError) hold(reviewPathError);
      if (!validateSha256Hex(input.expectedAttestationSha256)) hold('VERIFIER_INVOCATION_SHA_FORMAT_INVALID');
      if (!validateSha256Hex(input.expectedReviewRecordSha256)) hold('VERIFIER_INVOCATION_SHA_FORMAT_INVALID');
    }

    const reviewBytes = await readVerifiedLocalFile(
      input.reviewRecordPath,
      input.expectedReviewRecordSha256,
      'PLAN_REVIEW_RECORD_MISSING',
      'PLAN_REVIEW_RECORD_SHA_MISMATCH',
    );
    const reviewRecord = parseJsonRejectingDuplicateKeys(reviewBytes.toString('utf8'));
    validateReviewRecordDocument(reviewRecord);

    const attestationBytes = await readVerifiedLocalFile(
      input.attestationPath,
      input.expectedAttestationSha256,
      'PLAN_ATTESTATION_MISSING',
      'PLAN_ATTESTATION_SHA_MISMATCH',
    );
    const attestation = parseJsonRejectingDuplicateKeys(attestationBytes.toString('utf8'));
    validateAttestationDocument(attestation);
    validateCrossBinding(reviewRecord, attestation, input.expectedAttestationSha256);

    if (!options.skipWorkspaceValidation) {
      await validateWorkspaceAndProtectedRuntime();
    }

    return buildSuccessResult();
  } catch (error) {
    if (error instanceof VerifierHoldError) {
      return buildHoldResult(error.holdReasonCode);
    }
    return buildHoldResult('PLAN_ATTESTATION_MALFORMED');
  }
}
