import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/home',
  '/core',
  '/today',
  '/weekly',
  '/dtr(.*)',
  '/support(.*)',
  '/legal(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/my',
  '/how-m55-works',
  '/ten-views',
  '/api/stripe/webhook',
  '/api/purchase/checkout',
  '/api/diagnostics/env',
  '/api/diagnostics/core-regression',
  '/api/reply/generate',
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

  if (!isPublicRoute(req) && !isNonProdReplyVerificationBypass) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|.*\\..*).*)',
    '/(api|trpc)(.*)',
  ],
};
