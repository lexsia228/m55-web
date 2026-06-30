'use client';

import Image from 'next/image';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './PaidDtrAnalysisLoading.module.css';

const SLOW_WAIT_COPY = '少しお時間をいただいています';

const CHAPTERS = [
  { num: 'Ⅰ', label: '輪郭' },
  { num: 'Ⅱ', label: '構造' },
  { num: 'Ⅲ', label: '無理' },
  { num: 'Ⅳ', label: '扱い方' },
] as const;

const PREVIEW_LINES = [
  '日常で出やすい傾向…',
  '構造と無理の整理…',
  '戻し方と使い方…',
] as const;

const DATA_STREAM_COLS = [7, 16, 25, 34, 50, 66, 75, 84, 93] as const;

const CONVERGE_PARTICLES = [
  { x: 4, y: 20, delay: 0 },
  { x: 96, y: 18, delay: 0.08 },
  { x: 8, y: 78, delay: 0.12 },
  { x: 92, y: 82, delay: 0.06 },
  { x: 50, y: 4, delay: 0.1 },
  { x: 50, y: 96, delay: 0.14 },
  { x: 22, y: 50, delay: 0.04 },
  { x: 78, y: 50, delay: 0.16 },
] as const;

const MIN_DISPLAY_MS = 6100;
const FADE_START_MS = 6100;
const COMPLETE_MS = 6600;
const FADE_OUT_MS = 500;
const SLOW_MSG_MS = 7200;
const CHAPTER_PULSE_MS = 260;

const SCENE_AT_MS = [0, 550, 1200, 2800, 5400] as const;
const CHAPTER_AT_MS = [1200, 1430, 1660, 1890] as const;
const PREVIEW_LINE_AT_MS = [2800, 3020, 3240] as const;
const SCAN_AT_MS = [700, 1800, 3100] as const;
const SOFT_FINISH_AT_MS = 4600;
const COMPLETE_STATE_AT_MS = 5400;

const REDUCED_MIN_MS = 1900;
const REDUCED_FADE_START_MS = 2100;
const REDUCED_COMPLETE_MS = 2300;
const REDUCED_SCENE_AT_MS = [0, 260, 520, 780, 1200] as const;
const REDUCED_CHAPTER_AT_MS = [520, 600, 680, 760] as const;
const REDUCED_PREVIEW_LINE_AT_MS = [820, 880, 940] as const;
const REDUCED_SOFT_FINISH_AT_MS = 1040;
const REDUCED_COMPLETE_STATE_AT_MS = 1200;

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
  const nick = nickname.trim() || 'あなた';
  const lines = [
    `${nick}さんの保存版を準備しています`,
    '生年月日から輪郭を呼び出しています',
    '4つの章に構成しています',
    '日常の傾向を保存版にまとめています',
    `${nick}さんの保存版が整いました`,
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
  nickname: string;
  birthDate: string;
  processingComplete: boolean;
  onComplete: () => void;
};

