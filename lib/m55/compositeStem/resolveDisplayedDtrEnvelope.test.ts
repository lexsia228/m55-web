import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { resetCalendarBundleCacheForTests } from '../calendar/loadCalendarBundle';
import { runDtrEngine } from '../dtrEngine';
import { TEN_STEM_DISPLAY } from '../tenStemCatalog';
import { ENGINE_VERSION_V2 } from './constants';
import { buildV2FulfillmentSnapshotFromFields } from './buildV2FulfillmentSnapshot';
import { deriveDtrShelfStemDisplayFromSnapshot } from './deriveDisplayedDtrShelfStem';
import {
  resolveDisplayedDtrEnvelope,
} from './resolveDisplayedDtrEnvelope';
import type { DtrReportSnapshotReadRow } from './storedEnvelopeRead';

function legacyEnvelope(birthDate: string, nickname: string) {
  return runDtrEngine({
    birthDate,
    nickname,
    locale: 'ja-JP',
    contextScope: 'dtr',
  });
}

function baseRow(overrides: Partial<DtrReportSnapshotReadRow>): DtrReportSnapshotReadRow {
  return {
    reportInstanceId: 'snap-1',
    user_id: 'user-1',
    product_id: 'DTR_CORE_STATIC_V1',
    checkout_session_id: 'cs_test',
    profile_snapshot: { nickname: 'mi', birthDate: '1992-12-19' },
    draft_snapshot: null,
    envelope_json: overrides.envelope_json!,
    engine_version: overrides.engine_version ?? null,
    engine_context_json: overrides.engine_context_json ?? null,
    ...overrides,
  };
}

describe('resolveDisplayedDtrEnvelope', () => {
  it('legacy 1992-12-19 with profile_snapshot.birth_date only → rebuilt v2', () => {
    resetCalendarBundleCacheForTests();
    const envelope = legacyEnvelope('1992-12-19', 'mi');
    const row = baseRow({
      envelope_json: envelope,
      profile_snapshot: { nickname: 'mi', birth_date: '1992-12-19' } as unknown as DtrReportSnapshotReadRow['profile_snapshot'],
    });
    const read = resolveDisplayedDtrEnvelope(row);
    assert.equal(read.ok, true);
    if (!read.ok) return;
    assert.equal(read.mode, 'rebuilt_v2_from_legacy');
    assert.equal(read.envelope.auditMeta.stemLaneIndex, 1);
  });

  it('legacy 1992-12-19 → rebuilt v2 lane 1 / プランナー, raw lane 5 retained', () => {
    resetCalendarBundleCacheForTests();
    const envelope = legacyEnvelope('1992-12-19', 'mi');
    const row = baseRow({
      envelope_json: envelope,
      profile_snapshot: { nickname: 'mi', birthDate: '1992-12-19' },
    });
    const read = resolveDisplayedDtrEnvelope(row);
    assert.equal(read.ok, true);
    if (!read.ok) return;
    assert.equal(read.mode, 'rebuilt_v2_from_legacy');
    assert.equal(read.envelope.auditMeta.stemLaneIndex, 1);
    assert.equal(TEN_STEM_DISPLAY[read.envelope.auditMeta.stemLaneIndex]!.publicTitle, 'プランナー');
    assert.equal(read.rawMeta.storedStemLaneIndex, 5);
    assert.equal(read.rawMeta.storedMode, 'legacy');
    assert.notEqual(
      read.envelope.payload.fullSections[0]?.body,
      envelope.payload.fullSections[0]?.body,
    );
  });

  it('legacy 1983-02-28 → displayed lane 9 / アナリスト', () => {
    resetCalendarBundleCacheForTests();
    const envelope = legacyEnvelope('1983-02-28', 'gx');
    const row = baseRow({
      envelope_json: envelope,
      profile_snapshot: { nickname: 'gx', birthDate: '1983-02-28' },
    });
    const read = resolveDisplayedDtrEnvelope(row);
    assert.equal(read.ok, true);
    if (!read.ok) return;
    assert.equal(read.envelope.auditMeta.stemLaneIndex, 9);
    assert.equal(TEN_STEM_DISPLAY[read.envelope.auditMeta.stemLaneIndex]!.publicTitle, 'アナリスト');
    assert.equal(read.rawMeta.storedStemLaneIndex, 3);
  });

  it('legacy 1919-11-01 → displayed lane 9 / アナリスト', () => {
    resetCalendarBundleCacheForTests();
    const envelope = legacyEnvelope('1919-11-01', 'x');
    const row = baseRow({
      envelope_json: envelope,
      profile_snapshot: { nickname: 'x', birthDate: '1919-11-01' },
    });
    const read = resolveDisplayedDtrEnvelope(row);
    assert.equal(read.ok, true);
    if (!read.ok) return;
    assert.equal(read.envelope.auditMeta.stemLaneIndex, 9);
    assert.equal(TEN_STEM_DISPLAY[read.envelope.auditMeta.stemLaneIndex]!.publicTitle, 'アナリスト');
  });

  it('legacy 1111-11-01 → fail-close, no legacy fallback', () => {
    resetCalendarBundleCacheForTests();
    const envelope = legacyEnvelope('1111-11-01', 'x');
    const row = baseRow({
      envelope_json: envelope,
      profile_snapshot: { nickname: 'x', birthDate: '1111-11-01' },
    });
    const read = resolveDisplayedDtrEnvelope(row);
    assert.equal(read.ok, false);
    if (read.ok) return;
    assert.equal(read.reason, 'M55_COMPOSITE_DATE_OUT_OF_RANGE');
  });

  it('stored v2 row → stored_v2 passthrough', () => {
    resetCalendarBundleCacheForTests();
    const built = buildV2FulfillmentSnapshotFromFields({
      nickname: 'GX',
      birthDate: '1983-02-28',
      birthTime: '12:00',
      birthTimeUnknown: false,
      country: 'JP',
      birthplace: '東京都',
      timezone: 'Asia/Tokyo',
    });
    const row = baseRow({
      envelope_json: built.envelope_json,
      engine_version: ENGINE_VERSION_V2,
      engine_context_json: built.engine_context_json,
      profile_snapshot: built.profile_snapshot,
    });
    const read = resolveDisplayedDtrEnvelope(row);
    assert.equal(read.ok, true);
    if (!read.ok) return;
    assert.equal(read.mode, 'stored_v2');
    assert.equal(read.envelope, built.envelope_json);
    assert.equal(read.rawMeta.storedMode, 'v2');
  });
});

