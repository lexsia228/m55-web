import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import {
  createPlainUnknownApi404Response,
  createUnknownDocumentRecoveryRewrite,
  evaluateLocalE2ECleanCaptureBypass,
  evaluateNonProdReplyVerificationBypass,
  resolveAuthRoutingOutcome,
} from './lib/m55/authRouting/routeAccessContract';

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
  '/creator',
  '/creator/apply',
  '/creator/portal',
  '/creator/invite/:token',
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
  '/api/creator/invite/:token',
  '/api/m55/attribution/creator-touch',
]);

const isE2ECleanCaptureDevFixture = createRouteMatcher([
  '/dev/dtr-drawer-preview',
  '/dev/premium-share-preview',
  '/dev/dtr-processing-preview',
  '/dev/synastry-guest-result-preview',
  '/dev/my-owned-preview',
  '/dev/pair-share-preview',
]);

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;

  const nonProdReplyBypass = evaluateNonProdReplyVerificationBypass({
    nodeEnv: process.env.NODE_ENV,
    pathname,
    testUserIdHeader: req.headers.get('x-m55-test-user-id'),
  });

  const cleanCaptureBypass = evaluateLocalE2ECleanCaptureBypass({
    m55E2ECleanCapture: process.env.M55_E2E_CLEAN_CAPTURE,
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV,
    pathname,
    host: req.headers.get('host'),
    isCleanCaptureDevFixture: isE2ECleanCaptureDevFixture(req),
  });

  const outcome = resolveAuthRoutingOutcome({
    pathname,
    isPublicRoute: isPublicRoute(req),
    nonProdReplyBypass,
    cleanCaptureBypass,
  });

  switch (outcome.action) {
    case 'continue':
      return;
    case 'protect':
      await auth.protect();
      return;
    case 'unknown_api':
      return createPlainUnknownApi404Response();
    case 'unknown_document_rewrite':
      return createUnknownDocumentRecoveryRewrite(req.url);
  }
});

export const config = {
  matcher: [
    '/prototype/:path*',
    '/((?!_next|.*\\..*).*)',
    '/(api|trpc)(.*)',
  ],
};
