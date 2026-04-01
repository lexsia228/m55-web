'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
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
type TabId = '/core' | '/dtr/core' | '/my';

const TABS: { href: TabId; label: string }[] = [
  { href: '/core', label: '本質' },
  { href: '/dtr/core', label: 'レポート' },
  { href: '/my', label: 'マイページ' },
];

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
      <header className={styles.header} aria-label="ナビゲーション">
        <div className={styles.headerStart}>
          <Link
            href="/home"
            className={styles.brandLockup}
            aria-label="ホーム"
            aria-current={pathname === '/home' ? 'page' : undefined}
          >
            <img
              src="/icons/m55-monomark.svg"
              alt=""
              width={22}
              height={22}
              className={styles.brandMark}
              decoding="async"
            />
            <span
              className={`${styles.brandWordmark}${pathname === '/home' ? ` ${styles.brandWordmarkActive}` : ''}`}
            >
              M55
            </span>
          </Link>
          <nav className={styles.topNav} aria-label="メインナビゲーション">
          {TABS.map((tab) => {
            const isActive =
              tab.href === '/dtr/core'
                ? pathname.startsWith('/dtr/')
                : pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`${styles.topNavItem}${isActive ? ` ${styles.topNavItemActive}` : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
          </nav>
        </div>
        <div className={styles.authArea}>
          <SignedOut>
            <SignInButton mode="redirect">
              <button type="button" className={styles.authButton} aria-label="ログイン">
                ログイン
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <span className={styles.userButtonWrap}>
              <UserButton afterSignOutUrl="/" />
            </span>
          </SignedIn>
        </div>
      </header>

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
