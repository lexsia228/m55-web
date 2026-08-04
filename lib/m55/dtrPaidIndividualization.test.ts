import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { resetCalendarBundleCacheForTests } from './calendar/loadCalendarBundle';
import { buildV2FulfillmentSnapshotFromFields } from './compositeStem/buildV2FulfillmentSnapshot';
import { buildCoreResult } from './coreResult/buildCoreResult';
import { runDtrEngine } from './dtrEngine';
import {
  buildPaidDtrIndividualizationFromComposite,
  buildPaidDtrIndividualizationFromEngineContext,
  buildPaidDtrIndividualizationV1FromEngineContext,
  buildPaidDtrS3IndividualizationPrefix,
  buildPaidDtrS7IndividualizationPrefix,
  findForbiddenPaidIndividualizationLeak,
} from './dtrPaidIndividualization';
import { enrichBirthProfileForSave } from '../soul/birthProfileV2';
import { runM55CompositeStemPipeline } from './compositeStem/pipeline';
import { toCompositeCanonicalInput } from './compositeStem/parseFulfillmentMetadata';
import { ENGINE_VERSION_V2 } from './compositeStem/constants';
import { TEN_STEM_DISPLAY } from './tenStemCatalog';

const FIELDS_BASE = {
  birthTime: '12:00:00' as string | null,
  birthTimeUnknown: false,
  country: 'JP',
  birthplace: null as string | null,
  timezone: 'Asia/Tokyo',
};

function fulfillmentFields(birthDate: string, nickname = 't') {
  return { nickname, birthDate, ...FIELDS_BASE };
}

function s3BodyFromFields(birthDate: string, nickname = 't'): string {
  resetCalendarBundleCacheForTests();
  const built = buildV2FulfillmentSnapshotFromFields(fulfillmentFields(birthDate, nickname));
  const section = built.envelope_json.payload.fullSections.find((s) => s.id === 's3_essence');
  assert.ok(section);
  return section!.body;
}

function s7BodyFromFields(birthDate: string, nickname = 't'): string {
  resetCalendarBundleCacheForTests();
  const built = buildV2FulfillmentSnapshotFromFields(fulfillmentFields(birthDate, nickname));
  const section = built.envelope_json.payload.fullSections.find((s) => s.id === 's7_work');
  assert.ok(section);
  return section!.body;
}

function djb2Fingerprint(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return `djb2:${h.toString(16).padStart(8, '0')}`;
}

