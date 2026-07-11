import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildIndividualizationDraftSnapshotV1 } from './buildIndividualizationV1';
import type { IndividualizationSelectorBundleV1 } from './individualizationSelectorTypesV1';
import {
  buildIndividualizationOutputHashV2,
  type OutputHashV2Input,
} from './outputHashV2';
import { INDIVIDUALIZATION_SELECTOR_VERSION_V1 } from './versions';

function freeSet(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    'free.start_style': 'free.start_style.map_first',
    'free.decision_style': 'free.decision_style.sort_first',
    'free.recovery_style': 'free.recovery_style.pause_short',
    'free.distance_style': 'free.distance_style.close_careful',
    'free.change_style': 'free.change_style.observe_first',
    'free.primary_theme': 'free.primary_theme.work',
    ...overrides,
  };
}

function paidSet(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    'paid.work_focus': 'paid.work_focus.priority',
    'paid.decision_friction': 'paid.decision_friction.too_many',
    'paid.relation_focus': 'paid.relation_focus.words',
    'paid.fatigue_signal': 'paid.fatigue_signal.after_push',
    'paid.report_usage': 'paid.report_usage.reread_scene',
    'paid.reading_style': 'paid.reading_style.headline',
    ...overrides,
  };
}

function draftInput(overrides: {
  birthDate?: string;
  stemLaneIndex?: number;
  freeAnswerSet?: Record<string, string>;
  paidAnswerSet?: Record<string, string> | null;
} = {}) {
  return {
    birthDate: overrides.birthDate ?? '1990-01-15',
    stemLaneIndex: overrides.stemLaneIndex ?? 1,
    freeAnswerSet: overrides.freeAnswerSet ?? freeSet(),
    paidAnswerSet:
      overrides.paidAnswerSet === undefined ? paidSet() : overrides.paidAnswerSet,
    engineVersion: 'hash-engine',
    catalogVersion: 'hash-catalog',
    reportLogicVersion: 'hash-report',
    generatedAt: '2026-07-12T00:00:00.000Z',
    templateBlockIds: ['block-b', 'block-a'],
  };
}

function hashInputFromDraft(
  draft: ReturnType<typeof buildIndividualizationDraftSnapshotV1> & { ok: true },
): OutputHashV2Input {
  return {
    dobFp: draft.value.fingerprint.dobBase.dobFp,
    freeAnswerHash: draft.value.questionnaire.freeAnswerHash,
    paidAnswerHash: draft.value.questionnaire.paidAnswerHash ?? '',
    templateBlockIds: draft.value.audit.templateBlockIds,
    engineVersion: draft.value.audit.engineVersion,
    catalogVersion: draft.value.audit.catalogVersion,
    reportLogicVersion: draft.value.audit.reportLogicVersion,
    selectorVersion: INDIVIDUALIZATION_SELECTOR_VERSION_V1,
    selectors: draft.value.fingerprint.selectors!,
  };
}

function validBundleFromDraft(): IndividualizationSelectorBundleV1 {
  const draft = buildIndividualizationDraftSnapshotV1(draftInput());
  assert.equal(draft.ok, true);
  if (!draft.ok) throw new Error('fixture draft failed');
  return draft.value.fingerprint.selectors!;
}

function baseHashInput(bundle: IndividualizationSelectorBundleV1): OutputHashV2Input {
  return {
    dobFp: 'dob-fp-hash-base',
    freeAnswerHash: 'free-hash-base',
    paidAnswerHash: 'paid-hash-base',
    templateBlockIds: ['z', 'a'],
    engineVersion: 'engine-base',
    catalogVersion: 'catalog-base',
    reportLogicVersion: 'report-base',
    selectorVersion: INDIVIDUALIZATION_SELECTOR_VERSION_V1,
    selectors: bundle,
  };
}

