import { createHash } from 'node:crypto';

export const M55_R7_DISPLAY_REFERENCE_PURPOSE_V1 = 'm55.r7.creator.display_ref.v1' as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function deriveDisplayReferenceV1(immutableUuid: string): string {
  if (!UUID_RE.test(immutableUuid)) {
    throw new Error('INVALID_DISPLAY_REFERENCE_SOURCE');
  }
  const digest = createHash('sha256')
    .update(M55_R7_DISPLAY_REFERENCE_PURPOSE_V1, 'utf8')
    .update('\0', 'utf8')
    .update(immutableUuid.toLowerCase(), 'utf8')
    .digest('hex');
  return `m55dr1.${digest.slice(0, 24)}`;
}
