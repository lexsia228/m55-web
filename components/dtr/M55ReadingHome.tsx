'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useEffect, useMemo, useState } from 'react';
import { ProfileRepository } from '../../lib/soul/profile';
import { COMPATIBILITY_GUEST_SESSION_KEY } from '../../lib/m55/compatibility/pairReadingGuestContract';
import {
  buildM55ExperienceCardModel,
  hasM55ContinueItem,
  type M55CommerceState,
  type M55ExperienceAuthority,
  type M55ExperienceCardModel,
  type M55OwnershipState,
} from '../../lib/m55/m55ExperienceCardModel';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelAction,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import { MY_CONSULT_CTA_HREF } from '../../lib/m55/dtrProductLabels';
import { M55ExperienceShell, M55StatusPill } from '../experience/M55ExperienceShell';
import { M55ProductCover } from '../experience/M55ProductCover';
import styles from './M55ReadingHome.module.css';

export type ReadingHomeCompatibilityReport = {
  id: string;
  createdAt: string;
  chapterCount: 6;
};

type Props = {
  personalOwnershipState: M55OwnershipState;
  personalAuthority: M55ExperienceAuthority | null;
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
  secondaryAction,
}: {
  model: M55ExperienceCardModel;
  description: string;
  freeValue: string;
  paidValue: readonly string[];
  onPrimary: () => void;
  secondaryAction?: {
    href: string;
    label: string;
    onClick?: () => void;
  };
}) {
  const personal = model.kind === 'personal';
  return (
    <article className={styles.intent} data-m55-intent={model.kind}>
      <div className={styles.coverColumn}>
        <M55ProductCover kind={model.kind} depth={model.showPaidDepth ? 'paid' : 'free'} />
      </div>
      <div className={styles.intentCopy}>
        <div className={styles.intentHeading}>
          <div>
            <p className={styles.eyebrow}>{personal ? '自分の読み解き' : '二人の読み解き'}</p>
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
          {secondaryAction ? (
            <Link
              className={styles.secondary}
              href={secondaryAction.href}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function M55ReadingHome({
  personalOwnershipState,
  personalAuthority,
  compatibilityReports,
  compatibilityAuthorityAvailable,
  compatibilityCommerce,
  additionalReadingAvailable,
}: Props) {
  const { user, isLoaded } = useUser();
  const [hasPersonalFreeResult, setHasPersonalFreeResult] = useState(false);
  const [hasCompatibilityFreeResult, setHasCompatibilityFreeResult] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    setHasPersonalFreeResult(ProfileRepository.get(user?.id)?.birthDate != null);
    try {
      setHasCompatibilityFreeResult(
        sessionStorage.getItem(COMPATIBILITY_GUEST_SESSION_KEY) != null,
      );
    } catch {
      setHasCompatibilityFreeResult(false);
    }
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

  useEffect(() => {
    if (!additionalReadingAvailable) return;
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.additionalReadingEntryView,
      'dtr_additional_reading',
      'm55-reading-additional-entry',
    );
  }, [additionalReadingAvailable]);

  const models = useMemo(() => {
    const personal = buildM55ExperienceCardModel({
      kind: 'personal',
      identityState: user ? 'authenticated' : 'guest',
      journeyState: hasPersonalFreeResult ? 'free_complete' : 'unstarted',
      ownershipState: personalOwnershipState,
      commerceState: 'available',
      usageState: additionalReadingAvailable ? 'available_balance' : 'no_balance',
      authority: personalAuthority,
    });
    const latestCompatibility = compatibilityReports[0] ?? null;
    const compatibility = buildM55ExperienceCardModel({
      kind: 'compatibility',
      identityState: user ? 'authenticated' : 'guest',
      journeyState:
        latestCompatibility || hasCompatibilityFreeResult ? 'free_complete' : 'unstarted',
      ownershipState: latestCompatibility ? 'owned' : 'not_owned',
      commerceState: compatibilityAuthorityAvailable
        ? compatibilityCommerce
        : 'unavailable',
      usageState: 'no_balance',
      authority: latestCompatibility
        ? {
            uxState: 'owned_snapshot_ready',
            action: 'open_owned',
            href: `/synastry/report/${latestCompatibility.id}`,
            label: 'レポートを開く',
          }
        : null,
    });
    return [personal, compatibility] as const;
  }, [
    compatibilityAuthorityAvailable,
    compatibilityCommerce,
    compatibilityReports,
    additionalReadingAvailable,
    hasCompatibilityFreeResult,
    hasPersonalFreeResult,
    personalAuthority,
    personalOwnershipState,
    user,
  ]);

  return (
    <M55ExperienceShell kind="reading" depth="neutral">
      <div className={styles.page}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.heroEyebrow}>読み解きホーム</p>
            <h1>M55の読み解き</h1>
            <p>
              生年月日の暦リズムと今の回答から、自分の輪郭や二人の反応の違いを整理します。
              無料で確かめるところから、保存して読み返すところまでを一つにまとめました。
            </p>
          </div>
          <div className={styles.brandBridge} aria-hidden="true">
            <svg viewBox="0 0 360 150" role="img">
              <path d="M16 94C80 48 122 122 184 79C246 36 284 91 344 55" />
              <path d="M16 112C76 75 125 139 187 99C249 59 293 108 344 78" />
              <circle cx="128" cy="72" r="10" />
              <circle cx="226" cy="80" r="10" />
              <circle cx="178" cy="96" r="5" />
            </svg>
          </div>
        </header>

        {hasM55ContinueItem(models) ? (
          <section className={styles.continue} aria-labelledby="m55-continue-title">
            <div>
              <p className={styles.eyebrow}>再開</p>
              <h2 id="m55-continue-title">続きから</h2>
            </div>
            <div className={styles.continueLinks}>
              {models.filter((model) => model.canContinue).map((model) => (
                <Link
                  key={model.kind}
                  href={model.primaryHref}
                  onClick={() => {
                    if (
                      model.primaryAction === 'open_owned' ||
                      model.primaryAction === 'recover_owned'
                    ) {
                      trackFunnelAction(M55_FUNNEL_EVENTS.ownedReportOpen, 'reading_home');
                    }
                  }}
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
            description="生年月日の暦リズムに、5つの質問と今の関心を重ねて、現在の強み、負荷がかかる場面、整え方の輪郭を読みます。"
            freeValue="暦の土台と今の回答から、5つの視点と最初の小さな行動まで"
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
            secondaryAction={
              models[0].primaryAction === 'open_owned'
                ? {
                    href: '/dtr/lp',
                    label: '保存版について確認する',
                    onClick: () =>
                      trackFunnelAction(
                        M55_FUNNEL_EVENTS.purchaseDetailsOpen,
                        'reading_personal',
                      ),
                  }
                : undefined
            }
          />
          <IntentSurface
            model={models[1]}
            description="二人分の生年月日と、入力者から観察できる今の距離・会話についての6つの回答を重ね、反応の違いを点数にせず場面として読みます。"
            freeValue="二人の重なりと違い、今続きやすい連鎖、最初に確かめる行動まで"
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
            secondaryAction={
              compatibilityReports.length > 1
                ? {
                    href: '/my#my-purchase-heading',
                    label: 'ほかの購入済みレポートを確認する',
                  }
                : undefined
            }
          />
        </div>

        {additionalReadingAvailable ? (
          <section className={styles.supplemental} aria-labelledby="m55-supplemental-title">
            <div>
              <p className={styles.eyebrow}>追加読み解き</p>
              <h2 id="m55-supplemental-title">保存版から、いま気になることを読む</h2>
              <p>購入済みの保存版を土台に、選んだテーマをもう一段具体的に読み解けます。</p>
            </div>
            <Link
              className={styles.primary}
              href={MY_CONSULT_CTA_HREF}
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
