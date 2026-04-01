/**
 * Root redirect → /home (current shell Home)
 *
 * The review-safe/Stripe-safe standalone landing that was here previously
 * is retired from root. Users now land on the full shell Home.
 *
 * M55_MAIN_PAGE_HOOK_AND_INFORMATION_ARCHITECTURE_SSOT_v1
 * M55_PUBLIC_SKIN_STRATEGY_SSOT_20260324_v1
 */
import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/home');
}
