'use client';

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next';
import { sanitizeAnalyticsBeforeSendEvent } from '../../lib/m55/analytics/sanitizeAnalyticsPageUrl';

/**
 * Client-only Analytics mount with privacy-safe beforeSend redaction.
 * Must not receive a Server Component function prop (serialization boundary).
 */
export default function M55PrivacySafeAnalytics() {
  return (
    <Analytics
      beforeSend={(event: BeforeSendEvent) => {
        const next = sanitizeAnalyticsBeforeSendEvent(event);
        return next as BeforeSendEvent | null;
      }}
    />
  );
}
