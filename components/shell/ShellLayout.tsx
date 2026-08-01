'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { PublicHeaderContainer } from './PublicHeaderContainer';
import '../../lib/m55/commercialUx/publicPrint.css';
import '../../lib/m55/commercialUx/experience/experienceControlPlane.css';
import {
  experienceArchetypeContract,
  resolveExperienceArchetype,
} from '../../lib/m55/commercialUx/experience';
import LegacyFrame from '../../src/components/legacy/LegacyFrame';
import styles from './ShellLayout.module.css';
import { useSoulBridge } from '../../hooks/useSoulBridge';
import { SoulBirthGate } from '../../src/components/soul/SoulBirthGate';
import { PublicFooter } from '../../app/_components/PublicFooter';

/**
 * Primary entry: logo lockup → /home. Tabs: 本質 / レポート / マイページ
 * /today and /weekly are routes but NOT primary tabs (M55_MAIN_PAGE_HOOK SSOT).
 * レポート → /dtr/core: 未購入は /dtr/lp、購入済みで snapshot 未生成は /dtr/processing。
 * Tarot / AI Chat remain quiet-disabled (opacity 0.30 + pointer-events none) per A-plan routing.
 *
 * Navigation is in the top header (editorial layout — no pill bottom nav).
 * 法務/サポート導線は PublicFooter を main 末尾に置き、スクロール先端で表示（PublicShell と同一）。
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
  const pathname = usePathname() ?? '/';
  const isCoreRoute =
    pathname === '/core' || (pathname?.startsWith('/core/') ?? false);
  const shouldRenderSoulBirthGate =
    pathname !== '/home' && pathname !== '/my' && !isCoreRoute;
  const archetype = resolveExperienceArchetype({ pathname });
  const contract = experienceArchetypeContract(archetype);

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
    <div
      className={styles.wrapper}
      data-m55-public-shell
      data-m55-pathname={pathname}
      data-m55-archetype={archetype}
      data-m55-print-mode={contract.printMode}
      data-m55-ecp="v2"
    >
      <PublicHeaderContainer />

      <main className={styles.main}>
        {useDataBridge ? (
          <>
            <LegacyFrame src={iframeSrc!} title={iframeTitle} {...iframeProps} />
            <PublicFooter />
          </>
        ) : children ? (
          <>
            {/* REGRESSION: SoulBirthGate auto-opens; /home /my /core は専用導線（BirthProfileIntakeLayer 等）のみ */}
            {shouldRenderSoulBirthGate && <SoulBirthGate />}
            {children}
            <PublicFooter />
          </>
        ) : (
          <>
            {shouldRenderSoulBirthGate && <SoulBirthGate />}
            <iframe ref={iframeRef} src={iframeSrc} title={iframeTitle} {...iframeProps} />
            <PublicFooter />
          </>
        )}
      </main>
    </div>
  );
}
