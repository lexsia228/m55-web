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
                    <p className={styles.posterHeroSupportInline} style={{ whiteSpace: 'pre-line' }}>{homeCopy.heroSubJa}</p>
                  </div>
                  <div className={styles.posterHeroBreathing} aria-hidden />
                  <div className={styles.posterHeroBottomStack}>
                    {isLoaded && view.kind === 'no_profile' && (
                      <button
                        type="button"
                        className={styles.posterHeroCta}
                        data-testid="m55-home-open-birth-intake"
                        aria-label={`${homeCopy.heroFunnelCtaJa}。${homeCopy.heroSupportJa}`}
                        onClick={() => setBirthIntakeOpen(true)}
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
                      >
                        {homeCopy.heroFunnelCtaJa} →
                      </Link>
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
        <section
          className={styles.homeSeenBridge}
          data-testid="m55-home-seen-things-bridge"
          aria-labelledby="m55-home-seen-things-bridge-title"
        >
          <div className={styles.homeSeenBridgeInner}>
            <p className={styles.homeSeenBridgeLabel}>{homeCopy.seenThingsBridgeLabelJa}</p>
            <h2 id="m55-home-seen-things-bridge-title" className={styles.homeSeenBridgeHeadline}>
              <span className={styles.homeSeenBridgeHeadlineLine}>{homeCopy.seenThingsBridgeHeadlineLine1Ja}</span>
              <span className={styles.homeSeenBridgeHeadlineLine}>{homeCopy.seenThingsBridgeHeadlineLine2Ja}</span>
            </h2>
            <ul className={styles.homeSeenBridgeList}>
              {homeCopy.seenThingsBridgeItemsJa.map((item) => (
                <li key={item} className={styles.homeSeenBridgeListItem}>
                  {item}
                </li>
              ))}
            </ul>
            <p className={styles.homeSeenBridgeClosing} style={{ whiteSpace: 'pre-line' }}>
              {homeCopy.seenThingsBridgeClosingJa}
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
            <Link href="/how-m55-works" className={styles.homeReadNextCard}>
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
            <Link href="/ten-views" className={styles.homeReadNextCard}>
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
            <div className={styles.homeMethodLayerStage}>
              <div className={styles.homeMethodLayerStack}>
                <ol className={styles.homeMethodLayerTextRows}>
                  {homeCopy.methodFlowNodesJa.map((node) => (
                    <li
                      key={node.layerId}
                      className={styles.homeMethodLayerTextRow}
                      data-layer={node.layerId}
                    >
                      <p className={styles.homeMethodLayerRowLead}>{node.leadJa}</p>
                      <p className={styles.homeMethodLayerRowTitle}>{node.titleJa}</p>
                      <p className={styles.homeMethodLayerRowDesc}>{node.descJa}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <p className={styles.homeMethodLayerClosing} style={{ whiteSpace: 'pre-line' }}>
              {homeCopy.methodFlowClosingJa}
            </p>
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

            <div className={styles.homePaidPlanUniquenessChips}>
              {homeCopy.paidPlanUniquenessChipsJa.map((chip) => (
                <span key={chip} className={styles.homePaidPlanUniquenessChip}>
                  {chip}
                </span>
              ))}
            </div>

            <div
              className={styles.homePaidPlanSavedPreview}
              data-testid="m55-home-saved-preview"
              aria-labelledby="m55-home-saved-preview-title"
            >
              <p id="m55-home-saved-preview-title" className={styles.homePaidPlanSavedPreviewLabel}>
                {homeCopy.paidPlanSavedPreviewLabelJa}
              </p>
              <p className={styles.homePaidPlanSavedPreviewNote}>{homeCopy.paidPlanSavedPreviewNoteJa}</p>
              <div className={styles.homePaidPlanSavedPreviewGrid}>
                {homeCopy.paidPlanSavedPreviewChaptersJa.map((chapter) => (
                  <article key={chapter.roman} className={styles.homePaidPlanSavedPreviewCard}>
                    <div className={styles.homePaidPlanSavedPreviewCardHeader}>
                      <span className={styles.homePaidPlanSavedPreviewRoman}>{chapter.roman}</span>
                      <span className={styles.homePaidPlanSavedPreviewCardTitle}>{chapter.titleJa}</span>
                    </div>
                    <p className={styles.homePaidPlanSavedPreviewTeaser}>{chapter.teaserJa}</p>
                  </article>
                ))}
              </div>
            </div>

            <h3 className={styles.homePaidPlanValueHeading} style={{ whiteSpace: 'pre-line' }}>
              {homeCopy.paidPlanValueHeadingJa}
            </h3>
            <p className={styles.homePaidPlanValueSubheading} style={{ whiteSpace: 'pre-line' }}>
              {homeCopy.paidPlanValueSubheadingJa}
            </p>

            <ul className={styles.homePaidPlanCards}>
              {homeCopy.paidPlanCardsJa.map((card) => (
                <li key={card.titleJa} className={styles.homePaidPlanCard}>
                  <p className={styles.homePaidPlanCardTitle}>{card.titleJa}</p>
                  <p className={styles.homePaidPlanCardDesc} style={{ whiteSpace: 'pre-line' }}>
                    {card.descJa}
                  </p>
                </li>
              ))}
            </ul>

            <div
              className={styles.homePaidPlanFunnel}
              data-testid="m55-home-bottom-funnel"
            >
              <h3 className={styles.homePaidPlanFunnelTitle}>{homeCopy.paidPlanFunnelTitleJa}</h3>
              <p className={styles.homePaidPlanFunnelBody} style={{ whiteSpace: 'pre-line' }}>
                {homeCopy.paidPlanFunnelBodyJa}
              </p>

              {isLoaded && view.kind === 'no_profile' && (
                <button
                  type="button"
                  className={styles.homePaidPlanFreeCta}
                  data-testid="m55-home-bottom-funnel-intake"
                  aria-label={`${homeCopy.paidPlanCtaJa}。${homeCopy.paidPlanFunnelBodyJa.replace(/\n/g, ' ')}`}
                  onClick={() => setBirthIntakeOpen(true)}
                >
                  {homeCopy.paidPlanCtaJa} →
                </button>
              )}
              {isLoaded && hasProfile && (
                <Link
                  href={ctaCopy.coreFreeHref}
                  className={styles.homePaidPlanFreeCta}
                  data-testid="m55-home-bottom-funnel-core"
                  aria-label={`${homeCopy.paidPlanCtaJa}。${homeCopy.paidPlanFunnelBodyJa.replace(/\n/g, ' ')}`}
                >
                  {homeCopy.paidPlanCtaJa} →
                </Link>
              )}

              <div className={styles.homePaidPlanSavedInfo}>
                <p className={styles.homePaidPlanSavedInfoHeading}>{homeCopy.paidPlanSavedInfoHeadingJa}</p>
                <p className={styles.homePaidPlanSavedInfoBody} style={{ whiteSpace: 'pre-line' }}>
                  {homeCopy.paidPlanSavedInfoBodyJa}
                </p>
                <p className={styles.homePaidPlanSavedInfoPrice} style={{ whiteSpace: 'pre-line' }}>
                  {homeCopy.paidPlanSavedInfoPriceJa}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <details className={styles.learnMoreDetails} data-testid="m55-home-learn-more">
        <summary className={styles.learnMoreSummary}>{learnMoreCopy.summaryJa}</summary>
        <nav className={styles.learnMoreLinks} aria-label="理解を深める">
          <Link href="/how-m55-works">{learnMoreCopy.homeHowLinkJa}</Link>
          <Link href="/ten-views">{learnMoreCopy.homeTenViewsLinkJa}</Link>
        </nav>
        <p className={styles.learnMoreLead} style={{ whiteSpace: 'pre-line' }}>
          {learnMoreCopy.homeIntroJa}
        </p>
        <p className={styles.ruleItem}>{learnMoreCopy.homeFreeNoteJa}</p>
        <p className={styles.ruleItem} style={{ whiteSpace: 'pre-line' }}>
          {learnMoreCopy.homePaidNoteJa}
        </p>
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
