/**
 * Privacy-safe funnel events for conversion and post-purchase use.
 * Transport: existing @vercel/analytics (already in app layout).
 * No new provider / endpoint / DB. No PII / answers / theme / selectors.
 */

import { track } from '@vercel/analytics';

export const M55_FUNNEL_EVENT_VERSION = 'v1' as const;

export const M55_FUNNEL_EVENTS = {
  /** Self free→premium funnel (privacy-safe names). */
  selfEntryStarted: 'self_entry_started',
  dobCompleted: 'dob_completed',
  coreQuestionsCompleted: 'core_questions_completed',
  freeResultViewed: 'free_result_viewed',
  premiumBridgeViewed: 'premium_bridge_viewed',
  premiumPlanSelected: 'premium_plan_selected',
  authRequiredShown: 'auth_required_shown',
  checkoutStarted: 'checkout_started',
  premiumReportOpened: 'premium_report_opened',
  resultRerunStarted: 'result_rerun_started',
  additionalThemeStarted: 'additional_theme_started',
  consultReplyStarted: 'consult_reply_started',
  /** Existing surfaces (kept for continuity). */
  freeResultView: 'm55_free_result_view',
  paidBridgeView: 'm55_paid_bridge_view',
  paidBridgePrimaryClick: 'm55_paid_bridge_primary_click',
  paidBridgeContinueFreeClick: 'm55_paid_bridge_continue_free_click',
  paidQuestionnaireStart: 'm55_paid_questionnaire_start',
  paidQuestionnaireComplete: 'm55_paid_questionnaire_complete',
  paidPlanView: 'm55_paid_plan_view',
  mySavedReportView: 'm55_my_saved_report_view',
  savedReportOpen: 'm55_saved_report_open',
  additionalReadingEntryView: 'm55_additional_reading_entry_view',
  additionalReadingStartClick: 'm55_additional_reading_start_click',
  additionalReadingFlowView: 'm55_additional_reading_flow_view',
  additionalReadingThemeSelected: 'm55_additional_reading_theme_selected',
  additionalReadingReviewView: 'm55_additional_reading_review_view',
  additionalReadingSendIntent: 'm55_additional_reading_send_intent',
  compatibilityInputView: 'm55_compatibility_input_view',
  compatibilityFreeResultView: 'm55_compatibility_free_result_view',
  compatibilityActionView: 'm55_compatibility_action_view',
  compatibilityPaidBridgeView: 'm55_compatibility_paid_bridge_view',
  compatibilityPaidBridgeClick: 'm55_compatibility_paid_bridge_click',
  compatibilityPaidReportView: 'm55_compatibility_paid_report_view',
  compatibilityPaidChapterOpen: 'm55_compatibility_paid_chapter_open',
  compatibilityPhraseCopy: 'm55_compatibility_phrase_copy',
  compatibilityExperimentView: 'm55_compatibility_experiment_view',
  compatibilityPurchaseView: 'm55_compatibility_purchase_view',
  compatibilityCheckoutIntent: 'm55_compatibility_checkout_intent',
  compatibilityCheckoutRedirect: 'm55_compatibility_checkout_redirect',
  compatibilitySavedReportView: 'm55_compatibility_saved_report_view',
  compatibilityOwnedReportOpen: 'm55_compatibility_owned_report_open',
  compatibilityQuestionnaireView: 'm55_compatibility_questionnaire_view',
  compatibilityQuestionnaireStart: 'm55_compatibility_questionnaire_start',
  compatibilityQuestionnaireComplete: 'm55_compatibility_questionnaire_complete',
  compatibilityPersonalizedResultView: 'm55_compatibility_personalized_result_view',
  compatibilityPersonalizedPaidBridgeView:
    'm55_compatibility_personalized_paid_bridge_view',
  compatibilityPersonalizedPaidBridgeClick:
    'm55_compatibility_personalized_paid_bridge_click',
} as const;

export type M55FunnelEventName = (typeof M55_FUNNEL_EVENTS)[keyof typeof M55_FUNNEL_EVENTS];

export type M55FunnelSurface =
  | 'core_free_entry'
  | 'core_free_result'
  | 'core_paid_bridge'
  | 'dtr_paid_questionnaire'
  | 'dtr_paid_plan'
  | 'my_saved_report'
  | 'dtr_saved_report'
  | 'dtr_additional_reading'
  | 'compatibility_guest'
  | 'compatibility_paid_report'
  | 'compatibility_purchase'
  | 'compatibility_saved_report';

/** Allowlisted payload keys only. */
export type M55FunnelPayload = {
  eventVersion: typeof M55_FUNNEL_EVENT_VERSION;
  surface: M55FunnelSurface;
  occurredAt: string;
};

const ALLOWED_KEYS = new Set(['eventVersion', 'surface', 'occurredAt'] as const);

const FORBIDDEN_KEY_PATTERN =
  /dob|birth|hash|nickname|email|clerk|userId|user_id|answer|theme|trait|selector|fingerprint|report|chapter|question|axis|topic|status|temperature|action|mapping|resultText/i;

const firedImpressions = new Set<string>();

export function buildPrivacySafeFunnelPayload(
  surface: M55FunnelSurface,
  occurredAt = new Date().toISOString(),
): M55FunnelPayload {
  return {
    eventVersion: M55_FUNNEL_EVENT_VERSION,
    surface,
    occurredAt,
  };
}

export function assertPrivacySafeFunnelPayload(payload: Record<string, unknown>): void {
  const keys = Object.keys(payload);
  for (const key of keys) {
    if (!ALLOWED_KEYS.has(key as keyof M55FunnelPayload)) {
      throw new Error(`forbidden funnel payload key: ${key}`);
    }
    if (FORBIDDEN_KEY_PATTERN.test(key)) {
      throw new Error(`forbidden funnel payload key pattern: ${key}`);
    }
  }
  if (payload.eventVersion !== M55_FUNNEL_EVENT_VERSION) {
    throw new Error('invalid eventVersion');
  }
  if (typeof payload.surface !== 'string' || !payload.surface) {
    throw new Error('surface required');
  }
  if (typeof payload.occurredAt !== 'string' || !payload.occurredAt) {
    throw new Error('occurredAt required');
  }
}

function emit(event: M55FunnelEventName, surface: M55FunnelSurface): void {
  if (typeof window === 'undefined') return;
  try {
    const payload = buildPrivacySafeFunnelPayload(surface);
    assertPrivacySafeFunnelPayload(payload);
    track(event, payload);
  } catch {
    /* analytics must never break UX */
  }
}

/** One impression per logical mount key (survives React Strict Mode remount in same session). */
export function trackFunnelImpressionOnce(
  event: M55FunnelEventName,
  surface: M55FunnelSurface,
  mountKey: string,
): void {
  if (firedImpressions.has(mountKey)) return;
  firedImpressions.add(mountKey);
  emit(event, surface);
}

export function trackFunnelAction(event: M55FunnelEventName, surface: M55FunnelSurface): void {
  emit(event, surface);
}

/** Test-only reset for impression dedupe. */
export function resetFunnelImpressionDedupeForTests(): void {
  firedImpressions.clear();
}
