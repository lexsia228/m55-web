/**
 * Displayed DTR envelope SSOT — reader, shelf, consult grounding.
 * Legacy stored rows are rebuilt to canonical v2 at read-time (no DB mutation).
 */
import type { DtrEnvelope } from '../dtrEngine';
import { ENGINE_VERSION_V2 } from './constants';
import { buildV2FulfillmentSnapshotFromFields } from './buildV2FulfillmentSnapshot';
import { M55CompositeStemError } from './types';
import { parseStoredSnapshotProfileFields } from './parseStoredSnapshotProfileFields';
import {
  isReadableStoredEnvelope,
  resolveStoredEnvelopeRead,
  type DtrReportSnapshotReadRow,
} from './storedEnvelopeRead';

export type DisplayedEnvelopeReadMode = 'stored_v2' | 'rebuilt_v2_from_legacy';

export type DisplayedDtrEnvelopeRawMeta = {
  storedMode: 'legacy' | 'v2';
  storedEngineVersion: string | null;
  storedStemLaneIndex: number;
  storedDerivation: string | null;
};

export type ResolveDisplayedDtrEnvelopeOk = {
  ok: true;
  mode: DisplayedEnvelopeReadMode;
  envelope: DtrEnvelope;
  profile: { nickname: string; birthDate: string };
  rawMeta: DisplayedDtrEnvelopeRawMeta;
};

export type ResolveDisplayedDtrEnvelopeFail = {
  ok: false;
  reason: string;
};

export type ResolveDisplayedDtrEnvelopeResult =
  | ResolveDisplayedDtrEnvelopeOk
  | ResolveDisplayedDtrEnvelopeFail;

function buildRawMeta(
  row: DtrReportSnapshotReadRow,
  storedMode: 'legacy' | 'v2',
): DisplayedDtrEnvelopeRawMeta | null {
  const envelope = row.envelope_json;
  if (!isReadableStoredEnvelope(envelope)) return null;
  return {
    storedMode,
    storedEngineVersion: row.engine_version,
    storedStemLaneIndex: envelope.auditMeta.stemLaneIndex,
    storedDerivation: envelope.auditMeta.derivation ?? null,
  };
}

/**
 * Resolve envelope for user-facing display and consult grounding.
 * Fail-closed on rebuild failure — no legacy envelope fallback.
 */
export function resolveDisplayedDtrEnvelope(
  row: DtrReportSnapshotReadRow,
): ResolveDisplayedDtrEnvelopeResult {
  if (row.engine_version === ENGINE_VERSION_V2) {
    const storedRead = resolveStoredEnvelopeRead(row);
    if (!storedRead.ok) {
      return { ok: false, reason: storedRead.code };
    }
    const rawMeta = buildRawMeta(row, 'v2');
    if (!rawMeta) return { ok: false, reason: 'invalid_envelope' };
    return {
      ok: true,
      mode: 'stored_v2',
      envelope: storedRead.envelope,
      profile: storedRead.profile,
      rawMeta,
    };
  }

  if (!isReadableStoredEnvelope(row.envelope_json)) {
    return { ok: false, reason: 'invalid_envelope' };
  }

  const parsed = parseStoredSnapshotProfileFields(row);
  if (!parsed.ok) {
    return { ok: false, reason: parsed.reason };
  }

  try {
    const built = buildV2FulfillmentSnapshotFromFields(parsed.fields);
    const rawMeta = buildRawMeta(row, 'legacy');
    if (!rawMeta) return { ok: false, reason: 'invalid_envelope' };

    return {
      ok: true,
      mode: 'rebuilt_v2_from_legacy',
      envelope: built.envelope_json,
      profile: {
        nickname: parsed.fields.nickname,
        birthDate: parsed.fields.birthDate,
      },
      rawMeta,
    };
  } catch (e) {
    const reason =
      e instanceof M55CompositeStemError ? e.code : 'composite_v2_rebuild_failed';
    return { ok: false, reason };
  }
}
