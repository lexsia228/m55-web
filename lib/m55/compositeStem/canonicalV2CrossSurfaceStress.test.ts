import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { enrichBirthProfileForSave } from '../../soul/birthProfileV2';
import { resetCalendarBundleCacheForTests } from '../calendar/loadCalendarBundle';
import { buildConsultReportContextFromEnvelope } from '../consult/consultReportContext';
import { buildCoreResult } from '../coreResult/buildCoreResult';
import { runDtrEngine } from '../dtrEngine';
import { TEN_STEM_DISPLAY } from '../tenStemCatalog';
import { buildV2FulfillmentSnapshotFromFields } from './buildV2FulfillmentSnapshot';
import { ENGINE_VERSION_V2 } from './constants';
import { deriveDtrShelfStemDisplayFromSnapshot } from './deriveDisplayedDtrShelfStem';
import {
  toCompositeCanonicalInput,
  type FulfillmentProfileFields,
} from './parseFulfillmentMetadata';
import { runM55CompositeStemPipeline } from './pipeline';
import { resolveDisplayedDtrEnvelope } from './resolveDisplayedDtrEnvelope';
import type { DtrReportSnapshotReadRow } from './storedEnvelopeRead';

const REQUIRED_SEEDS = [
  '1983-02-28',
  '1992-12-19',
  '1919-11-01',
  '2000-02-29',
  '2024-02-29',
  '1999-12-31',
  '2000-01-01',
] as const;

const DENSE_COHORT_YEARS = { start: 1960, end: 2010 } as const;
const BOUNDARY_COHORT_YEARS = [1960, 1970, 1980, 1990, 2000, 2010] as const;
const SHOULDER_COHORT_RANGES = [
  { start: 1950, end: 1959 },
  { start: 2011, end: 2015 },
] as const;

const ADJACENT_BOUNDARY_DATES = [
  '1992-12-18',
  '1992-12-19',
  '1992-12-20',
  '2024-02-03',
  '2024-02-04',
  '2024-02-05',
  '1999-02-28',
  '1999-03-01',
  '2000-02-28',
  '2000-02-29',
  '2000-03-01',
  '2024-02-28',
  '2024-02-29',
  '2024-03-01',
] as const;

const OUT_OF_RANGE_DATES = ['1111-11-01', '1899-12-31', '2101-01-01'] as const;

const CERTIFIED_GOLDEN: Record<string, { lane: number; title: string }> = {
  '1983-02-28': { lane: 9, title: 'アナリスト' },
  '1992-12-19': { lane: 1, title: 'プランナー' },
  '1919-11-01': { lane: 9, title: 'アナリスト' },
};

const BODY_SECTION_IDS = ['s1_identity', 's2_composition', 's3_essence'] as const;

function isValidGregorianDate(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addIfValid(dates: Set<string>, iso: string): void {
  if (isValidGregorianDate(iso)) dates.add(iso);
}

/** Practical-user cohort: dense 1960–2010, boundary month edges, sparse shoulders, adjacent edges. */
export function generateCanonicalV2StressDates(): string[] {
  const dates = new Set<string>();

  for (const seed of REQUIRED_SEEDS) dates.add(seed);
  for (const iso of ADJACENT_BOUNDARY_DATES) dates.add(iso);

  for (let year = DENSE_COHORT_YEARS.start; year <= DENSE_COHORT_YEARS.end; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      addIfValid(dates, formatIsoDate(year, month, 15));
    }
  }

  for (const year of BOUNDARY_COHORT_YEARS) {
    for (let month = 1; month <= 12; month += 1) {
      addIfValid(dates, formatIsoDate(year, month, 1));
      addIfValid(dates, formatIsoDate(year, month, lastDayOfMonth(year, month)));
    }
  }

  for (const range of SHOULDER_COHORT_RANGES) {
    for (let year = range.start; year <= range.end; year += 1) {
      for (const daySpec of [
        { month: 1, day: 1 },
        { month: 6, day: 15 },
        { month: 12, day: 31 },
      ]) {
        addIfValid(dates, formatIsoDate(year, daySpec.month, daySpec.day));
      }
    }
  }

  return [...dates].sort();
}

