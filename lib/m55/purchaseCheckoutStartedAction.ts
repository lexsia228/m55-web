/**
 * PurchaseButton checkout attempt orchestration (DI for deterministic tests).
 * `checkout_started` fires only after a successful checkout response with a URL,
 * immediately before navigating to that checkout destination.
 *
 * Also exports server-side checkout intent identity helpers (deterministic purchase
 * context + Stripe idempotency key) used by /api/purchase/checkout.
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
  repurchaseAcknowledged?: boolean;
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
  | { kind: 'repurchase_ack_required'; message: string }
  | { kind: 'fulfillment_pending'; message: string; recoveryPath: string }
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
export const PURCHASE_CHECKOUT_PUBLIC_ERRORS = {
  checkout_unavailable:
    '支払い画面を開けませんでした。時間をおいてもう一度お試しください。改善しない場合はサポートへお問い合わせください。',
  checkout_status_unknown:
    '購入状態を確認できませんでした。再購入する前に、このページを再読み込みするか、マイページで状況をご確認ください。',
  fulfillment_pending:
    'お支払い済みのご購入を反映しています。再購入は不要です。準備状況はマイページから確認できます。',
  repurchase_ack_required:
    '新しいプレミアムレポートの追加購入には、上記の確認と同意が必要です。',
  generic_continue: '購入を続行できません。しばらくしてからお試しください。',
} as const;

export type PendingCheckoutExtra = {
  pendingCheckoutSessionId?: string;
  pendingCheckoutProductId?: string;
  checkoutSessionGeneration?: number;
};

export function readPendingCheckoutExtra(extra: Record<string, unknown> | null | undefined): PendingCheckoutExtra {
  if (!extra || typeof extra !== 'object') return { checkoutSessionGeneration: 0 };
  return {
    pendingCheckoutSessionId:
      typeof extra.pendingCheckoutSessionId === 'string' ? extra.pendingCheckoutSessionId : undefined,
    pendingCheckoutProductId:
      typeof extra.pendingCheckoutProductId === 'string' ? extra.pendingCheckoutProductId : undefined,
    checkoutSessionGeneration:
      typeof extra.checkoutSessionGeneration === 'number' ? extra.checkoutSessionGeneration : 0,
  };
}

/** Synchronous FNV-1a 64-bit — safe in client and server bundles (no node:crypto). */
function fnv1a64Utf8(input: string): bigint {
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash;
}

function deterministicSeedHex(seed: string): string {
  const a = fnv1a64Utf8(seed);
  const b = fnv1a64Utf8(`${seed}\x1e`);
  return a.toString(16).padStart(16, '0') + b.toString(16).padStart(16, '0');
}

/**
 * Server-authoritative purchase context when no draft row exists yet.
 * Same user + product + intent lane → same UUID before Stripe (closes first-intent concurrency race).
 */
export function buildDeterministicCheckoutPurchaseContextId(
  userId: string,
  productId: string,
  repurchaseLane: boolean,
): string {
  const seed = `m55_dtr_checkout_ctx_v1:${userId}:${productId}:${repurchaseLane ? 'repurchase' : 'fresh'}`;
  const hex = deterministicSeedHex(seed);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function resolveCheckoutPurchaseContextId(args: {
  userId: string;
  productId: string;
  repurchaseLane: boolean;
  existingDraftId: string | null;
}): string {
  return (
    args.existingDraftId ??
    buildDeterministicCheckoutPurchaseContextId(args.userId, args.productId, args.repurchaseLane)
  );
}

export function buildCheckoutIdempotencyKey(
  userId: string,
  productId: string,
  purchaseContextId: string,
  generation: number,
): string {
  const raw = `m55_dtr_co_v1_${userId}_${productId}_${purchaseContextId}_g${generation}`;
  return raw.length <= 255 ? raw : raw.slice(0, 255);
}

export type CheckoutSessionReuseKind = 'open' | 'paid' | 'unusable' | 'retrieve_failed' | 'none';

/** Generation for a new Stripe session after reuse evaluation (sync model for tests). */
export function resolveCheckoutSessionGeneration(args: {
  pendingExtra: Record<string, unknown>;
  productId: string;
  sessionReuseKind: CheckoutSessionReuseKind;
}): number {
  const pendingMeta = readPendingCheckoutExtra(args.pendingExtra);
  let generation = pendingMeta.checkoutSessionGeneration ?? 0;
  if (
    pendingMeta.pendingCheckoutSessionId &&
    pendingMeta.pendingCheckoutProductId === args.productId &&
    args.sessionReuseKind === 'unusable'
  ) {
    generation += 1;
  }
  return generation;
}

export function mapPurchaseCheckoutHttpError(status: number, data: PurchaseCheckoutJson): string {
  if (data.code === 'repurchase_ack_required') {
    return PURCHASE_CHECKOUT_PUBLIC_ERRORS.repurchase_ack_required;
  }
  if (status === 401) {
    return PURCHASE_CHECKOUT_PUBLIC_ERRORS.generic_continue;
  }
  return PURCHASE_CHECKOUT_PUBLIC_ERRORS.checkout_unavailable;
}

export async function runPurchaseCheckoutAttempt(args: {
  productId: string;
  profile: BirthProfile | null;
  freeAnswerSet?: Record<string, string>;
  paidAnswerSet?: Record<string, string>;
  repurchaseAcknowledged?: boolean;
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
    if (args.repurchaseAcknowledged) payload.repurchaseAcknowledged = true;

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

    if (res.status === 400 && data.code === 'repurchase_ack_required') {
      submitLock.current = false;
      return {
        kind: 'repurchase_ack_required',
        message: PURCHASE_CHECKOUT_PUBLIC_ERRORS.repurchase_ack_required,
      };
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
          submitLock.current = false;
          return {
            kind: 'fulfillment_pending',
            message: PURCHASE_CHECKOUT_PUBLIC_ERRORS.fulfillment_pending,
            recoveryPath: '/dtr/processing?recovery=owned',
          };
        }
        return { kind: 'navigated' };
      }
      submitLock.current = false;
      return { kind: 'error', message: PURCHASE_CHECKOUT_PUBLIC_ERRORS.generic_continue };
    }

    if (!res.ok) {
      submitLock.current = false;
      return {
        kind: 'error',
        message: mapPurchaseCheckoutHttpError(res.status, data),
      };
    }

    const checkoutUrl = typeof data?.url === 'string' ? data.url.trim() : '';
    if (!checkoutUrl) {
      submitLock.current = false;
      return { kind: 'error', message: PURCHASE_CHECKOUT_PUBLIC_ERRORS.checkout_unavailable };
    }

    deps.trackFunnelAction(M55_FUNNEL_EVENTS.checkoutStarted, SURFACE);
    deps.navigateHref(checkoutUrl);
    return { kind: 'navigated' };
  } catch (e) {
    submitLock.current = false;
    const isAbort = e instanceof Error && e.name === 'AbortError';
    return {
      kind: 'error',
      message: isAbort
        ? PURCHASE_CHECKOUT_PUBLIC_ERRORS.checkout_status_unknown
        : PURCHASE_CHECKOUT_PUBLIC_ERRORS.checkout_unavailable,
    };
  }
}
