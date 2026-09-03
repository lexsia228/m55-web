import Link from 'next/link';
import styles from './BoundedRecoveryState.module.css';

export default function BoundedRecoveryState({
  title,
  description,
  onRetry,
  escapeHref,
  escapeLabel,
  support = false,
}: {
  title: string;
  description: string;
  onRetry: () => void;
  escapeHref: string;
  escapeLabel: string;
  support?: boolean;
}) {
  return (
    <section className={styles.card} role="alert">
      <h2>{title}</h2>
      <p>{description}</p>
      <div className={styles.actions}>
        <button type="button" onClick={onRetry}>もう一度確認する</button>
        <Link href={escapeHref}>{escapeLabel}</Link>
        {support ? <Link href="/support">サポートを見る</Link> : null}
      </div>
    </section>
  );
}