function filterPipelineReadyDates(dates: readonly string[]): string[] {
  const ready: string[] = [];
  for (const birthDate of dates) {
    resetCalendarBundleCacheForTests();
    try {
      runM55CompositeStemPipeline(toCompositeCanonicalInput(defaultFields(birthDate)));
      ready.push(birthDate);
    } catch {
      // Calendar bundle gaps (e.g. solar:1899 for 1900-* ) — excluded from parity matrix.
    }
  }
  return ready;
}

function defaultFields(birthDate: string, nickname = 'stress'): FulfillmentProfileFields {
  return {
    nickname,
    birthDate,
    birthTime: null,
    birthTimeUnknown: true,
    country: 'JP',
    birthplace: null,
    timezone: null,
  };
}

function legacySnapshotRow(birthDate: string, nickname = 'stress'): DtrReportSnapshotReadRow {
  const envelope = runDtrEngine({
    birthDate,
    nickname,
    locale: 'ja-JP',
    contextScope: 'dtr',
  });
  return {
    reportInstanceId: 'snap-stress',
    user_id: 'user-stress',
    product_id: 'DTR_CORE_STATIC_V1',
    checkout_session_id: null,
    profile_snapshot: { nickname, birthDate },
    draft_snapshot: null,
    envelope_json: envelope,
    engine_version: null,
    engine_context_json: null,
  };
}

function sectionBody(envelope: { payload: { fullSections: Array<{ id: string; body: string }> } }, id: string): string {
  const section = envelope.payload.fullSections.find((s) => s.id === id);
  assert.ok(section, `${id} section exists`);
  return section!.body;
}

function assertCrossSurfaceParityForDate(birthDate: string): number {
  resetCalendarBundleCacheForTests();
  const fields = defaultFields(birthDate);
  const profile = enrichBirthProfileForSave({
    nickname: fields.nickname,
    birthDate: fields.birthDate,
    birthTimeUnknown: true,
    country: 'JP',
  });

  const pipeline = runM55CompositeStemPipeline(toCompositeCanonicalInput(fields));
  const core = buildCoreResult(profile);
  const paid = buildV2FulfillmentSnapshotFromFields(fields);
  const row = legacySnapshotRow(birthDate);
  const displayed = resolveDisplayedDtrEnvelope(row);
  assert.equal(displayed.ok, true, `${birthDate}: displayed rebuild`);
  if (!displayed.ok) return -1;

  assert.equal(displayed.mode, 'rebuilt_v2_from_legacy', birthDate);

  const lane = pipeline.stemLaneIndex;
  const title = TEN_STEM_DISPLAY[lane]!.publicTitle;

  assert.equal(core.stemLaneIndex, lane, `${birthDate}: free core lane`);
  assert.equal(paid.envelope_json.auditMeta.stemLaneIndex, lane, `${birthDate}: paid v2 lane`);
  assert.equal(displayed.envelope.auditMeta.stemLaneIndex, lane, `${birthDate}: displayed lane`);
  assert.equal(TEN_STEM_DISPLAY[displayed.envelope.auditMeta.stemLaneIndex]!.publicTitle, title, birthDate);

  assert.equal(paid.engine_version, ENGINE_VERSION_V2, birthDate);
  assert.equal(paid.envelope_json.auditMeta.derivation, 'm55_composite_stem_v2_p_lunar', birthDate);
  assert.notEqual(paid.envelope_json.auditMeta.derivation, 'jdn_offset_provisional_v1', birthDate);

  const shelf = deriveDtrShelfStemDisplayFromSnapshot(row);
  assert.ok(shelf, `${birthDate}: shelf display`);
  assert.equal(shelf!.stemLaneIndex, lane, `${birthDate}: shelf lane`);
  assert.equal(shelf!.publicTitle, title, `${birthDate}: shelf title`);

  const consultContext = buildConsultReportContextFromEnvelope(displayed.envelope);
  assert.ok(consultContext.length > 0, `${birthDate}: consult context non-empty`);

  for (const sectionId of BODY_SECTION_IDS) {
    assert.equal(
      sectionBody(displayed.envelope, sectionId),
      sectionBody(paid.envelope_json, sectionId),
      `${birthDate}: ${sectionId} body parity paid=displayed`,
    );
  }

  const altNickname = `${fields.nickname}-alt`;
  const coreAlt = buildCoreResult(
    enrichBirthProfileForSave({
      nickname: altNickname,
      birthDate,
      birthTimeUnknown: true,
      country: 'JP',
    }),
  );
  assert.equal(coreAlt.stemLaneIndex, lane, `${birthDate}: nickname independence`);

  return lane;
}

