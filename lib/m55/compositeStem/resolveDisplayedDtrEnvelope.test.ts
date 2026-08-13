import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { resetCalendarBundleCacheForTests } from '../calendar/loadCalendarBundle';
import { runDtrEngine } from '../dtrEngine';
import { composePaidIndividualizationFromEngineContext } from '../dtrPaidIndividualizationCompose';
import { createMockHybridAiProvider } from '../dtrHybridAiProvider';
import { runHybridAiSnapshotGeneration } from '../dtrHybridAiSnapshotGeneration';
import { DOB_PERSONALIZATION_V21_CATALOG_VERSION, DOB_PERSONALIZATION_V2_CATALOG_VERSION } from '../dtrDobPersonalizationV2';
import { TEN_STEM_DISPLAY } from '../tenStemCatalog';
import { ENGINE_VERSION_V2 } from './constants';
import { buildV2FulfillmentSnapshotFromFields } from './buildV2FulfillmentSnapshot';
import { deriveDtrShelfStemDisplayFromSnapshot } from './deriveDisplayedDtrShelfStem';
import {
  findStoredV2DisplayStem1Chapter1OldToneLeak,
  resolveDisplayedDtrEnvelope,
  STORED_V2_DISPLAY_FORBIDDEN_STEM1_CHAPTER1_PHRASES,
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

function withDobV2Flag(value: string | undefined, fn: () => void): void {
  const prev = process.env.M55_DOB_PERSONALIZATION_V2_FULFILLMENT_ENABLED;
  if (value === undefined) delete process.env.M55_DOB_PERSONALIZATION_V2_FULFILLMENT_ENABLED;
  else process.env.M55_DOB_PERSONALIZATION_V2_FULFILLMENT_ENABLED = value;
  try {
    fn();
  } finally {
    if (prev === undefined) delete process.env.M55_DOB_PERSONALIZATION_V2_FULFILLMENT_ENABLED;
    else process.env.M55_DOB_PERSONALIZATION_V2_FULFILLMENT_ENABLED = prev;
  }
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

  it('stored v2 row → display-normalized from current catalog, raw artifact preserved', () => {
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
    const staleEnvelope = structuredClone(built.envelope_json);
    const staleMarker = 'STALE_PHASE0_MARKER_業務プロジェクト型';
    const s1 = staleEnvelope.payload.fullSections.find((s) => s.id === 's1_identity');
    assert.ok(s1);
    s1!.body = `${s1!.body}\n${staleMarker}`;

    const row = baseRow({
      envelope_json: staleEnvelope,
      engine_version: ENGINE_VERSION_V2,
      engine_context_json: built.engine_context_json,
      profile_snapshot: built.profile_snapshot,
    });

    const read = resolveDisplayedDtrEnvelope(row);
    assert.equal(read.ok, true);
    if (!read.ok) return;
    assert.equal(read.mode, 'stored_v2');
    assert.equal(read.rawMeta.storedMode, 'v2');
    assert.equal(read.rawMeta.displayNormalizeSource, 'current_dtr_engine_catalog');
    assert.ok(read.rawMeta.rawBodyFingerprint.startsWith('djb2:'));
    assert.equal(read.rawMeta.storedSectionCount, staleEnvelope.payload.fullSections.length);

    const displayedBodies = read.envelope.payload.fullSections.map((s) => s.body).join('\n');
    assert.equal(displayedBodies.includes(staleMarker), false);
    const rawBodies = row.envelope_json.payload.fullSections.map((s) => s.body).join('\n');
    assert.equal(rawBodies.includes(staleMarker), true);
    assert.notEqual(read.envelope, row.envelope_json);

    const expectedEnvelope = runDtrEngine(
      {
        birthDate: built.profile_snapshot.birthDate,
        nickname: built.profile_snapshot.nickname,
        locale: 'ja-JP',
        contextScope: 'dtr',
      },
      {
        stemLaneIndex: staleEnvelope.auditMeta.stemLaneIndex,
        engineVersion: ENGINE_VERSION_V2,
        derivation: staleEnvelope.auditMeta.derivation,
        contractVersion: 'v2',
        paidIndividualization: composePaidIndividualizationFromEngineContext(built.engine_context_json),
      },
    );

    assert.equal(read.envelope.auditMeta.stemLaneIndex, staleEnvelope.auditMeta.stemLaneIndex);
    assert.equal(
      TEN_STEM_DISPLAY[read.envelope.auditMeta.stemLaneIndex]!.publicTitle,
      TEN_STEM_DISPLAY[staleEnvelope.auditMeta.stemLaneIndex]!.publicTitle,
    );
    const displayedById = Object.fromEntries(
      read.envelope.payload.fullSections.map((s) => [s.id, s.body] as const),
    );
    const expectedById = Object.fromEntries(
      expectedEnvelope.payload.fullSections.map((s) => [s.id, s.body] as const),
    );
    for (const sectionId of ['s1_identity', 's2_composition', 's3_essence', 's4_strengths', 's5_friction', 's6_relation', 's7_work', 's8_bridge']) {
      assert.equal(displayedById[sectionId], expectedById[sectionId], sectionId);
    }
  });

  it('stored v2 row with jdn provisional derivation → fail-closed', () => {
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
    const staleEnvelope = structuredClone(built.envelope_json);
    staleEnvelope.auditMeta.derivation = 'jdn_offset_provisional_v1';

    const row = baseRow({
      envelope_json: staleEnvelope,
      engine_version: ENGINE_VERSION_V2,
      engine_context_json: built.engine_context_json,
      profile_snapshot: built.profile_snapshot,
    });

    const read = resolveDisplayedDtrEnvelope(row);
    assert.equal(read.ok, false);
    if (read.ok) return;
    assert.equal(read.reason, 'jdn_provisional_derivation_forbidden');
  });

  it('stored v2 stem1 row with old chapter-I body in raw → display excludes old tone, preserves rawMeta', () => {
    resetCalendarBundleCacheForTests();
    const built = buildV2FulfillmentSnapshotFromFields({
      nickname: 'mi',
      birthDate: '1992-12-19',
      birthTime: '12:00',
      birthTimeUnknown: false,
      country: 'JP',
      birthplace: '東京都',
      timezone: 'Asia/Tokyo',
    });
    const staleEnvelope = structuredClone(built.envelope_json);
    assert.equal(staleEnvelope.auditMeta.stemLaneIndex, 1);

    const oldChapter1Body = [
      '傾向が重なる様子',
      '構成は、柔らかい思考と、場所・関係を支える安定感の二層です',
      '話し合いが空転するときほど、誰が何を決めれば良いかを静かに差し出せます',
      'つなぎとして流量を調整する型です',
      'ハブ調整型',
      '関わり方の命名が安定のスイッチになります',
    ].join('\n\n');

    const s2 = staleEnvelope.payload.fullSections.find((s) => s.id === 's2_composition');
    assert.ok(s2);
    s2!.body = oldChapter1Body;

    const s5 = staleEnvelope.payload.fullSections.find((s) => s.id === 's5_friction');
    assert.ok(s5);
    s5!.body = `${s5!.body}\n依存関係の形成\n決断の遅さ\n後手に回る`;

    const row = baseRow({
      envelope_json: staleEnvelope,
      engine_version: ENGINE_VERSION_V2,
      engine_context_json: built.engine_context_json,
      profile_snapshot: built.profile_snapshot,
    });

    const read = resolveDisplayedDtrEnvelope(row);
    assert.equal(read.ok, true);
    if (!read.ok) return;
    assert.equal(read.mode, 'stored_v2');
    assert.equal(read.envelope.auditMeta.stemLaneIndex, 1);
    assert.equal(TEN_STEM_DISPLAY[read.envelope.auditMeta.stemLaneIndex]!.publicTitle, 'プランナー');

    const displayedS2 = read.envelope.payload.fullSections.find((s) => s.id === 's2_composition');
    assert.ok(displayedS2);
    for (const phrase of STORED_V2_DISPLAY_FORBIDDEN_STEM1_CHAPTER1_PHRASES) {
      assert.equal(
        displayedS2!.body.includes(phrase),
        false,
        `display s2 must not include old phrase: ${phrase}`,
      );
    }
    // P0: stem1 s2 no longer hardcodes nickname; display uses catalog lifestyle phrasing.
    assert.ok(
      displayedS2!.body.includes(
        'このプレミアムレポートで見えている形では、その場の空気を素早く読みながら、人との関係の土台も同時に確かめながら動きます。',
      ),
    );
    assert.doesNotMatch(displayedS2!.body, /miさん/);
    assert.ok(displayedS2!.body.includes('人との間にある流れを整えやすい形です'));

    const displayedS5 = read.envelope.payload.fullSections.find((s) => s.id === 's5_friction');
    assert.ok(displayedS5);
    assert.ok(displayedS5!.body.includes('頼られすぎてしまうこと'));
    assert.ok(displayedS5!.body.includes('動き出しが遅くなること'));
    assert.ok(displayedS5!.body.includes('急かされる場面では、自分のペースを失いやすくなります'));
    assert.equal(displayedS5!.body.includes('依存関係の形成'), false);
    assert.equal(displayedS5!.body.includes('決断の遅さ'), false);
    assert.equal(displayedS5!.body.includes('後手に回る'), false);

    const rawBodies = row.envelope_json.payload.fullSections.map((s) => s.body).join('\n');
    assert.equal(rawBodies.includes('傾向が重なる様子'), true);
    assert.equal(rawBodies.includes('依存関係の形成'), true);
    assert.notEqual(read.envelope, row.envelope_json);
    assert.ok(read.rawMeta.rawBodyFingerprint.startsWith('djb2:'));
    assert.equal(read.rawMeta.storedMode, 'v2');
    assert.equal(read.rawMeta.displayNormalizeSource, 'current_dtr_engine_catalog');
    assert.equal(read.rawMeta.storedStemLaneIndex, 1);

    for (const section of read.envelope.payload.fullSections) {
      assert.ok(section.id.length > 0);
    }
  });

  it('stored v2 display old-tone guard detects forbidden phrase in display text', () => {
    resetCalendarBundleCacheForTests();
    const built = buildV2FulfillmentSnapshotFromFields({
      nickname: 'mi',
      birthDate: '1992-12-19',
      birthTime: '12:00',
      birthTimeUnknown: false,
      country: 'JP',
      birthplace: '東京都',
      timezone: 'Asia/Tokyo',
    });
    const leakyEnvelope = structuredClone(built.envelope_json);
    const s2 = leakyEnvelope.payload.fullSections.find((s) => s.id === 's2_composition');
    assert.ok(s2);
    s2!.body = `${s2!.body}\nハブ調整型`;

    assert.equal(findStoredV2DisplayStem1Chapter1OldToneLeak(leakyEnvelope), 'ハブ調整型');

    const row = baseRow({
      envelope_json: structuredClone(built.envelope_json),
      engine_version: ENGINE_VERSION_V2,
      engine_context_json: built.engine_context_json,
      profile_snapshot: built.profile_snapshot,
    });

    const storedRead = resolveDisplayedDtrEnvelope(row);
    assert.equal(storedRead.ok, true);
    if (!storedRead.ok) return;
    assert.equal(findStoredV2DisplayStem1Chapter1OldToneLeak(storedRead.envelope), null);
  });

  it('display path does not import DOB personalization feature flag', () => {
    const src = readFileSync(join(process.cwd(), 'lib/m55/compositeStem/resolveDisplayedDtrEnvelope.ts'), 'utf8');
    assert.doesNotMatch(src, /isDobPersonalizationV2FulfillmentEnabled/);
    assert.doesNotMatch(src, /dobPersonalizationFeatureFlag/);
    assert.doesNotMatch(src, /DOB_PERSONALIZATION_V2_FULFILLMENT_ENABLED/);
  });

  it('env flag ON with stored missing version still renders v1', () => {
    withDobV2Flag('true', () => {
      resetCalendarBundleCacheForTests();
      const built = buildV2FulfillmentSnapshotFromFields({
        nickname: 'mi',
        birthDate: '1992-12-19',
        birthTime: '12:00',
        birthTimeUnknown: false,
        country: 'JP',
        birthplace: '東京都',
        timezone: 'Asia/Tokyo',
      }, { dobPersonalizationV2Enabled: false });

      const row = baseRow({
        envelope_json: built.envelope_json,
        engine_version: ENGINE_VERSION_V2,
        engine_context_json: built.engine_context_json,
        profile_snapshot: built.profile_snapshot,
      });
      const read = resolveDisplayedDtrEnvelope(row);
      assert.equal(read.ok, true);
      if (!read.ok) return;
      const s3 = read.envelope.payload.fullSections.find((s) => s.id === 's3_essence')!.body;
      assert.doesNotMatch(s3, /生年月日の細かなリズム/);
      assert.equal(read.envelope.auditMeta.paidIndividualization?.version, undefined);
    });
  });

  it('stored v2.1 context renders v2.1 using stored version only', () => {
    withDobV2Flag(undefined, () => {
      resetCalendarBundleCacheForTests();
      const built = buildV2FulfillmentSnapshotFromFields({
        nickname: 'mi',
        birthDate: '1992-12-19',
        birthTime: '12:00',
        birthTimeUnknown: false,
        country: 'JP',
        birthplace: '東京都',
        timezone: 'Asia/Tokyo',
      }, { dobPersonalizationV2Enabled: true });

      assert.equal(built.engine_context_json.paidIndividualizationVersion, 'v2');
      assert.equal(built.engine_context_json.dobPersonalizationCatalogVersion, DOB_PERSONALIZATION_V21_CATALOG_VERSION);
      const row = baseRow({
        envelope_json: built.envelope_json,
        engine_version: ENGINE_VERSION_V2,
        engine_context_json: built.engine_context_json,
        profile_snapshot: built.profile_snapshot,
      });
      const read = resolveDisplayedDtrEnvelope(row);
      assert.equal(read.ok, true);
      if (!read.ok) return;
      const s3 = read.envelope.payload.fullSections.find((s) => s.id === 's3_essence')!.body;
      assert.doesNotMatch(s3, /生年月日の細かなリズム/);
      assert.doesNotMatch(s3, /生まれとして/);
      assert.equal(read.envelope.auditMeta.paidIndividualization?.version, 'v2');
      assert.equal(read.envelope.auditMeta.paidIndividualization?.dobPersonalizationCatalogVersion, DOB_PERSONALIZATION_V21_CATALOG_VERSION);
      const s5 = read.envelope.payload.fullSections.find((s) => s.id === 's5_friction')!.body;
      const s6 = read.envelope.payload.fullSections.find((s) => s.id === 's6_relation')!.body;
      assert.ok(s5.length > 200, 's5 includes v2.1 prefix + seed');
      assert.ok(s6.length > 200, 's6 includes v2.1 prefix + seed');
    });
  });

  it('stored v2.1 display recompose — same lane different DOB differs in s5/s6', () => {
    withDobV2Flag(undefined, () => {
      resetCalendarBundleCacheForTests();
      const builtA = buildV2FulfillmentSnapshotFromFields({
        nickname: 'mi',
        birthDate: '1980-01-05',
        birthTime: '12:00',
        birthTimeUnknown: false,
        country: 'JP',
        birthplace: '東京都',
        timezone: 'Asia/Tokyo',
      }, { dobPersonalizationV2Enabled: true });
      resetCalendarBundleCacheForTests();
      const builtB = buildV2FulfillmentSnapshotFromFields({
        nickname: 'mi',
        birthDate: '1980-01-25',
        birthTime: '12:00',
        birthTimeUnknown: false,
        country: 'JP',
        birthplace: '東京都',
        timezone: 'Asia/Tokyo',
      }, { dobPersonalizationV2Enabled: true });
      assert.equal(
        builtA.engine_context_json.stemLaneIndex,
        builtB.engine_context_json.stemLaneIndex,
      );
      const readA = resolveDisplayedDtrEnvelope(baseRow({
        envelope_json: builtA.envelope_json,
        engine_version: ENGINE_VERSION_V2,
        engine_context_json: builtA.engine_context_json,
        profile_snapshot: { nickname: 'mi', birthDate: '1980-01-05' },
      }));
      const readB = resolveDisplayedDtrEnvelope(baseRow({
        envelope_json: builtB.envelope_json,
        engine_version: ENGINE_VERSION_V2,
        engine_context_json: builtB.engine_context_json,
        profile_snapshot: { nickname: 'mi', birthDate: '1980-01-25' },
      }));
      assert.equal(readA.ok, true);
      assert.equal(readB.ok, true);
      if (!readA.ok || !readB.ok) return;
      const s5a = readA.envelope.payload.fullSections.find((s) => s.id === 's5_friction')!.body;
      const s5b = readB.envelope.payload.fullSections.find((s) => s.id === 's5_friction')!.body;
      const s6a = readA.envelope.payload.fullSections.find((s) => s.id === 's6_relation')!.body;
      const s6b = readB.envelope.payload.fullSections.find((s) => s.id === 's6_relation')!.body;
      assert.notEqual(s5a, s5b);
      assert.notEqual(s6a, s6b);
    });
  });

  it('stored old v2 catalog (dob-v2-2026-06) still renders via old v2 builder', () => {
    withDobV2Flag(undefined, () => {
      resetCalendarBundleCacheForTests();
      const built = buildV2FulfillmentSnapshotFromFields({
        nickname: 'mi',
        birthDate: '1992-12-19',
        birthTime: '12:00',
        birthTimeUnknown: false,
        country: 'JP',
        birthplace: '東京都',
        timezone: 'Asia/Tokyo',
      }, { dobPersonalizationV2Enabled: true });

      const oldCtx = {
        ...built.engine_context_json,
        dobPersonalizationCatalogVersion: DOB_PERSONALIZATION_V2_CATALOG_VERSION,
      };
      const oldInd = composePaidIndividualizationFromEngineContext(oldCtx);
      const envelope = runDtrEngine({
        birthDate: '1992-12-19',
        nickname: 'mi',
        locale: 'ja-JP',
        contextScope: 'dtr',
      }, {
        stemLaneIndex: oldCtx.stemLaneIndex,
        engineVersion: ENGINE_VERSION_V2,
        derivation: 'm55_composite_stem_v2_p_lunar',
        contractVersion: 'v2',
        paidIndividualization: oldInd,
      });

      const row = baseRow({
        envelope_json: envelope,
        engine_version: ENGINE_VERSION_V2,
        engine_context_json: oldCtx,
        profile_snapshot: { nickname: 'mi', birthDate: '1992-12-19' },
      });
      const read = resolveDisplayedDtrEnvelope(row);
      assert.equal(read.ok, true);
      if (!read.ok) return;
      assert.equal(read.envelope.auditMeta.paidIndividualization?.dobPersonalizationCatalogVersion, DOB_PERSONALIZATION_V2_CATALOG_VERSION);
      assert.ok(read.envelope.auditMeta.paidIndividualization?.fingerprint.startsWith('dobv2-'));
      assert.equal(oldInd.s5FrictionRhythmNote, undefined);
      assert.equal(oldInd.s6RelationRhythmNote, undefined);
    });
  });
});

