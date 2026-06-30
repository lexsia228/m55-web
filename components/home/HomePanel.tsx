'use client';

/**
 * HomePanel — 販売・導入の主舞台。無料説明・探索・保存版案内は消さない。
 * Home 上では個人結果（5軸個人図・今の焦点・今日/今週・要約カード等）を一切出さない。
 */

import Image from 'next/image';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../lib/m55/topFreeEntryPublicCopy';
import { ProfileRepository } from '../../lib/soul/profile';
import CoreAnalysisLoading from '../core/CoreAnalysisLoading';
import BirthProfileIntakeLayer from '../profile/BirthProfileIntakeLayer';
import { HeroBackgroundMedia } from './HeroBackgroundMedia';
import styles from './HomePanel.module.css';

const homeCopy = TOP_FREE_ENTRY_PUBLIC_COPY.home;
const learnMoreCopy = TOP_FREE_ENTRY_PUBLIC_COPY.learnMore;
const ctaCopy = TOP_FREE_ENTRY_PUBLIC_COPY.cta;

const FORMAL_CHAPTER_CHIPS = TOP_FREE_ENTRY_PUBLIC_COPY.formalChapters.map((ch, index) => ({
  id: `ch${index + 1}`,
  title: ch.labelJa,
}));

/* ── Helpers ─────────────────────────────────────────────────────────────────── */

const POSTER_FIVE_AXIS_COLORS = ['#7cb87a', '#d4795c', '#c4982a', '#9090ac', '#5a8fc4'] as const;

/** 探索カード1用：5分割円弧メーター（ラスタより一瞥で「5軸」の読みを返す） */
const EXPLORE_METER_WEIGHTS = [22, 20, 18, 22, 18] as const;

function ExploreFiveAxisMeter({ className }: { className?: string }) {
  const r = 23.5;
  const cx = 32;
  const cy = 32;
  const circ = 2 * Math.PI * r;
  const gap = 0.88;
  let cumPct = 0;
  const arcs = EXPLORE_METER_WEIGHTS.map((w, i) => {
    const segLen = Math.max(0, (w / 100) * circ - gap);
    const rot = (cumPct / 100) * 360 - 90;
    cumPct += w;
    return { segLen, rot, color: POSTER_FIVE_AXIS_COLORS[i]!, key: i };
  });
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      width={64}
      height={64}
      aria-hidden
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(92, 78, 160, 0.5)"
        strokeWidth="5.6"
      />
      {arcs.map(({ segLen, rot, color, key }) => (
        <circle
          key={key}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6.6"
          strokeOpacity={0.97}
          strokeLinecap="round"
          strokeDasharray={`${segLen} ${circ}`}
          transform={`rotate(${rot}, ${cx}, ${cy})`}
        />
      ))}
    </svg>
  );
}

/* ── Component ───────────────────────────────────────────────────────────────── */

