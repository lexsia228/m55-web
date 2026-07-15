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
  it('HOME copy states calendar rhythm plus current-answer product truth', () => {
    const blob = M55_LOGIC_HOME_COPY.bodyParagraphsJa.join('\n');
    assert.match(blob, /生年月日の暦リズム/);
    assert.match(blob, /選択式の質問/);
    assert.match(blob, /5つの質問・今の関心/);
    assert.match(blob, /固定ルール/);
    assert.match(blob, /生成AIを使う場合があります/);
    assert.match(blob, /追加読み解き/);
  });

  it('CORE copy is compact and bridges free to saved report', () => {
    const blob = M55_LOGIC_CORE_COPY.bodyParagraphsJa.join('\n');
    assert.ok(blob.length < M55_LOGIC_HOME_COPY.bodyParagraphsJa.join('\n').length);
    assert.match(blob, /生年月日の暦リズム/);
    assert.match(blob, /5つの選択式質問/);
    assert.match(blob, /4章へ深めます/);
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

  it('separates fixed-rule foundation from bounded generation AI', () => {
    const blob = m55LogicCopyBlob();
    assert.match(blob, /固定ルール/);
    assert.match(blob, /章の文章表現に生成AIを使う場合があります/);
    assert.match(blob, /追加読み解き.*生成AI/);
    assert.doesNotMatch(blob, /10通りの説明書/);
  });
});