function bodyHash(body: string): string {
  return createHash('sha256').update(body).digest('hex').slice(0, 16);
}

async function buildHybridAiStoredRow(birthDate: string, nickname: string) {
  resetCalendarBundleCacheForTests();
  const built = buildV2FulfillmentSnapshotFromFields({
    nickname,
    birthDate,
    birthTime: '12:00',
    birthTimeUnknown: false,
    country: 'JP',
    birthplace: '東京都',
    timezone: 'Asia/Tokyo',
  });
  const ind = composePaidIndividualizationFromEngineContext(built.engine_context_json);
  const candidate = await runHybridAiSnapshotGeneration(
    built.engine_context_json,
    ind,
    createMockHybridAiProvider(),
  );
  assert.equal(candidate.ok, true);
  if (!candidate.ok) throw new Error('hybrid fixture failed');
  const hybridBuilt = buildV2FulfillmentSnapshotFromFields(
    {
      nickname,
      birthDate,
      birthTime: '12:00',
      birthTimeUnknown: false,
      country: 'JP',
      birthplace: '東京都',
      timezone: 'Asia/Tokyo',
    },
    { generatedChapterBodies: candidate.sections },
  );
  return baseRow({
    envelope_json: hybridBuilt.envelope_json,
    engine_version: ENGINE_VERSION_V2,
    engine_context_json: hybridBuilt.engine_context_json,
    profile_snapshot: hybridBuilt.profile_snapshot,
    generation_mode: 'hybrid_ai',
    quality_passed: true,
  });
}

