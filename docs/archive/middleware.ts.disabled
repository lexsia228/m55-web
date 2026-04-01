import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/** /legal/* と /support は常に公開（ログイン不要・Stripe 審査必須） */
const isPublicRoute = createRouteMatcher(['/legal(.*)', '/support']);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return; // 法務・サポートは認証不要で通過
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
