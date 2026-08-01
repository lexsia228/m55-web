import {
  M55_METHOD_CANONICAL_COPY as Copy,
  M55_METHOD_PUBLIC_NAME,
} from '../../lib/m55/method/m55MethodAuthority';
import {
  MethodBlock,
  MethodBoundaryNote,
  MethodCanonicalLink,
  MethodEyebrow,
  MethodHeading,
  MethodLead,
  MethodStepList,
} from '../method/M55MethodPrimitives';

/**
 * HOME placement: the concise four-step model, positioned between the general
 * value explanation and the Premium value comparison so a reader has a frame for
 * the composition before they compare tiers.
 */
export default function HomeMethodModel() {
  return (
    <MethodBlock testId="m55-method-home" ariaLabelledBy="m55-method-home-title">
      <MethodEyebrow textJa={M55_METHOD_PUBLIC_NAME} />
      <MethodHeading id="m55-method-home-title" textJa={Copy.homeHeadingJa} />
      <MethodLead textJa={Copy.explanationJa} />
      <MethodStepList />
      <MethodBoundaryNote textJa={Copy.boundaryJa} />
      <MethodCanonicalLink testId="m55-method-home-link" />
    </MethodBlock>
  );
}
