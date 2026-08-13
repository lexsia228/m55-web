import { normalizePaidReportPublicDisplayText } from '../paidReportPublicDisplayTerminology';

/**
 * A run of prose that belongs together on screen. `label` is a 【…】 sub-section heading;
 * `units` are the lines the author separated with a single newline.
 */
export type ReportBodyBlock = { label: string | null; units: string[] };

/**
 * An individualization prefix is emitted as `【label】\n<one line>\n`, so its label covers
 * exactly one unit. Anything after that is ordinary catalog prose and must not be presented
 * under a heading that promises text written only for this report.
 */
const INDIVIDUALIZATION_BLOCK_LABEL = /^このプレミアムレポートだけ/;

/**
 * Paid chapter bodies use three levels of separation: a 【…】 line opens a sub-section, a blank
 * line opens a paragraph, and a single newline separates units inside one paragraph. Readers
 * historically split on the blank line only, so the single newlines survived into one text node
 * where `white-space: pre-line` rendered them with no space between — at 390px that reads as an
 * unbroken column.
 *
 * This is a display-time regrouping. The stored body is never rewritten, which matters because
 * paid section bodies are fingerprinted.
 */
export function parseReportBodyBlocks(body: string): ReportBodyBlock[] {
  const blocks: ReportBodyBlock[] = [];
  let current: ReportBodyBlock | null = null;
  for (const raw of normalizePaidReportPublicDisplayText(body).split('\n')) {
    const unit = raw.trim();
    if (!unit) continue;
    const label = /^【(.+?)】$/.exec(unit)?.[1];
    if (label != null) {
      current = { label, units: [] };
      blocks.push(current);
      continue;
    }
    const labelIsSpent =
      current?.label != null &&
      INDIVIDUALIZATION_BLOCK_LABEL.test(current.label) &&
      current.units.length > 0;
    if (current == null || labelIsSpent) {
      current = { label: null, units: [] };
      blocks.push(current);
    }
    current.units.push(unit);
  }
  return blocks;
}
