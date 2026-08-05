import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  M55_LOGIC_CORE_COPY,
  M55_LOGIC_FIVE_AXES_JA,
  M55_LOGIC_FORBIDDEN_TERMS,
  M55_LOGIC_HOME_COPY,
  m55LogicCopyBlob,
} from './m55LogicPublicCopy';

describe('M55 logic public copy SSOT — calendar rhythm alignment', () => {
  it('HOME copy states 10-lane plus calendar rhythm product truth', () => {
    const blob = M55_LOGIC_HOME_COPY.bodyParagraphsJa.join('\n');
    assert.match(blob, /10資質レーンへ分けるだけではありません/);
    assert.match(blob, /旧暦月・季節位置・日帯/);
    assert.match(blob, /動き方・疲れ方・戻し方/);
    assert.match(blob, /固定ルール/);
    assert.match(blob, /プレミアムレポートで深く読み返せます/);
    assert.match(blob, /追加読み解きは別のレイヤー/);
    assert.match(blob, /会話を続ける形式ではありません/);
  });

  it('CORE copy is compact and bridges free to saved report', () => {
    const blob = M55_LOGIC_CORE_COPY.bodyParagraphsJa.join('\n');
    assert.ok(blob.length < M55_LOGIC_HOME_COPY.bodyParagraphsJa.join('\n').length);
    assert.match(blob, /10資質レーン/);
    assert.match(blob, /5つの視点/);
    assert.match(blob, /プレミアムレポートで深く読み返せます/);
    assert.match(blob, /1テーマ/);
  });

  it('five-axis labels match SSOT wording', () => {
    assert.equal(M55_LOGIC_FIVE_AXES_JA, '人との距離、感じ取り方、発想、協調、段取り');
  });

  for (const term of M55_LOGIC_FORBIDDEN_TERMS) {
    it(`excludes forbidden term "${term}"`, () => {
      assert.equal(m55LogicCopyBlob().includes(term), false);
    });
  }

  it('does not frame saved report as mood-based or full AI generation', () => {
    const blob = m55LogicCopyBlob();
    assert.match(blob, /固定ルールで組み立てられ/);
    assert.doesNotMatch(blob, /プレミアムレポート全文.*生成AI/);
    assert.doesNotMatch(blob, /10通りの説明書/);
  });
});
