'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useCallback, useEffect, useState } from 'react';
import {
  DTR_PRODUCT_CATALOG,
  isCatalogSlotOwned,
  type DtrCatalogSlot,
} from '../../lib/m55/dtrProductCatalog';
import {
  LABEL_SAVED_REPORT_METADATA_JP,
  LABEL_SAVED_REPORT_MY_JP,
  LABEL_STATE_OWNED,
  MY_BADGE_NOT_PURCHASED,
  MY_BADGE_PREPARING,
} from '../../lib/m55/dtrProductLabels';

import styles from './DtrCatalogStrip.module.css';

type EntitlementsResponse = {
  tier?: string;
  retention_days?: number;
  dtr_rights?: string[];
};

type SnapshotReadyResponse = {
  ready: boolean;
  hasOwnership: boolean;
  hasPurchaseSnapshot: boolean;
};

export type DtrCatalogStripProps = {
  variant: 'my' | 'dtr';
  /** 親が既に entitlements / snapshot を読み込んでいる場合 true（/my） */
  externalData?: boolean;
  ent?: EntitlementsResponse | null;
  snap?: SnapshotReadyResponse | null;
  snapError?: boolean;
  /** /dtr ではヒーローカードと重複させない */
  hideEntryReportRow?: boolean;
};

export default function DtrCatalogStrip({
  variant,
  externalData,
  ent: entProp,
  snap: snapProp,
  snapError: snapErrorProp,
  hideEntryReportRow,
}: DtrCatalogStripProps) {
  const { user, isLoaded } = useUser();
  const [ent, setEnt] = useState<EntitlementsResponse | null>(null);
  const [snap, setSnap] = useState<SnapshotReadyResponse | null>(null);
  const [snapError, setSnapError] = useState(false);
  const [dataReady, setDataReady] = useState(!!externalData);

  const useParentData = externalData === true;

  const load = useCallback(async () => {
    try {
      const [entRes, snapRes] = await Promise.all([
        fetch('/api/me/entitlements', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/dtr/report-snapshot-ready', { credentials: 'include', cache: 'no-store' }),
      ]);
      if (!entRes.ok) {
        setEnt(null);
      } else {
        setEnt((await entRes.json()) as EntitlementsResponse);
      }
      if (!snapRes.ok) {
        setSnapError(true);
        setSnap(null);
      } else {
        setSnap((await snapRes.json()) as SnapshotReadyResponse);
        setSnapError(false);
      }
    } catch {
      setSnapError(true);
      setSnap(null);
    } finally {
      setDataReady(true);
    }
  }, []);

  useEffect(() => {
    if (useParentData) {
      setDataReady(true);
      return;
    }
    if (!user) {
      setEnt(null);
      setSnap(null);
      setSnapError(false);
      setDataReady(true);
      return;
    }
    setDataReady(false);
    void load();
  }, [user, load, useParentData]);

  if (!isLoaded) {
    return <p className={styles.loading}>読み込み中…</p>;
  }

  if (!dataReady && !useParentData) {
    return <p className={styles.loading}>読み込み中…</p>;
  }

  const effectiveEnt = useParentData ? entProp ?? null : ent;
  const effectiveSnap = useParentData ? snapProp ?? null : snap;
  const effectiveSnapError = useParentData ? snapErrorProp ?? false : snapError;

  const slots = hideEntryReportRow
    ? DTR_PRODUCT_CATALOG.filter((s) => s.id !== 'entry_report')
    : DTR_PRODUCT_CATALOG;

  const rowClass = variant === 'dtr' ? `${styles.row} ${styles.rowDtr}` : styles.row;
  const listAriaLabel = variant === 'my' ? 'サービス一覧' : 'プレミアムレポートとサービスのカタログ';

  return (
    <ul className={styles.list} role="list" aria-label={listAriaLabel}>
      {slots.map((slot) => (
        <CatalogRow
          key={slot.id}
          slot={slot}
          variant={variant}
          ent={effectiveEnt}
          snap={effectiveSnap}
          snapError={effectiveSnapError}
          rowClass={rowClass}
        />
      ))}
    </ul>
  );
}

function CatalogRow({
  slot,
  variant,
  ent,
  snap,
  snapError,
  rowClass,
}: {
  slot: DtrCatalogSlot;
  variant: 'my' | 'dtr';
  ent: EntitlementsResponse | null;
  snap: SnapshotReadyResponse | null;
  snapError: boolean;
  rowClass: string;
}) {
  const isMy = variant === 'my';

  if (slot.kind === 'coming_soon') {
    return (
      <li className={rowClass}>
        <div className={styles.rowTop}>
          <div>
            <div className={styles.title}>{slot.title}</div>
            <p className={styles.subtitle}>{slot.subtitle}</p>
          </div>
          <span className={`${styles.badge} ${styles.badgeSoon}`}>近日公開</span>
        </div>
        {!isMy && (
          <div className={styles.rowFooter}>
            <Link href={slot.learnMoreHref} className={styles.linkQuiet}>
              サポートへ
            </Link>
          </div>
        )}
      </li>
    );
  }

  /* live: Entry Report — /dtr keeps purchase/open CTAs; /my is badge-only (IA SSOT). */
  if (slot.kind === 'live' && slot.id === 'entry_report') {
    const owned = isCatalogSlotOwned(slot, ent, snap);
    const canOpen = !snapError && snap?.ready === true;
    const subtitle = isMy ? LABEL_SAVED_REPORT_METADATA_JP : slot.subtitle;
    const title = isMy ? LABEL_SAVED_REPORT_MY_JP : slot.title;

    if (isMy) {
      const badgeClass = owned && canOpen
        ? styles.badgeOwned
        : owned
        ? styles.badgePending
        : styles.badgeNotOwned;
      const badgeText = owned && canOpen
        ? LABEL_STATE_OWNED
        : owned
        ? MY_BADGE_PREPARING
        : MY_BADGE_NOT_PURCHASED;

      return (
        <li className={rowClass}>
          <div className={styles.rowTop}>
            <div>
              <div className={styles.title}>{title}</div>
              <p className={styles.subtitle}>{subtitle}</p>
            </div>
            <span className={`${styles.badge} ${badgeClass}`}>{badgeText}</span>
          </div>
        </li>
      );
    }

    if (owned && canOpen) {
      return (
        <li className={rowClass}>
          <div className={styles.rowTop}>
            <div>
              <div className={styles.title}>{title}</div>
              <p className={styles.subtitle}>{subtitle}</p>
            </div>
            <span className={`${styles.badge} ${styles.badgeOwned}`}>所有済み</span>
          </div>
          <div className={styles.rowFooter}>
            <Link href="/dtr/core" className={styles.ctaOpen}>
              開く
            </Link>
          </div>
        </li>
      );
    }

    if (owned && !canOpen) {
      return (
        <li className={rowClass}>
          <div className={styles.rowTop}>
            <div>
              <div className={styles.title}>{title}</div>
              <p className={styles.subtitle}>{subtitle}</p>
            </div>
            <span className={`${styles.badge} ${styles.badgePending}`}>準備中</span>
          </div>
          <div className={styles.rowFooter}>
            <span className={styles.muted}>本文の準備が完了すると開けます</span>
          </div>
        </li>
      );
    }

    return (
      <li className={rowClass}>
        <div className={styles.rowTop}>
          <div>
            <div className={styles.title}>{title}</div>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>
          <span className={`${styles.badge} ${styles.badgeNotOwned}`}>未購入</span>
        </div>
        <div className={styles.rowFooter}>
          <Link href="/dtr/lp" className={styles.ctaBuy}>
            購入する
          </Link>
        </div>
      </li>
    );
  }

  if (slot.kind === 'live') {
    const owned = isCatalogSlotOwned(slot, ent, snap);
    return (
      <li className={rowClass}>
        <div className={styles.rowTop}>
          <div>
            <div className={styles.title}>{slot.title}</div>
            <p className={styles.subtitle}>{slot.subtitle}</p>
          </div>
          <span className={`${styles.badge} ${owned ? styles.badgeOwned : styles.badgeSoon}`}>
            {owned ? '所有済み' : '準備中'}
          </span>
        </div>
        {!isMy && (
          <div className={styles.rowFooter}>
            <Link href={slot.learnMoreHref} className={styles.linkQuiet}>
              くわしく見る
            </Link>
          </div>
        )}
      </li>
    );
  }

  return null;
}
