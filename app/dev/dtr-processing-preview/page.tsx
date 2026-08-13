import { notFound } from 'next/navigation';
import { DtrProcessingClient } from '../../../components/dtr/DtrProcessingClient';
import { maskCheckoutRecoveryRef } from '../../../lib/m55/paidResult/checkoutRecoveryRef';
import { LABEL_FORMAT_SAVED } from '../../../lib/m55/dtrProductLabels';
import { DtrProcessingFallback, DtrProcessingShell } from '../../dtr/processing/DtrProcessingShell';

/**
 * Post-payment return states, rendered from the same shells the real route uses.
 *
 * The live route needs a Clerk session, a Supabase lookup and a Stripe session to reach any of
 * these, so they were previously only observable by buying something. This exists so the states
 * can be reviewed at 390px without creating a Checkout Session.
 */
function isPreviewBlockedInProduction(): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  if (process.env.VERCEL_ENV === 'production') return true;
  return false;
}

export const metadata = {
  title: 'DTR Processing States Preview (dev)',
  robots: { index: false, follow: false },
};

/** Shaped like a real TEST session id so masking and layout are exercised at full length. */
const SAMPLE_SESSION_ID = 'cs_test_a1UpaKsAxnul0MMz38Y2zEgds0ALCYLJF4ruw5LtbGbdOApApultbAYmts';

const SUPPORT_URL = 'https://example.invalid/support';

type PreviewState = 'paid-preparing' | 'owned-recovery' | 'fail-closed';

export default async function DtrProcessingPreviewPage(props: {
  searchParams?: Promise<{ state?: string }>;
}) {
  if (isPreviewBlockedInProduction()) {
    notFound();
  }

  const params = props.searchParams ? await props.searchParams : {};
  const state: PreviewState =
    params.state === 'owned-recovery' || params.state === 'fail-closed'
      ? params.state
      : 'paid-preparing';

  const recoveryRef = maskCheckoutRecoveryRef(SAMPLE_SESSION_ID);

  if (state === 'fail-closed') {
    return (
      <DtrProcessingFallback
        message="お支払いの確認に時間がかかっています。再購入する前に、このページを再読み込みするか、下記のお控え番号を添えてサポートへお問い合わせください。"
        supportUrl={SUPPORT_URL}
        recoveryRef={recoveryRef}
      />
    );
  }

  if (state === 'owned-recovery') {
    return (
      <DtrProcessingShell
        title={`${LABEL_FORMAT_SAVED}を確認しています`}
        description="購入済みのプレミアムレポートを読み込んでいます。準備が整うと自動で開きます。"
      >
        <DtrProcessingClient supportUrl={SUPPORT_URL} recoveryMode="owned" />
      </DtrProcessingShell>
    );
  }

  return (
    <DtrProcessingShell
      title="レポートを準備しています"
      description="お支払いを確認しました。プレミアムレポートを準備しています（反映まで時間がかかる場合があります）。"
    >
      <DtrProcessingClient supportUrl={SUPPORT_URL} recoveryRef={recoveryRef} paymentConfirmed />
    </DtrProcessingShell>
  );
}
