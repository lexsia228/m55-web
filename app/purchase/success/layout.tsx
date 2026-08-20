import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '購入完了 | M55',
  robots: { index: false, follow: false },
};

export default function PurchaseSuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