describe('shelf display via displayed resolver', () => {
  it('legacy 1992-12-19 shelf shows プランナー', () => {
    resetCalendarBundleCacheForTests();
    const row = baseRow({
      envelope_json: legacyEnvelope('1992-12-19', 'mi'),
      profile_snapshot: { nickname: 'mi', birthDate: '1992-12-19' },
    });
    const shelf = deriveDtrShelfStemDisplayFromSnapshot(row);
    assert.ok(shelf);
    assert.equal(shelf!.publicTitle, 'プランナー');
    assert.equal(shelf!.stemLaneIndex, 1);
  });

  it('out-of-range row returns null shelf stem', () => {
    resetCalendarBundleCacheForTests();
    const row = baseRow({
      envelope_json: legacyEnvelope('1111-11-01', 'x'),
      profile_snapshot: { nickname: 'x', birthDate: '1111-11-01' },
    });
    assert.equal(deriveDtrShelfStemDisplayFromSnapshot(row), null);
  });
});

describe('consult grounding contract', () => {
  it('send route uses resolveDisplayedDtrEnvelope for grounding', () => {
    const src = readFileSync(join(process.cwd(), 'app/api/room/core/send/route.ts'), 'utf8');
    assert.ok(src.includes('resolveDisplayedDtrEnvelope'));
    assert.equal(src.includes('resolveStoredEnvelopeRead'), false);
    assert.ok(src.includes('buildConsultReportContextFromEnvelope(displayedRead.envelope'));
  });

  it('/dtr/core page uses resolveDisplayedDtrEnvelope', () => {
    const src = readFileSync(join(process.cwd(), 'app/dtr/core/page.tsx'), 'utf8');
    assert.ok(src.includes('resolveDisplayedDtrEnvelope'));
    assert.equal(src.includes('resolveStoredEnvelopeRead'), false);
    assert.ok(src.includes('displayedEnvelopeReadMode={read.mode}'));
  });
});
