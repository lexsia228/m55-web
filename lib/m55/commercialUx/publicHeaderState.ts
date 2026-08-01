/**
 * Route/state-driven public header contract — no browser storage reads here.
 */
import { M55_COMMERCIAL_TERMINOLOGY as T } from './terminology';

export type PublicHeaderSurface =
  | 'home'
  | 'core'
  | 'core_result'
  | 'shared_entry'
  | 'premium_lp'
  | 'premium_flow'
  | 'pricing'
  | 'public'
  | 'dtr';

export type ContextualPrimaryAction =
  | { kind: 'free_entry'; label: typeof T.freeEntry; href: '/core' }
  | { kind: 'view_premium'; label: typeof T.viewPremiumReport; href: '/dtr/lp' }
  | { kind: 'return_free_result'; label: typeof T.returnToFreeResult; href: '/core' }
  | { kind: 'recipient_free'; label: typeof T.recipientAction; href: '/core' };

export type PublicHeaderNavItem = { href: string; label: string };

export type PublicHeaderState = {
  surface: PublicHeaderSurface;
  freeResultAvailable: boolean;
  signedIn: boolean;
  contextualPrimaryAction: ContextualPrimaryAction;
  desktopPrimaryNav: PublicHeaderNavItem[];
  aboutDropdownNav: PublicHeaderNavItem[];
  mobileMenuPublic: PublicHeaderNavItem[];
};

export const DESKTOP_PRIMARY_NAV: PublicHeaderNavItem[] = [
  { href: '/core', label: T.freeEntry },
  { href: '/dtr/lp', label: T.premiumProduct },
];

export const ABOUT_DROPDOWN_NAV: PublicHeaderNavItem[] = [
  { href: '/how-m55-works', label: 'M55の仕組み' },
  { href: '/ten-views', label: T.tenQualities },
];

export const MOBILE_MENU_PUBLIC: PublicHeaderNavItem[] = [
  { href: '/home', label: T.home },
  { href: '/core', label: T.freeEntry },
  { href: '/dtr/lp', label: T.premiumProduct },
  { href: '/how-m55-works', label: T.aboutM55 },
  { href: '/ten-views', label: T.tenQualities },
];

export const ACCOUNT_DROPDOWN_NAV: PublicHeaderNavItem[] = [
  { href: '/dtr', label: 'マイレポート' },
  { href: '/my', label: 'マイページ' },
];

export function resolvePublicHeaderSurface(pathname: string): PublicHeaderSurface {
  if (pathname === '/home') return 'home';
  if (pathname === '/core' || pathname.startsWith('/core/')) return 'core';
  if (pathname.startsWith('/r/')) return 'shared_entry';
  if (pathname === '/dtr/lp') return 'premium_lp';
  if (pathname === '/pricing') return 'pricing';
  if (pathname.startsWith('/dtr')) return 'dtr';
  return 'public';
}

export function resolveContextualPrimaryAction(input: {
  surface: PublicHeaderSurface;
  freeResultAvailable: boolean;
}): ContextualPrimaryAction {
  const { surface, freeResultAvailable } = input;

  if (surface === 'shared_entry') {
    return { kind: 'recipient_free', label: T.recipientAction, href: '/core' };
  }

  if (surface === 'premium_lp' || surface === 'premium_flow' || surface === 'dtr') {
    if (freeResultAvailable) {
      return { kind: 'return_free_result', label: T.returnToFreeResult, href: '/core' };
    }
    return { kind: 'free_entry', label: T.freeEntry, href: '/core' };
  }

  if (freeResultAvailable && (surface === 'core' || surface === 'core_result')) {
    return { kind: 'view_premium', label: T.viewPremiumReport, href: '/dtr/lp' };
  }

  return { kind: 'free_entry', label: T.freeEntry, href: '/core' };
}

export function resolvePublicHeaderState(input: {
  pathname: string;
  freeResultAvailable: boolean;
  signedIn: boolean;
  /** When on /core with committed result, surface reads as core_result for CTA. */
  coreHasResult?: boolean;
}): PublicHeaderState {
  let surface = resolvePublicHeaderSurface(input.pathname);
  if (surface === 'core' && input.coreHasResult) {
    surface = 'core_result';
  }

  return {
    surface,
    freeResultAvailable: input.freeResultAvailable,
    signedIn: input.signedIn,
    contextualPrimaryAction: resolveContextualPrimaryAction({
      surface,
      freeResultAvailable: input.freeResultAvailable,
    }),
    desktopPrimaryNav: DESKTOP_PRIMARY_NAV,
    aboutDropdownNav: ABOUT_DROPDOWN_NAV,
    mobileMenuPublic: MOBILE_MENU_PUBLIC,
  };
}

export function isHeaderNavActive(pathname: string, href: string): boolean {
  if (href === '/home') return pathname === '/home';
  if (href === '/core') return pathname === '/core' || pathname.startsWith('/core/');
  if (href === '/dtr/lp') {
    return (
      pathname === '/dtr/lp' ||
      pathname.startsWith('/dtr/lp/') ||
      pathname.startsWith('/dtr/paid') ||
      pathname === '/pricing'
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
