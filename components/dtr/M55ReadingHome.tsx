'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useEffect, useMemo, useState } from 'react';
import { ProfileRepository } from '../../lib/soul/profile';
import { COMPATIBILITY_GUEST_SESSION_KEY } from '../../lib/m55/compatibility/pairReadingGuestContract';
import {
  buildM55ExperienceCardModel,
  hasCompletePersonalFreeAnswers,
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
import LightToFullUpgradeCta from './LightToFullUpgradeCta';
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
  canUpgradeFromLight: boolean;
  upgradeReportInstanceId: string | null;
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
  secondaryAction?:
    | {
        kind: 'link';
        href: string;
        label: string;
        onClick?: () => void;
      }
    | {
        kind: 'upgrade';
        reportInstanceId: string;
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
            <p className={styles.eyebrow}>{personal ? '自分を知る解析' : '二人を知る解析'}</p>
            <h2>
              {personal
                ? '自分の強みと、いつものパターンを解析する'
                : '二人が合うところと、違いが表れやすい場面を解析する'}
            </h2>
          </div>
          {model.showOwnership ? <M55StatusPill tone="owned">購入済み</M55StatusPill> : null}
          {!model.showOwnership && model.commerceState === 'paused' ? (
            <M55StatusPill tone="paused">相性解析レポートは準備中</M55StatusPill>
          ) : null}
        </div>
        <p className={styles.description}>{description}</p>
        <div className={styles.depth}>
          <div>
            <h3>無料解析で分かること</h3>
            <p>{freeValue}</p>
          </div>
          <div>
            <h3>詳しいレポートで読めること</h3>
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
            secondaryAction.kind === 'upgrade' ? (
              <LightToFullUpgradeCta
                reportInstanceId={secondaryAction.reportInstanceId}
                variant="subtle"
              />
            ) : (
              <Link
                className={styles.secondary}
                href={secondaryAction.href}
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </Link>
            )
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
  canUpgradeFromLight,
  upgradeReportInstanceId,
}: Props) {
  const { user, isLoaded } = useUser();
  const [hasPersonalFreeResult, setHasPersonalFreeResult] = useState(false);
  const [hasCompatibilityFreeResult, setHasCompatibilityFreeResult] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    const hasProfile = ProfileRepository.get(user?.id)?.birthDate != null;
    let hasCompleteAnswers = false;
    try {
      hasCompleteAnswers = hasCompletePersonalFreeAnswers(
        sessionStorage.getItem('m55_free_answers_v1'),
      );
    } catch {
      hasCompleteAnswers = false;
    }
    setHasPersonalFreeResult(hasProfile && hasCompleteAnswers);
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
            <p className={styles.heroEyebrow}>無料解析と購入済みレポート</p>
            <h1>M55の解析</h1>
            <p>
              自分の強みや迷いやすさを知りたい時も。二人が合うところや、
              すれ違いやすいところを知りたい時も。無料解析を始めたり、
              購入した詳しいレポートを開いたりできます。
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
            description="生年月日と6つの質問から、自然に力を発揮しやすい場面、自分らしい考え方、迷いや疲れが始まりやすい場面を解析します。"
            freeValue="強み、考え方、人との距離、迷いやすい場面、今強く表れている傾向"
            paidValue={[
              '仕事や人との関わりに表れやすい特徴',
              '迷いや疲れにつながりやすい流れ',
              '今の自分に強く出ている傾向',
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
              canUpgradeFromLight && upgradeReportInstanceId
                ? {
                    kind: 'upgrade',
                    reportInstanceId: upgradeReportInstanceId,
                  }
                : models[0].primaryAction === 'open_owned'
                  ? {
                      kind: 'link',
                      href: '/dtr/lp',
                      label: '個人解析レポートについて確認する',
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
            description="二人の生年月日と6つの質問から、自然に合いやすいところ、互いを補いやすい違い、すれ違いが始まりやすい場面を解析します。"
            freeValue="合いやすいところ、魅力として感じやすい違い、会話や判断のテンポ"
            paidValue={[
              'すれ違いが始まりやすい場面',
              '距離や気持ちがずれやすい場面',
              '二人の特徴を6つの場面から詳しく読む',
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
                    kind: 'link',
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
