import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  hybridAiChapter3PrimaryEligible,
  passesRelationshipSemanticGuard,
} from './dtrHybridAiChapterSemanticGuard';

describe('passesRelationshipSemanticGuard', () => {
  it('rejects work/progress s3 essence body', () => {
    const body =
      '力が出やすい条件と安定の話です。仕事やこれからの動きは、先に整える場所を見つけるほうが扱いやすくなります。';
    assert.equal(passesRelationshipSemanticGuard(body), false);
  });

  it('rejects body with 進め方のコツ fail phrase', () => {
    const body = '近い人との関係も大切ですが、進め方のコツとして優先順位を決めます。';
    assert.equal(passesRelationshipSemanticGuard(body), false);
  });

  it('accepts relationship semantic body', () => {
    const body =
      '近い人とのやりとりでは、言葉選びと距離感が大切です。相手の受け取り方に合わせた伝え方を意識すると、関係が扱いやすくなります。';
    assert.equal(passesRelationshipSemanticGuard(body), true);
  });

  it('rejects empty body', () => {
    assert.equal(passesRelationshipSemanticGuard(''), false);
  });
});

describe('hybridAiChapter3PrimaryEligible', () => {
  it('matches relationship guard', () => {
    const ok = '近い人との関係で、言葉と距離を整えることが大切です。';
    const ng = '仕事やこれからの動きは、力が出やすい条件と安定を先に見ます。';
    assert.equal(hybridAiChapter3PrimaryEligible(ok), true);
    assert.equal(hybridAiChapter3PrimaryEligible(ng), false);
  });
});
