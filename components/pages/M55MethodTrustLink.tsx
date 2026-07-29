import {
  M55_METHOD_CANONICAL_COPY as Copy,
  M55_METHOD_PUBLIC_NAME,
} from '../../lib/m55/method/m55MethodAuthority';
import { MethodBlock, MethodCanonicalLink, MethodEyebrow } from '../method/M55MethodPrimitives';
import styles from '../method/M55Method.module.css';

export type MethodTrustLinkSurface = 'pricing' | 'checkout';

/**
 * Pricing / checkout-prep placement: a short trust link only. Dense method copy
 * belongs on the canonical method route, not next to a price.
 *
 * Pricing and checkout are separate route-consumption registry entries; this
 * owner renders both but each surface keeps its own test ids.
 */
export default function M55MethodTrustLink({
  surface = 'pricing',
}: {
  surface?: MethodTrustLinkSurface;
}) {
  const testId =
    surface === 'checkout' ? 'm55-method-checkout-trust-link' : 'm55-method-trust-link';
  const linkTestId =
    surface === 'checkout' ? 'm55-method-checkout-link' : 'm55-method-pricing-link';

  return (
    <MethodBlock testId={testId} quiet>
      <MethodEyebrow textJa={M55_METHOD_PUBLIC_NAME} />
      <p className={styles.methodBoundary}>{Copy.boundaryJa}</p>
      <MethodCanonicalLink testId={linkTestId} />
    </MethodBlock>
  );
}
