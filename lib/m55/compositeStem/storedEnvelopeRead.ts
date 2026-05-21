/**
 * Stored envelope read path — /dtr/core and shelf display SSOT.
 * No SSR runDtrEngine re-derive; snapshot envelope_json is authoritative.
 */
import type { DtrEnvelope } from '../dtrEngine';
import type { DtrReportSnapshotRow } from '../dtrDraftDb';
import type { DtrShelfStemDisplay } from '../dtrShelfStemDisplay';
import { TEN_STEM_DISPLAY } from '../tenStemCatalog';
import { ENGINE_VERSION_V2 } from './constants';
import type { EngineContextJson } from './buildV2FulfillmentSnapshot';

export type StoredEnvelopeReadMode = 'legacy' | 'v2';

export type StoredEnvelopeReadOk = {
  ok: true;
  mode: StoredEnvelopeReadMode;
  envelope: DtrEnvelope;
  profile: { nickname: string; birthDate: string };
};

export type StoredEnvelopeReadFailCode =
  | 'missing_envelope'
  | 'invalid_envelope'
  | 'v2_context_missing'
  | 'v2_stem_mismatch';

export type StoredEnvelopeReadFail = {
  ok: false;
  code: StoredEnvelopeReadFailCode;
};

export type StoredEnvelopeReadResult = StoredEnvelopeReadOk | StoredEnvelopeReadFail;

export type DtrReportSnapshotReadRow = DtrReportSnapshotRow & {
  engine_version: string | null;
  engine_context_json: EngineContextJson | Record<string, unknown> | null;
};

export function isReadableStoredEnvelope(value: unknown): value is DtrEnvelope {
  if (!value || typeof value !== 'object') return false;
  const e = value as DtrEnvelope;
  const sections = e.payload?.fullSections;
  return (
    Array.isArray(sections) &&
    sections.length > 0 &&
    typeof e.auditMeta?.stemLaneIndex === 'number' &&
    e.auditMeta.stemLaneIndex >= 0 &&
    e.auditMeta.stemLaneIndex <= 9 &&
    typeof e.auditMeta?.stemChar === 'string' &&
    e.auditMeta.stemChar.length > 0
  );
}

function isV2SnapshotRow(row: DtrReportSnapshotReadRow): boolean {
  return row.engine_version === ENGINE_VERSION_V2;
}

function parseEngineContext(
  raw: EngineContextJson | Record<string, unknown> | null,
): EngineContextJson | null {
  if (!raw || typeof raw !== 'object') return null;
  const ctx = raw as EngineContextJson;
  if (typeof ctx.stemLaneIndex !== 'number' || typeof ctx.stemChar !== 'string') return null;
  return ctx;
}

function validateV2StoredConsistency(envelope: DtrEnvelope, ctx: EngineContextJson | null): boolean {
  if (!ctx) return false;
  if (ctx.stemLaneIndex !== envelope.auditMeta.stemLaneIndex) return false;
  if (ctx.stemChar !== envelope.auditMeta.stemChar) return false;
  return true;
}

/**
 * Resolve stored envelope for paid DTR read (fail-closed).
 */
export function resolveStoredEnvelopeRead(row: DtrReportSnapshotReadRow): StoredEnvelopeReadResult {
  const envelopeRaw = row.envelope_json;
  if (envelopeRaw == null) {
    return { ok: false, code: 'missing_envelope' };
  }
  if (!isReadableStoredEnvelope(envelopeRaw)) {
    return { ok: false, code: 'invalid_envelope' };
  }
  const envelope = envelopeRaw;
  const profile = row.profile_snapshot;
  if (!profile?.nickname?.trim() || !profile?.birthDate?.trim()) {
    return { ok: false, code: 'invalid_envelope' };
  }

  if (isV2SnapshotRow(row)) {
    const ctx = parseEngineContext(row.engine_context_json);
    if (!ctx) {
      return { ok: false, code: 'v2_context_missing' };
    }
    if (!validateV2StoredConsistency(envelope, ctx)) {
      return { ok: false, code: 'v2_stem_mismatch' };
    }
    return {
      ok: true,
      mode: 'v2',
      envelope,
      profile: {
        nickname: profile.nickname.trim(),
        birthDate: profile.birthDate.trim().slice(0, 10),
      },
    };
  }

  return {
    ok: true,
    mode: 'legacy',
    envelope,
    profile: {
      nickname: profile.nickname.trim(),
      birthDate: profile.birthDate.trim().slice(0, 10),
    },
  };
}

/** Shelf stem from snapshot stored envelope/context — never client ProfileRepository when owned. */
export function deriveDtrShelfStemDisplayFromSnapshot(
  row: DtrReportSnapshotReadRow,
): DtrShelfStemDisplay | null {
  const read = resolveStoredEnvelopeRead(row);
  if (!read.ok) return null;
  const stem = TEN_STEM_DISPLAY[read.envelope.auditMeta.stemLaneIndex];
  if (!stem) return null;
  return {
    stemLaneIndex: read.envelope.auditMeta.stemLaneIndex,
    publicTitle: stem.publicTitle,
    displayOneLine: stem.displayOneLine,
    nickname: read.profile.nickname,
  };
}
