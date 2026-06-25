import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { resetCalendarBundleCacheForTests } from './calendar/loadCalendarBundle';
import { buildV2FulfillmentSnapshotFromFields, type V2FulfillmentSnapshotBuild } from './compositeStem/buildV2FulfillmentSnapshot';
import { ENGINE_VERSION_V2 } from './compositeStem/constants';
import { birthProfileToFulfillmentFields } from './compositeStem/fulfillmentProfileFields';
import {
  toCompositeCanonicalInput,
  type FulfillmentProfileFields,
} from './compositeStem/parseFulfillmentMetadata';
import { runM55CompositeStemPipeline } from './compositeStem/pipeline';
import { buildCoreResult } from './coreResult/buildCoreResult';
import { resolveCoreStemAuthority } from './coreResult/resolveCoreStemAuthority';
import { TYPE_CATALOG, typeIndexFromStemLane } from './coreResult/typeCatalog';
import type { CoreResult } from './coreResult/types';
import { runDtrEngine } from './dtrEngine';
import { essenceStemLaneIndex } from './essenceEngine';
import {
  BIRTHDAY_SSOT_AUDIT_FREEZE_GENERATED_AT,
  BIRTHDAY_SSOT_CROSS_SURFACE_AUDIT_FREEZE,
  type BirthdaySsotFrozenCase,
} from './birthdaySsotCrossSurfaceParityFreeze';
import {
  resolveCorePublicStemDisplay,
  resolvePublicStemDisplay,
  STEM_LANE_TEN_VIEWS_IMAGE,
  observationTraitNameFromCoreLabel,
} from './publicStemDisplay';
import { enrichBirthProfileForSave } from '../soul/birthProfileV2';
import type { BirthProfile } from '../soul/profile';

const PAID_CATALOG_SECTION_IDS = ['s1_identity', 's2_composition'] as const;
const PAID_INDIVIDUALIZED_SECTION_ID = 's3_essence' as const;

function djb2Fingerprint(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return `djb2:${h.toString(16).padStart(8, '0')}`;
}

function paidSectionBody(
  snap: V2FulfillmentSnapshotBuild,
  sectionId: (typeof PAID_CATALOG_SECTION_IDS)[number] | typeof PAID_INDIVIDUALIZED_SECTION_ID,
): string {
  const section = snap.envelope_json.payload.fullSections.find((s) => s.id === sectionId);
  assert.ok(section, `${sectionId}: paid section exists`);
  return section!.body;
}

function assertFreeContentMapping(core: CoreResult, frozen: BirthdaySsotFrozenCase) {
  const typeSeed = TYPE_CATALOG[typeIndexFromStemLane(frozen.stemLaneIndex)]!;

  assert.equal(core.coreLabel, frozen.expectedCoreLabel, `${frozen.case_id}: frozen coreLabel`);
  assert.equal(core.coreType, frozen.expectedCoreType, `${frozen.case_id}: frozen coreType`);
  assert.equal(core.coreSummary, frozen.expectedCoreSummary, `${frozen.case_id}: frozen coreSummary`);
  assert.equal(core.workStyle.summary, frozen.expectedWorkStyleSummary, `${frozen.case_id}: workStyle summary`);

  assert.equal(core.coreLabel, typeSeed.coreLabel, `${frozen.case_id}: TYPE_CATALOG coreLabel`);
  assert.equal(core.coreSummary, typeSeed.coreSummary, `${frozen.case_id}: TYPE_CATALOG coreSummary`);
  assert.equal(core.coreType, typeSeed.coreType, `${frozen.case_id}: TYPE_CATALOG coreType`);
  assert.equal(
    observationTraitNameFromCoreLabel(core.coreLabel),
    observationTraitNameFromCoreLabel(typeSeed.coreLabel),
    `${frozen.case_id}: observation trait label`,
  );

  const wrongLane = (frozen.stemLaneIndex + 5) % 10;
  const wrongSeed = TYPE_CATALOG[typeIndexFromStemLane(wrongLane)]!;
  if (wrongSeed.coreSummary !== typeSeed.coreSummary) {
    assert.notEqual(core.coreSummary, wrongSeed.coreSummary, `${frozen.case_id}: cross-stem summary guard`);
  }
}

