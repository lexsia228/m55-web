import type { ReactNode } from 'react';
import styles from './M55ExperienceSystem.module.css';

export type M55ExperienceKind = 'personal' | 'compatibility' | 'account' | 'reading';
export type M55ExperienceDepth = 'free' | 'paid' | 'neutral';

export function M55ExperienceShell({
  kind,
  depth,
  children,
  className,
}: {
  kind: M55ExperienceKind;
  depth: M55ExperienceDepth;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`${styles.experience} ${styles[kind]} ${styles[depth]}${className ? ` ${className}` : ''}`}
      data-m55-experience={kind}
      data-m55-depth={depth}
    >
      {children}
    </div>
  );
}

export function M55SectionFrame({
  title,
  eyebrow,
  children,
  className,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${styles.sectionFrame}${className ? ` ${className}` : ''}`}>
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

export function M55StatusPill({
  tone,
  children,
}: {
  tone: 'owned' | 'paused' | 'free';
  children: ReactNode;
}) {
  return <span className={`${styles.statusPill} ${styles[`status-${tone}`]}`}>{children}</span>;
}
