import type { DtrShelfStemDisplay } from '../dtrShelfStemDisplay';
import { TEN_STEM_DISPLAY } from '../tenStemCatalog';
import { resolveDisplayedDtrEnvelope } from './resolveDisplayedDtrEnvelope';
import type { DtrReportSnapshotReadRow } from './storedEnvelopeRead';

/** Shelf stem from displayed envelope — never client ProfileRepository when owned. */
export function deriveDtrShelfStemDisplayFromSnapshot(
  row: DtrReportSnapshotReadRow,
): DtrShelfStemDisplay | null {
  const read = resolveDisplayedDtrEnvelope(row);
  if (!read.ok) return null;
  const stem = TEN_STEM_DISPLAY[read.envelope.auditMeta.stemLaneIndex];
  if (!stem) return null;
  return {
    stemLaneIndex: read.envelope.auditMeta.stemLaneIndex,
    publicTitle: stem.publicTitle,
    displayOneLine: stem.displayOneLine,
    nickname: read.profile.nickname,
  };
}
