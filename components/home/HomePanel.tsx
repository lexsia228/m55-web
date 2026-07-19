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
import { ProfileRepository } from '../../lib/soul/profile';
import CoreAnalysisLoading from '../core/CoreAnalysisLoading';
import BirthProfileIntakeLayer from '../profile/BirthProfileIntakeLayer';
import HomeFreePreviewSlice from './HomeFreePreviewSlice';
import HomePremiumPreviewSlice from './HomePremiumPreviewSlice';
import HomeTenAssetTeaser from './HomeTenAssetTeaser';
import styles from './HomePanel.module.css';

const homeCopy = TOP_FREE_ENTRY_PUBLIC_COPY.home;
const ctaCopy = TOP_FREE_ENTRY_PUBLIC_COPY.cta;

function FreeCtaButton({
  hasProfile,
  isLoaded,
  className,
  testIdLoading,
  testIdIntake,
  testIdCore,
  label,
  onOpenIntake,
}: {
  hasProfile: boolean;
  isLoaded: boolean;
  className: string;
  testIdLoading: string;
  testIdIntake: string;
  testIdCore: string;
  label: string;
  onOpenIntake: () => void;
}) {
  if (!isLoaded) {
    return (
      <button
        type="button"
        className={`${className} ${styles.ctaFreeLoading}`}
        disabled
        aria-busy="true"
        data-testid={testIdLoading}
      >
        {label}
      </button>
    );
  }
  if (!hasProfile) {
    return (
      <button type="button" className={className} data-testid={testIdIntake} onClick={onOpenIntake}>
        {label}
      </button>
    );
  }
  return (
    <Link href={ctaCopy.coreFreeHref} className={className} data-testid={testIdCore}>
      {label}
    </Link>
  );
}

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
  const openIntake = () => setBirthIntakeOpen(true);
  const nicknameHint = (user?.firstName || user?.username || '').trim();

  return (
    <div className={styles.wrap}>

      {/* §2 — FROZEN POSTER (no changes) */}
      <section className={`${styles.heroSection} ${styles.posterHeroApprovedRoot}`} data-testid="m55-home-hero">
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
                    width="4320"
                    height="3000"
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
                    <h1 className={styles.posterHeroTitleBlite}>
                      <span className={styles.posterHeroTitleLine}>{homeCopy.heroTitleLine1Ja}</span>
                      <span className={styles.posterHeroTitleLine}>{homeCopy.heroTitleLine2Ja}</span>
                    </h1>
                  </div>
                  <div className={styles.posterHeroBottomStack}>
                    {isLoaded && !hasProfile && (
                      <button
                        type="button"
                        className={styles.posterHeroCta}
                        data-testid="m55-home-open-birth-intake"
                        onClick={openIntake}
                      >
                        {homeCopy.heroPosterCtaJa}
                      </button>
                    )}
                    {isLoaded && hasProfile && (
                      <button
                        type="button"
                        className={styles.posterHeroCta}
                        data-testid="m55-home-has-profile-hero"
                        onClick={() => router.push('/core')}
                      >
                        {homeCopy.heroPosterCtaJa}
                      </button>
                    )}
                    <p className={styles.posterHeroSupport}>{homeCopy.heroPosterSupportJa}</p>
                    <p className={styles.posterHeroTrust}>{homeCopy.heroTrustJa}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.lowerWrap} data-testid="m55-home-lower">

        {/* §3 — Free (outcome + preview merged) */}
        <section
          className={`${styles.lowerSection} ${styles.freeStage}`}
          data-testid="m55-home-free-preview"
          aria-labelledby="m55-home-free-preview-title"
        >
          <p className={styles.sectionEyebrow}>{homeCopy.outcomeBridgeEyebrowJa}</p>
          <h2 id="m55-home-free-preview-title" className={styles.sectionHeadline}>
            {homeCopy.freeResultHeadlineJa}
          </h2>
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
              hasProfile={hasProfile}
              isLoaded={isLoaded}
              className={styles.ctaFree}
              testIdLoading="m55-home-free-preview-cta-loading"
              testIdIntake="m55-home-free-preview-intake"
              testIdCore="m55-home-free-preview-core"
              label={homeCopy.freeResultCtaJa}
              onOpenIntake={openIntake}
            />
            <p className={styles.ctaSupport}>{homeCopy.freeResultSupportJa}</p>
          </div>
          <HomeTenAssetTeaser
            eyebrowJa={homeCopy.tenAssetTeaserEyebrowJa}
            headlineJa={homeCopy.tenAssetTeaserHeadlineJa}
            bodyJa={homeCopy.tenAssetTeaserBodyJa}
            linkJa={homeCopy.tenAssetTeaserLinkJa}
          />
        </section>

        {/* §4 — Mechanism band */}
        <section
          className={`${styles.lowerSection} ${styles.mechanismStage}`}
          data-testid="m55-home-mechanism"
          aria-labelledby="m55-home-mechanism-title"
        >
          <p className={styles.sectionEyebrow}>{homeCopy.mechanismEyebrowJa}</p>
          <h2 id="m55-home-mechanism-title" className={styles.sectionHeadline}>
            {homeCopy.mechanismHeadlineJa}
          </h2>
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
        </section>

        {/* §5 — Premium (preview + plan merged) */}
        <section
          className={`${styles.lowerSection} ${styles.premiumDarkStage}`}
          data-testid="m55-home-premium-preview"
          aria-labelledby="m55-home-premium-preview-title"
        >
          <p className={styles.sectionEyebrow}>{homeCopy.premiumEyebrowJa}</p>
          <h2 id="m55-home-premium-preview-title" className={styles.sectionHeadline}>
            {homeCopy.premiumHeadlineJa}
          </h2>
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
                <p className={styles.planComparisonPrice}>{homeCopy.planLightPriceJa}</p>
                <p className={styles.planComparisonSpec}>{homeCopy.planLightSpecJa}</p>
              </article>
              <div className={styles.planComparisonDivider} aria-hidden="true" />
              <article className={styles.planComparisonCol} data-testid="m55-home-plan-full">
                <p className={styles.planComparisonName}>{homeCopy.planFullNameJa}</p>
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

        {/* §6 — Final CTA */}
        <section
          className={`${styles.lowerSection} ${styles.finalLightStage}`}
          data-testid="m55-home-final-cta"
          aria-labelledby="m55-home-final-cta-title"
        >
          <h2 id="m55-home-final-cta-title" className={styles.sectionHeadline}>
            {homeCopy.finalCtaHeadlineJa}
          </h2>
          <p className={styles.sectionLead}>{homeCopy.finalCtaBodyJa}</p>
          <div className={styles.finalCtaGroup}>
            <FreeCtaButton
              hasProfile={hasProfile}
              isLoaded={isLoaded}
              className={styles.ctaFree}
              testIdLoading="m55-home-final-cta-loading"
              testIdIntake="m55-home-final-cta-intake"
              testIdCore="m55-home-final-cta-core"
              label={homeCopy.finalCtaPrimaryJa}
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

    </div>
  );
}
