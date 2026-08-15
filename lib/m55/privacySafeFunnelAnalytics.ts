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
  resultRevealCompleted: 'result_reveal_completed',
  sharePreviewOpened: 'share_preview_opened',
  nativeShareInvoked: 'native_share_invoked',
  shareLinkCopied: 'share_link_copied',
  sharedEntryOpened: 'shared_entry_opened',
  sharedEntryCtaClicked: 'shared_entry_cta_clicked',
  shareCardImpression: 'share_card_impression',
  shareCardSelected: 'share_card_selected',
  shareXClicked: 'share_x_clicked',
  shareImageSaved: 'share_image_saved',
  premiumCtaViewed: 'premium_cta_viewed',
  premiumCtaClicked: 'premium_cta_clicked',
  premiumBridgeViewed: 'premium_bridge_viewed',
  premiumPlanSelected: 'premium_plan_selected',
  authRequiredShown: 'auth_required_shown',
  checkoutStarted: 'checkout_started',
  premiumReportOpened: 'premium_report_opened',
  resultRerunStarted: 'result_rerun_started',
  additionalThemeStarted: 'additional_theme_started',
  consultReplyStarted: 'consult_reply_started',
  /**
   * Legacy wire names retained for external consumer compatibility.
   * Canonical Self-funnel semantics (prefer these at new emit sites):
   * freeResultViewed / premiumBridgeViewed / premiumPlanSelected.
   * Do not dual-emit a legacy alias alongside its canonical twin for one action.
   */
  freeResultView: 'm55_free_result_view',
  paidBridgeView: 'm55_paid_bridge_view',
  paidBridgePrimaryClick: 'm55_paid_bridge_primary_click',
  paidBridgeContinueFreeClick: 'm55_paid_bridge_continue_free_click',
  paidQuestionnaireStart: 'm55_paid_questionnaire_start',
  paidQuestionnaireComplete: 'm55_paid_questionnaire_complete',
  paidPlanView: 'm55_paid_plan_view',
  paidPlanSelected: 'plan_selected',
  paidQuestionsStarted: 'paid_questions_started',
  paidQuestionsCompleted: 'paid_questions_completed',
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
  | 'core_share'
  | 'shared_entry'
  | 'dtr_paid_questionnaire'
  | 'dtr_paid_plan'
  | 'my_saved_report'
  | 'dtr_saved_report'
  | 'dtr_additional_reading'
  | 'compatibility_guest'
  | 'compatibility_paid_report'
  | 'compatibility_purchase'
  | 'compatibility_saved_report';

export type M55ShareVariantEnum = 'manual' | 'mirror' | 'hidden_spec' | 'pair';
export type M55ShareChannelEnum = 'x' | 'native' | 'image' | 'copy';
export type M55EntrySourceEnum = 'shared_result';

/** Allowlisted payload keys only. */
export type M55FunnelPayload = {
  eventVersion: typeof M55_FUNNEL_EVENT_VERSION;
  surface: M55FunnelSurface;
  occurredAt: string;
  shareVariant?: M55ShareVariantEnum;
  shareChannel?: M55ShareChannelEnum;
  entrySource?: M55EntrySourceEnum;
};

const ALLOWED_KEYS = new Set([
  'eventVersion',
  'surface',
  'occurredAt',
  'shareVariant',
  'shareChannel',
  'entrySource',
] as const);

const SHARE_VARIANT_VALUES = new Set(['manual', 'mirror', 'hidden_spec', 'pair']);
const SHARE_CHANNEL_VALUES = new Set(['x', 'native', 'image', 'copy']);
const ENTRY_SOURCE_VALUES = new Set(['shared_result']);

const FORBIDDEN_KEY_PATTERN =
  /dob|birth|hash|nickname|email|clerk|userId|user_id|answer|theme|trait|selector|fingerprint|report|chapter|question|axis|topic|status|temperature|action|mapping|resultText/i;

const firedImpressions = new Set<string>();
const firedActions = new Set<string>();

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
  if (payload.shareVariant !== undefined && !SHARE_VARIANT_VALUES.has(String(payload.shareVariant))) {
    throw new Error('invalid shareVariant');
  }
  if (payload.shareChannel !== undefined && !SHARE_CHANNEL_VALUES.has(String(payload.shareChannel))) {
    throw new Error('invalid shareChannel');
  }
  if (payload.entrySource !== undefined && !ENTRY_SOURCE_VALUES.has(String(payload.entrySource))) {
    throw new Error('invalid entrySource');
  }
}

export type M55FunnelPayloadExtras = Pick<
  M55FunnelPayload,
  'shareVariant' | 'shareChannel' | 'entrySource'
>;

function emit(
  event: M55FunnelEventName,
  surface: M55FunnelSurface,
  extras?: M55FunnelPayloadExtras,
): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: M55FunnelPayload = {
      ...buildPrivacySafeFunnelPayload(surface),
      ...extras,
    };
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
  extras?: M55FunnelPayloadExtras,
): void {
  if (firedImpressions.has(mountKey)) return;
  firedImpressions.add(mountKey);
  emit(event, surface, extras);
}

export function trackFunnelAction(
  event: M55FunnelEventName,
  surface: M55FunnelSurface,
  extras?: M55FunnelPayloadExtras,
): void {
  emit(event, surface, extras);
}

/** One action per logical key — prevents rapid-click / remount duplicates. */
export function trackFunnelActionOnce(
  event: M55FunnelEventName,
  surface: M55FunnelSurface,
  actionKey: string,
  extras?: M55FunnelPayloadExtras,
): void {
  if (firedActions.has(actionKey)) return;
  firedActions.add(actionKey);
  emit(event, surface, extras);
}

/** Test-only reset for impression/action dedupe. */
export function resetFunnelImpressionDedupeForTests(): void {
  firedImpressions.clear();
  firedActions.clear();
}
