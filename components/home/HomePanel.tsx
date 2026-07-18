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
import HomeMechanismPanels from './HomeMechanismPanels';
import HomePremiumPreviewSlice from './HomePremiumPreviewSlice';
import HomeTenAssetTiles from './HomeTenAssetTiles';
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

        {/* §3 — Outcome bridge */}
        <section
          className={styles.lowerSection}
          data-testid="m55-home-outcome-bridge"
          aria-labelledby="m55-home-outcome-bridge-title"
        >
          <p className={styles.sectionEyebrow}>{homeCopy.outcomeBridgeEyebrowJa}</p>
          <h2 id="m55-home-outcome-bridge-title" className={styles.sectionHeadline}>
            {homeCopy.outcomeBridgeHeadlineJa}
          </h2>
          <ul className={styles.outcomeGrid}>
            {homeCopy.outcomeBridgeItemsJa.map((item) => (
              <li key={item.titleJa} className={styles.card}>
                <p className={styles.cardTitle}>{item.titleJa}</p>
                <p className={styles.cardBody}>{item.bodyJa}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* §4 — Mechanism */}
        <section
          className={styles.lowerSection}
          data-testid="m55-home-mechanism"
          aria-labelledby="m55-home-mechanism-title"
        >
          <p className={styles.sectionEyebrow}>{homeCopy.mechanismEyebrowJa}</p>
          <h2 id="m55-home-mechanism-title" className={styles.sectionHeadline}>
            {homeCopy.mechanismHeadlineJa}
          </h2>
          <p className={styles.sectionLead}>{homeCopy.mechanismBodyJa}</p>
          <HomeMechanismPanels
            copy={{
              source1TitleJa: homeCopy.mechanismSource1TitleJa,
              source1BodyJa: homeCopy.mechanismSource1BodyJa,
              source2TitleJa: homeCopy.mechanismSource2TitleJa,
              source2BodyJa: homeCopy.mechanismSource2BodyJa,
              outputTitleJa: homeCopy.mechanismOutputTitleJa,
              outputBodyJa: homeCopy.mechanismOutputBodyJa,
            }}
          />
          <Link href="/how-m55-works" className={styles.textLink} data-testid="m55-home-mechanism-link">
            {homeCopy.mechanismCtaJa}
          </Link>
        </section>

        {/* §5 — Free preview */}
        <section
          className={`${styles.lowerSection} ${styles.splitSection}`}
          data-testid="m55-home-free-preview"
          aria-labelledby="m55-home-free-preview-title"
        >
          <div className={styles.splitCopy}>
            <p className={styles.sectionEyebrow}>{homeCopy.freeResultEyebrowJa}</p>
            <h2 id="m55-home-free-preview-title" className={styles.sectionHeadline}>
              {homeCopy.freeResultHeadlineJa}
            </h2>
            <p className={styles.sectionLead}>{homeCopy.freeResultBodyJa}</p>
          </div>
          <div className={styles.splitPreview}>
            <HomeFreePreviewSlice previewLabelJa={homeCopy.freeResultPreviewLabelJa} />
          </div>
          <div className={styles.splitActions}>
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
        </section>

        {/* §6 — Premium preview */}
        <section
          className={`${styles.lowerSection} ${styles.splitSection} ${styles.splitSectionReverse}`}
          data-testid="m55-home-premium-preview"
          aria-labelledby="m55-home-premium-preview-title"
        >
          <div className={styles.splitPreview}>
            <HomePremiumPreviewSlice previewLabelJa={homeCopy.premiumPreviewLabelJa} />
          </div>
          <div className={styles.splitCopy}>
            <p className={styles.sectionEyebrow}>{homeCopy.premiumEyebrowJa}</p>
            <h2 id="m55-home-premium-preview-title" className={styles.sectionHeadline}>
              {homeCopy.premiumHeadlineJa}
            </h2>
            <p className={styles.sectionLead}>{homeCopy.premiumBodyJa}</p>
            <Link
              href={ctaCopy.viewSavedPlansHref}
              className={styles.ctaPaidSolid}
              data-testid="m55-home-premium-preview-cta"
            >
              {homeCopy.premiumCtaJa}
            </Link>
          </div>
        </section>

        {/* §7 — ten assets */}
        <section
          className={styles.lowerSection}
          data-testid="m55-home-ten-assets"
          aria-labelledby="m55-home-ten-assets-title"
        >
          <p className={styles.sectionEyebrow}>{homeCopy.tenAssetsEyebrowJa}</p>
          <h2 id="m55-home-ten-assets-title" className={styles.sectionHeadline}>
            {homeCopy.tenAssetsHeadlineJa}
          </h2>
          <p className={styles.sectionLead}>{homeCopy.tenAssetsBodyJa}</p>
          <HomeTenAssetTiles />
          <Link href="/ten-views" className={styles.ctaOutline} data-testid="m55-home-ten-assets-cta">
            {homeCopy.tenAssetsCtaJa}
          </Link>
        </section>

        {/* §8 — Plans */}
        <section
          className={`${styles.lowerSection} ${styles.planBand}`}
          data-testid="m55-home-plan-comparison"
          aria-labelledby="m55-home-plan-comparison-title"
        >
          <h2 id="m55-home-plan-comparison-title" className={styles.sectionHeadline}>
            {homeCopy.planComparisonHeadlineJa}
          </h2>
          <p className={styles.sectionLead}>{homeCopy.planComparisonIntroJa}</p>
          <div className={styles.planGrid}>
            <article className={styles.planCard} data-testid="m55-home-plan-light">
              <div className={styles.planNamePriceGroup}>
                <p className={styles.planName}>{homeCopy.planLightNameJa}</p>
                <p className={styles.planPrice}>{homeCopy.planLightPriceJa}</p>
              </div>
              <p className={styles.planSpec}>{homeCopy.planLightSpecJa}</p>
            </article>
            <article className={styles.planCard} data-testid="m55-home-plan-full">
              <div className={styles.planNamePriceGroup}>
                <p className={styles.planName}>{homeCopy.planFullNameJa}</p>
                <p className={styles.planPrice}>{homeCopy.planFullPriceJa}</p>
              </div>
              <p className={styles.planSpec}>{homeCopy.planFullSpecJa}</p>
            </article>
          </div>
          <ul className={styles.planFactsList}>
            {homeCopy.planCommonFactsJa.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
          <Link
            href={ctaCopy.viewSavedPlansHref}
            className={styles.ctaPaid}
            data-testid="m55-home-plan-comparison-cta"
          >
            {homeCopy.planComparisonCtaJa}
          </Link>
        </section>

        {/* §9 — Existing users */}
        <section
          className={`${styles.lowerSection} ${styles.existingUserBand}`}
          data-testid="m55-home-existing-user"
          aria-labelledby="m55-home-existing-user-title"
        >
          <h2 id="m55-home-existing-user-title" className={styles.existingUserTitle}>
            {homeCopy.existingUserHeadlineJa}
          </h2>
          <nav className={styles.existingUserLinks} aria-label="既存ユーザー向けリンク">
            <Link href="/dtr" className={styles.existingUserLink} data-testid="m55-home-existing-report">
              {homeCopy.existingUserReportLinkJa}
            </Link>
            <Link href="/my" className={styles.existingUserLink} data-testid="m55-home-existing-my">
              {homeCopy.existingUserMyLinkJa}
            </Link>
          </nav>
        </section>

        {/* §10 — Final CTA */}
        <section
          className={styles.lowerSection}
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
              className={styles.ctaPaid}
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
