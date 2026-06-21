'use client';

/**
 * Post-purchase: device-local profile → Clerk; optional polling until entitlements reflect.
 * Does not navigate to /dtr/core — user uses primary CTA (audit: reward screen stays).
 */
import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
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
  const [pollStuck, setPollStuck] = useState(false);

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

    if (entitlementInitiallyReady) {
      return () => {
        cancelled = true;
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
            cancelled = true;
            return;
          }
        }
      } catch {
        /* retry */
      }
      if (cancelled) return;
      if (polls >= MAX_POLLS) {
        setPollStuck(true);
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
  }, [isLoaded, userId, entitlementInitiallyReady]);

  if (pollStuck) {
    return (
      <p
        role="alert"
        style={{
          margin: '0 0 16px',
          fontSize: 13,
          lineHeight: 1.65,
          color: '#5a4ea0',
        }}
      >
        権限の反映に時間がかかっています。マイページで状態を確認するか、しばらくしてから
        <a href={DTR_CORE_DEST} style={{ color: '#6b5fa8', marginLeft: 4 }}>
          保存版を開く
        </a>
        を再度お試しください。
      </p>
    );
  }

  return null;
}
