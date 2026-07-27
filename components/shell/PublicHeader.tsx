'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import {
  ACCOUNT_DROPDOWN_NAV,
  isHeaderNavActive,
  type PublicHeaderState,
} from '../../lib/m55/commercialUx/publicHeaderState';
import { M55_COMMERCIAL_TERMINOLOGY as T } from '../../lib/m55/commercialUx/terminology';
import styles from './ShellLayout.module.css';

type NavItem = { href: string; label: string };

type DropdownProps = {
  triggerLabel: string;
  items: NavItem[];
  pathname: string;
  menuId: string;
  aboutDropdown?: boolean;
};

function HeaderDropdown({ triggerLabel, items, pathname, menuId, aboutDropdown }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  const close = () => setOpen(false);
  const closeAndReturnFocus = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAndReturnFocus();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      event.preventDefault();
      closeAndReturnFocus();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    close();
  }, [pathname]);

  useEffect(() => {
    if (open) firstLinkRef.current?.focus({ preventScroll: true });
  }, [open]);

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
    }
  };

  return (
    <div
      className={`${styles.navDropdown}${aboutDropdown ? ` ${styles.navDropdownAbout}` : ''}`}
      ref={rootRef}
    >
      <button
        type="button"
        ref={triggerRef}
        className={`${styles.topNavItem} ${styles.navDropdownTrigger}`}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onTriggerKeyDown}
      >
        {triggerLabel}
        <span className={styles.navDropdownCaret} aria-hidden>
          ▾
        </span>
      </button>
      <div
        id={menuId}
        role="menu"
        className={`${styles.navDropdownPanel}${open ? ` ${styles.navDropdownPanelOpen}` : ''}`}
      >
        {items.map((item, index) => {
          const active = isHeaderNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              ref={index === 0 ? firstLinkRef : undefined}
              className={`${styles.navDropdownLink}${active ? ` ${styles.navDropdownLinkActive}` : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={close}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export type PublicHeaderProps = {
  state: PublicHeaderState;
  pathname: string;
};

export function PublicHeader({ state, pathname }: PublicHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstMenuLinkRef = useRef<HTMLAnchorElement>(null);
  const previousPathnameRef = useRef(pathname);
  const aboutMenuId = useId();
  const accountMenuId = useId();

  const { contextualPrimaryAction, desktopPrimaryNav, aboutDropdownNav, mobileMenuPublic } = state;
  const showDesktopContextualCta = false;

  const closeMenu = () => setMenuOpen(false);

  const closeMenuAndReturnFocus = () => {
    setMenuOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (previousPathnameRef.current !== pathname) {
      previousPathnameRef.current = pathname;
      closeMenu();
    }
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 960px)');
    const sync = () => {
      if (mq.matches) closeMenu();
    };
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenuAndReturnFocus();
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      event.preventDefault();
      closeMenuAndReturnFocus();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen) firstMenuLinkRef.current?.focus();
  }, [menuOpen]);

  return (
    <header className={styles.header} aria-label="ナビゲーション" data-m55-print-hide>
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
          {desktopPrimaryNav.map((item) => {
            const active = isHeaderNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.topNavItem}${active ? ` ${styles.topNavItemActive}` : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
          <HeaderDropdown
            triggerLabel={T.aboutM55}
            items={aboutDropdownNav}
            pathname={pathname}
            menuId={aboutMenuId}
            aboutDropdown
          />
        </nav>
      </div>

      <div className={styles.authArea}>
        {!showDesktopContextualCta ? (
          <Link
            href={contextualPrimaryAction.href}
            className={`${
              contextualPrimaryAction.kind === 'free_entry'
                ? styles.mobileFreeLink
                : styles.mobilePremiumLink
            }${
              contextualPrimaryAction.kind === 'view_premium' &&
              isHeaderNavActive(pathname, '/dtr/lp')
                ? ` ${styles.topNavItemActive}`
                : contextualPrimaryAction.kind === 'free_entry' &&
                    isHeaderNavActive(pathname, '/core')
                  ? ` ${styles.topNavItemActive}`
                  : ''
            }`}
            aria-current={
              contextualPrimaryAction.kind === 'view_premium' &&
              isHeaderNavActive(pathname, '/dtr/lp')
                ? 'page'
                : contextualPrimaryAction.kind === 'free_entry' &&
                    isHeaderNavActive(pathname, '/core')
                  ? 'page'
                  : undefined
            }
            data-testid="m55-mobile-nav-contextual"
          >
            {contextualPrimaryAction.label}
          </Link>
        ) : null}
        <div className={`${styles.desktopAuth} m55-print-hide`}>
          <SignedOut>
            <SignInButton mode="redirect">
              <button type="button" className={styles.authButton} aria-label="ログイン">
                ログイン
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <HeaderDropdown
              triggerLabel="アカウント"
              items={ACCOUNT_DROPDOWN_NAV}
              pathname={pathname}
              menuId={accountMenuId}
            />
            <span className={styles.userButtonWrap}>
              <UserButton afterSignOutUrl="/" />
            </span>
          </SignedIn>
        </div>

        <button
          type="button"
          ref={triggerRef}
          className={styles.menuTrigger}
          aria-label={menuOpen ? 'メニューを閉じる' : 'メニューを開く'}
          aria-expanded={menuOpen}
          aria-controls="m55-public-mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {T.menu}
        </button>
      </div>

      <div
        ref={menuRef}
        id="m55-public-mobile-menu"
        className={`${styles.mobileMenuPanel}${menuOpen ? ` ${styles.mobileMenuPanelOpen}` : ''}`}
      >
        <nav aria-label="モバイルナビゲーション" className={styles.mobileMenuNav}>
          {mobileMenuPublic.map((item, index) => {
            const active = isHeaderNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                ref={index === 0 ? firstMenuLinkRef : undefined}
                className={`${styles.mobileMenuLink}${active ? ` ${styles.mobileMenuLinkActive}` : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            );
          })}
          <SignedIn>
            {ACCOUNT_DROPDOWN_NAV.map((item) => {
              const active = isHeaderNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.mobileMenuLink}${active ? ` ${styles.mobileMenuLinkActive}` : ''}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={closeMenu}
                >
                  {item.label}
                </Link>
              );
            })}
          </SignedIn>
          <div className={styles.mobileMenuAuth}>
            <SignedOut>
              <SignInButton mode="redirect">
                <button type="button" className={styles.mobileMenuAuthButton} onClick={closeMenu}>
                  ログイン
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <div className={styles.mobileMenuAccountRow}>
                <span className={styles.mobileMenuAccountLabel}>アカウント</span>
                <span className={styles.userButtonWrap}>
                  <UserButton afterSignOutUrl="/" />
                </span>
              </div>
            </SignedIn>
          </div>
        </nav>
      </div>
    </header>
  );
}
