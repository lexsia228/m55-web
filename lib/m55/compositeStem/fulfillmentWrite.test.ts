import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { resetCalendarBundleCacheForTests } from '../calendar/loadCalendarBundle';
import { buildCoreResult } from '../coreResult/buildCoreResult';
import { enrichBirthProfileForSave } from '../../soul/birthProfileV2';
import { GOLDEN_1983_02_28_V2 } from './pipeline.golden.test';
import { runM55CompositeStemPipeline } from './pipeline';
import { buildV2FulfillmentSnapshotFromFields } from './buildV2FulfillmentSnapshot';
import { isCompositeV2FulfillmentWriteEnabled } from './featureFlag';
import {
  isV2FulfillmentProfileComplete,
} from './parseFulfillmentMetadata';
import { M55CompositeStemError } from './types';
import { ENGINE_VERSION_V2 } from './constants';
import { essenceStemLaneIndex } from '../essenceEngine';
import { TEN_STEM_DISPLAY } from '../tenStemCatalog';
import { DOB_PERSONALIZATION_V2_CATALOG_VERSION } from '../dtrDobPersonalizationV2';

const GOLDEN_FULFILLMENT_FIELDS = {
  nickname: 'golden',
  birthDate: '1983-02-28',
  birthTime: '12:00:00',
  birthTimeUnknown: false,
  country: 'JP',
  birthplace: '東京都',
  timezone: 'Asia/Tokyo',
};

const FIELDS_1992_12_19 = {
  nickname: 'mi',
  birthDate: '1992-12-19',
  birthTime: null as string | null,
  birthTimeUnknown: true,
  country: 'JP',
  birthplace: null as string | null,
  timezone: 'Asia/Tokyo',
};

