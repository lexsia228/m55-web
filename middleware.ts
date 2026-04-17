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
  // allow /reply rendering with test user header, without affecting production auth behavior.
  const isNonProdReplyVerificationBypass =
    process.env.NODE_ENV !== 'production' &&
    req.nextUrl.pathname === '/reply' &&
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
