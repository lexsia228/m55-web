import { notFound } from 'next/navigation';
import DtrDrawerPreviewClient from '../../../components/dtr/__preview__/DtrDrawerPreviewClient';
import { getDtrDrawerPreviewReaderProps } from '../../../lib/m55/fixtures/dtrDrawerPreviewFixture';
import styles from '../../dtr/core/core.module.css';

function isPreviewBlockedInProduction(): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  if (process.env.VERCEL_ENV === 'production') return true;
  return false;
}

export const metadata = {
  title: 'DTR Drawer Preview (dev)',
  robots: { index: false, follow: false },
};

export default async function DtrDrawerPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    withConsult?: string;
    consultWallet?: string;
    lightUpgrade?: string;
  }>;
}) {
  if (isPreviewBlockedInProduction()) {
    notFound();
  }

  const sp = await searchParams;
  const withConsult = sp.withConsult === '1';
  const readerProps = getDtrDrawerPreviewReaderProps(withConsult, sp.consultWallet);

  return (
    <main
      className={styles.page}
      data-m55-dev-preview="dtr-drawer"
      data-m55-experience-tier="PREMIUM"
      data-m55-visual-authority="premium.experience.home_editorial_sample_v1"
      data-m55-premium-state="purchased.report.body"
    >
      <DtrDrawerPreviewClient
        {...readerProps}
        showLightUpgrade={sp.lightUpgrade === '1'}
      />
    </main>
  );
}
