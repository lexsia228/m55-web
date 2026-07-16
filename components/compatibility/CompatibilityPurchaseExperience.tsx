'use client';

import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  COMPATIBILITY_GUEST_SESSION_KEY,
  isCompleteCompatibilityGuestInput,
  type CompatibilityGuestInput,
} from '../../lib/m55/compatibility/pairReadingGuestContract';
import {
  buildCompatibilityCurrentContextDisplay,
  isCompleteCompatibilityCurrentContext,
  type CompatibilityCurrentContextAnswers,
} from '../../lib/m55/compatibility/currentContextContract.v1';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelAction,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import { COMPATIBILITY_REPORT_PRODUCT_AUTHORITY } from '../../lib/m55/compatibility/compatibilityCommerceAuthority';
import { M55_PUBLIC_COMMERCIAL_TRUTH } from '../../lib/m55/analysisAuthorityReferenceModel';
import styles from './CompatibilityPurchaseExperience.module.css';

type PreviewAuthState = 'signed_in' | 'signed_out' | 'redirecting';

type CompatibilityPurchaseJourney = {
  input: CompatibilityGuestInput;
  currentContext: CompatibilityCurrentContextAnswers;
};

const PREVIEW_CURRENT_CONTEXT: CompatibilityCurrentContextAnswers = {
  decisionPace: 'decide_later',
  disagreement: 'talk_now',
  distance: 'explain_space',
  expressionPace: 'words_soon',
  returnPattern: 'someone_reaches',
  focus: 'conversation_focus',
};

function readPurchaseInput(): CompatibilityPurchaseJourney | null {
  try {
    const raw = sessionStorage.getItem(COMPATIBILITY_GUEST_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      input?: Partial<CompatibilityGuestInput>;
      answers?: unknown;
    };
    const input = {
      personA: typeof parsed.input?.personA === 'string' ? parsed.input.personA : '',
      personB: typeof parsed.input?.personB === 'string' ? parsed.input.personB : '',
    };
    return isCompleteCompatibilityGuestInput(input) &&
      isCompleteCompatibilityCurrentContext(parsed.answers)
      ? { input, currentContext: parsed.answers }
      : null;
  } catch {
    return null;
  }
}

function ProductDetails() {
  const product = COMPATIBILITY_REPORT_PRODUCT_AUTHORITY;
  const oneTimePrice = product.priceLabel.replace('（税込）', '（税込・買い切り）');
  return (
    <>
      <dl className={styles.details}>
        <div><dt>商品</dt><dd>M55 二人の相性解析レポート</dd></div>
        <div>
          <dt>内容</dt>
          <dd>
            {M55_PUBLIC_COMMERCIAL_TRUTH.commercial.compatibility.chapterCount}章レポート
            {product.reportCount}件
          </dd>
        </div>
        <div><dt>価格</dt><dd className={styles.price}>{oneTimePrice}</dd></div>
        <div><dt>支払</dt><dd>一回払い</dd></div>
        <div><dt>自動更新</dt><dd>なし</dd></div>
        <div><dt>提供時期</dt><dd>支払い確認後に本文を準備し、完了後にウェブ表示</dd></div>
        <div><dt>閲覧</dt><dd>購入したアカウントの読み解きホーム・マイページ</dd></div>
        <div><dt>変更・取消</dt><dd>決済前は内容を見直せます</dd></div>
      </dl>
      <p className={styles.note}>
        このレポートは、関係を決めつけたり、改善を保証・予測したりするものではありません。
      </p>
      <p className={styles.privacy}>
        二人の生年月日と回答はレポート作成時に使用します。購入後のレポートは購入したアカウントに保存され、生年月日や回答IDは含まれません。相手への自動共有はありません。
      </p>
      <p className={styles.privacy}>{M55_PUBLIC_COMMERCIAL_TRUTH.commercial.paymentProcessorJa}</p>
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
  previewCurrentContext?: CompatibilityCurrentContextAnswers;
}) {
  const [journey, setJourney] = useState<CompatibilityPurchaseJourney | null>(
    previewAuthState
      ? {
          input: { personA: '1990-01-01', personB: '1992-02-02' },
          currentContext: previewCurrentContext,
        }
      : null,
  );
  const [loading, setLoading] = useState(previewAuthState === 'redirecting');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!previewAuthState) return;
    setJourney({
      input: { personA: '1990-01-01', personB: '1992-02-02' },
      currentContext: previewCurrentContext,
    });
    setLoading(previewAuthState === 'redirecting');
  }, [previewAuthState, previewCurrentContext]);

  useEffect(() => {
    if (previewAuthState) return;
    setJourney(readPurchaseInput());
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.compatibilityPurchaseView,
      'compatibility_purchase',
      'compatibility-purchase-view',
    );
  }, [previewAuthState]);

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
    ? buildCompatibilityCurrentContextDisplay(journey.currentContext)
    : null;
  const signedInContent = (
    <div className={styles.actionArea}>
      {journey ? (
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
            {loading
              ? '支払い画面を準備しています…'
              : `${COMPATIBILITY_REPORT_PRODUCT_AUTHORITY.priceLabel.replace('（税込）', '（税込・買い切り）')}で購入手続きへ`}
          </button>
        </>
      ) : (
        <p className={styles.inputMissing} role="alert">
          このタブに二人分の入力がありません。無料結果へ戻って入力内容を確認してください。
        </p>
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );

  return (
    <main className={styles.page} data-testid="compatibility-purchase-confirmation">
      <article className={styles.card}>
        <p className={styles.eyebrow}>支払い前の最終確認</p>
        <h1>{COMPATIBILITY_REPORT_PRODUCT_AUTHORITY.publicName}</h1>
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
          <Link href="/support">サポート</Link>
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
