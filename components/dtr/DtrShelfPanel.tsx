'use client';

import Link from 'next/link';
import { SignedIn, SignedOut, useUser } from '@clerk/nextjs';
import { useMemo } from 'react';
import { ProfileRepository } from '../../lib/soul/profile';
import {
  LABEL_FORMAT_SAVED,
  LABEL_PRODUCT_JP,
  LABEL_SAVED_REPORT_METADATA_JP,
  LABEL_STATE_OWNED,
  MY_SAVED_REPORT_CTA_OPEN_LABEL,
  MY_SAVED_REPORT_CTA_PLAN_LABEL,
  SHELF_HINT_OWNED_PENDING,
  SHELF_HINT_OWNED_READY,
  SHELF_OVERLINE,
} from '../../lib/m55/dtrProductLabels';
import { PAID_DTR_SHELF_CONSULT_META } from '../../lib/m55/paidDtrProductCopy';
import type { DtrShelfStemDisplay } from '../../lib/m55/dtrShelfStemDisplay';
import { STEM_LANE_TEN_VIEWS_IMAGE } from '../../lib/m55/publicStemDisplay';
import { TEN_STEM_DISPLAY, type TenStemDisplay } from '../../lib/m55/tenStemCatalog';
import DtrCatalogStrip from './DtrCatalogStrip';
import LightToFullUpgradeCta from './LightToFullUpgradeCta';
import styles from './DtrShelfPanel.module.css';

/**
 * Ten-views image mapping by stem index (shared SSOT: publicStemDisplay).
 */
const DTR_TYPE_IMAGE = STEM_LANE_TEN_VIEWS_IMAGE;

type OwnershipState = 'owned' | 'locked' | 'expired' | 'anonymous';

/** Profile-derived card personalization. generic = no concrete v2 stem (incomplete or loading). */
type CardProfile =
  | { kind: 'ready'; stemIdx: number; stem: TenStemDisplay; nickname: string }
  | { kind: 'generic'; nickname?: string };

export type ShelfCtaProps = {
  href: string;
  label: string;
  ariaLabel: string;
};

type Props = {
  ownershipState: OwnershipState;
  /** `dtr_report_snapshots` に本文があるときのみ true（`/dtr/core` へ誘導してよい） */
  snapshotReady: boolean;
  /** Server-resolved CTA（owned + !ready は LP 購入導線へ送らない） */
  shelfCta?: ShelfCtaProps;
  /** Owned + snapshot: server stem from profile_snapshot (must not use client ProfileRepository). */
  ownedShelfDisplay?: DtrShelfStemDisplay | null;
  /** Pre-purchase locked: server v2 composite preview (must not use client pipeline). */
  lockedShelfDisplay?: DtrShelfStemDisplay | null;
  canUpgradeFromLight?: boolean;
  upgradeReportInstanceId?: string | null;
};

