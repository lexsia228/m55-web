/**
 * M55 Experience Control Plane v2 — shared presentational primitives.
 * Prefer these over inventing route-local visual systems.
 * Shell/header/footer remain PublicShell / PublicHeader / PublicFooter.
 */

import type { ReactNode } from 'react';

type ChildrenProps = {
  children: ReactNode;
  className?: string;
  testId?: string;
};

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(' ');
}

/** Narrow reading column opt-in (uses --m55-read-width from archetype). */
export function ExperienceReading({ children, className, testId }: ChildrenProps) {
  return (
    <div className={cx('m55-exp-reading', className)} data-testid={testId}>
      {children}
    </div>
  );
}

/** Cinematic / editorial display line (serif). */
export function PageLead({ children, className, testId }: ChildrenProps) {
  return (
    <p className={cx('m55-exp-display', className)} data-testid={testId}>
      {children}
    </p>
  );
}

export function EditorialSection({
  children,
  className,
  testId,
  title,
}: ChildrenProps & { title?: string }) {
  return (
    <section className={cx('m55-exp-section', className)} data-testid={testId}>
      {title ? <h2 className="m55-exp-title">{title}</h2> : null}
      <div className="m55-exp-body">{children}</div>
    </section>
  );
}

export function ResultIdentity({
  traitName,
  identityLine,
  className,
  testId,
}: {
  traitName: string;
  identityLine: string;
  className?: string;
  testId?: string;
}) {
  return (
    <header className={cx('m55-exp-result-identity', className)} data-testid={testId}>
      <p className="m55-exp-meta">{traitName}</p>
      <h1 className="m55-exp-display">{identityLine}</h1>
    </header>
  );
}

export function EvidenceSection({
  children,
  className,
  testId,
}: ChildrenProps) {
  return (
    <section
      className={cx('m55-exp-section', className)}
      data-testid={testId}
      data-m55-editorial-beat="evidence"
    >
      <h2 className="m55-exp-title">回答から見えた理由</h2>
      <div className="m55-exp-body">{children}</div>
    </section>
  );
}

export function SceneSection({ children, className, testId }: ChildrenProps) {
  return (
    <section
      className={cx('m55-exp-section', className)}
      data-testid={testId}
      data-m55-editorial-beat="scene"
    >
      <div className="m55-exp-body">{children}</div>
    </section>
  );
}

export function TrustSummary({ children, className, testId }: ChildrenProps) {
  return (
    <aside className={cx('m55-exp-meta', className)} data-testid={testId} data-m55-trust-summary>
      {children}
    </aside>
  );
}

export function PrintFrame({ children, className, testId }: ChildrenProps) {
  return (
    <div className={cx('m55-exp-print-frame', className)} data-testid={testId} data-m55-print-frame>
      {children}
    </div>
  );
}
