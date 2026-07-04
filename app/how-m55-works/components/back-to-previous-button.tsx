'use client';

import { useRouter } from 'next/navigation';
import styles from '../how-it-works.module.css';

type BackToPreviousButtonProps = {
  labelJa: string;
  fallbackHref: string;
};

export function BackToPreviousButton({ labelJa, fallbackHref }: BackToPreviousButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (typeof window === 'undefined') {
      router.push(fallbackHref);
      return;
    }

    const referrer = document.referrer;
    const hasSameOriginReferrer =
      referrer.length > 0 && new URL(referrer).origin === window.location.origin;

    if (hasSameOriginReferrer && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  };

  return (
    <button type="button" onClick={handleClick} className={styles.tertiaryCta}>
      {labelJa}
    </button>
  );
}
