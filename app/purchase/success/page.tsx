import { redirect } from 'next/navigation';

/**
 * Legacy Stripe success_url 互換: 決済完了後の待機・反映は /dtr/processing に統一。
 */
export default async function PurchaseSuccessPage(props: {
  searchParams?: Promise<{ session_id?: string }>;
}) {
  const params = props.searchParams ? await props.searchParams : {};
  const sessionId = typeof params.session_id === 'string' ? params.session_id : undefined;
  if (sessionId) {
    redirect(`/dtr/processing?session_id=${encodeURIComponent(sessionId)}`);
  }
  redirect('/dtr/processing');
}
