'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import type { CoreResult } from '../../lib/m55/coreResult/types';
import {
  formatFirstObservationJa,
  heroNarrative,
  withNickname,
} from './corePublicCopy';
import styles from './CoreExperience.module.css';

/** ヒーローカード内背景動画の再生速度（1 より小さいほど静かに流れる） */
const HERO_POSTER_BG_PLAYBACK_RATE = 0.76;

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
  const obsDate = formatFirstObservationJa(result.lockedAt);
  const videoRef = useRef<HTMLVideoElement | null>(null);

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

  return (
    <header className={styles.heroPoster} data-hero-type={result.coreType}>
      <div className={styles.heroPosterBlooms} aria-hidden>
        <svg className={styles.heroPosterBloomsSvg} viewBox="0 0 400 360" preserveAspectRatio="xMidYMid slice">
          <ellipse cx="340" cy="48" rx="140" ry="96" fill="rgba(255, 210, 190, 0.35)" />
          <ellipse cx="48" cy="280" rx="120" ry="88" fill="rgba(230, 218, 255, 0.28)" />
          <circle cx="200" cy="120" r="72" fill="rgba(255, 236, 224, 0.45)" />
          <path
            d="M 60 40 Q 120 100 40 160 Q 100 120 60 40"
            fill="rgba(255, 245, 238, 0.5)"
            opacity="0.9"
          />
        </svg>
      </div>
      <div className={styles.heroPosterSurface}>
        <div className={styles.heroPosterCardV0}>
          <video
            ref={videoRef}
            className={styles.heroPosterVideo}
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
          <div className={styles.heroPosterOverlay} aria-hidden />
          <div className={styles.heroPosterTopBar}>
            <h1 className={styles.heroPosterEssenceTitle}>{withNickname('tの本質', nick)}</h1>
            <p className={styles.heroPosterObsDate}>{obsDate}</p>
          </div>
          <div className={styles.heroPosterStack}>
            <p className={styles.heroPosterEnV0}>{visual.englishLabel}</p>
            <div className={styles.heroPosterPortraitRing}>
              <Image
                src={visual.heroCardImage}
                alt=""
                fill
                sizes="(max-width: 480px) 140px, 168px"
                className={styles.heroPosterPortraitImg}
              />
            </div>
            <p className={styles.heroPosterTraitKind}>{trait.kind}</p>
            <p className={styles.heroPosterTraitName}>{trait.name}</p>
            <p className={styles.heroPosterTaglineV0}>{visual.shortCopy}</p>
            {visual.subCopy1 ? (
              <p className={styles.heroPosterBodyV0}>{visual.subCopy1}</p>
            ) : null}
            {visual.subCopy2 ? (
              <p className={styles.heroPosterBodyV0}>{visual.subCopy2}</p>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
