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

const NATURALNESS_FIXTURE =
  '短くやりとりする機会を作る最初の手がかりになります。' +
  '自分自身の感情に目を向ける最初の手がかりになります。' +
  'その感覚に気づく最初の手がかりになります。' +
  '確認する最初の手がかりになります。' +
  '少し視点を変えて少し視点を変えてみるだけでも、楽になることがあります。' +
  '言葉や行動で伝えることに得意なあなたは、高いエネルギーを使い、疲労感がたまりやすいです。' +
  '自分を責めやすい状態の感情も出やすい。無理となっているようです。' +
  '効果的に届く距離を保ち、コミュニケーションを意識的に増やし、休息の時間を設定して試みてください。' +
  '保存版の章を読み返すと、いまの場面が少し見えやすくなります。';

const RESIDUAL_DEFECT_FIXTURE =
  '周囲の反応を意識し、意識して、短くやりとりする機会を作ると、整理しやすくなります。' +
  'まずまずは、自分の気持ちに目を向けてみてください。' +
  'あなたの発信がより届きやすくなるようになります。' +
  '少し休む時間を作るし、今日は一段小さく休むことも試してみてください。' +
  '視点の補助線として、保存版の章を読み返すと見えやすくなります。' +
  '無理が出やすい場面を考えると、これらの背景が影響していることが多いです。';

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
    assert.ok(out.includes('その感覚に気づくことが、最初の手がかりになります'));
    assert.ok(out.includes('少し休む') || out.includes('休息'));
    assert.ok(out.includes('短くやりとり') || out.includes('やりとり'));
    assert.ok(out.includes('試してみてください'));
  });

  it('repairs visible production defects in stored reply display', () => {
    const out = normalizeConsultReplyDisplayText(RESIDUAL_DEFECT_FIXTURE);
    assert.equal(out.includes('周囲の反応を意識し、意識して'), false);
    assert.equal(out.includes('まずまずは'), false);
    assert.equal(out.includes('より届きやすくなるようになります'), false);
    assert.equal(out.includes('少し休む時間を作るし'), false);
    assert.ok(out.includes('周囲の反応を見ながら'));
    assert.ok(out.includes('まずは'));
    assert.ok(out.includes('届きやすくなります'));
    assert.ok(out.includes('少し休む時間を作り'));
    assert.ok(out.includes('見直すときの目印'));
    assert.ok(out.includes('いましんどさが出やすいのは、たとえばこんな場面です'));
    assert.ok(out.includes('この流れが重なると'));
  });

  it('softens unnatural repeated repair phrasing and stiff wording', () => {
    const out = normalizeConsultReplyDisplayText(NATURALNESS_FIXTURE);
    assert.equal(
      out.includes('短くやりとりする機会を作る最初の手がかりになります'),
      false,
    );
    assert.equal(
      out.includes('自分自身の感情に目を向ける最初の手がかりになります'),
      false,
    );
    assert.equal(out.includes('その感覚に気づく最初の手がかりになります'), false);
    assert.equal(out.includes('確認する最初の手がかりになります'), false);
    assert.equal(out.includes('少し視点を変えて少し視点を変えて'), false);
    assert.equal(out.includes('言葉や行動で伝えることに得意'), false);
    assert.equal(out.includes('自分を責めやすい状態の感情'), false);
    assert.equal(out.includes('無理となっているようです'), false);
    assert.equal(out.includes('高いエネルギー'), false);
    assert.equal(out.includes('疲労感'), false);
    assert.equal(out.includes('効果的に届く'), false);
    assert.equal(out.includes('コミュニケーションを意識的に増やす'), false);
    assert.equal(out.includes('休息の時間を設定'), false);
    assert.equal(out.includes('試みてください'), false);

    assert.ok(out.includes('短くやりとりする機会を作ると、整理しやすくなります'));
    assert.ok(out.includes('まずは、自分の気持ちに目を向けてみてください'));
    assert.ok(out.includes('その感覚に気づくことが、最初の手がかりになります'));
    assert.ok(out.includes('確認してみると、今の進め方を整えやすくなります'));
    assert.ok(out.includes('少し視点を変えてみるだけでも'));
    assert.ok(out.includes('言葉や行動で伝えることが得意'));
    assert.ok(out.includes('自分を責めやすい気持ち'));
    assert.ok(out.includes('しんどさにつながっているようです'));
    assert.ok(out.includes('強く動く力'));
    assert.ok(out.includes('疲れ'));
    assert.ok(out.includes('届きやすくなる'));
    assert.ok(out.includes('短いやりとりを少し増やし') || out.includes('短いやりとりを少し増やす'));
    assert.ok(out.includes('少し休む時間を作って') || out.includes('少し休む時間を作る'));
    assert.ok(out.includes('試してみてください'));

    const count = (out.match(/最初の手がかりになります/g) ?? []).length;
    assert.ok(count <= 2, `expected at most 2 handgrip phrases, got ${count}`);
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
