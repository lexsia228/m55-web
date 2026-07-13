'use client';

import { useEffect, useState } from 'react';
import DtrPaidQuestionnaireLayer from './DtrPaidQuestionnaireLayer';
import { PAID_QUESTION_IDS } from '../../lib/m55/individualization/answerIdMapsV1';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';

type Props = {
  children: React.ReactNode;
};

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

export default function DtrPaidPurchasePrep({ children }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(readPaidComplete());
  }, []);

  useEffect(() => {
    if (!ready) return;
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.paidPlanView,
      'dtr_paid_plan',
      'dtr-paid-plan-view',
    );
  }, [ready]);

  return (
    <>
      {!ready ? (
        <DtrPaidQuestionnaireLayer onComplete={() => setReady(true)} />
      ) : null}
      {ready ? children : null}
    </>
  );
}
