import type { StoredEnvelopeReadMode } from './compositeStem/storedEnvelopeRead';

/**
 * /dtr/core saved-report notice copy (display-only SSOT).
 * Shown for all stored envelope reads (legacy + v2).
 */
export const SAVED_SNAPSHOT_NOTICE_PRIMARY =
  'この保存版は、購入時点のプロフィールをもとに作成・保存されています。';

/** Legacy stored snapshot only — purchase-time fixed content vs current free preview. */
export const SAVED_SNAPSHOT_NOTICE_LEGACY_MODE =
  'この保存版は、購入時点のプロフィールと内容で固定されています。現在の無料鑑定と表示名が異なる場合があります。保存版の本文と相談返書では、購入時の内容を基準に扱います。';

export function shouldShowLegacySnapshotNotice(
  mode: StoredEnvelopeReadMode | undefined,
): boolean {
  return mode === 'legacy';
}
