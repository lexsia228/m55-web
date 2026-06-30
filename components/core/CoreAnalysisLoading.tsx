'use client';

import Image from 'next/image';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ensureSealedCoreResult } from '../../lib/m55/coreResult/store';
import { ProfileRepository } from '../../lib/soul/profile';
import styles from './CoreAnalysisLoading.module.css';

const SLOW_WAIT_COPY = '少しお時間をいただいています';

/** データタグ（演出用・結果本文とは無関係） */
const FRAGMENTS = [
  '生年月日',
  '基本の輪郭',
  '日常の傾向',
  '人との距離',
  '整え方',
  '今の出やすさ',
] as const;

const PREVIEW_LINES = [
  '日常で出やすい動き方…',
  '人との距離の取り方…',
  '段取りと整え方…',
] as const;

const PARTICLE_SEEDS = [
  { x: 6, y: 14, size: 2, tone: 'gold' as const },
  { x: 94, y: 12, size: 2, tone: 'cyan' as const },
  { x: 90, y: 50, size: 3, tone: 'cyan' as const },
  { x: 74, y: 90, size: 2, tone: 'gold' as const },
  { x: 44, y: 96, size: 2, tone: 'cyan' as const },
  { x: 12, y: 74, size: 2, tone: 'gold' as const },
  { x: 4, y: 42, size: 2, tone: 'cyan' as const },
  { x: 26, y: 6, size: 2, tone: 'gold' as const },
  { x: 56, y: 4, size: 2, tone: 'cyan' as const },
  { x: 10, y: 54, size: 2, tone: 'gold' as const },
] as const;

const ASTRO_LINES = [0, 30, 60, 90, 120, 150] as const;

const MIN_DISPLAY_MS = 4200;
const FADE_START_MS = 4350;
const COMPLETE_MS = 4650;
const FADE_OUT_MS = 300;
const SLOW_MSG_MS = 5500;
const TIMEOUT_MS = 7000;
const FRAGMENT_PULSE_MS = 200;

const SCENE_AT_MS = [0, 700, 1600, 2700, 3700] as const;
const FRAGMENT_AT_MS = [1620, 1740, 1860, 1980, 2100, 2220] as const;
const PREVIEW_LINE_AT_MS = [2720, 2960, 3200] as const;
const SCAN_AT_MS = 1650;

const REDUCED_MIN_MS = 1200;
const REDUCED_FADE_START_MS = 1400;
const REDUCED_COMPLETE_MS = 1600;
const REDUCED_SCENE_AT_MS = [0, 220, 440, 660, 880] as const;
const REDUCED_FRAGMENT_AT_MS = [460, 500, 540, 580, 620, 660] as const;
const REDUCED_PREVIEW_LINE_AT_MS = [720, 780, 840] as const;

