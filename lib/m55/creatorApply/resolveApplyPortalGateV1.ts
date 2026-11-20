import 'server-only';
import { getCreatorPortal } from '../creatorDistribution/repository';

export type ApplyPortalGateV1 =
  | { kind: 'portal_unavailable' }
  | { kind: 'no_profile' }
  | { kind: 'has_profile'; profileStatus: string };

export async function resolveApplyPortalGateV1(userId: string): Promise<ApplyPortalGateV1> {
  try {
    const portal = await getCreatorPortal(userId);
    const profileRow = portal.profile as { status?: string } | null;
    const status = profileRow?.status;
    if (status && typeof status === 'string') {
      return { kind: 'has_profile', profileStatus: status };
    }
    return { kind: 'no_profile' };
  } catch {
    return { kind: 'portal_unavailable' };
  }
}