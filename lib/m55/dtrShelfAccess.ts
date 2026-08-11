/**
 * Server-only: unified DTR shelf / LP access state (ownership + snapshotReady + CTA routing).
 * Keeps resolveEntryReportOwnership semantics; separates purchase CTA from owned-not-ready paths.
 */
import { ariaLabelForDtrShelf, MY_SAVED_REPORT_CTA_OPEN_LABEL, MY_SAVED_REPORT_CTA_PLAN_LABEL } from './dtrProductLabels';
import { PAID_DTR_LP } from './paidDtrProductCopy';
import { deriveLockedShelfStemPreviewFromDraft } from './compositeStem/deriveLockedShelfStemPreview';
import {
  getLatestDraftForUser,
} from './dtrDraftDb';
import {
  resolveEntryReportOwnership,
  type DtrUnlockState,
} from './dtrOwnershipGate';
import {
  getVisibleSavedReportSnapshot,
  hasHiddenOnlySavedReportSnapshot,
} from './dtrSavedReportOwnership';
import { deriveDtrShelfStemDisplayFromSnapshot } from './compositeStem/deriveDisplayedDtrShelfStem';
import type { DtrShelfStemDisplay } from './dtrShelfStemDisplay';

export type { DtrShelfStemDisplay };

/** Owned user without snapshot: poll ready API — not Stripe checkout processing. */
export const DTR_OWNED_RECOVERY_PROCESSING_PATH = '/dtr/processing?recovery=owned';

/** Owned + hidden-only (user 削除): repurchase CTA on LP — not indefinite owned-recovery poll. */
export const DTR_HIDDEN_ONLY_REPURCHASE_LP_PATH = '/dtr/lp?repurchase=1';

/**
 * Owned entitlement with no visible snapshot but at least one hidden row (soft-hide / 削除後).
 * Not for UI envelope display.
 */
export async function isDtrOwnedHiddenOnlyState(userId: string): Promise<boolean> {
  return hasHiddenOnlySavedReportSnapshot(userId);
}

function shelfCtaForHiddenOnlyRepurchase(): DtrShelfCta {
  return {
    href: DTR_HIDDEN_ONLY_REPURCHASE_LP_PATH,
    label: '新しいプレミアムレポートを作成する',
    ariaLabel: ariaLabelForDtrShelf('purchase', true),
  };
}

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
      /** Present when owned and snapshot row exists — shelf type must match /dtr/core. */
      ownedShelfDisplay: DtrShelfStemDisplay | null;
      /** Pre-purchase locked shelf: v2 composite preview from server draft only. */
      lockedShelfDisplay: DtrShelfStemDisplay | null;
    } & DtrShelfAccess);

function shelfCtaForLocked(): DtrShelfCta {
  return {
    href: '/dtr/lp',
    label: MY_SAVED_REPORT_CTA_PLAN_LABEL,
    ariaLabel: ariaLabelForDtrShelf('purchase', false),
  };
}

function shelfCtaForExpired(): DtrShelfCta {
  return {
    href: '/dtr/lp?state=expired',
    label: PAID_DTR_LP.operational.ownedState.supportCtaJa,
    ariaLabel: ariaLabelForDtrShelf('expired', false),
  };
}

function shelfCtaForOwnedReady(): DtrShelfCta {
  return {
    href: '/dtr/core',
    label: MY_SAVED_REPORT_CTA_OPEN_LABEL,
    ariaLabel: ariaLabelForDtrShelf('open_ready', true),
  };
}

function shelfCtaForOwnedNotReady(): DtrShelfCta {
  return {
    href: DTR_OWNED_RECOVERY_PROCESSING_PATH,
    label: '準備状況を確認する',
    ariaLabel: ariaLabelForDtrShelf('open_not_ready', true),
  };
}

function buildAuthenticated(
  unlockState: DtrUnlockState,
  snapshotReady: boolean,
  uxState: DtrShelfUxState,
  ownedShelfDisplay: DtrShelfStemDisplay | null,
  hiddenOnlyRepurchase = false,
  lockedShelfDisplay: DtrShelfStemDisplay | null = null,
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
      ownedShelfDisplay: null,
      lockedShelfDisplay: null,
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
      ownedShelfDisplay: null,
      lockedShelfDisplay,
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
      ownedShelfDisplay,
      lockedShelfDisplay: null,
    };
  }

  if (hiddenOnlyRepurchase) {
    return {
      kind: 'authenticated',
      ownershipState: 'owned',
      uxState: 'owned_snapshot_not_ready',
      unlockState: 'owned',
      snapshotReady: false,
      showPurchaseCta: true,
      lpCtaMode: 'purchase',
      shelfCta: shelfCtaForHiddenOnlyRepurchase(),
      ownedShelfDisplay: null,
      lockedShelfDisplay: null,
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
    ownedShelfDisplay: null,
    lockedShelfDisplay: null,
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
        label: MY_SAVED_REPORT_CTA_PLAN_LABEL,
        ariaLabel: ariaLabelForDtrShelf('purchase', false),
      },
    };
  }

  try {
    const ownership = await resolveEntryReportOwnership(userId);
    const unlockState = ownership.unlockState;

    if (unlockState !== 'owned') {
      let lockedShelfDisplay: DtrShelfStemDisplay | null = null;
      if (unlockState === 'locked') {
        const draft = await getLatestDraftForUser(userId);
        lockedShelfDisplay = deriveLockedShelfStemPreviewFromDraft(draft);
      }
      return buildAuthenticated(
        unlockState,
        false,
        unlockState === 'expired' ? 'expired' : 'unpaid_locked',
        null,
        false,
        lockedShelfDisplay,
      );
    }

    const snap = await getVisibleSavedReportSnapshot(userId);
    const snapshotReady = snap != null;
    const ownedShelfDisplay = snap ? deriveDtrShelfStemDisplayFromSnapshot(snap) : null;
    const uxState: DtrShelfUxState = snapshotReady
      ? 'owned_snapshot_ready'
      : 'owned_snapshot_not_ready';
    let hiddenOnlyRepurchase = false;
    if (!snapshotReady) {
      hiddenOnlyRepurchase = await hasHiddenOnlySavedReportSnapshot(userId);
    }

    return buildAuthenticated(
      'owned',
      snapshotReady,
      uxState,
      ownedShelfDisplay,
      hiddenOnlyRepurchase,
    );
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
        label: PAID_DTR_LP.operational.ownedState.supportCtaJa,
        ariaLabel: ariaLabelForDtrShelf('connection_error', false),
      },
      lpCtaMode: 'recovery',
      ownedShelfDisplay: null,
      lockedShelfDisplay: null,
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
