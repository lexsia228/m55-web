'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ProfileRepository } from '../lib/soul/profile';

/**
 * productId → 環境変数マッピング
 * DTR_CORE_STATIC_V1 は STRIPE_PRICE_DTR_CORE_STATIC_V1 を参照
 */
const PRODUCT_ID_TO_ENV: Record<string, string> = {
  DTR_CORE_STATIC_V1: 'STRIPE_PRICE_DTR_CORE_STATIC_V1',
};

export type PurchaseButtonProps = {
  productId: string;
  children?: React.ReactNode;
  className?: string;
};

/**
 * 購入ボタン
 * productId を受け取り、/api/purchase/checkout へ productId を送信して Stripe Checkout へリダイレクト
 */
export default function PurchaseButton({
  productId,
  children = '購入する',
  className,
}: PurchaseButtonProps) {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [checkout409, setCheckout409] = useState<
    null | { code: 'already_purchased' | 'fulfillment_pending' }
  >(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    setNeedsSignIn(false);
    setCheckout409(null);
    try {
      const profile =
        userId ? ProfileRepository.get(userId) : null;
      const payload: { productId: string; profile?: { nickname: string; birthDate: string } } = {
        productId,
      };
      if (profile?.birthDate && profile.nickname?.trim()) {
        payload.profile = {
          nickname: profile.nickname.trim(),
          birthDate: profile.birthDate,
        };
      }
      const res = await fetch('/api/purchase/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      // 401: raw "Unauthorized" を出さず、ログイン導線に切り替える
      if (res.status === 401) {
        setNeedsSignIn(true);
        setLoading(false);
        return;
      }
      const data = (await res.json()) as {
        code?: string;
        error?: string;
        url?: string;
        redirectTo?: string;
      };
      // 409: code を画面に出したうえで、明示リンクからのみ遷移（自動リダイレクトしない）
      if (res.status === 409) {
        if (data.code === 'already_purchased' || data.code === 'fulfillment_pending') {
          setCheckout409({ code: data.code });
          setLoading(false);
          return;
        }
        setLoading(false);
        setError(data.error ?? '購入を続行できません。');
        return;
      }
      if (!res.ok) {
        throw new Error(data?.error ?? `Error ${res.status}`);
      }
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Checkout URL not returned');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
      setLoading(false);
    }
  };

  const signInHref = `/sign-in?redirect_url=${encodeURIComponent('/dtr/lp')}`;

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={className}
        aria-busy={loading}
        aria-live="polite"
      >
        {loading ? '処理中...' : children}
      </button>
      {needsSignIn && (
        <p role="alert" style={{ marginTop: 8, fontSize: 14, color: '#5a4ea0' }}>
          購入にはログインが必要です。{' '}
          <a href={signInHref} style={{ color: '#7c6fd6', textDecoration: 'underline' }}>
            ログインして購入を続ける
          </a>
        </p>
      )}
      {checkout409 && (
        <p role="status" style={{ marginTop: 10, fontSize: 14, color: '#5a4ea0', lineHeight: 1.6 }}>
          {checkout409.code === 'already_purchased' ? (
            <>
              <strong>already_purchased</strong>
              {' — '}
              購入済みでレポート配布まで完了しています。Entry Report を開けます。
            </>
          ) : (
            <>
              <strong>fulfillment_pending</strong>
              {' — '}
              購入権限はありますが、保存版レポートの生成を待っています。準備画面へ進んでください。
            </>
          )}
          <br />
          <a
            href={checkout409.code === 'already_purchased' ? '/dtr/core' : '/dtr/processing'}
            style={{ color: '#7c6fd6', fontWeight: 600, textDecoration: 'underline' }}
          >
            {checkout409.code === 'already_purchased' ? 'Entry Report を開く' : '準備画面へ進む'}
          </a>
        </p>
      )}
      {error && (
        <p role="alert" style={{ marginTop: 8, fontSize: 14, color: '#c00' }}>
          {error}
        </p>
      )}
    </div>
  );
}

export { PRODUCT_ID_TO_ENV };
