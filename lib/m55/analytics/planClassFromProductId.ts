/**
 * Map Personal Premium Light/Full product IDs to analytics planClass.
 * Returns null for non-Light/Full lanes (do not invent a class).
 */

import { DTR_CORE_FULL_V1, DTR_CORE_LIGHT_V1 } from '../../oneTimeCheckout';
import type { M55PlanClassEnum } from '../privacySafeFunnelAnalytics';

export function planClassFromDtrCoreProductId(productId: string): M55PlanClassEnum | null {
  if (productId === DTR_CORE_LIGHT_V1) return 'light';
  if (productId === DTR_CORE_FULL_V1) return 'full';
  return null;
}
