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
import {
  M55_FUNNEL_EVENTS,
  trackFunnelAction,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import { ProfileRepository } from '../../lib/soul/profile';
import CoreAnalysisLoading from '../core/CoreAnalysisLoading';
import BirthProfileIntakeLayer from '../profile/BirthProfileIntakeLayer';
import { HeroBackgroundMedia } from './HeroBackgroundMedia';
import styles from './HomePanel.module.css';

const homeCopy = TOP_FREE_ENTRY_PUBLIC_COPY.home;
const ctaCopy = TOP_FREE_ENTRY_PUBLIC_COPY.cta;

/* ── Component ───────────────────────────────────────────────────────────────── */

export default function HomePanel({
  compatibilityCommerceAvailable,
}: {
  compatibilityCommerceAvailable: boolean;
}) {
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
                    <p className={styles.posterHeroSupportInline} style={{ whiteSpace: 'pre-line' }}>{homeCopy.heroSubJa}</p>
                    <p className={styles.posterHeroTrust} style={{ whiteSpace: 'pre-line' }}>
                      {homeCopy.heroTrustJa}
                    </p>
                  </div>
                  <div className={styles.posterHeroBreathing} aria-hidden />
                  <div className={styles.posterHeroBottomStack}>
                    {isLoaded && view.kind === 'no_profile' && (
                      <button
                        type="button"
                        className={styles.posterHeroCta}
                        data-testid="m55-home-open-birth-intake"
                        aria-label={`${homeCopy.heroFunnelCtaJa}。${homeCopy.heroSupportJa}`}
                        onClick={() => {
                          trackFunnelAction(M55_FUNNEL_EVENTS.personalFreeStart, 'reading_personal');
                          setBirthIntakeOpen(true);
                        }}
                      >
                        {homeCopy.heroFunnelCtaJa} →
                      </button>
                    )}
                    {isLoaded && hasProfile && (
                      <Link
                        href={ctaCopy.coreFreeHref}
                        className={styles.posterHeroCta}
                        data-testid="m55-home-has-profile-hero"
                        aria-label={`${homeCopy.heroFunnelCtaJa}。${homeCopy.heroSupportJa}`}
                        onClick={() =>
                          trackFunnelAction(M55_FUNNEL_EVENTS.personalFreeStart, 'reading_personal')
                        }
                      >
                        {homeCopy.heroFunnelCtaJa} →
                      </Link>
                    )}
                    <Link
                      href="/synastry"
                      className={styles.posterHeroSecondaryCta}
                      onClick={() =>
                        trackFunnelAction(
                          M55_FUNNEL_EVENTS.compatibilityFreeStart,
                          'reading_compatibility',
                        )
                      }
                    >
                      {homeCopy.heroCompatibilityCtaJa}
                    </Link>
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
        <section
          className={styles.homeSeenBridge}
          data-testid="m55-home-seen-things-bridge"
          data-m55-visible-introduction="true"
          aria-labelledby="m55-home-introduction-title"
        >
          <div className={styles.homeSeenBridgeInner}>
            <p className={styles.homeSeenBridgeLabel}>{homeCopy.introductionLabelJa}</p>
            <h2 id="m55-home-introduction-title" className={styles.homeSeenBridgeHeadline}>
              {homeCopy.introductionTitleJa}
            </h2>
            <p className={styles.homeIntroductionBody}>
              {homeCopy.introductionBodyJa}
            </p>
            <p className={styles.homeIntroductionTrust}>
              {homeCopy.introductionTrustJa}
            </p>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          UNDERSTANDING MODE — public education only (no personal result UI)
          ═══════════════════════════════════════════════════════════════════ */}
      {showPublicValueBlocks && (
        <section
          className={styles.homeReadNextSection}
          data-testid="m55-home-understanding"
          aria-labelledby="m55-home-read-next-title"
        >
          <h2 id="m55-home-read-next-title" className={styles.homeReadNextSectionTitle}>
            {homeCopy.readNextSectionTitleJa}
          </h2>
          <div className={styles.homeReadNextGrid} role="navigation" aria-label={homeCopy.readNextSectionTitleJa}>
            <Link
              href="/core"
              className={styles.homeReadNextCard}
              onClick={() =>
                trackFunnelAction(M55_FUNNEL_EVENTS.personalFreeStart, 'reading_personal')
              }
            >
              <span
                className={styles.homeReadNextThumb}
                data-testid="m55-home-demo-five-element"
              >
                <Image
                  src="/home/card-how-to-read.webp"
                  alt=""
                  fill
                  sizes="52px"
                  className={styles.homeReadNextThumbImage}
                />
              </span>
              <span className={styles.homeReadNextBody}>
                <span className={styles.homeReadNextCardTitle}>{homeCopy.readNextHowTitleJa}</span>
                <span className={styles.homeReadNextCardDesc}>{homeCopy.readNextHowDescJa}</span>
                <span className={styles.homeReadNextCta}>{homeCopy.readNextHowCtaJa}</span>
              </span>
            </Link>
            <Link
              href="/synastry"
              className={styles.homeReadNextCard}
              onClick={() =>
                trackFunnelAction(
                  M55_FUNNEL_EVENTS.compatibilityFreeStart,
                  'reading_compatibility',
                )
              }
            >
              <span className={`${styles.homeReadNextThumb} ${styles.homeReadNextThumbQualities}`}>
                <Image
                  src="/home/card-qualities-flower.webp"
                  alt=""
                  fill
                  sizes="52px"
                  className={`${styles.homeReadNextThumbImage} ${styles.homeReadNextThumbImageQualities}`}
                />
              </span>
              <span className={styles.homeReadNextBody}>
                <span className={styles.homeReadNextCardTitle}>{homeCopy.readNextQualitiesTitleJa}</span>
                <span className={styles.homeReadNextCardDesc}>{homeCopy.readNextQualitiesDescJa}</span>
                <span className={styles.homeReadNextCta}>{homeCopy.readNextQualitiesCtaJa}</span>
              </span>
            </Link>
          </div>
        </section>
      )}

      {showPublicValueBlocks && (
        <section
          className={styles.homeMethodLayer}
          data-testid="m55-home-five-axis-read"
          aria-labelledby="m55-home-method-layer-title"
        >
          <div className={styles.homeMethodLayerInner}>
            <p className={styles.homeMethodLayerLabel}>{homeCopy.methodFlowLabelJa}</p>
            <h2 id="m55-home-method-layer-title" className={styles.homeMethodLayerHeadline}>
              <span className={styles.homeMethodLayerHeadlineLine}>{homeCopy.methodFlowHeadlineLine1Ja}</span>
              <span className={styles.homeMethodLayerHeadlineLine}>{homeCopy.methodFlowHeadlineLine2Ja}</span>
            </h2>
            <p className={styles.homeMethodLayerBody} style={{ whiteSpace: 'pre-line' }}>
              {homeCopy.methodFlowBodyJa}
            </p>
            <p className={styles.homeMethodFramework}>
              {homeCopy.methodPreviewFrameworkJa}
            </p>
            <nav className={styles.homeMethodLinks} aria-label="読み解きの方法を知る">
              <Link href="/how-m55-works">{homeCopy.methodPreviewLinkJa}</Link>
              <Link href="/ten-views">{homeCopy.methodPreviewTenViewsLinkJa}</Link>
            </nav>
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
      <section
        className={styles.reportSection}
        aria-labelledby="m55-home-paid-plan-title"
        data-testid="m55-home-paid-plan"
      >
        <div className={styles.homePaidPlan}>
          <div className={styles.homePaidPlanInner}>
            <p className={styles.homePaidPlanLabel}>{homeCopy.paidPlanLabelJa}</p>
            <h2 id="m55-home-paid-plan-title" className={styles.homePaidPlanHeadline}>
              <span className={styles.homePaidPlanHeadlineLine}>{homeCopy.paidPlanHeadlineLine1Ja}</span>
              <span className={styles.homePaidPlanHeadlineLine}>{homeCopy.paidPlanHeadlineLine2Ja}</span>
            </h2>
            <p className={styles.homePaidPlanLead} style={{ whiteSpace: 'pre-line' }}>
              {homeCopy.paidPlanLeadJa}
            </p>

            <div className={styles.homePaidPlanSavedInfo}>
              <p className={styles.homePaidPlanSavedInfoHeading}>{homeCopy.paidPlanSavedInfoHeadingJa}</p>
              <p className={styles.homePaidPlanSavedInfoBody} style={{ whiteSpace: 'pre-line' }}>
                {homeCopy.paidPlanSavedInfoBodyJa}
              </p>
              <p className={styles.homePaidPlanSavedInfoPrice} style={{ whiteSpace: 'pre-line' }}>
                {homeCopy.paidPlanSavedInfoPriceJa}
              </p>
              <p className={styles.homePaidPlanCompatibilityNote}>
                {compatibilityCommerceAvailable
                  ? homeCopy.compatibilitySavedAvailableJa
                  : homeCopy.compatibilitySavedPausedJa}
              </p>
            </div>
            <Link
              href="/dtr/lp"
              className={styles.homePaidPlanDetailsCta}
              data-testid="m55-home-paid-details"
              onClick={() =>
                trackFunnelAction(M55_FUNNEL_EVENTS.purchaseDetailsOpen, 'reading_personal')
              }
            >
              {homeCopy.paidPlanDetailsCtaJa} →
            </Link>
          </div>
        </div>
      </section>

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
