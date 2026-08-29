'use client';

import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  COMPATIBILITY_GUEST_SESSION_KEY_V3,
  isCompleteCompatibilityGuestInput,
  isValidCompatibilityRelationStatusId,
  type CompatibilityGuestInput,
  type CompatibilityGuestJourneyV3,
} from '../../lib/m55/compatibility/pairReadingGuestContract';
import {
  buildCompatibilityCurrentContextDisplayV2,
  isCompleteCompatibilityCurrentContextV2,
  type CompatibilityCurrentContextAnswersV2,
} from '../../lib/m55/compatibility/currentContextContract.v2';
import type { RelationStatusId } from '../../lib/m55/compatibility/pairReadingTypes';
import {
  COMPATIBILITY_REPORT_INCLUDED,
  COMPATIBILITY_REPORT_PRODUCT_AUTHORITY,
} from '../../lib/m55/compatibility/compatibilityCommerceAuthority';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelAction,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import styles from './CompatibilityPurchaseExperience.module.css';

type PreviewAuthState = 'signed_in' | 'signed_out' | 'redirecting';

type CompatibilityPurchaseJourney = {
  input: CompatibilityGuestInput;
  relationStatusId: RelationStatusId;
  currentContext: CompatibilityCurrentContextAnswersV2;
};

const PREVIEW_CURRENT_CONTEXT: CompatibilityCurrentContextAnswersV2 = {
  expressionPace: 'words_soon',
  contactPace: 'steady_contact',
  focus: 'conversation_focus',
};

function readPurchaseInput(): CompatibilityPurchaseJourney | null {
  try {
    const raw = sessionStorage.getItem(COMPATIBILITY_GUEST_SESSION_KEY_V3);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CompatibilityGuestJourneyV3>;
    if (
      parsed.version !== 'journey_v3' ||
      !parsed.input ||
      !isCompleteCompatibilityGuestInput(parsed.input) ||
      !isValidCompatibilityRelationStatusId(parsed.relationStatusId) ||
      !isCompleteCompatibilityCurrentContextV2(parsed.answers, parsed.relationStatusId)
    ) {
      return null;
    }
    return {
      input: parsed.input,
      relationStatusId: parsed.relationStatusId,
      currentContext: parsed.answers,
    };
  } catch {
    return null;
  }
}

function PurchaseTrustFacts() {
  return (
    <div className={styles.purchaseFacts} aria-label="購入条件">
      <span>{COMPATIBILITY_REPORT_PRODUCT_AUTHORITY.priceLabel}</span>
      <span>一回払い</span>
      <span>自動更新なし</span>
    </div>
  );
}

function PurchaseValueSummary() {
  return (
    <section
      className={styles.valueSummary}
      aria-labelledby="compatibility-purchase-value-title"
    >
      <p className={styles.valueEyebrow}>このレポートで読めること</p>
      <h2 id="compatibility-purchase-value-title" className={styles.valueTitle}>
        すれ違いの流れから、戻し方まで
      </h2>
      <p className={styles.valueLead}>
        二人それぞれの視点を整理し、関係を決めつけずに、次に使える読みとして残します。
      </p>
      <ul className={styles.includedList}>
        {COMPATIBILITY_REPORT_INCLUDED.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function ProductDetails() {
  return (
    <>
      <dl className={styles.details}>
        <div><dt>商品</dt><dd>{COMPATIBILITY_REPORT_PRODUCT_AUTHORITY.publicName}</dd></div>
        <div><dt>内容</dt><dd>相性レポート{COMPATIBILITY_REPORT_PRODUCT_AUTHORITY.reportCount}件</dd></div>
        <div><dt>価格</dt><dd className={styles.price}>{COMPATIBILITY_REPORT_PRODUCT_AUTHORITY.priceLabel}</dd></div>
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
      <PurchaseTrustFacts />
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
      <PurchaseTrustFacts />
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
  const [journey, setJourney] = useState<CompatibilityPurchaseJourney | null>(
    previewAuthState
      ? {
          input: { personA: '1990-01-01', personB: '1992-02-02' },
          relationStatusId: 'R2',
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
      relationStatusId: 'R2',
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
      {journey ? (
        <>
          <div className={styles.personalization}>
            <strong>現在の二人に合わせた読み</strong>
            <span>今のfocus：{contextDisplay?.focusLabel}</span>
            <small>無料結果で答えた現在の状況を、購入後のレポートにも反映します。</small>
          </div>
          <button
            type="button"
            className={styles.primary}
            onClick={() => void startCheckout()}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? '支払い画面を準備しています…' : `${COMPATIBILITY_REPORT_PRODUCT_AUTHORITY.priceLabel}で購入手続きへ`}
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
        <PurchaseValueSummary />
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
          支払い確認後に{COMPATIBILITY_REPORT_PRODUCT_AUTHORITY.publicName}が表示されます。この画面を閉じても、配送処理は継続します。
        </p>
        <Link className={styles.primaryLink} href="/my">マイページで確認する</Link>
        <Link className={styles.quietLink} href="/synastry">無料結果へ戻る</Link>
      </article>
    </main>
  );
}
