/**
 * Premium Experience SSOT — every governed Premium user-visible state.
 */

import type { M55CtaState } from '../experience/experienceCtaState';
import type { ExperiencePrintMode } from '../experience/experienceArchetypes';
import type { ExperienceProductTruthDeps } from '../experience/experienceRouteRegistry';
import {
  PREMIUM_EDITORIAL_AUTHORITY_KEY,
  PREMIUM_VISUAL_AUTHORITY_KEY,
  type PremiumExperienceTier,
} from './premiumVisualAuthority';

export type PremiumExperienceStateDeclaration = {
  id: string;
  routePattern: string;
  state: string;
  experienceTier: PremiumExperienceTier;
  visualAuthorityKey: typeof PREMIUM_VISUAL_AUTHORITY_KEY;
  editorialAuthorityKey: typeof PREMIUM_EDITORIAL_AUTHORITY_KEY | 'premium.report' | 'share.card';
  primaryCtaState: M55CtaState | 'CONTEXTUAL' | 'NONE';
  productTruth: ExperienceProductTruthDeps;
  printMode: ExperiencePrintMode;
  shareAuthority: 'none' | 'privacy_safe_share' | 'purchased_private';
  printAuthority: ExperiencePrintMode;
  ownerFiles: readonly string[];
  ecpRouteId: string;
};

