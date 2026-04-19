'use client';

/**
 * Post-purchase bridge: promote free-tier local snapshot (device key) → Clerk user key,
 * then replace to Entry Report. SSOT: same inputs user saw on /core before checkout.
 */
import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { promoteGuestProfileToClerkUser } from '../../../lib/soul/profile';
import { promoteGuestCoreSnapshotToClerkUser } from '../../../lib/m55/coreResult/store';

const DTR_CORE_DEST = '/dtr/core?post_purchase=1';
const ENTRY_RIGHT = 'm55_p:core_origin';
const POLL_MS = 3000;
const MAX_POLLS = 40;

export function PurchaseSuccessBridge({
  entitlementInitiallyReady,
}: {
  entitlementInitiallyReady: boolean;
}) {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !userId) return;
    let cancelled = false;

    promoteGuestProfileToClerkUser(userId);
    promoteGuestCoreSnapshotToClerkUser(userId);
    try {
      window.dispatchEvent(new Event('m55:profile_updated'));
    } catch {
      /* no-op */
    }

    const go = () => {
      if (cancelled) return;
      router.replace(DTR_CORE_DEST);
    };

    if (entitlementInitiallyReady) {
      const t = window.setTimeout(go, 400);
      return () => {
        cancelled = true;
        window.clearTimeout(t);
      };
    }

    let polls = 0;
    let timeoutId: number | undefined;

    const poll = async () => {
      if (cancelled) return;
      polls += 1;
      try {
        const r = await fetch('/api/me/entitlements', { cache: 'no-store' });
        if (r.ok) {
          const d = (await r.json()) as { dtr_rights?: string[] };
          if (d.dtr_rights?.includes(ENTRY_RIGHT)) {
            go();
            return;
          }
        }
      } catch {
        /* retry */
      }
      if (cancelled) return;
      if (polls >= MAX_POLLS) {
        go();
        return;
      }
      timeoutId = window.setTimeout(() => {
        void poll();
      }, POLL_MS);
    };

    timeoutId = window.setTimeout(() => {
      void poll();
    }, 0);

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [isLoaded, userId, entitlementInitiallyReady, router]);

  return null;
}
