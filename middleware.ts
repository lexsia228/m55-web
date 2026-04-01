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
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|.*\\..*).*)',
    '/(api|trpc)(.*)',
  ],
};
