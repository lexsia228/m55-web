import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto';

import {
  APPROVED_PREVIEW_DATABASE_TIER,
  APPROVED_PREVIEW_ORGANIZATION,
  APPROVED_PREVIEW_PROJECT,
} from './types.ts';
import {
  PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
  PAIR_P5_IDENTITY_MIGRATION_SHA256,
  PAIR_P5_IDENTITY_STEP_ID,
} from './pairP5IdentityStepAuthority.ts';
const PAIR_P5_WITNESS_DATABASE_NAME_UI_UNOBSERVED_SENTINEL =
  'M55_PREVIEW_UI_DATABASE_NAME_NOT_INDEPENDENTLY_OBSERVED_v1' as const;

export const PAIR_P5_HUMAN_PREVIEW_UI_ATTESTATION_SCHEMA_ID =
  'M55_PAIR_P5_HUMAN_PREVIEW_UI_ATTESTATION_v1' as const;

export const PAIR_P5_HUMAN_ATTESTATION_DATABASE_NAME_UI_STATUS =
  'UI_UNOBSERVED' as const;

export type PairP5HumanPreviewUiAttestationPurpose = 'LIVE_MUTATION' | 'LIVE_FRESH_READONLY';

export type PairP5HumanPreviewUiAttestationPayload = {
  readonly schemaId: typeof PAIR_P5_HUMAN_PREVIEW_UI_ATTESTATION_SCHEMA_ID;
  readonly trustKeyId: string;
  readonly attestationId: string;
  readonly nonce: string;
  readonly issuedAtIso: string;
  readonly expiresAtIso: string;
  readonly purpose: PairP5HumanPreviewUiAttestationPurpose;
  readonly previewOrganization: string;
  readonly previewProject: string;
  readonly previewProjectRef: string;
  readonly previewDatabaseTier: string;
  readonly databaseNameUiObservationStatus: typeof PAIR_P5_HUMAN_ATTESTATION_DATABASE_NAME_UI_STATUS;
  readonly witnessedDatabaseNameSentinel: typeof PAIR_P5_WITNESS_DATABASE_NAME_UI_UNOBSERVED_SENTINEL;
  readonly selectedStep: typeof PAIR_P5_IDENTITY_STEP_ID;
  readonly migrationSourceSha256: typeof PAIR_P5_IDENTITY_MIGRATION_SHA256;
  readonly gitHeadCommitSha: string | null;
  readonly humanUiEvidenceDigestSha256: string | null;
  readonly humanP51ApplyAuthorizationIdDigestSha256: string | null;
};

export type PairP5SignedHumanPreviewUiAttestation = {
  readonly payload: PairP5HumanPreviewUiAttestationPayload;
  readonly signatureBase64: string;
};

export type PairP5HumanAttestationTrustAnchor = {
  readonly trustKeyId: string;
  readonly publicKeySpkiDerBase64: string;
  readonly status: 'ACTIVE' | 'REVOKED';
};

/** Human-approved operational anchors only; empty until Human registers production keys. */
export const PAIR_P5_OPERATIONAL_HUMAN_ATTESTATION_TRUST_ANCHORS: readonly PairP5HumanAttestationTrustAnchor[] =
  [];

export const HOLD_PAIR_P5_OPERATIONAL_HUMAN_ATTESTATION_ISSUER_NOT_AUTHORIZED =
  'HOLD_PAIR_P5_OPERATIONAL_HUMAN_ATTESTATION_ISSUER_NOT_AUTHORIZED' as const;

/** Live operational path: registered trust anchors + external issuer flag; not test-key override. */
export function verifyPairP5OperationalHumanPreviewUiAttestationForDedicatedReceipt(input: {
  readonly signed: PairP5SignedHumanPreviewUiAttestation;
  readonly expectedPurpose: PairP5HumanPreviewUiAttestationPurpose;
  readonly authorizedExternalAttestationIssuerAvailable: boolean;
}):
  | { readonly ok: true; readonly payload: PairP5HumanPreviewUiAttestationPayload }
  | { readonly ok: false; readonly holdReasonCode: string } {
  if (!input.authorizedExternalAttestationIssuerAvailable) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_OPERATIONAL_HUMAN_ATTESTATION_ISSUER_NOT_AUTHORIZED };
  }
  if (PAIR_P5_OPERATIONAL_HUMAN_ATTESTATION_TRUST_ANCHORS.length === 0) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_HUMAN_ATTESTATION_TRUST_ANCHOR_UNKNOWN };
  }
  return verifyPairP5SignedHumanPreviewUiAttestation({
    signed: input.signed,
    trustAnchors: PAIR_P5_OPERATIONAL_HUMAN_ATTESTATION_TRUST_ANCHORS,
    expectedPurpose: input.expectedPurpose,
    requireOperationalEvidenceDigest: true,
  });
}

