import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePaidReportPublicDisplayText } from './paidReportPublicDisplayTerminology';

describe('normalizePaidReportPublicDisplayText', () => {
  it('is idempotent', () => {
    const input =
      '【この保存版だけの本質リズム】\n向きが決まるほど力を出しやすくなります。\n\nこの保存版で見えている形では、';
    const once = normalizePaidReportPublicDisplayText(input);
    const twice = normalizePaidReportPublicDisplayText(once);
    assert.equal(once, twice);
    assert.doesNotMatch(once, /保存版/);
    assert.match(once, /プレミアムレポート/);
    assert.doesNotMatch(once, /プレミアムレポートレポート/);
  });

  it('replaces variant names and known generated headings', () => {
    const input = '保存版ライトと保存版FULL、保存版レポート、【この保存版だけの補助整理】';
    const out = normalizePaidReportPublicDisplayText(input);
    assert.match(out, /M55 プレミアムレポート ライト/);
    assert.match(out, /M55 プレミアムレポート フル/);
    assert.match(out, /プレミアムレポート/);
    assert.match(out, /【このプレミアムレポートだけの補助整理】/);
    assert.doesNotMatch(out, /保存版/);
  });

  it('does not alter unrelated prose or free-tier 見取り図', () => {
    const input = '無料の見取り図では、輪郭まで確認できます。¥1,000（税込）';
    assert.equal(normalizePaidReportPublicDisplayText(input), input);
  });

  it('does not alter nickname containing 保存版', () => {
    const input = 'nickname: 保存版好きの太郎';
    assert.equal(normalizePaidReportPublicDisplayText(input), input);
  });

  it('does not alter user answer containing 保存版', () => {
    const input = 'userAnswer: 以前「保存版」という言葉を使っていました';
    assert.equal(normalizePaidReportPublicDisplayText(input), input);
  });

  it('does not alter consultation theme containing 保存版', () => {
    const input = 'consultTheme: 保存版という呼び方への違和感';
    assert.equal(normalizePaidReportPublicDisplayText(input), input);
  });

  it('normalizes known generated phrase while leaving stored source conceptually separate', () => {
    const stored =
      '【この保存版だけの本質リズム】\n向きが決まるほど力を出しやすくなります。';
    const displayed = normalizePaidReportPublicDisplayText(stored);
    assert.notEqual(stored, displayed);
    assert.equal(stored, '【この保存版だけの本質リズム】\n向きが決まるほど力を出しやすくなります。');
    assert.match(displayed, /【このプレミアムレポートだけの本質リズム】/);
  });

  it('does not duplicate プレミアムレポート when normalizing 保存版レポート', () => {
    const out = normalizePaidReportPublicDisplayText('保存版レポートの入口');
    assert.equal(out, 'プレミアムレポートの入口');
    assert.doesNotMatch(out, /プレミアムレポートレポート/);
  });
});
