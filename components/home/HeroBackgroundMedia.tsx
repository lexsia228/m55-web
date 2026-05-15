'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import styles from './HomePanel.module.css';

const PLAYBACK_RATE = 0.64;
const STOP_POINT_LEAD_SEC = 0.2;
const STOP_EPSILON_SEC = 0.02;

/**
 * Hero 背面: 単一動画を Home 入場時に1回だけ再生し、終端手前で停止保持する。
 */
export function HeroBackgroundMedia() {
  const pathname = usePathname();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isReducedMotionRef = useRef(false);
  const stopLockedRef = useRef(false);

  const tryStartPlayback = useCallback(() => {
    if (pathname !== '/home' || isReducedMotionRef.current) return;
    const v = videoRef.current;
    if (!v) return;
    stopLockedRef.current = false;
    v.pause();
    v.currentTime = 0;
    v.playbackRate = PLAYBACK_RATE;
    void v.play().catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    isReducedMotionRef.current = mq.matches;
    const handleChange = (e: MediaQueryListEvent) => {
      isReducedMotionRef.current = e.matches;
    };
    mq.addEventListener('change', handleChange);
    return () => {
      mq.removeEventListener('change', handleChange);
    };
  }, [pathname]);

  useEffect(() => {
    tryStartPlayback();
  }, [tryStartPlayback]);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || stopLockedRef.current) return;
    const dur = v.duration;
    if (!Number.isFinite(dur) || dur <= 0) return;
    const stopAt = Math.max(0, dur - STOP_POINT_LEAD_SEC);
    if (v.currentTime >= stopAt - STOP_EPSILON_SEC) {
      stopLockedRef.current = true;
      v.currentTime = stopAt;
      v.pause();
    }
  }, []);

  if (pathname !== '/home' || isReducedMotionRef.current) return null;

  return (
    <div
      className={styles.posterHeroIntroVideoWrap}
      data-state="playing"
      aria-hidden
    >
      <video
        ref={videoRef}
        className={styles.posterHeroIntroVideo}
        src="/home/hero-tech-map-intro.mp4"
        muted
        autoPlay
        playsInline
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
      />
    </div>
  );
}
