'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { useEffect, useRef, useState } from 'react';
import styles from './ShellLayout.module.css';

type TabId = '/core' | '/dtr' | '/my';

const TABS: { href: TabId; label: string }[] = [
  { href: '/core', label: '無料解析' },
  { href: '/dtr', label: '結果・レポート' },
  { href: '/my', label: 'マイページ' },
];

export function PublicHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMobileMenuOpen(false);
      mobileMenuButtonRef.current?.focus();
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [mobileMenuOpen]);

  const isTabActive = (href: TabId) =>
    href === '/dtr' ? pathname === '/dtr' || pathname.startsWith('/dtr/') : pathname === href;

  return (
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
            className={`${styles.brandWordmark}${
              pathname === '/home' ? ` ${styles.brandWordmarkActive}` : ''
            }`}
          >
            M55
          </span>
        </Link>
        <nav className={styles.topNav} aria-label="メインナビゲーション">
          {TABS.map((tab) => {
            const isActive = isTabActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`${styles.topNavItem}${
                  isActive ? ` ${styles.topNavItemActive}` : ''
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className={`${styles.authArea} ${styles.desktopAuthArea}`}>
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
      <div className={styles.mobileHeaderActions}>
        <Link
          href="/core"
          className={`${styles.mobileQuickLink}${
            isTabActive('/core') ? ` ${styles.mobileQuickLinkActive}` : ''
          }`}
          aria-current={isTabActive('/core') ? 'page' : undefined}
          onClick={() => setMobileMenuOpen(false)}
        >
          無料解析
        </Link>
        <button
          ref={mobileMenuButtonRef}
          type="button"
          className={styles.mobileMenuButton}
          aria-label={mobileMenuOpen ? 'メニューを閉じる' : 'メニューを開く'}
          aria-expanded={mobileMenuOpen}
          aria-controls="m55-public-mobile-menu"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <span aria-hidden />
          <span aria-hidden />
          <span aria-hidden />
        </button>
      </div>
      {mobileMenuOpen ? (
        <nav
          id="m55-public-mobile-menu"
          className={styles.mobileMenu}
          aria-label="モバイルナビゲーション"
        >
          <Link
            href="/dtr"
            className={isTabActive('/dtr') ? styles.mobileMenuItemActive : undefined}
            aria-current={isTabActive('/dtr') ? 'page' : undefined}
            onClick={() => setMobileMenuOpen(false)}
          >
            結果・レポート
          </Link>
          <Link
            href="/my"
            className={isTabActive('/my') ? styles.mobileMenuItemActive : undefined}
            aria-current={isTabActive('/my') ? 'page' : undefined}
            onClick={() => setMobileMenuOpen(false)}
          >
            マイページ
          </Link>
          <SignedOut>
            <SignInButton mode="redirect">
              <button type="button" onClick={() => setMobileMenuOpen(false)}>
                ログイン
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <div className={styles.mobileAccountControl}>
              <span>アカウント</span>
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
        </nav>
      ) : null}
    </header>
  );
}
