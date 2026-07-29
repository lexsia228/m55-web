import Link from 'next/link';
import {
  M55_METHOD_CANONICAL_ROUTE,
  M55_METHOD_ROUTE_LINK_LABEL_JA,
  M55_METHOD_STEPS,
} from '../../lib/m55/method/m55MethodAuthority';
import styles from './M55Method.module.css';

/**
 * Presentation primitives shared by every method placement. All text arrives from
 * `m55MethodAuthority`; these components hold no copy of their own, so a claim
 * cannot be introduced at the component layer.
 */

export type MethodTone = 'light' | 'dark';

function blockClassName(tone: MethodTone, quiet: boolean): string {
  const parts = [styles.methodBlock];
  if (quiet) parts.push(styles.methodBlockQuiet);
  if (tone === 'dark') parts.push(styles.methodBlockOnDark);
  return parts.join(' ');
}

export function MethodBlock({
  testId,
  tone = 'light',
  quiet = false,
  ariaLabelledBy,
  children,
}: {
  testId: string;
  tone?: MethodTone;
  quiet?: boolean;
  ariaLabelledBy?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={blockClassName(tone, quiet)}
      data-testid={testId}
      data-m55-method-placement={testId}
      aria-labelledby={ariaLabelledBy}
    >
      {children}
    </section>
  );
}

export function MethodEyebrow({ textJa }: { textJa: string }) {
  return <p className={styles.methodEyebrow}>{textJa}</p>;
}

export function MethodHeading({ id, textJa }: { id?: string; textJa: string }) {
  return (
    <h2 id={id} className={styles.methodHeading}>
      {textJa}
    </h2>
  );
}

export function MethodLead({ textJa }: { textJa: string }) {
  return <p className={styles.methodLead}>{textJa}</p>;
}

/** The four-step model, ordered by the authority rather than by markup order. */
export function MethodStepList() {
  const steps = [...M55_METHOD_STEPS].sort((a, b) => a.order - b.order);
  return (
    <ol className={styles.methodSteps} data-testid="m55-method-steps">
      {steps.map((step) => (
        <li key={step.order} className={styles.methodStep}>
          <span className={styles.methodStepOrder} aria-hidden>
            {step.order}
          </span>
          <div className={styles.methodStepBody}>
            <p className={styles.methodStepTitle}>{step.titleJa}</p>
            <p className={styles.methodStepText}>{step.bodyJa}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function MethodBoundaryNote({ textJa }: { textJa: string }) {
  return <p className={styles.methodBoundary}>{textJa}</p>;
}

export function MethodCanonicalLink({ testId }: { testId?: string }) {
  return (
    <Link href={M55_METHOD_CANONICAL_ROUTE} className={styles.methodLink} data-testid={testId}>
      {M55_METHOD_ROUTE_LINK_LABEL_JA}
    </Link>
  );
}

export function MethodDifferencePair({
  freeLabelJa,
  freeTextJa,
  premiumLabelJa,
  premiumTextJa,
}: {
  freeLabelJa: string;
  freeTextJa: string;
  premiumLabelJa: string;
  premiumTextJa: string;
}) {
  return (
    <div className={styles.methodDifference}>
      <div className={styles.methodDifferenceCell} data-testid="m55-method-difference-free">
        <p className={styles.methodDifferenceLabel}>{freeLabelJa}</p>
        <p className={styles.methodDifferenceText}>{freeTextJa}</p>
      </div>
      <div className={styles.methodDifferenceCell} data-testid="m55-method-difference-premium">
        <p className={styles.methodDifferenceLabel}>{premiumLabelJa}</p>
        <p className={styles.methodDifferenceText}>{premiumTextJa}</p>
      </div>
    </div>
  );
}
