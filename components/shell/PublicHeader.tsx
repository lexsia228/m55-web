'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import styles from './ShellLayout.module.css';

type TabId = '/core' | '/dtr' | '/my';

const TABS: { href: TabId; label: string }[] = [
  { href: '/core', label: '本質' },
  { href: '/dtr', label: '保存版' },
  { href: '/my', label: 'マイページ' },
];

export function PublicHeader() {
  const pathname = usePathname();

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
            const isActive =
              tab.href === '/dtr' ? pathname === '/dtr' || pathname.startsWith('/dtr/') : pathname === tab.href;
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
  );
}