function assertPaidContentMapping(
  snap: V2FulfillmentSnapshotBuild,
  fields: FulfillmentProfileFields,
  frozen: BirthdaySsotFrozenCase,
) {
  assert.equal(frozen.contentSource, 'TYPE_CATALOG+STEM_BODIES', `${frozen.case_id}: content source`);

  const refEnvelope = runDtrEngine(
    {
      birthDate: fields.birthDate,
      nickname: fields.nickname,
      locale: 'ja-JP',
      contextScope: 'dtr',
    },
    {
      stemLaneIndex: frozen.stemLaneIndex,
      engineVersion: ENGINE_VERSION_V2,
      derivation: 'm55_composite_stem_v2_p_lunar',
      contractVersion: 'v2',
    },
  );

  const frozenFingerprints: Record<(typeof PAID_CATALOG_SECTION_IDS)[number], string> = {
    s1_identity: frozen.expectedPaidIdentityFingerprint,
    s2_composition: frozen.expectedPaidCompositionFingerprint,
  };

  for (const sectionId of PAID_CATALOG_SECTION_IDS) {
    const actualBody = paidSectionBody(snap, sectionId);
    const expectedBody = refEnvelope.payload.fullSections.find((s) => s.id === sectionId)!.body;
    assert.equal(actualBody, expectedBody, `${frozen.case_id}: paid ${sectionId} body matches STEM_BODIES catalog`);
    assert.equal(
      djb2Fingerprint(actualBody),
      frozenFingerprints[sectionId],
      `${frozen.case_id}: paid ${sectionId} fingerprint`,
    );
  }

  const s3Actual = paidSectionBody(snap, PAID_INDIVIDUALIZED_SECTION_ID);
  const s3Catalog = refEnvelope.payload.fullSections.find((s) => s.id === PAID_INDIVIDUALIZED_SECTION_ID)!.body;
  assert.ok(s3Actual.endsWith(s3Catalog), `${frozen.case_id}: paid s3 catalog suffix preserved`);
  assert.match(s3Actual, /【この保存版だけの本質リズム】/, `${frozen.case_id}: paid s3 individualization prefix`);
  assert.equal(
    djb2Fingerprint(s3Actual),
    frozen.expectedPaidEssenceFingerprint,
    `${frozen.case_id}: paid s3_essence fingerprint`,
  );

  const wrongLane = (frozen.stemLaneIndex + 5) % 10;
  const wrongEnvelope = runDtrEngine(
    {
      birthDate: fields.birthDate,
      nickname: fields.nickname,
      locale: 'ja-JP',
      contextScope: 'dtr',
    },
    {
      stemLaneIndex: wrongLane,
      engineVersion: ENGINE_VERSION_V2,
      derivation: 'm55_composite_stem_v2_p_lunar',
      contractVersion: 'v2',
    },
  );
  const actualIdentityBody = paidSectionBody(snap, 's1_identity');
  const wrongIdentityBody = wrongEnvelope.payload.fullSections.find((s) => s.id === 's1_identity')!.body;
  if (wrongIdentityBody !== actualIdentityBody) {
    assert.notEqual(
      actualIdentityBody,
      wrongIdentityBody,
      `${frozen.case_id}: paid identity body must not match wrong stem catalog`,
    );
  }
}

function canonicalProfileFromFrozen(
  nickname: string,
  frozen: BirthdaySsotFrozenCase,
): BirthProfile {
  return enrichBirthProfileForSave({
    nickname,
    birthDate: frozen.birthDate,
    birthTime: frozen.birthTimeUnknown ? undefined : (frozen.birthTime ?? undefined),
    birthTimeUnknown: frozen.birthTimeUnknown,
    country: frozen.country,
    timezone: frozen.timezone,
  });
}

function assertProfileInputMatchesFreeze(profile: BirthProfile, frozen: BirthdaySsotFrozenCase) {
  assert.equal(profile.birthTimeUnknown, frozen.birthTimeUnknown, `${frozen.case_id}: birthTimeUnknown`);
  assert.equal(profile.country, frozen.country, `${frozen.case_id}: country`);
  assert.equal(profile.timezone, frozen.timezone, `${frozen.case_id}: timezone`);
  if (frozen.birthTimeUnknown) {
    assert.ok(!profile.birthTime?.trim(), `${frozen.case_id}: birthTime absent when unknown`);
  } else {
    assert.equal(profile.birthTime, frozen.birthTime, `${frozen.case_id}: birthTime`);
  }
}

