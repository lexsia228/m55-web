'use client';

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './HomeCoreAnalyzingOverlay.module.css';

const MESSAGES = [
  '本質を整理しています',
  '5つの固定観測軸をもとに輪郭を整えています',
  '少しだけお待ちください',
] as const;

/**
 * 円環・軌道のゆるい回転で、汎用スピナーに見えない解析感を出す。
 */
export default function HomeCoreAnalyzingOverlay({ open }: { open: boolean }) {
  const id = useId();
  const titleId = `${id}-title`;
  const [portalReady, setPortalReady] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setLineIndex(0);
      return;
    }
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setInterval(() => {
      setLineIndex((i) => (i + 1) % MESSAGES.length);
    }, 2800);
    return () => window.clearInterval(t);
  }, [open]);

  if (!portalReady || !open) return null;

  return createPortal(
    <div
      className={styles.root}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-live="polite"
      data-testid="m55-home-core-analyzing"
    >
      <div className={styles.veil} aria-hidden />
      <div className={styles.card}>
        <div className={styles.rig} aria-hidden>
          <svg className={styles.rigSvg} viewBox="0 0 120 120">
            <defs>
              <linearGradient id="m55-home-analyzing-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(107,95,168,0.35)" />
                <stop offset="100%" stopColor="rgba(83,74,114,0.12)" />
              </linearGradient>
            </defs>
            <g transform="translate(60,60)">
              <g className={styles.spinOuter}>
                <circle
                  r="50"
                  fill="none"
                  stroke="url(#m55-home-analyzing-grad)"
                  strokeWidth="1.2"
                  strokeDasharray="5 18"
                  strokeLinecap="round"
                />
              </g>
            </g>
            <g transform="translate(60,60)">
              <g className={styles.spinMid}>
                <circle
                  r="36"
                  fill="none"
                  stroke="rgba(107, 95, 168, 0.22)"
                  strokeWidth="1"
                  strokeDasharray="3 11"
                  strokeLinecap="round"
                />
              </g>
            </g>
            <g transform="translate(60,60)">
              <g className={styles.spinInner}>
                <circle
                  r="22"
                  fill="none"
                  stroke="rgba(83, 74, 114, 0.18)"
                  strokeWidth="0.9"
                  strokeDasharray="2 9"
                />
              </g>
            </g>
            <g transform="translate(60,60)">
              <g className={styles.spinBeacon}>
                <circle cx="0" cy="-38" r="3" fill="rgba(83, 74, 114, 0.55)" />
              </g>
            </g>
            <g transform="translate(60,60)">
              <g className={styles.spinBeaconLag}>
                <circle cx="0" cy="30" r="2" fill="rgba(107, 95, 168, 0.35)" />
              </g>
            </g>
          </svg>
        </div>
        <p id={titleId} className={styles.primary}>
          {MESSAGES[lineIndex] ?? MESSAGES[0]}
        </p>
        <div className={styles.dots} aria-hidden>
          {MESSAGES.map((_, i) => (
            <span key={i} className={i === lineIndex ? styles.dotActive : styles.dot} />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