function withEnvFlag(value: string | undefined, fn: () => void): void {
  const prev = process.env.M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED;
  if (value === undefined) delete process.env.M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED;
  else process.env.M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED = value;
  try {
    fn();
  } finally {
    if (prev === undefined) delete process.env.M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED;
    else process.env.M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED = prev;
  }
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

test('GOLDEN_1983_02_28_V2 pipeline — GX-01 still pass', () => {
  resetCalendarBundleCacheForTests();
  const result = runM55CompositeStemPipeline(GOLDEN_1983_02_28_V2);
  assert.equal(result.stemLaneIndex, 9);
  assert.equal(result.stemChar, '癸');
  assert.equal(result.paid.publicTitle, 'アナリスト');
});

test('v2 context builder — 1983 golden fulfillment snapshot', () => {
  resetCalendarBundleCacheForTests();
  const built = buildV2FulfillmentSnapshotFromFields(GOLDEN_FULFILLMENT_FIELDS);

  assert.equal(built.engine_version, ENGINE_VERSION_V2);
  assert.equal(built.profile_snapshot.engineVersion, ENGINE_VERSION_V2);
  assert.equal(built.profile_snapshot.calculationMode, 'full');
  assert.equal(built.envelope_json.engineVersion, ENGINE_VERSION_V2);
  assert.equal(built.envelope_json.contractVersion, 'v2');
  assert.equal(built.envelope_json.auditMeta.stemLaneIndex, 9);
  assert.equal(built.envelope_json.auditMeta.stemChar, '癸');
  assert.equal(built.envelope_json.auditMeta.derivation, 'm55_composite_stem_v2_p_lunar');
  assert.equal(built.engine_context_json.stemLaneIndex, 9);
  assert.equal(built.engine_context_json.stemChar, '癸');
  assert.ok(built.engine_context_json.boundaryMetadata.lunarDayKey);
  assert.ok(built.engine_context_json.boundaryMetadata.solarTermKey);
  assert.equal(built.engine_context_json.boundaryMetadata.lunarYearKey, 1983);
});

test('v2 fulfillment — 1992-12-19 lane 1 / プランナー regardless of env flag', () => {
  resetCalendarBundleCacheForTests();
  for (const flag of [undefined, 'false', 'true'] as const) {
    withEnvFlag(flag, () => {
      const built = buildV2FulfillmentSnapshotFromFields(FIELDS_1992_12_19);
      assert.equal(built.engine_version, ENGINE_VERSION_V2, `flag=${String(flag)}`);
      assert.equal(built.envelope_json.auditMeta.stemLaneIndex, 1, `flag=${String(flag)}`);
      assert.equal(built.envelope_json.auditMeta.derivation, 'm55_composite_stem_v2_p_lunar', `flag=${String(flag)}`);
      assert.equal(TEN_STEM_DISPLAY[built.envelope_json.auditMeta.stemLaneIndex]!.publicTitle, 'プランナー', `flag=${String(flag)}`);
      assert.equal(built.engine_context_json.stemLaneIndex, 1, `flag=${String(flag)}`);
      assert.notEqual(built.envelope_json.auditMeta.stemLaneIndex, essenceStemLaneIndex('1992-12-19'), `flag=${String(flag)}`);
    });
  }
});

test('paid fulfillment parity — 1983-02-28 and 1992-12-19 match free v2 lane', () => {
  resetCalendarBundleCacheForTests();
  for (const fields of [GOLDEN_FULFILLMENT_FIELDS, FIELDS_1992_12_19]) {
    const profile = enrichBirthProfileForSave({
      nickname: fields.nickname,
      birthDate: fields.birthDate,
      birthTime: fields.birthTime,
      birthTimeUnknown: fields.birthTimeUnknown,
      country: fields.country,
      birthplace: fields.birthplace,
      timezone: fields.timezone,
    });
    const core = buildCoreResult(profile);
    const built = buildV2FulfillmentSnapshotFromFields(fields);
    assert.equal(
      built.envelope_json.auditMeta.stemLaneIndex,
      core.stemLaneIndex,
      fields.birthDate,
    );
    assert.equal(
      TEN_STEM_DISPLAY[built.envelope_json.auditMeta.stemLaneIndex]!.publicTitle,
      TEN_STEM_DISPLAY[core.stemLaneIndex]!.publicTitle,
      fields.birthDate,
    );
  }
});

test('DOB personalization flag OFF — fulfillment stores v1-compatible envelope', () => {
  withDobV2Flag(undefined, () => {
    resetCalendarBundleCacheForTests();
    const built = buildV2FulfillmentSnapshotFromFields(FIELDS_1992_12_19);
    const s3 = built.envelope_json.payload.fullSections.find((s) => s.id === 's3_essence')!.body;
    const s7 = built.envelope_json.payload.fullSections.find((s) => s.id === 's7_work')!.body;

    assert.equal(built.engine_context_json.paidIndividualizationVersion, undefined);
    assert.equal(built.engine_context_json.dobPersonalizationCatalogVersion, undefined);
    assert.equal(built.envelope_json.auditMeta.paidIndividualization?.version, undefined);
    assert.doesNotMatch(s3, /生年月日の細かなリズム/);
    assert.doesNotMatch(s7, /生年月日の細かなリズム/);
    assert.equal(
      built.envelope_json.auditMeta.paidIndividualization?.fingerprint,
      built.engine_context_json.displayFingerprint,
    );
  });
});

test('DOB personalization flag ON — fulfillment stores v2-consistent envelope', () => {
  withDobV2Flag('true', () => {
    resetCalendarBundleCacheForTests();
    const built = buildV2FulfillmentSnapshotFromFields(FIELDS_1992_12_19);
    const s3 = built.envelope_json.payload.fullSections.find((s) => s.id === 's3_essence')!.body;
    const s7 = built.envelope_json.payload.fullSections.find((s) => s.id === 's7_work')!.body;
    const audit = built.envelope_json.auditMeta.paidIndividualization;

    assert.equal(built.engine_context_json.paidIndividualizationVersion, 'v2');
    assert.equal(
      built.engine_context_json.dobPersonalizationCatalogVersion,
      DOB_PERSONALIZATION_V2_CATALOG_VERSION,
    );
    assert.equal(audit?.version, 'v2');
    assert.equal(audit?.dobPersonalizationCatalogVersion, DOB_PERSONALIZATION_V2_CATALOG_VERSION);
    assert.ok(audit?.fingerprint.startsWith('dobv2-'));
    assert.match(s3, /生年月日の細かなリズム/);
    assert.match(s7, /生年月日の細かなリズム/);
    assert.notEqual(audit?.fingerprint, built.engine_context_json.displayFingerprint);
  });
});

test('legacy JDN lane differs from v2 — audit guard only (not new paid expected)', () => {
  assert.equal(essenceStemLaneIndex('1983-02-28'), 3);
  assert.equal(essenceStemLaneIndex('1992-12-19'), 5);
  assert.equal(isCompositeV2FulfillmentWriteEnabled(), false);
});

test('fail-closed — incomplete v2 profile', () => {
  assert.equal(
    isV2FulfillmentProfileComplete({
      ...GOLDEN_FULFILLMENT_FIELDS,
      birthTime: null,
      birthTimeUnknown: false,
    }),
    false,
  );
  assert.throws(
    () =>
      buildV2FulfillmentSnapshotFromFields({
        ...GOLDEN_FULFILLMENT_FIELDS,
        birthTime: null,
        birthTimeUnknown: false,
      }),
    (e: unknown) => e instanceof M55CompositeStemError && e.code === 'M55_COMPOSITE_INCOMPLETE_PROFILE',
  );
});

test('fail-closed — no JDN fallback in v2 builder', () => {
  resetCalendarBundleCacheForTests();
  const built = buildV2FulfillmentSnapshotFromFields(GOLDEN_FULFILLMENT_FIELDS);
  assert.notEqual(built.engine_context_json.stemLaneIndex, essenceStemLaneIndex('1983-02-28'));
});

test('dtrDraftDb — v2-only fulfillment write (no legacy branch)', () => {
  const src = readFileSync(new URL('../dtrDraftDb.ts', import.meta.url), 'utf8');
  const upsert = src.slice(src.indexOf('upsertDtrReportSnapshotAtFulfillment'));
  assert.ok(upsert.includes('buildV2FulfillmentSnapshot'));
  assert.doesNotMatch(upsert, /isCompositeV2FulfillmentWriteEnabled/);
  assert.doesNotMatch(upsert, /runDtrEngine\s*\(/);
  assert.doesNotMatch(upsert, /essenceStemLaneIndex/);
  assert.doesNotMatch(upsert, /jdn_offset_provisional_v1/);
  assert.doesNotMatch(upsert, /dtr-v1-jdn-day-stem-provisional/);
  assert.ok(upsert.includes('engine_context_json'));
  assert.ok(upsert.includes('engine_version'));
});

test('dtrDraftDb — insert-only, no UPDATE/DELETE/backfill in source', () => {
  const src = readFileSync(new URL('../dtrDraftDb.ts', import.meta.url), 'utf8');
  assert.equal(/\.\s*update\s*\(/i.test(src), false);
  assert.equal(/\bDELETE\b/i.test(src), false);
  assert.equal(/backfill/i.test(src), false);
  assert.ok(src.includes('.insert('));
  assert.ok(src.includes('existingVisible'));
});
