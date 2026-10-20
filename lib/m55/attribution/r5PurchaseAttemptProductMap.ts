import {
  DTR_CORE_FULL_V1,
  DTR_CORE_STATIC_V1,
  DTR_CORE_LIGHT_V1,
} from '../../oneTimeCheckout';
import type { CreatorCashEligibleProductV1 } from '../contracts/m55AttributionPolicyContract';

export function mapCheckoutProductIdToCreatorCashProductKeyV1(
  productId: string,
): CreatorCashEligibleProductV1 | null {
  if (productId === DTR_CORE_LIGHT_V1 || productId === DTR_CORE_STATIC_V1) {
    return 'M55_PREMIUM_REPORT_LIGHT';
  }
  if (productId === DTR_CORE_FULL_V1) {
    return 'M55_PREMIUM_REPORT_FULL';
  }
  return null;
}

export function isCheckoutProductAttributionEligibleV1(productId: string): boolean {
  return mapCheckoutProductIdToCreatorCashProductKeyV1(productId) !== null;
}
