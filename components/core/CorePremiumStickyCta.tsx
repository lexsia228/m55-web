'use client';

import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../lib/m55/topFreeEntryPublicCopy';

type Props = {
  visible: boolean;
};

/**
 * Retired overlay. Safari TP proved the mobile fixed bar covered Free-result
 * content. Funnel destination remains the inline `#core-paid` bridge.
 */
export const CORE_INLINE_PREMIUM_BRIDGE_HREF = `${TOP_FREE_ENTRY_PUBLIC_COPY.cta.viewSavedPlansHref}#m55-paid-questionnaire`;

export default function CorePremiumStickyCta({ visible }: Props) {
  void visible;
  return null;
}
