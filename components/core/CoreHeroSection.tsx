import Image from 'next/image';
import type { CoreResult } from '../../lib/m55/coreResult/types';
import {
  heroNarrative,
  withNickname,
} from './corePublicCopy';
import styles from './CoreExperience.module.css';

type HeroVisualPreset = {
  heroBackgroundImage: string;
  heroCardImage: string;
  englishLabel: string;
  japaneseTitle: string;
  shortCopy: string;
  subCopy1: string;
  subCopy2: string;
};

const HERO_VISUAL_PRESET: Record<string, Omit<HeroVisualPreset, 'shortCopy' | 'subCopy1' | 'subCopy2'>> = {
  TYPE_01: {
    heroCardImage: '/ten-views/planner.webp',
    heroBackgroundImage: '/core/m55-core-bg-brown-primary.webp',
    englishLabel: 'PLANNER',
    japaneseTitle: '堅実構築型',
  },
  TYPE_02: {
    heroCardImage: '/ten-views/manager.webp',
    heroBackgroundImage: '/core/m55-core-bg-green-primary.webp',
    englishLabel: 'MANAGER',
    japaneseTitle: '協調支援型',
  },
  TYPE_03: {
    heroCardImage: '/ten-views/creator.webp',
    heroBackgroundImage: '/core/m55-core-bg-yellow-primary.webp',
    englishLabel: 'CREATOR',
    japaneseTitle: '発想跳躍型',
  },
  TYPE_04: {
    heroCardImage: '/ten-views/analyst.webp',
    heroBackgroundImage: '/core/m55-core-bg-teal-primary.webp',
    englishLabel: 'ANALYST',
    japaneseTitle: '静観分析型',
  },
  TYPE_05: {
    heroCardImage: '/ten-views/designer.webp',
    heroBackgroundImage: '/core/m55-core-bg-teal-primary.webp',
    englishLabel: 'DESIGNER',
    japaneseTitle: '調整均衡型',
  },
  TYPE_06: {
    heroCardImage: '/ten-views/president.webp',
    heroBackgroundImage: '/core/m55-core-bg-yellow-primary.webp',
    englishLabel: 'PRESIDENT',
    japaneseTitle: '直観展開型',
  },
  TYPE_07: {
    heroCardImage: '/ten-views/global-leader.webp',
    heroBackgroundImage: '/core/m55-core-bg-red-primary.webp',
    englishLabel: 'GLOBAL LEADER',
    japaneseTitle: '世界推進型',
  },
  TYPE_08: {
    heroCardImage: '/ten-views/executor.webp',
    heroBackgroundImage: '/core/m55-core-bg-brown-primary.webp',
    englishLabel: 'EXECUTOR',
    japaneseTitle: '実務設計型',
  },
  TYPE_09: {
    heroCardImage: '/ten-views/influencer.webp',
    heroBackgroundImage: '/core/m55-core-bg-red-primary.webp',
    englishLabel: 'INFLUENCER',
    japaneseTitle: '熱量先導型',
  },
  TYPE_10: {
    heroCardImage: '/ten-views/producer.webp',
    heroBackgroundImage: '/core/m55-core-bg-green-primary.webp',
    englishLabel: 'PRODUCER',
    japaneseTitle: '安定育成型',
  },
};

function resolveHeroVisual(
  result: CoreResult,
  narrative: { tagline: string; body: [string, string] },
): HeroVisualPreset {
  const { tagline, body } = narrative;
  const preset = HERO_VISUAL_PRESET[result.coreType] ?? {
    heroCardImage: '/ten-views/analyst.webp',
    heroBackgroundImage: '/core/m55-core-bg-teal-primary.webp',
    englishLabel: result.coreType,
    japaneseTitle: result.coreLabel,
  };
  const [b1, b2] = body;
  return {
    ...preset,
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
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[CoreHero] resolved visual', {
      type: result.coreType,
      bg: visual.heroBackgroundImage,
      card: visual.heroCardImage,
    });
  }

  return (
    <header
      className={styles.heroPoster}
      data-hero-type={result.coreType}
      data-hero-bg={visual.heroBackgroundImage}
      style={{ ['--hero-bg-image' as string]: `url("${visual.heroBackgroundImage}")` }}
    >
      <div className={styles.heroPosterArt} aria-hidden />
      <div className={styles.heroPosterSurface}>
        <div className={styles.heroPosterCard}>
          <div className={styles.heroPosterTop}>
            <div className={styles.heroPosterCopy}>
              <div className={styles.heroPosterHeadRow}>
                <h1 className={styles.heroPosterKicker}>{withNickname('tさん', nick)}</h1>
              </div>
              <div className={styles.heroTypeCardWrap}>
                <Image
                  src={visual.heroCardImage}
                  alt={`${visual.japaneseTitle} カード`}
                  width={340}
                  height={196}
                  className={styles.heroTypeCardImage}
                />
                <div className={styles.heroTypeOverlay}>
                  <p className={styles.heroPosterEn}>{visual.englishLabel}</p>
                  <p className={styles.heroPosterJaType}>{visual.japaneseTitle}</p>
                </div>
              </div>
              <p className={styles.heroPosterTagline}>{visual.shortCopy}</p>
              {visual.subCopy1 ? <p className={styles.heroPosterBody}>{visual.subCopy1}</p> : null}
              {visual.subCopy2 ? <p className={styles.heroPosterBody}>{visual.subCopy2}</p> : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
