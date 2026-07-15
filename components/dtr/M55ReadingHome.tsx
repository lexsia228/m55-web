'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useEffect, useMemo, useState } from 'react';
import { ProfileRepository } from '../../lib/soul/profile';
import {
  buildM55ExperienceCardModel,
  hasM55ContinueItem,
  type M55CommerceState,
  type M55ExperienceCardModel,
} from '../../lib/m55/m55ExperienceCardModel';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelAction,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import { M55ExperienceShell, M55StatusPill } from '../experience/M55ExperienceShell';
import { M55ProductCover } from '../experience/M55ProductCover';
import styles from './M55ReadingHome.module.css';

export type ReadingHomeCompatibilityReport = {
  id: string;
  createdAt: string;
  chapterCount: 6;
};

type Props = {
  personalOwned: boolean;
  personalReady: boolean;
  personalHref: string;
  compatibilityReports: readonly ReadingHomeCompatibilityReport[];
  compatibilityAuthorityAvailable: boolean;
  compatibilityCommerce: M55CommerceState;
  additionalReadingAvailable: boolean;
};

function IntentSurface({
  model,
  description,
  freeValue,
  paidValue,
  onPrimary,
}: {
  model: M55ExperienceCardModel;
  description: string;
  freeValue: string;
  paidValue: readonly string[];
  onPrimary: () => void;
}) {
  const personal = model.kind === 'personal';
  return (
    <article className={styles.intent}>
      <div className={styles.coverColumn}>
        <M55ProductCover kind={model.kind} depth={model.showPaidDepth ? 'paid' : 'free'} />
      </div>
      <div className={styles.intentCopy}>
        <div className={styles.intentHeading}>
          <div>
            <p className={styles.eyebrow}>{personal ? 'PERSONAL' : 'COMPATIBILITY'}</p>
            <h2>{personal ? '自分を読む' : '二人を読む'}</h2>
          </div>
          {model.showOwnership ? <M55StatusPill tone="owned">購入済み</M55StatusPill> : null}
          {!model.showOwnership && model.commerceState === 'paused' ? (
            <M55StatusPill tone="paused">保存版は準備中</M55StatusPill>
          ) : null}
        </div>
        <p className={styles.description}>{description}</p>
        <div className={styles.depth}>
          <div>
            <h3>無料で分かること</h3>
            <p>{freeValue}</p>
          </div>
          <div>
            <h3>保存版で深められること</h3>
            <ul>
              {paidValue.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
        <div className={styles.actions}>
          <Link className={styles.primary} href={model.primaryHref} onClick={onPrimary}>
            {model.primaryLabel}
          </Link>
          {model.showOwnership && personal ? (
            <Link
              className={styles.secondary}
              href="/dtr/lp"
              onClick={() =>
                trackFunnelAction(
                  M55_FUNNEL_EVENTS.purchaseDetailsOpen,
                  'reading_personal',
                )
              }
            >
              保存版について確認する
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function M55ReadingHome({
  personalOwned,
  personalReady,
  personalHref,
  compatibilityReports,
  compatibilityAuthorityAvailable,
  compatibilityCommerce,
  additionalReadingAvailable,
}: Props) {
  const { user, isLoaded } = useUser();
  const [hasPersonalFreeResult, setHasPersonalFreeResult] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    setHasPersonalFreeResult(ProfileRepository.get(user?.id)?.birthDate != null);
  }, [isLoaded, user?.id]);

  useEffect(() => {
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.readingHomeView,
      'reading_home',
      'm55-reading-home',
    );
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.paidDepthPreviewView,
      'reading_home',
      'm55-reading-paid-depth',
    );
  }, []);

  const models = useMemo(() => {
    const personal = buildM55ExperienceCardModel({
      kind: 'personal',
      identityState: user ? 'authenticated' : 'guest',
      journeyState: hasPersonalFreeResult ? 'free_complete' : 'unstarted',
      ownershipState: personalOwned ? 'owned' : 'not_owned',
      commerceState: 'available',
      usageState: additionalReadingAvailable ? 'available_balance' : 'no_balance',
      ownedHref: personalOwned && personalReady ? personalHref : null,
    });
    const latestCompatibility = compatibilityReports[0] ?? null;
    const compatibility = buildM55ExperienceCardModel({
      kind: 'compatibility',
      identityState: user ? 'authenticated' : 'guest',
      journeyState: latestCompatibility ? 'free_complete' : 'unstarted',
      ownershipState: latestCompatibility ? 'owned' : 'not_owned',
      commerceState: compatibilityAuthorityAvailable
        ? compatibilityCommerce
        : 'unavailable',
      usageState: 'no_balance',
      ownedHref: latestCompatibility ? `/synastry/report/${latestCompatibility.id}` : null,
    });
    return [personal, compatibility] as const;
  }, [
    compatibilityAuthorityAvailable,
    compatibilityCommerce,
    compatibilityReports,
    additionalReadingAvailable,
    hasPersonalFreeResult,
    personalHref,
    personalOwned,
    personalReady,
    user,
  ]);

  return (
    <M55ExperienceShell kind="reading" depth="neutral">
      <div className={styles.page}>
        <header className={styles.hero}>
          <p className={styles.heroEyebrow}>M55 READING HOME</p>
          <h1>M55の読み解き</h1>
          <p>自分の輪郭と、二人の関係。無料で確かめるところから、保存して読み返すところまでを一つにまとめました。</p>
        </header>

        {hasM55ContinueItem(models) ? (
          <section className={styles.continue} aria-labelledby="m55-continue-title">
            <div>
              <p className={styles.eyebrow}>CONTINUE</p>
              <h2 id="m55-continue-title">続きから</h2>
            </div>
            <div className={styles.continueLinks}>
              {models.filter((model) => model.canContinue).map((model) => (
                <Link
                  key={model.kind}
                  href={model.primaryHref}
                  onClick={() =>
                    trackFunnelAction(M55_FUNNEL_EVENTS.ownedReportOpen, 'reading_home')
                  }
                >
                  <span>{model.kind === 'personal' ? '自分の読み解き' : '二人の読み解き'}</span>
                  <strong>{model.primaryLabel}</strong>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <div className={styles.intentStack}>
          <IntentSurface
            model={models[0]}
            description="生年月日から、自分の強み、負荷がかかる場面、整え方の輪郭を読みます。"
            freeValue="いまの自分を捉えるための基本の見取り図"
            paidValue={[
              '日常の具体的な場面',
              '負荷が強まる前の流れ',
              'あとから読み返せる章立て',
            ]}
            onPrimary={() =>
              trackFunnelAction(
                models[0].showOwnership
                  ? M55_FUNNEL_EVENTS.ownedReportOpen
                  : models[0].primaryAction === 'view_paid_details'
                    ? M55_FUNNEL_EVENTS.purchaseDetailsOpen
                  : M55_FUNNEL_EVENTS.personalFreeStart,
                'reading_personal',
              )
            }
          />
          <IntentSurface
            model={models[1]}
            description="二人それぞれの違いと、いま起きやすいすれ違いを、点数にせず場面として読みます。"
            freeValue="二人の重なりと違い、いま続きやすい関係の流れ"
            paidValue={[
              'すれ違いが始まる場面',
              '距離が開く前に起きること',
              '戻るために使える言葉と小さな行動',
            ]}
            onPrimary={() =>
              trackFunnelAction(
                models[1].showOwnership
                  ? M55_FUNNEL_EVENTS.ownedReportOpen
                  : models[1].primaryAction === 'view_paid_details'
                    ? M55_FUNNEL_EVENTS.purchaseDetailsOpen
                  : M55_FUNNEL_EVENTS.compatibilityFreeStart,
                'reading_compatibility',
              )
            }
          />
        </div>

        {additionalReadingAvailable ? (
          <section className={styles.supplemental} aria-labelledby="m55-supplemental-title">
            <div>
              <p className={styles.eyebrow}>ADDITIONAL READING</p>
              <h2 id="m55-supplemental-title">保存版から、いま気になることを読む</h2>
              <p>購入済みの保存版を土台に、選んだテーマをもう一段具体的に読み解けます。</p>
            </div>
            <Link
              className={styles.primary}
              href="/reply"
              onClick={() =>
                trackFunnelAction(
                  M55_FUNNEL_EVENTS.additionalReadingStartClick,
                  'dtr_additional_reading',
                )
              }
            >
              追加読み解きを始める
            </Link>
          </section>
        ) : null}

        <footer className={styles.assist}>
          <Link href="/my">購入・登録情報を確認する</Link>
          <Link href="/support">困ったときのヘルプ</Link>
        </footer>
      </div>
    </M55ExperienceShell>
  );
}