function formatBirthDate(iso: string): string {
  const m = iso.trim().slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[1]}年${Number(m[2])}月${Number(m[3])}日`;
}

function birthDateParts(iso: string): [string, string, string] {
  const m = iso.trim().slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return [iso, '', ''];
  return [m[1], m[2], m[3]];
}

function stepCopy(sceneIndex: number, nickname: string): string {
  const nick = nickname.trim();
  const lines = [
    `${nick}さんの情報を受け取りました`,
    '生年月日から輪郭を呼び出しています',
    '複数の視点を照合しています',
    '日常の傾向を言葉にしています',
    `${nick}さんの見取り図をまとめました`,
  ] as const;
  return lines[sceneIndex] ?? lines[0];
}

function DateGroup({ value, groupKey }: { value: string; groupKey: string }) {
  return (
    <span className={styles.dateGroup} data-group={groupKey}>
      {value.split('').map((ch, i) => (
        <span
          key={`${groupKey}-${i}`}
          className={styles.dateChar}
          style={{ transitionDelay: `${i * 42}ms` }}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

type Props = {
  open: boolean;
  ownerId: string | null;
  onComplete: () => void;
  onError: (message: string) => void;
};

export default function CoreAnalysisLoading({ open, ownerId, onComplete, onError }: Props) {
  const id = useId();
  const labelId = `${id}-label`;
  const [portalReady, setPortalReady] = useState(false);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [visibleFragments, setVisibleFragments] = useState(0);
  const [visiblePreviewLines, setVisiblePreviewLines] = useState(0);
  const [scanGeneration, setScanGeneration] = useState(0);
  const [pulseFragmentIndex, setPulseFragmentIndex] = useState(-1);
  const [showSlowMsg, setShowSlowMsg] = useState(false);
  const [fading, setFading] = useState(false);
  const [profileSnapshot, setProfileSnapshot] = useState<{ nickname: string; birthDate: string } | null>(
    null,
  );

  const runIdRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const resetVisual = useCallback(() => {
    setSceneIndex(0);
    setVisibleFragments(0);
    setVisiblePreviewLines(0);
    setScanGeneration(0);
    setPulseFragmentIndex(-1);
    setShowSlowMsg(false);
    setFading(false);
    setProfileSnapshot(null);
  }, []);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) {
      resetVisual();
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
  }, [open, resetVisual]);

  useEffect(() => {
    if (!open) return;

    const profile = ProfileRepository.get(ownerId);
    if (profile?.birthDate && profile.nickname?.trim()) {
      setProfileSnapshot({
        nickname: profile.nickname.trim(),
        birthDate: profile.birthDate.trim().slice(0, 10),
      });
    }

    const runId = ++runIdRef.current;
    const timers: number[] = [];
    const schedule = (fn: () => void, delay: number) => {
      timers.push(
        window.setTimeout(() => {
          if (runIdRef.current !== runId) return;
          fn();
        }, delay),
      );
    };

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const minMs = prefersReduced ? REDUCED_MIN_MS : MIN_DISPLAY_MS;
    const fadeStartMs = prefersReduced ? REDUCED_FADE_START_MS : FADE_START_MS;
    const completeMs = prefersReduced ? REDUCED_COMPLETE_MS : COMPLETE_MS;
    const sceneAt = prefersReduced ? REDUCED_SCENE_AT_MS : SCENE_AT_MS;
    const fragmentAt = prefersReduced ? REDUCED_FRAGMENT_AT_MS : FRAGMENT_AT_MS;
    const previewAt = prefersReduced ? REDUCED_PREVIEW_LINE_AT_MS : PREVIEW_LINE_AT_MS;

    let processOk = false;
    let processErr: string | null = null;

    try {
      if (!profile?.birthDate || !profile.nickname?.trim()) {
        processErr = 'プロフィールが見つかりません。';
      } else {
        ensureSealedCoreResult(ownerId, profile);
        processOk = true;
      }
    } catch (e) {
      processErr = e instanceof Error ? e.message : '読み取りに失敗しました。';
    }

    const startedAt = Date.now();
    let finished = false;

    const finish = (mode: 'complete' | 'error', message?: string) => {
      if (finished || runIdRef.current !== runId) return;
      finished = true;
      if (mode === 'error') {
        onErrorRef.current(message ?? '読み取りに失敗しました。');
        return;
      }
      onCompleteRef.current();
    };

    const tryFinish = () => {
      if (processErr) {
        finish('error', processErr);
        return;
      }
      if (!processOk) {
        finish('error', '読み取りに失敗しました。');
        return;
      }
      const elapsed = Date.now() - startedAt;
      if (elapsed < minMs) {
        schedule(tryFinish, minMs - elapsed);
        return;
      }
      setFading(true);
      schedule(() => finish('complete'), prefersReduced ? 80 : FADE_OUT_MS);
    };

    sceneAt.forEach((at, i) => schedule(() => setSceneIndex(i), at));
    fragmentAt.forEach((at, i) => {
      schedule(() => {
        setVisibleFragments(i + 1);
        setPulseFragmentIndex(i);
      }, at);
      schedule(() => setPulseFragmentIndex(-1), at + FRAGMENT_PULSE_MS);
    });
    previewAt.forEach((at, i) => schedule(() => setVisiblePreviewLines(i + 1), at));
    schedule(() => setScanGeneration(1), prefersReduced ? 460 : SCAN_AT_MS);
    schedule(() => setFading(true), fadeStartMs);
    schedule(() => tryFinish(), completeMs);
    schedule(() => setShowSlowMsg(true), SLOW_MSG_MS);
    schedule(() => {
      if (finished) return;
      if (processErr) finish('error', processErr);
      else if (processOk) tryFinish();
      else finish('error', '読み取りに失敗しました。');
    }, TIMEOUT_MS);

    return () => {
      runIdRef.current += 1;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [open, ownerId]);

  if (!portalReady || !open) return null;

  const nickname = profileSnapshot?.nickname ?? '';
  const birthDate = profileSnapshot?.birthDate ?? '';
  const [year, month, day] = birthDateParts(birthDate);
  const statusLabel = stepCopy(sceneIndex, nickname || 'あなた');

  return createPortal(
    <div
      className={`${styles.root} ${fading ? styles.rootFading : ''}`}
      role="region"
      aria-busy="true"
      aria-labelledby={labelId}
      data-scene={sceneIndex}
      data-testid="m55-core-analysis-loading"
    >
      <div className={styles.veil} aria-hidden>
        <div className={styles.veilGrid} />
        <div className={styles.veilNoise} />
        <div className={styles.veilArcLeft} />
        <div className={styles.veilArcRight} />
      </div>

      <div className={styles.panel}>
        <Image
          src="/icons/m55-monomark.svg"
          alt=""
          width={14}
          height={14}
          className={styles.panelMark}
          priority
          aria-hidden
        />

        <div className={styles.stage} aria-hidden>
          <div className={styles.particles}>
            {PARTICLE_SEEDS.map((p, i) => (
              <span
                key={i}
                className={`${styles.particle} ${p.tone === 'gold' ? styles.particleGold : styles.particleCyan}`}
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: p.size,
                  height: p.size,
                }}
              />
            ))}
          </div>

          <svg className={styles.astroSvg} viewBox="0 0 200 200" aria-hidden>
            <circle cx="100" cy="100" r="88" className={styles.astroArcGhost} />
            <circle cx="100" cy="100" r="78" className={styles.astroRingOuter} />
            <circle cx="100" cy="100" r="54" className={styles.astroRingMid} />
            <circle cx="100" cy="100" r="28" className={styles.astroRingInner} />
            {ASTRO_LINES.map((deg) => {
              const rad = ((deg - 90) * Math.PI) / 180;
              const x2 = 100 + 78 * Math.cos(rad);
              const y2 = 100 + 78 * Math.sin(rad);
              return (
                <line key={deg} x1="100" y1="100" x2={x2} y2={y2} className={styles.astroSpoke} />
              );
            })}
            {[42, 118, 186, 258, 312].map((deg, i) => {
              const rad = ((deg - 90) * Math.PI) / 180;
              const r = i % 2 === 0 ? 54 : 78;
              return (
                <circle
                  key={deg}
                  cx={100 + r * Math.cos(rad)}
                  cy={100 + r * Math.sin(rad)}
                  r="2"
                  className={styles.astroNode}
                />
              );
            })}
            <circle cx="100" cy="100" r="3.5" className={styles.astroCore} />
          </svg>

          <article
            className={styles.resultCard}
            data-complete={sceneIndex >= 4 ? '1' : '0'}
          >
            <div className={styles.cardGlowEdge} aria-hidden />
            <div className={styles.cardInnerGrid} aria-hidden />
            {scanGeneration > 0 ? (
              <div key={scanGeneration} className={styles.scanLine} aria-hidden />
            ) : null}

            <header className={styles.cardHeader}>
              <p className={styles.nickLine}>
                <span className={styles.nickValue}>{nickname || '—'}</span>
                <span className={styles.nickSuffix}>さん</span>
              </p>

              <div className={styles.dateBlock}>
                <div className={styles.dateLabelRow}>
                  <span className={styles.dateLabel}>生年月日</span>
                  <span
                    className={`${styles.dateStatusDot} ${sceneIndex >= 1 ? styles.dateStatusDotLit : ''}`}
                    aria-hidden
                  />
                </div>
                <div className={styles.dateMachine} data-scene={sceneIndex}>
                  <DateGroup value={year} groupKey="y" />
                  <span className={styles.dateSep} aria-hidden>
                    /
                  </span>
                  <DateGroup value={month} groupKey="m" />
                  <span className={styles.dateSep} aria-hidden>
                    /
                  </span>
                  <DateGroup value={day} groupKey="d" />
                </div>
                <p className={styles.dateReadable}>{formatBirthDate(birthDate)}</p>
                <svg className={styles.dateConnector} viewBox="0 0 260 28" aria-hidden>
                  <line x1="8" y1="4" x2="252" y2="24" className={styles.dateConnectorLine} />
                </svg>
              </div>
            </header>

            <div
              className={styles.fragmentField}
              data-settled={sceneIndex >= 3 && visibleFragments >= FRAGMENTS.length ? '1' : '0'}
            >
              {FRAGMENTS.map((label, i) => (
                <span
                  key={label}
                  className={`${styles.fragment} ${visibleFragments > i ? styles.fragmentVisible : ''} ${pulseFragmentIndex === i ? styles.fragmentPulse : ''}`}
                >
                  {label}
                </span>
              ))}
            </div>

            <div className={styles.previewBlock}>
              {PREVIEW_LINES.map((line, i) => (
                <p
                  key={line}
                  className={`${styles.previewLine} ${visiblePreviewLines > i ? styles.previewLineVisible : ''}`}
                >
                  <span className={styles.previewLineText}>{line}</span>
                </p>
              ))}
            </div>

            <div className={styles.cardFooter}>
              <span className={styles.cardFooterMark} />
              <span className={styles.cardFooterText}>見取り図</span>
              <span className={styles.cardFooterStatus} aria-hidden />
            </div>
          </article>
        </div>

        <p id={labelId} className={styles.stepText} aria-live="polite" aria-atomic="true">
          <span className={styles.visuallyHidden}>{`${sceneIndex + 1}/5 `}</span>
          {statusLabel}
        </p>

        {showSlowMsg ? (
          <p className={styles.slowMsg} aria-live="polite">
            {SLOW_WAIT_COPY}
          </p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
