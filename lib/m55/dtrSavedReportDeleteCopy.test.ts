import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DTR_SAVED_REPORT_DELETE_CONFIRM_BODY_P1,
  DTR_SAVED_REPORT_DELETE_CONFIRM_BODY_P2,
  DTR_SAVED_REPORT_DELETE_CONFIRM_BODY_P3,
  DTR_SAVED_REPORT_DELETE_CONFIRM_BODY_P4,
  DTR_SAVED_REPORT_DELETE_CONFIRM_CONFIRM,
  DTR_SAVED_REPORT_DELETE_CONFIRM_TITLE,
  DTR_SAVED_REPORT_DELETE_TOAST_PRIMARY,
  DTR_SAVED_REPORT_DELETE_TOAST_SECONDARY,
  DTR_SAVED_REPORT_DELETE_TRIGGER_LABEL,
} from './dtrSavedReportDeleteCopy';

const COPY_FILE = join(process.cwd(), 'lib/m55/dtrSavedReportDeleteCopy.ts');
const DIALOG_FILE = join(process.cwd(), 'components/my/SavedReportDeleteDialog.tsx');
const MY_PANEL_FILE = join(process.cwd(), 'components/my/MyPanel.tsx');

describe('dtrSavedReportDeleteCopy SSOT', () => {
  it('uses 削除 trigger label; user-facing strings avoid forbidden words', () => {
    assert.equal(DTR_SAVED_REPORT_DELETE_TRIGGER_LABEL, '削除');
    assert.equal(DTR_SAVED_REPORT_DELETE_CONFIRM_CONFIRM, '削除する');
    const forbidden = ['非表示', '元に戻す', '再表示'] as const;
    const exportedValues = [
      DTR_SAVED_REPORT_DELETE_CONFIRM_TITLE,
      DTR_SAVED_REPORT_DELETE_CONFIRM_BODY_P1,
      DTR_SAVED_REPORT_DELETE_CONFIRM_BODY_P2,
      DTR_SAVED_REPORT_DELETE_CONFIRM_BODY_P3,
      DTR_SAVED_REPORT_DELETE_CONFIRM_BODY_P4,
      DTR_SAVED_REPORT_DELETE_CONFIRM_CONFIRM,
      DTR_SAVED_REPORT_DELETE_TOAST_PRIMARY,
      DTR_SAVED_REPORT_DELETE_TOAST_SECONDARY,
      DTR_SAVED_REPORT_DELETE_TRIGGER_LABEL,
    ];
    for (const v of exportedValues) {
      for (const word of forbidden) {
        assert.equal(v.includes(word), false, `${v} must not include ${word}`);
      }
    }
  });

  it('dialog title matches spec', () => {
    assert.equal(DTR_SAVED_REPORT_DELETE_CONFIRM_TITLE, 'このプレミアムレポートを削除しますか？');
  });

  it('toast primary matches spec', () => {
    assert.equal(DTR_SAVED_REPORT_DELETE_TOAST_PRIMARY, 'プレミアムレポートを削除しました。');
  });
});

describe('/my delete UI wiring', () => {
  it('MyPanel calls hide API route', () => {
    const src = readFileSync(MY_PANEL_FILE, 'utf8');
    assert.ok(src.includes('/api/dtr/report-snapshot/hide'));
    assert.ok(src.includes('SavedReportDeleteDialog'));
    assert.ok(src.includes('dtrSavedReportDeleteCopy'));
    assert.ok(src.includes('snap?.ready === true') || src.includes('canOpenCore'));
  });

  it('dialog imports canonical copy only', () => {
    const src = readFileSync(DIALOG_FILE, 'utf8');
    assert.ok(src.includes('DTR_SAVED_REPORT_DELETE_CONFIRM_TITLE'));
    assert.equal(src.includes('非表示'), false);
  });
});
