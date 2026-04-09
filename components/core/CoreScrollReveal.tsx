'use client';

import { useEffect } from 'react';

const TARGET_SELECTOR = '[data-core-reveal]';

export default function CoreScrollReveal() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(TARGET_SELECTOR));
    if (!nodes.length) return;

    if (prefersReduced) {
      for (const node of nodes) node.dataset.revealState = 'shown';
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const node = entry.target as HTMLElement;
          node.dataset.revealState = 'shown';
          observer.unobserve(node);
        }
      },
      {
        threshold: 0.16,
        rootMargin: '0px 0px -10% 0px',
      },
    );

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return null;
}
