'use client';

import { SignedIn, SignedOut, SignInButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  capturePreAuthSessionJourneyCandidate,
  claimPreAuthSessionJourneyForUser,
  guestJourneyV3ToPurchaseJourney,
  purgeUnownedPairGuestSession,
  readCompatibilityGuestJourneyV3FromSession,
  readLastCompletedPairJourney,
  resolveSignedInPurchaseHandoff,
  resolveSignedOutPurchaseHandoff,
  type CompatibilityPurchaseHandoffResolution,
  type CompatibilityPurchaseJourney,
} from '../../lib/m55/compatibility/pairGuestClientStore';
import type { CompatibilityGuestJourneyV3 } from '../../lib/m55/compatibility/pairReadingGuestContract';
import { buildCompatibilityCurrentContextDisplayV2 } from '../../lib/m55/compatibility/currentContextContract.v2';
import type { CompatibilityCurrentContextAnswersV2 } from '../../lib/m55/compatibility/currentContextContract.v2';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelAction,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import styles from './CompatibilityPurchaseExperience.module.css';

type PreviewAuthState = 'signed_in' | 'signed_out' | 'redirecting';

const PREVIEW_CURRENT_CONTEXT: CompatibilityCurrentContextAnswersV2 = {
  expressionPace: 'words_soon',
  contactPace: 'steady_contact',
  focus: 'conversation_focus',
};

function ProductDetails() {
  return (
    <>
      <dl className={styles.details}>
        <div><dt>商品</dt><dd>二人の相性レポート</dd></div>
        <div><dt>内容</dt><dd>6章レポート1件</dd></div>
        <div><dt>価格</dt><dd className={styles.price}>¥1,480（税込）</dd></div>
        <div><dt>支払</dt><dd>一回払い</dd></div>
        <div><dt>自動更新</dt><dd>なし</dd></div>
        <div><dt>提供時期</dt><dd>支払い確認後にマイページへ表示</dd></div>
        <div><dt>閲覧</dt><dd>購入したアカウントのマイページ</dd></div>
        <div><dt>変更・取消</dt><dd>決済前は内容を見直せます</dd></div>
      </dl>
      <p className={styles.note}>
        このレポートは、関係を決めつけたり、改善を保証・予測したりするものではありません。
      </p>
      <p className={styles.privacy}>
        二人の生年月日と回答はレポート作成時に使用します。購入後のレポートは購入したアカウントに保存され、生年月日や回答IDは含まれません。相手への自動共有はありません。
      </p>
    </>
  );
}

function SignInBoundary() {
  return (
    <div className={styles.authBoundary} data-testid="compatibility-sign-in-boundary">
      <h2>購入にはログインが必要です</h2>
      <p>ログイン後も、このタブに入力状態を残したまま最終確認へ戻れます。</p>
      <SignInButton mode="modal">
        <button type="button" className={styles.primary}>
          ログインして購入を続ける
        </button>
      </SignInButton>
    </div>
  );
}

function PreviewSignInBoundary() {
  return (
    <div className={styles.authBoundary} data-testid="compatibility-sign-in-boundary">
      <h2>購入にはログインが必要です</h2>
      <p>ログイン後も、このタブに入力状態を残したまま最終確認へ戻れます。</p>
      <button type="button" className={styles.primary}>ログインして購入を続ける</button>
    </div>
  );
}