export default function PaidDtrAnalysisLoading({
  open,
  nickname,
  birthDate,
  processingComplete,
  onComplete,
}: Props) {
  const id = useId();
  const labelId = `${id}-label`;
  const [portalReady, setPortalReady] = useState(false);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [visibleChapters, setVisibleChapters] = useState(0);
  const [visiblePreviewLines, setVisiblePreviewLines] = useState(0);
  const [pulseChapterIndex, setPulseChapterIndex] = useState(-1);
  const [scanGeneration, setScanGeneration] = useState(0);
  const [showSoftFinish, setShowSoftFinish] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showSlowMsg, setShowSlowMsg] = useState(false);
  const [fading, setFading] = useState(false);

  const runIdRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  const processingCompleteRef = useRef(processingComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    processingCompleteRef.current = processingComplete;
  }, [processingComplete]);

  const resetVisual = useCallback(() => {
    setSceneIndex(0);
    setVisibleChapters(0);
    setVisiblePreviewLines(0);
    setPulseChapterIndex(-1);
    setScanGeneration(0);
    setShowSoftFinish(false);
    setShowComplete(false);
    setShowSlowMsg(false);
    setFading(false);
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
    const chapterAt = prefersReduced ? REDUCED_CHAPTER_AT_MS : CHAPTER_AT_MS;
    const previewAt = prefersReduced ? REDUCED_PREVIEW_LINE_AT_MS : PREVIEW_LINE_AT_MS;
    const scanAt = prefersReduced ? [400, 700] : SCAN_AT_MS;

    const softFinishAt = prefersReduced ? REDUCED_SOFT_FINISH_AT_MS : SOFT_FINISH_AT_MS;
    const completeStateAt = prefersReduced ? REDUCED_COMPLETE_STATE_AT_MS : COMPLETE_STATE_AT_MS;

    const startedAt = Date.now();
    let finished = false;

    const finish = () => {
      if (finished || runIdRef.current !== runId) return;
      if (!processingCompleteRef.current) return;
      finished = true;
      onCompleteRef.current();
    };

    const tryFinish = () => {
      if (runIdRef.current !== runId) return;
      if (!processingCompleteRef.current) {
        schedule(tryFinish, 200);
        return;
      }
      const elapsed = Date.now() - startedAt;
      if (elapsed < minMs) {
        schedule(tryFinish, minMs - elapsed);
        return;
      }
      setFading(true);
      schedule(finish, prefersReduced ? 80 : FADE_OUT_MS);
    };

    sceneAt.forEach((at, i) => schedule(() => setSceneIndex(i), at));
    chapterAt.forEach((at, i) => {
      schedule(() => {
        setVisibleChapters(i + 1);
        setPulseChapterIndex(i);
      }, at);
      schedule(() => setPulseChapterIndex(-1), at + CHAPTER_PULSE_MS);
    });
    previewAt.forEach((at, i) => schedule(() => setVisiblePreviewLines(i + 1), at));
    scanAt.forEach((at, i) => schedule(() => setScanGeneration(i + 1), at));
    schedule(() => setShowSoftFinish(true), softFinishAt);
    schedule(() => setShowComplete(true), completeStateAt);
    schedule(() => setFading(true), fadeStartMs);
    schedule(() => tryFinish(), completeMs);
    schedule(() => setShowSlowMsg(true), SLOW_MSG_MS);

    return () => {
      runIdRef.current += 1;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [open]);

  if (!portalReady || !open) return null;

  const [year, month, day] = birthDateParts(birthDate);
  const statusLabel = stepCopy(sceneIndex, nickname);
  const allChaptersLit = visibleChapters >= CHAPTERS.length;

  return createPortal(
    <div
      className={`${styles.root} ${fading ? styles.rootFading : ''} ${showSoftFinish ? styles.rootSoftFinish : ''}`}
      role="region"
      aria-busy="true"
      aria-labelledby={labelId}
      data-scene={sceneIndex}
      data-testid="m55-paid-dtr-analysis-loading"
    >
      <div className={styles.veil} aria-hidden>
        <div className={styles.veilLayerDeep} />
        <div className={styles.veilLayerMid} />
        <div className={styles.veilGrid} />
        <div className={styles.veilNoise} />
        <div className={styles.veilGlowTL} />
        <div className={styles.veilGlowBR} />
        <div className={styles.dataStream}>
          {DATA_STREAM_COLS.map((x, i) => (
            <span
              key={x}
              className={styles.dataStreamCol}
              style={{ left: `${x}%`, animationDelay: `${i * 0.35}s` }}
            >
              <span className={styles.dataStreamDot} style={{ animationDelay: `${i * 0.2}s` }} />
              <span className={styles.dataStreamDot} style={{ animationDelay: `${0.4 + i * 0.15}s` }} />
              <span className={styles.dataStreamDot} style={{ animationDelay: `${0.8 + i * 0.12}s` }} />
            </span>
          ))}
        </div>
        <div className={styles.veilScanSweep} />
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

        <div className={styles.glassProcessor} aria-hidden>
          <span className={styles.processorCornerTL} />
          <span className={styles.processorCornerTR} />
          <span className={styles.processorCornerBL} />
          <span className={styles.processorCornerBR} />
        </div>

        <div className={styles.stage} aria-hidden>
          <div className={styles.convergeField}>
            {CONVERGE_PARTICLES.map((p, i) => (
              <span
                key={i}
                className={styles.convergeParticle}
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  animationDelay: `${p.delay}s`,
                }}
              />
            ))}
          </div>

          <div className={`${styles.cardEmergenceGlow} ${showSoftFinish ? styles.cardEmergenceGlowActive : ''}`} />

          <article
            className={styles.reportCard}
            data-complete={showComplete ? '1' : '0'}
            data-scene={sceneIndex}
          >
            <div className={styles.cardGlowEdge} aria-hidden />
            <div className={styles.cardInnerGrid} aria-hidden />
            {scanGeneration > 0 ? (
              <div key={scanGeneration} className={styles.scanLine} aria-hidden />
            ) : null}

            <div className={styles.cardBody}>
              <header className={styles.cardHeader}>
                <p className={styles.nickLine}>
                  <span className={styles.nickValue}>{nickname.trim() || '—'}</span>
                  <span className={styles.nickSuffix}>さん</span>
                </p>
                <p className={styles.reportKind}>保存版レポート</p>

                <div className={styles.dateBlock}>
                  <div className={styles.dateLabelRow}>
                    <span className={styles.dateLabel}>生年月日</span>
                    <span
                      className={`${styles.dateStatusDot} ${sceneIndex >= 0 ? styles.dateStatusDotLit : ''}`}
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
                </div>
              </header>

              <div
                className={styles.chapterGrid}
                data-locked={allChaptersLit && sceneIndex >= 3 ? '1' : '0'}
              >
                <svg className={styles.chapterLinkSvg} viewBox="0 0 280 72" aria-hidden>
                  <path
                    d="M 140 36 L 68 18"
                    className={`${styles.chapterLinkPath} ${visibleChapters >= 1 ? styles.chapterLinkPathDrawn : ''}`}
                  />
                  <path
                    d="M 140 36 L 212 18"
                    className={`${styles.chapterLinkPath} ${visibleChapters >= 2 ? styles.chapterLinkPathDrawn : ''}`}
                  />
                  <path
                    d="M 140 36 L 68 54"
                    className={`${styles.chapterLinkPath} ${visibleChapters >= 3 ? styles.chapterLinkPathDrawn : ''}`}
                  />
                  <path
                    d="M 140 36 L 212 54"
                    className={`${styles.chapterLinkPath} ${visibleChapters >= 4 ? styles.chapterLinkPathDrawn : ''}`}
                  />
                </svg>
                {CHAPTERS.map((ch, i) => (
                  <div
                    key={ch.num}
                    className={`${styles.chapterSlot} ${visibleChapters > i ? styles.chapterSlotVisible : ''} ${pulseChapterIndex === i ? styles.chapterSlotPulse : ''}`}
                  >
                    <span className={styles.chapterDot} aria-hidden />
                    <span className={styles.chapterNum}>{ch.num}</span>
                    <span className={styles.chapterLabel}>{ch.label}</span>
                  </div>
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

              <div className={styles.cardFooter} data-visible={visiblePreviewLines >= 1 ? '1' : '0'}>
                <span className={styles.cardFooterMark} />
                <span className={styles.cardFooterText}>保存版</span>
                <span className={styles.cardFooterStatus} aria-hidden />
              </div>
            </div>
          </article>
        </div>

        <p
          id={labelId}
          className={`${styles.stepText} ${sceneIndex >= 4 ? styles.stepTextFinish : ''}`}
          aria-live="polite"
          aria-atomic="true"
        >
          <span className={styles.visuallyHidden}>{`${sceneIndex + 1}/5 `}</span>
          {statusLabel}
        </p>

        {showSlowMsg && !processingComplete ? (
          <p className={styles.slowMsg} aria-live="polite">
            {SLOW_WAIT_COPY}
          </p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
