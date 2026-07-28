/**
 * Registered page-content objects — route-local copy allowed only through this typed surface.
 */

import { FREE_FUNNEL_PAGE_CONTENT } from './freeFunnelCopy';
import { PREMIUM_FUNNEL_PAGE_CONTENT } from './premiumFunnelCopy';
import { PRODUCT_PRICING_PAGE_CONTENT } from './productPricingCopy';

export type RegisteredPageContent = {
  surfaceId: string;
  archetype: string;
  fields: Record<string, string>;
};

export { FREE_FUNNEL_PAGE_CONTENT, PREMIUM_FUNNEL_PAGE_CONTENT, PRODUCT_PRICING_PAGE_CONTENT };

/** Placeholder registry; surfaces migrate literals into domain modules or here. */
export const M55_REGISTERED_PAGE_CONTENT: readonly RegisteredPageContent[] = [
  {
    surfaceId: 'public.pricing',
    archetype: 'PRODUCT_DECISION',
    fields: {
      titleJa: '料金とプラン',
    },
  },
  {
    surfaceId: 'free.core.empty',
    archetype: 'GUIDED_FREE_FLOW',
    fields: { ...FREE_FUNNEL_PAGE_CONTENT },
  },
  {
    surfaceId: 'premium.lp.plans',
    archetype: 'PRODUCT_DECISION',
    fields: { ...PREMIUM_FUNNEL_PAGE_CONTENT },
  },
] as const;
