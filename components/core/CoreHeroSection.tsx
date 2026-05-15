'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CoreResult } from '../../lib/m55/coreResult/types';
import {
  heroNarrative,
} from './corePublicCopy';
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

type HeroVisualPreset = {
  heroCardImage: string;
  englishLabel: string;
  japaneseTitle: string;
  shortCopy: string;
  subCopy1: string;
  subCopy2: string;
};

/** 分類名ではなく本質ポスター用ラベル（「型」なし・観測特性：接頭辞） */
function observationTraitLabelFromCoreLabel(label: string): string {
  const t = label.trim();
  if (t.startsWith('観測特性：')) return t;
  if (t.startsWith('スキル：')) return `観測特性：${t.slice('スキル：'.length)}`;
  const core = t.endsWith('型') ? t.slice(0, -1) : t;
  return `観測特性：${core}`;
}

function splitObservationTrait(ja: string): { kind: string; name: string } {
  const m = ja.match(/^観測特性[：:]\s*(.+)$/);
  if (m) return { kind: '観測特性', name: m[1]!.trim() };
  return { kind: '観測特性', name: ja.trim() };
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

const HERO_VISUAL_PRESET: Record<string, Omit<HeroVisualPreset, 'shortCopy' | 'subCopy1' | 'subCopy2'>> = {
  TYPE_01: {
    heroCardImage: '/ten-views/planner.webp',
    englishLabel: 'PLANNER',
    japaneseTitle: '観測特性：堅実構築',
  },
  TYPE_02: {
    heroCardImage: '/ten-views/manager.webp',
    englishLabel: 'MANAGER',
    japaneseTitle: '観測特性：協調支援',
  },
  TYPE_03: {
    heroCardImage: '/ten-views/creator.webp',
    englishLabel: 'CREATOR',
    japaneseTitle: '観測特性：発想跳躍',
  },
  TYPE_04: {
    heroCardImage: '/ten-views/analyst.webp',
    englishLabel: 'ANALYST',
    japaneseTitle: '観測特性：静観分析',
  },
  TYPE_05: {
    heroCardImage: '/ten-views/designer.webp',
    englishLabel: 'DESIGNER',
    japaneseTitle: '観測特性：調整均衡',
  },
  TYPE_06: {
    heroCardImage: '/ten-views/president.webp',
    englishLabel: 'PRESIDENT',
    japaneseTitle: '観測特性：直観展開',
  },
  TYPE_07: {
    heroCardImage: '/ten-views/global-leader.webp',
    englishLabel: 'GLOBAL LEADER',
    japaneseTitle: '観測特性：世界推進',
  },
  TYPE_08: {
    heroCardImage: '/ten-views/executor.webp',
    englishLabel: 'EXECUTOR',
    japaneseTitle: '観測特性：実務設計',
  },
  TYPE_09: {
    heroCardImage: '/ten-views/influencer.webp',
    englishLabel: 'INFLUENCER',
    japaneseTitle: '観測特性：熱量先導',
  },
  TYPE_10: {
    heroCardImage: '/ten-views/producer.webp',
    englishLabel: 'PRODUCER',
    japaneseTitle: '観測特性：安定育成',
  },
};

function resolveHeroVisual(
  result: CoreResult,
  narrative: { tagline: string; body: [string, string] },
): HeroVisualPreset {
  const { tagline, body } = narrative;
  const preset = HERO_VISUAL_PRESET[result.coreType] ?? {
    heroCardImage: '/ten-views/analyst.webp',
    englishLabel: result.coreType,
    japaneseTitle: observationTraitLabelFromCoreLabel(result.coreLabel),
  };
  const [b1, b2] = body;
  const japaneseTitle = preset.japaneseTitle.startsWith('観測特性：')
    ? preset.japaneseTitle
    : observationTraitLabelFromCoreLabel(preset.japaneseTitle);
  return {
    ...preset,
    japaneseTitle,
    shortCopy: tagline,
    subCopy1: b1 ?? '',
    subCopy2: b2 ?? '',
  };
}

export default function CoreHeroSection({
  result,
  nickname,
}: {
  result: CoreResult;
  nickname: string;
}) {
  const nick = nickname.trim();
  const narrative = heroNarrative(result);
  const visual = resolveHeroVisual(result, narrative);
  const trait = splitObservationTrait(visual.japaneseTitle);
  const obsDateLabel = formatRecordDateLabel(result.lockedAt);
  const obsMeta = obsDateLabel ? `First Record ${obsDateLabel}` : 'First Record';
  const blueprintTitle = `Blueprint of ${nick || 'You'}`;
  const traitLabel = '特質性';
  const classLabelJa = '分析類型';
  const leadText =
    trait.name === '静観分析'
      ? '周囲の喧騒に惑わされず、本質を静かに見極め、最適な答えを深く導き出せる人。'
      : visual.shortCopy;
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
      type: result.coreType,
      bg: '/core/core-blueprint-bg-motion.mp4',
      card: visual.heroCardImage,
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
                src={visual.heroCardImage}
                alt=""
                decoding="async"
              />
              <div className={styles.corePosterHeroLower}>
                <p className={styles.corePosterHeroEyebrow}>
                  <span className={styles.corePosterHeroEyebrowKind}>{classLabelJa}</span>
                  <span className={styles.corePosterHeroEyebrowSep}>/</span>
                  <span className={styles.corePosterHeroEyebrowEn}>
                    {visual.englishLabel}
                  </span>
                </p>
                <p className={styles.corePosterMainHeadline}>
                  <span className={styles.corePosterMainHeadlineBadge}>{traitLabel}</span>
                  <span className={styles.corePosterMainHeadlineName}>{trait.name}</span>
                </p>
                <p className={styles.corePosterHeroLead}>{leadText}</p>
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
