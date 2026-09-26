import { NextResponse } from 'next/server';
import { isAuthorizedCleanCaptureLoopbackHost } from '../e2e/isAuthorizedCleanCaptureLoopbackHost';

/** Next.js internal route that renders root app/not-found.tsx with HTTP 404. */
export const UNKNOWN_DOCUMENT_RECOVERY_PATH = '/_not-found';

export type RouteAccessClass = 'public' | 'protected' | 'unknown';

export type AuthRoutingAction =
  | 'continue'
  | 'protect'
  | 'unknown_api'
  | 'unknown_document_rewrite';

export type AuthRoutingOutcome = {
  action: AuthRoutingAction;
  accessClass: RouteAccessClass;
};

const PUBLIC_EXACT_PATHS = new Set<string>([
  '/',
  '/home',
  '/core',
  '/today',
  '/weekly',
  '/pricing',
  '/my',
  '/how-m55-works',
  '/ten-views',
  '/creator',
  '/creator/apply',
  '/creator/portal',
  '/synastry',
  '/synastry/purchase/confirm',
  '/dev/synastry-paid-report-preview',
  '/dev/synastry-commerce-preview',
  '/dev/synastry-guest-result-preview',
  '/dev/my-owned-preview',
  '/dev/pair-share-preview',
  '/api/stripe/webhook',
  '/api/clerk/webhook',
  '/api/compatibility/checkout',
  '/api/purchase/checkout',
  '/api/diagnostics/env',
  '/api/diagnostics/build',
  '/api/diagnostics/core-regression',
  '/api/reply/generate',
  '/api/dtr/draft',
  '/api/dtr/report-snapshot-ready',
  '/api/dtr/report-snapshot/hide',
  '/api/m55/attribution/creator-touch',
]);

/** Prefix roots mirroring middleware createRouteMatcher `(.*)` groups. */
const PUBLIC_PREFIX_ROOTS = [
  '/r',
  '/dtr',
  '/support',
  '/legal',
  '/sign-in',
  '/sign-up',
] as const;

export const PROTECTED_PAGE_PATHS = [
  '/ai-calendar',
  '/ai-chat',
  '/calendar',
  '/meter',
  '/tarot',
  '/purchase/success',
  '/prototype',
  '/prototype/hub',
  '/reply',
  '/reply/result',
  '/synastry/purchase/success',
  '/dev/paid-dtr-analysis-preview',
  '/dev/dtr-drawer-preview',
  '/dev/dtr-processing-preview',
  '/dev/premium-share-preview',
  '/internal/creator-review',
  '/m55/attribution/creator-touch/continue',
] as const;

export const PROTECTED_API_PATHS = [
  '/api/compatibility/reports',
  '/api/diagnostics/provision',
  '/api/dtr/draft/claim',
  '/api/dtr/draft/me',
  '/api/me/entitlements',
  '/api/reply-tickets/checkout',
  '/api/reply/history',
  '/api/room/core',
  '/api/room/core/send',
  '/api/creator/application',
  '/api/creator/portal',
  '/api/creator/compliance/content',
  '/api/creator/compliance/appeal',
  '/api/internal/creator-review',
  '/api/internal/creator-compliance',
  '/api/m55/attribution/creator-touch/continue',
] as const;

const PROTECTED_STATIC_PATHS = new Set<string>([
  ...PROTECTED_PAGE_PATHS,
  ...PROTECTED_API_PATHS,
]);

/** One dynamic segment only; no trailing descendants. */
const PROTECTED_DYNAMIC_PATTERNS: readonly RegExp[] = [
  /^\/synastry\/report\/[^/]+$/,
  /^\/api\/reply\/session\/[^/]+$/,
  /^\/api\/internal\/creator-review\/[^/]+$/,
];

/** Public dynamic routes with exactly one opaque segment. */
const PUBLIC_DYNAMIC_PATTERNS: readonly RegExp[] = [
  /^\/creator\/invite\/[^/]+$/,
  /^\/api\/creator\/invite\/[^/]+$/,
];

const E2E_CLEAN_CAPTURE_DEV_FIXTURE_PATHS = new Set<string>([
  '/dev/dtr-drawer-preview',
  '/dev/premium-share-preview',
  '/dev/dtr-processing-preview',
  '/dev/synastry-guest-result-preview',
  '/dev/my-owned-preview',
  '/dev/pair-share-preview',
]);

