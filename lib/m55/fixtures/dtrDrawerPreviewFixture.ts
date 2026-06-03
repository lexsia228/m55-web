/**
 * Local dev-only fixture for /dev/dtr-drawer-preview.
 * Deterministic v2 envelope — no DB, entitlement, or checkout.
 */
import { buildV2FulfillmentSnapshotFromFields } from '../compositeStem/buildV2FulfillmentSnapshot';
import type { DtrEnvelope } from '../dtrEngine';
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

const built = buildV2FulfillmentSnapshotFromFields({ ...PREVIEW_PROFILE });

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
  consultWallet?: string
) {
  const consultDevPreviewRoomData: ConsultRoomPreviewRoomData | undefined = withConsult
    ? getConsultRoomPreviewRoomData(resolveConsultRoomPreviewScenario(consultWallet))
    : undefined;

  return {
    ownershipType: 'owned',
    aiConsultIncluded: withConsult,
    expiresAt: null as string | null,
    purchasedSnapshot: DTR_DRAWER_PREVIEW_PURCHASED_SNAPSHOT,
    consultDevPreviewRoomData,
  };
}