describe('resolveDisplayedDtrEnvelope — hybrid_ai stored snapshots', () => {
  it('hybrid_ai row → stored_v2_hybrid_ai mode preserves AI s1–s4 bodies', async () => {
    const row = await buildHybridAiStoredRow('1983-02-28', 'GX');
    const storedS1 = row.envelope_json.payload.fullSections.find((s) => s.id === 's1_identity')!.body;
    const read = resolveDisplayedDtrEnvelope(row);
    assert.equal(read.ok, true);
    if (!read.ok) return;
    assert.equal(read.mode, 'stored_v2_hybrid_ai');
    assert.equal(read.rawMeta.displayNormalizeSource, 'stored_hybrid_ai_fulfillment_snapshot');
    const displayedS1 = read.envelope.payload.fullSections.find((s) => s.id === 's1_identity')!.body;
    assert.equal(displayedS1, storedS1);
    assert.notEqual(displayedS1.slice(0, 20), '動き始めるのは、表面の静');
  });

  it('hybrid_ai row without generation_mode still uses catalog normalization', async () => {
    const row = await buildHybridAiStoredRow('1983-02-28', 'GX');
    const storedS1 = row.envelope_json.payload.fullSections.find((s) => s.id === 's1_identity')!.body;
    const legacyRow = { ...row, generation_mode: null };
    const read = resolveDisplayedDtrEnvelope(legacyRow);
    assert.equal(read.ok, true);
    if (!read.ok) return;
    assert.equal(read.mode, 'stored_v2');
    const displayedS1 = read.envelope.payload.fullSections.find((s) => s.id === 's1_identity')!.body;
    assert.notEqual(displayedS1, storedS1);
  });

  it('1983-02-01 vs 1983-02-28 hybrid_ai displayed s1 hashes differ', async () => {
    const rowA = await buildHybridAiStoredRow('1983-02-01', 'A');
    const rowB = await buildHybridAiStoredRow('1983-02-28', 'B');
    const readA = resolveDisplayedDtrEnvelope(rowA);
    const readB = resolveDisplayedDtrEnvelope(rowB);
    assert.equal(readA.ok, true);
    assert.equal(readB.ok, true);
    if (!readA.ok || !readB.ok) return;
    const s1A = readA.envelope.payload.fullSections.find((s) => s.id === 's1_identity')!.body;
    const s1B = readB.envelope.payload.fullSections.find((s) => s.id === 's1_identity')!.body;
    assert.notEqual(bodyHash(s1A), bodyHash(s1B));
    assert.notEqual(s1A.slice(0, 40), s1B.slice(0, 40));
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
