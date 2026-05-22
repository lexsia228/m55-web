'use client';

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DTR_SAVED_REPORT_DELETE_CONFIRM_BODY_P1,
  DTR_SAVED_REPORT_DELETE_CONFIRM_BODY_P2,
  DTR_SAVED_REPORT_DELETE_CONFIRM_BODY_P3,
  DTR_SAVED_REPORT_DELETE_CONFIRM_BODY_P4,
  DTR_SAVED_REPORT_DELETE_CONFIRM_CANCEL,
  DTR_SAVED_REPORT_DELETE_CONFIRM_CONFIRM,
  DTR_SAVED_REPORT_DELETE_CONFIRM_TITLE,
} from '../../lib/m55/dtrSavedReportDeleteCopy';
import styles from './SavedReportDeleteDialog.module.css';

type Props = {
  open: boolean;
  confirming: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function SavedReportDeleteDialog({ open, confirming, onClose, onConfirm }: Props) {
  const titleId = useId();
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirming) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, confirming, onClose]);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [open]);

  if (!open || !portalReady) return null;

  return createPortal(
    <div className={styles.root} data-testid="m55-saved-report-delete-dialog">
      <button
        type="button"
        className={styles.overlay}
        aria-label={DTR_SAVED_REPORT_DELETE_CONFIRM_CANCEL}
        onClick={() => {
          if (!confirming) onClose();
        }}
      />
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className={styles.title}>
          {DTR_SAVED_REPORT_DELETE_CONFIRM_TITLE}
        </h2>
        <p className={styles.body}>{DTR_SAVED_REPORT_DELETE_CONFIRM_BODY_P1}</p>
        <p className={styles.body}>{DTR_SAVED_REPORT_DELETE_CONFIRM_BODY_P2}</p>
        <p className={styles.body}>{DTR_SAVED_REPORT_DELETE_CONFIRM_BODY_P3}</p>
        <p className={styles.body}>{DTR_SAVED_REPORT_DELETE_CONFIRM_BODY_P4}</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={confirming}
          >
            {DTR_SAVED_REPORT_DELETE_CONFIRM_CANCEL}
          </button>
          <button
            type="button"
            className={styles.confirmBtn}
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? '削除中…' : DTR_SAVED_REPORT_DELETE_CONFIRM_CONFIRM}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
