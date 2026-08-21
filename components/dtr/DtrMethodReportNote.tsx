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
 * Purchased-report placement: how the report in front of the reader was
 * assembled. Deliberately carries no identifier, no date of birth and no raw
 * answer text — only the composition account and the reproducibility statement.
 */
export default function DtrMethodReportNote() {
  const steps = [...M55_METHOD_STEPS].sort((a, b) => a.order - b.order);
  return (
    <MethodBlock
      testId="m55-method-purchased-report"
      tone="dark"
      quiet
      ariaLabelledBy="m55-method-report-title"
    >
      <MethodEyebrow textJa={M55_METHOD_PUBLIC_NAME} />
      <MethodHeading id="m55-method-report-title" textJa={Copy.compactReportHeadingJa} />
      <MethodLead textJa={Copy.explanationJa} />
      <ol className={styles.methodSteps} data-testid="m55-method-report-steps">
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
      <MethodLead textJa={Copy.reproducibilityJa} />
      <MethodBoundaryNote textJa={Copy.boundaryJa} />
      <MethodCanonicalLink testId="m55-method-report-link" />
    </MethodBlock>
  );
}