function assertCrossSurfaceParity(profile: BirthProfile, frozen: BirthdaySsotFrozenCase) {
  assertProfileInputMatchesFreeze(profile, frozen);

  const fields = birthProfileToFulfillmentFields(profile);
  assert.ok(fields, `${frozen.case_id}: fulfillment fields`);
  assert.equal(fields!.birthTimeUnknown, frozen.birthTimeUnknown, `${frozen.case_id}: fields birthTimeUnknown`);
  if (!frozen.birthTimeUnknown) {
    assert.equal(fields!.birthTime, frozen.birthTime, `${frozen.case_id}: fields birthTime`);
  }

  const pipeline = runM55CompositeStemPipeline(toCompositeCanonicalInput(fields!));
  const authority = resolveCoreStemAuthority(profile);
  assert.ok(authority, `${frozen.case_id}: core stem authority`);

  const core = buildCoreResult(profile);
  const snap = buildV2FulfillmentSnapshotFromFields(fields!);
  const display = resolveCorePublicStemDisplay(core);
  const stemDisplay = resolvePublicStemDisplay(pipeline.stemLaneIndex);

  assert.equal(pipeline.calculationMode, frozen.calculationMode, `${frozen.case_id}: pipeline calculationMode`);
  assert.equal(
    snap.engine_context_json.calculationMode,
    frozen.calculationMode,
    `${frozen.case_id}: paid ctx calculationMode`,
  );
  assert.equal(
    snap.profile_snapshot.calculationMode,
    frozen.calculationMode,
    `${frozen.case_id}: paid snapshot calculationMode`,
  );

  assert.equal(pipeline.stemLaneIndex, frozen.stemLaneIndex, `${frozen.case_id}: pipeline lane`);
  assert.equal(pipeline.stemChar, frozen.stemChar, `${frozen.case_id}: pipeline stemChar`);
  assert.equal(pipeline.paid.publicTitle, frozen.publicTitle, `${frozen.case_id}: pipeline title`);

  assert.equal(authority.stemLaneIndex, frozen.stemLaneIndex, `${frozen.case_id}: authority lane`);
  assert.equal(authority.publicTitle, frozen.publicTitle, `${frozen.case_id}: authority title`);

  assert.equal(core.stemLaneIndex, frozen.stemLaneIndex, `${frozen.case_id}: core lane`);
  assert.equal(snap.envelope_json.auditMeta.stemLaneIndex, frozen.stemLaneIndex, `${frozen.case_id}: paid v2 lane`);
  assert.equal(snap.engine_context_json.stemLaneIndex, frozen.stemLaneIndex, `${frozen.case_id}: paid ctx lane`);

  assert.equal(display.publicTitle, frozen.publicTitle, `${frozen.case_id}: core publicTitle`);
  assert.equal(display.imagePath, frozen.imagePath, `${frozen.case_id}: core image`);
  assert.equal(stemDisplay!.imagePath, STEM_LANE_TEN_VIEWS_IMAGE[pipeline.stemLaneIndex], `${frozen.case_id}: hero SSOT`);
  assert.equal(display.displayOneLine, stemDisplay!.displayOneLine, `${frozen.case_id}: displayOneLine SSOT`);

  assertFreeContentMapping(core, frozen);
  assertPaidContentMapping(snap, fields!, frozen);
}

describe('birthday SSOT cross-surface parity — audit freeze', () => {
  it('freeze artifact metadata is present', () => {
    assert.equal(BIRTHDAY_SSOT_AUDIT_FREEZE_GENERATED_AT, '2026-06-22');
    assert.ok(BIRTHDAY_SSOT_CROSS_SURFACE_AUDIT_FREEZE.length >= 20);
    assert.ok(
      BIRTHDAY_SSOT_CROSS_SURFACE_AUDIT_FREEZE.every(
        (c) => c.certification_status && c.contentSource === 'TYPE_CATALOG+STEM_BODIES',
      ),
    );
    assert.ok(
      BIRTHDAY_SSOT_CROSS_SURFACE_AUDIT_FREEZE.some((c) => c.certification_status === 'CERTIFIED'),
    );
    assert.ok(
      BIRTHDAY_SSOT_CROSS_SURFACE_AUDIT_FREEZE.some((c) => c.certification_status === 'REVIEW_REQUIRED'),
    );
  });

  for (const frozen of BIRTHDAY_SSOT_CROSS_SURFACE_AUDIT_FREEZE) {
    it(`${frozen.case_id} — pipeline / free / paid v2 / label / hero parity`, () => {
      resetCalendarBundleCacheForTests();
      const profile = canonicalProfileFromFrozen('ssot-audit', frozen);
      assertCrossSurfaceParity(profile, frozen);
    });
  }
});

