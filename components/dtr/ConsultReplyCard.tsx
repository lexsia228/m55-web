'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  mapConsultReplyBodyForDisplay,
  normalizeConsultReplyParagraphs,
} from '../../lib/m55/consult/consultReplyDisplaySections';
import { resolveConsultReplyLensByTheme } from '../../lib/m55/consult/consultReplyThemePartMap';
import { PAID_DTR_CONSULT_ROOM_UI } from '../../lib/m55/paidDtrProductCopy';
import ConsultReplyStructureMiniViz from './ConsultReplyStructureMiniViz';
import ConsultReplyThemeLens from './ConsultReplyThemeLens';
import styles from './ConsultRoom.module.css';

type Props = {
  assistantContent: string;
  theme: string | null;
  userQuote: string | null;
  stemIdx: number;
  usedCount: number;
  remainingCount: number;
  canPurchaseMoreCount: number;
  /** When true (default), body/viz/CTA hidden until user expands. */
  compactInitially?: boolean;
  /** Shows latest-reply badge on compact header. */
  isLatest?: boolean;
};

function trimLines(input: string, maxLines: number): string {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, maxLines)
    .join('\n');
}

export default function ConsultReplyCard({
  assistantContent,
  theme,
  userQuote,
  stemIdx,
  usedCount,
  remainingCount,
  canPurchaseMoreCount,
  compactInitially = true,
  isLatest = false,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(() => !compactInitially);
  const collapsed = compactInitially && !isExpanded;

  const lens = resolveConsultReplyLensByTheme(theme);
  const paragraphs = normalizeConsultReplyParagraphs(assistantContent);
  const bodies = mapConsultReplyBodyForDisplay(paragraphs);
  const sections = [
    { label: '今の場面の整理', body: bodies.scene },
    { label: '保存版から見ると', body: bodies.report },
    { label: '少しほどく見方', body: bodies.alt },
  ].filter((s) => s.body);

  const todayStep = bodies.today.trim() || null;
  const auxBody = bodies.aux.trim();
  const usageCompact = `使用 ${usedCount} / 5件`;
  const usageFull = `${usageCompact} · 残り ${remainingCount}件`;

  const quotePreview = userQuote ? trimLines(userQuote, 2) : null;
  const quoteDisplay = collapsed && quotePreview ? quotePreview : userQuote;

  return (
    <article
      className={collapsed ? `${styles.replyCard} ${styles.replyCardCompact}` : styles.replyCard}
      aria-label="相談返書"
    >
      <header className={collapsed ? `${styles.replyCardHeader} ${styles.replyCardHeaderCompact}` : styles.replyCardHeader}>
        {isLatest && collapsed ? (
          <p className={styles.replyLatestBadge}>{PAID_DTR_CONSULT_ROOM_UI.latestReplyBadgeJa}</p>
        ) : null}
        <div className={styles.replyTagRow}>
          <span className={styles.replyTag}>相談返書</span>
          <span className={styles.replyTag}>保存版に紐づく返書</span>
        </div>
        {!collapsed ? (
          <>
            <p className={styles.replyCardLead}>保存版に紐づく相談</p>
            <h3 className={styles.replyCardTitle}>相談返書</h3>
          </>
        ) : null}
        {collapsed ? (
          <p className={styles.replyCompactMetaRow}>
            <span>関連章 {lens.roman} {lens.name}</span>
            <span className={styles.replyCompactMetaSep} aria-hidden>
              ·
            </span>
            <span>{usageCompact}</span>
          </p>
        ) : (
          <p className={styles.replyMeta}>関連章 {lens.roman} {lens.name}</p>
        )}
        {theme ? (
          collapsed ? (
            <p className={styles.replyListTheme}>{theme}</p>
          ) : (
            <p className={styles.replyMeta}>テーマ {theme}</p>
          )
        ) : null}
        {!collapsed ? <p className={styles.replyUsage}>{usageFull}</p> : null}
      </header>

      {userQuote ? (
        <section
          className={collapsed ? `${styles.replyUserQuote} ${styles.replyUserQuoteCompact}` : styles.replyUserQuote}
          aria-label="相談内容"
        >
          <p className={collapsed ? styles.replyQuoteLabel : styles.replySectionTitle}>相談内容</p>
          <p
            className={
              collapsed ? `${styles.replyQuoteText} ${styles.replyQuoteClamp}` : styles.replyQuoteText
            }
          >
            {quoteDisplay}
          </p>
        </section>
      ) : null}

      {collapsed ? (
        <div className={styles.replyCardCompactFooter}>
          <button
            type="button"
            className={styles.replyExpandBtnCompact}
            onClick={() => setIsExpanded(true)}
            aria-expanded={false}
          >
            {PAID_DTR_CONSULT_ROOM_UI.openToReadJa}
          </button>
        </div>
      ) : null}

      {!collapsed ? (
        <>
          <section className={styles.replyReadingBlock} aria-label="読み取りコメント">
            {sections.map((section) => (
              <div key={section.label} className={styles.replyReadingSection}>
                <p className={styles.replySectionTitle}>{section.label}</p>
                <p className={styles.replySectionBody}>{section.body}</p>
              </div>
            ))}
            {auxBody ? (
              <div className={styles.replyReadingSection}>
                <p className={styles.replySectionTitle}>視点の補助線</p>
                <p className={styles.replySectionBody}>{auxBody}</p>
              </div>
            ) : null}
          </section>

          {todayStep ? (
            <section className={styles.replyTodayBox} aria-label="今日の一手">
              <div className={styles.replyTodayHead}>
                <p className={styles.replyTodayTitle}>今日の一手</p>
                <p className={styles.replyTodayMeta}>1〜3 · 相談に紐づく小さな一手</p>
              </div>
              <p className={styles.replyTodayText}>{todayStep}</p>
            </section>
          ) : null}

          {lens.showBaseRadar ? (
            <ConsultReplyStructureMiniViz
              stemIdx={stemIdx}
              variant="fallback"
              title={lens.baseRadarTitle}
              caption={lens.baseRadarCaption}
            />
          ) : (
            <ConsultReplyThemeLens lens={lens} />
          )}

          <footer className={styles.replyFooter}>
            <Link href={`#${lens.anchor}`} className={styles.replyPrimaryLink}>
              保存版を読み返す
            </Link>
            <p className={styles.replySecondaryAction}>追加返書を使う</p>
            <p className={styles.replyFooterMeta}>残り {remainingCount}件 / 合計5件まで</p>
            <p className={styles.replyFooterMeta}>追加相談返書 1件 500円</p>
            <p className={styles.replyFooterMeta}>追加で使える件数 {canPurchaseMoreCount}件</p>
          </footer>

          {compactInitially ? (
            <button
              type="button"
              className={`${styles.replyExpandBtn} ${styles.replyExpandBtnSecondary}`}
              onClick={() => setIsExpanded(false)}
              aria-expanded
            >
              {PAID_DTR_CONSULT_ROOM_UI.closeReadJa}
            </button>
          ) : null}
        </>
      ) : null}
    </article>
  );
}