export const HOLD_PAIR_P5_HUMAN_ATTESTATION_PAYLOAD_INVALID =
  'HOLD_PAIR_P5_HUMAN_ATTESTATION_PAYLOAD_INVALID' as const;
export const HOLD_PAIR_P5_HUMAN_ATTESTATION_SIGNATURE_INVALID =
  'HOLD_PAIR_P5_HUMAN_ATTESTATION_SIGNATURE_INVALID' as const;
export const HOLD_PAIR_P5_HUMAN_ATTESTATION_TRUST_ANCHOR_UNKNOWN =
  'HOLD_PAIR_P5_HUMAN_ATTESTATION_TRUST_ANCHOR_UNKNOWN' as const;
export const HOLD_PAIR_P5_HUMAN_ATTESTATION_TRUST_ANCHOR_REVOKED =
  'HOLD_PAIR_P5_HUMAN_ATTESTATION_TRUST_ANCHOR_REVOKED' as const;
export const HOLD_PAIR_P5_HUMAN_ATTESTATION_EXPIRED = 'HOLD_PAIR_P5_HUMAN_ATTESTATION_EXPIRED' as const;
export const HOLD_PAIR_P5_HUMAN_ATTESTATION_PURPOSE_MISMATCH =
  'HOLD_PAIR_P5_HUMAN_ATTESTATION_PURPOSE_MISMATCH' as const;
export const HOLD_PAIR_P5_HUMAN_ATTESTATION_TARGET_MISMATCH =
  'HOLD_PAIR_P5_HUMAN_ATTESTATION_TARGET_MISMATCH' as const;
export const HOLD_PAIR_P5_HUMAN_ATTESTATION_EVIDENCE_DIGEST_REQUIRED =
  'HOLD_PAIR_P5_HUMAN_ATTESTATION_EVIDENCE_DIGEST_REQUIRED' as const;
export const HOLD_PAIR_P5_SIGNED_HUMAN_ATTESTATION_REQUIRED =
  'HOLD_PAIR_P5_SIGNED_HUMAN_ATTESTATION_REQUIRED' as const;

