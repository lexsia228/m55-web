'use client';

import { useEffect, useState } from 'react';

type ContinueState =
  | { status: 'pending' }
  | { status: 'success'; outcome: string }
  | { status: 'error'; error: string };

export default function CreatorTouchContinuePage() {
  const [state, setState] = useState<ContinueState>({ status: 'pending' });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch('/api/m55/attribution/creator-touch/continue', {
          method: 'POST',
          credentials: 'include',
        });
        const payload = (await response.json()) as { outcome?: string; error?: string };
        if (cancelled) return;
        if (!response.ok) {
          setState({ status: 'error', error: payload.error ?? 'CONTINUATION_FAILED' });
          return;
        }
        setState({ status: 'success', outcome: payload.outcome ?? 'UNKNOWN' });
      } catch {
        if (!cancelled) {
          setState({ status: 'error', error: 'NETWORK_ERROR' });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'pending') {
    return <main>続行処理を確認しています…</main>;
  }
  if (state.status === 'success') {
    return <main>紹介の記録が完了しました。</main>;
  }
  return <main>続行できませんでした。もう一度リンクからお試しください。</main>;
}
