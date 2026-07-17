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
                  <div className={styles.posterHeroOutcomeGrid} aria-label="無料で見られる結果">
                    <article
                      className={`${styles.posterHeroOutcomeCard} ${styles.posterHeroOutcomePersonal}`}
                      data-testid="m55-home-hero-personal-preview"
                    >
                      <span
                        className={`${styles.posterHeroOutcomeAccent} ${styles.posterHeroPersonalAccent}`}
                        aria-hidden
                      />
                      <div className={styles.posterHeroOutcomeContent}>
                        <p>{homeCopy.heroPersonalPreviewJa.labelJa}</p>
                        <ul>
                          {homeCopy.heroPersonalPreviewJa.outcomesJa.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </article>
                    <article
                      className={`${styles.posterHeroOutcomeCard} ${styles.posterHeroOutcomeCompatibility}`}
                      data-testid="m55-home-hero-compatibility-preview"
                    >
                      <span
                        className={`${styles.posterHeroOutcomeAccent} ${styles.posterHeroCompatibilityAccent}`}
                        aria-hidden
                      />
                      <div className={styles.posterHeroOutcomeContent}>
                        <p>{homeCopy.heroCompatibilityPreviewJa.labelJa}</p>
                        <ul>
                          {homeCopy.heroCompatibilityPreviewJa.outcomesJa.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </article>
                  </div>
                  <div className={styles.posterHeroBottomStack}>
                    <a
                      href="#m55-home-free-intents"
                      className={styles.posterHeroCta}
                      data-testid="m55-home-has-profile-hero"
                      data-m55-hero-intent-anchor="true"
                    >
                      {homeCopy.heroFunnelCtaJa}
                    </a>
                    <p className={styles.posterHeroMeta}>{homeCopy.heroMetaJa}</p>
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
        <section
          className={styles.homeReadNextSection}
          id="m55-home-free-intents"
          data-testid="m55-home-seen-things-bridge"
          data-m55-free-intents="true"
          aria-labelledby="m55-home-read-next-title"
        >
          <h2 id="m55-home-read-next-title" className={styles.homeReadNextSectionTitle}>
            {homeCopy.readNextSectionTitleJa}
          </h2>
          <div className={styles.homeReadNextGrid} data-testid="m55-home-understanding">
            <article className={`${styles.homeIntentCard} ${styles.homeIntentPersonal}`}>
              <div className={styles.homeIntentHeading}>
                <div>
                  <p className={styles.homeIntentLabel}>{homeCopy.personalFreeCardJa.labelJa}</p>
                  <h3 className={styles.homeIntentHeadline}>
                    {homeCopy.personalFreeCardJa.headlineJa}
                  </h3>
                </div>
              </div>
              <div className={styles.homeIntentResult}>
                <p>{homeCopy.personalFreeCardJa.resultHeadingJa}</p>
                <ul>
                  {homeCopy.personalFreeCardJa.resultItemsJa.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <p className={styles.homeIntentBodyText}>
                {homeCopy.personalFreeCardJa.bodyJa}
              </p>
              <div className={styles.homeIntentMeta}>
                {homeCopy.personalFreeCardJa.metaJa.map((item) => <span key={item}>{item}</span>)}
              </div>
              {isLoaded && hasProfile ? (
                <Link
                  href="/core"
                  className={styles.homeIntentAction}
                  onClick={() =>
                    trackFunnelAction(M55_FUNNEL_EVENTS.personalFreeStart, 'reading_personal')
                  }
                >
                  {homeCopy.personalFreeCardJa.ctaJa}
                </Link>
              ) : (
                <button
                  type="button"
                  className={styles.homeIntentAction}
                  data-testid="m55-home-open-birth-intake"
                  onClick={() => {
                    trackFunnelAction(M55_FUNNEL_EVENTS.personalFreeStart, 'reading_personal');
                    setBirthIntakeOpen(true);
                  }}
                >
                  {homeCopy.personalFreeCardJa.ctaJa}
                </button>
              )}
            </article>

            <article className={`${styles.homeIntentCard} ${styles.homeIntentCompatibility}`}>
              <div className={styles.homeIntentHeading}>
                <div>
                  <p className={styles.homeIntentLabel}>{homeCopy.compatibilityFreeCardJa.labelJa}</p>
                  <h3 className={styles.homeIntentHeadline}>
                    {homeCopy.compatibilityFreeCardJa.headlineJa}
                  </h3>
                </div>
              </div>
              <div className={styles.homeIntentResult}>
                <p>{homeCopy.compatibilityFreeCardJa.resultHeadingJa}</p>
                <ul>
                  {homeCopy.compatibilityFreeCardJa.resultItemsJa.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <p className={styles.homeIntentBodyText}>
                {homeCopy.compatibilityFreeCardJa.bodyJa}
              </p>
              <div className={styles.homeIntentMeta}>
                {homeCopy.compatibilityFreeCardJa.metaJa.map((item) => <span key={item}>{item}</span>)}
              </div>
              <Link
                href="/synastry"
                className={styles.homeIntentAction}
                onClick={() =>
                  trackFunnelAction(
                    M55_FUNNEL_EVENTS.compatibilityFreeStart,
                    'reading_compatibility',
                  )
                }
              >
                {homeCopy.compatibilityFreeCardJa.ctaJa}
              </Link>
            </article>
          </div>
        </section>

        <section
          className={styles.homeResultPreview}
          data-testid="m55-home-result-preview"
          aria-labelledby="m55-home-result-preview-title"
        >
          <div className={styles.homeResultPreviewHeading}>
            <p>{homeCopy.resultPreviewCaptionJa}</p>
            <h2 id="m55-home-result-preview-title">{homeCopy.resultPreviewHeadingJa}</h2>
          </div>
          <div className={styles.homeResultPreviewGrid}>
            <article
              className={styles.homeResultPreviewCard}
              data-testid="m55-home-demo-five-element"
            >
              <header>
                <span>{homeCopy.personalResultPreviewJa.labelJa}</span>
                <h3>{homeCopy.personalResultPreviewJa.titleJa}</h3>
              </header>
              <ul>
                {homeCopy.personalResultPreviewJa.itemsJa.map((item, index) => (
                  <li key={item}>
                    <span aria-hidden>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{item}</strong>
                  </li>
                ))}
              </ul>
            </article>
            <article
              className={styles.homeResultPreviewCard}
              data-testid="m55-home-demo-compatibility"
            >
              <header>
                <span>{homeCopy.compatibilityResultPreviewJa.labelJa}</span>
                <h3>{homeCopy.compatibilityResultPreviewJa.titleJa}</h3>
              </header>
              <ul>
                {homeCopy.compatibilityResultPreviewJa.itemsJa.map((item, index) => (
                  <li key={item}>
                    <span aria-hidden>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{item}</strong>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section
          className={styles.homeMethodLayer}
          data-testid="m55-home-five-axis-read"
          aria-labelledby="m55-home-method-layer-title"
        >
          <div className={styles.homeMethodLayerInner}>
            <p className={styles.homeMethodLayerLabel}>{homeCopy.methodFlowLabelJa}</p>
            <h2 id="m55-home-method-layer-title" className={styles.homeMethodLayerHeadline}>
              今の回答を重ねて見る理由
            </h2>
            <div className={styles.homeOutcomeExplanations}>
              {homeCopy.outcomeExplanationsJa.map((item) => (
                <article key={item.titleJa}>
                  <h3>{item.titleJa}</h3>
                  <p>{item.bodyJa}</p>
                </article>
              ))}
            </div>
            <nav className={styles.homeMethodLinks} aria-label="読み解きの方法を知る">
              <Link href="/how-m55-works">{homeCopy.methodPreviewLinkJa}</Link>
            </nav>
          </div>
        </section>

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
              <ol className={styles.homePaidPlanOutcomeList}>
                {homeCopy.paidPlanOutcomesJa.map((item) => (
                  <li key={item.titleJa}>
                    <strong>{item.titleJa}</strong>
                    <span>{item.bodyJa}</span>
                  </li>
                ))}
              </ol>
              <p className={styles.homePaidPlanSavedInfoBody}>{homeCopy.paidPlanSavedInfoBodyJa}</p>
              <p className={styles.homePaidPlanOwnershipNote}>{homeCopy.paidPlanChapterSupportJa}</p>
            </div>

            <div className={styles.homePaidPlanComparison} data-testid="m55-home-plan-comparison">
              <p className={styles.homePaidPlanValueSubheading} style={{ whiteSpace: 'pre-line' }}>
                {homeCopy.paidPlanValueSubheadingJa}
              </p>
              <div className={styles.homePaidPlanTierGrid}>
                {[homeCopy.paidPlanLightJa, homeCopy.paidPlanFullJa].map((plan) => (
                  <article key={plan.nameJa}>
                    <h3>{plan.nameJa}</h3>
                    <strong>{plan.priceJa}</strong>
                    <p>{plan.reportJa}</p>
                    <p>{plan.detailJa}</p>
                  </article>
                ))}
              </div>
              <article className={styles.homePaidPlanUpgrade}>
                <div>
                  <h3>{homeCopy.paidPlanUpgradeJa.nameJa}</h3>
                  <strong>{homeCopy.paidPlanUpgradeJa.priceJa}</strong>
                </div>
                <p>{homeCopy.paidPlanUpgradeJa.detailJa}</p>
              </article>
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

            <div className={styles.homePaidPlanCompatibility}>
              <p className={styles.homePaidPlanSavedInfoHeading}>
                {homeCopy.compatibilityPaidHeadingJa}
              </p>
              <p className={styles.homePaidPlanCompatibilityAuxiliary}>
                {homeCopy.compatibilityPaidAuxiliaryNameJa}
              </p>
              <h3>{homeCopy.compatibilityPaidHeadlineJa}</h3>
              <p style={{ whiteSpace: 'pre-line' }}>{homeCopy.compatibilityPaidBodyJa}</p>
              <ul className={styles.homePaidPlanCompatibilityOutcomes}>
                {homeCopy.compatibilityPaidOutcomesJa.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <p className={styles.homePaidPlanCompatibilityNote}>
                {compatibilityCommerceAvailable
                  ? homeCopy.compatibilitySavedAvailableJa
                  : homeCopy.compatibilitySavedPausedJa}
              </p>
              {!compatibilityCommerceAvailable ? (
                <Link className={styles.homePaidPlanCompatibilityFreeCta} href="/synastry">
                  二人の相性を無料で見てみる
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

        <section className={styles.homeTrust} aria-labelledby="m55-home-trust-title">
          <h2 id="m55-home-trust-title">{homeCopy.trustHeadingJa}</h2>
          <p>{homeCopy.trustBodyJa}</p>
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
