/**
 * PurchaseButton checkout attempt orchestration (DI for deterministic tests).
 * `checkout_started` fires only after a successful checkout response with a URL,
 * immediately before navigating to that checkout destination.
 */

import type { BirthProfile } from '../soul/profile';
import {
  M55_FUNNEL_EVENTS,
  type M55FunnelEventName,
  type M55FunnelSurface,
} from './privacySafeFunnelAnalytics';

export type PurchaseCheckoutPayload = {
  productId: string;
  profile?: BirthProfile;
  freeAnswerSet?: Record<string, string>;
  paidAnswerSet?: Record<string, string>;
};

export type PurchaseCheckoutJson = {
  code?: string;
  error?: string;
  url?: string;
  resumeCheckoutSessionId?: string;
};

export type PurchaseCheckoutResponse = {
  status: number;
  ok: boolean;
  json: () => Promise<PurchaseCheckoutJson>;
};

export type PurchaseCheckoutAttemptOutcome =
  | { kind: 'skipped_locked' }
  | { kind: 'needs_profile' }
  | { kind: 'invalid_product'; message: string }
  | { kind: 'needs_sign_in' }
  | { kind: 'error'; message: string }
  | { kind: 'navigated' };

export type PurchaseCheckoutStartedDeps = {
  fetchCheckout: (payload: PurchaseCheckoutPayload) => Promise<PurchaseCheckoutResponse>;
  trackFunnelAction: (event: M55FunnelEventName, surface: M55FunnelSurface) => void;
  navigateHref: (url: string) => void;
  navigateReplace: (url: string) => void;
  isProfileGatedProduct: (productId: string) => boolean;
  validateProfile: (profile: BirthProfile | null) => { ok: boolean };
  isValidCheckoutProduct: (productId: string) => boolean;
  warn?: (message: string) => void;
};

const SURFACE: M55FunnelSurface = 'dtr_paid_plan';
const INVALID_PRODUCT_MESSAGE = 'この商品は現在ご購入いただけません。';
const GENERIC_CONTINUE_ERROR = '購入を続行できません。しばらくしてからお試しください。';

export async function runPurchaseCheckoutAttempt(args: {
  productId: string;
  profile: BirthProfile | null;
  freeAnswerSet?: Record<string, string>;
  paidAnswerSet?: Record<string, string>;
  submitLock: { current: boolean };
  loading: boolean;
  deps: PurchaseCheckoutStartedDeps;
}): Promise<PurchaseCheckoutAttemptOutcome> {
  const { productId, profile, submitLock, loading, deps } = args;
  if (submitLock.current || loading) {
    return { kind: 'skipped_locked' };
  }
  submitLock.current = true;

  try {
    if (deps.isProfileGatedProduct(productId)) {
      const gate = deps.validateProfile(profile);
      if (!gate.ok) {
        submitLock.current = false;
        return { kind: 'needs_profile' };
      }
    }
    if (!deps.isValidCheckoutProduct(productId)) {
      submitLock.current = false;
      return { kind: 'invalid_product', message: INVALID_PRODUCT_MESSAGE };
    }

    const payload: PurchaseCheckoutPayload = { productId };
    if (profile?.birthDate && profile.nickname?.trim()) {
      payload.profile = profile;
    }
    if (args.freeAnswerSet) payload.freeAnswerSet = args.freeAnswerSet;
    if (args.paidAnswerSet) payload.paidAnswerSet = args.paidAnswerSet;

    const res = await deps.fetchCheckout(payload);

    if (res.status === 401) {
      deps.trackFunnelAction(M55_FUNNEL_EVENTS.authRequiredShown, SURFACE);
      submitLock.current = false;
      return { kind: 'needs_sign_in' };
    }

    const data = await res.json();

    if (res.status === 400 && data.code === 'composite_profile_incomplete') {
      submitLock.current = false;
      return { kind: 'needs_profile' };
    }

    if (res.status === 409) {
      if (data.code === 'already_purchased') {
        deps.navigateReplace('/dtr/core');
        return { kind: 'navigated' };
      }
      if (data.code === 'fulfillment_pending') {
        const sid =
          typeof data.resumeCheckoutSessionId === 'string'
            ? data.resumeCheckoutSessionId.trim()
            : '';
        if (sid) {
          deps.navigateReplace(`/dtr/processing?session_id=${encodeURIComponent(sid)}`);
        } else {
          deps.warn?.('[PurchaseButton] fulfillment_pending without resumeCheckoutSessionId');
          deps.navigateReplace('/dtr/lp');
        }
        return { kind: 'navigated' };
      }
      submitLock.current = false;
      return { kind: 'error', message: GENERIC_CONTINUE_ERROR };
    }

    if (!res.ok) {
      submitLock.current = false;
      return {
        kind: 'error',
        message: data?.error ?? `Error ${res.status}`,
      };
    }

    const checkoutUrl = typeof data?.url === 'string' ? data.url.trim() : '';
    if (!checkoutUrl) {
      submitLock.current = false;
      return { kind: 'error', message: 'Checkout URL not returned' };
    }

    // Successful session creation → checkout destination navigation boundary.
    deps.trackFunnelAction(M55_FUNNEL_EVENTS.checkoutStarted, SURFACE);
    deps.navigateHref(checkoutUrl);
    return { kind: 'navigated' };
  } catch (e) {
    submitLock.current = false;
    return {
      kind: 'error',
      message: e instanceof Error ? e.message : 'エラーが発生しました',
    };
  }
}
