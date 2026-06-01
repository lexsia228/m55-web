'use client';

import Link from 'next/link';
import { resolveConsultReplyLensByTheme } from '../../lib/m55/consult/consultReplyThemePartMap';
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
};

function trimLines(input: string, maxLines: number): string {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, maxLines)
    .join('\n');
}

function normalizeParagraphs(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n+/g, ' ').trim())
    .filter(Boolean);
}

function pickTodayStep(paragraphs: string[]): string | null {
  const last = paragraphs[paragraphs.length - 1]?.trim() ?? '';
  if (!last) return null;
  if (last.length > 120) return null;
  if (/(別れ|辞め|やめ|投資|医療|法律|転職)/.test(last)) return null;
  if (/(分け|書く|整え|休む|戻す|決める前)/.test(last)) return last;
  return null;
}

export default function ConsultReplyCard({
  assistantContent,
  theme,
  userQuote,
  stemIdx,
  usedCount,
  remainingCount,
  canPurchaseMoreCount,
}: Props) {
  const lens = resolveConsultReplyLensByTheme(theme);
  const paragraphs = normalizeParagraphs(assistantContent);
  const sections = [
    { label: '今の場面の整理', body: paragraphs[0] ?? '' },
    { label: '保存版から見ると', body: paragraphs[1] ?? '' },
    { label: '少しほどく見方', body: paragraphs[2] ?? paragraphs[1] ?? '' },
  ].filter((s) => s.body);

  const todayStep = pickTodayStep(paragraphs);
  const bodyTail = paragraphs.slice(sections.length).join('\n\n');
  const usageContext = `使用 ${usedCount} / 5件 · 残り ${remainingCount}件`;

  return (
    <article className={styles.replyCard} aria-label="今回の相談返書">
      <header className={styles.replyCardHeader}>
        <div className={styles.replyTagRow}>
          <span className={styles.replyTag}>相談返書</span>
          <span className={styles.replyTag}>保存版連動</span>
        </div>
        <p className={styles.replyCardLead}>保存版に紐づく相談</p>
        <h3 className={styles.replyCardTitle}>今回の相談返書</h3>
        <p className={styles.replyMeta}>関連章 {lens.roman} {lens.name}</p>
        {theme ? <p className={styles.replyMeta}>テーマ {theme}</p> : null}
        <p className={styles.replyUsage}>{usageContext}</p>
      </header>

      {userQuote ? (
        <section className={styles.replyUserQuote} aria-label="相談内容の引用">
          <p className={styles.replySectionTitle}>今回の相談</p>
          <p className={styles.replyQuoteText}>{trimLines(userQuote, 2)}</p>
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

      <section className={styles.replyReadingBlock} aria-label="読み取りコメント">
        {sections.map((section) => (
          <div key={section.label} className={styles.replyReadingSection}>
            <p className={styles.replySectionTitle}>{section.label}</p>
            <p className={styles.replySectionBody}>{section.body}</p>
          </div>
        ))}
        {bodyTail ? (
          <div className={styles.replyReadingSection}>
            <p className={styles.replySectionTitle}>補足</p>
            <p className={styles.replySectionBody}>{bodyTail}</p>
          </div>
        ) : null}
      </section>

      {todayStep ? (
        <section className={styles.replyTodayBox} aria-label="今日の一手">
          <div className={styles.replyTodayHead}>
            <p className={styles.replyTodayTitle}>今日の一手</p>
            <p className={styles.replyTodayMeta}>1行 · 3分 · 1つ</p>
          </div>
          <p className={styles.replyTodayText}>{todayStep}</p>
        </section>
      ) : null}

      <footer className={styles.replyFooter}>
        <Link href={`#${lens.anchor}`} className={styles.replyPrimaryLink}>
          保存版を読み返す
        </Link>
        <p className={styles.replySecondaryAction}>追加返書を使う</p>
        <p className={styles.replyFooterMeta}>残り {remainingCount}件 / 合計5件まで</p>
        <p className={styles.replyFooterMeta}>追加相談返書 1件 500円</p>
        <p className={styles.replyFooterMeta}>追加で使える件数 {canPurchaseMoreCount}件</p>
      </footer>
    </article>
  );
}
