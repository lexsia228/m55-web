/**
 * Layer3-safe labels for /my (M55_PAGE_OUTPUT_MAPPING — no raw logic keys as primary copy).
 * Public: Entry Report / Report (M55_REPORT_PRODUCT_STRUCTURE, CORE_BINDING_RESTART_BRIEF).
 */

/** Public label for one-time static Entry Report product (internal key must not be headline). */
export const LABEL_ENTRY_REPORT = 'Entry Report';

export function displayLabelForDtrRightKey(rightKey: string): string {
  if (rightKey === 'm55_p:core_origin') return LABEL_ENTRY_REPORT;
  if (rightKey.startsWith('m55_p:month:')) return 'Report';
  return 'Report';
}

/** Whether this right key is the static Entry Report lane (for safe preview / reopen link). */
export function isEntryReportCoreRight(rightKey: string): boolean {
  return rightKey === 'm55_p:core_origin';
}
