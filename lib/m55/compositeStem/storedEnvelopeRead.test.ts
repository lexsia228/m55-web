import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runDtrEngine } from '../dtrEngine';
import { ENGINE_VERSION_V2 } from './constants';
import { buildV2FulfillmentSnapshotFromFields } from './buildV2FulfillmentSnapshot';
import {
  deriveDtrShelfStemDisplayFromSnapshot,
  isReadableStoredEnvelope,
  resolveStoredEnvelopeRead,
  type DtrReportSnapshotReadRow,
} from './storedEnvelopeRead';
import { runM55CompositeStemPipeline } from './pipeline';
import type { M55CompositeCanonicalInput } from './types';

const GOLDEN_FIELDS = {
  nickname: 'GX',
  birthDate: '1983-02-28',
  birthTime: '12:00',
  birthTimeUnknown: false,
  country: 'JP',
  birthplace: '東京都',
  timezone: 'Asia/Tokyo',
};

function baseRow(overrides: Partial<DtrReportSnapshotReadRow>): DtrReportSnapshotReadRow {
  return {
    reportInstanceId: 'snap-1',
    user_id: 'user-1',
    product_id: 'DTR_CORE_STATIC_V1',
    checkout_session_id: 'cs_test',
    profile_snapshot: { nickname: 'GX', birthDate: '1983-02-28' },
    draft_snapshot: null,
    envelope_json: overrides.envelope_json!,
    engine_version: overrides.engine_version ?? null,
    engine_context_json: overrides.engine_context_json ?? null,
    ...overrides,
  };
}

describe('stored envelope read path', () => {
  it('legacy snapshot uses stored envelope without SSR rerun contract', () => {
    const envelope = runDtrEngine({
      birthDate: '1983-02-28',
      nickname: 'Legacy',
      locale: 'ja-JP',
      contextScope: 'dtr',
    });
    const row = baseRow({
      envelope_json: envelope,
      engine_version: null,
      engine_context_json: null,
    });
    const read = resolveStoredEnvelopeRead(row);
    assert.equal(read.ok, true);
    if (!read.ok) return;
    assert.equal(read.mode, 'legacy');
    assert.equal(read.envelope, envelope);
    assert.equal(read.envelope.auditMeta.stemLaneIndex, 3);
  });

  it('v2 snapshot reads stored envelope when context matches', () => {
    const built = buildV2FulfillmentSnapshotFromFields(GOLDEN_FIELDS);
    const row = baseRow({
      envelope_json: built.envelope_json,
      engine_version: ENGINE_VERSION_V2,
      engine_context_json: built.engine_context_json,
      profile_snapshot: built.profile_snapshot,
    });
    const read = resolveStoredEnvelopeRead(row);
    assert.equal(read.ok, true);
    if (!read.ok) return;
    assert.equal(read.mode, 'v2');
    assert.equal(read.envelope.auditMeta.stemLaneIndex, 9);
    assert.equal(read.envelope.auditMeta.stemChar, '癸');
  });

  it('fail-closed when envelope_json missing', () => {
    const row = baseRow({
      envelope_json: null as unknown as DtrReportSnapshotReadRow['envelope_json'],
    });
    const read = resolveStoredEnvelopeRead(row);
    assert.equal(read.ok, false);
    if (read.ok) return;
    assert.equal(read.code, 'missing_envelope');
  });

  it('fail-closed when v2 context stem mismatches envelope', () => {
    const built = buildV2FulfillmentSnapshotFromFields(GOLDEN_FIELDS);
    const badCtx = { ...built.engine_context_json, stemLaneIndex: 3, stemChar: '丁' };
    const row = baseRow({
      envelope_json: built.envelope_json,
      engine_version: ENGINE_VERSION_V2,
      engine_context_json: badCtx,
    });
    const read = resolveStoredEnvelopeRead(row);
    assert.equal(read.ok, false);
    if (read.ok) return;
    assert.equal(read.code, 'v2_stem_mismatch');
  });

  it('shelf display uses stored snapshot stem (not client profile)', () => {
    const built = buildV2FulfillmentSnapshotFromFields(GOLDEN_FIELDS);
    const row = baseRow({
      envelope_json: built.envelope_json,
      engine_version: ENGINE_VERSION_V2,
      engine_context_json: built.engine_context_json,
      profile_snapshot: built.profile_snapshot,
    });
    const shelf = deriveDtrShelfStemDisplayFromSnapshot(row);
    assert.ok(shelf);
    assert.equal(shelf!.stemLaneIndex, 9);
    assert.equal(shelf!.publicTitle, 'アナリスト');
  });

  it('/dtr/core page does not import runDtrEngine', () => {
    const src = readFileSync(join(process.cwd(), 'app/dtr/core/page.tsx'), 'utf8');
    assert.equal(src.includes('runDtrEngine'), false);
    assert.ok(src.includes('resolveStoredEnvelopeRead'));
  });

  it('/dtr/core page passes storedEnvelopeReadMode to DtrFullReader', () => {
    const src = readFileSync(join(process.cwd(), 'app/dtr/core/page.tsx'), 'utf8');
    assert.ok(src.includes('storedEnvelopeReadMode={read.mode}'));
  });

  it('1992-12-19 legacy snapshot => mode legacy / lane 5 / プロデューサー unchanged', () => {
    const envelope = runDtrEngine({
      birthDate: '1992-12-19',
      nickname: 'mi',
      locale: 'ja-JP',
      contextScope: 'dtr',
    });
    const row = baseRow({
      envelope_json: envelope,
      engine_version: null,
      engine_context_json: null,
      profile_snapshot: { nickname: 'mi', birthDate: '1992-12-19' },
    });
    const read = resolveStoredEnvelopeRead(row);
    assert.equal(read.ok, true);
    if (!read.ok) return;
    assert.equal(read.mode, 'legacy');
    assert.equal(read.envelope.auditMeta.stemLaneIndex, 5);
    const shelf = deriveDtrShelfStemDisplayFromSnapshot(row);
    assert.ok(shelf);
    assert.equal(shelf!.publicTitle, 'プロデューサー');
  });
});

describe('GX-01 golden (pipeline)', () => {
  it('1983-02-28 Tokyo noon → stem 9 / 癸', () => {
    const input: M55CompositeCanonicalInput = {
      birthDate: '1983-02-28',
      birthTime: '12:00',
      birthTimeUnknown: false,
      country: 'JP',
      birthplace: '東京都',
      timezone: 'Asia/Tokyo',
      locale: 'ja-JP',
      nickname: 'GX',
      contextScope: 'dtr',
      calendarSystem: 'gregorian_civil',
    };
    const out = runM55CompositeStemPipeline(input);
    assert.equal(out.stemLaneIndex, 9);
    assert.equal(out.stemChar, '癸');
    const built = buildV2FulfillmentSnapshotFromFields(GOLDEN_FIELDS);
    assert.ok(isReadableStoredEnvelope(built.envelope_json));
  });
});
