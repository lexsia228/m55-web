import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  SAVED_SNAPSHOT_NOTICE_LEGACY_MODE,
  SAVED_SNAPSHOT_NOTICE_PRIMARY,
  shouldShowLegacySnapshotNotice,
} from './dtrSavedReportCopy';

const FORBIDDEN_LEGACY_NOTICE_WORDS = [
  '旧方式',
  '古い計算',
  '不一致',
  '間違い',
  '更新されていない',
  '修正前',
  'legacy',
  'JDN',
  'engine',
  'バグ',
  'エラー',
  '劣る',
  '古い',
];

describe('dtrSavedReportCopy — legacy notice', () => {
  it('SAVED_SNAPSHOT_NOTICE_PRIMARY is unchanged', () => {
    assert.equal(
      SAVED_SNAPSHOT_NOTICE_PRIMARY,
      'この保存版は、購入時点のプロフィールをもとに作成・保存されています。',
    );
  });

  it('SAVED_SNAPSHOT_NOTICE_LEGACY_MODE uses approved neutral copy', () => {
    assert.equal(
      SAVED_SNAPSHOT_NOTICE_LEGACY_MODE,
      'この保存版は、購入時点のプロフィールと内容で固定されています。現在の無料鑑定と表示名が異なる場合があります。保存版の本文と相談返書では、購入時の内容を基準に扱います。',
    );
    for (const word of FORBIDDEN_LEGACY_NOTICE_WORDS) {
      assert.doesNotMatch(SAVED_SNAPSHOT_NOTICE_LEGACY_MODE, new RegExp(word, 'i'));
    }
  });

  it('shouldShowLegacySnapshotNotice — legacy true / v2 false / undefined false', () => {
    assert.equal(shouldShowLegacySnapshotNotice('legacy'), true);
    assert.equal(shouldShowLegacySnapshotNotice('v2'), false);
    assert.equal(shouldShowLegacySnapshotNotice(undefined), false);
  });

  it('DtrFullReader renders legacy notice conditionally', () => {
    const src = readFileSync(join(process.cwd(), 'components/dtr/DtrFullReader.tsx'), 'utf8');
    assert.ok(src.includes('shouldShowLegacySnapshotNotice'));
    assert.ok(src.includes('SAVED_SNAPSHOT_NOTICE_LEGACY_MODE'));
    assert.ok(src.includes('storedEnvelopeReadMode'));
  });
});
