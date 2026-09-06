/**
 * publicShareImageV1 — aspect contract, export model, and wiring parity tests.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { PERSONAL_V5_FIXTURES } from '../freeResult/personalFreeCommercialCopyV5.test';
import { PAIR_V5_FIXTURES } from '../compatibility/pairFreeCommercialCopyV5.test';
import { buildPairFreeInsightSpecV2 } from '../compatibility/pairFreeInsightSpecV2';
import { buildPersonalFreeNarrativeShareContextV1 } from './projectPersonalFreeNarrativeV1';
import {
  projectGenericPublicShareV1,
  projectPairPublicShareV1,
  projectPersonalPublicShareV1,
} from './projectPublicShareV1';
import { parsePublicCardDisplayV1 } from './publicCardDisplayV1';
import { M55_ASSET_ROUTE_CONSUMPTION } from '../commercialUx/assetLedger/assetRouteConsumption';
import {
  buildPublicShareImageExportModel,
  buildUserShareImagePath,
  parseShareExportAspectRatio,
  resolveShareSubsystemFromVariant,
  shareExportDimensions,
} from './publicShareImageV1';
import { resolvePublicShareArtworkPathsFromToken } from './resolvePublicShareArtworkV1';
import { buildPairSharePresentationV1 } from './pairSharePresentationV1';

const ROOT = join(import.meta.dirname, '../../..');

function personalSpec(variant: 'manual' | 'seen_vs_actual' | 'hidden_spec' = 'manual') {
  const fixture = PERSONAL_V5_FIXTURES[0]!;
  const built = buildPersonalFreeNarrativeShareContextV1(fixture);
  assert.equal(built.ok, true);
  if (!built.ok) throw new Error('fixture');
  const { narrative, answerAxes, birthAxes, hingeAxisId, stemLaneIndex } = built.value;
  const spec = projectPersonalPublicShareV1({
    narrative,
    variant,
    stemLaneIndex,
    answerAxes,
    birthAxes,
    hingeAxisId,
  });
  assert.ok(spec);
  return spec!;
}

function pairManualSpec(lanes?: { personAStemLaneIndex: number; personBStemLaneIndex: number }) {
  const fixture = PAIR_V5_FIXTURES[0]!;
  const insight = buildPairFreeInsightSpecV2({
    answers: fixture.answers,
    pairAxisId: 'A2',
    personABirthDate: fixture.personA,
    personBBirthDate: fixture.personB,
    personAUsesFirstPerspective: true,
    focusLabel: fixture.focus,
    relationStatusId: 'R3',
  });
  return projectPairPublicShareV1({ spec: insight, ...lanes });
}

describe('share export aspect parsing', () => {
  it('accepts 1:1, 4:5, and 9:16', () => {
    assert.equal(parseShareExportAspectRatio('1:1'), '1:1');
    assert.equal(parseShareExportAspectRatio('4:5'), '4:5');
    assert.equal(parseShareExportAspectRatio('9:16'), '9:16');
  });

  it('rejects missing, arbitrary, and OG landscape ratios', () => {
    assert.equal(parseShareExportAspectRatio(null), null);
    assert.equal(parseShareExportAspectRatio(''), null);
    assert.equal(parseShareExportAspectRatio('16:9'), null);
    assert.equal(parseShareExportAspectRatio('1200:630'), null);
    assert.equal(parseShareExportAspectRatio('2:3'), null);
  });
});

describe('share export dimensions', () => {
  it('maps each aspect to exact export pixels', () => {
    assert.deepEqual(shareExportDimensions('1:1'), { width: 1080, height: 1080 });
    assert.deepEqual(shareExportDimensions('4:5'), { width: 1080, height: 1350 });
    assert.deepEqual(shareExportDimensions('9:16'), { width: 1080, height: 1920 });
  });
});

describe('public-only export model boundary', () => {
  it('consumes PublicShareSpecV1 without private identifiers', () => {
    const spec = personalSpec('manual');
    const model = buildPublicShareImageExportModel(spec, '4:5');
    const blob = JSON.stringify(model);
    assert.doesNotMatch(blob, /\d{4}-\d{2}-\d{2}/);
    assert.doesNotMatch(blob, /free\.|paid\.|clerk|email|userId|reportId|answer/i);
    assert.equal(model.spec.token, spec.token);
    assert.equal(model.dimensions.width, 1080);
    assert.equal(model.dimensions.height, 1350);
  });

  it('does not embed pair partner identity in pair export model', () => {
    const fixture = PAIR_V5_FIXTURES[0]!;
    const spec = pairManualSpec();
    const model = buildPublicShareImageExportModel(spec, '9:16');
    const blob = JSON.stringify(model);
    assert.equal(blob.includes(fixture.personA), false);
    assert.equal(blob.includes(fixture.personB), false);
    assert.doesNotMatch(blob, /1983|1997/);
  });
});

describe('variant subsystem semantics', () => {
  it('maps personal variants to self', () => {
    assert.equal(resolveShareSubsystemFromVariant('manual'), 'self');
    assert.equal(resolveShareSubsystemFromVariant('seen_vs_actual'), 'self');
    assert.equal(resolveShareSubsystemFromVariant('hidden_spec'), 'self');
    assert.equal(resolveShareSubsystemFromVariant('premium_takeaway'), 'self');
  });

  it('maps pair variants to pair', () => {
    assert.equal(resolveShareSubsystemFromVariant('pair_manual'), 'pair');
    assert.equal(resolveShareSubsystemFromVariant('pair_generic'), 'pair');
  });

  it('derives subsystem from reconstructed public specs', () => {
    const selfModel = buildPublicShareImageExportModel(personalSpec('hidden_spec'), '1:1');
    const pairModel = buildPublicShareImageExportModel(pairManualSpec(), '4:5');
    const genericModel = buildPublicShareImageExportModel(
      projectGenericPublicShareV1({ variant: 'pair_generic' }),
      '4:5',
    );
    assert.equal(selfModel.subsystem, 'self');
    assert.equal(pairModel.subsystem, 'pair');
    assert.equal(genericModel.subsystem, 'pair');
  });
});

describe('client/server boundary', () => {
  it('keeps NarrativeShareActions free of publicShareImageV1 runtime imports', () => {
    const actions = readFileSync(join(ROOT, 'components/narrative/NarrativeShareActions.tsx'), 'utf8');
    assert.doesNotMatch(actions, /from ['"].*publicShareImageV1['"]/);
  });

  it('keeps SharedEntryPanel free of publicShareImageV1 runtime imports', () => {
    const panel = readFileSync(join(ROOT, 'components/share/SharedEntryPanel.tsx'), 'utf8');
    assert.doesNotMatch(panel, /from ['"].*publicShareImageV1['"]/);
  });
});

describe('aspect selection wiring parity', () => {
  it('passes selected aspect from SELF and PAIR choosers into NarrativeShareActions', () => {
    const chooser = readFileSync(join(ROOT, 'components/narrative/ShareCardChooser.tsx'), 'utf8');
    const pairCta = readFileSync(join(ROOT, 'components/compatibility/PairFreeShareCTA.tsx'), 'utf8');
    assert.match(chooser, /aspectRatio=\{aspectRatio\}/);
    assert.match(pairCta, /aspectRatio=\{activeAspectRatio\}/);
  });

  it('uses share-image export path only when aspect is explicit', () => {
    const actions = readFileSync(join(ROOT, 'components/narrative/NarrativeShareActions.tsx'), 'utf8');
    assert.match(actions, /\/share-image\?aspect=\$\{encodeURIComponent\(aspect\)\}/);
    assert.match(actions, /aspectRatio\s*\?\s*buildUserShareImagePath\(spec\.sharePath, aspectRatio\)/);
    assert.match(actions, /: spec\.imageSpec\.path/);
    const spec = personalSpec('manual');
    const path = buildUserShareImagePath(spec.sharePath, '4:5');
    assert.match(path, /\/share-image\?aspect=4%3A5$/);
    assert.doesNotMatch(path, /opengraph-image/);
  });

  it('keeps OG imageSpec path untouched on public spec', () => {
    const spec = personalSpec('seen_vs_actual');
    assert.match(spec.imageSpec.path, /\/opengraph-image$/);
    assert.equal(spec.imageSpec.kind, 'og');
  });

  it('maps selected aspect to matching export dimensions', () => {
    for (const aspect of ['1:1', '4:5', '9:16'] as const) {
      const dims = shareExportDimensions(aspect);
      const model = buildPublicShareImageExportModel(personalSpec('manual'), aspect);
      assert.equal(model.aspect, aspect);
      assert.deepEqual(model.dimensions, dims);
    }
  });
});

describe('pair image-first share action contract', () => {
  it('keeps opt-in imageFirst default false and wires Pair caller only', () => {
    const actions = readFileSync(join(ROOT, 'components/narrative/NarrativeShareActions.tsx'), 'utf8');
    const pairCta = readFileSync(join(ROOT, 'components/compatibility/PairFreeShareCTA.tsx'), 'utf8');
    const chooser = readFileSync(join(ROOT, 'components/narrative/ShareCardChooser.tsx'), 'utf8');
    assert.match(actions, /imageFirst = false/);
    assert.match(pairCta, /imageFirst/);
    assert.doesNotMatch(chooser, /imageFirst/);
  });

  it('uses generated share-image export for image-first primary and explicit save', () => {
    const actions = readFileSync(join(ROOT, 'components/narrative/NarrativeShareActions.tsx'), 'utf8');
    assert.match(actions, /async function fetchShareImageFile/);
    assert.match(actions, /buildUserShareImagePath\(spec\.sharePath, aspectRatio\)/);
    assert.match(actions, /m55-share\.png/);
    assert.match(actions, /handleImagePrimary/);
    assert.match(actions, /imageFileShareAvailable \? pairCopy\.imageSharePrimaryJa : pairCopy\.imageSaveJa/);
    assert.match(actions, /pairCopy\.linkShareJa/);
    assert.match(actions, /pairCopy\.xLinkPostJa/);
    assert.doesNotMatch(actions, /from ['"].*publicShareImageV1['"]/);
  });
});

describe('manual preview/export parity', () => {
  it('export renderer keeps all manual rows that preview displays', () => {
    const spec = personalSpec('manual');
    const display = parsePublicCardDisplayV1({
      variant: spec.variant,
      headline: spec.headline,
      body: spec.body,
      cta: spec.cta,
    });
    assert.ok(display.rows.length > 4, 'P1 manual fixture should expose more than four rows');
    const renderer = readFileSync(join(ROOT, 'lib/m55/narrative/publicShareImageV1.tsx'), 'utf8');
    assert.doesNotMatch(renderer, /display\.rows\.slice\(/);
    assert.match(renderer, /display\.rows\.map/);
    const model = buildPublicShareImageExportModel(spec, '4:5');
    assert.equal(model.display.rows.length, display.rows.length);
    assert.deepEqual(
      model.display.rows.map((row) => row.label),
      display.rows.map((row) => row.label),
    );
  });

  it('P1 manual share text prefers fused on-card insight over weak axis summary', () => {
    const spec = personalSpec('manual');
    assert.match(spec.shareTextJa, /相談している|一人になったあと|決めているように見られ/);
    assert.doesNotMatch(
      spec.shareTextJa,
      /小さく一つ動かしてから、様子を見る。候補を並べてから閉じる/,
    );
    assert.match(spec.body, /誤解されやすいところ|自分に出やすい傾向/);
  });
});

describe('pair trait artwork export parity', () => {
  it('resolves dual canonical hero paths for trait-bearing pair tokens', () => {
    const spec = pairManualSpec({ personAStemLaneIndex: 9, personBStemLaneIndex: 1 });
    const paths = resolvePublicShareArtworkPathsFromToken(spec.token);
    assert.equal(paths.length, 2);
    assert.match(paths[0]!, /^\/ten-views\//);
    assert.match(paths[1]!, /^\/ten-views\//);
    const renderer = readFileSync(join(ROOT, 'lib/m55/narrative/publicShareImageV1.tsx'), 'utf8');
    assert.match(renderer, /artUrls\.length === 2/);
    assert.match(renderer, /buildPairSharePresentationV1/);
  });

  it('keeps old pair tokens on existing no-art fallback', () => {
    const spec = pairManualSpec();
    assert.equal(resolvePublicShareArtworkPathsFromToken(spec.token).length, 0);
  });
});

describe('Pair aspect presentation authority', () => {
  const spec = pairManualSpec({ personAStemLaneIndex: 9, personBStemLaneIndex: 1 });

  it('prioritizes one combined contrast in 1:1', () => {
    const model = buildPairSharePresentationV1(spec, '1:1');
    assert.ok(model);
    assert.equal(model.hierarchy, 'square-priority');
    assert.equal(model.showGenericHeadline, false);
    assert.equal(model.relationMode, 'combined');
    assert.match(model.pairLabel, / × /);
    assert.ok(model.combinedRelationJa.length > 0);
  });

  it('keeps the richest two-side hierarchy in 4:5', () => {
    const model = buildPairSharePresentationV1(spec, '4:5');
    assert.ok(model);
    assert.equal(model.hierarchy, 'portrait-rich');
    assert.equal(model.relationMode, 'two-column');
    assert.ok(model.sideAJa.length > 0);
    assert.ok(model.sideBJa.length > 0);
  });

  it('uses a vertical relation stack in 9:16', () => {
    const model = buildPairSharePresentationV1(spec, '9:16');
    assert.ok(model);
    assert.equal(model.hierarchy, 'story-stack');
    assert.equal(model.relationMode, 'vertical');
    assert.deepEqual(buildPublicShareImageExportModel(spec, '9:16').dimensions, {
      width: 1080,
      height: 1920,
    });
  });

  it('derives only from the public spec and retains privacy', () => {
    for (const aspect of ['1:1', '4:5', '9:16'] as const) {
      const blob = JSON.stringify(buildPairSharePresentationV1(spec, aspect));
      assert.doesNotMatch(blob, /\d{4}-\d{2}-\d{2}|nickname|answer|private|session|provider/i);
    }
    const preview = readFileSync(join(ROOT, 'components/narrative/PublicShareCardPreview.tsx'), 'utf8');
    const renderer = readFileSync(join(ROOT, 'lib/m55/narrative/publicShareImageV1.tsx'), 'utf8');
    assert.match(preview, /buildPairSharePresentationV1/);
    assert.match(renderer, /buildPairSharePresentationV1/);
  });
});

describe('asset route consumption', () => {
  it('resolves shared.export to share.card and trait.identity', () => {
    assert.deepEqual(M55_ASSET_ROUTE_CONSUMPTION['shared.export'], [
      'share.card',
      'trait.identity',
    ]);
  });
});
