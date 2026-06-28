import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { resetCalendarBundleCacheForTests } from './calendar/loadCalendarBundle';
import { buildV2FulfillmentSnapshotFromFields } from './compositeStem/buildV2FulfillmentSnapshot';
import {
  composePaidIndividualizationFromEngineContext,
  resolvePaidIndividualizationVersion,
  resolveDobV2CatalogBuilder,
} from './dtrPaidIndividualizationCompose';
import {
  DOB_PERSONALIZATION_V2_CATALOG_VERSION,
  DOB_PERSONALIZATION_V21_CATALOG_VERSION,
} from './dtrDobPersonalizationV2';

function baseContext() {
  resetCalendarBundleCacheForTests();
  return buildV2FulfillmentSnapshotFromFields({
    nickname: 'synthetic',
    birthDate: '1980-01-07',
    birthTime: '12:00:00',
    birthTimeUnknown: false,
    country: 'JP',
    birthplace: null,
    timezone: 'Asia/Tokyo',
  }).engine_context_json;
}

describe('paid DTR individualization compose', () => {
  it('missing version resolves to v1', () => {
    const ctx = baseContext();
    assert.equal(resolvePaidIndividualizationVersion(ctx), 'v1');
    const ind = composePaidIndividualizationFromEngineContext(ctx);
    assert.equal(ind.version, undefined);
    assert.equal(ind.fingerprint, ctx.displayFingerprint);
    assert.doesNotMatch(ind.essenceRhythmNote, /生年月日の細かなリズム/);
  });

  it('explicit v1 resolves to v1', () => {
    const ctx = { ...baseContext(), paidIndividualizationVersion: 'v1' as const };
    assert.equal(resolvePaidIndividualizationVersion(ctx), 'v1');
    const ind = composePaidIndividualizationFromEngineContext(ctx);
    assert.equal(ind.version, undefined);
    assert.equal(ind.fingerprint, ctx.displayFingerprint);
  });

  it('explicit v2 resolves to v2', () => {
    const ctx = {
      ...baseContext(),
      paidIndividualizationVersion: 'v2' as const,
      dobPersonalizationCatalogVersion: DOB_PERSONALIZATION_V2_CATALOG_VERSION,
    };
    assert.equal(resolvePaidIndividualizationVersion(ctx), 'v2');
    const ind = composePaidIndividualizationFromEngineContext(ctx);
    assert.equal(ind.version, 'v2');
    assert.equal(ind.dobPersonalizationCatalogVersion, DOB_PERSONALIZATION_V2_CATALOG_VERSION);
    assert.match(ind.essenceRhythmNote, /生年月日の細かなリズム/);
  });

  // ── Catalog version router tests ─────────────────────────────────────────

  it('v2 + old catalog dob-v2-2026-06 → old v2 builder (display preserved)', () => {
    const ctx = {
      ...baseContext(),
      paidIndividualizationVersion: 'v2' as const,
      dobPersonalizationCatalogVersion: DOB_PERSONALIZATION_V2_CATALOG_VERSION,
    };
    const ind = composePaidIndividualizationFromEngineContext(ctx);
    assert.equal(ind.version, 'v2');
    assert.equal(ind.dobPersonalizationCatalogVersion, DOB_PERSONALIZATION_V2_CATALOG_VERSION);
    // Must use old corpus — essenceRhythmNote starts with the known opening.
    assert.match(ind.essenceRhythmNote, /生年月日の細かなリズム/);
    // v2-only fields present confirms old v2 builder was used.
    assert.ok(ind.s1IdentityRhythmNote && ind.s1IdentityRhythmNote.length > 10);
  });

  it('v2 + missing catalog → old v2 fallback (safe, not new corpus)', () => {
    const ctx = {
      ...baseContext(),
      paidIndividualizationVersion: 'v2' as const,
      dobPersonalizationCatalogVersion: undefined,
    };
    const ind = composePaidIndividualizationFromEngineContext(ctx);
    assert.equal(ind.version, 'v2');
    assert.match(ind.essenceRhythmNote, /生年月日の細かなリズム/);
    assert.ok(ind.s1IdentityRhythmNote && ind.s1IdentityRhythmNote.length > 10);
  });

  it('v2 + unknown catalog → old v2 fallback (no crash, no silent new corpus)', () => {
    const ctx = {
      ...baseContext(),
      paidIndividualizationVersion: 'v2' as const,
      dobPersonalizationCatalogVersion: 'dob-unknown-catalog-future' as string,
    };
    // Must not throw.
    const ind = composePaidIndividualizationFromEngineContext(ctx);
    assert.equal(ind.version, 'v2');
    // Falls back to old v2 (not a new unknown corpus).
    assert.match(ind.essenceRhythmNote, /生年月日の細かなリズム/);
  });

  it('v2 + dob-v2.1-2026-07 → new v2.1 builder (distinct from old v2)', () => {
    const ctx = {
      ...baseContext(),
      paidIndividualizationVersion: 'v2' as const,
      dobPersonalizationCatalogVersion: DOB_PERSONALIZATION_V21_CATALOG_VERSION as string,
    };
    const ind = composePaidIndividualizationFromEngineContext(ctx);
    assert.equal(ind.version, 'v2');
    assert.equal(ind.dobPersonalizationCatalogVersion, DOB_PERSONALIZATION_V21_CATALOG_VERSION);
    // v2.1 essenceRhythmNote still contains the known opening.
    assert.match(ind.essenceRhythmNote, /生年月日の細かなリズム/);
    // v2.1 fingerprint uses the v2.1 prefix — distinct from old v2 fingerprint.
    assert.match(ind.fingerprint, /^dobv21-/);
    // v2-only section fields must also be present.
    assert.ok(ind.s1IdentityRhythmNote && ind.s1IdentityRhythmNote.length > 10);
    assert.ok(ind.s2CompositionRhythmNote && ind.s2CompositionRhythmNote.length > 10);
    assert.ok(ind.s4StrengthsRhythmNote && ind.s4StrengthsRhythmNote.length > 10);
  });

  it('resolveDobV2CatalogBuilder: old catalog and null return old v2 builder; v2.1 returns v2.1 builder', () => {
    const builderOld = resolveDobV2CatalogBuilder(DOB_PERSONALIZATION_V2_CATALOG_VERSION);
    const builderNull = resolveDobV2CatalogBuilder(undefined);
    const builderUnknown = resolveDobV2CatalogBuilder('dob-unknown');
    const builderV21 = resolveDobV2CatalogBuilder(DOB_PERSONALIZATION_V21_CATALOG_VERSION);
    // old / null / unknown → same old v2 builder
    assert.strictEqual(builderOld, builderNull);
    assert.strictEqual(builderOld, builderUnknown);
    // v2.1 → distinct builder
    assert.notStrictEqual(builderV21, builderOld);
  });

  it('v2 old catalog and v2.1 catalog produce different fingerprints for same DOB', () => {
    const base = baseContext();
    const ctxOld = {
      ...base,
      paidIndividualizationVersion: 'v2' as const,
      dobPersonalizationCatalogVersion: DOB_PERSONALIZATION_V2_CATALOG_VERSION,
    };
    const ctxNew = {
      ...base,
      paidIndividualizationVersion: 'v2' as const,
      dobPersonalizationCatalogVersion: DOB_PERSONALIZATION_V21_CATALOG_VERSION as string,
    };
    const indOld = composePaidIndividualizationFromEngineContext(ctxOld);
    const indNew = composePaidIndividualizationFromEngineContext(ctxNew);
    assert.notEqual(indOld.fingerprint, indNew.fingerprint);
    assert.match(indOld.fingerprint, /^dobv2-/);
    assert.match(indNew.fingerprint, /^dobv21-/);
  });

  it('compose does not read feature flag and v1 module does not import compose', () => {
    const composeSrc = readFileSync(new URL('./dtrPaidIndividualizationCompose.ts', import.meta.url), 'utf8');
    const v1Src = readFileSync(new URL('./dtrPaidIndividualization.ts', import.meta.url), 'utf8');
    assert.doesNotMatch(composeSrc, /isDobPersonalizationV2FulfillmentEnabled/);
    assert.doesNotMatch(composeSrc, /DOB_PERSONALIZATION_V2_FULFILLMENT_ENABLED/);
    assert.doesNotMatch(composeSrc, /dobPersonalizationFeatureFlag/);
    assert.doesNotMatch(v1Src, /dtrPaidIndividualizationCompose/);
  });
});