export const PREMIUM_EXPERIENCE_STATE_REGISTRY: readonly PremiumExperienceStateDeclaration[] = [
  {
    id: 'premium.core.bridge',
    routePattern: '/core',
    state: 'premium_bridge',
    experienceTier: 'PREMIUM',
    visualAuthorityKey: PREMIUM_VISUAL_AUTHORITY_KEY,
    editorialAuthorityKey: PREMIUM_EDITORIAL_AUTHORITY_KEY,
    primaryCtaState: 'FREE_TO_PREMIUM',
    productTruth: 'plan_comparison',
    printMode: 'editorial_result',
    shareAuthority: 'none',
    printAuthority: 'editorial_result',
    ownerFiles: ['components/core/CoreFreeToPaidConversionBridge.tsx'],
    ecpRouteId: 'free.core.result',
  },
  {
    id: 'premium.lp.prerequisite',
    routePattern: '/dtr/lp',
    state: 'continuity_intro',
    experienceTier: 'PREMIUM',
    visualAuthorityKey: PREMIUM_VISUAL_AUTHORITY_KEY,
    editorialAuthorityKey: PREMIUM_EDITORIAL_AUTHORITY_KEY,
    primaryCtaState: 'FREE_TO_PREMIUM',
    productTruth: 'plan_comparison',
    printMode: 'product_fact',
    shareAuthority: 'none',
    printAuthority: 'product_fact',
    ownerFiles: ['components/dtr/DtrLpPremiumContinuityIntro.tsx'],
    ecpRouteId: 'premium.lp.intro',
  },
  {
    id: 'premium.lp.questions',
    routePattern: '/dtr/lp',
    state: 'six_questions',
    experienceTier: 'PREMIUM',
    visualAuthorityKey: PREMIUM_VISUAL_AUTHORITY_KEY,
    editorialAuthorityKey: PREMIUM_EDITORIAL_AUTHORITY_KEY,
    primaryCtaState: 'PREMIUM_IN_PROGRESS',
    productTruth: 'trait_identity',
    printMode: 'product_fact',
    shareAuthority: 'none',
    printAuthority: 'product_fact',
    ownerFiles: ['components/dtr/DtrPaidQuestionnaireLayer.tsx'],
    ecpRouteId: 'premium.lp.questions',
  },
  {
    id: 'premium.lp.answer_edit',
    routePattern: '/dtr/lp',
    state: 'answer_edit',
    experienceTier: 'PREMIUM',
    visualAuthorityKey: PREMIUM_VISUAL_AUTHORITY_KEY,
    editorialAuthorityKey: PREMIUM_EDITORIAL_AUTHORITY_KEY,
    primaryCtaState: 'PREMIUM_IN_PROGRESS',
    productTruth: 'trait_identity',
    printMode: 'product_fact',
    shareAuthority: 'none',
    printAuthority: 'product_fact',
    ownerFiles: ['components/dtr/DtrPaidQuestionnaireLayer.tsx'],
    ecpRouteId: 'premium.lp.questions',
  },
  {
    id: 'premium.lp.answer_review',
    routePattern: '/dtr/lp',
    state: 'answer_review',
    experienceTier: 'PREMIUM',
    visualAuthorityKey: PREMIUM_VISUAL_AUTHORITY_KEY,
    editorialAuthorityKey: PREMIUM_EDITORIAL_AUTHORITY_KEY,
    primaryCtaState: 'PREMIUM_COMPLETE',
    productTruth: 'trait_identity',
    printMode: 'product_fact',
    shareAuthority: 'none',
    printAuthority: 'product_fact',
    ownerFiles: ['components/dtr/DtrPaidQuestionnaireLayer.tsx'],
    ecpRouteId: 'premium.lp.answer_review',
  },
  {
    id: 'premium.lp.plans',
    routePattern: '/dtr/lp',
    state: 'plan_selection',
    experienceTier: 'PREMIUM',
    visualAuthorityKey: PREMIUM_VISUAL_AUTHORITY_KEY,
    editorialAuthorityKey: PREMIUM_EDITORIAL_AUTHORITY_KEY,
    primaryCtaState: 'PREMIUM_COMPLETE',
    productTruth: 'self_premium_prices',
    printMode: 'product_fact',
    shareAuthority: 'none',
    printAuthority: 'product_fact',
    ownerFiles: ['components/dtr/DtrPaidPurchasePrep.tsx'],
    ecpRouteId: 'premium.lp.plans',
  },
  {
    id: 'premium.lp.checkout',
    routePattern: '/dtr/lp',
    state: 'payment_preparation',
    experienceTier: 'PREMIUM',
    visualAuthorityKey: PREMIUM_VISUAL_AUTHORITY_KEY,
    editorialAuthorityKey: PREMIUM_EDITORIAL_AUTHORITY_KEY,
    primaryCtaState: 'PAYMENT_READY',
    productTruth: 'self_premium_prices',
    printMode: 'product_fact',
    shareAuthority: 'none',
    printAuthority: 'product_fact',
    ownerFiles: ['components/dtr/DtrPaidPurchasePrep.tsx'],
    ecpRouteId: 'premium.lp.checkout',
  },
  {
    id: 'purchased.report.body',
    routePattern: '/dtr/core',
    state: 'purchased_landing',
    experienceTier: 'PREMIUM',
    visualAuthorityKey: PREMIUM_VISUAL_AUTHORITY_KEY,
    editorialAuthorityKey: 'premium.report',
    primaryCtaState: 'PURCHASED',
    productTruth: 'none',
    printMode: 'editorial_result',
    shareAuthority: 'purchased_private',
    printAuthority: 'editorial_result',
    ownerFiles: ['components/dtr/DtrFullReader.tsx', 'app/dtr/core/page.tsx'],
    ecpRouteId: 'purchased.reader',
  },
  {
    id: 'purchased.consult.input',
    routePattern: '/dtr/core',
    state: 'additional_reading_input',
    experienceTier: 'PREMIUM',
    visualAuthorityKey: PREMIUM_VISUAL_AUTHORITY_KEY,
    editorialAuthorityKey: 'premium.report',
    primaryCtaState: 'PURCHASED',
    productTruth: 'none',
    printMode: 'editorial_result',
    shareAuthority: 'purchased_private',
    printAuthority: 'editorial_result',
    ownerFiles: ['components/dtr/ConsultRoom.tsx'],
    ecpRouteId: 'purchased.reader',
  },
  {
    id: 'purchased.consult.result',
    routePattern: '/dtr/core',
    state: 'additional_reading_result',
    experienceTier: 'PREMIUM',
    visualAuthorityKey: PREMIUM_VISUAL_AUTHORITY_KEY,
    editorialAuthorityKey: 'premium.report',
    primaryCtaState: 'PURCHASED',
    productTruth: 'none',
    printMode: 'editorial_result',
    shareAuthority: 'purchased_private',
    printAuthority: 'editorial_result',
    ownerFiles: ['components/dtr/ConsultReplyCard.tsx'],
    ecpRouteId: 'purchased.reader',
  },
  {
    id: 'purchased.saved_reopen',
    routePattern: '/dtr/core',
    state: 'saved_report_reopen',
    experienceTier: 'PREMIUM',
    visualAuthorityKey: PREMIUM_VISUAL_AUTHORITY_KEY,
    editorialAuthorityKey: 'premium.report',
    primaryCtaState: 'PURCHASED',
    productTruth: 'none',
    printMode: 'editorial_result',
    shareAuthority: 'purchased_private',
    printAuthority: 'editorial_result',
    ownerFiles: ['components/dtr/SavedSnapshotNotice.tsx'],
    ecpRouteId: 'purchased.reader',
  },
  {
    id: 'premium.share.card',
    routePattern: '/dev/premium-share-preview',
    state: 'premium_share_card',
    experienceTier: 'PREMIUM',
    visualAuthorityKey: PREMIUM_VISUAL_AUTHORITY_KEY,
    editorialAuthorityKey: 'share.card',
    primaryCtaState: 'FREE_COMPLETE',
    productTruth: 'trait_identity',
    printMode: 'privacy_safe',
    shareAuthority: 'privacy_safe_share',
    printAuthority: 'privacy_safe',
    ownerFiles: [
      'lib/m55/freeResult/privacySafeShareCardV1.ts',
      'components/core/CorePremiumResultShareCTA.tsx',
    ],
    ecpRouteId: 'dev.premium_share_preview',
  },
] as const;

export function assertPremiumExperienceRegistryComplete(): void {
  const ids = new Set<string>();
  for (const entry of PREMIUM_EXPERIENCE_STATE_REGISTRY) {
    if (ids.has(entry.id)) {
      throw new Error(`duplicate premium experience state: ${entry.id}`);
    }
    ids.add(entry.id);
    if (entry.experienceTier !== 'PREMIUM') {
      throw new Error(`${entry.id} must be PREMIUM tier`);
    }
    if (entry.visualAuthorityKey !== PREMIUM_VISUAL_AUTHORITY_KEY) {
      throw new Error(`${entry.id} visualAuthorityKey mismatch`);
    }
  }
}

export function premiumStateById(id: string): PremiumExperienceStateDeclaration | undefined {
  return PREMIUM_EXPERIENCE_STATE_REGISTRY.find((s) => s.id === id);
}
