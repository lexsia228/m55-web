/**
 * Server-side privacy-safe funnel transport via @vercel/analytics/server.
 * Must never throw into fulfillment / snapshot delivery paths.
 */

import { track } from '@vercel/analytics/server';
import {
  assertPrivacySafeFunnelPayload,
  buildPrivacySafeFunnelPayload,
  type M55FunnelEventName,
  type M55FunnelPayload,
  type M55FunnelPayloadExtras,
  type M55FunnelSurface,
} from '../privacySafeFunnelAnalytics';

export async function trackServerFunnelAction(
  event: M55FunnelEventName,
  surface: M55FunnelSurface,
  extras?: M55FunnelPayloadExtras,
): Promise<void> {
  try {
    const payload: M55FunnelPayload = {
      ...buildPrivacySafeFunnelPayload(surface),
      ...extras,
    };
    assertPrivacySafeFunnelPayload(payload);
    await track(event, payload);
  } catch (err) {
    try {
      console.info(
        '[m55-server-analytics]',
        JSON.stringify({
          lane: 'server_funnel',
          event_type: event,
          status: 'transport_failed',
          failure_reason: err instanceof Error ? err.name : 'unknown',
        }),
      );
    } catch {
      /* swallow */
    }
  }
}
