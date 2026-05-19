/**
 * Server-only: unified DTR shelf / LP access state (ownership + snapshotReady + CTA routing).
 * Keeps resolveEntryReportOwnership semantics; separates purchase CTA from owned-not-ready paths.
 */
import { DTR_CORE_STATIC_V1 } from '../oneTimeCheckout';
import { getDtrReportSnapshot } from './dtrDraftDb';
import {
  resolveEntryReportOwnership,
  type DtrUnlockState,
} from './dtrOwnershipGate';

/** Owned user without snapshot: poll ready API — not Stripe checkout processing. */
export const DTR_OWNED_RECOVERY_PROCESSING_PATH = '/dtr/processing?recovery=owned';

export type DtrShelfUxState =
  | 'auth_required'
  | 'unpaid_locked'
  | 'owned_snapshot_ready'
  | 'owned_snapshot_not_ready'
  | 'owned_snapshot_lookup_error'
  | 'expired'
  | 'error_unknown';

export type DtrLpCtaMode = 'signin' | 'expired' | 'purchase' | 'open' | 'pending' | 'recovery';

export type DtrShelfCta = {
  href: string;
  label: string;
  ariaLabel: string;
};

export type DtrShelfAccess = {
  uxState: DtrShelfUxState;
  unlockState: DtrUnlockState;
  snapshotReady: boolean;
  showPurchaseCta: boolean;
  lpCtaMode: DtrLpCtaMode;
  shelfCta: DtrShelfCta;
};

export type DtrShelfAccessResolved =
  | {
      kind: 'anonymous';
      ownershipState: 'anonymous';
      snapshotReady: false;
      showPurchaseCta: false;
      lpCtaMode: 'signin';
      shelfCta: DtrShelfCta;
    }
  | ({
      kind: 'authenticated';
      ownershipState: 'owned' | 'locked' | 'expired';
    } & DtrShelfAccess);

function shelfCtaForLocked(): DtrShelfCta {
  return {
    href: '/dtr/lp',
    label: '1,000円で入手する',
    ariaLabel: 'Entry Report — 入手する',
  };
}

function shelfCtaForExpired(): DtrShelfCta {
  return {
    href: '/dtr/lp?state=expired',
    label: 'サポートに相談する',
    ariaLabel: 'Entry Report — 期限切れ',
  };
}

function shelfCtaForOwnedReady(): DtrShelfCta {
  return {
    href: '/dtr/core',
    label: 'レポートを開く',
    ariaLabel: 'Entry Report — 保存済み。レポートを開く',
  };
}

function shelfCtaForOwnedNotReady(): DtrShelfCta {
  return {
    href: DTR_OWNED_RECOVERY_PROCESSING_PATH,
    label: '準備状況を確認する',
    ariaLabel: 'Entry Report — 保存済み。レポートの準備状況を確認する',
  };
}

function buildAuthenticated(
  unlockState: DtrUnlockState,
  snapshotReady: boolean,
  uxState: DtrShelfUxState
): Extract<DtrShelfAccessResolved, { kind: 'authenticated' }> {
  if (unlockState === 'expired') {
    return {
      kind: 'authenticated',
      ownershipState: 'expired',
      uxState: 'expired',
      unlockState: 'expired',
      snapshotReady: false,
      showPurchaseCta: false,
      lpCtaMode: 'expired',
      shelfCta: shelfCtaForExpired(),
    };
  }

  if (unlockState === 'locked') {
    return {
      kind: 'authenticated',
      ownershipState: 'locked',
      uxState: 'unpaid_locked',
      unlockState: 'locked',
      snapshotReady: false,
      showPurchaseCta: true,
      lpCtaMode: 'purchase',
      shelfCta: shelfCtaForLocked(),
    };
  }

  if (snapshotReady) {
    return {
      kind: 'authenticated',
      ownershipState: 'owned',
      uxState: 'owned_snapshot_ready',
      unlockState: 'owned',
      snapshotReady: true,
      showPurchaseCta: false,
      lpCtaMode: 'open',
      shelfCta: shelfCtaForOwnedReady(),
    };
  }

  return {
    kind: 'authenticated',
    ownershipState: 'owned',
    uxState,
    unlockState: 'owned',
    snapshotReady: false,
    showPurchaseCta: false,
    lpCtaMode: 'recovery',
    shelfCta: shelfCtaForOwnedNotReady(),
  };
}

export async function resolveDtrShelfAccess(
  userId: string | null
): Promise<DtrShelfAccessResolved> {
  if (!userId) {
    return {
      kind: 'anonymous',
      ownershipState: 'anonymous',
      snapshotReady: false,
      showPurchaseCta: false,
      lpCtaMode: 'signin',
      shelfCta: {
        href: '/dtr/lp',
        label: '1,000円で入手する',
        ariaLabel: 'Entry Report — 入手する',
      },
    };
  }

  try {
    const ownership = await resolveEntryReportOwnership(userId);
    const unlockState = ownership.unlockState;

    if (unlockState !== 'owned') {
      return buildAuthenticated(unlockState, false, unlockState === 'expired' ? 'expired' : 'unpaid_locked');
    }

    const snap = await getDtrReportSnapshot(userId, DTR_CORE_STATIC_V1);
    const snapshotReady = snap != null;
    const uxState: DtrShelfUxState = snapshotReady
      ? 'owned_snapshot_ready'
      : 'owned_snapshot_not_ready';

    return buildAuthenticated('owned', snapshotReady, uxState);
  } catch {
    return {
      kind: 'authenticated',
      uxState: 'error_unknown',
      ownershipState: 'locked',
      unlockState: 'locked',
      snapshotReady: false,
      showPurchaseCta: false,
      shelfCta: {
        href: '/support',
        label: 'サポートに相談する',
        ariaLabel: 'Entry Report — 接続を確認できませんでした',
      },
      lpCtaMode: 'recovery',
    };
  }
}

/** LP / API: never return purchase when user is owned. */
export function lpCtaModeFromAccess(
  access: DtrShelfAccessResolved,
  isExpiredParam: boolean
): DtrLpCtaMode {
  if (access.kind === 'anonymous') return 'signin';
  if (isExpiredParam || access.unlockState === 'expired') return 'expired';
  return access.lpCtaMode;
}