export function CompatibilityPurchaseConfirmation({
  commerceEnabled,
  cancelled = false,
  previewAuthState,
  previewCurrentContext = PREVIEW_CURRENT_CONTEXT,
}: {
  commerceEnabled: boolean;
  cancelled?: boolean;
  previewAuthState?: PreviewAuthState;
  previewCurrentContext?: CompatibilityCurrentContextAnswersV2;
}) {
  const { user, isLoaded } = useUser();
  const preAuthSessionJourneyRef = useRef<CompatibilityGuestJourneyV3 | null>(null);
  const preAuthSessionCapturedRef = useRef(false);
  const preAuthSessionClaimedRef = useRef(false);
  const hasObservedSignedInIdentityRef = useRef(false);
  const [journey, setJourney] = useState<CompatibilityPurchaseJourney | null>(
    previewAuthState
      ? {
          input: { personA: '1990-01-01', personB: '1992-02-02' },
          relationStatusId: 'R2',
          currentContext: previewCurrentContext,
        }
      : null,
  );
  const [handoff, setHandoff] = useState<CompatibilityPurchaseHandoffResolution | 'pending'>(
    previewAuthState ? { kind: 'session', journey: {
      input: { personA: '1990-01-01', personB: '1992-02-02' },
      relationStatusId: 'R2',
      currentContext: previewCurrentContext,
    } } : 'pending',
  );
  const [loading, setLoading] = useState(previewAuthState === 'redirecting');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!previewAuthState) return;
    setJourney({
      input: { personA: '1990-01-01', personB: '1992-02-02' },
      relationStatusId: 'R2',
      currentContext: previewCurrentContext,
    });
    setLoading(previewAuthState === 'redirecting');
  }, [previewAuthState, previewCurrentContext]);

  useEffect(() => {
    if (previewAuthState) return;
    if (!isLoaded) return;

    const sessionStorageRef =
      typeof sessionStorage !== 'undefined' ? sessionStorage : null;
    const sessionJourneyV3 = readCompatibilityGuestJourneyV3FromSession(sessionStorageRef);
    const clerkUserId = user?.id ?? null;

    if (!clerkUserId) {
      if (!preAuthSessionCapturedRef.current) {
        preAuthSessionJourneyRef.current = capturePreAuthSessionJourneyCandidate(
          preAuthSessionJourneyRef.current,
          sessionJourneyV3,
          hasObservedSignedInIdentityRef.current,
        );
        preAuthSessionCapturedRef.current = true;
      }
      const resolution = resolveSignedOutPurchaseHandoff({
        sessionJourney: preAuthSessionJourneyRef.current
          ? guestJourneyV3ToPurchaseJourney(preAuthSessionJourneyRef.current)
          : null,
        hasObservedSignedInIdentity: hasObservedSignedInIdentityRef.current,
      });
      setHandoff(resolution);
      setJourney(
        resolution.kind === 'session' ? resolution.journey : null,
      );
    } else if (
      preAuthSessionJourneyRef.current &&
      !preAuthSessionClaimedRef.current
    ) {
      hasObservedSignedInIdentityRef.current = true;
      preAuthSessionClaimedRef.current = true;
      const resolution = claimPreAuthSessionJourneyForUser(
        clerkUserId,
        preAuthSessionJourneyRef.current,
        sessionStorageRef,
      );
      preAuthSessionJourneyRef.current = null;
      setHandoff(resolution);
      setJourney(resolution.journey);
    } else {
      hasObservedSignedInIdentityRef.current = true;
      purgeUnownedPairGuestSession(sessionStorageRef);
      const resolution = resolveSignedInPurchaseHandoff({
        clerkUserId,
        persistedJourney: readLastCompletedPairJourney(clerkUserId),
      });
      setHandoff(resolution);
      setJourney(
        resolution.kind === 'persisted' ? resolution.journey : null,
      );
    }

    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.compatibilityPurchaseView,
      'compatibility_purchase',
      'compatibility-purchase-view',
    );
  }, [previewAuthState, isLoaded, user?.id]);

  async function startCheckout() {
    if (!journey || !commerceEnabled || loading) return;
    if (previewAuthState) {
      setLoading(true);
      return;
    }
    setLoading(true);
    setError('');
    trackFunnelAction(
      M55_FUNNEL_EVENTS.compatibilityCheckoutIntent,
      'compatibility_purchase',
    );
    try {
      const response = await fetch('/api/compatibility/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personA: journey.input.personA,
          personB: journey.input.personB,
          relationStatusId: journey.relationStatusId,
          currentContext: journey.currentContext,
        }),
      });
      const data = (await response.json()) as { url?: unknown };
      if (!response.ok || typeof data.url !== 'string') {
        throw new Error('checkout unavailable');
      }
      trackFunnelAction(
        M55_FUNNEL_EVENTS.compatibilityCheckoutRedirect,
        'compatibility_purchase',
      );
      window.location.assign(data.url);
    } catch {
      setError('購入手続きを開始できませんでした。時間をおいてもう一度お試しください。');
      setLoading(false);
    }
  }

  if (!commerceEnabled) return null;

  const contextDisplay = journey
    ? buildCompatibilityCurrentContextDisplayV2(
      journey.currentContext,
      journey.relationStatusId,
    )
    : null;
  const signedInContent = (
    <div className={styles.actionArea}>
      {handoff === 'pending' || !isLoaded ? (
        <p className={styles.inputReady}>購入内容を準備しています…</p>
      ) : handoff.kind === 'session' || handoff.kind === 'persisted' ? (
        <>
          <div className={styles.personalization}>
            <strong>現在の二人に合わせた6章</strong>
            <span>今のfocus：{contextDisplay?.focusLabel}</span>
            <small>無料結果で答えた現在の状況を、購入後の6章にも反映します。</small>
          </div>
          <button
            type="button"
            className={styles.primary}
            onClick={() => void startCheckout()}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? '支払い画面を準備しています…' : '¥1,480で購入手続きへ'}
          </button>
        </>
      ) : (
        <div className={styles.authBoundary} data-testid="compatibility-purchase-recovery">
          <h2>二人の無料結果を開き直す</h2>
          <p>購入を続けるには、二人の無料結果が必要です。</p>
          <Link href="/synastry" className={styles.primary}>
            二人の無料結果を開き直す
          </Link>
        </div>
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );

  return (
    <main className={styles.page} data-testid="compatibility-purchase-confirmation">
      <article className={styles.card}>
        <p className={styles.eyebrow}>支払い前の最終確認</p>
        <h1>二人の相性レポート</h1>
        <p className={styles.lead}>購入後はマイページから読み返せます。買い切りで、自動更新はありません。</p>
        {cancelled && (
          <p className={styles.cancelled} role="status">
            決済は完了していません。内容を確認して、もう一度進めます。
          </p>
        )}
        <ProductDetails />
        {previewAuthState === 'signed_out' ? (
          <PreviewSignInBoundary />
        ) : previewAuthState ? (
          signedInContent
        ) : (
          <>
            <SignedOut><SignInBoundary /></SignedOut>
            <SignedIn>{signedInContent}</SignedIn>
          </>
        )}
        <div className={styles.secondaryActions}>
          <Link href="/synastry">無料結果へ戻る</Link>
          <Link href="/synastry">入力内容を見直す</Link>
        </div>
        <nav className={styles.legal} aria-label="購入に関する規約">
          <Link href="/legal/tokushoho">特定商取引法に基づく表記</Link>
          <Link href="/legal/terms">利用規約</Link>
          <Link href="/legal/privacy">プライバシー</Link>
          <Link href="/legal/refund">返金・キャンセル</Link>
        </nav>
      </article>
    </main>
  );
}

export function CompatibilityPurchaseSuccess() {
  return (
    <main className={styles.page} data-testid="compatibility-purchase-processing">
      <article className={styles.card}>
        <p className={styles.eyebrow}>支払い確認中</p>
        <h1>レポートをマイページへ準備しています</h1>
        <p className={styles.lead}>
          支払い確認後に6章レポートが表示されます。この画面を閉じても、配送処理は継続します。
        </p>
        <Link className={styles.primaryLink} href="/my">マイページで確認する</Link>
        <Link className={styles.quietLink} href="/synastry">無料結果へ戻る</Link>
      </article>
    </main>
  );
}
