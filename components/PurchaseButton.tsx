'use client';

import { useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ProfileRepository } from '../lib/soul/profile';
import { validateDtrCheckoutProfile } from '../lib/m55/compositeStem/checkoutProfileGate';
import {
  DTR_CORE_FULL_V1,
  DTR_CORE_LIGHT_V1,
  DTR_CORE_STATIC_V1,
  isDtrCoreSavedReportOneTimeProduct,
} from '../lib/oneTimeCheckout';
import { trackFunnelAction } from '../lib/m55/privacySafeFunnelAnalytics';
import {
  PURCHASE_CHECKOUT_PUBLIC_ERRORS,
  runPurchaseCheckoutAttempt,
} from '../lib/m55/purchaseCheckoutStartedAction';

/** Saved-report checkout SKUs that require birth profile before Stripe session. */
const DTR_SAVED_REPORT_PROFILE_GATED = new Set<string>([
  DTR_CORE_STATIC_V1,
  DTR_CORE_LIGHT_V1,
  DTR_CORE_FULL_V1,
]);

const PURCHASE_RESTORE_KEY = 'm55_dtr_purchase_restore_v1';
const CHECKOUT_FETCH_TIMEOUT_MS = 30000;

/**
 * productId → 環境変数マッピング (display / diagnostics only; checkout route resolves env).
 */
const PRODUCT_ID_TO_ENV: Record<string, string> = {
  [DTR_CORE_STATIC_V1]: 'STRIPE_PRICE_DTR_CORE_STATIC_V1',
  [DTR_CORE_LIGHT_V1]: 'STRIPE_PRICE_DTR_CORE_LIGHT_V1',
  [DTR_CORE_FULL_V1]: 'STRIPE_PRICE_DTR_CORE_FULL_V1',
};

export type PurchaseButtonProps = {
  productId: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  repurchaseAcknowledged?: boolean;
  purchaseRestoreContext?: { gate: 'checkout'; selectedPlan: 'light' | 'full' };
  onRepurchaseAckRequired?: () => void;
};

/**
 * 購入ボタン
 * productId を受け取り、/api/purchase/checkout へ productId を送信して Stripe Checkout へリダイレクト
 */
export default function PurchaseButton({
  productId,
  children = '購入する',
  className,
  style,
  disabled = false,
  repurchaseAcknowledged,
  purchaseRestoreContext,
  onRepurchaseAckRequired,
}: PurchaseButtonProps) {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [fulfillmentPending, setFulfillmentPending] = useState<{ message: string; recoveryPath: string } | null>(
    null,
  );
  /** Sync pending boundary — blocks double-activation before React re-render disables the button. */
  const submitLockRef = useRef(false);

  const handleClick = async () => {
    if (disabled || submitLockRef.current || loading) return;

    setError(null);
    setNeedsSignIn(false);
    setNeedsProfile(false);
    setFulfillmentPending(null);
    setLoading(true);

    let freeAnswerSet: Record<string, string> | undefined;
    let paidAnswerSet: Record<string, string> | undefined;
    try {
      const freeRaw = sessionStorage.getItem('m55_free_answers_v1');
      const paidRaw = sessionStorage.getItem('m55_paid_answers_v1');
      if (freeRaw) freeAnswerSet = JSON.parse(freeRaw) as Record<string, string>;
      if (paidRaw) paidAnswerSet = JSON.parse(paidRaw) as Record<string, string>;
    } catch {
      /* no-op */
    }

    const profile = userId ? ProfileRepository.get(userId) : null;
    const outcome = await runPurchaseCheckoutAttempt({
      productId,
      profile,
      freeAnswerSet,
      paidAnswerSet,
      repurchaseAcknowledged,
      submitLock: submitLockRef,
      loading: false,
      deps: {
        fetchCheckout: async (payload) => {
          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => controller.abort(), CHECKOUT_FETCH_TIMEOUT_MS);
          try {
            const res = await fetch('/api/purchase/checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });
            return {
              status: res.status,
              ok: res.ok,
              json: () =>
                res.json() as Promise<{
                  code?: string;
                  error?: string;
                  url?: string;
                  resumeCheckoutSessionId?: string;
                }>,
            };
          } finally {
            window.clearTimeout(timeoutId);
          }
        },
        trackFunnelAction,
        navigateHref: (url) => {
          window.location.href = url;
        },
        navigateReplace: (url) => {
          window.location.replace(url);
        },
        isProfileGatedProduct: (id) => DTR_SAVED_REPORT_PROFILE_GATED.has(id),
        validateProfile: validateDtrCheckoutProfile,
        isValidCheckoutProduct: isDtrCoreSavedReportOneTimeProduct,
        warn: (message) => {
          console.warn(message);
        },
      },
    });

    if (outcome.kind === 'skipped_locked') return;
    if (outcome.kind === 'needs_profile') {
      if (purchaseRestoreContext) {
        try {
          sessionStorage.setItem(PURCHASE_RESTORE_KEY, JSON.stringify(purchaseRestoreContext));
        } catch {
          /* no-op */
        }
      }
      setNeedsProfile(true);
      setLoading(false);
      return;
    }
    if (outcome.kind === 'invalid_product') {
      setError(outcome.message);
      setLoading(false);
      return;
    }
    if (outcome.kind === 'needs_sign_in') {
      if (purchaseRestoreContext) {
        try {
          sessionStorage.setItem(PURCHASE_RESTORE_KEY, JSON.stringify(purchaseRestoreContext));
        } catch {
          /* no-op */
        }
      }
      setNeedsSignIn(true);
      setLoading(false);
      return;
    }
    if (outcome.kind === 'repurchase_ack_required') {
      onRepurchaseAckRequired?.();
      setError(outcome.message);
      setLoading(false);
      return;
    }
    if (outcome.kind === 'fulfillment_pending') {
      setFulfillmentPending({ message: outcome.message, recoveryPath: outcome.recoveryPath });
      setLoading(false);
      return;
    }
    if (outcome.kind === 'error') {
      setError(outcome.message);
      setLoading(false);
      return;
    }
  };

  const signInHref = `/sign-in?redirect_url=${encodeURIComponent('/dtr/lp')}`;
  const myHref = '/my';

  return (
    <div className="m55-purchase-button-stack">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading}
        className={className}
        style={style}
        aria-busy={loading}
        aria-live="polite"
      >
        {loading ? '購入状況を確認しています…' : children}
      </button>
      {needsSignIn && (
        <p role="alert" className="m55-purchase-button-alert">
          購入にはログインが必要です。{' '}
          <a href={signInHref} style={{ color: '#7c6fd6', textDecoration: 'underline' }}>
            ログインして購入を続ける
          </a>
        </p>
      )}
      {needsProfile && (
        <p role="alert" className="m55-purchase-button-alert">
          購入前にマイページでニックネームと生年月日を入力してください。{' '}
          <a href={myHref} style={{ color: '#7c6fd6', textDecoration: 'underline' }}>
            マイページでプロフィールを入力
          </a>
        </p>
      )}
      {fulfillmentPending && (
        <p role="alert" className="m55-purchase-button-alert">
          {fulfillmentPending.message}{' '}
          <a href={fulfillmentPending.recoveryPath} style={{ color: '#7c6fd6', textDecoration: 'underline' }}>
            準備状況を確認する
          </a>
        </p>
      )}
      {error && (
        <p role="alert" className="m55-purchase-button-alert m55-purchase-button-alert--error">
          {error}
        </p>
      )}
    </div>
  );
}

export { PRODUCT_ID_TO_ENV, PURCHASE_CHECKOUT_PUBLIC_ERRORS };