const GENERATED_STRESS_DATES = generateCanonicalV2StressDates();
const STRESS_DATES = filterPipelineReadyDates(GENERATED_STRESS_DATES);

const CALENDAR_EDGE_FAIL_DATES = ['1900-01-01', '1900-12-31'] as const;

describe('canonical v2 cross-surface stress — cohort', () => {
  it('reports stress cohort size', () => {
    console.info('[stress] generated total:', GENERATED_STRESS_DATES.length);
    console.info('[stress] calendar-ready parity total:', STRESS_DATES.length);
    assert.ok(STRESS_DATES.length >= 500, `expected >=500 cases, got ${STRESS_DATES.length}`);
    assert.ok(STRESS_DATES.length < 1000, `expected <1000 cases, got ${STRESS_DATES.length}`);
  });

  it('lane 0-9 all appear in stress cohort', () => {
    const seen = new Set<number>();
    for (const birthDate of STRESS_DATES) {
      resetCalendarBundleCacheForTests();
      const pipeline = runM55CompositeStemPipeline(toCompositeCanonicalInput(defaultFields(birthDate)));
      seen.add(pipeline.stemLaneIndex);
    }
    for (let lane = 0; lane <= 9; lane += 1) {
      assert.ok(seen.has(lane), `lane ${lane} missing from stress distribution`);
    }
    console.info('[stress] lane distribution lanes seen:', [...seen].sort((a, b) => a - b).join(','));
  });
});

describe('canonical v2 cross-surface stress — certified golden', () => {
  for (const [birthDate, expected] of Object.entries(CERTIFIED_GOLDEN)) {
    it(`${birthDate} → lane ${expected.lane} / ${expected.title}`, () => {
      const lane = assertCrossSurfaceParityForDate(birthDate);
      assert.equal(lane, expected.lane);
      assert.equal(TEN_STEM_DISPLAY[lane]!.publicTitle, expected.title);
    });
  }
});

describe('canonical v2 cross-surface stress — calendar edge fail-close', () => {
  for (const birthDate of CALENDAR_EDGE_FAIL_DATES) {
    it(`${birthDate} → displayed rebuild fail-closed (calendar table gap)`, () => {
      resetCalendarBundleCacheForTests();
      const row = legacySnapshotRow(birthDate);
      const displayed = resolveDisplayedDtrEnvelope(row);
      assert.equal(displayed.ok, false);
    });
  }
});

describe('canonical v2 cross-surface stress — stored_v2 display normalize', () => {
  it('stored_v2 row displays current catalog body while raw envelope stays stale', () => {
    resetCalendarBundleCacheForTests();
    const fields = defaultFields('1983-02-28');
    const paid = buildV2FulfillmentSnapshotFromFields(fields);
    const staleEnvelope = structuredClone(paid.envelope_json);
    const staleMarker = 'STALE_CROSS_SURFACE_MARKER_ステークホルダー';
    const s3 = staleEnvelope.payload.fullSections.find((s) => s.id === 's3_essence');
    assert.ok(s3);
    s3!.body = `${s3!.body}\n${staleMarker}`;

    const row: DtrReportSnapshotReadRow = {
      reportInstanceId: 'snap-stored-v2',
      user_id: 'user-stress',
      product_id: 'DTR_CORE_STATIC_V1',
      checkout_session_id: null,
      profile_snapshot: paid.profile_snapshot,
      draft_snapshot: null,
      envelope_json: staleEnvelope,
      engine_version: ENGINE_VERSION_V2,
      engine_context_json: paid.engine_context_json,
    };

    const displayed = resolveDisplayedDtrEnvelope(row);
    assert.equal(displayed.ok, true);
    if (!displayed.ok) return;
    assert.equal(displayed.mode, 'stored_v2');
    assert.equal(displayed.envelope.auditMeta.stemLaneIndex, paid.envelope_json.auditMeta.stemLaneIndex);

    const displayedText = displayed.envelope.payload.fullSections.map((s) => s.body).join('\n');
    assert.equal(displayedText.includes(staleMarker), false);
    const rawText = row.envelope_json.payload.fullSections.map((s) => s.body).join('\n');
    assert.equal(rawText.includes(staleMarker), true);

    for (const sectionId of BODY_SECTION_IDS) {
      assert.equal(
        sectionBody(displayed.envelope, sectionId),
        sectionBody(paid.envelope_json, sectionId),
        `stored_v2 normalize ${sectionId}`,
      );
    }
  });
});

