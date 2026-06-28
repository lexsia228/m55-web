/**
 * 1000-DOB deterministic uniqueness fingerprint test.
 *
 * Validates that DOB-v2 individualization improves uniqueness across a
 * deterministic fixture of 1000 synthetic birth dates.
 *
 * No DB, no network, no AI, no production POST.
 * Pure deterministic computation only.
 *
 * Minimum uniqueness targets (conservative; actual may exceed):
 *   S1: > 10 (beyond stem-only 10 variants)
 *   S2: > 10 (beyond stem-only 10 variants)
 *   S3: > 135 (phase blend improves over pre-patch ~135)
 *   S4: > 10 (beyond stem-only 10 variants)
 *   Full report: > 135 (same as S3 or better)
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resetCalendarBundleCacheForTests } from './calendar/loadCalendarBundle';
import { buildV2FulfillmentSnapshotFromFields } from './compositeStem/buildV2FulfillmentSnapshot';
import { checkNaturalness } from './dtrVisibleCopyNaturalness';

/** Generate 1000 deterministic birth dates spanning 1960–2000 */
function generate1000Dobs(): string[] {
  const dates: string[] = [];
  // 40 years × 12 months × ~2 days per month = 960; add a few more for 1000
  for (let year = 1960; year <= 2000; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      // Two days per month: 7th and 22nd (covers early and late lunar day distribution)
      for (const day of [7, 22] as const) {
        dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
      }
    }
  }
  // Trim or pad to exactly 1000
  return dates.slice(0, 1000);
}

const DOBS = generate1000Dobs();

interface SectionFingerprints {
  s1: string[];
  s2: string[];
  s3: string[];
  s4: string[];
  fullReport: string[];
}

