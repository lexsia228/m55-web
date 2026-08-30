import {
  M55_METHOD_CANONICAL_COPY as Copy,
  M55_METHOD_PUBLIC_NAME,
} from '../../lib/m55/method/m55MethodAuthority';
import {
  MethodBlock,
  MethodBoundaryNote,
  MethodCanonicalLink,
  MethodDifferencePair,
  MethodEyebrow,
  MethodHeading,
} from '../method/M55MethodPrimitives';

/**
 * /dtr/lp placement: what additional information Premium layers on, stated as
 * added scope rather than improved accuracy. Kept secondary to the plan decision.
 */
export default function DtrMethodDifference() {
  return (
    <MethodBlock testId="m55-method-dtr-difference" ariaLabelledBy="m55-method-dtr-title">
      <MethodEyebrow textJa={M55_METHOD_PUBLIC_NAME} />
      <MethodHeading id="m55-method-dtr-title" textJa={Copy.premiumDifferenceHeadingJa} />
      <MethodDifferencePair
        freeLabelJa="無料"
        freeTextJa={Copy.premiumDifferenceFreeJa}
        premiumLabelJa="Premium"
        premiumTextJa={Copy.premiumDifferencePremiumJa}
      />
      <MethodBoundaryNote textJa={Copy.boundaryJa} />
      <MethodCanonicalLink testId="m55-method-dtr-link" />
    </MethodBlock>
  );
}
