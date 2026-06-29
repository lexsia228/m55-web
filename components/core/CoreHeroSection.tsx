'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CoreResult } from '../../lib/m55/coreResult/types';
import {
  coreReadingStyleNoteFromCoreType,
  coreTraitDisplayFromCoreType,
} from '../../lib/m55/coreFreePublicDisplay';
import { resolveCorePublicStemDisplay } from '../../lib/m55/publicStemDisplay';
import styles from './CoreExperience.module.css';

/** ヒーローカード内背景動画の再生速度（1 より小さいほど静かに流れる） */
const HERO_POSTER_BG_PLAYBACK_RATE = 0.76;

/** PC 小画面（/core ヒーロー：外殻ラッパーを DOM から外す幅帯。CSS の @media (640–1279) と一致） */
const NARROW_PC_CORE_HERO_MQ = '(min-width: 640px) and (max-width: 1279px)';

function useNarrowPcCoreHeroLayout() {
  const [narrowPcFlat, setNarrowPcFlat] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia(NARROW_PC_CORE_HERO_MQ);
    const apply = () => setNarrowPcFlat(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return narrowPcFlat;
}

function formatRecordDateLabelJa(isoLike: string): string {
  const parsed = isoLike.match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  if (parsed) {
    const year = parsed[1];
    const month = Number(parsed[2]);
    const day = Number(parsed[3]);
    return `${year}年${month}月${day}日`;
  }
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日`;
}

export default function CoreHeroSection({
  result,
  nickname,
}: {
  result: CoreResult;
  nickname: string;
}) {
  const nick = nickname.trim();
  const stemDisplay = resolveCorePublicStemDisplay(result);
  const observationTraitName = coreTraitDisplayFromCoreType(result.coreType);
  const readingStyleNote = coreReadingStyleNoteFromCoreType(result.coreType);
  const obsDateLabel = formatRecordDateLabelJa(result.lockedAt);
  const obsMeta = obsDateLabel ? `生年月日 ${obsDateLabel}` : '';
  const traitLabel = '読み方';
  const classLabelJa = '資質';
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const narrowPcFlat = useNarrowPcCoreHeroLayout();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const applyRate = () => {
      video.defaultPlaybackRate = HERO_POSTER_BG_PLAYBACK_RATE;
      video.playbackRate = HERO_POSTER_BG_PLAYBACK_RATE;
    };

    if (video.readyState >= 1) {
      applyRate();
    } else {
      video.addEventListener('loadedmetadata', applyRate, { once: true });
      return () => video.removeEventListener('loadedmetadata', applyRate);
    }
  }, []);

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[CoreHero] resolved visual', {
      stemLaneIndex: stemDisplay.stemLaneIndex,
      publicTitle: stemDisplay.publicTitle,
      bg: '/core/core-blueprint-bg-motion.mp4',
      card: stemDisplay.imagePath,
    });
  }

  const stackClassName = narrowPcFlat
    ? `${styles.corePosterStack} ${styles.corePosterStackNarrowPcFlat}`
    : styles.corePosterStack;

  const posterBody = (
    <>
      <div className={styles.corePosterMainVisualStack} aria-hidden>
        <div className={styles.corePosterHeroBaseLayer}>
          <video
            ref={videoRef}
            className={styles.corePosterHeroBgVideo}
            muted
            autoPlay
            loop
            playsInline
            preload="metadata"
            poster="/core/core-blueprint-bg-poster.webp"
            aria-hidden
          >
            <source src="/core/core-blueprint-bg-motion.mp4" type="video/mp4" />
          </video>
        </div>
        <div className={styles.corePosterHeroReadabilityVeil} />
      </div>
      <div className={styles.corePosterHeroOverlay}>
        <div className={styles.corePosterHeroFoot}>
          <div className={styles.corePosterHeroCopy}>
            <div className={styles.corePosterGridStage}>
              <div className={styles.corePosterHeroTopBlock}>
                <div className={styles.corePosterMetaRow}>
                  <h1 className={styles.corePosterEssenceTitle}>
                    <span className={styles.corePosterEssenceTitlePrefix}>本質の見取り図</span>
                    <span className={styles.corePosterEssenceTitleName}>{nick || 'あなた'}</span>
                  </h1>
                  {obsMeta ? <p className={styles.corePosterObsDate}>{obsMeta}</p> : null}
                </div>
              </div>
              <img
                className={styles.corePosterStageImage}
                src={stemDisplay.imagePath}
                alt=""
                decoding="async"
              />
              <div className={styles.corePosterHeroLower}>
                <p className={styles.corePosterHeroEyebrow}>
                  <span className={styles.corePosterHeroEyebrowKind}>{classLabelJa}</span>
                </p>
                <p className={styles.corePosterMainHeadline}>
                  <span className={styles.corePosterMainHeadlineName}>{stemDisplay.publicTitle}</span>
                </p>
                <p className={styles.corePosterTraitRow}>
                  <span className={styles.corePosterTraitRowBadge}>{traitLabel}</span>
                  <span className={styles.corePosterTraitRowSep}>/</span>
                  <span className={styles.corePosterTraitRowName}>{observationTraitName}</span>
                </p>
                {readingStyleNote ? (
                  <p className={styles.corePosterHeroLead}>{readingStyleNote}</p>
                ) : null}
                <p className={styles.corePosterHeroLead}>{stemDisplay.displayOneLine}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <section
      className={styles.corePosterHeroSection}
      data-hero-type={result.coreType}
      data-stem-lane={String(stemDisplay.stemLaneIndex)}
      aria-label="本質の見取り図"
    >
      <div className={stackClassName}>
        {narrowPcFlat ? (
          posterBody
        ) : (
          <div className={styles.corePosterMainVisual}>{posterBody}</div>
        )}
      </div>
    </section>
  );
}