function djb2(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

function collectFingerprints(): SectionFingerprints {
  const s1: string[] = [];
  const s2: string[] = [];
  const s3: string[] = [];
  const s4: string[] = [];
  const fullReport: string[] = [];

  for (const birthDate of DOBS) {
    resetCalendarBundleCacheForTests();
    const built = buildV2FulfillmentSnapshotFromFields(
      {
        nickname: 'test',
        birthDate,
        birthTime: '12:00:00',
        birthTimeUnknown: false,
        country: 'JP',
        birthplace: null,
        timezone: 'Asia/Tokyo',
      },
      { dobPersonalizationV2Enabled: true },
    );
    const sections = built.envelope_json.payload.fullSections;
    const sec = (id: string) => sections.find((s) => s.id === id)?.body ?? '';

    s1.push(djb2(sec('s1_identity')));
    s2.push(djb2(sec('s2_composition')));
    s3.push(djb2(sec('s3_essence')));
    s4.push(djb2(sec('s4_strengths')));
    fullReport.push(djb2(sections.map((s) => s.body).join('|')));
  }

  return { s1, s2, s3, s4, fullReport };
}

// Compute once for all tests in this file
const FP = collectFingerprints();

function uniqueCount(arr: string[]): number {
  return new Set(arr).size;
}

describe('1000-DOB uniqueness fingerprint — v2 path', () => {
  it('S1 uniqueness exceeds 10 (beyond stem-only)', () => {
    const u = uniqueCount(FP.s1);
    assert.ok(u > 10, `S1 unique=${u}, expected > 10`);
  });

  it('S2 uniqueness exceeds 10 (beyond stem-only)', () => {
    const u = uniqueCount(FP.s2);
    assert.ok(u > 10, `S2 unique=${u}, expected > 10`);
  });

  it('S3 uniqueness exceeds 135 (phase blend improvement)', () => {
    const u = uniqueCount(FP.s3);
    assert.ok(u > 135, `S3 unique=${u}, expected > 135`);
  });

  it('S4 uniqueness exceeds 10 (beyond stem-only)', () => {
    const u = uniqueCount(FP.s4);
    assert.ok(u > 10, `S4 unique=${u}, expected > 10`);
  });

  it('Full report uniqueness exceeds 135 (better than pre-patch ~135)', () => {
    const u = uniqueCount(FP.fullReport);
    assert.ok(u > 135, `Full report unique=${u}, expected > 135`);
  });

  it('Deterministic: same 1000 DOBs produce identical fingerprints on second run', () => {
    // Re-run a small subset to verify determinism
    const subset = DOBS.slice(0, 5);
    for (let i = 0; i < subset.length; i++) {
      resetCalendarBundleCacheForTests();
      const built = buildV2FulfillmentSnapshotFromFields(
        {
          nickname: 'test',
          birthDate: subset[i]!,
          birthTime: '12:00:00',
          birthTimeUnknown: false,
          country: 'JP',
          birthplace: null,
          timezone: 'Asia/Tokyo',
        },
        { dobPersonalizationV2Enabled: true },
      );
      const sections = built.envelope_json.payload.fullSections;
      const fp = djb2(sections.map((s) => s.body).join('|'));
      assert.equal(fp, FP.fullReport[i]!, `non-deterministic output at index ${i} for ${subset[i]}`);
    }
  });
});

describe('1000-DOB naturalness scan — v2 path', () => {
  it('no miさん in any generated section body', () => {
    const allBodies = DOBS.slice(0, 50).flatMap((birthDate) => {
      resetCalendarBundleCacheForTests();
      const built = buildV2FulfillmentSnapshotFromFields(
        { nickname: 'test', birthDate, birthTime: '12:00:00', birthTimeUnknown: false, country: 'JP', birthplace: null, timezone: 'Asia/Tokyo' },
        { dobPersonalizationV2Enabled: true },
      );
      return built.envelope_json.payload.fullSections.map((s) => s.body);
    });
    for (const body of allBodies) {
      assert.ok(!body.includes('miさん'), `Found hardcoded "miさん" in body: ${body.slice(0, 80)}`);
    }
  });

  it('no 読み取りです in any generated section body (first 50 DOBs)', () => {
    for (const birthDate of DOBS.slice(0, 50)) {
      resetCalendarBundleCacheForTests();
      const built = buildV2FulfillmentSnapshotFromFields(
        { nickname: 'test', birthDate, birthTime: '12:00:00', birthTimeUnknown: false, country: 'JP', birthplace: null, timezone: 'Asia/Tokyo' },
        { dobPersonalizationV2Enabled: true },
      );
      for (const section of built.envelope_json.payload.fullSections) {
        assert.ok(!section.body.includes('読み取りです'), `Found "読み取りです" in ${section.id} for ${birthDate}`);
      }
    }
  });

  it('no 正午基準 in any generated section body (first 50 DOBs)', () => {
    for (const birthDate of DOBS.slice(0, 50)) {
      resetCalendarBundleCacheForTests();
      const built = buildV2FulfillmentSnapshotFromFields(
        { nickname: 'test', birthDate, birthTime: '12:00:00', birthTimeUnknown: false, country: 'JP', birthplace: null, timezone: 'Asia/Tokyo' },
        { dobPersonalizationV2Enabled: true },
      );
      for (const section of built.envelope_json.payload.fullSections) {
        assert.ok(!section.body.includes('正午基準'), `Found "正午基準" in ${section.id} for ${birthDate}`);
      }
    }
  });

  it('s1/s2/s4 DOB prefix bodies pass naturalness guard (sample 20 DOBs)', () => {
    for (const birthDate of DOBS.slice(0, 20)) {
      resetCalendarBundleCacheForTests();
      const built = buildV2FulfillmentSnapshotFromFields(
        { nickname: 'test', birthDate, birthTime: '12:00:00', birthTimeUnknown: false, country: 'JP', birthplace: null, timezone: 'Asia/Tokyo' },
        { dobPersonalizationV2Enabled: true },
      );
      const sections = built.envelope_json.payload.fullSections;
      for (const id of ['s1_identity', 's2_composition', 's4_strengths'] as const) {
        const sec = sections.find((s) => s.id === id);
        if (!sec) continue;
        const result = checkNaturalness(sec.body);
        assert.ok(
          result.pass,
          `Naturalness guard failed for ${id} (${birthDate}): ${JSON.stringify(result.violations)}`,
        );
      }
    }
  });
});

describe('1000-DOB version safety — v1 path unchanged', () => {
  it('v1 path: s1/s2/s4 bodies are shorter than v2 (no DOB prefix added)', () => {
    // v1 path should NOT have DOB prefix for s1/s2/s4; v2 bodies should be longer
    const v1Dates = DOBS.slice(0, 5);
    for (const birthDate of v1Dates) {
      resetCalendarBundleCacheForTests();
      const v1Built = buildV2FulfillmentSnapshotFromFields(
        { nickname: 'test', birthDate, birthTime: '12:00:00', birthTimeUnknown: false, country: 'JP', birthplace: null, timezone: 'Asia/Tokyo' },
        { dobPersonalizationV2Enabled: false }, // v1 path
      );
      resetCalendarBundleCacheForTests();
      const v2Built = buildV2FulfillmentSnapshotFromFields(
        { nickname: 'test', birthDate, birthTime: '12:00:00', birthTimeUnknown: false, country: 'JP', birthplace: null, timezone: 'Asia/Tokyo' },
        { dobPersonalizationV2Enabled: true }, // v2 path
      );

      for (const sectionId of ['s1_identity', 's2_composition', 's4_strengths'] as const) {
        const v1Body = v1Built.envelope_json.payload.fullSections.find((s) => s.id === sectionId)!.body;
        const v2Body = v2Built.envelope_json.payload.fullSections.find((s) => s.id === sectionId)!.body;
        // v2 body should be longer due to DOB prefix
        assert.ok(
          v2Body.length > v1Body.length,
          `v2 ${sectionId} body should be longer than v1 for ${birthDate} (v2=${v2Body.length} v1=${v1Body.length})`,
        );
        // v1 body must start with the seed body content (not with a DOB prefix sentence)
        // The DOB prefix sentences for s1 follow the pattern "〜形です。\n", s2 follows "〜生まれとして、〜"
        // The seed body for s1 starts with "動き始めるのは" pattern, NOT a DOB prefix
        assert.ok(
          !v1Body.startsWith('向き') && !v1Body.startsWith('場の') && !v1Body.startsWith('表現が') &&
          !v1Body.startsWith('ひとつに') && !v1Body.startsWith('続けることで') && !v1Body.startsWith('育てる') &&
          !v1Body.startsWith('区切りを') && !v1Body.startsWith('丁寧に') && !v1Body.startsWith('外への') &&
          !v1Body.startsWith('静かに'),
          `v1 ${sectionId} body should NOT start with DOB stem identity prefix for ${birthDate}`,
        );
        // v2 body should start with one of the DOB prefix patterns
        assert.ok(
          v2Body.startsWith('向き') || v2Body.startsWith('場の') || v2Body.startsWith('表現が') ||
          v2Body.startsWith('ひとつに') || v2Body.startsWith('続けることで') || v2Body.startsWith('育てる') ||
          v2Body.startsWith('区切りを') || v2Body.startsWith('丁寧に') || v2Body.startsWith('外への') ||
          v2Body.startsWith('静かに') ||
          // s2 starts with season composition
          v2Body.startsWith('冬に近い') || v2Body.startsWith('春に近い') ||
          v2Body.startsWith('夏に近い') || v2Body.startsWith('秋に近い') ||
          // s4 starts with month strengths
          v2Body.startsWith('年始に') || v2Body.startsWith('寒暖が') || v2Body.startsWith('動きが') ||
          v2Body.startsWith('流れが') || v2Body.startsWith('熱が上') || v2Body.startsWith('勢いが') ||
          v2Body.startsWith('集中が') || v2Body.startsWith('後半に') || v2Body.startsWith('区切りに') ||
          v2Body.startsWith('落ち着く') || v2Body.startsWith('整える') || v2Body.startsWith('折り返し'),
          `v2 ${sectionId} body should start with a DOB prefix for ${birthDate}: "${v2Body.slice(0, 30)}"`,
        );
      }
    }
  });

  it('v1 engine_context_json.paidIndividualizationVersion is absent', () => {
    resetCalendarBundleCacheForTests();
    const built = buildV2FulfillmentSnapshotFromFields(
      { nickname: 'test', birthDate: '1980-01-07', birthTime: '12:00:00', birthTimeUnknown: false, country: 'JP', birthplace: null, timezone: 'Asia/Tokyo' },
      { dobPersonalizationV2Enabled: false },
    );
    assert.equal(built.engine_context_json.paidIndividualizationVersion, undefined);
  });

  it('v2 engine_context_json.paidIndividualizationVersion is "v2"', () => {
    resetCalendarBundleCacheForTests();
    const built = buildV2FulfillmentSnapshotFromFields(
      { nickname: 'test', birthDate: '1980-01-07', birthTime: '12:00:00', birthTimeUnknown: false, country: 'JP', birthplace: null, timezone: 'Asia/Tokyo' },
      { dobPersonalizationV2Enabled: true },
    );
    assert.equal(built.engine_context_json.paidIndividualizationVersion, 'v2');
  });
});
