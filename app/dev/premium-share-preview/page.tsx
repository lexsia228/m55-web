import { notFound } from 'next/navigation';
import CorePremiumResultShareCTA from '../../../components/core/CorePremiumResultShareCTA';
import { buildPrivacySafeShareCardV1 } from '../../../lib/m55/freeResult/privacySafeShareCardV1';

function isPreviewBlockedInProduction(): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  if (process.env.VERCEL_ENV === 'production') return true;
  return false;
}

export const metadata = {
  title: 'Premium Share Preview (dev)',
  robots: { index: false, follow: false },
};

/** Dev-only fixture owner for premium.share.card evidence — not reachable in Production UI. */
export default function PremiumSharePreviewPage() {
  if (isPreviewBlockedInProduction()) {
    notFound();
  }

  const card = buildPrivacySafeShareCardV1({ stemLaneIndex: 1 });
  if (!card) {
    notFound();
  }

  return (
    <main
      data-m55-dev-preview="premium-share"
      data-m55-experience-tier="PREMIUM"
      data-m55-visual-authority="premium.experience.home_editorial_sample_v1"
      data-m55-premium-state="premium.share.card"
    >
      <CorePremiumResultShareCTA card={card} />
    </main>
  );
}
