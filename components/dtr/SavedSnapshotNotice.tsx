'use client';

import { SAVED_SNAPSHOT_NOTICE_PRIMARY } from '../../lib/m55/dtrSavedReportCopy';
import styles from './DtrFullReader.module.css';

/**
 * Permanent editorial notice: paid report reflects purchase-time profile snapshot.
 * Not a notification UI — no dismiss, no CTA.
 */
export default function SavedSnapshotNotice() {
  return (
    <div
      className={styles.savedSnapshotNotice}
      role="note"
      aria-label="プレミアムレポートについて"
      data-m55-premium-state="purchased.saved_reopen"
      data-testid="m55-saved-snapshot-notice"
    >
      <p className={styles.savedSnapshotNoticeText}>{SAVED_SNAPSHOT_NOTICE_PRIMARY}</p>
    </div>
  );
}
