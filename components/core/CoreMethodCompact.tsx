import {
  M55_METHOD_CANONICAL_COPY as Copy,
  M55_METHOD_PUBLIC_NAME,
  M55_METHOD_STEPS,
} from '../../lib/m55/method/m55MethodAuthority';
import {
  MethodBlock,
  MethodBoundaryNote,
  MethodCanonicalLink,
  MethodEyebrow,
  MethodHeading,
  MethodLead,
} from '../method/M55MethodPrimitives';
import styles from '../method/M55Method.module.css';

/**
 * /core free-result placement: a compact account of how the result the reader is
 * looking at was assembled. Sits after the result explanation and before the
 * Premium bridge, so the composition is understood before any purchase framing.
 */
export default function CoreMethodCompact() {
  const steps = [...M55_METHOD_STEPS].sort((a, b) => a.order - b.order);
  return (
    <MethodBlock
      testId="m55-method-core-free-result"
      quiet
      ariaLabelledBy="m55-method-core-title"
    >
      <MethodEyebrow textJa={M55_METHOD_PUBLIC_NAME} />
      <MethodHeading id="m55-method-core-title" textJa={Copy.compactFreeResultHeadingJa} />
      <MethodLead textJa={Copy.explanationJa} />
      <ol className={styles.methodSteps} data-testid="m55-method-core-steps">
        {steps.map((step) => (
          <li key={step.order} className={styles.methodStep}>
            <span className={styles.methodStepOrder} aria-hidden>
              {step.order}
            </span>
            <div className={styles.methodStepBody}>
              <p className={styles.methodStepTitle}>{step.titleJa}</p>
            </div>
          </li>
        ))}
      </ol>
      <MethodBoundaryNote textJa={Copy.boundaryJa} />
      <MethodCanonicalLink testId="m55-method-core-link" />
    </MethodBlock>
  );
}
