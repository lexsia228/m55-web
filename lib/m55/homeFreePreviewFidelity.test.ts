/**
 * HOME sells the free result, so the HOME sample must stay verbatim engine
 * output. If the free result changes and this fails, regenerate the fixture
 * from `HOME_FREE_PREVIEW_SOURCE` rather than editing the sample by hand.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildFreeDepthAnalysisV1 } from './freeResult/buildFreeDepthAnalysisV1';
import { HOME_FREE_PREVIEW_FIXTURE, HOME_FREE_PREVIEW_SOURCE } from './homePreviewFixtures';
import { PAID_DTR_OPENING_POINT_LABELS_JA } from './paidDtrProductCopy';
import { TEN_ASSET_PUBLIC_CATALOG } from './tenAssetPublicCatalog';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from './topFreeEntryPublicCopy';

describe('HOME free preview mirrors the real free result', () => {
  const built = buildFreeDepthAnalysisV1({
    birthDate: HOME_FREE_PREVIEW_SOURCE.birthDate,
    stemLaneIndex: HOME_FREE_PREVIEW_SOURCE.stemLaneIndex,
    freeAnswerSet: { ...HOME_FREE_PREVIEW_SOURCE.freeAnswerSet },
  });

  it('the sample input still resolves', () => {
    assert.equal(built.ok, true);
  });

  it('every sample line is verbatim engine output', () => {
    assert.equal(built.ok, true);
    if (!built.ok) return;
    const depth = built.value;
    assert.equal(HOME_FREE_PREVIEW_FIXTURE.headlineJa, depth.headlineJa);
    assert.equal(HOME_FREE_PREVIEW_FIXTURE.sceneLabelJa, depth.primarySceneLabelJa);
    assert.equal(HOME_FREE_PREVIEW_FIXTURE.sceneBodyJa, depth.primarySceneJa);
    assert.deepEqual(
      [...HOME_FREE_PREVIEW_FIXTURE.strengthConditionsJa],
      [...depth.strengthConditionsJa],
    );
    assert.deepEqual([...HOME_FREE_PREVIEW_FIXTURE.loadConditionsJa], [...depth.loadConditionsJa]);
    assert.equal(HOME_FREE_PREVIEW_FIXTURE.openQuestionJa, depth.premiumOpenQuestionJa);
  });

  it('the sample persona matches the declared lane, not an arbitrary label', () => {
    const lane = TEN_ASSET_PUBLIC_CATALOG[HOME_FREE_PREVIEW_SOURCE.stemLaneIndex];
    assert.equal(HOME_FREE_PREVIEW_FIXTURE.personaNameJa, lane.persona);
    assert.equal(HOME_FREE_PREVIEW_FIXTURE.qualityLabelJa, lane.qualityLabel);
  });

  it('sample section headings match the ones the free result renders', () => {
    assert.equal(HOME_FREE_PREVIEW_FIXTURE.strengthHeadingJa, 'この傾向が活きるとき');
    assert.equal(HOME_FREE_PREVIEW_FIXTURE.loadHeadingJa, '同じ傾向が重くなるとき');
  });
});

describe('HOME premium promise matches what the paid opening delivers', () => {
  const { premiumValueBridgePremiumItemsJa: promised } = TOP_FREE_ENTRY_PUBLIC_COPY.home;
  const labels = PAID_DTR_OPENING_POINT_LABELS_JA;

  it('promises the four things the paid opening actually surfaces first', () => {
    const blob = promised.join(' / ');
    for (const fragment of ['理由', labels.grow, labels.break, labels.restore, labels.distance]) {
      assert.ok(blob.includes(fragment), `HOME must promise "${fragment}", got: ${blob}`);
    }
  });

  it('does not sell the paid report as chapter count or extra length', () => {
    const blob = [
      ...promised,
      ...TOP_FREE_ENTRY_PUBLIC_COPY.home.premiumValueBridgeFreeItemsJa,
      TOP_FREE_ENTRY_PUBLIC_COPY.home.premiumValueBridgeLeadJa,
    ].join(' ');
    for (const banned of ['4章', '章が読める', '文章量', '長い文章', '保存版']) {
      assert.equal(blob.includes(banned), false, `HOME must not sell Premium via "${banned}"`);
    }
  });

  it('the free column still describes real free value rather than a deficiency', () => {
    const free = TOP_FREE_ENTRY_PUBLIC_COPY.home.premiumValueBridgeFreeItemsJa.join(' ');
    assert.ok(free.includes('活きる場面') && free.includes('重くなる場面'));
    for (const banned of ['だけ', '不十分', '物足り']) {
      assert.equal(free.includes(banned), false, `free column must not self-deprecate: ${banned}`);
    }
  });
});
