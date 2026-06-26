'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  mapConsultReplyBodyForDisplay,
  normalizeConsultReplyParagraphs,
} from '../../lib/m55/consult/consultReplyDisplaySections';
import { normalizeConsultReplyDisplayText, normalizeConsultReplyTodayStepDisplayText } from '../../lib/m55/consult/normalizeConsultReplyDisplayText';
import {
  resolveConsultReplyLensByTheme,
  resolveConsultReplyNextUseSuggestions,
} from '../../lib/m55/consult/consultReplyThemePartMap';
import {
  PAID_DTR_CONSULT_ENTRY_NEUTRAL,
  PAID_DTR_CONSULT_ROOM_UI,
  formatConsultUsedCountLine,
} from '../../lib/m55/paidDtrProductCopy';
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
  /** When true (default), body/viz/CTA hidden until user expands. */
  compactInitially?: boolean;
  /** Expands the card when set (e.g. after a fresh send). */
  initialExpanded?: boolean;
  /** Shows latest-reply badge on compact header. */
  isLatest?: boolean;
  /** Stronger surface for the freshly opened latest reply. */
  highlightLatest?: boolean;
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
  compactInitially = true,
  initialExpanded = false,
  isLatest = false,
  highlightLatest = false,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(() => initialExpanded || !compactInitially);
  const collapsed = compactInitially && !isExpanded;

  useEffect(() => {
    if (initialExpanded) {
      setIsExpanded(true);
    }
  }, [initialExpanded]);

  const lens = resolveConsultReplyLensByTheme(theme);
  const nextUseSuggestions = resolveConsultReplyNextUseSuggestions(theme);
  const displayContent = normalizeConsultReplyDisplayText(assistantContent);
  const paragraphs = normalizeConsultReplyParagraphs(displayContent);
  const bodies = mapConsultReplyBodyForDisplay(paragraphs);
  const sections = [
    { label: '今の場面をいったん言葉にする', body: bodies.scene },
    { label: '保存版から見ると', body: bodies.report },
    { label: '少しほどく見方', body: bodies.alt },
  ].filter((s) => s.body);

  const todayStepRaw = bodies.today.trim() || null;
  const todayStep = todayStepRaw
    ? normalizeConsultReplyTodayStepDisplayText(todayStepRaw) || null
    : null;
  const auxBody = bodies.aux.trim();
  const usageCompact = formatConsultUsedCountLine(usedCount);
  const usageRemaining = PAID_DTR_CONSULT_ENTRY_NEUTRAL.walletRemainingTemplateJa.replace(
    '{count}',
    String(remainingCount)
  );
  const usageFull = `${usageCompact} · ${usageRemaining}`;

  const quotePreview = userQuote ? trimLines(userQuote, 2) : null;
  const quoteDisplay = collapsed && quotePreview ? quotePreview : userQuote;

  const cardClassName = [
    styles.replyCard,
    collapsed ? styles.replyCardCompact : '',
    highlightLatest && !collapsed ? styles.replyCardLatest : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={cardClassName} aria-label="相談返書">
      <header className={collapsed ? `${styles.replyCardHeader} ${styles.replyCardHeaderCompact}` : styles.replyCardHeader}>
        {isLatest ? (
          <p className={styles.replyLatestBadge}>{PAID_DTR_CONSULT_ROOM_UI.latestReplyBadgeJa}</p>
        ) : null}
        <div className={styles.replyTagRow}>
          <span className={styles.replyTag}>保存版をもとにした返書</span>
        </div>
        {!collapsed ? (
          <h3 className={styles.replyCardTitle}>{theme ?? '相談返書'}</h3>
        ) : null}
        {collapsed ? (
          <p className={styles.replyCompactMetaRow}>
            <span>この相談で見ているところ</span>
            <span className={styles.replyCompactMetaSep} aria-hidden>
              ·
            </span>
            <span>{usageCompact}</span>
          </p>
        ) : (
          <p className={styles.replyMeta}>この相談で見ているところ</p>
        )}
        {theme && collapsed ? <p className={styles.replyListTheme}>{theme}</p> : null}
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
                <p className={styles.replySectionTitle}>見直すときの目印</p>
                <p className={styles.replySectionBody}>{auxBody}</p>
              </div>
            ) : null}
          </section>

          {todayStep ? (
            <section className={styles.replyTodayBox} aria-label="今日の一手">
              <p className={styles.replyTodayTitle}>今日の一手</p>
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

          {remainingCount > 0 ? (
            <section className={styles.replyNextUse} aria-label="次に相談するなら">
              <p className={styles.replyNextUseTitle}>次に相談するなら</p>
              <p className={styles.replyNextUseBridge}>
                この返書の続きとして、残り{remainingCount}件ではこんなテーマを見られます。
              </p>
              <ul className={styles.replyNextUseList}>
                {nextUseSuggestions.map((suggestion) => (
                  <li key={suggestion} className={styles.replyNextUseItem}>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <footer className={styles.replyFooter}>
            <Link href={`#${lens.anchor}`} className={styles.replyPrimaryLink}>
              保存版を読み返す
            </Link>
            <p className={styles.replyFooterMeta}>
              {PAID_DTR_CONSULT_ENTRY_NEUTRAL.walletRemainingTemplateJa.replace(
                '{count}',
                String(remainingCount)
              )}
            </p>
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
