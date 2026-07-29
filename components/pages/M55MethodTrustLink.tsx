import {
  M55_METHOD_CANONICAL_COPY as Copy,
  M55_METHOD_PUBLIC_NAME,
} from '../../lib/m55/method/m55MethodAuthority';
import { MethodBlock, MethodCanonicalLink, MethodEyebrow } from '../method/M55MethodPrimitives';
import styles from '../method/M55Method.module.css';

/**
 * Pricing / checkout-prep placement: a short trust link only. Dense method copy
 * belongs on the canonical method route, not next to a price.
 */
export default function M55MethodTrustLink() {
  return (
    <MethodBlock testId="m55-method-trust-link" quiet>
      <MethodEyebrow textJa={M55_METHOD_PUBLIC_NAME} />
      <p className={styles.methodBoundary}>{Copy.boundaryJa}</p>
      <MethodCanonicalLink testId="m55-method-pricing-link" />
    </MethodBlock>
  );
}
