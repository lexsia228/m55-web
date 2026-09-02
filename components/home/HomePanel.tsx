'use client';

/**
 * HomePanel — 販売・導入の主舞台。無料説明・探索・プレミアム案内は消さない。
 * Home 上では個人結果（5軸個人図・今の焦点・今日/今週・要約カード等）を一切出さない。
 */

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../lib/m55/topFreeEntryPublicCopy';
import { isHomePairReadingLivePublic } from '../../lib/m55/homePairReadingPublicContract';
import { readSelfFunnelStage } from '../../lib/m55/selfFunnel/selfFunnelClientStore';
import {
  isValidBasicInfo,
  resolveFreeCtaLabel,
  resolveHomeCtaHref,
  resolveHomeCtaShowsLoginFreeSupport,
  type SelfFunnelStage,
} from '../../lib/m55/selfFunnel/selfFunnelRuntimeState';
import { ProfileRepository } from '../../lib/soul/profile';
import CoreAnalysisLoading from '../core/CoreAnalysisLoading';
import BirthProfileIntakeLayer from '../profile/BirthProfileIntakeLayer';
import HomeFreePreviewSlice from './HomeFreePreviewSlice';
import HomePairFreeSection from './HomePairFreeSection';
import HomePremiumPreviewSlice from './HomePremiumPreviewSlice';
import HomePremiumValueBridge from './HomePremiumValueBridge';
import HomeEditorialHeadline from './HomeEditorialHeadline';
import HomeMethodModel from './HomeMethodModel';
import HomeProductMap from './HomeProductMap';
import HomeTenAssetTeaser from './HomeTenAssetTeaser';
import HomePrintSummary from './HomePrintSummary';
import styles from './HomePanel.module.css';

const homeCopy = TOP_FREE_ENTRY_PUBLIC_COPY.home;
const ctaCopy = TOP_FREE_ENTRY_PUBLIC_COPY.cta;

/** Desktop Human-approved break: after 「…」 — never mid-phrase, never bare 「には、」. */
function heroDesktopTitleLines(line1: string, line2: string): { line1: string; line2: string } {
  const quoteClose = line1.indexOf('」');
  if (quoteClose < 0) return { line1, line2 };
  return {
    line1: line1.slice(0, quoteClose + 1),
    line2: `${line1.slice(quoteClose + 1)}${line2}`,
  };
}

function FreeCtaButton({
  stage,
  hydrationReady,
  className,
  testIdLoading,
  testIdIntake,
  testIdCore,
  label,
  onOpenIntake,
}: {
  stage: SelfFunnelStage;
  hydrationReady: boolean;
  className: string;
  testIdLoading: string;
  testIdIntake: string;
  testIdCore: string;
  label: string;
  onOpenIntake: () => void;
}) {
  if (!hydrationReady) {
    return (
      <button type="button" className={className} data-testid={testIdIntake} onClick={onOpenIntake}>
        {label}
      </button>
    );
  }
  if (stage === 'EMPTY') {
    return (
      <button type="button" className={className} data-testid={testIdIntake} onClick={onOpenIntake}>
        {label}
      </button>
    );
  }
  const href = resolveHomeCtaHref(stage);
  return (
    <Link href={href} className={className} data-testid={testIdCore}>
      {label}
    </Link>
  );
}