describe('paid DTR individualization — deterministic DOB layer', () => {
  it('same DOB produces stable s3/s7 body and essenceRhythmNote', () => {
    resetCalendarBundleCacheForTests();
    const a = buildV2FulfillmentSnapshotFromFields(fulfillmentFields('1980-01-07'));
    resetCalendarBundleCacheForTests();
    const b = buildV2FulfillmentSnapshotFromFields(fulfillmentFields('1980-01-07'));

    const s3a = a.envelope_json.payload.fullSections.find((s) => s.id === 's3_essence')!.body;
    const s3b = b.envelope_json.payload.fullSections.find((s) => s.id === 's3_essence')!.body;
    assert.equal(s3a, s3b);
    assert.equal(djb2Fingerprint(s3a), djb2Fingerprint(s3b));
    assert.equal(
      a.envelope_json.auditMeta.paidIndividualization?.essenceRhythmNote,
      b.envelope_json.auditMeta.paidIndividualization?.essenceRhythmNote,
    );
    assert.ok(a.envelope_json.auditMeta.paidIndividualization?.essenceRhythmNote?.trim());
  });

  it('same DOB produces stable s7 fingerprint and audit meta', () => {
    resetCalendarBundleCacheForTests();
    const a = buildV2FulfillmentSnapshotFromFields(fulfillmentFields('1980-01-07'));
    resetCalendarBundleCacheForTests();
    const b = buildV2FulfillmentSnapshotFromFields(fulfillmentFields('1980-01-07'));

    const s7a = a.envelope_json.payload.fullSections.find((s) => s.id === 's7_work')!.body;
    const s7b = b.envelope_json.payload.fullSections.find((s) => s.id === 's7_work')!.body;
    assert.equal(s7a, s7b);
    assert.equal(djb2Fingerprint(s7a), djb2Fingerprint(s7b));
    assert.equal(
      a.envelope_json.auditMeta.paidIndividualization?.fingerprint,
      b.envelope_json.auditMeta.paidIndividualization?.fingerprint,
    );
    assert.equal(
      a.envelope_json.auditMeta.paidIndividualization?.fingerprint,
      a.engine_context_json.displayFingerprint,
    );
  });

  it('same main trait + different lunarMonthKey can differ in paid s3 body', () => {
    resetCalendarBundleCacheForTests();
    const left = buildV2FulfillmentSnapshotFromFields(fulfillmentFields('1980-01-07'));
    resetCalendarBundleCacheForTests();
    const right = buildV2FulfillmentSnapshotFromFields(fulfillmentFields('1980-03-07'));

    assert.equal(left.envelope_json.auditMeta.stemLaneIndex, 1);
    assert.equal(right.envelope_json.auditMeta.stemLaneIndex, 1);
    assert.notEqual(
      left.engine_context_json.boundaryMetadata.lunarMonthKey,
      right.engine_context_json.boundaryMetadata.lunarMonthKey,
    );

    const s3Left = left.envelope_json.payload.fullSections.find((s) => s.id === 's3_essence')!.body;
    const s3Right = right.envelope_json.payload.fullSections.find((s) => s.id === 's3_essence')!.body;
    assert.notEqual(s3Left, s3Right);
    assert.notEqual(
      left.envelope_json.auditMeta.paidIndividualization?.essenceRhythmNote,
      right.envelope_json.auditMeta.paidIndividualization?.essenceRhythmNote,
    );
  });

  it('same main trait + different DOB can differ in paid s7 body', () => {
    resetCalendarBundleCacheForTests();
    const left = buildV2FulfillmentSnapshotFromFields(fulfillmentFields('1980-01-07'));
    resetCalendarBundleCacheForTests();
    const right = buildV2FulfillmentSnapshotFromFields(fulfillmentFields('1980-01-17'));

    assert.equal(left.envelope_json.auditMeta.stemLaneIndex, 1);
    assert.equal(right.envelope_json.auditMeta.stemLaneIndex, 1);
    assert.equal(TEN_STEM_DISPLAY[1]!.publicTitle, 'プランナー');

    const s7Left = left.envelope_json.payload.fullSections.find((s) => s.id === 's7_work')!.body;
    const s7Right = right.envelope_json.payload.fullSections.find((s) => s.id === 's7_work')!.body;
    assert.notEqual(s7Left, s7Right);
    assert.notEqual(
      left.envelope_json.auditMeta.paidIndividualization?.fingerprint,
      right.envelope_json.auditMeta.paidIndividualization?.fingerprint,
    );
  });

  it('different main trait still produces different paid s7 body', () => {
    resetCalendarBundleCacheForTests();
    const lane1 = buildV2FulfillmentSnapshotFromFields(fulfillmentFields('1980-01-07'));
    resetCalendarBundleCacheForTests();
    const lane9 = buildV2FulfillmentSnapshotFromFields(fulfillmentFields('1983-02-28'));

    assert.notEqual(lane1.envelope_json.auditMeta.stemLaneIndex, lane9.envelope_json.auditMeta.stemLaneIndex);
    const s7a = lane1.envelope_json.payload.fullSections.find((s) => s.id === 's7_work')!.body;
    const s7b = lane9.envelope_json.payload.fullSections.find((s) => s.id === 's7_work')!.body;
    assert.notEqual(s7a, s7b);
  });

  it('flag OFF (default): s1/s2 use STEM_SEED_BODIES only (s3 adds paid DOB-v2 prefix)', () => {
    resetCalendarBundleCacheForTests();
    const fields = fulfillmentFields('1980-01-07');
    const built = buildV2FulfillmentSnapshotFromFields(fields);
    const composite = runM55CompositeStemPipeline(toCompositeCanonicalInput(fields));
    const ref = runDtrEngine(
      {
        birthDate: fields.birthDate,
        nickname: fields.nickname,
        locale: 'ja-JP',
        contextScope: 'dtr',
      },
      {
        stemLaneIndex: composite.stemLaneIndex,
        engineVersion: ENGINE_VERSION_V2,
        derivation: 'm55_composite_stem_v2_p_lunar',
        contractVersion: 'v2',
      },
    );

    for (const sectionId of ['s1_identity', 's2_composition'] as const) {
      const actual = built.envelope_json.payload.fullSections.find((s) => s.id === sectionId)!.body;
      const expected = ref.payload.fullSections.find((s) => s.id === sectionId)!.body;
      assert.equal(actual, expected, sectionId);
    }

    const s3Actual = built.envelope_json.payload.fullSections.find((s) => s.id === 's3_essence')!.body;
    const s3Catalog = ref.payload.fullSections.find((s) => s.id === 's3_essence')!.body;
    assert.ok(s3Actual.endsWith(s3Catalog));
    assert.match(s3Actual, /【このプレミアムレポートだけの本質リズム】/);
  });

  it('free/paid main trait parity remains on frozen anchor DOBs', () => {
    resetCalendarBundleCacheForTests();
    for (const birthDate of ['1983-02-28', '1992-12-19', '1980-01-07']) {
      const fields = fulfillmentFields(birthDate);
      const profile = enrichBirthProfileForSave({
        nickname: fields.nickname,
        birthDate: fields.birthDate,
        birthTime: fields.birthTime,
        birthTimeUnknown: fields.birthTimeUnknown,
        country: fields.country,
        timezone: fields.timezone,
      });
      const core = buildCoreResult(profile);
      const paid = buildV2FulfillmentSnapshotFromFields(fields);
      assert.equal(paid.envelope_json.auditMeta.stemLaneIndex, core.stemLaneIndex, birthDate);
    }
  });

  it('user-facing individualization fragments do not leak internal jargon', () => {
    resetCalendarBundleCacheForTests();
    const built = buildV2FulfillmentSnapshotFromFields(fulfillmentFields('1980-01-07'));
    const ind = built.envelope_json.auditMeta.paidIndividualization;
    assert.ok(ind);
    for (const text of [ind!.auxiliaryReading, ind!.handlingHint, ind!.essenceRhythmNote]) {
      assert.equal(findForbiddenPaidIndividualizationLeak(text), null, text);
    }
    const s3 = built.envelope_json.payload.fullSections.find((s) => s.id === 's3_essence')!.body;
    const s7 = built.envelope_json.payload.fullSections.find((s) => s.id === 's7_work')!.body;
    assert.equal(findForbiddenPaidIndividualizationLeak(s3), null);
    assert.equal(findForbiddenPaidIndividualizationLeak(s7), null);
  });

  it('individualization is derived from engine context only (no API / no trait rejudgment)', () => {
    resetCalendarBundleCacheForTests();
    const fields = fulfillmentFields('1980-01-07');
    const built = buildV2FulfillmentSnapshotFromFields(fields);
    const composite = runM55CompositeStemPipeline(toCompositeCanonicalInput(fields));
    const fromComposite = buildPaidDtrIndividualizationFromComposite(composite);
    const fromContext = buildPaidDtrIndividualizationFromEngineContext(built.engine_context_json);
    assert.deepEqual(fromComposite, fromContext);
    assert.equal(fromContext.fingerprint, built.engine_context_json.displayFingerprint);

    const src = readFileSync(new URL('./dtrPaidIndividualization.ts', import.meta.url), 'utf8');
    assert.doesNotMatch(src, /openai|fetch\s*\(|generateText|chat\.completions/i);
    assert.doesNotMatch(src, /stemLaneIndex\s*[+\-*\/]|essenceStemLaneIndex/);
  });

  it('v1 builder and legacy exports remain signature-compatible', () => {
    resetCalendarBundleCacheForTests();
    const built = buildV2FulfillmentSnapshotFromFields(fulfillmentFields('1980-01-07'));
    const legacy = buildPaidDtrIndividualizationFromEngineContext(built.engine_context_json);
    const v1 = buildPaidDtrIndividualizationV1FromEngineContext(built.engine_context_json);

    assert.deepEqual(legacy, v1);
    assert.equal(v1.version, undefined);
    assert.equal(v1.fingerprint, built.engine_context_json.displayFingerprint);
    assert.match(buildPaidDtrS3IndividualizationPrefix(v1), /^【このプレミアムレポートだけの本質リズム】\n/);
    assert.match(buildPaidDtrS7IndividualizationPrefix(v1), /^【このプレミアムレポートだけの補助整理】\n/);
    assert.equal(
      buildPaidDtrS3IndividualizationPrefix(v1),
      ['【このプレミアムレポートだけの本質リズム】', v1.essenceRhythmNote, ''].join('\n'),
    );
    assert.equal(
      buildPaidDtrS7IndividualizationPrefix(v1),
      ['【このプレミアムレポートだけの補助整理】', v1.auxiliaryReading, v1.handlingHint, ''].join('\n'),
    );
  });

  it('s3 body includes individualized prefix marker', () => {
    const body = s3BodyFromFields('1980-01-07');
    assert.match(body, /【このプレミアムレポートだけの本質リズム】/);
  });

  it('s7 body includes individualized prefix marker', () => {
    const body = s7BodyFromFields('1980-01-07');
    assert.match(body, /【このプレミアムレポートだけの補助整理】/);
  });
});
