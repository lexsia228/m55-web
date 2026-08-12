'use client';

import { useCallback, useState } from 'react';
import { DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1 } from '../../lib/oneTimeCheckout';
import { DTR_LIGHT_TO_FULL_UPGRADE_CTA_LABEL } from '../../lib/m55/dtrProductLabels';

function messageForUpgradeCheckoutError(code: string | undefined): string {
  switch (code) {
    case 'unauthenticated':
      return 'ログインが必要です。';
    case 'forbidden_not_owner':
      return 'プレミアムレポートの確認ができませんでした。';
    case 'wallet_not_found':
    case 'wallet_not_active':
      return '追加読み解きの準備が完了していません。しばらくしてからお試しください。';
    case 'cap_reached':
      return 'すでにフル相当のご利用枠です。';
    case 'invalid_product':
    case 'invalid_request':
      return 'この購入は現在ご利用いただけません。';
    case 'stripe_error':
      return '決済の準備に失敗しました。しばらくしてからお試しください。';
    default:
      return '通信に失敗しました。時間をおいてもう一度お試しください。';
  }
}

export type LightToFullUpgradeButtonProps = {
  reportInstanceId: string;
  className?: string;
  label?: string;
};

export default function LightToFullUpgradeButton({
  reportInstanceId,
  className,
  label = DTR_LIGHT_TO_FULL_UPGRADE_CTA_LABEL,
}: LightToFullUpgradeButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    const rid = reportInstanceId.trim();
    if (!rid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/reply-tickets/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportInstanceId: rid,
          productKey: DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1,
        }),
      });
      let data: unknown = {};
      try {
        data = await res.json();
      } catch {
        setError(messageForUpgradeCheckoutError(undefined));
        return;
      }
      if (!res.ok) {
        const code = (data as { error?: { code?: string } })?.error?.code;
        setError(messageForUpgradeCheckoutError(code));
        return;
      }
      const checkoutUrl = (data as { checkout_url?: string }).checkout_url;
      if (typeof checkoutUrl === 'string' && checkoutUrl.length > 0) {
        window.location.assign(checkoutUrl);
        return;
      }
      setError('決済の準備に失敗しました。もう一度お試しください。');
    } catch {
      setError(messageForUpgradeCheckoutError(undefined));
    } finally {
      setBusy(false);
    }
  }, [reportInstanceId, busy]);

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={className}
        aria-busy={busy}
        data-testid="m55-light-to-full-upgrade-cta"
      >
        {busy ? '購入状況を確認しています…' : label}
      </button>
      {error && (
        <p role="alert" style={{ marginTop: 8, fontSize: 13, color: '#8b3a3a', lineHeight: 1.55 }}>
          {error}
        </p>
      )}
    </div>
  );
}
