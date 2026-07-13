import {
  PRODUCT_INTERNAL_NAME,
  PRODUCT_PUBLIC_NAME,
  SAFETY_PROFILE,
} from './pairReadingCatalog.v1';
import {
  COMPATIBILITY_GUEST_DEFAULT_STATE,
  isCompleteCompatibilityGuestInput,
  type CompatibilityGuestInput,
} from './pairReadingGuestContract';
import {
  isCompleteCompatibilityCurrentContext,
  type CompatibilityCurrentContextAnswers,
} from './currentContextContract.v1';
import { GUEST_TOPIC_BY_PAIR_AXIS } from './pairReadingGuestResult';
import { derivePairAxisId } from './pairReadingFingerprint';
import { renderPairReading } from './pairReadingRenderer';
import type { PairReadingInput } from './pairReadingTypes';
import {
  buildPaidCompatibilityReportV1,
  type PaidCompatibilityReportSnapshot,
} from './buildPaidCompatibilityReportV1';

export type CanonicalCompatibilityPurchaseSnapshotResult =
  | { ok: true; snapshot: PaidCompatibilityReportSnapshot }
  | { ok: false; reason: 'invalid_input' | 'render_failed' };

/**
 * DOB values are transient inputs only. The returned snapshot contains semantic
 * copy and chapter keys, never DOB values, hashes, names, or account identifiers.
 */
export function buildCanonicalCompatibilityPurchaseSnapshot(
  input: CompatibilityGuestInput,
  currentContext: CompatibilityCurrentContextAnswers,
): CanonicalCompatibilityPurchaseSnapshotResult {
  if (
    !isCompleteCompatibilityGuestInput(input) ||
    !isCompleteCompatibilityCurrentContext(currentContext)
  ) {
    return { ok: false, reason: 'invalid_input' };
  }
  const pairAxisId = derivePairAxisId(input.personA, input.personB);
  const paidTopicId = GUEST_TOPIC_BY_PAIR_AXIS[pairAxisId];
  const pairInput: PairReadingInput = {
    schemaVersion: 'pair_reading_input_v1',
    personA: { role: 'personA', birthDate: input.personA },
    personB: { role: 'personB', birthDate: input.personB },
    relationStatusId: COMPATIBILITY_GUEST_DEFAULT_STATE.relationStatusId,
    paidTopicId,
    temperatureId: COMPATIBILITY_GUEST_DEFAULT_STATE.temperatureId,
    pairAxisOverride: pairAxisId,
    productInternalName: PRODUCT_INTERNAL_NAME,
    productPublicName: PRODUCT_PUBLIC_NAME,
    safetyProfile: SAFETY_PROFILE,
  };
  const rendered = renderPairReading(pairInput);
  if (!rendered.ok) {
    return {
      ok: false,
      reason: rendered.code === 'invalid_dob' ? 'invalid_input' : 'render_failed',
    };
  }

  return {
    ok: true,
    snapshot: buildPaidCompatibilityReportV1({
      pairAxisId,
      paidTopicId,
      relationStatusId: pairInput.relationStatusId,
      temperatureId: pairInput.temperatureId ?? 'E0',
      personAUsesFirstPerspective:
        rendered.pairFingerprint.personADobHash <=
        rendered.pairFingerprint.personBDobHash,
      currentContext,
    }),
  };
}