export default function HomePanel() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const ownerId = user?.id ?? null;
  const [profileEpoch, setProfileEpoch] = useState(0);
  const [birthIntakeOpen, setBirthIntakeOpen] = useState(false);
  const [coreAnalyzing, setCoreAnalyzing] = useState(false);
  const [coreAnalyzeError, setCoreAnalyzeError] = useState<string | null>(null);

  useEffect(() => {
    const bump = () => setProfileEpoch((n) => n + 1);
    window.addEventListener('m55:profile_updated', bump);
    return () => window.removeEventListener('m55:profile_updated', bump);
  }, []);

  const view = useMemo(() => {
    if (!isLoaded) return { kind: 'loading' as const };
    const profile = ProfileRepository.get(ownerId);
    if (!profile?.birthDate || !profile.nickname?.trim()) return { kind: 'no_profile' as const };
    return { kind: 'has_profile' as const };
  }, [isLoaded, ownerId, profileEpoch]);

  const hasProfile = view.kind === 'has_profile';
  const showPublicValueBlocks = isLoaded && view.kind !== 'loading';

  const nicknameHint = (user?.firstName || user?.username || '').trim();

  return (
    <div className={styles.wrap}>

      {/* ═══════════════════════════════════════════════════════════════════
          FOLD 1: HERO + SITE STRIP (intake: /my only)
          ═══════════════════════════════════════════════════════════════════ */}
      <section className={styles.heroSection} data-testid="m55-home-hero">
        <div className={styles.posterStack}>
          <div
            className={styles.posterMainVisual}
            data-testid="m55-home-poster-main-visual"
            aria-label="M55 メインビジュアル（プレースホルダー）"
          >
            <div className={styles.posterMainVisualStack} aria-hidden>
              <div className={styles.posterHeroBaseLayer}>
                <Image
                  src="/home/hero-tech-map.webp"
                  alt=""
                  fill
                  sizes="(max-width: 767px) 100vw, min(1320px, 100vw)"
                  className={styles.posterHeroBaseImage}
                  priority
                />
                <HeroBackgroundMedia />
              </div>
              <div className={styles.posterHeroReadabilityVeil} />
            </div>
            <div className={styles.posterHeroOverlay}>
              <div className={styles.posterHeroFoot}>
                <div className={styles.posterHeroCopy}>
                  <div className={styles.posterHeroTopBlock}>
                    <div className={styles.posterHeroLabelGroup}>
                      <p className={styles.posterHeroBrandM55}>M55</p>
                    </div>
                    <h1 className={styles.posterHeroTitleBlite}>
                      <span className={styles.posterHeroTitleLine}>{homeCopy.heroTitleLine1Ja}</span>
                      <span className={styles.posterHeroTitleLine}>{homeCopy.heroTitleLine2Ja}</span>
                    </h1>
                    <p className={styles.posterHeroSupportInline}>{homeCopy.heroSubJa}</p>
                  </div>
                  <div className={styles.posterHeroBreathing} aria-hidden />
                  <div className={styles.posterHeroBottomStack}>
                    {isLoaded && view.kind === 'no_profile' && (
                      <button
                        type="button"
                        className={styles.posterHeroCta}
                        data-testid="m55-home-open-birth-intake"
                        aria-label={`${ctaCopy.openFreeMapJa}。${homeCopy.heroSupportJa}`}
                        onClick={() => setBirthIntakeOpen(true)}
                      >
                        {ctaCopy.openFreeMapJa}
                      </button>
                    )}
                    {hasProfile && (
                      <p className={styles.posterHeroCoreLink} data-testid="m55-home-has-profile-hero">
                        <Link
                          href="/core"
                          className={styles.posterHeroCoreLinkA}
                          aria-label={`${ctaCopy.viewFreeMapJa}。${homeCopy.heroSupportJa}`}
                        >
                          {ctaCopy.viewFreeMapJa} →
                        </Link>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div
        className={`${styles.homeSurfaceShell} ${styles.homeBelowHeroStack}`}
        data-testid="m55-home-public-surface-shell"
      >
      {showPublicValueBlocks && (
        <div
          className={`${styles.homeSurfaceCard} ${styles.homeTierStack}`}
          data-testid="m55-home-tier-stack"
          aria-label={homeCopy.tierStackAriaLabelJa}
        >
          <div className={styles.homeTierRow}>
            <span className={styles.homeTierBadge}>無料</span>
            <p className={styles.homeTierText}>{homeCopy.tierFreeJa}</p>
          </div>
          <div className={styles.homeTierRow}>
            <span className={styles.homeTierBadgePaid}>{homeCopy.tierSavedBadgeJa}</span>
            <p className={styles.homeTierText}>{homeCopy.tierSavedJa}</p>
          </div>
          <div className={styles.homeTierRow}>
            <span className={styles.homeTierBadge}>{homeCopy.tierConsultBadgeJa}</span>
            <p className={styles.homeTierText}>{homeCopy.tierConsultJa}</p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          UNDERSTANDING MODE — public education only (no personal result UI)
          ═══════════════════════════════════════════════════════════════════ */}
      {showPublicValueBlocks && (
        <section
          className={styles.useExploreSection}
          data-testid="m55-home-understanding"
          aria-label="次の一歩"
        >
          <div className={styles.useExploreRule} aria-hidden />
          <div className={styles.useExploreGrid} role="navigation" aria-label="探索への入口">
            <Link href="/how-m55-works" className={styles.useExploreCard}>
              <span
                className={styles.useExploreIconThumbExplore}
                data-testid="m55-home-demo-five-element"
              >
                <Image
                  src="/home/card-how-to-read.webp"
                  alt=""
                  fill
                  sizes="60px"
                  className={styles.useExploreThumbImage}
                />
              </span>
              <span className={styles.useExploreBody}>
                <span className={styles.useExploreTitle}>M55の見方を知る</span>
                <span className={styles.useExploreSub}>{homeCopy.exploreHowSubJa}</span>
              </span>
              <span className={styles.useExploreChevron} aria-hidden>›</span>
            </Link>
            <Link href="/ten-views" className={styles.useExploreCard}>
              <span
                className={`${styles.useExploreIconThumbExplore} ${styles.useExploreIconThumbQualities}`}
              >
                <Image
                  src="/home/card-qualities-flower.webp"
                  alt=""
                  fill
                  sizes="60px"
                  className={`${styles.useExploreThumbImage} ${styles.useExploreThumbImageQualities}`}
                />
              </span>
              <span className={styles.useExploreBody}>
                <span className={styles.useExploreTitle}>10通りの資質から読む</span>
                <span className={styles.useExploreSub}>{homeCopy.exploreQualitiesSubJa}</span>
              </span>
              <span className={styles.useExploreChevron} aria-hidden>›</span>
            </Link>
          </div>
        </section>
      )}

      {showPublicValueBlocks && (
        <section
          className={`${styles.homeSurfaceCard} ${styles.homeSurfaceCardSoft} ${styles.fiveAxisReadCard}`}
          data-testid="m55-home-five-axis-read"
          aria-labelledby="m55-home-five-axis-read-title"
        >
          <h2 id="m55-home-five-axis-read-title" className={styles.fiveAxisReadTitle}>
            5つの解析軸の見方
          </h2>
          <p className={styles.fiveAxisReadLead}>{homeCopy.fiveAxisLeadJa}</p>
          <div className={styles.fiveAxisReadMeterWrap}>
            <ExploreFiveAxisMeter className={styles.fiveAxisReadMeterSvg} />
          </div>
          <div className={styles.fiveAxisReadCardGrid}>
            <div className={styles.fiveAxisReadMiniCard}>
              <p className={styles.fiveAxisReadMiniCardText}>
                {homeCopy.algorithmNoteJa}
              </p>
            </div>
            <div className={styles.fiveAxisReadMiniCard}>
              <p className={styles.fiveAxisReadMiniCardText}>
                {homeCopy.fiveAxisQualitiesNoteJa}
              </p>
            </div>
            <div className={styles.fiveAxisReadMiniCard}>
              <p className={styles.fiveAxisReadMiniCardText}>
                {homeCopy.fiveAxisMeterNoteJa}
              </p>
            </div>
          </div>
        </section>
      )}

      </div>

      <div
        className={`${styles.homeSurfaceShell} ${styles.homeBelowHeroStack}`}
        data-testid="m55-home-report-shell"
      >
      {/* ═══════════════════════════════════════════════════════════════════
          FOLD 5: ENTRY REPORT MONETIZATION LAYER (always visible)
          One hero only — no second product or second price.
          ═══════════════════════════════════════════════════════════════════ */}
      <section className={styles.reportSection} aria-label={homeCopy.reportSectionEyebrowJa}>
          <p className={styles.reportSectionEyebrow}>{homeCopy.reportSectionEyebrowJa}</p>

          <div
            className={`${styles.homeSurfaceCard} ${styles.homeSurfaceCardPaid} ${styles.valueCard}`}
          >
          <div className={styles.reportCardHeroBand}>
            <Image
              src="/home/hero-tech-map.webp"
              alt=""
              fill
              sizes="(max-width: 767px) 100vw, min(1320px, 100vw)"
              className={styles.reportCardHeroBandImg}
            />
            <div className={styles.reportCardHeroBandVeil} aria-hidden />
            <div className={styles.reportCardHeroOverlay}>
              <p className={styles.reportCardHeroOverlayEyebrow}>{homeCopy.reportLightEyebrowJa}</p>
              <p className={styles.reportCardHeroOverlayPrice}>{homeCopy.reportLightPriceJa}</p>
              <p className={styles.reportCardHeroOverlayLead}>{homeCopy.reportDepthNoteJa}</p>
            </div>
          </div>

          <div className={styles.reportCardBody}>
            <div className={styles.reportCardColMain}>
              <p className={styles.reportCardSupplement}>{homeCopy.reportLightSummaryJa}</p>

              <ul className={styles.featureListLoose}>
                <li className={styles.featureItemLoose}>{homeCopy.reportFullLineJa}</li>
                <li className={styles.featureItemLoose}>{homeCopy.reportFullUpgradeNoteJa}</li>
              </ul>
            </div>

            <div className={styles.reportCardColAside}>
              <div className={styles.reportCardLower}>
                {/* Chapter preview — chips / mini-cards (no blur) */}
                <div className={styles.chapterPreview}>
                  <p className={styles.chapterPreviewLabel}>{homeCopy.chapterPreviewLabelJa}</p>
                  <div className={styles.chapterChipWrap}>
                    {FORMAL_CHAPTER_CHIPS.map((s) => (
                      <span key={s.id} className={styles.chapterChip}>
                        {s.title}
                      </span>
                    ))}
                  </div>
                </div>

                <p className={styles.reportAuxCard}>{homeCopy.reportAuxJa}</p>

                <Link href={ctaCopy.viewSavedPlansHref} className={styles.reportCta}>
                  {ctaCopy.viewSavedPlansJa} →
                </Link>
              </div>
            </div>
          </div>
          </div>
      </section>

      <details className={styles.learnMoreDetails} data-testid="m55-home-learn-more">
        <summary className={styles.learnMoreSummary}>{learnMoreCopy.summaryJa}</summary>
        <nav className={styles.learnMoreLinks} aria-label="理解を深める">
          <Link href="/how-m55-works">M55の使い方</Link>
          <Link href="/ten-views">10通りの資質</Link>
        </nav>
        <p className={styles.learnMoreLead}>{homeCopy.algorithmNoteJa}</p>
        <ul className={styles.rulesList}>
          {learnMoreCopy.rulesJa.map((rule) => (
            <li key={rule} className={styles.ruleItem}>
              {rule}
            </li>
          ))}
        </ul>
      </details>

      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          FOLD 6: TRUST FOOTER (always visible)
          ═══════════════════════════════════════════════════════════════════ */}
      <BirthProfileIntakeLayer
        open={birthIntakeOpen}
        ownerId={ownerId}
        nicknameHint={nicknameHint}
        onClose={() => setBirthIntakeOpen(false)}
        onSaved={() => setCoreAnalyzing(true)}
        dataTestId="m55-home-birth-intake-layer"
      />

      {coreAnalyzeError ? (
        <div className={styles.coreAnalyzeError} role="alert">
          {coreAnalyzeError}
        </div>
      ) : null}

      <CoreAnalysisLoading
        open={coreAnalyzing}
        ownerId={ownerId}
        onComplete={() => {
          setCoreAnalyzing(false);
          try {
            sessionStorage.setItem('m55:core_fresh_reveal', '1');
          } catch {
            /* no-op */
          }
          router.push('/core');
        }}
        onError={(message) => {
          setCoreAnalyzing(false);
          setCoreAnalyzeError(message);
        }}
      />

    </div>
  );
}
