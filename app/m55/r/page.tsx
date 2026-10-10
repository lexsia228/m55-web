import type { Metadata } from 'next';
import { ReferralEntryClient } from './ReferralEntryClient';

export const metadata: Metadata = {
  title: 'M55',
  referrer: 'no-referrer',
};

export default function ReferralEntryPage() {
  return <ReferralEntryClient />;
}
