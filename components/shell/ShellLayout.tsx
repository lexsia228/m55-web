'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { PublicHeader } from './PublicHeader';
import LegacyFrame from '../../src/components/legacy/LegacyFrame';
import styles from './ShellLayout.module.css';
import { useSoulBridge } from '../../hooks/useSoulBridge';
import { SoulBirthGate } from '../../src/components/soul/SoulBirthGate';

/**
 * Primary entry: logo lockup → /home. Tabs: 本質 / レポート / マイページ
 * /today and /weekly are routes but NOT primary tabs (M55_MAIN_PAGE_HOOK SSOT).
 * レポート → /dtr/core: server gate redirects unowned users to /dtr/lp automatically.
 * Tarot / AI Chat remain quiet-disabled (opacity 0.30 + pointer-events none) per A-plan routing.
 *
 * Navigation is in the top header (editorial layout — no pill bottom nav).
 * legalLinks are handled per-page (HomePanel trust footer, etc.) — not as a shell fixture.
 */

export default function ShellLayout({
  iframeSrc,
  iframeTitle,
  useDataBridge,
  children,
}: {
  iframeSrc?: string;
  iframeTitle: string;
  useDataBridge?: boolean;
  /** When set, renders in-shell React content instead of the legacy iframe. */
  children?: React.ReactNode;
}) {
  const pathname = usePathname();

  // Prevent body-level scrolling that would expose the global SiteFooter
  // behind the fixed shell on mobile browsers (viewport-unit instability).
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const iframeProps = {
    className: styles.iframe,
    sandbox: 'allow-scripts allow-same-origin allow-forms' as const,
    referrerPolicy: 'no-referrer' as const,
  };

  const iframeRef = useSoulBridge();

  return (
    <div className={styles.wrapper}>
      <PublicHeader />

      <main className={styles.main}>
        {useDataBridge ? (
          <LegacyFrame src={iframeSrc!} title={iframeTitle} {...iframeProps} />
        ) : children ? (
          <>
            {/* REGRESSION: SoulBirthGate auto-opens; /home uses CTA-driven HomeBirthIntakeLayer only */}
            {pathname !== '/home' && <SoulBirthGate />}
            {children}
          </>
        ) : (
          <>
            {pathname !== '/home' && <SoulBirthGate />}
            <iframe ref={iframeRef} src={iframeSrc} title={iframeTitle} {...iframeProps} />
          </>
        )}
      </main>
    </div>
  );
}
