'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './ScrollToTopButton.module.css';

const SHOW_THRESHOLD = 600; // px from top

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  /**
   * Track the element that last fired a scroll so we can scroll it back to 0.
   * null  → use window (document-level scroll)
   * other → inner overflow container (ShellLayout .main, etc.)
   */
  const scrollTargetRef = useRef<Element | null>(null);

  useEffect(() => {
    const onScroll = (e: Event) => {
      const target = e.target;
      let scrollTop: number;

      if (
        !target ||
        target === document ||
        target === document.documentElement ||
        target === document.body
      ) {
        // Window / document scroll
        scrollTop =
          window.scrollY ||
          document.documentElement.scrollTop ||
          document.body.scrollTop ||
          0;
        scrollTargetRef.current = null;
      } else {
        // Inner overflow container (ShellLayout .main, DTR wrapper, etc.)
        scrollTop = (target as Element).scrollTop;
        scrollTargetRef.current = target as Element;
      }

      setVisible(scrollTop > SHOW_THRESHOLD);
    };

    /**
     * capture: true intercepts scroll events on ANY descendant element
     * (scroll does not bubble, but capture phase travels down to the target).
     * This covers both window scroll and inner-container scroll in one listener.
     */
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => document.removeEventListener('scroll', onScroll, { capture: true });
  }, []);

  const handleClick = () => {
    const target = scrollTargetRef.current;
    if (target) {
      target.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${styles.btn}${visible ? ` ${styles.btnVisible}` : ''}`}
      data-m55-print-hide
      data-testid="m55-scroll-to-top"
      aria-label="ページ上部へ戻る"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        focusable="false"
        className={styles.icon}
      >
        <path
          d="M10 14.5V5.5M6 9l4-4 4 4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