const PAYLOAD_KEYS = new Set([
  'schemaId',
  'trustKeyId',
  'attestationId',
  'nonce',
  'issuedAtIso',
  'expiresAtIso',
  'purpose',
  'previewOrganization',
  'previewProject',
  'previewProjectRef',
  'previewDatabaseTier',
  'databaseNameUiObservationStatus',
  'witnessedDatabaseNameSentinel',
  'selectedStep',
  'migrationSourceSha256',
  'gitHeadCommitSha',
  'humanUiEvidenceDigestSha256',
  'humanP51ApplyAuthorizationIdDigestSha256',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(',')}}`;
}

export function canonicalizePairP5HumanPreviewUiAttestationPayload(
  payload: PairP5HumanPreviewUiAttestationPayload,
): string {
  return stableSerialize(payload);
}

export function digestPairP5HumanAttestationIdentity(payload: PairP5HumanPreviewUiAttestationPayload): string {
  return createHash('sha256')
    .update(canonicalizePairP5HumanPreviewUiAttestationPayload(payload), 'utf8')
    .digest('hex');
}

function isStrictIso8601Utc(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return false;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

function validatePayloadShape(payload: unknown): PairP5HumanPreviewUiAttestationPayload | null {
  if (!isPlainObject(payload)) {
    return null;
  }
  const keys = Object.keys(payload);
  if (keys.length !== PAYLOAD_KEYS.size || !keys.every((key) => PAYLOAD_KEYS.has(key))) {
    return null;
  }
  const p = payload as PairP5HumanPreviewUiAttestationPayload;
  if (p.schemaId !== PAIR_P5_HUMAN_PREVIEW_UI_ATTESTATION_SCHEMA_ID) {
    return null;
  }
  if (
    typeof p.trustKeyId !== 'string' ||
    typeof p.attestationId !== 'string' ||
    typeof p.nonce !== 'string' ||
    p.attestationId.trim().length === 0 ||
    p.nonce.trim().length === 0
  ) {
    return null;
  }
  if (!isStrictIso8601Utc(p.issuedAtIso) || !isStrictIso8601Utc(p.expiresAtIso)) {
    return null;
  }
  if (p.purpose !== 'LIVE_MUTATION' && p.purpose !== 'LIVE_FRESH_READONLY') {
    return null;
  }
  if (
    p.previewOrganization !== APPROVED_PREVIEW_ORGANIZATION ||
    p.previewProject !== APPROVED_PREVIEW_PROJECT ||
    p.previewProjectRef !== PAIR_P5_APPROVED_PREVIEW_PROJECT_REF ||
    p.previewDatabaseTier !== APPROVED_PREVIEW_DATABASE_TIER
  ) {
    return null;
  }
  if (
    p.databaseNameUiObservationStatus !== PAIR_P5_HUMAN_ATTESTATION_DATABASE_NAME_UI_STATUS ||
    p.witnessedDatabaseNameSentinel !== PAIR_P5_WITNESS_DATABASE_NAME_UI_UNOBSERVED_SENTINEL
  ) {
    return null;
  }
  if (p.selectedStep !== PAIR_P5_IDENTITY_STEP_ID || p.migrationSourceSha256 !== PAIR_P5_IDENTITY_MIGRATION_SHA256) {
    return null;
  }
  if (p.gitHeadCommitSha !== null && !/^[0-9a-f]{40}$/.test(p.gitHeadCommitSha)) {
    return null;
  }
  const digestPattern = /^[0-9a-f]{64}$/;
  if (
    p.humanUiEvidenceDigestSha256 !== null &&
    !digestPattern.test(p.humanUiEvidenceDigestSha256)
  ) {
    return null;
  }
  if (
    p.humanP51ApplyAuthorizationIdDigestSha256 !== null &&
    !digestPattern.test(p.humanP51ApplyAuthorizationIdDigestSha256)
  ) {
    return null;
  }
  return p;
}

export function verifyPairP5SignedHumanPreviewUiAttestation(input: {
  readonly signed: PairP5SignedHumanPreviewUiAttestation;
  readonly trustAnchors: readonly PairP5HumanAttestationTrustAnchor[];
  readonly expectedPurpose: PairP5HumanPreviewUiAttestationPurpose;
  readonly nowMs?: number;
  readonly requireOperationalEvidenceDigest?: boolean;
}):
  | { readonly ok: true; readonly payload: PairP5HumanPreviewUiAttestationPayload }
  | {
      readonly ok: false;
      readonly holdReasonCode:
        | typeof HOLD_PAIR_P5_HUMAN_ATTESTATION_PAYLOAD_INVALID
        | typeof HOLD_PAIR_P5_HUMAN_ATTESTATION_SIGNATURE_INVALID
        | typeof HOLD_PAIR_P5_HUMAN_ATTESTATION_TRUST_ANCHOR_UNKNOWN
        | typeof HOLD_PAIR_P5_HUMAN_ATTESTATION_TRUST_ANCHOR_REVOKED
        | typeof HOLD_PAIR_P5_HUMAN_ATTESTATION_EXPIRED
        | typeof HOLD_PAIR_P5_HUMAN_ATTESTATION_PURPOSE_MISMATCH
        | typeof HOLD_PAIR_P5_HUMAN_ATTESTATION_TARGET_MISMATCH
        | typeof HOLD_PAIR_P5_HUMAN_ATTESTATION_EVIDENCE_DIGEST_REQUIRED;
    } {
  const payload = validatePayloadShape(input.signed.payload);
  if (payload === null) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_HUMAN_ATTESTATION_PAYLOAD_INVALID };
  }
  if (payload.purpose !== input.expectedPurpose) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_HUMAN_ATTESTATION_PURPOSE_MISMATCH };
  }
  if (input.requireOperationalEvidenceDigest === true && payload.humanUiEvidenceDigestSha256 === null) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_HUMAN_ATTESTATION_EVIDENCE_DIGEST_REQUIRED };
  }
  const anchor = input.trustAnchors.find((entry) => entry.trustKeyId === payload.trustKeyId);
  if (anchor === undefined) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_HUMAN_ATTESTATION_TRUST_ANCHOR_UNKNOWN };
  }
  if (anchor.status === 'REVOKED') {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_HUMAN_ATTESTATION_TRUST_ANCHOR_REVOKED };
  }
  const nowMs = input.nowMs ?? Date.now();
  const issuedMs = Date.parse(payload.issuedAtIso);
  const expiresMs = Date.parse(payload.expiresAtIso);
  if (nowMs < issuedMs || nowMs > expiresMs) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_HUMAN_ATTESTATION_EXPIRED };
  }
  const message = Buffer.from(canonicalizePairP5HumanPreviewUiAttestationPayload(payload), 'utf8');
  let signature: Buffer;
  try {
    signature = Buffer.from(input.signed.signatureBase64, 'base64');
  } catch {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_HUMAN_ATTESTATION_SIGNATURE_INVALID };
  }
  const publicKeyDer = Buffer.from(anchor.publicKeySpkiDerBase64, 'base64');
  const keyObject = createPublicKey({ key: publicKeyDer, format: 'der', type: 'spki' });
  const verified = verify(null, message, keyObject, signature);
  if (!verified) {
    return { ok: false, holdReasonCode: HOLD_PAIR_P5_HUMAN_ATTESTATION_SIGNATURE_INVALID };
  }
  return { ok: true, payload };
}

export type PairP5HumanAttestationTestKeyMaterial = {
  readonly trustKeyId: string;
  readonly publicKeySpkiDerBase64: string;
  readonly privateKeyPkcs8DerBase64: string;
};

export function generatePairP5HumanAttestationTestKeyMaterialForTestsOnly(
  trustKeyId: string,
): PairP5HumanAttestationTestKeyMaterial {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return {
    trustKeyId,
    publicKeySpkiDerBase64: publicKey.export({ format: 'der', type: 'spki' }).toString('base64'),
    privateKeyPkcs8DerBase64: privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64'),
  };
}

export function signPairP5HumanPreviewUiAttestationForTestsOnly(input: {
  readonly payload: PairP5HumanPreviewUiAttestationPayload;
  readonly privateKeyPkcs8DerBase64: string;
}): PairP5SignedHumanPreviewUiAttestation {
  const privateKey = createPrivateKey({
    key: Buffer.from(input.privateKeyPkcs8DerBase64, 'base64'),
    format: 'der',
    type: 'pkcs8',
  });
  const message = Buffer.from(canonicalizePairP5HumanPreviewUiAttestationPayload(input.payload), 'utf8');
  const signature = sign(null, message, privateKey);
  return {
    payload: input.payload,
    signatureBase64: signature.toString('base64'),
  };
}

export function buildPairP5HumanPreviewUiAttestationTestPayloadForTestsOnly(
  overrides: Partial<PairP5HumanPreviewUiAttestationPayload> & {
    readonly trustKeyId: string;
    readonly attestationId: string;
    readonly nonce: string;
    readonly purpose: PairP5HumanPreviewUiAttestationPurpose;
  },
): PairP5HumanPreviewUiAttestationPayload {
  const issuedAtIso = overrides.issuedAtIso ?? '2026-10-23T08:00:00.000Z';
  const expiresAtIso = overrides.expiresAtIso ?? '2026-10-30T08:00:00.000Z';
  return {
    schemaId: PAIR_P5_HUMAN_PREVIEW_UI_ATTESTATION_SCHEMA_ID,
    trustKeyId: overrides.trustKeyId,
    attestationId: overrides.attestationId,
    nonce: overrides.nonce,
    issuedAtIso,
    expiresAtIso,
    purpose: overrides.purpose,
    previewOrganization: APPROVED_PREVIEW_ORGANIZATION,
    previewProject: APPROVED_PREVIEW_PROJECT,
    previewProjectRef: PAIR_P5_APPROVED_PREVIEW_PROJECT_REF,
    previewDatabaseTier: APPROVED_PREVIEW_DATABASE_TIER,
    databaseNameUiObservationStatus: PAIR_P5_HUMAN_ATTESTATION_DATABASE_NAME_UI_STATUS,
    witnessedDatabaseNameSentinel: PAIR_P5_WITNESS_DATABASE_NAME_UI_UNOBSERVED_SENTINEL,
    selectedStep: PAIR_P5_IDENTITY_STEP_ID,
    migrationSourceSha256: PAIR_P5_IDENTITY_MIGRATION_SHA256,
    gitHeadCommitSha: overrides.gitHeadCommitSha ?? null,
    humanUiEvidenceDigestSha256: overrides.humanUiEvidenceDigestSha256 ?? null,
    humanP51ApplyAuthorizationIdDigestSha256: overrides.humanP51ApplyAuthorizationIdDigestSha256 ?? null,
  };
}
