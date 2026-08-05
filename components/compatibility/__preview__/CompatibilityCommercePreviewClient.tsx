'use client';

import { useMemo, useState } from 'react';
import {
  CompatibilityPurchaseConfirmation,
  CompatibilityPurchaseSuccess,
} from '../CompatibilityPurchaseExperience';
import PaidCompatibilityReportReader from '../PaidCompatibilityReportReader';
import { CompatibilitySavedReportsSection } from '../../my/CompatibilitySavedReportsSection';
import { buildPaidCompatibilityReportV1 } from '../../../lib/m55/compatibility/buildPaidCompatibilityReportV1';
import type { CompatibilityCurrentContextAnswers } from '../../../lib/m55/compatibility/currentContextContract.v1';

const STATES = [
  ['confirm-a', 'A purchase confirmation · context A'],
  ['confirm-b', 'B purchase confirmation · context B'],
  ['checkout', 'C checkout boundary'],
  ['processing', 'D processing'],
  ['owned', 'E fulfilled My Page'],
  ['reader-a', 'F owned reader · context A'],
  ['reader-b', 'G owned reader · context B'],
  ['reader-focus', 'H Q6-only focus difference'],
  ['unauthorized', 'I non-owner 404'],
  ['duplicate', 'J duplicate-webhook evidence'],
  ['off', 'K commerce flag OFF'],
] as const;

const CONTEXT_A: CompatibilityCurrentContextAnswers = {
  decisionPace: 'decide_later',
  disagreement: 'talk_now',
  distance: 'explain_space',
  expressionPace: 'words_soon',
  returnPattern: 'someone_reaches',
  focus: 'conversation_focus',
};
const CONTEXT_B: CompatibilityCurrentContextAnswers = {
  decisionPace: 'decide_later',
  disagreement: 'take_space',
  distance: 'go_quiet',
  expressionPace: 'words_later',
  returnPattern: 'return_is_hard',
  focus: 'return_focus',
};
const CONTEXT_Q6: CompatibilityCurrentContextAnswers = {
  ...CONTEXT_A,
  focus: 'distance_focus',
};

export default function CompatibilityCommercePreviewClient() {
  const [state, setState] = useState<(typeof STATES)[number][0]>('confirm-a');
  const snapshots = useMemo(() => {
    const build = (currentContext: CompatibilityCurrentContextAnswers) =>
      buildPaidCompatibilityReportV1({
      pairAxisId: 'A3',
      paidTopicId: 'T2',
      relationStatusId: 'R3',
      temperatureId: 'E1',
      personAUsesFirstPerspective: true,
        currentContext,
      });
    return {
      a: build(CONTEXT_A),
      b: build(CONTEXT_B),
      q6: build(CONTEXT_Q6),
    };
  }, []);
  const sampleReport = {
    id: '11111111-1111-4111-8111-111111111111',
    createdAt: '2026-07-13T09:00:00.000Z',
    chapterCount: 6 as const,
  };

  let content: React.ReactNode;
  if (state === 'confirm-a' || state === 'confirm-b') {
    content = (
      <CompatibilityPurchaseConfirmation
        commerceEnabled
        previewAuthState="signed_in"
        previewCurrentContext={state === 'confirm-a' ? CONTEXT_A : CONTEXT_B}
      />
    );
  } else if (state === 'checkout') {
    content = (
      <CompatibilityPurchaseConfirmation
        commerceEnabled
        previewAuthState="redirecting"
        previewCurrentContext={CONTEXT_A}
      />
    );
  } else if (state === 'processing') {
    content = <CompatibilityPurchaseSuccess />;
  } else if (state === 'owned') {
    content = (
      <div style={{ width: 'min(calc(100% - 24px), 760px)', margin: '32px auto' }}>
        <CompatibilitySavedReportsSection reports={[sampleReport]} preview />
      </div>
    );
  } else if (
    state === 'reader-a' ||
    state === 'reader-b' ||
    state === 'reader-focus'
  ) {
    const snapshot =
      state === 'reader-a'
        ? snapshots.a
        : state === 'reader-b'
          ? snapshots.b
          : snapshots.q6;
    content = (
      <PaidCompatibilityReportReader
        snapshot={snapshot}
        owned
        analyticsEnabled={false}
      />
    );
  } else {
    const message = state === 'off'
      ? '購入CTAは表示されず、無料結果だけを利用できます。'
      : state === 'unauthorized'
        ? '所有者が一致しないレポートは404として扱います。'
        : '同じCheckout Sessionを再処理しても、プレミアムレポートは1件のままです。';
    content = (
      <main style={{ width: 'min(calc(100% - 24px), 720px)', margin: '40px auto' }}>
        <section style={{
          padding: 24,
          border: '1px solid rgba(93, 75, 112, 0.14)',
          borderRadius: 18,
          background: 'rgba(255,255,255,.72)',
        }}>
          <p style={{ margin: 0, lineHeight: 1.8 }}>{message}</p>
        </section>
      </main>
    );
  }

  return (
    <>
      <div
        data-testid="compatibility-commerce-preview-controls"
        style={{
          width: 'min(calc(100% - 24px), 760px)',
          margin: '16px auto 0',
          padding: 12,
          border: '1px solid rgba(93, 75, 112, 0.14)',
          borderRadius: 12,
          background: 'rgba(255,255,255,.84)',
        }}
      >
        <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
          Synthetic state
          <select
            value={state}
            onChange={(event) => setState(event.target.value as typeof state)}
            style={{ minHeight: 44, padding: '8px 10px', font: 'inherit' }}
          >
            {STATES.map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </label>
      </div>
      {content}
    </>
  );
}