describe('birthday SSOT — nickname independence', () => {
  for (const birthDate of ['1992-12-19', '1983-02-28', '2000-01-01']) {
    it(`same birthday different nickname => identical stemLaneIndex (${birthDate})`, () => {
      resetCalendarBundleCacheForTests();
      const frozen = BIRTHDAY_SSOT_CROSS_SURFACE_AUDIT_FREEZE.find((c) => c.birthDate === birthDate)!;
      const a = canonicalProfileFromFrozen('alice', frozen);
      const b = canonicalProfileFromFrozen('bob', frozen);
      const coreA = buildCoreResult(a);
      const coreB = buildCoreResult(b);
      const snapA = buildV2FulfillmentSnapshotFromFields(birthProfileToFulfillmentFields(a)!);
      const snapB = buildV2FulfillmentSnapshotFromFields(birthProfileToFulfillmentFields(b)!);

      assert.equal(coreA.stemLaneIndex, coreB.stemLaneIndex);
      assert.equal(
        resolveCorePublicStemDisplay(coreA).publicTitle,
        resolveCorePublicStemDisplay(coreB).publicTitle,
      );
      assert.equal(
        snapA.envelope_json.auditMeta.stemLaneIndex,
        snapB.envelope_json.auditMeta.stemLaneIndex,
      );
    });
  }
});

describe('birthday SSOT — /my profile shape derivation', () => {
  it('birthProfileToFulfillmentFields matches buildCoreResult stem for frozen anchor', () => {
    resetCalendarBundleCacheForTests();
    const frozen = BIRTHDAY_SSOT_CROSS_SURFACE_AUDIT_FREEZE.find((c) => c.case_id === 'DM-GX-01')!;
    const profile = canonicalProfileFromFrozen('my-user', frozen);
    const fields = birthProfileToFulfillmentFields(profile)!;
    const pipeline = runM55CompositeStemPipeline(toCompositeCanonicalInput(fields));
    const core = buildCoreResult(profile);
    assert.equal(pipeline.stemLaneIndex, frozen.stemLaneIndex);
    assert.equal(core.stemLaneIndex, frozen.stemLaneIndex);
    assert.equal(pipeline.calculationMode, frozen.calculationMode);
  });
});

describe('birthday SSOT — legacy JDN NOT equal guards (v2 test scope)', () => {
  const legacyDiffers: { birthDate: string; v2Lane: number; legacyLane: number }[] = [
    { birthDate: '1983-02-28', v2Lane: 9, legacyLane: 3 },
    { birthDate: '1992-12-19', v2Lane: 1, legacyLane: 5 },
  ];

  for (const { birthDate, v2Lane, legacyLane } of legacyDiffers) {
    it(`${birthDate}: v2 lane ${v2Lane} !== legacy JDN lane ${legacyLane}`, () => {
      resetCalendarBundleCacheForTests();
      assert.equal(essenceStemLaneIndex(birthDate), legacyLane);
      const frozen = BIRTHDAY_SSOT_CROSS_SURFACE_AUDIT_FREEZE.find((c) => c.birthDate === birthDate)!;
      const core = buildCoreResult(canonicalProfileFromFrozen('t', frozen));
      assert.equal(core.stemLaneIndex, v2Lane);
      assert.notEqual(core.stemLaneIndex, essenceStemLaneIndex(birthDate));
    });
  }
});

describe('birthday SSOT — static production-path guards', () => {
  it('mockCorePageData is not imported by CoreEssencePanel', () => {
    const src = readFileSync(join(process.cwd(), 'components/core/CoreEssencePanel.tsx'), 'utf8');
    assert.doesNotMatch(src, /mockCorePageData/);
  });

  it('legacy deriveDtrShelfStemDisplay is not used by owned shelf access path', () => {
    const src = readFileSync(join(process.cwd(), 'lib/m55/dtrShelfAccess.ts'), 'utf8');
    assert.doesNotMatch(src, /deriveDtrShelfStemDisplay[^F]/);
    assert.match(src, /deriveDtrShelfStemDisplayFromSnapshot/);
  });
});