describe('canonical v2 cross-surface stress — out-of-range fail-close', () => {
  for (const birthDate of OUT_OF_RANGE_DATES) {
    it(`${birthDate} → resolveDisplayedDtrEnvelope ok:false`, () => {
      resetCalendarBundleCacheForTests();
      const row = legacySnapshotRow(birthDate);
      const displayed = resolveDisplayedDtrEnvelope(row);
      assert.equal(displayed.ok, false);
    });
  }
});

describe('canonical v2 cross-surface stress — parametric matrix', () => {
  for (const birthDate of STRESS_DATES) {
    it(`parity ${birthDate}`, () => {
      assertCrossSurfaceParityForDate(birthDate);
    });
  }
});

describe('canonical v2 cross-surface stress — static guards', () => {
  it('paid fulfillment write path has no legacy JDN fallback', () => {
    const src = readFileSync(join(process.cwd(), 'lib/m55/dtrDraftDb.ts'), 'utf8');
    const upsert = src.slice(src.indexOf('upsertDtrReportSnapshotAtFulfillment'));
    assert.doesNotMatch(upsert, /runDtrEngine\s*\(/);
    assert.doesNotMatch(upsert, /essenceStemLaneIndex/);
    assert.doesNotMatch(upsert, /jdn_offset_provisional_v1/);
    assert.doesNotMatch(upsert, /dtr-v1-jdn-day-stem-provisional/);
  });

  it('reader and consult use resolveDisplayedDtrEnvelope', () => {
    const corePage = readFileSync(join(process.cwd(), 'app/dtr/core/page.tsx'), 'utf8');
    const sendRoute = readFileSync(join(process.cwd(), 'app/api/room/core/send/route.ts'), 'utf8');
    assert.ok(corePage.includes('resolveDisplayedDtrEnvelope'));
    assert.ok(sendRoute.includes('resolveDisplayedDtrEnvelope'));
    assert.equal(sendRoute.includes('resolveStoredEnvelopeRead'), false);
  });

  it('shelf uses deriveDisplayedDtrShelfStem without raw/display import cycle', () => {
    const shelfStemSrc = readFileSync(
      join(process.cwd(), 'lib/m55/compositeStem/deriveDisplayedDtrShelfStem.ts'),
      'utf8',
    );
    const storedSrc = readFileSync(
      join(process.cwd(), 'lib/m55/compositeStem/storedEnvelopeRead.ts'),
      'utf8',
    );
    const displayedSrc = readFileSync(
      join(process.cwd(), 'lib/m55/compositeStem/resolveDisplayedDtrEnvelope.ts'),
      'utf8',
    );
    assert.ok(shelfStemSrc.includes('resolveDisplayedDtrEnvelope'));
    assert.equal(storedSrc.includes('resolveDisplayedDtrEnvelope'), false);
    assert.ok(displayedSrc.includes('storedEnvelopeRead'));
    assert.equal(displayedSrc.includes('deriveDisplayedDtrShelfStem'), false);
  });

  it('legacy provisional strings absent from paid write expectations', () => {
    const fulfillmentTest = readFileSync(
      join(process.cwd(), 'lib/m55/compositeStem/fulfillmentWrite.test.ts'),
      'utf8',
    );
    assert.ok(fulfillmentTest.includes('m55_composite_stem_v2_p_lunar'));
    assert.doesNotMatch(fulfillmentTest, /engineVersion.*dtr-v1-jdn-day-stem-provisional/);
  });
});