export default function HomePanel() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const ownerId = user?.id ?? null;
  const [profileEpoch, setProfileEpoch] = useState(0);
  const [clientHydrated, setClientHydrated] = useState(false);
  const [birthIntakeOpen, setBirthIntakeOpen] = useState(false);
  const [coreAnalyzing, setCoreAnalyzing] = useState(false);
  const [coreAnalyzeError, setCoreAnalyzeError] = useState<string | null>(null);

  useEffect(() => {
    setClientHydrated(true);
  }, []);

  useEffect(() => {
    const bump = () => setProfileEpoch((n) => n + 1);
    window.addEventListener('m55:profile_updated', bump);
    window.addEventListener('pageshow', bump);
    window.addEventListener('focus', bump);
    return () => {
      window.removeEventListener('m55:profile_updated', bump);
      window.removeEventListener('pageshow', bump);
      window.removeEventListener('focus', bump);
    };
  }, []);

  const view = useMemo(() => {
    if (!clientHydrated) {
      return { kind: 'no_profile' as const, stage: 'EMPTY' as SelfFunnelStage };
    }
    const profile = ProfileRepository.get(ownerId);
    if (!isValidBasicInfo(profile)) {
      return { kind: 'no_profile' as const, stage: 'EMPTY' as SelfFunnelStage };
    }
    const stage = readSelfFunnelStage(ownerId);
    return { kind: 'has_profile' as const, stage };
  }, [clientHydrated, isLoaded, ownerId, profileEpoch]);

  const hydrationReady = clientHydrated && isLoaded;
  const hasProfile = view.kind === 'has_profile';
  const funnelStage = view.stage;
  const freeCtaLabel = resolveFreeCtaLabel(funnelStage);
  const homeCtaHref = resolveHomeCtaHref(funnelStage);
  const showLoginFreeSupport =
    hydrationReady && resolveHomeCtaShowsLoginFreeSupport(funnelStage);
  const pairLive = isHomePairReadingLivePublic();
  const openIntake = () => setBirthIntakeOpen(true);
  const nicknameHint = (user?.firstName || user?.username || '').trim();
  const heroDesktopTitle = heroDesktopTitleLines(
    homeCopy.heroTitleLine1Ja,
    homeCopy.heroTitleLine2Ja,
  );
  const heroTitlePhrase = heroDesktopTitle.line1;
  const heroTitleDesktopPrefix = heroDesktopTitle.line2.slice(
    0,
    Math.max(0, heroDesktopTitle.line2.length - homeCopy.heroTitleLine2Ja.length),
  );

  return (
    <div className={styles.wrap}>

      {/* §2 — FROZEN POSTER (no changes) */}
      <section
        className={`${styles.heroSection} ${styles.posterHeroApprovedRoot}`}
        data-testid="m55-home-hero"
        data-m55-visual-subsystem="home"
      >
        <div className={styles.posterStack}>
          <div className={styles.posterMainVisual} data-testid="m55-home-poster-main-visual">
            <div className={styles.posterMainVisualStack} aria-hidden>
              <div className={styles.posterHeroBaseLayer}>
                <picture className={styles.posterHeroPicture}>
                  <source media="(max-width: 820px)" srcSet="/home/m55-b2c-r3-hero-mobile.avif" type="image/avif" />
                  <source media="(max-width: 820px)" srcSet="/home/m55-b2c-r3-hero-mobile.webp" type="image/webp" />
                  <source media="(max-width: 820px)" srcSet="/home/m55-b2c-r3-hero-mobile.jpg" type="image/jpeg" />
                  <source media="(min-width: 821px)" srcSet="/home/m55-b2c-r3-hero-desktop.avif" type="image/avif" />
                  <source media="(min-width: 821px)" srcSet="/home/m55-b2c-r3-hero-desktop.webp" type="image/webp" />
                  <img
                    src="/home/m55-b2c-r3-hero-desktop.jpg"
                    alt=""
                    width="1440"
                    height="1000"
                    sizes="100vw"
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    className={styles.posterHeroBaseImage}
                  />
                </picture>
              </div>
              <div className={styles.posterHeroReadabilityVeil} />
            </div>
            <div className={styles.posterHeroOverlay}>
              <div className={styles.posterHeroFoot}>
                <div className={styles.posterHeroCopy}>
                  <div className={styles.posterHeroMessage}>
                    <div className={styles.posterHeroLabelGroup}>
                      <p className={styles.posterHeroBrandM55}>M55</p>
                      <p className={styles.posterHeroProductTitle}>{homeCopy.heroEyebrowJa}</p>
                    </div>
                    <h1 className={styles.posterHeroTitleBlite} data-testid="m55-home-hero-title">
                      <span className={styles.posterHeroTitleLine}>
                        <span className={styles.posterHeroTitlePhrase}>{heroTitlePhrase}</span>
                        <span className={styles.posterHeroTitleMobileTail}>
                          {heroTitleDesktopPrefix}
                        </span>
                      </span>
                      <span className={styles.posterHeroTitleLine}>
                        <span className={styles.posterHeroTitleDesktopPrefix}>
                          {heroTitleDesktopPrefix}
                        </span>
                        {homeCopy.heroTitleLine2Ja}
                      </span>
                    </h1>
                  </div>
                  <div className={styles.posterHeroBottomStack}>
                    {/*
                      The hero CTA is the primary commercial action, so it must
                      occupy its slot from first paint. Before the auth state
                      settles it renders as a disabled placeholder, matching the
                      loading behaviour of the lower free CTAs.
                    */}
                    {(!hydrationReady || !hasProfile) && (
                      <button
                        type="button"
                        className={styles.posterHeroCta}
                        data-testid="m55-home-open-birth-intake"
                        data-m55-hero-cta="true"
                        onClick={openIntake}
                      >
                        {freeCtaLabel}
                      </button>
                    )}
                    {hydrationReady && hasProfile && (
                      <Link
                        href={homeCtaHref}
                        className={styles.posterHeroCta}
                        data-testid="m55-home-has-profile-hero"
                        data-m55-hero-cta="true"
                      >
                        {freeCtaLabel}
                      </Link>
                    )}
                    <p className={styles.posterHeroSupport} data-testid="m55-home-hero-support">
                      {homeCopy.heroPosterSupportJa}
                    </p>
                    {showLoginFreeSupport ? (
                      <p className={styles.posterHeroTrust} data-testid="m55-home-hero-trust">
                        {homeCopy.heroTrustJa}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.lowerWrap} data-testid="m55-home-lower">

        {/* §2 — Product map (below hero, before free detail) */}
        <section
          className={`${styles.lowerSection} ${styles.productMapStage}`}
          data-testid="m55-home-product-map"
          aria-labelledby="m55-home-product-map-title"
        >
          <HomeProductMap
            eyebrowJa={homeCopy.productMapEyebrowJa}
            headlineJa={homeCopy.productMapHeadlineJa}
            selfTitleJa={homeCopy.productMapSelfTitleJa}
            selfBodyJa={homeCopy.productMapSelfBodyJa}
            selfStatusJa={homeCopy.productMapSelfStatusJa}
            selfCtaJa={homeCopy.productMapSelfCtaJa}
            pairTitleJa={homeCopy.productMapPairTitleJa}
            pairBodyJa={homeCopy.productMapPairBodyJa}
            pairStatusJa={homeCopy.productMapPairStatusJa}
            pairCtaJa={homeCopy.productMapPairCtaJa}
            pairPreparingTitleJa={homeCopy.productMapPairPreparingTitleJa}
            pairPreparingBodyJa={homeCopy.productMapPairPreparingBodyJa}
            pairPreparingStatusJa={homeCopy.productMapPairPreparingStatusJa}
            premiumTitleJa={homeCopy.productMapPremiumTitleJa}
            premiumBodyJa={homeCopy.productMapPremiumBodyJa}
            premiumLinkJa={homeCopy.productMapPremiumLinkJa}
            freeCta={{
              hasProfile,
              isLoaded,
              label: freeCtaLabel,
              onOpenIntake: openIntake,
            }}
          />
        </section>

        {/* §3 — Free (outcome + preview merged) */}
        <section
          className={`${styles.lowerSection} ${styles.freeStage}`}
          data-testid="m55-home-free-preview"
          aria-labelledby="m55-home-free-preview-title"
        >
          <p className={styles.sectionEyebrow}>{homeCopy.outcomeBridgeEyebrowJa}</p>
          <HomeEditorialHeadline
            id="m55-home-free-preview-title"
            className={styles.sectionHeadline}
            textJa={homeCopy.freeResultHeadlineJa}
          />
          <ul className={styles.outcomeEditorial}>
            {homeCopy.outcomeBridgeItemsJa.map((item, index) => (
              <li key={item.titleJa} className={styles.outcomeEditorialItem}>
                <p className={styles.outcomeIndex}>{String(index + 1).padStart(2, '0')}</p>
                <p className={styles.outcomeEditorialTitle}>{item.titleJa}</p>
                <p className={styles.outcomeEditorialBody}>{item.bodyJa}</p>
              </li>
            ))}
          </ul>
          <p className={styles.sectionLead}>{homeCopy.freeResultBodyJa}</p>
          <div className={styles.integratedPreviewBlock}>
            <HomeFreePreviewSlice previewLabelJa={homeCopy.freeResultPreviewLabelJa} />
          </div>
          <div className={styles.integratedActions}>
            <FreeCtaButton
              stage={funnelStage}
              hydrationReady={hydrationReady}
              className={styles.ctaFree}
              testIdLoading="m55-home-free-preview-cta-loading"
              testIdIntake="m55-home-free-preview-intake"
              testIdCore="m55-home-free-preview-core"
              label={freeCtaLabel}
              onOpenIntake={openIntake}
            />
            {showLoginFreeSupport ? (
              <p className={styles.ctaSupport}>{homeCopy.freeResultSupportJa}</p>
            ) : null}
          </div>
        </section>

        {/* §3a — Pair free (compact dedicated section) */}
        <HomePairFreeSection
          eyebrowJa={homeCopy.pairFreeEyebrowJa}
          headlineJa={homeCopy.pairFreeHeadlineJa}
          bodyJa={homeCopy.pairFreeBodyJa}
          statusJa={homeCopy.pairFreeStatusJa}
          preparingStatusJa={homeCopy.pairFreePreparingStatusJa}
          ctaJa={homeCopy.pairFreeCtaJa}
          pairLive={pairLive}
        />

        {/* §4 — Premium (product comprehension before mechanism depth) */}
        <section
          className={`${styles.lowerSection} ${styles.premiumDarkStage}`}
          data-testid="m55-home-premium-preview"
          aria-labelledby="m55-home-premium-preview-title"
          id="m55-home-premium-preview"
        >
          <HomePremiumValueBridge
            eyebrowJa={homeCopy.premiumValueBridgeEyebrowJa}
            leadJa={homeCopy.premiumValueBridgeLeadJa}
            freeHeadingJa={homeCopy.premiumValueBridgeFreeHeadingJa}
            freeItemsJa={homeCopy.premiumValueBridgeFreeItemsJa}
            premiumHeadingJa={homeCopy.premiumValueBridgePremiumHeadingJa}
            premiumItemsJa={homeCopy.premiumValueBridgePremiumItemsJa}
          />
          <p className={styles.sectionEyebrow}>{homeCopy.premiumEyebrowJa}</p>
          <HomeEditorialHeadline
            id="m55-home-premium-preview-title"
            className={styles.sectionHeadline}
            textJa={homeCopy.premiumHeadlineJa}
          />
          <p className={styles.sectionLead}>{homeCopy.premiumBodyJa}</p>
          <div className={styles.integratedPreviewBlock}>
            <HomePremiumPreviewSlice previewLabelJa={homeCopy.premiumPreviewLabelJa} />
          </div>
          <div
            className={styles.planComparisonSurface}
            data-testid="m55-home-plan-comparison"
            aria-labelledby="m55-home-plan-comparison-intro"
          >
            <p id="m55-home-plan-comparison-intro" className={styles.planComparisonLead}>
              {homeCopy.planComparisonIntroJa}
            </p>
            <div className={styles.planComparisonRow}>
              <article className={styles.planComparisonCol} data-testid="m55-home-plan-light">
                <p className={styles.planComparisonName}>{homeCopy.planLightNameJa}</p>
                <p className={styles.planComparisonFit}>{homeCopy.planLightFitJa}</p>
                <p className={styles.planComparisonPrice}>{homeCopy.planLightPriceJa}</p>
                <p className={styles.planComparisonSpec}>{homeCopy.planLightSpecJa}</p>
              </article>
              <div className={styles.planComparisonDivider} aria-hidden="true" />
              <article className={styles.planComparisonCol} data-testid="m55-home-plan-full">
                <p className={styles.planComparisonName}>{homeCopy.planFullNameJa}</p>
                <p className={styles.planComparisonFit}>{homeCopy.planFullFitJa}</p>
                <p className={styles.planComparisonPrice}>{homeCopy.planFullPriceJa}</p>
                <p className={styles.planComparisonSpec}>{homeCopy.planFullSpecJa}</p>
              </article>
            </div>
            <ul className={styles.planFactsList}>
              {homeCopy.planCommonFactsJa.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          </div>
          <Link
            href={ctaCopy.viewSavedPlansHref}
            className={styles.ctaPaidSolid}
            data-testid="m55-home-premium-preview-cta"
          >
            {homeCopy.planComparisonCtaJa}
          </Link>
        </section>

        {/* §5 — Mechanism + method (progressive disclosure after product comprehension) */}
        <details
          className={`${styles.lowerSection} ${styles.mechanismStage} ${styles.mechanismDisclosure}`}
          data-testid="m55-home-mechanism"
        >
          <summary className={styles.mechanismSummary}>
            <p className={styles.sectionEyebrow}>{homeCopy.mechanismEyebrowJa}</p>
            <HomeEditorialHeadline
              id="m55-home-mechanism-title"
              className={styles.sectionHeadline}
              textJa={homeCopy.mechanismHeadlineJa}
            />
            <span className={styles.mechanismSummaryHint}>詳しく見る</span>
          </summary>
          <div className={styles.mechanismDisclosureBody}>
          <p className={styles.sectionBody}>{homeCopy.mechanismBodyJa}</p>
          <div className={styles.mechanismDiagram} aria-hidden="true">
            <div className={styles.mechanismDiagramSources}>
              <p className={styles.mechanismDiagramLabel}>{homeCopy.mechanismDiagramSource1Ja}</p>
              <span className={styles.mechanismDiagramPlus}>+</span>
              <p className={styles.mechanismDiagramLabel}>{homeCopy.mechanismDiagramSource2Ja}</p>
            </div>
            <div className={styles.mechanismDiagramFlow} />
            <p className={styles.mechanismDiagramOutput}>{homeCopy.mechanismDiagramOutputJa}</p>
          </div>
          <p className={styles.sectionSupporting}>{homeCopy.mechanismEthicsJa}</p>
          <nav className={styles.mechanismLinks} aria-label="M55の読み方リンク">
            <Link href="/how-m55-works" className={styles.textLink} data-testid="m55-home-mechanism-link">
              {homeCopy.mechanismHowLinkJa}
            </Link>
          </nav>
          <div className={styles.methodModelStage}>
            <HomeMethodModel />
          </div>
          <HomeTenAssetTeaser
            eyebrowJa={homeCopy.tenAssetTeaserEyebrowJa}
            headlineJa={homeCopy.tenAssetTeaserHeadlineJa}
            bodyJa={homeCopy.tenAssetTeaserBodyJa}
            linkJa={homeCopy.tenAssetTeaserLinkJa}
          />
          </div>
        </details>

        {/* §6 — Final CTA */}
        <section
          className={`${styles.lowerSection} ${styles.finalLightStage}`}
          data-testid="m55-home-final-cta"
          aria-labelledby="m55-home-final-cta-title"
        >
          <HomeEditorialHeadline
            id="m55-home-final-cta-title"
            className={styles.sectionHeadline}
            textJa={homeCopy.finalCtaHeadlineJa}
          />
          <p className={styles.sectionLead}>{homeCopy.finalCtaBodyJa}</p>
          <div className={styles.finalCtaGroup}>
            <FreeCtaButton
              stage={funnelStage}
              hydrationReady={hydrationReady}
              className={styles.ctaFree}
              testIdLoading="m55-home-final-cta-loading"
              testIdIntake="m55-home-final-cta-intake"
              testIdCore="m55-home-final-cta-core"
              label={freeCtaLabel}
              onOpenIntake={openIntake}
            />
            <Link
              href={ctaCopy.viewSavedPlansHref}
              className={styles.finalCtaSecondaryLink}
              data-testid="m55-home-final-cta-plans"
            >
              {homeCopy.finalCtaSecondaryJa}
            </Link>
          </div>
        </section>

      </div>

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

      <HomePrintSummary />
    </div>
  );
}
