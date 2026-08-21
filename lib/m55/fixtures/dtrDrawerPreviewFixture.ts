/**
 * Local dev-only fixture for /dev/dtr-drawer-preview.
 * Deterministic v2 envelope — no DB, entitlement, or checkout.
 */
import { buildV2FulfillmentSnapshotFromFields } from '../compositeStem/buildV2FulfillmentSnapshot';
import type { DtrEnvelope } from '../dtrEngine';
import { buildPremiumPurchasedSemanticProjectionV1 } from '../narrative/buildPremiumPurchasedSemanticProjectionV1';
import { buildPurchaseInputSnapshotV1 } from '../paidResult/purchaseInputSnapshotV1';
import { DTR_CORE_LIGHT_V1 } from '../../oneTimeCheckout';
import {
  getConsultRoomPreviewRoomData,
  resolveConsultRoomPreviewScenario,
  type ConsultRoomPreviewRoomData,
} from './consultRoomPreviewFixture';

const PREVIEW_PROFILE = {
  nickname: 'Preview',
  birthDate: '1983-02-28',
  birthTime: '12:00',
  birthTimeUnknown: false,
  country: 'JP',
  birthplace: '東京都',
  timezone: 'Asia/Tokyo',
} as const;

const PREVIEW_FREE_ANSWERS = {
  'free.start_style': 'free.start_style.map_first',
  'free.decision_style': 'free.decision_style.sort_first',
  'free.recovery_style': 'free.recovery_style.pause_short',
  'free.distance_style': 'free.distance_style.close_careful',
  'free.change_style': 'free.change_style.observe_first',
  'free.primary_theme': 'free.primary_theme.work',
} as const;

const PREVIEW_PAID_ANSWERS = {
  'paid.work_focus': 'paid.work_focus.priority',
  'paid.decision_friction': 'paid.decision_friction.too_many',
  'paid.relation_focus': 'paid.relation_focus.words',
  'paid.fatigue_signal': 'paid.fatigue_signal.after_push',
  'paid.recovery_sequence': 'paid.recovery_sequence.pause_first',
  'paid.restart_condition': 'paid.restart_condition.overview_first',
} as const;

const previewFoundation = buildV2FulfillmentSnapshotFromFields({ ...PREVIEW_PROFILE });

function buildDeterministicPreviewPurchaseInput() {
  const stemLaneIndex = previewFoundation.envelope_json.auditMeta.stemLaneIndex;
  const purchaseInput = buildPurchaseInputSnapshotV1({
    userId: 'user_dtr_drawer_preview',
    productId: DTR_CORE_LIGHT_V1,
    profile: { ...PREVIEW_PROFILE },
    freeAnswerSet: PREVIEW_FREE_ANSWERS,
    paidAnswerSet: PREVIEW_PAID_ANSWERS,
    stemLaneIndex,
    createdAt: '2026-08-21T00:00:00.000Z',
  });
  if (!purchaseInput.ok) {
    throw new Error(`dtr_drawer_preview_purchase_input:${purchaseInput.code}`);
  }
  return purchaseInput.value;
}

const previewPurchaseInput = buildDeterministicPreviewPurchaseInput();
const built = buildV2FulfillmentSnapshotFromFields(
  { ...PREVIEW_PROFILE },
  { purchaseInput: previewPurchaseInput },
);

function buildDeterministicPreviewProjection() {
  const stemLaneIndex = built.envelope_json.auditMeta.stemLaneIndex;
  const projection = buildPremiumPurchasedSemanticProjectionV1({
    purchaseInput: previewPurchaseInput,
    stemLaneIndex,
  });
  if (!projection.ok) {
    throw new Error(`dtr_drawer_preview_projection:${projection.code}`);
  }
  return projection.value;
}

export const DTR_DRAWER_PREVIEW_PURCHASED_SNAPSHOT: {
  envelope: DtrEnvelope;
  profile: { nickname: string; birthDate: string };
} = {
  envelope: built.envelope_json,
  profile: {
    nickname: built.profile_snapshot.nickname,
    birthDate: built.profile_snapshot.birthDate,
  },
};

export function getDtrDrawerPreviewReaderProps(
  withConsult: boolean,
  consultWallet?: string,
  withProjection = false,
) {
  const consultDevPreviewRoomData: ConsultRoomPreviewRoomData | undefined = withConsult
    ? getConsultRoomPreviewRoomData(resolveConsultRoomPreviewScenario(consultWallet))
    : undefined;

  return {
    ownershipType: 'owned',
    aiConsultIncluded: withConsult,
    expiresAt: null as string | null,
    purchasedSnapshot: DTR_DRAWER_PREVIEW_PURCHASED_SNAPSHOT,
    premiumProjection: withProjection ? buildDeterministicPreviewProjection() : null,
    consultDevPreviewRoomData,
  };
}
