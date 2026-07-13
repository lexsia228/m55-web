import { notFound } from 'next/navigation';
import { PublicShell } from '../../../_components/PublicShell';
import { CompatibilityPurchaseConfirmation } from '../../../../components/compatibility/CompatibilityPurchaseExperience';
import { isCompatibilityCommerceEnabled } from '../../../../lib/m55/compatibility/compatibilityCommerceAuthority';

export const metadata = {
  title: '二人の相性レポート 購入確認 | M55',
  robots: { index: false, follow: false },
};

export default async function CompatibilityPurchaseConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const commerceEnabled = isCompatibilityCommerceEnabled();
  if (!commerceEnabled) notFound();
  const params = await searchParams;
  return (
    <PublicShell>
      <CompatibilityPurchaseConfirmation
        commerceEnabled
        cancelled={params.checkout === 'cancelled'}
      />
    </PublicShell>
  );
}
