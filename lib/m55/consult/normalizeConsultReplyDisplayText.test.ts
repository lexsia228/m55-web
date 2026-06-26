import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConsultReplyDisplayText } from './normalizeConsultReplyDisplayText';

const LEGACY_DEFECT_FIXTURE =
  '仕事の場面ではここが論点になりやすいです。' +
  '回復させることができるでしょう。' +
  'フィードバックループが続き、ストレスと不安、自己否定も出やすいです。' +
  '周囲とのコミュニケーションを増やす。リフレッシュの時間を設定する。自分自身を労わる。' +
  '保存版の章を読み返すと、いまの場面が少し見えやすくなります。';

const GRAMMAR_ARTIFACT_FIXTURE =
  '相手との関係性を組み直しすることが、張りつめを和らげるする手助けになるでしょう。' +
  '相手との短い短い往復があるときに安定することにあります。' +
  'その感覚に気づくことがここに意識を向けると見えやすくなります。' +
  '短い休息する時間を設けることで、エネルギーを回復させることがを選び直しやすくなるかもしれません。' +
  '意図的にコミュニケーションの機会を増やすことが必要です。' +
  '自分自身を労わることも忘れずに行ってみてください。';

const PRESERVE_M55_PHRASE_FIXTURE =
  '燃焼後の急な落差と、受け取ってもらえないときの疲れがたまる。' +
  '自分を責めやすい状態の張りつめを、いったん言葉にする。' +
  '少しほどく見方で、今日できる小さな一歩として一段小さく休む。' +
  '発信と届く距離を見る。';

describe('normalizeConsultReplyDisplayText', () => {
  it('removes legacy template leakage and broken particles from display text', () => {
    const out = normalizeConsultReplyDisplayText(LEGACY_DEFECT_FIXTURE);
    assert.equal(out.includes('ここが論点になりやすいです'), false);
    assert.equal(out.includes('ことがを'), false);
    assert.equal(out.includes('フィードバックループ'), false);
    assert.equal(out.includes('リフレッシュ'), false);
    assert.equal(out.includes('コミュニケーションを増やす'), false);
    assert.equal(out.includes('自分自身を労わる'), false);
  });

  it('repairs grammar artifacts from deterministic rewrite passes', () => {
    const out = normalizeConsultReplyDisplayText(GRAMMAR_ARTIFACT_FIXTURE);
    assert.equal(out.includes('組み直しする'), false);
    assert.equal(out.includes('和らげるする'), false);
    assert.equal(out.includes('短い短い'), false);
    assert.equal(out.includes('短い往復'), false);
    assert.equal(out.includes('手がかり手助け'), false);
    assert.equal(out.includes('ことがここに意識'), false);
    assert.equal(out.includes('ことがを'), false);
    assert.equal(out.includes('短い休息する時間'), false);
    assert.equal(out.includes('コミュニケーションの機会を増やす'), false);
    assert.equal(out.includes('自分自身を労わる'), false);
    assert.equal(out.includes('忘れずに行ってみてください'), false);
    assert.equal(out.includes('必要です'), false);

    assert.ok(out.includes('少し組み直す') || out.includes('組み直'));
    assert.ok(out.includes('和らげる手がかり'));
    assert.ok(out.includes('短いやりとり'));
    assert.ok(out.includes('最初の手がかり'));
    assert.ok(out.includes('少し休む') || out.includes('休息'));
    assert.ok(out.includes('短くやりとり') || out.includes('やりとり'));
    assert.ok(out.includes('試してみてください'));
  });

  it('preserves good M55 phrasing when already natural', () => {
    const out = normalizeConsultReplyDisplayText(PRESERVE_M55_PHRASE_FIXTURE);
    assert.ok(out.includes('燃焼後の急な落差'));
    assert.ok(out.includes('疲れがたまる'));
    assert.ok(out.includes('自分を責めやすい状態'));
    assert.ok(out.includes('張りつめ'));
    assert.ok(out.includes('いったん言葉にする'));
    assert.ok(out.includes('少しほどく見方'));
    assert.ok(out.includes('今日できる小さな一歩'));
    assert.ok(out.includes('一段小さく休む'));
    assert.ok(out.includes('発信'));
    assert.ok(out.includes('届く距離'));
  });

  it('leaves empty input unchanged', () => {
    assert.equal(normalizeConsultReplyDisplayText(''), '');
    assert.equal(normalizeConsultReplyDisplayText('   '), '');
  });
});
