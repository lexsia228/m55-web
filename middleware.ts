import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { isAuthorizedCleanCaptureLoopbackHost } from './lib/m55/e2e/isAuthorizedCleanCaptureLoopbackHost';

const isPublicRoute = createRouteMatcher([
  '/',
  '/home',
  '/core',
  '/r(.*)',
  '/today',
  '/weekly',
  '/dtr(.*)',
  '/support(.*)',
  '/pricing',
  '/legal(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/my',
  '/how-m55-works',
  '/ten-views',
  '/synastry',
  '/synastry/purchase/confirm',
  '/dev/synastry-paid-report-preview',
  '/dev/synastry-commerce-preview',
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
]);

const isE2ECleanCaptureDevFixture = createRouteMatcher([
  '/dev/dtr-drawer-preview',
  '/dev/premium-share-preview',
]);

export default clerkMiddleware(async (auth, req) => {
  // non-prod runtime verification only:
  // allow reply runtime verification routes with test user header,
  // without affecting production auth behavior.
  const pathname = req.nextUrl.pathname;
  const isReplyRuntimeVerificationPath =
    pathname === '/reply' ||
    pathname === '/reply/result' ||
    pathname === '/api/reply/history' ||
    pathname.startsWith('/api/reply/session/');
  const isNonProdReplyVerificationBypass =
    process.env.NODE_ENV !== 'production' &&
    isReplyRuntimeVerificationPath &&
    !!req.headers.get('x-m55-test-user-id')?.trim();

  // Local E2E clean-capture only: allow the two governed /dev fixture routes when
  // M55_E2E_CLEAN_CAPTURE=1 AND the request Host is an exact loopback hostname.
  // Unavailable under Vercel Preview/Production, non-loopback Host headers, or when
  // the flag is absent (fail-closed). Does not fabricate entitlements.
  const isLocalE2ECleanCaptureFixture =
    process.env.M55_E2E_CLEAN_CAPTURE === '1' &&
    process.env.NODE_ENV !== 'production' &&
    process.env.VERCEL !== '1' &&
    !process.env.VERCEL_ENV &&
    isE2ECleanCaptureDevFixture(req) &&
    isAuthorizedCleanCaptureLoopbackHost(req.headers.get('host'));

  if (!isPublicRoute(req) && !isNonProdReplyVerificationBypass && !isLocalE2ECleanCaptureFixture) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/prototype/:path*',
    '/((?!_next|.*\\..*).*)',
    '/(api|trpc)(.*)',
  ],
};
