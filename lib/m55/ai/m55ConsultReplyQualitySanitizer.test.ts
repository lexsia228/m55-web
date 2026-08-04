import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyM55ConsultReplyQualityPasses } from './m55ConsultReplyQualitySanitizer';

describe('applyM55ConsultReplyQualityPasses', () => {
  it('rewrites generic advice phrasing', () => {
    const r = applyM55ConsultReplyQualityPasses(
      'この進め方は効果的です。役立つかもしれません。'
    );
    assert.ok(r.text.includes('使いやすいです'));
    assert.ok(r.text.includes('相談の場面に戻しやすいです'));
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
    assert.ok(r.text.includes('無理'));
    assert.equal(r.text.includes('負荷'), false);
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
      'ここでは無理の整理に留めます。';
    const r = applyM55ConsultReplyQualityPasses(long);
    assert.ok(r.text.length >= 50);
    assert.ok(r.text.includes('無理が出やすい'));
  });

  it('leaves medical-style wording for safety layer (no quality rewrite)', () => {
    const input =
      'この症状は何の病気か診断してほしい。効果的です。';
    const r = applyM55ConsultReplyQualityPasses(input);
    assert.ok(r.text.includes('診断して'));
    assert.ok(r.text.includes('使いやすいです'));
  });

  it('rewrites listed generic coaching phrases', () => {
    const r = applyM55ConsultReplyQualityPasses(
      '誰にでも起こりうるので、一般的には焦らず自分のペースで自分らしく進みましょう。'
    );
    assert.ok(r.text.includes('このプレミアムレポートの傾向として見える範囲では'));
    assert.ok(r.text.includes('この抜粋では'));
    assert.ok(r.categoriesTriggered.includes('generic_advice'));
  });

  it('collapses repeated かもしれません phrasing', () => {
    const r = applyM55ConsultReplyQualityPasses(
      '整理できるかもしれません。見直せるかもしれません。戻せるかもしれません。'
    );
    const count = (r.text.match(/かもしれません/g) ?? []).length;
    assert.ok(count <= 1);
  });

  it('does not map repeated 重要です / 大切です to the same template phrase', () => {
    const r = applyM55ConsultReplyQualityPasses(
      'この点は重要です。次の段も大切です。三つ目も重要です。'
    );
    assert.equal(r.text.includes('ここが論点になりやすいです'), false);
    const handgrip = (r.text.match(/最初の手がかりになります/g) ?? []).length;
    assert.ok(handgrip <= 1);
  });

  it('avoids ことがを when regex rewrites できるでしょう after ことが', () => {
    const r = applyM55ConsultReplyQualityPasses('回復させることができるでしょう。');
    assert.equal(r.text.includes('ことがを'), false);
    assert.ok(r.text.includes('選び直しやすくなります'));
  });

  it('rewrites forbidden cold and self-help phrasing in paid reply output', () => {
    const r = applyM55ConsultReplyQualityPasses(
      'プレミアムレポートの章を読み返すと、いまの場面が少し見えやすくなります。' +
        '周囲とのコミュニケーションを増やす。リフレッシュの時間を設定する。自分自身を労わる。フィードバックループ。' +
        '今日はここまでに留め、プレミアムレポートの観点だけを手がかりにします。'
    );
    assert.equal(r.text.includes('コミュニケーションを増やす'), false);
    assert.equal(r.text.includes('リフレッシュ'), false);
    assert.equal(r.text.includes('自分自身を労わる'), false);
    assert.equal(r.text.includes('フィードバックループ'), false);
  });

  it('final output never contains template leakage or broken particles', () => {
    const samples = [
      'ここが論点になりやすいです。重要です。大切です。',
      '回復させることができるでしょう。ストレスと不安が要因です。',
      '再構築は有効です。軽減できます。',
    ];
    for (const input of samples) {
      const r = applyM55ConsultReplyQualityPasses(input);
      assert.equal(r.text.includes('ここが論点になりやすいです'), false);
      assert.equal(r.text.includes('ことがを'), false);
      assert.equal(r.text.includes('組み直しする'), false);
      assert.equal(r.text.includes('和らげるする'), false);
      assert.equal(r.text.includes('短い短い'), false);
      assert.equal(r.text.includes('短い往復'), false);
      assert.equal(r.text.includes('手がかり手助け'), false);
      assert.equal(r.text.includes('ことがここに意識'), false);
    }
  });

  it('fixes ことが必要です splice: no verb-stem before 整理しやすくなります', () => {
    const r = applyM55ConsultReplyQualityPasses(
      '言葉の選び方や伝え方を工夫することが必要です。'
    );
    assert.equal(r.text.includes('工夫する整理しやすく'), false, 'splice artifact must not appear');
    assert.equal(r.text.includes('工夫する整理'), false);
    const broken = /[^。\n]{2,}する整理しやすく/.test(r.text);
    assert.equal(broken, false, 'bare verb stem before 整理しやすく must not appear');
    assert.ok(r.text.includes('工夫することで、整理しやすくなります') || r.text.includes('工夫する'), 'output should be readable');
  });

  it('fixes かもしれません overflow: no なるなりやすい fusion', () => {
    const r = applyM55ConsultReplyQualityPasses(
      '選び直しやすくなるかもしれません。選び直しやすくなるかもしれません。選び直しやすくなるかもしれません。選び直しやすくなるかもしれません。'
    );
    assert.equal(r.text.includes('なるなりやすい'), false, 'fusion artifact must not appear');
    assert.equal(r.text.includes('なるなりやすいです'), false);
    const count = (r.text.match(/かもしれません/g) ?? []).length;
    assert.ok(count <= 1, `かもしれません should appear at most 1 time, got ${count}`);
    assert.ok(r.text.includes('出やすいです'), 'overflow replacement should be 出やすいです');
  });

  it('rewrites より良いコミュニケーション to living-language', () => {
    const r = applyM55ConsultReplyQualityPasses(
      'より良いコミュニケーションが必要だと感じる場面もあります。'
    );
    assert.equal(r.text.includes('より良いコミュニケーション'), false);
    assert.ok(r.text.includes('伝わりやすいやりとり'));
    assert.ok(r.categoriesTriggered.includes('generic_advice'));
  });

  it('rewrites 自己評価が低下しやすい to living-language', () => {
    const r = applyM55ConsultReplyQualityPasses(
      '自己評価が低下しやすいときは、一度区切るサインです。'
    );
    assert.equal(r.text.includes('自己評価が低下しやすい'), false);
    assert.ok(r.text.includes('自分を責める方向に寄りやすい'));
    assert.ok(r.categoriesTriggered.includes('over_empathy_counseling'));
  });

  it('repairs 再構築する and 軽減する without duplicate verbs', () => {
    const r = applyM55ConsultReplyQualityPasses(
      '関係性を再構築することが、張りつめを軽減する手助けになるでしょう。相手との短いフィードバックループがある。' +
        'プレミアムレポートの章を読み返すと、いまの場面が少し見えやすくなります。'
    );
    assert.equal(r.text.includes('組み直しする'), false);
    assert.equal(r.text.includes('和らげるする'), false);
    assert.equal(r.text.includes('短い短い'), false);
    assert.equal(r.text.includes('短い往復'), false);
    assert.equal(r.text.includes('手がかり手助け'), false);
    assert.ok(r.text.includes('少し組み直す') || r.text.includes('組み直'));
    assert.ok(r.text.includes('和らげる手がかり') || r.text.includes('和らげる'));
    assert.ok(r.text.includes('短いやりとり'));
  });

  it('softens stiff wording and removes duplicate perspective phrase', () => {
    const r = applyM55ConsultReplyQualityPasses(
      '少し視点を変えて少し視点を変えてみるだけでも、高いエネルギーと疲労感が出やすいです。' +
        '言葉や行動で伝えることに得意なあなたは、効果的に届く距離を保てます。' +
        'コミュニケーションを意識的に増やし、休息の時間を設定して試みてください。' +
        'プレミアムレポートの章を読み返すと、いまの場面が少し見えやすくなります。'
    );
    assert.equal(r.text.includes('少し視点を変えて少し視点を変えて'), false);
    assert.equal(r.text.includes('高いエネルギー'), false);
    assert.equal(r.text.includes('疲労感'), false);
    assert.equal(r.text.includes('効果的に届く'), false);
    assert.equal(r.text.includes('試みてください'), false);
    assert.ok(r.text.includes('少し視点を変えてみるだけでも'));
    assert.ok(r.text.includes('強く動く力'));
    assert.ok(r.text.includes('疲れ'));
    assert.ok(r.text.includes('届きやすくなる'));
    assert.ok(r.text.includes('試してみてください'));
  });

  it('limits weak hedges かもしれません / 可能性があります / ことが多いです', () => {
    const r = applyM55ConsultReplyQualityPasses(
      '作業をやめたいのに止められない場面では、影響するかもしれません。' +
        '進められる可能性があります。良いことが多いです。手助けになることが多いです。' +
        'プレミアムレポートの傾向に沿って、区切りを置きにくい流れとして見えます。'
    );
    assert.ok((r.text.match(/かもしれません/g) ?? []).length <= 1);
    assert.ok((r.text.match(/可能性があります/g) ?? []).length <= 1);
    assert.ok((r.text.match(/ことが多いです/g) ?? []).length <= 2);
    assert.equal(r.text.includes('手助けになることが多いです'), false);
    assert.equal(r.text.includes('良いことが多いです'), false);
  });

  it('repairs grammar splice artifacts from weak template rewrites', () => {
    const r = applyM55ConsultReplyQualityPasses(
      '疲れや張りつめ、そして期待がどのように変化しているかを意識する整理しやすくなります。' +
        '少しずつ進めていく整理しやすくなります。解消していくことができることが多いです。'
    );
    assert.equal(r.text.includes('を意識する整理しやすく'), false);
    assert.equal(r.text.includes('していく整理しやすく'), false);
    assert.equal(r.text.includes('できることが多いです'), false);
    assert.ok(r.text.includes('を意識すると整理しやすく') || r.text.includes('意識すると'));
  });

  it('caps 最初の手がかりになります near-duplicate overflow', () => {
    const r = applyM55ConsultReplyQualityPasses(
      '確認することが最初の手がかりになります。整理することが最初の手がかりになります。' +
        '見直すことが最初の手がかりになります。'
    );
    assert.ok((r.text.match(/最初の手がかりになります/g) ?? []).length <= 1);
  });

  it('rewrites observed weak generic phrases from production-like output', () => {
    const r = applyM55ConsultReplyQualityPasses(
      '心に影響を与えているかもしれません。スムーズに進められる可能性があります。'
    );
    assert.equal(r.text.includes('心に影響を与えているかもしれません'), false);
    assert.equal(r.text.includes('スムーズに進められる可能性があります'), false);
  });
});
