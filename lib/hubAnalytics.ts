/**
 * M55 /prototype/hub minimum funnel analytics.
 * PostHog only. No-op when NEXT_PUBLIC_POSTHOG_KEY is not set.
 * See docs/audit/M55_POSTHOG_MINIMUM_FUNNEL_SPEC_2026-03-07.md
 */

import posthog from 'posthog-js';

let initialized = false;

function initIfNeeded(): boolean {
  if (typeof window === 'undefined') return false;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!key) return false;
  if (initialized) return true;
  try {
    posthog.init(key, {
      api_host: host || 'https://us.i.posthog.com',
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
    });
    initialized = true;
    return true;
  } catch {
    return false;
  }
}

export type HubCardType = 'core' | 'weekly' | 'daily' | 'monthly';

export type HubEventProperties = {
  tier?: string;
  has_monthly_dtr?: boolean;
  section?: 'retention_comparison' | 'plan_summary';
  card_type?: HubCardType;
  is_unlocked?: boolean;
  source_surface?: 'prototype_hub';
};

export function captureHubEvent(event: string, properties?: HubEventProperties): void {
  if (!initIfNeeded()) return;
  try {
    posthog.capture(event, properties);
  } catch {
    /* no-op */
  }
}
