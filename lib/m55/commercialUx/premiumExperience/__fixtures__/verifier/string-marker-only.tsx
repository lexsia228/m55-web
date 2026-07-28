'use client';
/** Negative fixture: string literal contains marker without JSX mount. */
const MARKER = 'PremiumDecisionSurface premium.share.card data-m55-premium-state';

export default function StringMarkerFixture() {
  return <section aria-label={MARKER}>string marker</section>;
}