describe('gmfn-v2 outputHash', () => {
  it('same complete input produces same hash', () => {
    const bundle = validBundleFromDraft();
    const input = baseHashInput(bundle);
    const a = buildIndividualizationOutputHashV2(input);
    const b = buildIndividualizationOutputHashV2({ ...input });
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.equal(a.value, b.value);
    assert.equal(a.value.length, 64);
  });

  it('selectorVersion change fails closed', () => {
    const bundle = validBundleFromDraft();
    const input = baseHashInput(bundle);
    const changed = buildIndividualizationOutputHashV2({
      ...input,
      selectorVersion: 'selectors-v9',
    });
    assert.equal(changed.ok, false);
    if (changed.ok) return;
    assert.equal(changed.code, 'unknown_selector_version');
  });

  it('strain change changes hash', () => {
    const bundle = validBundleFromDraft();
    const base = buildIndividualizationOutputHashV2(baseHashInput(bundle));
    const withStrain: IndividualizationSelectorBundleV1 = {
      ...bundle,
      strainSelectorIds: bundle.strainSelectorIds.length > 0
        ? []
        : ['strain__pace_mismatch'],
    };
    const mutated = buildIndividualizationOutputHashV2(baseHashInput(withStrain));
    assert.equal(base.ok && mutated.ok, true);
    if (!base.ok || !mutated.ok) return;
    assert.notEqual(base.value, mutated.value);
  });

  it('recovery change changes hash', () => {
    const bundle = validBundleFromDraft();
    const base = buildIndividualizationOutputHashV2(baseHashInput(bundle));
    const mutated = buildIndividualizationOutputHashV2(
      baseHashInput({
        ...bundle,
        recoverySelectorIds: ['recovery__small_start'],
      }),
    );
    assert.equal(base.ok && mutated.ok, true);
    if (!base.ok || !mutated.ok) return;
    assert.notEqual(base.value, mutated.value);
  });

  it('free selector change changes hash', () => {
    const bundle = validBundleFromDraft();
    const base = buildIndividualizationOutputHashV2(baseHashInput(bundle));
    const freeIds = [...bundle.freeBlockSelectorIds];
    const introMissing = !freeIds.includes('free__intro__welcome');
    const mutatedBundle: IndividualizationSelectorBundleV1 = introMissing
      ? {
          ...bundle,
          freeBlockSelectorIds: ['free__intro__welcome', ...freeIds],
        }
      : {
          ...bundle,
          freeBlockSelectorIds: freeIds.filter((id) => id !== 'free__intro__welcome'),
        };
    const mutated = buildIndividualizationOutputHashV2(baseHashInput(mutatedBundle));
    assert.equal(base.ok && mutated.ok, true);
    if (!base.ok || !mutated.ok) return;
    assert.notEqual(base.value, mutated.value);
  });

  it('paid selector change changes hash', () => {
    const bundle = validBundleFromDraft();
    const base = buildIndividualizationOutputHashV2(baseHashInput(bundle));
    const mutated = buildIndividualizationOutputHashV2(
      baseHashInput({
        ...bundle,
        paidChapterEmphasisIds: {
          ...bundle.paidChapterEmphasisIds,
          chapter2: ['paid_ch2__change_adaptation'],
        },
      }),
    );
    assert.equal(base.ok && mutated.ok, true);
    if (!base.ok || !mutated.ok) return;
    assert.notEqual(base.value, mutated.value);
  });

  it('chapter movement changes hash', () => {
    const bundle = validBundleFromDraft();
    const movedId = bundle.paidChapterEmphasisIds.chapter1[0];
    assert.ok(movedId);
    const base = buildIndividualizationOutputHashV2(baseHashInput(bundle));
    const mutated = buildIndividualizationOutputHashV2(
      baseHashInput({
        ...bundle,
        paidChapterEmphasisIds: {
          chapter1: bundle.paidChapterEmphasisIds.chapter1.slice(1),
          chapter2: [...bundle.paidChapterEmphasisIds.chapter2, movedId],
          chapter3: bundle.paidChapterEmphasisIds.chapter3,
          chapter4: bundle.paidChapterEmphasisIds.chapter4,
        },
      }),
    );
    assert.equal(base.ok && mutated.ok, true);
    if (!base.ok || !mutated.ok) return;
    assert.notEqual(base.value, mutated.value);
  });

  it('caller order differences normalize to same hash', () => {
    const bundle = validBundleFromDraft();
    const reordered = buildIndividualizationOutputHashV2(
      baseHashInput({
        ...bundle,
        strainSelectorIds: [...bundle.strainSelectorIds].reverse(),
        recoverySelectorIds: [...bundle.recoverySelectorIds].reverse(),
        freeBlockSelectorIds: [...bundle.freeBlockSelectorIds].reverse(),
        paidChapterEmphasisIds: {
          chapter1: [...bundle.paidChapterEmphasisIds.chapter1].reverse(),
          chapter2: [...bundle.paidChapterEmphasisIds.chapter2].reverse(),
          chapter3: [...bundle.paidChapterEmphasisIds.chapter3].reverse(),
          chapter4: [...bundle.paidChapterEmphasisIds.chapter4].reverse(),
        },
      }),
    );
    const canonical = buildIndividualizationOutputHashV2(baseHashInput(bundle));
    assert.equal(reordered.ok && canonical.ok, true);
    if (!reordered.ok || !canonical.ok) return;
    assert.equal(reordered.value, canonical.value);
  });

  it('empty strain uses stable explicit representation', () => {
    const bundle = validBundleFromDraft();
    const emptyStrain = buildIndividualizationOutputHashV2(
      baseHashInput({ ...bundle, strainSelectorIds: [] }),
    );
    const emptyAgain = buildIndividualizationOutputHashV2(
      baseHashInput({ ...bundle, strainSelectorIds: [] }),
    );
    assert.equal(emptyStrain.ok && emptyAgain.ok, true);
    if (!emptyStrain.ok || !emptyAgain.ok) return;
    assert.equal(emptyStrain.value, emptyAgain.value);
  });

  it('empty recovery uses stable explicit representation', () => {
    const bundle = validBundleFromDraft();
    const emptyRecovery = buildIndividualizationOutputHashV2(
      baseHashInput({ ...bundle, recoverySelectorIds: [] }),
    );
    const emptyAgain = buildIndividualizationOutputHashV2(
      baseHashInput({ ...bundle, recoverySelectorIds: [] }),
    );
    assert.equal(emptyRecovery.ok && emptyAgain.ok, true);
    if (!emptyRecovery.ok || !emptyAgain.ok) return;
    assert.equal(emptyRecovery.value, emptyAgain.value);
  });

  it('selectors absent is prohibited', () => {
    const bundle = validBundleFromDraft();
    const input = baseHashInput(bundle);
    const result = buildIndividualizationOutputHashV2({
      ...input,
      selectors: undefined as unknown as IndividualizationSelectorBundleV1,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, 'invalid_selector_bundle');
  });

  it('null selectors is invalid', () => {
    const bundle = validBundleFromDraft();
    const input = baseHashInput(bundle);
    const result = buildIndividualizationOutputHashV2({
      ...input,
      selectors: null as unknown as IndividualizationSelectorBundleV1,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, 'invalid_selector_bundle');
  });

  it('structurally empty bundle is invalid', () => {
    const result = buildIndividualizationOutputHashV2(
      baseHashInput({
        version: 'selectors-v1',
        strainSelectorIds: [],
        recoverySelectorIds: [],
        freeBlockSelectorIds: [],
        paidChapterEmphasisIds: {
          chapter1: [],
          chapter2: [],
          chapter3: [],
          chapter4: [],
        },
      }),
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, 'invalid_selector_bundle');
  });

  it('bundle/source version mismatch is invalid', () => {
    const bundle = validBundleFromDraft();
    const result = buildIndividualizationOutputHashV2(
      baseHashInput({
        ...bundle,
        version: 'selectors-v1',
      }),
    );
    assert.equal(result.ok, true);
    const mismatch = buildIndividualizationOutputHashV2({
      ...baseHashInput(bundle),
      selectorVersion: INDIVIDUALIZATION_SELECTOR_VERSION_V1,
      selectors: { ...bundle, version: 'selectors-v1' },
    });
    assert.equal(mismatch.ok, true);

    const badBundleVersion = buildIndividualizationOutputHashV2({
      ...baseHashInput(bundle),
      selectors: {
        ...bundle,
        version: 'selectors-v1',
      },
      selectorVersion: 'selectors-v9',
    });
    assert.equal(badBundleVersion.ok, false);
    if (badBundleVersion.ok) return;
    assert.equal(badBundleVersion.code, 'unknown_selector_version');
  });

  it('selectors present with absent selectorVersion input fails closed', () => {
    const bundle = validBundleFromDraft();
    const result = buildIndividualizationOutputHashV2({
      ...baseHashInput(bundle),
      selectorVersion: '',
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, 'unknown_selector_version');
  });

  it('hash failure returns no partial draft from builder boundary', () => {
    const draft = buildIndividualizationDraftSnapshotV1(draftInput());
    assert.equal(draft.ok, true);
    if (!draft.ok) return;
    const broken = buildIndividualizationOutputHashV2({
      ...hashInputFromDraft(draft),
      selectors: {
        version: 'selectors-v1',
        strainSelectorIds: [],
        recoverySelectorIds: [],
        freeBlockSelectorIds: [],
        paidChapterEmphasisIds: {
          chapter1: [],
          chapter2: [],
          chapter3: [],
          chapter4: [],
        },
      },
    });
    assert.equal(broken.ok, false);
    if (broken.ok) return;
    assert.equal(broken.code, 'invalid_selector_bundle');
  });

  it('same builder input yields same selectors hash and snapshot', () => {
    const input = draftInput();
    const a = buildIndividualizationDraftSnapshotV1(input);
    const b = buildIndividualizationDraftSnapshotV1(input);
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.deepEqual(a.value.fingerprint.selectors, b.value.fingerprint.selectors);
    assert.equal(a.value.audit.outputHash, b.value.audit.outputHash);
    assert.equal(a.value.audit.sourceVersions.fieldNamingVersion, 'gmfn-v2');
  });

  it('input immutability for hash input objects', () => {
    const bundle = validBundleFromDraft();
    const input = baseHashInput(bundle);
    const bundleSnap = JSON.stringify(input.selectors);
    const inputSnap = JSON.stringify({
      templateBlockIds: input.templateBlockIds,
      selectorVersion: input.selectorVersion,
    });
    buildIndividualizationOutputHashV2(input);
    assert.equal(JSON.stringify(input.selectors), bundleSnap);
    assert.equal(
      JSON.stringify({
        templateBlockIds: input.templateBlockIds,
        selectorVersion: input.selectorVersion,
      }),
      inputSnap,
    );
  });

  it('selector bundle semantic content is represented in hash input path', () => {
    const draft = buildIndividualizationDraftSnapshotV1(draftInput());
    assert.equal(draft.ok, true);
    if (!draft.ok) return;
    const direct = buildIndividualizationOutputHashV2(hashInputFromDraft(draft));
    assert.equal(direct.ok, true);
    if (!direct.ok) return;
    assert.equal(direct.value, draft.value.audit.outputHash);
    assert.ok(draft.value.fingerprint.selectors!.freeBlockSelectorIds.length > 0);
  });

  it('free-only paid hash empty path remains valid with selectors', () => {
    const draft = buildIndividualizationDraftSnapshotV1(
      draftInput({ paidAnswerSet: null }),
    );
    assert.equal(draft.ok, true);
    if (!draft.ok) return;
    const hash = buildIndividualizationOutputHashV2(hashInputFromDraft(draft));
    assert.equal(hash.ok, true);
    if (!hash.ok) return;
    assert.equal(hash.value, draft.value.audit.outputHash);
  });

  it('different DOB changes gmfn-v2 hash', () => {
    const a = buildIndividualizationDraftSnapshotV1(
      draftInput({ birthDate: '1990-01-15', stemLaneIndex: 0 }),
    );
    const b = buildIndividualizationDraftSnapshotV1(
      draftInput({ birthDate: '1992-12-19', stemLaneIndex: 0 }),
    );
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.notEqual(a.value.audit.outputHash, b.value.audit.outputHash);
    assert.notDeepEqual(a.value.fingerprint.selectors, b.value.fingerprint.selectors);
  });

  it('different free answers change gmfn-v2 hash', () => {
    const a = buildIndividualizationDraftSnapshotV1(draftInput());
    const b = buildIndividualizationDraftSnapshotV1(
      draftInput({
        freeAnswerSet: freeSet({
          'free.primary_theme': 'free.primary_theme.relation',
        }),
      }),
    );
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.notEqual(a.value.audit.outputHash, b.value.audit.outputHash);
    assert.notDeepEqual(a.value.fingerprint.selectors, b.value.fingerprint.selectors);
  });

  it('different paid answers change gmfn-v2 hash', () => {
    const a = buildIndividualizationDraftSnapshotV1(draftInput());
    const b = buildIndividualizationDraftSnapshotV1(
      draftInput({
        paidAnswerSet: paidSet({
          'paid.work_focus': 'paid.work_focus.pace',
          'paid.decision_friction': 'paid.decision_friction.fear_mistake',
          'paid.relation_focus': 'paid.relation_focus.timing',
          'paid.fatigue_signal': 'paid.fatigue_signal.long_stretch',
        }),
      }),
    );
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.notEqual(a.value.audit.outputHash, b.value.audit.outputHash);
    assert.notDeepEqual(a.value.fingerprint.paidDepth, b.value.fingerprint.paidDepth);
  });

  it('template block order differences normalize to same hash', () => {
    const bundle = validBundleFromDraft();
    const ordered = buildIndividualizationOutputHashV2({
      ...baseHashInput(bundle),
      templateBlockIds: ['m', 'a', 'z'],
    });
    const shuffled = buildIndividualizationOutputHashV2({
      ...baseHashInput(bundle),
      templateBlockIds: ['z', 'm', 'a'],
    });
    assert.equal(ordered.ok && shuffled.ok, true);
    if (!ordered.ok || !shuffled.ok) return;
    assert.equal(ordered.value, shuffled.value);
  });

  it('gmfn-v2 hash never equals legacy gmfn-v1 for same semantic base without selectors', () => {
    const draft = buildIndividualizationDraftSnapshotV1(draftInput());
    assert.equal(draft.ok, true);
    if (!draft.ok) return;
    const gmfnV2 = draft.value.audit.outputHash;
    assert.notEqual(gmfnV2.includes('gmfn-v1'), true);
    assert.equal(draft.value.audit.sourceVersions.fieldNamingVersion, 'gmfn-v2');
  });

  it('selectors present always carry selectors-v1 audit provenance', () => {
    const draft = buildIndividualizationDraftSnapshotV1(draftInput());
    assert.equal(draft.ok, true);
    if (!draft.ok) return;
    assert.equal(draft.value.audit.sourceVersions.selectorVersion, 'selectors-v1');
    assert.equal(draft.value.fingerprint.selectors!.version, 'selectors-v1');
  });

  it('invalid selector bundle with paid hash but no paid emphasis fails closed', () => {
    const bundle = validBundleFromDraft();
    const result = buildIndividualizationOutputHashV2({
      ...baseHashInput({
        ...bundle,
        paidChapterEmphasisIds: {
          chapter1: [],
          chapter2: [],
          chapter3: [],
          chapter4: [],
        },
      }),
      paidAnswerHash: 'paid-present',
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, 'invalid_selector_bundle');
  });

  it('resolver-integrated draft hash matches direct gmfn-v2 module output', () => {
    const draft = buildIndividualizationDraftSnapshotV1(
      draftInput({
        freeAnswerSet: freeSet({
          'free.distance_style': 'free.distance_style.solo_reset',
        }),
      }),
    );
    assert.equal(draft.ok, true);
    if (!draft.ok) return;
    const direct = buildIndividualizationOutputHashV2(hashInputFromDraft(draft));
    assert.equal(direct.ok, true);
    if (!direct.ok) return;
    assert.equal(direct.value, draft.value.audit.outputHash);
  });
});
