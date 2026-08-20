import { redirect } from 'next/navigation';

/** G3-04 KEEP_REJECTED — legacy Today route; temporary redirect only (not permanent). */
export default function TodayLegacyRedirectPage() {
  redirect('/core');
}
