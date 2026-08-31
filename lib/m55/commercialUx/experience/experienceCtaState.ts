/**
 * M55 Experience Control Plane v2 — explicit CTA state model.
 * One label per user/route state; no route-local synonyms for the same action.
 */

import type { SelfFunnelStage } from '../../selfFunnel/selfFunnelRuntimeState';
import { M55_COMMERCIAL_TERMINOLOGY as T } from '../terminology';

export const M55_CTA_STATES = [
  'FRESH',
  'FREE_IN_PROGRESS',
  'FREE_COMPLETE',
  'FREE_TO_PREMIUM',
  'PREMIUM_IN_PROGRESS',
  'PREMIUM_COMPLETE',
  'PLAN_SELECTED',
  'PAYMENT_READY',
  'PURCHASED',
  'RETURN_TO_FREE_RESULT',
  'SHARED_RECIPIENT',
] as const;

export type M55CtaState = (typeof M55_CTA_STATES)[number];

export const M55_CTA_LABELS: Record<M55CtaState, string> = {
  FRESH: '無料で見てみる',
  FREE_IN_PROGRESS: '無料結果の続きを見る',
  FREE_COMPLETE: '無料結果を開く',
  FREE_TO_PREMIUM: T.premiumBridgeCta,
  PREMIUM_IN_PROGRESS: 'プレミアムの続きを見る',
  PREMIUM_COMPLETE: T.selectPlan,
  PLAN_SELECTED: '支払い内容を確認する',
  PAYMENT_READY: T.checkoutProceed,
  PURCHASED: 'プレミアムレポートを開く',
  RETURN_TO_FREE_RESULT: T.returnToFreeResult,
  SHARED_RECIPIENT: T.recipientAction,
} as const;

export type ExperienceCtaResolveInput = {
  stage: SelfFunnelStage;
  surface?:
    | 'home'
    | 'core'
    | 'shared_entry'
    | 'premium_lp'
    | 'plan'
    | 'checkout'
    | 'purchased';
  planSelected?: boolean;
};

export function resolveExperienceCtaState(input: ExperienceCtaResolveInput): M55CtaState {
  const { stage, surface, planSelected } = input;

  if (surface === 'shared_entry') return 'SHARED_RECIPIENT';
  if (surface === 'purchased' || stage === 'PURCHASED') return 'PURCHASED';
  if (surface === 'checkout' || planSelected) return 'PAYMENT_READY';
  if (surface === 'plan' || stage === 'PLAN_SELECTION' || stage === 'PAID_QUESTIONS_COMPLETE') {
    return 'PREMIUM_COMPLETE';
  }
  if (stage === 'PAID_QUESTIONS_IN_PROGRESS') return 'PREMIUM_IN_PROGRESS';
  if (surface === 'premium_lp' && stage === 'FREE_RESULT_READY') return 'FREE_TO_PREMIUM';
  if (stage === 'FREE_RESULT_READY') {
    return surface === 'core' ? 'FREE_TO_PREMIUM' : 'FREE_COMPLETE';
  }
  if (stage === 'BASIC_INFO_COMPLETE' || stage === 'FREE_QUESTIONS_IN_PROGRESS') {
    return 'FREE_IN_PROGRESS';
  }
  return 'FRESH';
}

export function resolveExperienceCtaLabel(input: ExperienceCtaResolveInput): string {
  const state = resolveExperienceCtaState(input);
  if (input.surface === 'home' && state === 'PREMIUM_COMPLETE') {
    return '回答を確認してプランを見る';
  }
  return M55_CTA_LABELS[state];
}

/** Deprecated construction phrases that must not appear in action labels. */
export const M55_CTA_FORBIDDEN_PHRASES = [
  '6問に答えて4章を作る',
  '4章を作る',
  '4章で深く読む',
  'プラン選択へ進む',
  'レポートを生成する',
  'result ID',
  'fulfillment',
  'snapshot',
  '無料結果を始める',
] as const;

/** Allowed in factual internal contexts only (not user-facing commercial copy). */
export const M55_CTA_PRODUCT_SPEC_ALLOWED = [] as const;
