import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConsultReplyDisplayText } from './normalizeConsultReplyDisplayText';

const LEGACY_DEFECT_FIXTURE =
  '仕事の場面ではここが論点になりやすいです。' +
  '回復させることができるでしょう。' +
  'フィードバックループが続き、ストレスと不安、自己否定も出やすいです。' +
  '周囲とのコミュニケーションを増やす。リフレッシュの時間を設定する。自分自身を労わる。' +
  '保存版の章を読み返すと、いまの場面が少し見えやすくなります。';

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

  it('leaves empty input unchanged', () => {
    assert.equal(normalizeConsultReplyDisplayText(''), '');
    assert.equal(normalizeConsultReplyDisplayText('   '), '');
  });
});
