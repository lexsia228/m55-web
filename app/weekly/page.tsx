import { redirect } from 'next/navigation';

/** G3-04 KEEP_REJECTED — legacy Weekly route; temporary redirect only (not permanent). */
export default function WeeklyLegacyRedirectPage() {
  redirect('/core');
}
