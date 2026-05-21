/**
 * Layer3-safe labels for /my (M55_PAGE_OUTPUT_MAPPING — no raw logic keys as primary copy).
 * Public: Entry Report / Report (M55_REPORT_PRODUCT_STRUCTURE, CORE_BINDING_RESTART_BRIEF).
 */
import { LABEL_ENTRY_REPORT } from './dtrProductLabels';

export { LABEL_ENTRY_REPORT };

export function displayLabelForDtrRightKey(rightKey: string): string {
  if (rightKey === 'm55_p:core_origin') return LABEL_ENTRY_REPORT;
  if (rightKey.startsWith('m55_p:month:')) return 'Report';
  return 'Report';
}

/** Whether this right key is the static Entry Report lane (for safe preview / reopen link). */
export function isEntryReportCoreRight(rightKey: string): boolean {
  return rightKey === 'm55_p:core_origin';
}