export function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  let path = pathname;
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.length > 1 && path.endsWith('/')) {
    path = path.replace(/\/+$/, '');
  }
  return path;
}

export function matchesPublicRoutePath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  if (PUBLIC_EXACT_PATHS.has(path)) return true;
  if (PUBLIC_DYNAMIC_PATTERNS.some((pattern) => pattern.test(path))) return true;
  for (const root of PUBLIC_PREFIX_ROOTS) {
    if (path === root || path.startsWith(`${root}/`)) return true;
  }
  return false;
}

export function matchesProtectedRoutePath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  if (PROTECTED_STATIC_PATHS.has(path)) return true;
  return PROTECTED_DYNAMIC_PATTERNS.some((pattern) => pattern.test(path));
}

export function classifyRouteAccess(pathname: string): RouteAccessClass {
  const path = normalizePathname(pathname);
  if (path === UNKNOWN_DOCUMENT_RECOVERY_PATH) {
    return 'unknown';
  }
  if (matchesPublicRoutePath(path)) return 'public';
  if (matchesProtectedRoutePath(path)) return 'protected';
  return 'unknown';
}

export function isUnknownApiPath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return path.startsWith('/api/') && classifyRouteAccess(path) === 'unknown';
}

export function isUnknownDocumentPath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  if (path.startsWith('/api/')) return false;
  if (path === UNKNOWN_DOCUMENT_RECOVERY_PATH) return true;
  return classifyRouteAccess(path) === 'unknown';
}

export function isReplyRuntimeVerificationPath(pathname: string): boolean {
  // Preserve raw middleware pathname semantics; do not strip trailing slashes here.
  if (!pathname) return false;
  let path = pathname;
  if (!path.startsWith('/')) path = `/${path}`;
  return (
    path === '/reply' ||
    path === '/reply/result' ||
    path === '/api/reply/history' ||
    path.startsWith('/api/reply/session/')
  );
}

export function evaluateNonProdReplyVerificationBypass(input: {
  nodeEnv: string | undefined;
  pathname: string;
  testUserIdHeader: string | null;
}): boolean {
  return (
    input.nodeEnv !== 'production' &&
    isReplyRuntimeVerificationPath(input.pathname) &&
    !!input.testUserIdHeader?.trim()
  );
}

export function evaluateLocalE2ECleanCaptureBypass(input: {
  m55E2ECleanCapture: string | undefined;
  nodeEnv: string | undefined;
  vercel: string | undefined;
  vercelEnv: string | undefined;
  pathname: string;
  host: string | null;
  isCleanCaptureDevFixture: boolean;
}): boolean {
  return (
    input.m55E2ECleanCapture === '1' &&
    input.nodeEnv !== 'production' &&
    input.vercel !== '1' &&
    !input.vercelEnv &&
    input.isCleanCaptureDevFixture &&
    isAuthorizedCleanCaptureLoopbackHost(input.host)
  );
}

export function isE2ECleanCaptureDevFixturePath(pathname: string): boolean {
  return E2E_CLEAN_CAPTURE_DEV_FIXTURE_PATHS.has(normalizePathname(pathname));
}

export function resolveAuthRoutingOutcome(input: {
  pathname: string;
  isPublicRoute: boolean;
  nonProdReplyBypass: boolean;
  cleanCaptureBypass: boolean;
}): AuthRoutingOutcome {
  const path = normalizePathname(input.pathname);
  const accessClass = classifyRouteAccess(path);

  if (input.isPublicRoute) {
    return { action: 'continue', accessClass: 'public' };
  }
  if (input.nonProdReplyBypass) {
    return { action: 'continue', accessClass };
  }
  if (input.cleanCaptureBypass) {
    return { action: 'continue', accessClass };
  }
  if (path === UNKNOWN_DOCUMENT_RECOVERY_PATH) {
    return { action: 'continue', accessClass: 'unknown' };
  }
  if (accessClass === 'protected') {
    return { action: 'protect', accessClass: 'protected' };
  }
  if (path.startsWith('/api/')) {
    return { action: 'unknown_api', accessClass: 'unknown' };
  }
  return { action: 'unknown_document_rewrite', accessClass: 'unknown' };
}

export function createPlainUnknownApi404Response(): NextResponse {
  return new NextResponse('Not Found', {
    status: 404,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export function createUnknownDocumentRecoveryRewrite(requestUrl: string | URL): NextResponse {
  return NextResponse.rewrite(new URL(UNKNOWN_DOCUMENT_RECOVERY_PATH, requestUrl));
}
