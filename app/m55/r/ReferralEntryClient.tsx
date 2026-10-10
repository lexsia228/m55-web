'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type EntryState =
  | { status: 'pending' }
  | { status: 'error'; message: string }
  | { status: 'continue' };

export function ReferralEntryClient() {
  const router = useRouter();
  const [state, setState] = useState<EntryState>({ status: 'pending' });

  useEffect(() => {
    let cancelled = false;
    const hash = window.location.hash;
    if (hash.length > 1) {
      try {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      } catch {
        // ignore
      }
    }
    const token = hash.startsWith('#') ? hash.slice(1) : '';
    if (!token) {
      setState({ status: 'error', message: 'リンクを確認できませんでした。' });
      return;
    }

    void (async () => {
      try {
        const response = await fetch('/api/m55/attribution/creator-touch', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        if (!response.ok) {
          setState({ status: 'error', message: '記録を開始できませんでした。' });
          return;
        }
        setState({ status: 'continue' });
        router.replace('/m55/attribution/creator-touch/continue');
      } catch {
        if (!cancelled) {
          setState({ status: 'error', message: '接続できませんでした。' });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state.status === 'pending') {
    return <main>リンクを確認しています…</main>;
  }
  if (state.status === 'continue') {
    return <main>続行しています…</main>;
  }
  return <main>{state.message}</main>;
}
