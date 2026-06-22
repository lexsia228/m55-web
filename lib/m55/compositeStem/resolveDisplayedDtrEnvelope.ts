/**
 * Displayed DTR envelope SSOT — reader, shelf, consult grounding.
 * Legacy stored rows are rebuilt to canonical v2 at read-time (no DB mutation).
 * stored_v2 rows normalize user-facing copy from current DTR catalog at read-time.
 */
import { runDtrEngine, type DtrEnvelope } from '../dtrEngine';
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

export type DisplayNormalizeSource =
  | 'current_dtr_engine_catalog'
  | 'legacy_pipeline_rebuild';

export type DisplayedDtrEnvelopeRawMeta = {
  storedMode: 'legacy' | 'v2';
  storedEngineVersion: string | null;
  storedStemLaneIndex: number;
  storedDerivation: string | null;
  rawBodyFingerprint: string;
  storedSectionCount: number;
  displayNormalizeSource: DisplayNormalizeSource;
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

function fingerprintEnvelopeBodies(envelope: DtrEnvelope): string {
  let h = 5381;
  const text = envelope.payload.fullSections.map((s) => s.body).join('\n');
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return `djb2:${h.toString(16).padStart(8, '0')}`;
}

function buildRawMeta(
  row: DtrReportSnapshotReadRow,
  storedMode: 'legacy' | 'v2',
  storedEnvelope: DtrEnvelope,
  displayNormalizeSource: DisplayNormalizeSource,
): DisplayedDtrEnvelopeRawMeta | null {
  if (!isReadableStoredEnvelope(storedEnvelope)) return null;
  return {
    storedMode,
    storedEngineVersion: row.engine_version,
    storedStemLaneIndex: storedEnvelope.auditMeta.stemLaneIndex,
    storedDerivation: storedEnvelope.auditMeta.derivation ?? null,
    rawBodyFingerprint: fingerprintEnvelopeBodies(storedEnvelope),
    storedSectionCount: storedEnvelope.payload.fullSections.length,
    displayNormalizeSource,
  };
}

function resolveStoredV2DisplayEnvelope(
  storedEnvelope: DtrEnvelope,
  profile: { nickname: string; birthDate: string },
): { ok: true; envelope: DtrEnvelope } | { ok: false; reason: string } {
  const storedLane = storedEnvelope.auditMeta.stemLaneIndex;
  const derivation = storedEnvelope.auditMeta.derivation ?? 'm55_composite_stem_v2_p_lunar';

  if (derivation === 'jdn_offset_provisional_v1') {
    return { ok: false, reason: 'jdn_provisional_derivation_forbidden' };
  }

  const displayEnvelope = runDtrEngine(
    {
      birthDate: profile.birthDate,
      nickname: profile.nickname,
      locale: 'ja-JP',
      contextScope: 'dtr',
    },
    {
      stemLaneIndex: storedLane,
      engineVersion: ENGINE_VERSION_V2,
      derivation,
      contractVersion: 'v2',
    },
  );

  if (displayEnvelope.auditMeta.stemLaneIndex !== storedLane) {
    return { ok: false, reason: 'stored_lane_display_mismatch' };
  }
  if (displayEnvelope.auditMeta.stemChar !== storedEnvelope.auditMeta.stemChar) {
    return { ok: false, reason: 'stored_stem_char_display_mismatch' };
  }
  if (displayEnvelope.auditMeta.derivation === 'jdn_offset_provisional_v1') {
    return { ok: false, reason: 'jdn_provisional_derivation_forbidden' };
  }

  return { ok: true, envelope: displayEnvelope };
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

    const display = resolveStoredV2DisplayEnvelope(storedRead.envelope, storedRead.profile);
    if (!display.ok) {
      return { ok: false, reason: display.reason };
    }

    const rawMeta = buildRawMeta(
      row,
      'v2',
      storedRead.envelope,
      'current_dtr_engine_catalog',
    );
    if (!rawMeta) return { ok: false, reason: 'invalid_envelope' };

    return {
      ok: true,
      mode: 'stored_v2',
      envelope: display.envelope,
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
    const rawMeta = buildRawMeta(
      row,
      'legacy',
      row.envelope_json,
      'legacy_pipeline_rebuild',
    );
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
