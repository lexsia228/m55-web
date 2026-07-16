'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DtrPaidQuestionnaireLayer from './DtrPaidQuestionnaireLayer';
import PurchaseButton from '../PurchaseButton';
import { CheckoutTrustRow } from '../checkout/CheckoutTrustRow';
import { PAID_QUESTION_IDS } from '../../lib/m55/individualization/answerIdMapsV1';
import { PAID_DTR_LP } from '../../lib/m55/paidDtrProductCopy';
import { DTR_CORE_FULL_V1, DTR_CORE_LIGHT_V1 } from '../../lib/oneTimeCheckout';
import { M55_PUBLIC_COMMERCIAL_TRUTH } from '../../lib/m55/analysisAuthorityReferenceModel';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import styles from './DtrPaidDecisionUx.module.css';

type Props = {
  children: React.ReactNode;
};

type GatePhase = 'questionnaire' | 'plans' | 'checkout';
type PlanKey = 'light' | 'full';

function readPaidComplete(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = sessionStorage.getItem('m55_paid_answers_v1');
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Record<string, string>;
    return PAID_QUESTION_IDS.every((id) => Boolean(parsed[id]));
  } catch {
    return false;
  }
}

function oneTimePrice(label: string): string {
  return label.replace('（税込）', '（税込・買い切り）');
}

export default function DtrPaidPurchasePrep({ children: _children }: Props) {
  const [gate, setGate] = useState<GatePhase>('questionnaire');
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);

  useEffect(() => {
    if (readPaidComplete()) {
      setGate('plans');
    }
  }, []);

  useEffect(() => {
    if (gate !== 'plans') return;
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.paidPlanView,
      'dtr_paid_plan',
      'dtr-paid-plan-view',
    );
  }, [gate]);

  if (gate === 'questionnaire') {
    return (
      <DtrPaidQuestionnaireLayer
        onComplete={() => {
          setSelectedPlan(null);
          setGate('plans');
        }}
      />
    );
  }

  const light = PAID_DTR_LP.tiers.light;
  const full = PAID_DTR_LP.tiers.full;

  if (gate === 'checkout' && selectedPlan) {
    const plan = selectedPlan === 'light' ? light : full;
    const productId = selectedPlan === 'light' ? DTR_CORE_LIGHT_V1 : DTR_CORE_FULL_V1;
    const included =
      selectedPlan === 'light'
        ? `${light.savedReportValueJa} + さらに詳しく読めるテーマ ${light.consultReplyValueJa}`
        : `${full.savedReportValueJa} + さらに詳しく読めるテーマ ${full.consultReplyValueJa}`;

    return (
      <section className={styles.shell} data-m55-paid-phase="checkout" aria-label="支払い前の確認">
        <p className={styles.overline}>個人解析レポート</p>
        <h3 className={styles.title}>支払い画面へ進む前に</h3>
        <div className={styles.confirmCard}>
          <div className={styles.confirmRow}>
            <span>選択したプラン</span>
            <strong>{plan.planNameJa}</strong>
          </div>
          <div className={styles.confirmRow}>
            <span>価格</span>
            <strong>{oneTimePrice(plan.priceLabelJa)}</strong>
          </div>
          <div className={styles.confirmRow}>
            <span>通貨</span>
            <strong>日本円（JPY）</strong>
          </div>
          <div className={styles.confirmRow}>
            <span>支払い</span>
            <strong>買い切り・自動更新なし</strong>
          </div>
          <div className={styles.confirmRow}>
            <span>含まれる内容</span>
            <strong>{included}</strong>
          </div>
          <div className={styles.confirmRow}>
            <span>提供</span>
            <strong>決済確認後に本文を準備し、購入アカウントでウェブ閲覧</strong>
          </div>
        </div>
        <p className={styles.confirmNote}>{M55_PUBLIC_COMMERCIAL_TRUTH.commercial.deliveryJa}</p>
        <p className={styles.confirmNote}>{M55_PUBLIC_COMMERCIAL_TRUTH.commercial.dataHandlingJa}</p>
        <p className={styles.confirmNote}>{M55_PUBLIC_COMMERCIAL_TRUTH.commercial.paymentProcessorJa}</p>
        <nav className={styles.legalLinks} aria-label="購入条件と問い合わせ">
          <Link href="/support">サポート</Link>
          <Link href="/legal/refund">返金・キャンセル</Link>
          <Link href="/legal/terms">利用規約</Link>
          <Link href="/legal/privacy">プライバシー</Link>
          <Link href="/legal/tokushoho">特定商取引法に基づく表記</Link>
        </nav>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => setGate('plans')}
          >
            プラン選択に戻る
          </button>
          <PurchaseButton productId={productId} className="m55-lp-cta-btn">
            <span>支払い画面へ進む</span>
          </PurchaseButton>
        </div>
        <div className={styles.planNote}>
          <CheckoutTrustRow />
        </div>
      </section>
    );
  }

  return (
    <section className={styles.shell} data-m55-paid-phase="plans" aria-label="個人解析レポートのプラン選択">
      <p className={styles.overline}>個人解析レポート</p>
      <h3 className={styles.title}>{PAID_DTR_LP.tiers.sectionTitleJa}</h3>
      <p className={styles.planLead}>{PAID_DTR_LP.tiers.sectionLeadJa}</p>
      <p className={styles.planNote}>
        通貨：日本円（JPY）<br />
        支払い：買い切り・自動更新なし
      </p>
      <div className={styles.planStack}>
        <article
          className={`${styles.planCard}${selectedPlan === 'light' ? ` ${styles.planCardSelected}` : ''}`}
        >
          <div className={styles.planHeader}>
            <span className={styles.planName}>{light.planNameJa}</span>
            <span className={styles.planPrice}>{oneTimePrice(light.priceLabelJa)}</span>
          </div>
          <div className={styles.planMeta}>
            <div>{light.oneTimeLabelJa}</div>
            <div>
              {light.savedReportLabelJa} {light.savedReportValueJa}
            </div>
            <div>
              {light.consultReplyLabelJa} {light.consultReplyValueJa}
            </div>
            <div>あとからFULL化可能</div>
          </div>
          <p className={styles.planAudience}>{light.bodyJa}</p>
          <p className={styles.planNote}>{light.upgradeNoteJa}</p>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => {
              setSelectedPlan('light');
              setGate('checkout');
            }}
          >
            {light.ctaLabelJa}
          </button>
        </article>

        <article
          className={`${styles.planCard}${selectedPlan === 'full' ? ` ${styles.planCardSelected}` : ''}`}
        >
          <div className={styles.planHeader}>
            <span className={styles.planName}>{full.planNameJa}</span>
            <span className={styles.planPrice}>{oneTimePrice(full.priceLabelJa)}</span>
          </div>
          <div className={styles.planMeta}>
            <div>{full.oneTimeLabelJa}</div>
            <div>
              {full.savedReportLabelJa} {full.savedReportValueJa}
            </div>
            <div>
              {full.consultReplyLabelJa} {full.consultReplyValueJa}
            </div>
          </div>
          <p className={styles.planAudience}>{full.bodyJa}</p>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => {
              setSelectedPlan('full');
              setGate('checkout');
            }}
          >
            {full.ctaLabelJa}
          </button>
        </article>
      </div>
    </section>
  );
}