function EntryReportCard({
  ownershipState,
  cardProfile,
  snapshotReady,
  shelfCta,
}: {
  ownershipState: OwnershipState;
  cardProfile: CardProfile;
  snapshotReady: boolean;
  shelfCta?: ShelfCtaProps;
}) {
  const isOwned = ownershipState === 'owned';
  const isExpired = ownershipState === 'expired';

  const ctaHref =
    shelfCta?.href ??
    (isOwned && snapshotReady
      ? '/dtr/core'
      : isExpired
      ? '/dtr/lp?state=expired'
      : '/dtr/lp');

  const hasProfile = cardProfile.kind === 'ready';
  const stem = hasProfile ? cardProfile.stem : null;
  const stemIdx = hasProfile ? cardProfile.stemIdx : -1;
  const nickname =
    cardProfile.kind === 'ready'
      ? cardProfile.nickname
      : cardProfile.kind === 'generic'
      ? cardProfile.nickname
      : undefined;

  const typeImage = stemIdx >= 0 ? (DTR_TYPE_IMAGE[stemIdx] ?? null) : null;

  const cardTitle = (() => {
    const nick = nickname?.trim();
    if (nick) return `${nick}さんの取り扱い説明書`;
    if (cardProfile.kind === 'generic' && !isOwned) {
      return LABEL_SAVED_REPORT_METADATA_JP;
    }
    return LABEL_PRODUCT_JP;
  })();

  const ctaLabel =
    shelfCta?.label ??
    (isOwned && snapshotReady
      ? MY_SAVED_REPORT_CTA_OPEN_LABEL
      : isOwned
      ? '保存版の準備中'
      : isExpired
      ? 'サポートに相談する'
      : MY_SAVED_REPORT_CTA_PLAN_LABEL);

  const ariaLabel = shelfCta?.ariaLabel ?? `${LABEL_PRODUCT_JP} — 保存版`;

  return (
    <Link href={ctaHref} className={styles.reportCard} aria-label={ariaLabel}>

      <div className={styles.cardPoster}>
        {typeImage && (
          <img
            className={styles.cardPosterTypeImg}
            src={typeImage}
            alt=""
            decoding="async"
            aria-hidden
          />
        )}
        <div className={styles.cardPosterContent}>
          <div className={styles.cardBadgeRow}>
            <span className={styles.cardBrandWord}>M55</span>
            <span className={styles.cardProductPill}>
              {isOwned ? LABEL_PRODUCT_JP : LABEL_SAVED_REPORT_METADATA_JP}
            </span>
            {isOwned && (
              <span className={styles.cardSavedPill}>{LABEL_STATE_OWNED}</span>
            )}
            {isExpired && (
              <span className={styles.cardExpiredPill}>期限切れ</span>
            )}
          </div>

          <div className={styles.cardPosterBottom}>
            {hasProfile && stem && (
              <p className={styles.cardEyebrow}>
                資質&thinsp;/&thinsp;{stem.publicTitle}
              </p>
            )}
            <h2 className={styles.cardTitle}>{cardTitle}</h2>
            <p className={styles.cardOneLine}>
              {stem
                ? stem.displayOneLine
                : 'あなたの本質を、構造として読み解く'}
            </p>
          </div>
        </div>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.cardMeta}>
          {isOwned ? (
            <>
              <div className={styles.cardMetaItem}>
                <span className={styles.cardMetaLabel}>有効期限</span>
                <span className={styles.cardMetaValue}>無期限</span>
              </div>
              <div className={styles.cardMetaItem}>
                <span className={styles.cardMetaLabel}>{PAID_DTR_SHELF_CONSULT_META.labelJa}</span>
                <span className={styles.cardMetaValue}>{PAID_DTR_SHELF_CONSULT_META.valueJa}</span>
              </div>
              {stem && (
                <div className={styles.cardMetaItem}>
                  <span className={styles.cardMetaLabel}>資質</span>
                  <span className={styles.cardMetaValue}>{stem.publicTitle}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className={styles.cardMetaItem}>
                <span className={styles.cardMetaLabel}>保存</span>
                <span className={styles.cardMetaValue}>永続</span>
              </div>
              <div className={styles.cardMetaItem}>
                <span className={styles.cardMetaLabel}>{PAID_DTR_SHELF_CONSULT_META.labelJa}</span>
                <span className={styles.cardMetaValue}>{PAID_DTR_SHELF_CONSULT_META.valueJa}</span>
              </div>
              <div className={styles.cardMetaItem}>
                <span className={styles.cardMetaLabel}>買い切り</span>
                <span className={styles.cardMetaValue}>1,000円</span>
              </div>
            </>
          )}
        </div>

        <div className={styles.cardCta}>
          <span className={styles.cardCtaText}>{ctaLabel}</span>
          <span className={styles.cardCtaArrow} aria-hidden>→</span>
        </div>
      </div>
    </Link>
  );
}

function ShelfContextHint({
  ownershipState,
  snapshotReady,
}: {
  ownershipState: OwnershipState;
  snapshotReady: boolean;
}) {
  return (
    <div className={styles.shelfHintBlock}>
      <SignedOut>
        <p className={styles.shelfHint}>
          ログインすると購入状況に応じて表示が変わります。
          <Link href="/dtr/lp" className={styles.shelfHintLink}> 内容・価格は商品ページ</Link>
        </p>
      </SignedOut>
      <SignedIn>
        {ownershipState === 'locked' && (
          <p className={styles.shelfHint}>
            未購入の方は、商品ページで価格と内容を確認してからお進みください。
          </p>
        )}
        {ownershipState === 'owned' && snapshotReady && (
          <p className={styles.shelfHint}>{SHELF_HINT_OWNED_READY}</p>
        )}
        {ownershipState === 'owned' && !snapshotReady && (
          <p className={styles.shelfHint}>{SHELF_HINT_OWNED_PENDING}</p>
        )}
        {ownershipState === 'expired' && (
          <p className={styles.shelfHint}>有効期限のご確認は商品ページまたはサポートへ。</p>
        )}
      </SignedIn>
    </div>
  );
}

function shelfDisplayToCardProfile(display: DtrShelfStemDisplay): CardProfile {
  const stem = TEN_STEM_DISPLAY[display.stemLaneIndex];
  if (!stem) {
    const fallbackNick = display.nickname?.trim();
    return fallbackNick ? { kind: 'generic', nickname: fallbackNick } : { kind: 'generic' };
  }
  return {
    kind: 'ready',
    stemIdx: display.stemLaneIndex,
    stem,
    nickname: display.nickname,
  };
}

export default function DtrShelfPanel({
  ownershipState,
  snapshotReady,
  shelfCta,
  ownedShelfDisplay = null,
  lockedShelfDisplay = null,
  canUpgradeFromLight = false,
  upgradeReportInstanceId = null,
}: Props) {
  const { user, isLoaded } = useUser();
  const ownerId = user?.id ?? null;

  const cardProfile = useMemo((): CardProfile => {
    if (ownershipState === 'owned') {
      if (!ownedShelfDisplay) return { kind: 'generic' };
      return shelfDisplayToCardProfile(ownedShelfDisplay);
    }

    if (lockedShelfDisplay) {
      return shelfDisplayToCardProfile(lockedShelfDisplay);
    }

    if (!isLoaded) return { kind: 'generic' };
    const profile = ProfileRepository.get(ownerId);
    const fallbackNick = profile?.nickname?.trim();
    return fallbackNick ? { kind: 'generic', nickname: fallbackNick } : { kind: 'generic' };
  }, [ownershipState, ownedShelfDisplay, lockedShelfDisplay, isLoaded, ownerId]);

  return (
    <div className={styles.shelfPage}>

      <div className={styles.shelfIntro}>
        <span className={styles.shelfOverline}>{SHELF_OVERLINE}</span>
        <h1 className={styles.shelfTitle}>{LABEL_PRODUCT_JP}</h1>
        <p className={styles.shelfLead}>
          {LABEL_FORMAT_SAVED}の棚です。内容の詳細・価格・購入は
          <Link href="/dtr/lp" className={styles.shelfToLpInline}>商品ページ</Link>
          で確認できます。
        </p>
      </div>

      <ShelfContextHint ownershipState={ownershipState} snapshotReady={snapshotReady} />

      <p className={styles.shelfHeroLabel} id="dtr-main-shelf-label">
        メインの保存版
      </p>

      <div className={styles.productShelf} role="list" aria-labelledby="dtr-main-shelf-label">
        <div role="listitem">
          <EntryReportCard
            ownershipState={ownershipState}
            cardProfile={cardProfile}
            snapshotReady={snapshotReady}
            shelfCta={shelfCta}
          />
        </div>
        {ownershipState === 'owned' &&
          canUpgradeFromLight &&
          upgradeReportInstanceId && (
            <div role="listitem" className={styles.upgradeShelfItem}>
              <LightToFullUpgradeCta reportInstanceId={upgradeReportInstanceId} />
            </div>
          )}
      </div>

      <section className={styles.catalogBlock} aria-labelledby="dtr-catalog-heading">
        <h2 id="dtr-catalog-heading" className={styles.catalogBlockTitle}>
          追加予定のサービス
        </h2>
        <p className={styles.catalogBlockLead}>
          今後のラインナップです。近日公開はサポートからお知らせします。
        </p>
        <DtrCatalogStrip variant="dtr" hideEntryReportRow />
      </section>

    </div>
  );
}
