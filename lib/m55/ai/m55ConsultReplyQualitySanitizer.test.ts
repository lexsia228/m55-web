import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyM55ConsultReplyQualityPasses } from './m55ConsultReplyQualitySanitizer';

describe('applyM55ConsultReplyQualityPasses', () => {
  it('rewrites generic advice phrasing', () => {
    const r = applyM55ConsultReplyQualityPasses(
      'この進め方は効果的です。役立つかもしれません。'
    );
    assert.ok(r.text.includes('整理しやすくなります'));
    assert.ok(r.text.includes('保存版の観点で見直しやすくなります'));
    assert.equal(r.replacementCount >= 2, true);
    assert.ok(r.categoriesTriggered.includes('generic_advice'));
  });

  it('weakens outcome guarantee phrasing via regex', () => {
    const r = applyM55ConsultReplyQualityPasses(
      '言葉を選び直すことは、落ち着きにつながります。'
    );
    assert.ok(r.text.includes('見えやすくする材料になります'));
    assert.ok(r.categoriesTriggered.includes('outcome_guarantee'));
  });

  it('prefers self-organization over asking the other person first', () => {
    const r = applyM55ConsultReplyQualityPasses(
      'まず相手に直接尋ねてみるより、一度立ち止まってください。'
    );
    assert.ok(r.text.includes('いまの中で、言葉と距離を一度分けてみる'));
    assert.ok(r.categoriesTriggered.includes('other_check_first'));
  });

  it('softens heavy self-management wording', () => {
    const r = applyM55ConsultReplyQualityPasses(
      '自分の限界を意識することが、最初の一歩になります。'
    );
    assert.ok(r.text.includes('いま抱えすぎている線を見る'));
    assert.ok(r.categoriesTriggered.includes('heavy_self_mgmt'));
  });

  it('leaves unrelated copy unchanged', () => {
    const input =
      '【無理が出やすいところ】の観点では、距離の取り方が論点です。短い整理だけ置きます。';
    const r = applyM55ConsultReplyQualityPasses(input);
    assert.equal(r.text, input);
    assert.equal(r.replacementCount, 0);
    assert.equal(r.categoriesTriggered.length, 0);
  });

  it('does not rewrite standalone chapter title lines', () => {
    const input = '【本質と安定の条件】\n本文では負荷を整理します。';
    const r = applyM55ConsultReplyQualityPasses(input);
    assert.ok(r.text.startsWith('【本質と安定の条件】'));
  });

  it('does not add Product Truth forbidden promo wording', () => {
    const r = applyM55ConsultReplyQualityPasses('効果的です。お勧めします。');
    const joined = r.text;
    assert.ok(!/無制限/.test(joined));
    assert.ok(!/おすすめ最適|最適解/.test(joined));
    assert.ok(!/%/.test(joined));
  });

  it('does not empty or over-shorten allowed output', () => {
    const long =
      'レポートの「無理が出やすいところ」に沿うと、言葉が先に走りやすい場面が見えます。' +
      'ここでは負荷の整理に留めます。';
    const r = applyM55ConsultReplyQualityPasses(long);
    assert.ok(r.text.length >= 50);
    assert.ok(r.text.includes('無理が出やすい'));
  });

  it('leaves medical-style wording for safety layer (no quality rewrite)', () => {
    const input =
      'この症状は何の病気か診断してほしい。効果的です。';
    const r = applyM55ConsultReplyQualityPasses(input);
    assert.ok(r.text.includes('診断して'));
    assert.ok(r.text.includes('整理しやすくなります'));
  });

  it('rewrites listed generic coaching phrases', () => {
    const r = applyM55ConsultReplyQualityPasses(
      '誰にでも起こりうるので、一般的には焦らず自分のペースで自分らしく進みましょう。'
    );
    assert.ok(r.text.includes('この保存版の傾向として見える範囲では'));
    assert.ok(r.text.includes('この抜粋では'));
    assert.ok(r.categoriesTriggered.includes('generic_advice'));
  });

  it('collapses repeated かもしれません phrasing', () => {
    const r = applyM55ConsultReplyQualityPasses(
      '整理できるかもしれません。見直せるかもしれません。戻せるかもしれません。'
    );
    const count = (r.text.match(/かもしれません/g) ?? []).length;
    assert.ok(count <= 2);
  });
});
