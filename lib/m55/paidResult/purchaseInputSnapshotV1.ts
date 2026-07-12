/**
 * Immutable purchase input snapshot — server-side draft extra_json SSOT.
 * No generated prose at checkout initiation.
 */
import { PAID_QUESTION_IDS, FREE_QUESTION_IDS } from '../individualization/answerIdMapsV1';
import {
  buildIndividualizationDraftSnapshotV1,
  type BuildDraftInput,
} from '../individualization/buildIndividualizationV1';
import type { IndividualizationDraft } from '../individualization/types';
import {
  DOB_PERSONALIZATION_V21_CATALOG_VERSION,
} from '../dtrDobPersonalizationV2';
import { ENGINE_VERSION_V2 } from '../compositeStem/constants';
import { hashOpaqueUserRef } from './stripeOpaqueCheckoutRefs';

export const PURCHASE_INPUT_SNAPSHOT_VERSION = 'pis-v1' as const;

export type NormalizedPurchaseProfileV1 = {
  nickname: string;
  birthDate: string;
  birthTime?: string | null;
  birthTimeUnknown?: boolean;
  country?: string;
  birthplace?: string | null;
  timezone?: string | null;
};

export type PurchaseInputSnapshotV1 = {
  version: typeof PURCHASE_INPUT_SNAPSHOT_VERSION;
  createdAt: string;
  ownerRef: string;
  productId: string;
  normalizedProfile: NormalizedPurchaseProfileV1;
  freeAnswerSet: Record<string, string>;
  paidAnswerSet: Record<string, string>;
  questionnaireVersions: {
    free: 'free-v1';
    paid: 'paid-v1';
  };
  individualization: IndividualizationDraft;
  frozen: true;
};

const REPORT_LOGIC_VERSION = 'dtr-saved-report-v1';

export function isCompleteFreeAnswerSet(answers: Record<string, string>): boolean {
  return FREE_QUESTION_IDS.every((id) => Boolean(answers[id]));
}

export function isCompletePaidAnswerSet(answers: Record<string, string>): boolean {
  return PAID_QUESTION_IDS.every((id) => Boolean(answers[id]));
}

export type BuildPurchaseInputSnapshotInput = {
  userId: string;
  productId: string;
  profile: NormalizedPurchaseProfileV1;
  freeAnswerSet: Record<string, string>;
  paidAnswerSet: Record<string, string>;
  stemLaneIndex: number;
  createdAt?: string;
};

export function buildPurchaseInputSnapshotV1(
  input: BuildPurchaseInputSnapshotInput,
): { ok: true; value: PurchaseInputSnapshotV1 } | { ok: false; code: string } {
  if (!input.profile.nickname?.trim() || !input.profile.birthDate) {
    return { ok: false, code: 'profile_incomplete' };
  }
  if (!isCompleteFreeAnswerSet(input.freeAnswerSet)) {
    return { ok: false, code: 'free_answers_incomplete' };
  }
  if (!isCompletePaidAnswerSet(input.paidAnswerSet)) {
    return { ok: false, code: 'paid_answers_incomplete' };
  }

  const draftInput: BuildDraftInput = {
    birthDate: input.profile.birthDate,
    stemLaneIndex: input.stemLaneIndex,
    freeAnswerSet: input.freeAnswerSet,
    paidAnswerSet: input.paidAnswerSet,
    engineVersion: ENGINE_VERSION_V2,
    catalogVersion: DOB_PERSONALIZATION_V21_CATALOG_VERSION,
    reportLogicVersion: REPORT_LOGIC_VERSION,
    generatedAt: input.createdAt ?? new Date().toISOString(),
  };

  const built = buildIndividualizationDraftSnapshotV1(draftInput);
  if (!built.ok) {
    return { ok: false, code: built.code };
  }

  return {
    ok: true,
    value: {
      version: PURCHASE_INPUT_SNAPSHOT_VERSION,
      createdAt: draftInput.generatedAt,
      ownerRef: hashOpaqueUserRef(input.userId),
      productId: input.productId,
      normalizedProfile: input.profile,
      freeAnswerSet: { ...input.freeAnswerSet },
      paidAnswerSet: { ...input.paidAnswerSet },
      questionnaireVersions: { free: 'free-v1', paid: 'paid-v1' },
      individualization: built.value,
      frozen: true,
    },
  };
}

export function readPurchaseInputSnapshotV1(
  extra: Record<string, unknown> | null | undefined,
): PurchaseInputSnapshotV1 | null {
  const raw = extra?.purchaseInputV1;
  if (!raw || typeof raw !== 'object') return null;
  const snap = raw as PurchaseInputSnapshotV1;
  if (snap.version !== PURCHASE_INPUT_SNAPSHOT_VERSION) return null;
  if (!snap.frozen) return null;
  if (!snap.individualization?.audit?.outputHash) return null;
  return snap;
}

export function assertPurchaseInputSnapshotImmutable(
  before: PurchaseInputSnapshotV1,
  after: PurchaseInputSnapshotV1,
): boolean {
  return (
    before.createdAt === after.createdAt &&
    before.ownerRef === after.ownerRef &&
    before.individualization.audit.outputHash === after.individualization.audit.outputHash
  );
}

export function purchaseInputExtraJson(
  snapshot: PurchaseInputSnapshotV1,
  existing: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  return {
    ...(existing ?? {}),
    purchaseInputV1: snapshot,
    individualization: snapshot.individualization,
  };
}
