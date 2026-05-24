'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CoreResult } from '../../lib/m55/coreResult/types';
import {
  observationTraitNameFromCoreLabel,
  resolveCorePublicStemDisplay,
} from '../../lib/m55/publicStemDisplay';
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

function formatRecordDateLabel(isoLike: string): string {
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const parsed = isoLike.match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  if (parsed) {
    const year = parsed[1];
    const monthIdx = Number(parsed[2]) - 1;
    const day = String(Number(parsed[3])).padStart(2, '0');
    if (monthIdx >= 0 && monthIdx < mon.length) return `${year}.${mon[monthIdx]}.${day}`;
  }
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getUTCFullYear();
  const month = mon[d.getUTCMonth()]!;
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
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
  const observationTraitName = observationTraitNameFromCoreLabel(result.coreLabel);
  const obsDateLabel = formatRecordDateLabel(result.lockedAt);
  const obsMeta = obsDateLabel ? `First Record ${obsDateLabel}` : 'First Record';
  const traitLabel = '特質性';
  const classLabelJa = '分析類型';
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
                    <span className={styles.corePosterEssenceTitlePrefix}>Blueprint of</span>
                    <span className={styles.corePosterEssenceTitleName}>{nick || 'You'}</span>
                  </h1>
                  <p className={styles.corePosterObsDate}>{obsMeta}</p>
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
