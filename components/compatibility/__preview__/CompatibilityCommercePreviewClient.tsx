'use client';

import { useMemo, useState } from 'react';
import {
  CompatibilityPurchaseConfirmation,
  CompatibilityPurchaseSuccess,
} from '../CompatibilityPurchaseExperience';
import PaidCompatibilityReportReader from '../PaidCompatibilityReportReader';
import { CompatibilitySavedReportsSection } from '../../my/CompatibilitySavedReportsSection';
import { buildPaidCompatibilityReportV1 } from '../../../lib/m55/compatibility/buildPaidCompatibilityReportV1';

const STATES = [
  ['off', 'A commerce flag OFF'],
  ['confirm', 'B purchase confirmation'],
  ['signed-out', 'C unauthenticated sign-in boundary'],
  ['redirect', 'D checkout redirect intent'],
  ['processing', 'E payment processing'],
  ['owned', 'F fulfilled My Page card'],
  ['reader', 'G owned six-chapter reader'],
  ['unauthorized', 'H unauthorized report 404'],
  ['duplicate', 'I duplicate webhook evidence'],
  ['mobile-confirm', 'J mobile confirmation'],
] as const;

export default function CompatibilityCommercePreviewClient() {
  const [state, setState] = useState<(typeof STATES)[number][0]>('confirm');
  const snapshot = useMemo(
    () => buildPaidCompatibilityReportV1({
      pairAxisId: 'A3',
      paidTopicId: 'T2',
      relationStatusId: 'R3',
      temperatureId: 'E1',
      personAUsesFirstPerspective: true,
    }),
    [],
  );
  const sampleReport = {
    id: '11111111-1111-4111-8111-111111111111',
    createdAt: '2026-07-13T09:00:00.000Z',
    chapterCount: 6 as const,
  };

  let content: React.ReactNode;
  if (state === 'confirm' || state === 'mobile-confirm') {
    content = (
      <CompatibilityPurchaseConfirmation
        commerceEnabled
        previewAuthState="signed_in"
      />
    );
  } else if (state === 'signed-out') {
    content = (
      <CompatibilityPurchaseConfirmation
        commerceEnabled
        previewAuthState="signed_out"
      />
    );
  } else if (state === 'redirect') {
    content = (
      <CompatibilityPurchaseConfirmation
        commerceEnabled
        previewAuthState="redirecting"
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
  } else if (state === 'reader' && snapshot) {
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
        : '同じCheckout Sessionを再処理しても、保存版は1件のままです。';
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
