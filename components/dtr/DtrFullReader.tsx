'use client';

import { useUser } from '@clerk/nextjs';
import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { promoteGuestProfileToClerkUser } from '../../lib/soul/profile';
import { promoteGuestCoreSnapshotToClerkUser } from '../../lib/m55/coreResult/store';
import {
  type DtrEnvelope,
  type DtrSection,
  type StructureAxisJa,
  type StructureAxisRole,
  identityDesignVizForStem,
  compositionStructureVizForStem,
  essenceStabilityVizForStem,
} from '../../lib/m55/dtrEngine';
import {
  LABEL_FORMAT_SAVED,
  LABEL_PRODUCT_JP,
  LABEL_STATE_OWNED,
} from '../../lib/m55/dtrProductLabels';
import { STEM_LANE_TEN_VIEWS_IMAGE } from '../../lib/m55/publicStemDisplay';
import { TEN_STEM_DISPLAY, type TenStemDisplay } from '../../lib/m55/tenStemCatalog';
import {
  AXIS_DATA,
  AXIS_LABELS,
  AXIS_COLORS,
  AXIS_DESCS,
  INTERACTION_NOTE,
  axisVizSummaryDisplay,
  parseBlockItems,
  extractAfterLabel,
  firstSentence,
  dtrDisplayOrFallback,
  pickUniqueDisplaySentence,
  DTR_DISPLAY_FALLBACK_NEUTRAL,
  DTR_DISPLAY_FALLBACK_SOFT,
  DTR_DISPLAY_FALLBACK_CONSULT,
  DTR_DISPLAY_FALLBACK_UNWORDED,
  DTR_DISPLAY_FALLBACK_STRENGTH,
  DTR_DISPLAY_FALLBACK_LOAD,
  DTR_DISPLAY_FALLBACK_RECOVERY,
  DTR_DISPLAY_FALLBACK_TIMING,
} from '../../lib/m55/dtrPaidModules';
import {
  PAID_DTR_BENEFITS_HEADING,
  PAID_DTR_BENEFIT_BULLETS,
  PAID_DTR_CHAPTER1_PILOT_GUIDE,
  PAID_DTR_CHAPTER_BRIDGE_COPY,
  PAID_DTR_CHAPTER_BRIDGE_LIFE_SUPPLEMENT_JA,
  PAID_DTR_CHAPTER_OPENING_COPY,
  PAID_DTR_DEEP_READING_SECTION_TITLE_JA,
  PAID_DTR_DEEP_READING_TAKEAWAYS,
  PAID_DTR_CHAPTER_CONSULT_CTA_LABEL_JA,
  PAID_DTR_CHAPTER_CONSULT_TRUTH_NOTE_JA,
  PAID_DTR_CHAPTER_DRAWER_INTRO,
  PAID_DTR_CHAPTER_GRAPH_CAPTION_LEAD_JA,
  PAID_DTR_CHAPTER_GRAPH_CAPTIONS,
  PAID_DTR_CONSULT_ENTRY_LAYOUT,
  PAID_DTR_CONSULT_GROUNDING_COPY,
  PAID_DTR_INTRO_CONSULT_NOTE,
  formatConsultAvailableCountLine,
  formatConsultAvailableWithGrantedLine,
  formatConsultUsedCountLine,
  drawerSectionDisplayTitleJa,
  PAID_DTR_INTRO_PANEL_01,
  PAID_DTR_READER_HERO_READ_BACK_PREFIX_JA,
  PAID_DTR_REPORT_PARTS,
  type PaidDtrChapterGraphCaptionId,
  type PaidDtrReportPartId,
} from '../../lib/m55/paidDtrProductCopy';
import ConsultRoom from './ConsultRoom';
import type { ConsultRoomPreviewRoomData } from '../../lib/m55/fixtures/consultRoomPreviewFixture';
import type { ConsultWalletDisplaySnapshot } from '../../lib/m55/reply/consultWalletDisplaySnapshot';
import {
  hasValidConsultWalletDenominator,
  isConsultWalletDisplaySnapshotUsable,
} from '../../lib/m55/reply/consultWalletDisplaySnapshot';
import {
  PremiumDrawerHub,
  type DrawerHubOpenPanel,
  type DrawerHubPanelId,
} from './PremiumDrawerHub';
import type { DisplayedEnvelopeReadMode } from '../../lib/m55/compositeStem/resolveDisplayedDtrEnvelope';
import {
  SAVED_SNAPSHOT_NOTICE_LEGACY_MODE,
  SAVED_SNAPSHOT_NOTICE_PRIMARY,
  shouldShowLegacySnapshotNotice,
} from '../../lib/m55/dtrSavedReportCopy';
import styles from './DtrFullReader.module.css';

const M55_DTR_DRAWER_HUB_SELECTOR = '[data-m55-dtr-drawer-hub="true"]';

function m55DtrDrawerPanelSelector(panel: DrawerHubPanelId): string {
  return `[data-m55-dtr-drawer-panel="${panel}"]`;
}

function m55DtrScrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

/** PublicHeader bottom + gap; falls back to --m55-dtr-scroll-offset on .reportRoot. */
function m55DtrScrollOffsetPx(): number {
  const header = document.querySelector('header[aria-label="ナビゲーション"]');
  if (header instanceof HTMLElement) {
    return Math.ceil(header.getBoundingClientRect().bottom) + 12;
  }
  return 104;
}

function m55DtrScrollToElement(el: HTMLElement): void {
  const offset = m55DtrScrollOffsetPx();
  const y = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, y), behavior: m55DtrScrollBehavior() });
}

function m55DtrScrollToDrawerHub(): void {
  const hub = document.querySelector(M55_DTR_DRAWER_HUB_SELECTOR);
  if (hub instanceof HTMLElement) m55DtrScrollToElement(hub);
}

function m55DtrScrollToDrawerPanel(panel: DrawerHubPanelId): void {
  const el = document.querySelector(m55DtrDrawerPanelSelector(panel));
  if (el instanceof HTMLElement) m55DtrScrollToElement(el);
}

function runAfterDrawerPanelPaint(fn: () => void): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(fn);
  });
}

const DRAWER_HUB_SCROLL_FAB_THRESHOLD_PX = 400;

function DrawerHubScrollFab() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    document.body.dataset.m55DtrCoreReader = '1';
    const onScroll = () => {
      const y =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;
      setVisible(y > DRAWER_HUB_SCROLL_FAB_THRESHOLD_PX);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      delete document.body.dataset.m55DtrCoreReader;
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <button
      type="button"
      className={`${styles.readingGuideFab}${visible ? ` ${styles.readingGuideFabVisible}` : ''}`}
      onClick={() => m55DtrScrollToDrawerHub()}
      aria-label="保存版の入口へ戻る"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      <svg
        className={styles.readingGuideFabIcon}
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden
        focusable="false"
      >
        <path
          d="M10 14.5V5.5M6 9l4-4 4 4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/** Module 01: map engine level (0–3) to purchaser-facing role labels (no scores). */
function axisRoleFromLevel(level: number): { badge: string; badgeClass: string } {
  switch (level) {
    case 3:
      return { badge: '中心', badgeClass: styles.axisRolePrimary };
    case 2:
      return { badge: '支えになる力', badgeClass: styles.axisRoleSecondary };
    case 1:
      return { badge: '響き合う', badgeClass: styles.axisRoleSupport };
    default:
      return { badge: '控えめに支える', badgeClass: styles.axisRoleQuiet };
  }
}

function axisRoleInterpretLine(label: string, level: number): string {
  switch (level) {
    case 3:
      return `${label}が、この形の中心に立ちやすいです。`;
    case 2:
      return `${label}が全体を支え、バランスをまとめやすくなります。`;
    case 1:
      return `${label}が重なり合い、動きに厚みを足します。`;
    default:
      return `${label}は前に出すより、控えめに支える場面が多いです。`;
  }
}

/** Text after first 。 — for compact secondary lines in domain tiles. */
function afterFirstSentence(text: string): string {
  const t = text.trim();
  const i = t.indexOf('。');
  if (i === -1 || i >= t.length - 1) return '';
  const rest = t.slice(i + 1).trim();
  return rest ? firstSentence(rest) : '';
}

function pickSentenceWithKeyword(text: string, re: RegExp): string {
  for (const chunk of text.split('。')) {
    const s = chunk.trim();
    if (s && re.test(s)) return s + '。';
  }
  return '';
}

function stripDtrTokens(body: string): string {
  return body.replace(/\{\{[^}]+\}\}/g, '');
}

function domainSocialReceiveLoad(receiveWay: string): string {
  return (
    pickSentenceWithKeyword(receiveWay, /受け取りすぎ|深く受け取|疲れる/) ||
    afterFirstSentence(receiveWay) ||
    firstSentence(receiveWay)
  );
}

function domainSocialRecovery(convRhythm: string): string {
  const tail = afterFirstSentence(convRhythm);
  return tail ? firstSentence(tail) : firstSentence(convRhythm);
}

function domainCloseLoad(withdrawWay: string): string {
  return (
    pickSentenceWithKeyword(withdrawWay, /距離を置|説明を|疲れ/) ||
    afterFirstSentence(withdrawWay) ||
    firstSentence(withdrawWay)
  );
}

function domainJudgmentStrength(essenceBody: string): string {
  const stripped = stripDtrTokens(essenceBody);
  const blocks = stripped.split(/\n\n/).map((p) => p.trim()).filter(Boolean);
  const pick =
    blocks.find((p) => /集中し続け|集中できる|ひとつのこと/.test(p)) ?? blocks[0] ?? stripped;
  return firstSentence(pick);
}

function domainJudgmentLoad(essenceBody: string, workStuck: string): string {
  const stripped = stripDtrTokens(essenceBody);
  const stuck = stripDtrTokens(workStuck);
  return (
    pickSentenceWithKeyword(stripped, /自由が大きすぎ|口を出され|ほどけにくく/) ||
    pickSentenceWithKeyword(stripped, /集中|決め|迷い|負担|重く/) ||
    pickSentenceWithKeyword(stuck, /細切れ|区切り|切り替え|妥協|詰ま/) ||
    firstSentence(stuck)
  );
}

function domainJudgmentRecoveryCandidates(
  compositionBody: string | undefined,
  workHint: string,
): string[] {
  const comp = compositionBody ? stripDtrTokens(compositionBody) : '';
  const hint = stripDtrTokens(workHint);
  return [
    pickSentenceWithKeyword(comp, /ここまで|一度出す|決めておく|区切り/),
    pickSentenceWithKeyword(hint, /ための時間|区切り|ここまで|休み|静か|何もしない/),
  ];
}

function domainLifeRecoveryCandidates(workHint: string): string[] {
  const hint = stripDtrTokens(workHint);
  return [
    pickSentenceWithKeyword(hint, /何もしない|静か|深く向き合う|固定|区切り|ここまで/),
    pickSentenceWithKeyword(hint, /ための時間|休み/),
  ];
}

function domainRecoveryLoad(workStuck: string): string {
  const oneLine = workStuck.replace(/\s+/g, '');
  if (/細切れ|仕上げる前|妥協/.test(oneLine)) {
    return '細かく区切られた時間や切り替えが続くと、休める余白が減りやすいです。';
  }
  return firstSentence(workStuck);
}

type DomainDisplaySlot = 'strength' | 'load' | 'recovery';

function domainSlotFallback(kind: DomainDisplaySlot): string {
  switch (kind) {
    case 'strength':
      return DTR_DISPLAY_FALLBACK_STRENGTH;
    case 'load':
      return DTR_DISPLAY_FALLBACK_LOAD;
    case 'recovery':
      return DTR_DISPLAY_FALLBACK_RECOVERY;
  }
}

function resolveDomainSlot(
  kind: DomainDisplaySlot,
  candidates: readonly string[],
  used: Set<string>,
  blockLifeMisplacement = false,
): string {
  return pickUniqueDisplaySentence(
    candidates,
    used,
    domainSlotFallback(kind),
    blockLifeMisplacement ? { blockLifeMisplacement: true } : undefined,
  );
}

/** Premium module 04: soften DRAFT phrasing in bridge 2nd paragraph (stem 3 copy). */
function premiumBridgeRecoveryHint(raw: string): string {
  if (raw.includes('DRAFT')) {
    return '戻し方としては、最初に「今日はここまで」と決めておき、完成前でも一度だけ途中の形を誰かに見せるところから始めると、負担が下がりやすいです。';
  }
  return raw;
}

/** Ten-views image mapping by stem index (shared SSOT: publicStemDisplay). */
const DTR_TYPE_IMAGE = STEM_LANE_TEN_VIEWS_IMAGE;

/** Birth date for First Record line — e.g. 1983.Feb.28 */
function formatBirthDateFirstRecordLine(iso: string): string {
  const t = iso.trim().slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return iso.trim() || '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
  const monthIdx = parseInt(m[2], 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) return iso.trim() || '—';
  return `${m[1]}.${months[monthIdx]}.${Number(m[3])}`;
}

type Props = {
  ownershipType: string;
  aiConsultIncluded: boolean;
  expiresAt: string | null;
  /** From resolveDisplayedDtrEnvelope — legacy notice hidden after v2 rebuild. */
  displayedEnvelopeReadMode?: DisplayedEnvelopeReadMode;
  /** Immutable paid body from dtr_report_snapshots (required; server gate ensures presence). */
  purchasedSnapshot: {
    envelope: DtrEnvelope;
    profile: { nickname: string; birthDate: string };
  };
  /** Dev-only (/dev/dtr-drawer-preview): inject consult UI without /api/room/core. */
  consultDevPreviewRoomData?: ConsultRoomPreviewRoomData;
  /** Server read-only wallet snapshot for saved-report info (display only). */
  consultWalletSnapshot?: ConsultWalletDisplaySnapshot | null;
};

function HeroIconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HeroIconShield({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l7 3v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Premium included-features band — under poster, before ownership meta.
   ───────────────────────────────────────────────────────────────────────────── */

/** Chapter bands + legacy intro TOC — from paidDtrProductCopy PAID_DTR_CHAPTERS. */
const REPORT_PARTS = PAID_DTR_REPORT_PARTS;

/** Intro panels 01 + 02 — between hero poster and drawer hub (no 03 TOC). */
function PremiumIntroValueBand() {
  return (
    <div className={styles.premiumIntroValueBand} aria-label="本質の読み解きの説明">
      <div className={styles.premiumIntroPanelSection}>
        <span className={styles.premiumIntroPanelStep} aria-hidden>
          {PAID_DTR_INTRO_PANEL_01.stepLabel}
        </span>
        <p className={styles.premiumIntroOverline}>{PAID_DTR_INTRO_PANEL_01.overlineJa}</p>
        <p className={styles.premiumIntroLead}>
          {PAID_DTR_INTRO_PANEL_01.leadLinesJa[0]}
          <br />
          {PAID_DTR_INTRO_PANEL_01.leadLinesJa[1]}
        </p>
        <p className={styles.premiumIntroBody}>{PAID_DTR_INTRO_PANEL_01.bodyJa}</p>
      </div>
      <div className={styles.premiumIntroPanelSection}>
        <span className={styles.premiumIntroPanelStep} aria-hidden>
          02
        </span>
        <p className={styles.premiumIntroSectionLabel}>{PAID_DTR_BENEFITS_HEADING}</p>
        <ul className={styles.premiumIntroBulletList} aria-label={PAID_DTR_BENEFITS_HEADING}>
          {PAID_DTR_BENEFIT_BULLETS.map((text) => (
            <li key={text} className={styles.premiumIntroBulletItem}>
              <span className={styles.premiumIntroBulletText}>
                <HeroIconCheck className={styles.benefitCheckIcon} />
                {text}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** 各章の空気感を差別化する小モチーフ SVG */
function ReportPartMotif({ partId }: { partId: '1' | '2' | '3' | '4' }) {
  const base = { width: 40, height: 36, viewBox: '0 0 40 36', 'aria-hidden': true as const };
  if (partId === '1') {
    return (
      <svg {...base} className={styles.reportPartMotif}>
        <circle cx="20" cy="18" r="14.5" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.55" />
        <circle cx="20" cy="18" r="8.5"  fill="none" stroke="currentColor" strokeWidth="0.7" strokeDasharray="2.5 2" opacity="0.4" />
        <circle cx="20" cy="18" r="2.5"  fill="currentColor" opacity="0.45" />
      </svg>
    );
  }
  if (partId === '2') {
    return (
      <svg {...base} className={styles.reportPartMotif}>
        <line x1="6"  y1="11" x2="34" y2="11" stroke="currentColor" strokeWidth="0.9" opacity="0.6" />
        <line x1="6"  y1="18" x2="34" y2="18" stroke="currentColor" strokeWidth="0.7" opacity="0.4" />
        <line x1="6"  y1="25" x2="34" y2="25" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
        <circle cx="13" cy="11" r="2" fill="currentColor" opacity="0.6" />
        <circle cx="27" cy="18" r="2" fill="currentColor" opacity="0.4" />
      </svg>
    );
  }
  if (partId === '3') {
    return (
      <svg {...base} className={`${styles.reportPartMotif} ${styles.reportPartMotifAmber}`}>
        <path d="M20 6 L33 30 H7 Z" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" opacity="0.55" />
        <line x1="20" y1="14" x2="20" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="20" cy="26" r="1.8" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg {...base} className={styles.reportPartMotif}>
      <path d="M10 24 A12 12 0 0 1 30 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <path d="M14 28 A8 8 0 0 1 26 28"  fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
      <circle cx="20" cy="18" r="2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

function drawerSectionTitle(section: DtrSection): string {
  return drawerSectionDisplayTitleJa(section);
}

function sectionOpeningLede(body: string): string | null {
  const lede = body.split('\n\n').map((p) => p.trim()).find(Boolean);
  return lede ?? null;
}

function stripTrailingHonorific(raw: string): string {
  return raw.replace(/\s+/g, '').replace(/(さん|様)+$/u, '');
}

function chapter1SoftTone(text: string): string {
  return text
    .replaceAll('差分を証拠に積む', '小さな変化を丁寧に見る')
    .replaceAll('感受の解像度', '感じ取る細やかさ')
    .replaceAll('観測蓄積型', '深掘り集中型')
    .replaceAll('速報より蓄積', '急ぐより積み重ね')
    .replaceAll('長期記憶として保持', '長く覚えて活かす')
    .replaceAll('意思決定', '判断')
    .replaceAll('検証', '見直し')
    .replaceAll('観測', '見取り')
    .replaceAll('構成', '重なり')
    .replaceAll('処理', '受け止め');
}

function GraphCaption({ id }: { id: PaidDtrChapterGraphCaptionId }) {
  return (
    <div className={styles.graphCaptionBlock} role="note">
      <span className={styles.graphCaptionLabel}>{PAID_DTR_CHAPTER_GRAPH_CAPTION_LEAD_JA}</span>
      <p className={styles.graphCaption}>{PAID_DTR_CHAPTER_GRAPH_CAPTIONS[id]}</p>
    </div>
  );
}

function ChapterPersonalHeading({
  partId,
  nickname,
}: {
  partId: PaidDtrReportPartId;
  nickname?: string;
}) {
  const suffix = PAID_DTR_CHAPTER_DRAWER_INTRO[partId].personalHeadingSuffixJa;
  const nick = nickname?.trim();
  const label = nick
    ? `${clampDisplayNick(stripTrailingHonorific(nick) || nick, 20)}さん${suffix}`
    : `あなた${suffix}`;
  return <h2 className={styles.chapterPersonalHeading}>{label}</h2>;
}

function ChapterOpeningLede({ text }: { text: string }) {
  return <p className={styles.chapterOpeningLede}>{text}</p>;
}

/** Drawer chapter band — Hub label primary; legacy chapter title in aria only. */
function ReportPartBand({ partId }: { partId: PaidDtrReportPartId }) {
  const part = REPORT_PARTS.find((p) => p.partId === partId);
  const intro = PAID_DTR_CHAPTER_DRAWER_INTRO[partId];
  const roman = part?.roman ?? '';
  const a11yLabel = `第${partId}部 ${intro.hubLabelJa}。${intro.legacyChapterTitleJa}`;
  const bandClass =
    partId === '1'
      ? `${styles.reportPartBand} ${styles.reportPartBandChapterPlate}`
      : styles.reportPartBand;

  return (
    <div
      id={part?.anchor}
      data-part={partId}
      className={bandClass}
      aria-label={a11yLabel}
    >
      <div className={styles.reportPartBandHeader}>
        <ReportPartMotif partId={partId} />
        <div className={styles.reportPartBandMeta}>
          <div className={styles.reportPartBandRow}>
            <span className={styles.reportPartBandNum} aria-hidden>
              {roman}
            </span>
            <span className={styles.reportPartBandTitle}>{intro.hubLabelJa}</span>
          </div>
          <p className={styles.reportPartBandSublabel}>{intro.hubSublabelJa}</p>
        </div>
      </div>
    </div>
  );
}

function DrawerChapterPersonalLead({
  partId,
  nickname,
}: {
  partId: PaidDtrReportPartId;
  nickname?: string;
}) {
  const copy = PAID_DTR_CHAPTER_OPENING_COPY[partId];
  const nick = nickname?.trim();
  const displayName = nick ? clampDisplayNick(stripTrailingHonorific(nick) || nick, 20) : 'あなた';
  const heading = `${displayName}さん${copy.headingSuffixJa}`;
  const tendencyLine = copy.tendencyJa.replace('{nickname}', displayName);
  return (
    <div className={styles.drawerChapterPersonalLead}>
      <h2 className={styles.chapterPersonalHeading}>{heading}</h2>
      <ChapterOpeningLede text={tendencyLine} />
      {copy.reasonJa ? <ChapterOpeningLede text={copy.reasonJa} /> : null}
      <ChapterOpeningLede text={copy.lifeJa} />
      <ChapterOpeningLede text={copy.actionJa} />
      {copy.moneyScopeJa ? <ChapterOpeningLede text={copy.moneyScopeJa} /> : null}
      {copy.moneyHabitJa ? <ChapterOpeningLede text={copy.moneyHabitJa} /> : null}
      <div
        className={styles.chapterOpeningPoints}
        aria-label={
          partId === '1' || partId === '2' || partId === '3' || partId === '4'
            ? 'この章で出ている特徴'
            : '見るポイント'
        }
      >
        {copy.pointsJa.map((point) => (
          <p key={point} className={styles.chapterOpeningPoint}>
            {point}
          </p>
        ))}
      </div>
    </div>
  );
}

function ChapterConsultNextAction({
  partId,
  nickname,
  onOpenConsult,
}: {
  partId: PaidDtrReportPartId;
  nickname?: string;
  onOpenConsult: () => void;
}) {
  const copy = PAID_DTR_CHAPTER_BRIDGE_COPY[partId];
  const nick = nickname?.trim();
  const consultNick = nick ? clampDisplayNick(stripTrailingHonorific(nick) || nick, 20) : 'あなた';
  const tendencyLine = copy.tendencyJa.replace('{nickname}', consultNick);
  return (
    <div className={styles.chapterConsultAction} aria-label="この章を返書で深める入口">
      <p className={styles.chapterConsultReinforcement}>{tendencyLine}</p>
      <p className={styles.chapterConsultReinforcement}>{copy.lifeJa}</p>
      <p className={styles.chapterConsultReinforcement}>{PAID_DTR_CHAPTER_BRIDGE_LIFE_SUPPLEMENT_JA}</p>
      <p className={styles.chapterConsultReinforcement}>{copy.actionJa}</p>
      <p className={styles.chapterConsultQuestionLabel}>返書で深めるなら、この問い</p>
      <p className={styles.chapterConsultQuestion}>{copy.consultQuestionJa}</p>
      <button
        type="button"
        className={styles.chapterConsultButton}
        onClick={onOpenConsult}
      >
        {PAID_DTR_CHAPTER_CONSULT_CTA_LABEL_JA}
      </button>
      <p className={styles.chapterConsultTruthNote}>{PAID_DTR_CHAPTER_CONSULT_TRUTH_NOTE_JA}</p>
    </div>
  );
}

function ChapterDeepReadingTakeaways({ partId }: { partId: PaidDtrReportPartId }) {
  const copy = PAID_DTR_DEEP_READING_TAKEAWAYS[partId];
  return (
    <div className={styles.chapterTakeawayBlock} aria-label={`${PAID_DTR_DEEP_READING_SECTION_TITLE_JA}の要点`}>
      <p className={styles.chapterTakeawayLead}>{copy.closedLeadJa}</p>
      <ul className={styles.chapterTakeawayList}>
        {copy.itemsJa.map((item) => (
          <li key={item} className={styles.chapterTakeawayItem}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   A. Premium hero — two-column feel: left copy stack + right type image (absolute).
   v0-inspired: brand line, badge row, Blueprint h1, inset type card, dense meta grid.
   ───────────────────────────────────────────────────────────────────────────── */

function PremiumHero({
  stem,
  stemIdx,
  aiConsultIncluded,
  expiresAt,
  nickname,
  birthDate,
  openPanel,
  onSelectPanel,
  renderPanelBody,
}: {
  stem: TenStemDisplay;
  stemIdx: number;
  aiConsultIncluded: boolean;
  expiresAt: string | null;
  nickname: string;
  birthDate: string;
  openPanel: DrawerHubOpenPanel;
  onSelectPanel: (panel: DrawerHubOpenPanel) => void;
  renderPanelBody: (panel: DrawerHubPanelId) => ReactNode;
}) {
  const typeImage = DTR_TYPE_IMAGE[stemIdx] ?? '/ten-views/analyst.webp';
  const nick = nickname.trim();
  const blueprintName = nick || 'You';

  return (
    <header className={styles.premiumHero} aria-label="保存済みレポート">
      <div className={styles.heroPoster}>
        <img
          className={styles.heroPosterTypeImg}
          src={typeImage}
          alt=""
          decoding="async"
          aria-hidden
        />
        <div className={styles.heroPosterOverlay}>
          <div className={styles.heroPosterMain}>
            <div className={styles.heroPosterBadgeRow}>
              <span className={`${styles.heroBadgeChip} ${styles.heroBadgeChipSaved}`}>
                <HeroIconCheck className={styles.heroBadgeIcon} />
                {LABEL_STATE_OWNED}
              </span>
              <span className={`${styles.heroBadgeChip} ${styles.heroBadgeChipPremium}`}>
                <HeroIconShield className={styles.heroBadgeIcon} />
                保存版
              </span>
            </div>

            <div className={styles.heroPosterBrandRow}>
              <span className={styles.heroPosterBrandWord}>M55</span>
              <span className={styles.heroPosterBrandSep} aria-hidden>|</span>
              <span className={styles.heroPosterTypeMono}>{LABEL_PRODUCT_JP}</span>
            </div>

            <h1 className={styles.heroBlueprintTitle}>
              <span className={styles.heroBlueprintPrefix}>
                {PAID_DTR_READER_HERO_READ_BACK_PREFIX_JA}
              </span>
              <span className={styles.heroBlueprintName}>{blueprintName}</span>
            </h1>

            <div className={styles.heroFirstRecord} aria-label="生年月日（購入時プロフィール）">
              <span className={styles.heroFirstRecordLabel}>購入時プロフィール</span>
              <span className={styles.heroFirstRecordDate}>{formatBirthDateFirstRecordLine(birthDate)}</span>
            </div>

            <div className={styles.heroTypeCard}>
              <div className={styles.heroTypeCardRow}>
                <span className={styles.heroTypeCardLabel}>資質 /</span>
                <span className={styles.heroTypeCardType}>{stem.publicTitle}</span>
              </div>
              <p className={styles.heroTypeCardEssence}>{stem.displayOneLine}</p>
            </div>
          </div>
        </div>
      </div>

      <PremiumIntroValueBand />

      <PremiumDrawerHub
        openPanel={openPanel}
        onSelectPanel={onSelectPanel}
        aiConsultIncluded={aiConsultIncluded}
        renderPanelBody={renderPanelBody}
      />
    </header>
  );
}

function ReportFooterMetaCard({
  aiConsultIncluded,
  expiresAt,
  stemTitle,
  displayedEnvelopeReadMode,
  consultWalletSnapshot,
}: {
  aiConsultIncluded: boolean;
  expiresAt: string | null;
  stemTitle: string;
  displayedEnvelopeReadMode?: DisplayedEnvelopeReadMode;
  consultWalletSnapshot?: ConsultWalletDisplaySnapshot | null;
}) {
  const walletUsable =
    aiConsultIncluded && isConsultWalletDisplaySnapshotUsable(consultWalletSnapshot);
  const wallet = walletUsable ? consultWalletSnapshot : null;

  return (
    <section className={styles.reportMetaCard} aria-label="保存版の情報">
      <p className={styles.reportMetaHeading}>保存版の情報</p>
      <p className={styles.reportMetaLead}>
        {aiConsultIncluded ? PAID_DTR_INTRO_CONSULT_NOTE.lineJa : 'この保存版には、相談返書は付いていません。'}
      </p>
      {aiConsultIncluded && wallet ? (
        <>
          <p className={styles.reportMetaWalletAvailable}>
            {hasValidConsultWalletDenominator(wallet)
              ? formatConsultAvailableWithGrantedLine(
                  wallet.availableCount,
                  wallet.totalGrantedCount,
                )
              : formatConsultAvailableCountLine(wallet.availableCount)}
          </p>
          <p className={styles.reportMetaWalletUsed}>
            {formatConsultUsedCountLine(wallet.consumedCount)}
          </p>
        </>
      ) : aiConsultIncluded ? (
        <p className={styles.reportMetaNote}>{PAID_DTR_INTRO_CONSULT_NOTE.balanceFallbackJa}</p>
      ) : null}
      <div className={styles.reportMetaGrid} role="list">
        <p className={styles.reportMetaItem} role="listitem">
          <span className={styles.reportMetaItemLabel}>有効期限</span>
          <span className={styles.reportMetaItemValue}>{expiresAt ?? '無期限'}</span>
        </p>
        {aiConsultIncluded && !wallet ? (
          <p className={styles.reportMetaItem} role="listitem">
            <span className={styles.reportMetaItemLabel}>{PAID_DTR_INTRO_CONSULT_NOTE.metaLabelJa}</span>
            <span className={styles.reportMetaItemValue}>
              {PAID_DTR_INTRO_CONSULT_NOTE.metaIncludedValueJa}
            </span>
          </p>
        ) : null}
        <p className={styles.reportMetaItem} role="listitem">
          <span className={styles.reportMetaItemLabel}>傾向名</span>
          <span className={styles.reportMetaItemValue}>{stemTitle}</span>
        </p>
      </div>
      <p className={styles.reportMetaNote}>{SAVED_SNAPSHOT_NOTICE_PRIMARY}</p>
      {shouldShowLegacySnapshotNotice(displayedEnvelopeReadMode) ? (
        <p className={styles.reportMetaNote}>{SAVED_SNAPSHOT_NOTICE_LEGACY_MODE}</p>
      ) : null}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Structural divider — mirrors premium-report SectionDivider (label chip + rules).
   ───────────────────────────────────────────────────────────────────────────── */

function SectionDivider({ label, premium }: { label: string; premium?: boolean }) {
  return (
    <div
      className={styles.prSectionDivider}
      role="separator"
      aria-label={label}
    >
      <span className={styles.prDividerRule} aria-hidden />
      <span
        className={
          premium ? styles.prDividerChipPremium : styles.prDividerChip
        }
      >
        {label}
      </span>
      <span className={styles.prDividerRule} aria-hidden />
    </div>
  );
}

function PremiumModuleLead({
  n,
  tierJa,
  tierClass,
}: {
  n: number;
  tierJa: string;
  tierClass: string;
}) {
  const num = String(n).padStart(2, '0');
  return (
    <div className={styles.prModuleBadgeRow}>
      <span className={styles.prModuleBadgeMain}>
        <span className={styles.prModuleBadgeDot} aria-hidden />
        第{n}章
      </span>
      <span className={`${styles.prModuleBadgeTier} ${tierClass}`}>{tierJa}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   B. Saved report narrative — wide articles + optional compact grid cards.
   Parent layout follows premium-report Layer 2 (overview + 3-col band).
   ───────────────────────────────────────────────────────────────────────────── */

/** Paragraphs that start with 【〜】 are rendered as a labelled block: heading + body. */
function BodyPara({
  para,
  compact,
}: {
  para: string;
  compact: boolean;
}) {
  const match = /^【(.+?)】\n?/.exec(para);
  if (match) {
    const heading = match[1]!;
    const body = para.slice(match[0].length).trim();
    return (
      <div className={styles.sectionBlockGroup}>
        <p className={styles.sectionBlockLabel}>{heading}</p>
        {body && (
          <p className={compact ? styles.savedGridPara : styles.savedWidePara}>{body}</p>
        )}
      </div>
    );
  }
  return (
    <p className={compact ? styles.savedGridPara : styles.savedWidePara}>{para}</p>
  );
}

function SectionBlock({
  section,
  density = 'comfortable',
}: {
  section: DtrSection;
  density?: 'comfortable' | 'compact';
}) {
  const compact = density === 'compact';
  return (
    <article
      className={compact ? styles.savedGridArticle : styles.savedWideArticle}
      aria-label={drawerSectionTitle(section)}
    >
      {compact ? (
        <h3 className={styles.savedGridTitle}>{drawerSectionTitle(section)}</h3>
      ) : (
        <h2 className={styles.savedWideTitle}>{drawerSectionTitle(section)}</h2>
      )}
      <div className={compact ? styles.savedGridBody : styles.savedWideBody}>
        {section.body.split('\n\n').map((para, i) => (
          <BodyPara key={i} para={para} compact={compact} />
        ))}
      </div>
    </article>
  );
}

function clampTensionBias(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(-1, Math.min(1, n));
}

/** Paid-only: visual self-design figure for 「あなたという人物」 (body text unchanged). */
function IdentityDesignFigures({ stemIdx, nickname }: { stemIdx: number; nickname?: string }) {
  const viz = identityDesignVizForStem(stemIdx);
  const nick = nickname?.trim();
  const displayName = nick ? `${clampDisplayNick(stripTrailingHonorific(nick) || nick, 20)}さん` : 'あなた';
  const bpLayers: { key: string; label: string; text: string }[] = [
    {
      key: 'core',
      label: 'いちばん土台になる力',
      text: 'ひとつのことに集中し、少しずつ良くしていく力',
    },
    {
      key: 'natural',
      label: '力が出やすいとき',
      text: '一度で終えるより、少しずつ整えながら進められるとき',
    },
    {
      key: 'fragile',
      label: '止まりやすいとき',
      text: '細かい割り込みが続いたり、「とりあえず早く」と急かされるとき',
    },
    {
      key: 'max',
      label: '楽に進めるための条件',
      text: '集中できる時間があり、「今日はここまで」と自分で区切れること',
    },
  ];
  const db = clampTensionBias(viz.tension.deepenBroaden);
  const ge = clampTensionBias(viz.tension.guardExpress);

  return (
    <div className={styles.idDesignShell} aria-label="力の出方をひとつずつ見る（本質の読み解き）">
      <p className={styles.idDesignOverline}>深読み · 力の出方をひとつずつ見る</p>

      <div className={styles.idDesignBlock}>
        <h3 className={styles.idDesignBlockTitle}>{displayName}の力が出やすい4つの手がかり</h3>
        <p className={styles.idDesignHint}>
          ここでは、{displayName}の「力が出やすいとき」「止まりやすいとき」「戻し方」を順に見ます。
        </p>
        <div className={styles.idBpStack} role="list">
          {bpLayers.map((L, i) => (
            <div
              key={L.key}
              role="listitem"
              className={`${styles.idBpLayer} ${styles.idBpReveal}`}
              style={{ animationDelay: `${0.04 + i * 0.07}s` }}
            >
              <span className={styles.idBpLabel}>{L.label}</span>
              <p className={styles.idBpText}>{L.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.idDesignBlock}>
        <h3 className={styles.idDesignBlockTitle}>どちらに動きやすいか</h3>
        <div className={styles.idDesignHintBlock}>
          <p className={styles.idDesignHint}>
            {displayName}
            は、急いで広げるより、ひとつのことを深めながら、自分の基準で整えるほど力が出やすい形です。
          </p>
          <p className={styles.idDesignHint}>
            人前で大きく見せる前に、納得できるところまで整えたい気持ちが出やすくなります。
          </p>
          <p className={styles.idDesignHint}>
            そのぶん、急かされたり、途中で細かく割り込まれると、自分のペースを失いやすくなります。
          </p>
        </div>
        <div className={styles.idTensionGrid}>
          <div className={styles.idTensionAxis}>
            <span className={styles.idTensionPole}>深める</span>
            <div className={styles.idTensionTrack}>
              <span className={styles.idTensionBar} aria-hidden />
              <span
                className={styles.idTensionMarkWrap}
                style={{ left: `${50 + db * 44}%` }}
              >
                <span
                  className={`${styles.idTensionMark} ${styles.idTensionMarkReveal}`}
                  style={{ animationDelay: '0.32s' }}
                  aria-hidden
                />
              </span>
            </div>
            <span className={styles.idTensionPole}>広げる</span>
          </div>
          <div className={styles.idTensionAxis}>
            <span className={styles.idTensionPole}>守る</span>
            <div className={styles.idTensionTrack}>
              <span className={styles.idTensionBar} aria-hidden />
              <span
                className={styles.idTensionMarkWrap}
                style={{ left: `${50 + ge * 44}%` }}
              >
                <span
                  className={`${styles.idTensionMark} ${styles.idTensionMarkReveal}`}
                  style={{ animationDelay: '0.42s' }}
                  aria-hidden
                />
              </span>
            </div>
            <span className={styles.idTensionPole}>出す</span>
          </div>
        </div>
      </div>

      <div className={styles.idDesignBlock}>
        <h3 className={styles.idDesignBlockTitle}>力が出る向きと戻し方</h3>
        <div className={styles.idGrowthFlow}>
          <div
            className={`${styles.idGrowthCard} ${styles.idGrowthReveal}`}
            style={{ animationDelay: '0.12s' }}
          >
            <span className={styles.idGrowthTag}>楽になる条件</span>
            <p className={styles.idGrowthText}>
              深く向き合う時間があり、自分の基準で整えられるとき。
            </p>
          </div>
          <div className={styles.idGrowthBetween} aria-hidden>
            <svg className={styles.idGrowthConnH} viewBox="0 0 64 12" preserveAspectRatio="none">
              <path className={styles.idGrowthPath} d="M2 6 L62 6" />
            </svg>
            <svg className={styles.idGrowthConnV} viewBox="0 0 12 64" preserveAspectRatio="none">
              <path className={styles.idGrowthPath} d="M6 2 L6 62" />
            </svg>
          </div>
          <div
            className={`${styles.idGrowthCard} ${styles.idGrowthReveal}`}
            style={{ animationDelay: '0.2s' }}
          >
            <span className={`${styles.idGrowthTag} ${styles.idGrowthTagMid}`}>崩れる条件</span>
            <p className={styles.idGrowthText}>
              干渉や急かしが増えて、どこまでやるかを自分で決められなくなるとき。
            </p>
          </div>
          <div className={styles.idGrowthBetween} aria-hidden>
            <svg className={styles.idGrowthConnH} viewBox="0 0 64 12" preserveAspectRatio="none">
              <path className={`${styles.idGrowthPath} ${styles.idGrowthPath2}`} d="M2 6 L62 6" />
            </svg>
            <svg className={styles.idGrowthConnV} viewBox="0 0 12 64" preserveAspectRatio="none">
              <path className={`${styles.idGrowthPath} ${styles.idGrowthPath2}`} d="M6 2 L6 62" />
            </svg>
          </div>
          <div
            className={`${styles.idGrowthCard} ${styles.idGrowthReveal}`}
            style={{ animationDelay: '0.28s' }}
          >
            <span className={`${styles.idGrowthTag} ${styles.idGrowthTagEnd}`}>戻す条件</span>
            <p className={styles.idGrowthText}>
              始める前に「今日はここまで」と自分の言葉で決めておくこと。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function IdentityArticleWithBlueprint({
  section,
  stemIdx,
  nickname,
  openingLedeShown = false,
}: {
  section: DtrSection;
  stemIdx: number;
  nickname?: string;
  openingLedeShown?: boolean;
}) {
  const paras = section.body.split('\n\n').filter((p) => p.trim());
  const nick = nickname?.trim();
  const displayName = nick ? clampDisplayNick(stripTrailingHonorific(nick) || nick, 20) : 'あなた';
  const bodyParas = [
    `${displayName}さんは、ひとつのことにじっくり向き合うほど、力が出やすくなります。いろいろなことを一気に広げるより、同じことを少しずつ良くしていく中で、自分らしさがはっきりしていきます。`,
    'やりがいを感じやすいのは、「前より良くなった」と実感できるときです。完成した瞬間だけでなく、直しながら良くなっていく過程にも手応えがあります。',
    `${displayName}さん自身が納得できる形まで向き合えることが、いちばん大切です。雑に済ませたくない気持ちは、弱さではなく、納得できる形まで向き合おうとする力です。ただし、細かい割り込みが続いたり、急かされる流れが続くと、自分のペースを失いやすくなります。`,
  ];
  const inlineLede = openingLedeShown ? null : paras[0];
  return (
    <article className={styles.savedWideArticle} aria-label={drawerSectionTitle(section)}>
      {!openingLedeShown ? (
        <h2 className={styles.savedWideTitle}>{drawerSectionTitle(section)}</h2>
      ) : null}
      {inlineLede ? <p className={styles.sectionLede}>{inlineLede}</p> : null}
      {bodyParas.length > 0 ? (
        <div className={`${styles.savedWideBody} ${styles.dtrNarrativeBody}`}>
          {bodyParas.map((para, i) => (
            <BodyPara key={i} para={para} compact={false} />
          ))}
        </div>
      ) : null}
      <p className={styles.chapterPilotGuideText}>{PAID_DTR_CHAPTER1_PILOT_GUIDE.beforeIdentityGraphJa}</p>
      <GraphCaption id="ch1-identity-design" />
      <IdentityDesignFigures stemIdx={stemIdx} nickname={nickname} />
    </article>
  );
}

const STRUCTURE_AXIS_ORDER: readonly StructureAxisJa[] = [
  '思考',
  '推進',
  '感受',
  '精度',
  '安定',
] as const;

const STR_VIZ_N = STRUCTURE_AXIS_ORDER.length;
const STR_VIZ_CX = 50;
const STR_VIZ_CY = 50;
const STR_VIZ_R_MAX = 33;
const STR_VIZ_R_MIN = 7;
const STR_VIZ_R_LABEL = 42;

function roleToRadius(role: StructureAxisRole): number {
  const w =
    role === 'core'   ? 1.00 :
    role === 'strong' ? 0.72 :
    role === 'bridge' ? 0.45 :
                        0.20;
  return STR_VIZ_R_MIN + w * (STR_VIZ_R_MAX - STR_VIZ_R_MIN);
}

function strPentPoint(i: number, radius: number): [number, number] {
  const a = -Math.PI / 2 + (i / STR_VIZ_N) * Math.PI * 2;
  return [STR_VIZ_CX + radius * Math.cos(a), STR_VIZ_CY + radius * Math.sin(a)];
}

// Colour for each readability accent level (used as inline style to avoid dynamic CSS module keys)
const STR_MAP_READ_COLORS = {
  front:  'rgba(155,135,225,0.95)',
  bridge: 'rgba(140,120,200,0.75)',
  quiet:  'rgba(160,148,200,0.55)',
} as const;

// Display names for radar axis labels — plain language, used in buttons and tips
const STRUCTURE_AXIS_DISPLAY: Record<StructureAxisJa, string> = {
  思考: '考える',
  推進: '進める',
  感受: '感じる',
  精度: '仕上げる',
  安定: '整える',
};

// Short descriptions aligned to STRUCTURE_AXIS_ORDER: 思考/推進/感受/精度/安定
const STRUCTURE_AXIS_DESC: Record<string, string> = {
  思考: '物事を筋立てて考える傾向',
  推進: '行動に出て場を動かす傾向',
  感受: '空気や変化を感じ取る傾向',
  精度: '仕上がりの質にこだわる傾向',
  安定: '継続して場を保つ傾向',
};

/** 構成と傾向 — 傾向レーダー（paid 深読み版 · 数値なし） */
function StructureInteractionMapFigures({ stemIdx }: { stemIdx: number }) {
  const viz = compositionStructureVizForStem(stemIdx);
  const [activeAxis, setActiveAxis] = useState<string | null>(null);

  // Grid pentagons at 60 % and 100 % of max radius
  const gridLevels = [0.60, 1.0].map((f) =>
    STRUCTURE_AXIS_ORDER.map((_, i) => {
      const rad = STR_VIZ_R_MIN + f * (STR_VIZ_R_MAX - STR_VIZ_R_MIN);
      const [x, y] = strPentPoint(i, rad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ')
  );

  // Data pentagon from axisRoles
  const dataPoly = STRUCTURE_AXIS_ORDER.map((axis, i) => {
    const [x, y] = strPentPoint(i, roleToRadius(viz.axisRoles[axis]));
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  // Axis grouping for summary card
  const readRows: { label: string; accent: keyof typeof STR_MAP_READ_COLORS; axes: StructureAxisJa[] }[] = [
    {
      label: '強く出やすい',
      accent: 'front' as const,
      axes: STRUCTURE_AXIS_ORDER.filter((a) => viz.axisRoles[a] === 'core' || viz.axisRoles[a] === 'strong'),
    },
    {
      label: '支えになる',
      accent: 'bridge' as const,
      axes: STRUCTURE_AXIS_ORDER.filter((a) => viz.axisRoles[a] === 'bridge'),
    },
    {
      label: '整えると開く',
      accent: 'quiet' as const,
      axes: STRUCTURE_AXIS_ORDER.filter((a) => viz.axisRoles[a] === 'quiet'),
    },
  ].filter((r) => r.axes.length > 0);

  return (
    <div className={styles.idDesignShell} aria-label="傾向のバランス">
      <p className={styles.idDesignOverline}>傾向のバランス</p>

      <div className={styles.idDesignBlock}>
        {/* 構成タイプ名 */}
        <p className={styles.strMapPattern}>
          <span className={styles.strMapPatternLabel}>{viz.patternLabel}</span>
        </p>

        <div className={styles.strMapFig}>
          <svg
            className={styles.strMapSvg}
            viewBox="0 0 100 100"
            aria-hidden="true"
            focusable="false"
          >
            {/* Grid pentagons */}
            {gridLevels.map((pts, idx) => (
              <polygon
                key={idx}
                points={pts}
                fill="none"
                stroke="rgba(140,120,220,0.18)"
                strokeWidth={idx === 0 ? 0.5 : 0.7}
              />
            ))}

            {/* Data polygon */}
            <polygon
              points={dataPoly}
              fill="rgba(115,100,195,0.22)"
              stroke="rgba(155,135,225,0.80)"
              strokeWidth={1.5}
              strokeLinejoin="round"
              className={styles.strMapDataReveal}
            />

          </svg>
          {/* Axis label tap targets — sole visible labels; SVG text removed to eliminate duplication */}
          {STRUCTURE_AXIS_ORDER.map((axis, i) => {
            const [lx, ly] = strPentPoint(i, STR_VIZ_R_LABEL);
            const isActive = activeAxis === axis;
            return (
              <button
                key={axis}
                className={`${styles.radarAxisBtn}${isActive ? ` ${styles.radarAxisBtnActive}` : ''}`}
                style={{ left: `${lx}%`, top: `${ly}%` }}
                aria-pressed={isActive}
                aria-label={`${STRUCTURE_AXIS_DISPLAY[axis]}について詳しく見る`}
                onClick={() => setActiveAxis(isActive ? null : axis)}
              >
                {STRUCTURE_AXIS_DISPLAY[axis]}
              </button>
            );
          })}
          {activeAxis && (
            <div className={styles.radarAxisTip} role="status">
              <span className={styles.radarAxisTipName}>{STRUCTURE_AXIS_DISPLAY[activeAxis as StructureAxisJa]}</span>
              <span className={styles.radarAxisTipDesc}>{STRUCTURE_AXIS_DESC[activeAxis]}</span>
              <span className={styles.radarAxisTipRole}>
                {viz.axisRoles[activeAxis as keyof typeof viz.axisRoles] === 'core'   && '主軸'}
                {viz.axisRoles[activeAxis as keyof typeof viz.axisRoles] === 'strong' && '副軸'}
                {viz.axisRoles[activeAxis as keyof typeof viz.axisRoles] === 'bridge' && '支え'}
                {viz.axisRoles[activeAxis as keyof typeof viz.axisRoles] === 'quiet'  && '静観'}
              </span>
            </div>
          )}
          {/* 図の直後に生活語の要約 */}
          <p className={styles.strMapLinksCaption}>{viz.patternCaption}</p>
        </div>

        {/* ── 読み取り要約カード ── */}
        <div className={`${styles.strMapReadCard} ${styles.idBpReveal}`} style={{ animationDelay: '0.28s' }}>
          <div className={styles.strMapReadBadge}>
            <span className={styles.strMapReadBadgeDot} aria-hidden />
            今出やすいところ
          </div>
          <div className={styles.strMapReadRows}>
            {readRows.map(({ label, accent, axes }) => (
              <div key={label} className={styles.strMapReadRow}>
                <span
                  className={styles.strMapReadLabel}
                  style={{ color: STR_MAP_READ_COLORS[accent] }}
                >
                  {label}
                </span>
                <span className={styles.strMapReadAxes}>{axes.map(a => STRUCTURE_AXIS_DISPLAY[a]).join('・')}</span>
              </div>
            ))}
          </div>
          <p className={styles.strMapReadLegend}>
            この図は、良い・悪いの点数ではありません。外側に近いほどふだん出やすく、中心に近いほど必要な場面でゆっくり出やすい傾向として見ます。
          </p>
        </div>

        <div className={styles.strMapCallouts}>
          <div
            className={`${styles.strMapCallout} ${styles.idBpReveal}`}
            style={{ animationDelay: '0.35s' }}
          >
            <span className={styles.strMapCalloutLabel}>力が出やすい流れ</span>
            <p className={styles.strMapCalloutText}>{viz.strengthEmergence}</p>
          </div>
          <div
            className={`${styles.strMapCallout} ${styles.strMapCalloutFlip} ${styles.idBpReveal}`}
            style={{ animationDelay: '0.42s' }}
          >
            <span className={styles.strMapCalloutLabel}>つまずきやすいところ</span>
            <p className={styles.strMapCalloutText}>{viz.flipRisk}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompositionArticleWithViz({
  section,
  stemIdx,
}: {
  section: DtrSection;
  stemIdx: number;
}) {
  const paras = section.body.split('\n\n').filter((p) => p.trim());
  const [lede, ...rest] = paras;
  return (
    <article className={styles.savedWideArticle} aria-label={drawerSectionTitle(section)}>
      <h3 className={styles.savedWideTitleSub}>{drawerSectionTitle(section)}</h3>
      {lede ? <p className={styles.sectionLede}>{lede}</p> : null}
      {rest.length > 0 ? (
        <div className={`${styles.savedWideBody} ${styles.dtrNarrativeBody}`}>
          {rest.map((para, i) => (
            <BodyPara key={i} para={para} compact={false} />
          ))}
        </div>
      ) : null}
      <GraphCaption id="ch1-structure-radar" />
      <StructureInteractionMapFigures stemIdx={stemIdx} />
    </article>
  );
}

/** 本質と安定 — 4領域パネル（数値なし） */
function StabilityConditionsPanelFigures({ stemIdx }: { stemIdx: number }) {
  const viz = essenceStabilityVizForStem(stemIdx);
  const cells: { key: string; label: string; text: string; mod: string }[] = [
    { key: 'st', label: '安定する条件', text: viz.stabilize, mod: styles.stabCellCalm },
    { key: 'mx', label: '力が出やすい条件', text: viz.maximize, mod: styles.stabCellGrow },
    { key: 'cl', label: '崩れやすい条件', text: viz.collapse, mod: styles.stabCellRisk },
    { key: 'gd', label: '守る条件', text: viz.guard, mod: styles.stabCellGuard },
  ];

  return (
    <div className={styles.idDesignShell} aria-label="安定条件パネル（本質の読み解き）">
      <p className={styles.idDesignOverline}>深読み · 安定条件</p>
      <div className={styles.idDesignBlock}>
        <h3 className={styles.idDesignBlockTitle}>安定しやすい4つの条件</h3>
        <p className={styles.idDesignHint}>
          集中しやすい環境と、人との関わり方をひとつずつ見ています。
        </p>
        <div className={styles.stabGrid}>
          {cells.map((c, i) => (
            <div
              key={c.key}
              className={`${styles.stabCell} ${c.mod} ${styles.idBpReveal}`}
              style={{ animationDelay: `${0.04 + i * 0.06}s` }}
            >
              <span className={styles.stabCellLabel}>{c.label}</span>
              <p className={styles.stabCellText}>{c.text}</p>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.idDesignBlock}>
        <h3 className={styles.idDesignBlockTitle}>力が出る条件と戻し方</h3>
        <div className={styles.idGrowthFlow}>
          <div
            className={`${styles.idGrowthCard} ${styles.idGrowthReveal}`}
            style={{ animationDelay: '0.12s' }}
          >
            <span className={styles.idGrowthTag}>力が出やすいとき</span>
            <p className={styles.idGrowthText}>
              やることの順番が見え、先に整える場所を一つ決められるとき。
            </p>
          </div>
          <div className={styles.idGrowthBetween} aria-hidden>
            <svg className={styles.idGrowthConnH} viewBox="0 0 64 12" preserveAspectRatio="none">
              <path className={styles.idGrowthPath} d="M2 6 L62 6" />
            </svg>
            <svg className={styles.idGrowthConnV} viewBox="0 0 12 64" preserveAspectRatio="none">
              <path className={styles.idGrowthPath} d="M6 2 L6 62" />
            </svg>
          </div>
          <div
            className={`${styles.idGrowthCard} ${styles.idGrowthReveal}`}
            style={{ animationDelay: '0.2s' }}
          >
            <span className={`${styles.idGrowthTag} ${styles.idGrowthTagMid}`}>止まりやすいとき</span>
            <p className={styles.idGrowthText}>
              同時進行や急かしが重なり、どこから手をつけるか分からなくなるとき。
            </p>
          </div>
          <div className={styles.idGrowthBetween} aria-hidden>
            <svg className={styles.idGrowthConnH} viewBox="0 0 64 12" preserveAspectRatio="none">
              <path className={`${styles.idGrowthPath} ${styles.idGrowthPath2}`} d="M2 6 L62 6" />
            </svg>
            <svg className={styles.idGrowthConnV} viewBox="0 0 12 64" preserveAspectRatio="none">
              <path className={`${styles.idGrowthPath} ${styles.idGrowthPath2}`} d="M6 2 L6 62" />
            </svg>
          </div>
          <div
            className={`${styles.idGrowthCard} ${styles.idGrowthReveal}`}
            style={{ animationDelay: '0.28s' }}
          >
            <span className={`${styles.idGrowthTag} ${styles.idGrowthTagEnd}`}>戻し方</span>
            <p className={styles.idGrowthText}>
              今日進めることを一つに絞り、「まずここから」と決めること。
            </p>
          </div>
        </div>
        <p className={styles.idDesignHint}>
          見えた条件は、そのまま答えにするものではありません。
          今いちばん重い作業や予定の中で、先に整える場所を一つ選ぶために使います。
        </p>
      </div>
    </div>
  );
}

function EssenceArticleWithViz({
  section,
  stemIdx,
  nickname,
  openingLedeShown = false,
}: {
  section: DtrSection;
  stemIdx: number;
  nickname?: string;
  openingLedeShown?: boolean;
}) {
  const paras = section.body.split('\n\n').filter((p) => p.trim());
  const nick = nickname?.trim();
  const displayName = nick ? clampDisplayNick(stripTrailingHonorific(nick) || nick, 20) : 'あなた';
  const bodyParas = [
    `${displayName}さんは、動き始める前に「何を先に整えるか」が見えると、力を出しやすくなります。勢いだけで進めるより、順番や置き方が見えるほうが、自分の力を使いやすくなります。`,
    '同時にいくつものことを求められたり、急かされる流れが続くと、どこから手をつけるかが見えにくくなります。その状態で無理に進めようとすると、動いているのに疲れだけが残りやすくなります。',
    'まずは、今日やることを一つだけに絞ります。全部を整えてから進むのではなく、「ここだけ先に整える」と決めると、動き出しやすくなります。',
  ];
  const inlineLede = openingLedeShown ? null : paras[0];
  return (
    <article className={styles.savedWideArticle} aria-label={drawerSectionTitle(section)}>
      <h3 className={styles.savedWideTitleSub}>{drawerSectionTitle(section)}</h3>
      {inlineLede ? <p className={styles.sectionLede}>{inlineLede}</p> : null}
      {bodyParas.length > 0 ? (
        <div className={`${styles.savedWideBody} ${styles.dtrNarrativeBody}`}>
          {bodyParas.map((para, i) => (
            <BodyPara key={i} para={para} compact={false} />
          ))}
        </div>
      ) : null}
      <p className={styles.chapterPilotGuideText}>
        この図では、{displayName}さんがどんな条件で進みやすく、どんな流れで止まりやすいかを見ます。仕事やこれからの動きは、気合いだけで進めるより、先に整える場所を見つけるほうが扱いやすくなります。
      </p>
      <GraphCaption id="ch2-stability-panel" />
      <StabilityConditionsPanelFigures stemIdx={stemIdx} />
    </article>
  );
}

function commFlowShortLabel(header: string): string {
  if (header.includes('受け取り')) return '受け取り';
  if (header === '伝え方' || header.includes('渡し')) return '渡し';
  if (header === '距離の取り方' || header.includes('引き')) return '引き';
  if (header.includes('会話') || header.includes('リズム')) return 'リズム';
  return header.slice(0, 3);
}

function clampDisplayNick(raw: string, max: number): string {
  const s = raw.trim();
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

/** 自分の出やすい面 — 出やすさの鍵 + 合流線（本文は親でそのまま表示） */
function StrengthsLiftFigures({ body, nickname }: { body: string; nickname?: string }) {
  const items = parseBlockItems(body).slice(0, 3);
  if (items.length === 0) return null;

  const nick = nickname?.trim();
  const displayNick = nick ? clampDisplayNick(stripTrailingHonorific(nick) || nick, 20) : null;
  const merge3Caption = displayNick
    ? `この三つが重なると、仕事や日常の中で、${displayNick}さんの力が伝わりやすくなります。`
    : 'この三つが重なると、仕事や日常の中で、見えている力が伝わりやすくなります。';

  return (
    <div className={`${styles.idDesignShell} ${styles.gridInsertShell}`} aria-label="出方の可視化">
      <p className={styles.idDesignOverline}>深読み · 出やすさの鍵</p>
      <div className={styles.idDesignBlock}>
        <h3 className={`${styles.idDesignBlockTitle} ${styles.gridInsertBlockTitle}`}>
          人に届きやすい力
        </h3>
        <div className={styles.liftStack}>
          {items.map((it, i) => (
            <div
              key={it.header}
              className={`${styles.liftCard} ${styles.idBpReveal}`}
              style={{ animationDelay: `${0.04 + i * 0.07}s` }}
            >
              <div className={styles.liftCardTop}>
                <span className={styles.liftIndex}>{String(i + 1).padStart(2, '0')}</span>
                <span className={styles.liftName}>{it.header}</span>
              </div>
              <p className={styles.liftLead}>{firstSentence(it.content)}</p>
            </div>
          ))}
        </div>
        {items.length >= 2 ? (
          <>
            <svg className={styles.liftMergeSvg} viewBox="0 0 120 40" aria-hidden focusable="false">
              {items.length >= 3 ? (
                <>
                  <path
                    pathLength={100}
                    d="M 18 6 L 60 32"
                    className={styles.liftMergePath}
                    style={{ animationDelay: '0.26s' }}
                  />
                  <path
                    pathLength={100}
                    d="M 60 6 L 60 32"
                    className={styles.liftMergePath}
                    style={{ animationDelay: '0.33s' }}
                  />
                  <path
                    pathLength={100}
                    d="M 102 6 L 60 32"
                    className={styles.liftMergePath}
                    style={{ animationDelay: '0.4s' }}
                  />
                </>
              ) : (
                <>
                  <path
                    pathLength={100}
                    d="M 32 6 L 60 30"
                    className={styles.liftMergePath}
                    style={{ animationDelay: '0.28s' }}
                  />
                  <path
                    pathLength={100}
                    d="M 88 6 L 60 30"
                    className={styles.liftMergePath}
                    style={{ animationDelay: '0.36s' }}
                  />
                </>
              )}
            </svg>
            <p className={styles.liftMergeCaption}>
              {items.length >= 3
                ? merge3Caption
                : '複数の傾向が重なると、仕事や日常の中で力として出やすくなります。'}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}

/** 無理が出やすいところ — warning カード列 */
function FrictionWarningFigures({ body }: { body: string }) {
  const items = parseBlockItems(body);
  if (items.length === 0) return null;

  return (
    <div className={`${styles.idDesignShell} ${styles.gridInsertShell}`} aria-label="注意の可視化">
      <p className={styles.idDesignOverline}>深読み · つまずき方をひとつずつ見る</p>
      <div className={styles.idDesignBlock}>
        <h3 className={`${styles.idDesignBlockTitle} ${styles.gridInsertBlockTitle}`}>
          つまずきやすい場面
        </h3>
        <p className={styles.gridInsertHint}>
          ここでは、どんな時に無理が出やすいかを先に見ていきます。
        </p>
        <div className={styles.warnList}>
          {items.map((it, i) => (
            <div
              key={it.header}
              className={`${styles.warnCard} ${styles.idBpReveal}`}
              style={{ animationDelay: `${0.05 + i * 0.07}s` }}
            >
              <span className={styles.warnStripe} aria-hidden />
              <div className={styles.warnInner}>
                <span className={styles.warnTitle}>{it.header}</span>
                <p className={styles.warnLead}>{firstSentence(it.content)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.idDesignBlock}>
        <h3 className={styles.idDesignBlockTitle}>近い人との向き合い方と戻し方</h3>
        <div className={styles.idGrowthFlow}>
          <div
            className={`${styles.idGrowthCard} ${styles.idGrowthReveal}`}
            style={{ animationDelay: '0.12s' }}
          >
            <span className={styles.idGrowthTag}>力が出やすいとき</span>
            <p className={styles.idGrowthText}>
              落ち着いて相手の言葉を聞き、自分の気持ちも少しずつ言葉にできるとき。
            </p>
          </div>
          <div className={styles.idGrowthBetween} aria-hidden>
            <svg className={styles.idGrowthConnH} viewBox="0 0 64 12" preserveAspectRatio="none">
              <path className={styles.idGrowthPath} d="M2 6 L62 6" />
            </svg>
            <svg className={styles.idGrowthConnV} viewBox="0 0 12 64" preserveAspectRatio="none">
              <path className={styles.idGrowthPath} d="M6 2 L6 62" />
            </svg>
          </div>
          <div
            className={`${styles.idGrowthCard} ${styles.idGrowthReveal}`}
            style={{ animationDelay: '0.2s' }}
          >
            <span className={`${styles.idGrowthTag} ${styles.idGrowthTagMid}`}>止まりやすいとき</span>
            <p className={styles.idGrowthText}>
              分かってほしい気持ちが強くなり、言葉が強くなったり、距離が近くなりすぎるとき。
            </p>
          </div>
          <div className={styles.idGrowthBetween} aria-hidden>
            <svg className={styles.idGrowthConnH} viewBox="0 0 64 12" preserveAspectRatio="none">
              <path className={`${styles.idGrowthPath} ${styles.idGrowthPath2}`} d="M2 6 L62 6" />
            </svg>
            <svg className={styles.idGrowthConnV} viewBox="0 0 12 64" preserveAspectRatio="none">
              <path className={`${styles.idGrowthPath} ${styles.idGrowthPath2}`} d="M6 2 L6 62" />
            </svg>
          </div>
          <div
            className={`${styles.idGrowthCard} ${styles.idGrowthReveal}`}
            style={{ animationDelay: '0.28s' }}
          >
            <span className={`${styles.idGrowthTag} ${styles.idGrowthTagEnd}`}>戻し方</span>
            <p className={styles.idGrowthText}>
              すぐに結論を出さず、まず一呼吸おいて、言葉を短く整えること。
            </p>
          </div>
        </div>
        <p className={styles.idDesignHint}>
          見えた出方は、そのまま答えにするものではありません。
          いまいちばん気になるやりとりの中で、言葉と距離を少し整えるために使います。
        </p>
      </div>
    </div>
  );
}

/** コミュニケーションの形 — 縦のフロー（グリッド幅でも破綻しにくい） */
function CommFlowFigures({ body }: { body: string }) {
  const items = parseBlockItems(body);
  if (items.length === 0) return null;

  return (
    <div className={`${styles.idDesignShell} ${styles.gridInsertShell}`} aria-label="対話の流れ">
      <p className={styles.idDesignOverline}>深読み · 受け取り方と伝え方</p>
      <div className={styles.idDesignBlock}>
        <h3 className={`${styles.idDesignBlockTitle} ${styles.gridInsertBlockTitle}`}>
          やりとりで起きやすい流れ
        </h3>
        <div className={styles.commFlowCol}>
          {items.map((it, i) => (
            <div key={it.header} className={styles.commFlowStep}>
              <div
                className={`${styles.commNode} ${styles.idBpReveal}`}
                style={{ animationDelay: `${0.04 + i * 0.07}s` }}
              >
                <span className={styles.commTag}>{commFlowShortLabel(it.header)}</span>
                <span className={styles.commHead}>{it.header}</span>
                <p className={styles.commLead}>{firstSentence(it.content)}</p>
              </div>
              {i < items.length - 1 ? (
                <div className={styles.commBetweenV} aria-hidden>
                  <svg className={styles.commBetweenSvg} viewBox="0 0 16 40" preserveAspectRatio="none">
                    <path
                      pathLength={100}
                      d="M8 4 L8 36"
                      className={styles.commPath}
                      style={{ animationDelay: `${0.1 + i * 0.08}s` }}
                    />
                  </svg>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GridArticleStrengthsViz({
  section,
  nickname,
}: {
  section: DtrSection;
  nickname?: string;
}) {
  const strengthItems = parseBlockItems(section.body);
  const remainingItems = strengthItems.slice(3);

  return (
    <article className={styles.savedGridArticle} aria-label={drawerSectionTitle(section)}>
      <h3 className={styles.savedGridTitle}>{drawerSectionTitle(section)}</h3>
      <GraphCaption id="ch2-strengths-lift" />
      <StrengthsLiftFigures body={section.body} nickname={nickname} />
      {remainingItems.length > 0 ? (
        <div className={`${styles.savedGridBody} ${styles.dtrNarrativeBody}`}>
          {remainingItems.map((it) => (
            <p key={it.header} className={styles.savedGridPara}>
              {it.header} {firstSentence(it.content)}
            </p>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function GridArticleFrictionViz({
  section,
  nickname,
  openingLedeShown = false,
}: {
  section: DtrSection;
  nickname?: string;
  openingLedeShown?: boolean;
}) {
  const paras = section.body.split('\n\n').filter((p) => p.trim());
  const nick = nickname?.trim();
  const displayName = nick ? clampDisplayNick(stripTrailingHonorific(nick) || nick, 20) : 'あなた';
  const bodyParas = [
    `${displayName}さんは、大切な人との関係ほど、雑に済ませず丁寧に向き合おうとします。相手の言葉や表情、少しの変化にも気づきやすく、関係を大事にしようとする力があります。`,
    'ただし、近い人とのやりとりでは、分かってほしい気持ちが強くなるほど、言葉を選びすぎたり、逆に強く出てしまうことがあります。相手の反応を気にしすぎると、自分の中で抱え込みやすくなります。',
    'まずは、相手を変えようとする前に、自分の言葉と距離を少し整えます。すぐに結論を出そうとせず、「今は近づきすぎていないか」「言葉が強くなっていないか」を見るだけでも、関係を扱いやすくなります。',
  ];
  const inlineLede = openingLedeShown ? null : paras[0];
  return (
    <article className={styles.savedGridArticle} aria-label={drawerSectionTitle(section)}>
      <h3 className={styles.savedGridTitle}>{drawerSectionTitle(section)}</h3>
      {inlineLede ? <p className={styles.sectionLede}>{inlineLede}</p> : null}
      {bodyParas.length > 0 ? (
        <div className={`${styles.savedGridBody} ${styles.dtrNarrativeBody}`}>
          {bodyParas.map((para, i) => (
            <BodyPara key={i} para={para} compact={false} />
          ))}
        </div>
      ) : null}
      <p className={styles.chapterPilotGuideText}>
        この図では、{displayName}さんが近い人との関係で、どこに力が入りやすく、どこで無理が出やすいかを見ます。大切な人とのやりとりは、正解を急ぐより、言葉と距離を少し整えるほうが扱いやすくなります。
      </p>
      <GraphCaption id="ch3-friction-warning" />
      <FrictionWarningFigures body={section.body} />
    </article>
  );
}

function GridArticleCommViz({ section }: { section: DtrSection }) {
  return (
    <article className={styles.savedGridArticle} aria-label={drawerSectionTitle(section)}>
      <h3 className={styles.savedGridTitle}>{drawerSectionTitle(section)}</h3>
      <GraphCaption id="ch3-comm-flow" />
      <CommFlowFigures body={section.body} />
    </article>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   C. Deep Analysis — paid-only modules.
   Each module is a native M55 section: overline + serif title + coreSurface.
   Not a "report insert box" — same family as /core sections, elevated tint.
   ───────────────────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────────────────
   Accordion shell — shared wrapper for all paid deep-read modules.
   Each module function now returns pure content; PaidModuleShell owns the
   section chrome, header, open/close state, and smooth grid transition.
   ───────────────────────────────────────────────────────────────────────────── */

function PaidModuleShell({
  n,
  tierJa,
  tierClass,
  overline,
  title,
  ariaLabel,
  summary,
  defaultOpen,
  inDrawer,
  children,
}: {
  n: number;
  tierJa: string;
  tierClass: string;
  overline: string;
  title: string;
  ariaLabel: string;
  summary: string;
  defaultOpen: boolean;
  inDrawer?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = `pm-body-${n}`;

  function toggle() {
    setOpen((o) => !o);
  }
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  }

  return (
    <section
      className={`${styles.module} ${styles.modulePaid} ${styles.prModuleShell}${inDrawer ? ` ${styles.pmInDrawer}` : ''}`}
      aria-label={ariaLabel}
    >
      {/* Accordion trigger — the whole header area is interactive */}
      <div
        role="button"
        tabIndex={0}
        className={styles.pmAccordionTrigger}
        onClick={toggle}
        onKeyDown={handleKey}
        aria-expanded={open}
        aria-controls={bodyId}
      >
        <PremiumModuleLead n={n} tierJa={tierJa} tierClass={tierClass} />
        <span className={styles.moduleOverline}>{overline}</span>
        <div className={styles.pmTitleRow}>
          <h3 className={styles.moduleTitle}>{title}</h3>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            focusable="false"
            className={`${styles.pmChevron}${open ? ` ${styles.pmChevronOpen}` : ''}`}
          >
            <path
              d="M4 6 L8 10 L12 6"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {!open && (
          <>
            <p className={styles.pmSummary}>{summary}</p>
            <span className={styles.pmExpandChip} aria-hidden="true">開いて読む</span>
          </>
        )}
      </div>

      {/* Animated body — grid-template-rows 0fr → 1fr */}
      <div
        id={bodyId}
        className={`${styles.pmBody}${open ? ` ${styles.pmBodyOpen}` : ''}`}
      >
        <div className={styles.pmBodyInner}>{children}</div>
      </div>
    </section>
  );
}

function FiveAxisModule({ stemIdx }: { stemIdx: number }) {
  const data = AXIS_DATA[stemIdx] ?? AXIS_DATA[0]!;
  const summary = axisVizSummaryDisplay(data.balance);

  const summaryRows: { key: string; label: string; val: string }[] = [
    { key: 'primary', label: summary.primaryLabel, val: chapter1SoftTone(summary.primaryVal) },
    { key: 'assist', label: summary.assistLabel, val: chapter1SoftTone(summary.assistVal) },
    { key: 'grow', label: summary.growLabel, val: chapter1SoftTone(summary.growVal) },
  ];

  return (
    <>
      <p className={styles.chapterPilotGuideText}>
        5つの力は、点数ではありません。今の自分に出やすい力と、整うと使いやすくなる力を分けて見ると、今の悩みを読み直しやすくなります。
      </p>
      <GraphCaption id="ch1-five-axis" />
      <div className={styles.axisVizSummary} aria-label="力のバランスの要約">
        {summaryRows.map((row) => (
          <div key={row.key} className={styles.axisVizSummaryRow}>
            <span className={styles.axisVizSummaryKeyWide}>{row.label}</span>
            <span className={styles.axisVizSummaryVal}>{row.val}</span>
          </div>
        ))}
      </div>

      <div className={styles.axisVizList}>
        {AXIS_LABELS.map((label, i) => {
          const level = data.balance[i] ?? 0;
          const color = AXIS_COLORS[i] ?? '#9E92BE';
          const desc = AXIS_DESCS[i] ?? '';
          const role = axisRoleFromLevel(level);

          return (
            <div
              key={label}
              className={`${styles.axisVizRow} ${styles.vizReveal}`}
              style={{ animationDelay: `${0.04 + i * 0.05}s` }}
            >
              <div className={styles.axisVizRowTop}>
                <span
                  className={styles.axisVizDot}
                  style={{ background: color }}
                  aria-hidden
                />
                <div className={styles.axisVizTextCol}>
                  <span className={styles.axisVizName}>{label}</span>
                  <span className={styles.axisVizDesc}>{desc}</span>
                </div>
                <span className={`${styles.axisRoleBadge} ${role.badgeClass}`}>
                  {role.badge}
                </span>
              </div>
              <p className={styles.axisVizInterpret}>
                {chapter1SoftTone(axisRoleInterpretLine(label, level))}
              </p>
            </div>
          );
        })}
      </div>
      <p className={`${styles.moduleNote} ${styles.prModuleInsight}`}>
        この見え方は、そのまま答えにするものではありません。
      </p>
      <p className={styles.chapterPilotGuideText}>
        次は「進め方」「近い人」「整え方」のうち、今いちばん重い場面で使います。
      </p>
    </>
  );
}

function TraitInteractionModule({
  strengthsSection,
  frictionSection,
  stemIdx,
}: {
  strengthsSection: DtrSection;
  frictionSection: DtrSection;
  stemIdx: number;
}) {
  const strengths = parseBlockItems(strengthsSection.body);
  const frictions = parseBlockItems(frictionSection.body);
  const note = INTERACTION_NOTE[stemIdx] ?? '';

  return (
    <>
      <GraphCaption id="ch2-trait-interaction" />
      {note && <p className={`${styles.moduleNote} ${styles.prModuleInsight}`}>{note}</p>}
      <div className={styles.interactionGrid}>
        <div className={styles.interactionCol}>
          <div className={styles.interactionColTitle}>力が出やすい組み合わせ</div>
          <div className={styles.traitList}>
            {strengths.map((s) => (
              <div key={s.header} className={styles.traitCard}>
                {s.header}
              </div>
            ))}
          </div>
        </div>
        <div className={styles.interactionCol}>
          <div className={styles.interactionColTitle}>無理が出やすい組み合わせ</div>
          <div className={styles.traitList}>
            {frictions.map((f) => (
              <div key={f.header} className={styles.traitCardFriction}>
                {f.header}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Domain matrix — redesigned as card grid for instant readability.
   Each domain is a card with overline label + prominent value sentence.
   Replaces the old 2-column table that required decoding.
   ───────────────────────────────────────────────────────────────────────────── */

function DomainMatrixModule({
  essenceSection,
  relationSection,
  workSection,
  compositionSection,
}: {
  essenceSection: DtrSection;
  relationSection: DtrSection;
  workSection: DtrSection;
  compositionSection?: DtrSection;
}) {
  const workItems = parseBlockItems(workSection.body);
  const relationItems = parseBlockItems(relationSection.body);

  const workCond = workItems.find((i) => i.header === '力が出る条件')?.content ?? '';
  const workStuck = workItems.find((i) => i.header === '詰まりやすい条件')?.content ?? '';
  const workHint = workItems.find((i) => i.header === '生活のヒント')?.content ?? '';
  const receiveWay = relationItems.find((i) => i.header === '受け取り方')?.content ?? '';
  const withdrawWay =
    relationItems.find((i) => i.header === '引き方' || i.header === '距離の取り方')?.content ??
    '';
  const convRhythm = relationItems.find((i) => i.header === '会話のリズム')?.content ?? '';

  const usedDisplay = new Set<string>();

  const domainTiles = [
    {
      key: 'work',
      title: '仕事',
      strength: resolveDomainSlot('strength', [firstSentence(workCond)], usedDisplay),
      load: resolveDomainSlot('load', [firstSentence(workStuck)], usedDisplay),
      recovery: resolveDomainSlot(
        'recovery',
        domainLifeRecoveryCandidates(workHint),
        usedDisplay,
        true,
      ),
    },
    {
      key: 'social',
      title: '人間関係',
      strength: resolveDomainSlot('strength', [firstSentence(receiveWay)], usedDisplay),
      load: resolveDomainSlot('load', [domainSocialReceiveLoad(receiveWay)], usedDisplay),
      recovery: resolveDomainSlot('recovery', [domainSocialRecovery(convRhythm)], usedDisplay),
    },
    {
      key: 'close',
      title: '近い関係',
      strength: resolveDomainSlot('strength', [firstSentence(convRhythm)], usedDisplay),
      load: resolveDomainSlot('load', [domainCloseLoad(withdrawWay)], usedDisplay),
      recovery: resolveDomainSlot(
        'recovery',
        [
          pickSentenceWithKeyword(withdrawWay, /急かされない時間|整理する時間/),
          firstSentence(withdrawWay),
        ],
        usedDisplay,
        true,
      ),
    },
    {
      key: 'judgment',
      title: '判断',
      strength: resolveDomainSlot(
        'strength',
        [domainJudgmentStrength(essenceSection.body)],
        usedDisplay,
      ),
      load: resolveDomainSlot(
        'load',
        [domainJudgmentLoad(essenceSection.body, workStuck)],
        usedDisplay,
      ),
      recovery: resolveDomainSlot(
        'recovery',
        domainJudgmentRecoveryCandidates(compositionSection?.body, workHint),
        usedDisplay,
        true,
      ),
    },
    {
      key: 'recovery',
      title: '回復',
      strength: resolveDomainSlot(
        'strength',
        [
          firstSentence(workCond),
          pickSentenceWithKeyword(workHint, /手ごたえ|続く|整える/),
        ],
        usedDisplay,
        true,
      ),
      load: resolveDomainSlot('load', [domainRecoveryLoad(workStuck)], usedDisplay),
      recovery: resolveDomainSlot(
        'recovery',
        domainLifeRecoveryCandidates(workHint),
        usedDisplay,
        true,
      ),
    },
  ];

  return (
    <>
      <GraphCaption id="ch3-domain-scenes" />
      <div className={styles.domainMatrix}>
        {domainTiles.map((d, di) => (
          <div
            key={d.key}
            className={`${styles.domainTile} ${styles.vizReveal}`}
            style={{ animationDelay: `${0.05 + di * 0.06}s` }}
          >
            <div className={styles.domainTileTitle}>{d.title}</div>
            <div className={styles.domainTileRows}>
              <div className={styles.domainTileBand}>
                <span className={`${styles.domainTileGlyph} ${styles.domainTileGlyphPlus}`} aria-hidden>
                  出
                </span>
                <div className={styles.domainTileCell}>
                  <span className={styles.domainTileMicro}>出方</span>
                  <p className={styles.domainTileText}>
                    {dtrDisplayOrFallback(d.strength, DTR_DISPLAY_FALLBACK_STRENGTH)}
                  </p>
                </div>
              </div>
              <div className={styles.domainTileBand}>
                <span className={`${styles.domainTileGlyph} ${styles.domainTileGlyphMinus}`} aria-hidden>
                  負
                </span>
                <div className={styles.domainTileCell}>
                  <span className={styles.domainTileMicro}>負荷</span>
                  <p className={styles.domainTileText}>
                    {dtrDisplayOrFallback(d.load, DTR_DISPLAY_FALLBACK_LOAD)}
                  </p>
                </div>
              </div>
              <div className={`${styles.domainTileBand} ${styles.domainTileBandRecovery}`}>
                <span className={`${styles.domainTileGlyph} ${styles.domainTileGlyphLoop}`} aria-hidden>
                  戻
                </span>
                <div className={styles.domainTileCell}>
                  <span className={styles.domainTileMicro}>戻し方</span>
                  <p className={styles.domainTileText}>
                    {dtrDisplayOrFallback(d.recovery, DTR_DISPLAY_FALLBACK_RECOVERY)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/** Ⅳ章・つまずきから戻る流れ：生活・余白向け固定表示（s5/s8 engine 見出しは使わない） */
const CH4_FRICTION_RECOVERY_FLOW: {
  stage: string;
  title: string;
  body: string;
}[] = [
  {
    stage: '入口・トリガー',
    title: '不安や予定が重なる',
    body: 'お金、予定、やること、疲れが重なるほど、何から手をつけるか分からなくなりやすいです。',
  },
  {
    stage: 'つまずきの型',
    title: '全部を一度に決めようとする',
    body: '一気に答えを出そうとすると、考えることが増え、判断がさらに重くなりやすくなります。',
  },
  {
    stage: '消耗が寄りやすい点',
    title: '休む前に片付けようとする',
    body: '疲れているのに先に全部片付けようとすると、余白が戻る前に力を使い切りやすくなります。',
  },
  {
    stage: '回復の方向',
    title: '負担を一つ軽くする',
    body: '今日決めなくていいことを一つ横に置き、休める時間を先に作ると、戻る場所が見えやすくなります。',
  },
];

function FrictionRecoveryModule({
  frictionSection,
  bridgeSection,
  lifeTopicRecovery = false,
}: {
  frictionSection: DtrSection;
  bridgeSection: DtrSection;
  /** Ⅳ章：お金・生活・疲れ向け固定文（engine 摩擦見出しフォールバックを使わない） */
  lifeTopicRecovery?: boolean;
}) {
  const flowNodes: { key: string; stage: string; title: string; body: string }[] = (() => {
    if (lifeTopicRecovery) {
      return CH4_FRICTION_RECOVERY_FLOW.map((node, i) => ({
        key: `ch4-recovery-${i}`,
        stage: node.stage,
        title: node.title,
        body: node.body,
      }));
    }

    const frictions = parseBlockItems(frictionSection.body);
    const bridgeParts = bridgeSection.body
      .split('\n\n')
      .map((p) => p.trim())
      .filter(Boolean);
    /** 2段落目 = 戻し方・運用（1段落目はまとめで使用） */
    const bridgeText = premiumBridgeRecoveryHint(
      bridgeParts.length >= 2 ? bridgeParts[1]! : bridgeParts[0] ?? bridgeSection.body
    );

    const stageLabels = ['入口・トリガー', 'つまずきの型', '消耗が寄りやすい点'];
    const nodes = frictions.slice(0, 3).map((f, i) => ({
      key: `f-${i}-${f.header}`,
      stage: stageLabels[Math.min(i, 2)] ?? stageLabels[2]!,
      title: f.header,
      body: firstSentence(f.content),
    }));
    nodes.push({
      key: 'recovery',
      stage: '回復の方向',
      title: '戻し方のヒント',
      body: bridgeText,
    });
    return nodes;
  })();

  return (
    <>
      <GraphCaption id="ch4-friction-recovery" />
      <div className={styles.flowTrack} role="list">
        {flowNodes.map((node, i) => (
          <div
            className={`${styles.flowTrackUnit} ${styles.vizReveal}`}
            key={node.key}
            role="listitem"
            style={{ animationDelay: `${0.06 + i * 0.08}s` }}
          >
            <div className={styles.flowCard}>
              <span className={styles.flowStage}>{node.stage}</span>
              <h4 className={styles.flowTitle}>{node.title}</h4>
              <p className={styles.flowBody}>{node.body}</p>
            </div>
            {i < flowNodes.length - 1 ? (
              <div className={styles.flowConnector} aria-hidden>
                <span className={styles.flowArrowLine} />
                <span className={styles.flowArrowHead} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   D. Practical Guidance
   ───────────────────────────────────────────────────────────────────────────── */

/** Ⅳ章・実践ガイド：生活・余白向け固定表示（stemLaneIndex 非依存） */
const CH4_PRACTICAL_GUIDANCE_CATEGORIES: {
  title: string;
  icon: 'work' | 'relationship' | 'recovery';
  rows: { action: string; why: string; when: string }[];
}[] = [
  {
    title: '予定と余白',
    icon: 'work',
    rows: [
      {
        action: '今日決めなくていいことを一つ横に置き、休める時間を先に置く。',
        why: '守る習慣として余白を先に確保すると、全部を一度に決めようとしにくくなります。',
        when: '不安が強く、何から手をつけるか分からないとき。',
      },
    ],
  },
  {
    title: '生活の負荷と余白',
    icon: 'work',
    rows: [
      {
        action: 'お金・予定・疲れが重なるときは、まず何を減らせるかを一つだけ見る。',
        why: '減らす習慣として、まず一つ見える化すると、負担の置き場所が分かりやすくなります。',
        when: 'お金や生活のことが重なり、何から手をつけるか分からないとき。',
      },
    ],
  },
  {
    title: '疲れと戻り方',
    icon: 'recovery',
    rows: [
      {
        action: '疲れが残っているときは、学びや作業を増やす前に、続けられる形まで小さくする。',
        why: '疲れが残ったまま決め続けると、判断がさらに重くなりやすくなります。',
        when: '予定が詰まり始め、休む前に片付けようとしているとき。',
      },
    ],
  },
];

function PracticalGuidanceSection({
  workSection,
  relationSection,
  stemIdx,
  lifeTopicGuidance = false,
}: {
  workSection: DtrSection;
  relationSection: DtrSection;
  stemIdx: number;
  /** Ⅳ章：お金・生活・疲れ向け固定文（engine 抜粋フォールバックを使わない） */
  lifeTopicGuidance?: boolean;
}) {
  const workItems = parseBlockItems(workSection.body);
  const relationItems = parseBlockItems(relationSection.body);

  const workPower = workItems.find((i) => i.header === '力が出る条件')?.content ?? '';
  const workStuck = workItems.find((i) => i.header === '詰まりやすい条件')?.content ?? '';
  const lifeHint = workItems.find((i) => i.header === '生活のヒント')?.content ?? '';
  const receiveWay = relationItems.find((i) => i.header === '受け取り方')?.content ?? '';
  const withdrawWay =
    relationItems.find((i) => i.header === '引き方' || i.header === '距離の取り方')?.content ??
    '';

  const categories: {
    title: string;
    icon: 'work' | 'relationship' | 'recovery';
    rows: { action: string; why: string; when: string }[];
  }[] = (() => {
    if (lifeTopicGuidance) return CH4_PRACTICAL_GUIDANCE_CATEGORIES;

    const used = new Set<string>();
    return [
      {
        title: '日々の判断と距離',
        icon: 'work' as const,
        rows: [
          {
            action: pickUniqueDisplaySentence(
              [firstSentence(workPower)],
              used,
              DTR_DISPLAY_FALLBACK_STRENGTH,
            ),
            why: pickUniqueDisplaySentence(
              [firstSentence(workStuck)],
              used,
              DTR_DISPLAY_FALLBACK_LOAD,
            ),
            when: pickUniqueDisplaySentence(
              [
                pickSentenceWithKeyword(lifeHint, /ための時間|区切り|ここまで|休み/),
                afterFirstSentence(lifeHint),
                firstSentence(lifeHint),
              ],
              used,
              DTR_DISPLAY_FALLBACK_TIMING,
              { blockLifeMisplacement: true },
            ),
          },
        ],
      },
      {
        title: '人間関係の境界線',
        icon: 'relationship' as const,
        rows: [
          {
            action: pickUniqueDisplaySentence(
              [firstSentence(withdrawWay)],
              used,
              DTR_DISPLAY_FALLBACK_NEUTRAL,
            ),
            why: pickUniqueDisplaySentence(
              [firstSentence(receiveWay), afterFirstSentence(receiveWay)],
              used,
              DTR_DISPLAY_FALLBACK_SOFT,
            ),
            when: pickUniqueDisplaySentence(
              [afterFirstSentence(withdrawWay)],
              used,
              DTR_DISPLAY_FALLBACK_UNWORDED,
            ),
          },
        ],
      },
      {
        title: '疲労と回復',
        icon: 'recovery' as const,
        rows: [
          {
            action: pickUniqueDisplaySentence(
              [firstSentence(lifeHint)],
              used,
              DTR_DISPLAY_FALLBACK_NEUTRAL,
            ),
            why: pickUniqueDisplaySentence(
              [domainRecoveryLoad(workStuck), afterFirstSentence(workStuck), afterFirstSentence(lifeHint)],
              used,
              DTR_DISPLAY_FALLBACK_SOFT,
            ),
            when: pickUniqueDisplaySentence(
              [
                pickSentenceWithKeyword(lifeHint, /ための時間|区切り|ここまで|休み|静か/),
                afterFirstSentence(lifeHint),
                firstSentence(lifeHint),
              ],
              used,
              DTR_DISPLAY_FALLBACK_TIMING,
              { blockLifeMisplacement: true },
            ),
          },
        ],
      },
    ];
  })();

  const ch4Intro = lifeTopicGuidance
    ? {
        title: 'この章で試すこと',
        sub: '見える化・減らす・守る——続けられる形で、負担を一つ軽くします。',
      }
    : null;

  return (
    <div className={styles.practicalStack}>
      {lifeTopicGuidance ? null : <GraphCaption id="ch4-practical-guidance" />}
      <div className={styles.practicalIntro}>
        <h2 className={styles.practicalIntroTitle}>
          {ch4Intro?.title ?? 'このレポートの使い方'}
        </h2>
        <p className={styles.practicalIntroSub}>
          {ch4Intro?.sub ?? '今日から少し楽に扱うための実践ガイド'}
        </p>
      </div>
      {categories.map((cat) => (
        <div key={cat.title} className={styles.practicalCategory}>
          <div className={styles.practicalCategoryHead}>
            {cat.icon === 'work' && (
              <svg className={styles.practicalCategoryIcon} viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            {cat.icon === 'relationship' && (
              <svg className={styles.practicalCategoryIcon} viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            {cat.icon === 'recovery' && (
              <svg className={styles.practicalCategoryIcon} viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <h3 className={styles.practicalCategoryTitle}>{cat.title}</h3>
          </div>
          <div className={styles.practicalCategoryBody}>
            {cat.rows.map((row, idx) => (
              <div key={idx} className={styles.practicalActionRow}>
                <div className={styles.practicalActionCell}>
                  <p className={styles.practicalMicroLabel}>行動</p>
                  <p className={styles.practicalActionValue}>
                    {dtrDisplayOrFallback(row.action, DTR_DISPLAY_FALLBACK_NEUTRAL)}
                  </p>
                </div>
                <div className={styles.practicalActionCell}>
                  <p className={styles.practicalMicroLabel}>理由</p>
                  <p className={styles.practicalWhyWhen}>
                    {dtrDisplayOrFallback(row.why, DTR_DISPLAY_FALLBACK_SOFT)}
                  </p>
                </div>
                <div className={styles.practicalActionCell}>
                  <p className={styles.practicalMicroLabel}>タイミング</p>
                  <p className={styles.practicalWhyWhen}>
                    {dtrDisplayOrFallback(row.when, DTR_DISPLAY_FALLBACK_CONSULT)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   D2. Work Guide Cards — S7 本文の4ブロックを読みやすい4枚カードで先出し。
   PracticalGuidanceSection（日常要約版）の手前に置き、本質の読み解きの具体本文へ誘導。
   ───────────────────────────────────────────────────────────────────────────── */

const WORK_CARD_META: {
  key: string;
  icon: string;
  color: string;
}[] = [
  { key: '力が出る条件',      icon: '⚡', color: 'var(--dtr-accent)' },
  { key: '詰まりやすい条件',  icon: '⚠', color: 'rgba(218,165,64,0.88)' },
  { key: '環境のヒント',      icon: '◎', color: 'rgba(88,190,148,0.88)' },
  { key: '生活のヒント',      icon: '●', color: 'rgba(140,170,220,0.88)' },
];

/** Ⅳ章 ch4-work-guide — カード見出し（engine キーはそのまま） */
const CH4_WORK_GUIDE_LABEL_JA: Record<string, string> = {
  '力が出る条件': '本来の力が出るとき',
};

/** Ⅳ章 ch4-work-guide — engine 本文は表示せず、生活・余白の読み解けだけ出す（engine 不変） */
const CH4_WORK_GUIDE_BODY_JA: Record<string, string> = {
  '力が出る条件':
    '余白があり、今日やることを少なくできるとき。休める時間が少し戻ると、学びや作業も、生活の中で使える形に置きやすくなります。',
  '詰まりやすい条件':
    'お金の不安、予定、やることが重なり、何から手をつけるか分からなくなるとき。全部を一度に決めようとすると、さらに重くなりやすいです。',
  '環境のヒント':
    '決めることが少ない時間帯や、予定の前に短く整える隙間があると、負担を戻しやすくなります。',
  '生活のヒント':
    '休める時間を先に置き、今日の予定を一つ手放す習慣。余白が戻るほうが、動きやすくなります。',
};

function LifeMarginRecoveryFigures() {
  return (
    <div className={styles.idDesignBlock}>
      <h3 className={styles.idDesignBlockTitle}>生活の余白と戻し方</h3>
      <div className={styles.idGrowthFlow}>
        <div
          className={`${styles.idGrowthCard} ${styles.idGrowthReveal}`}
          style={{ animationDelay: '0.12s' }}
        >
          <span className={styles.idGrowthTag}>力が出やすいとき</span>
          <p className={styles.idGrowthText}>
            休める時間や余白があり、今やることを少なくできるとき。
          </p>
        </div>
        <div className={styles.idGrowthBetween} aria-hidden>
          <svg className={styles.idGrowthConnH} viewBox="0 0 64 12" preserveAspectRatio="none">
            <path className={styles.idGrowthPath} d="M2 6 L62 6" />
          </svg>
          <svg className={styles.idGrowthConnV} viewBox="0 0 12 64" preserveAspectRatio="none">
            <path className={styles.idGrowthPath} d="M6 2 L6 62" />
          </svg>
        </div>
        <div
          className={`${styles.idGrowthCard} ${styles.idGrowthReveal}`}
          style={{ animationDelay: '0.2s' }}
        >
          <span className={`${styles.idGrowthTag} ${styles.idGrowthTagMid}`}>止まりやすいとき</span>
          <p className={styles.idGrowthText}>
            不安や予定が重なり、全部を一度に決めようとしているとき。
          </p>
        </div>
        <div className={styles.idGrowthBetween} aria-hidden>
          <svg className={styles.idGrowthConnH} viewBox="0 0 64 12" preserveAspectRatio="none">
            <path className={styles.idGrowthPath} d="M2 6 L62 6" />
          </svg>
          <svg className={styles.idGrowthConnV} viewBox="0 0 12 64" preserveAspectRatio="none">
            <path className={styles.idGrowthPath} d="M6 2 L6 62" />
          </svg>
        </div>
        <div
          className={`${styles.idGrowthCard} ${styles.idGrowthReveal}`}
          style={{ animationDelay: '0.28s' }}
        >
          <span className={`${styles.idGrowthTag} ${styles.idGrowthTagEnd}`}>戻し方</span>
            <p className={styles.idGrowthText}>
              まず負担を一つ軽くし、休める時間を先に置くこと。
            </p>
        </div>
      </div>
      <p className={`${styles.idDesignHint} ${styles.ch4LifeMarginHint}`}>
        見えた出方は、そのまま答えにするものではありません。
        今いちばん重く感じている生活の中で、負担を一つ軽くするために使います。
      </p>
    </div>
  );
}

function ChapterFourWorkLead({
  workSection,
  nickname,
}: {
  workSection: DtrSection;
  nickname?: string;
}) {
  const nick = nickname?.trim();
  const displayName = nick ? clampDisplayNick(stripTrailingHonorific(nick) || nick, 20) : 'あなた';
  const bodyParas = [
    `${displayName}さんは、生活の小さな変化や疲れのサインに気づきやすいところがあります。乱れたまま無理に進むより、少しずつ整え直すことで、自分の動きやすさを取り戻しやすくなります。`,
    'ただし、お金の不安、予定、やること、疲れが重なると、何から手をつけるか分からなくなりやすいです。一気に決めようとすると、考えることが増え、さらに疲れが残りやすくなります。余白が戻ると、身につけてきたことも、日々の中で使いやすい形に置き直せます。',
    'まずは、大きく変える前に、今日決めなくていいことを一つ横に置きます。全部を立て直そうとするより、休める時間、減らせる予定、後回しにできることを一つ選ぶほうが、戻る場所が見えやすくなります。',
  ];

  return (
    <>
      <div className={`${styles.savedWideBody} ${styles.dtrNarrativeBody}`}>
        {bodyParas.map((para, i) => (
          <BodyPara key={i} para={para} compact={false} />
        ))}
      </div>
      <p className={styles.chapterPilotGuideText}>
        この図では、{displayName}さんが疲れたときに、どこから余白を戻しやすいかを見ます。
      </p>
      <WorkGuideCards workSection={workSection} lifeTopicBodies />
      <LifeMarginRecoveryFigures />
    </>
  );
}

function WorkGuideCards({
  workSection,
  lifeTopicBodies = false,
}: {
  workSection: DtrSection;
  lifeTopicBodies?: boolean;
}) {
  const items = parseBlockItems(workSection.body);
  if (items.length === 0) return null;
  return (
    <>
      <GraphCaption id="ch4-work-guide" />
      <div className={styles.wgGrid} aria-label="生活の余白と扱いやすさ">
      {WORK_CARD_META.map(({ key, icon, color }) => {
        const item = items.find((it) => it.header === key);
        if (!item) return null;
        const body = lifeTopicBodies
          ? (CH4_WORK_GUIDE_BODY_JA[key] ?? item.content.trim())
          : item.content.trim();
        const label = lifeTopicBodies ? (CH4_WORK_GUIDE_LABEL_JA[key] ?? key) : key;
        return (
          <div key={key} className={styles.wgCard}>
            <div className={styles.wgCardTop}>
              <span className={styles.wgIcon} style={{ color }} aria-hidden>{icon}</span>
              <span className={styles.wgLabel} style={{ color }}>{label}</span>
            </div>
            <p className={styles.wgBody}>{body}</p>
          </div>
        );
      })}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   E. Summary
   ───────────────────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────────────────
   F. 状況が変わったときの使い方 — single-person repeat path only
   ───────────────────────────────────────────────────────────────────────────── */

function ConsultSavedReportAboutBody({ readerDisplayName }: { readerDisplayName: string }) {
  const nick = readerDisplayName.trim();
  const savedLead =
    nick.length > 0
      ? PAID_DTR_CONSULT_ENTRY_LAYOUT.savedReportIntroTemplateJa.replace('{nickname}', `${nick}さん`)
      : PAID_DTR_CONSULT_ENTRY_LAYOUT.savedReportIntroFallbackJa;
  return (
    <div className={styles.consultAboutBody}>
      <p className={styles.consultAboutLead}>{savedLead}</p>
      <p className={styles.consultAboutLead}>{PAID_DTR_CONSULT_ENTRY_LAYOUT.savedReportConsultLeadJa}</p>
      <ul className={styles.consultAboutBullets}>
        {PAID_DTR_CONSULT_ENTRY_LAYOUT.fixedReportBulletsJa.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

function ContinuousSupportCompact() {
  return (
    <div className={styles.supportRepeatCompact}>
      <p className={styles.supportRepeatText}>{PAID_DTR_CONSULT_GROUNDING_COPY.continuousSupportBodyJa}</p>
      <p className={`${styles.supportRepeatText} ${styles.supportRepeatScopeNote}`}>
        {PAID_DTR_CONSULT_GROUNDING_COPY.continuousSupportScopeJa}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   G. Grounding panel — ties consultation room to saved report
   ───────────────────────────────────────────────────────────────────────────── */

/** Grounding の見出し用。エンジン payload.title の表記を画面命名に寄せる（SSOT 本文は未変更）。 */
function groundingDisplayReportTitle(engineTitle: string): string {
  const t = engineTitle.trim();
  const m = /^Entry Report — (.+?)さんの取り扱い説明書$/.exec(t);
  if (m) return `${LABEL_PRODUCT_JP} — ${m[1]}さんの形を読み直す`;
  return t
    .replace(/^Entry Report — /, `${LABEL_PRODUCT_JP} — `)
    .replace(/取り扱い説明書/g, '形を読み直す');
}

function GroundingDocIcon() {
  return (
    <svg className={styles.groundingDocIcon} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="6" y="4" width="20" height="24" rx="2" fill="#E8E4F0" stroke="#9B8AB8" strokeWidth="1.5" />
      <line x1="10" y1="10" x2="22" y2="10" stroke="#9B8AB8" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="14" x2="18" y2="14" stroke="#C4B8D6" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="18" x2="20" y2="18" stroke="#C4B8D6" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function GroundingPanel({
  reportTitle,
  stemOneLine,
  readerDisplayName,
  supplement = false,
}: {
  reportTitle: string;
  stemOneLine: string;
  readerDisplayName: string;
  supplement?: boolean;
}) {
  const nick = readerDisplayName.trim();
  const groundingNoteText =
    nick.length > 0
      ? PAID_DTR_CONSULT_ENTRY_LAYOUT.groundingNoteTemplateJa.replace('{nickname}', `${nick}さん`)
      : PAID_DTR_CONSULT_ENTRY_LAYOUT.groundingNoteFallbackJa;
  return (
    <div className={styles.groundingBandInner}>
      {supplement ? null : (
        <div className={styles.groundingDividerBar} role="presentation">
          <span className={styles.groundingDividerFade} aria-hidden />
          <span className={styles.groundingDividerChip}>
            {PAID_DTR_CONSULT_GROUNDING_COPY.dividerChipJa}
          </span>
          <span className={styles.groundingDividerFade} aria-hidden />
        </div>
      )}

      <div
        className={supplement ? `${styles.groundingPanel} ${styles.groundingPanelSupplement}` : styles.groundingPanel}
        role="complementary"
        aria-label={PAID_DTR_CONSULT_GROUNDING_COPY.entryContextAriaJa}
      >
        {supplement ? (
          <p className={styles.groundingReportTitleCompact}>{reportTitle}</p>
        ) : (
          <div className={styles.groundingHeader}>
            <GroundingDocIcon />
            <div className={styles.groundingHeaderText}>
              <h3 className={styles.groundingTitle}>
                {PAID_DTR_CONSULT_GROUNDING_COPY.titleLine2Ja}。
              </h3>
              <p className={styles.groundingReportTitle}>{reportTitle}</p>
              <p className={styles.groundingSubline}>{stemOneLine}</p>
            </div>
          </div>
        )}

        <div className={styles.groundingPillarGrid}>
          <div className={styles.groundingPillar}>
            <div className={styles.groundingPillarHead}>
              <span className={`${styles.groundingPillarDot} ${styles.groundingPillarDotMint}`} aria-hidden />
              <span className={styles.groundingPillarLabel}>
                {PAID_DTR_CONSULT_GROUNDING_COPY.pillarFlowRefJa}
              </span>
            </div>
            <p className={styles.groundingPillarText}>
              {PAID_DTR_CONSULT_GROUNDING_COPY.pillarFlowTextJa}
            </p>
          </div>
          <div className={styles.groundingPillar}>
            <div className={styles.groundingPillarHead}>
              <span className={`${styles.groundingPillarDot} ${styles.groundingPillarDotAmber}`} aria-hidden />
              <span className={styles.groundingPillarLabel}>
                {PAID_DTR_CONSULT_GROUNDING_COPY.pillarOverlapLabelJa}
              </span>
            </div>
            <p className={styles.groundingPillarText}>
              {PAID_DTR_CONSULT_GROUNDING_COPY.pillarOverlapTextJa}
            </p>
          </div>
          <div className={styles.groundingPillar}>
            <div className={styles.groundingPillarHead}>
              <span className={`${styles.groundingPillarDot} ${styles.groundingPillarDotRose}`} aria-hidden />
              <span className={styles.groundingPillarLabel}>
                {PAID_DTR_CONSULT_GROUNDING_COPY.pillarRecoveryLabelJa}
              </span>
            </div>
            <p className={styles.groundingPillarText}>
              {PAID_DTR_CONSULT_GROUNDING_COPY.pillarRecoveryTextJa}
            </p>
          </div>
        </div>

        <div className={styles.groundingMeta}>
          <span className={styles.groundingMetaLabel}>
            {PAID_DTR_CONSULT_GROUNDING_COPY.groundingMetaLabelJa}
          </span>
          <span className={styles.groundingMetaValue}>
            {PAID_DTR_CONSULT_GROUNDING_COPY.metaReadAxesJa}
          </span>
        </div>
        <p className={styles.groundingNote}>{groundingNoteText}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────────────────────────────────────── */

export default function DtrFullReader({
  ownershipType,
  aiConsultIncluded,
  expiresAt,
  displayedEnvelopeReadMode,
  purchasedSnapshot,
  consultDevPreviewRoomData,
  consultWalletSnapshot = null,
}: Props) {
  const [openPanel, setOpenPanel] = useState<DrawerHubOpenPanel>(null);
  const { user, isLoaded } = useUser();
  const ownerId = user?.id ?? null;

  const selectPanel = useCallback((panel: DrawerHubOpenPanel) => {
    setOpenPanel(panel);
    runAfterDrawerPanelPaint(() => {
      if (panel === null) {
        m55DtrScrollToDrawerHub();
        return;
      }
      m55DtrScrollToDrawerPanel(panel);
      const panelRoot = document.querySelector(m55DtrDrawerPanelSelector(panel));
      const band = panelRoot?.querySelector('[id^="section-"]');
      if (band instanceof HTMLElement && REPORT_PARTS.some((p) => p.anchor === band.id)) {
        band.classList.add(styles.reportPartBandLanding);
        window.setTimeout(() => band.classList.remove(styles.reportPartBandLanding), 1400);
      }
    });
  }, []);

  /** Checkout / processing 経由後も、device-local → Clerk へ寄せる。 */
  useEffect(() => {
    if (!isLoaded || !ownerId) return;
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('post_purchase') !== '1') return;
      promoteGuestProfileToClerkUser(ownerId);
      promoteGuestCoreSnapshotToClerkUser(ownerId);
      window.dispatchEvent(new Event('m55:profile_updated'));
    } catch {
      /* no-op */
    }
  }, [isLoaded, ownerId]);

  const view = useMemo(() => {
    if (!isLoaded) return { kind: 'loading' as const };

    const env = purchasedSnapshot.envelope;
    const idx = env.auditMeta.stemLaneIndex;
    const stem = TEN_STEM_DISPLAY[idx];
    if (!stem) return { kind: 'loading' as const };
    return {
      kind: 'ready' as const,
      stemIdx: idx,
      stem,
      payload: env.payload,
      birthDate: purchasedSnapshot.profile.birthDate,
      nickname: purchasedSnapshot.profile.nickname,
    };
  }, [isLoaded, purchasedSnapshot]);

  if (view.kind === 'loading') {
    return (
      <div className={styles.reportRoot}>
        <div className={styles.reportMain}>
          <p className={styles.stateMsg}>読み込み中…</p>
        </div>
      </div>
    );
  }

  const { stemIdx, stem, payload } = view;

  const sec = (id: string) => payload.fullSections.find((s) => s.id === id);

  const coreNarrativeSections = payload.fullSections.filter(
    (s) => !['s7_work', 's8_bridge'].includes(s.id)
  );

  const narrativeGridIds = new Set(['s4_strengths', 's5_friction', 's6_relation']);
  const gridSections = (['s4_strengths', 's5_friction', 's6_relation'] as const)
    .map((id) => coreNarrativeSections.find((s) => s.id === id))
    .filter((s): s is DtrSection => Boolean(s));
  const gridS4 = gridSections.find((s) => s.id === 's4_strengths');
  const gridS5 = gridSections.find((s) => s.id === 's5_friction');
  const gridS6 = gridSections.find((s) => s.id === 's6_relation');

  const s1 = sec('s1_identity');
  const s2 = sec('s2_composition');
  const s3 = sec('s3_essence');

  const renderDrawerPanelBody = (panel: DrawerHubPanelId): ReactNode => {
    switch (panel) {
      case 'chapter-1':
        return (
          <>
            <section
              id="dtr-core-analysis"
              className={`${styles.savedReportShell} ${styles.savedReportShellInDrawer} ${styles.coreAnalysisScrollAnchor}`}
              aria-label={PAID_DTR_CHAPTER_DRAWER_INTRO['1'].hubLabelJa}
            >
              <div className={styles.savedWideStack}>
                <ReportPartBand partId="1" />
                <DrawerChapterPersonalLead
                  partId="1"
                  nickname={view.nickname}
                />
                {s1 ? (
                  <IdentityArticleWithBlueprint
                    section={s1}
                    stemIdx={stemIdx}
                    nickname={view.nickname}
                    openingLedeShown={Boolean(sectionOpeningLede(s1.body))}
                  />
                ) : null}
                {s2 ? (
                  <>
                    <CompositionArticleWithViz section={s2} stemIdx={stemIdx} />
                    <div className={styles.chapterPilotBranchGuide} aria-label="次に読む章の目安">
                      <p className={styles.chapterPilotBranchLead}>
                        {PAID_DTR_CHAPTER1_PILOT_GUIDE.branchLeadJa}
                      </p>
                      <ul className={styles.chapterPilotBranchList}>
                        {PAID_DTR_CHAPTER1_PILOT_GUIDE.branchItemsJa.map((item) => (
                          <li key={item} className={styles.chapterPilotBranchItem}>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <ChapterConsultNextAction
                      partId="1"
                      nickname={view.nickname}
                      onOpenConsult={() => selectPanel('consult')}
                    />
                  </>
                ) : null}
              </div>
            </section>
            <div className={styles.drawerDeepReadBlock}>
              <SectionDivider label={PAID_DTR_DEEP_READING_SECTION_TITLE_JA} premium />
              <ChapterDeepReadingTakeaways partId="1" />
              <div className={`${styles.paidModules} ${styles.paidModulesInDrawer}`}>
                <PaidModuleShell
                  n={1}
                  tierJa="力の中心を読む"
                  tierClass={styles.prTierMint}
                  overline="5つの力のバランス"
                  title={PAID_DTR_CHAPTER_GRAPH_CAPTIONS['ch1-five-axis']}
                  ariaLabel="5つの力の分布"
                  summary="5つの力は点数ではなく、今出やすい傾向として見ます。"
                  defaultOpen={false}
                  inDrawer
                >
                  <FiveAxisModule stemIdx={stemIdx} />
                </PaidModuleShell>
              </div>
            </div>
          </>
        );
      case 'chapter-2':
        return (
          <>
            <section
              className={`${styles.savedReportShell} ${styles.savedReportShellInDrawer}`}
              aria-label={PAID_DTR_CHAPTER_DRAWER_INTRO['2'].hubLabelJa}
            >
              <div className={styles.savedWideStack}>
                <ReportPartBand partId="2" />
                <DrawerChapterPersonalLead
                  partId="2"
                  nickname={view.nickname}
                />
                {s3 ? (
                  <EssenceArticleWithViz
                    section={s3}
                    stemIdx={stemIdx}
                    nickname={view.nickname}
                    openingLedeShown={Boolean(sectionOpeningLede(s3.body))}
                  />
                ) : null}
              </div>
              {gridS4 ? (
                <div className={styles.savedWideStack}>
                  <GridArticleStrengthsViz key={gridS4.id} section={gridS4} nickname={view.nickname} />
                </div>
              ) : null}
              {s3 ? (
                <ChapterConsultNextAction
                  partId="2"
                  nickname={view.nickname}
                  onOpenConsult={() => selectPanel('consult')}
                />
              ) : null}
            </section>
            <div className={styles.drawerDeepReadBlock}>
              <SectionDivider label={PAID_DTR_DEEP_READING_SECTION_TITLE_JA} premium />
              <ChapterDeepReadingTakeaways partId="2" />
              <div className={`${styles.paidModules} ${styles.paidModulesInDrawer}`}>
                {sec('s4_strengths') && sec('s5_friction') ? (
                  <PaidModuleShell
                    n={2}
                    tierJa="重なりを見る"
                    tierClass={styles.prTierAmber}
                    overline="出やすい力と無理の重なり"
                    title={PAID_DTR_CHAPTER_GRAPH_CAPTIONS['ch2-trait-interaction']}
                    ariaLabel="傾向と負荷"
                    summary="力が出やすい場面と、無理が重なりやすい場面を並べて見ます。"
                    defaultOpen={false}
                    inDrawer
                  >
                    <TraitInteractionModule
                      strengthsSection={sec('s4_strengths')!}
                      frictionSection={sec('s5_friction')!}
                      stemIdx={stemIdx}
                    />
                  </PaidModuleShell>
                ) : null}
              </div>
            </div>
          </>
        );
      case 'chapter-3':
        return (
          <>
            <section
              className={`${styles.savedReportShell} ${styles.savedReportShellInDrawer}`}
              aria-label={PAID_DTR_CHAPTER_DRAWER_INTRO['3'].hubLabelJa}
            >
              <ReportPartBand partId="3" />
              <DrawerChapterPersonalLead
                partId="3"
                nickname={view.nickname}
              />
              {gridSections.length > 0 ? (
                <div className={styles.savedGridThree}>
                  {gridS5 ? (
                    <GridArticleFrictionViz
                      key={gridS5.id}
                      section={gridS5}
                      nickname={view.nickname}
                      openingLedeShown={Boolean(sectionOpeningLede(gridS5.body))}
                    />
                  ) : null}
                  {gridS6 ? <GridArticleCommViz key={gridS6.id} section={gridS6} /> : null}
                </div>
              ) : null}
              {gridSections.length > 0 ? (
                <ChapterConsultNextAction
                  partId="3"
                  nickname={view.nickname}
                  onOpenConsult={() => selectPanel('consult')}
                />
              ) : null}
            </section>
            <div className={styles.drawerDeepReadBlock}>
              <SectionDivider label={PAID_DTR_DEEP_READING_SECTION_TITLE_JA} premium />
              <ChapterDeepReadingTakeaways partId="3" />
              <div className={`${styles.paidModules} ${styles.paidModulesInDrawer}`}>
                {sec('s3_essence') && sec('s6_relation') && sec('s7_work') ? (
                  <PaidModuleShell
                    n={3}
                    tierJa="場面で見る"
                    tierClass={styles.prTierBlue}
                    overline="近い人を中心にした場面"
                    title={PAID_DTR_CHAPTER_GRAPH_CAPTIONS['ch3-domain-scenes']}
                    ariaLabel="生活での出方"
                    summary="仕事・人間関係・近い関係など、場面ごとの出方を見ます。"
                    defaultOpen={false}
                    inDrawer
                  >
                    <DomainMatrixModule
                      essenceSection={sec('s3_essence')!}
                      relationSection={sec('s6_relation')!}
                      workSection={sec('s7_work')!}
                      compositionSection={sec('s2_composition')}
                    />
                  </PaidModuleShell>
                ) : null}
              </div>
            </div>
          </>
        );
      case 'chapter-4':
        return (
          <>
            {sec('s7_work') && sec('s6_relation') ? (
              <div className={styles.drawerChapterLead}>
                <ReportPartBand partId="4" />
                <DrawerChapterPersonalLead
                  partId="4"
                  nickname={view.nickname}
                />
                <ChapterFourWorkLead
                  workSection={sec('s7_work')!}
                  nickname={view.nickname}
                />
                <SectionDivider label="お金・生活・疲れを軽くする一手" premium />
                <section
                  className={styles.practicalShell}
                  aria-label="お金・生活・疲れを軽くする一手"
                >
                  <PracticalGuidanceSection
                    workSection={sec('s7_work')!}
                    relationSection={sec('s6_relation')!}
                    stemIdx={stemIdx}
                    lifeTopicGuidance
                  />
                </section>
                <ChapterConsultNextAction
                  partId="4"
                  nickname={view.nickname}
                  onOpenConsult={() => selectPanel('consult')}
                />
              </div>
            ) : null}
            <div className={styles.drawerDeepReadBlock}>
              <SectionDivider label={PAID_DTR_DEEP_READING_SECTION_TITLE_JA} premium />
              <ChapterDeepReadingTakeaways partId="4" />
              <div className={`${styles.paidModules} ${styles.paidModulesInDrawer}`}>
                {sec('s5_friction') && sec('s8_bridge') ? (
                  <PaidModuleShell
                    n={4}
                    tierJa="深読み"
                    tierClass={styles.prTierRose}
                    overline="つまずきから戻る流れ"
                    title={PAID_DTR_CHAPTER_GRAPH_CAPTIONS['ch4-friction-recovery']}
                    ariaLabel="つまずきから戻る流れ"
                    summary="疲れや不安が重なったとき、どこから戻しやすいかを流れで見ます。"
                    defaultOpen={false}
                    inDrawer
                  >
                    <FrictionRecoveryModule
                      frictionSection={sec('s5_friction')!}
                      bridgeSection={sec('s8_bridge')!}
                      lifeTopicRecovery
                    />
                  </PaidModuleShell>
                ) : null}
              </div>
            </div>
          </>
        );
      case 'consult':
        return (
          <div className={styles.drawerConsultPanel}>
            {aiConsultIncluded ? (
              <div className={styles.consultLayer} id="consultation-room">
                <div className={styles.consultRoomBand}>
                  <ConsultRoom
                    birthDate={view.birthDate}
                    nickname={view.nickname}
                    stemIdx={stemIdx}
                    devPreviewRoomData={consultDevPreviewRoomData}
                  />
                </div>
                <div className={styles.consultSupplementStack}>
                  <details className={styles.consultEntryDetails}>
                    <summary className={styles.consultEntryDetailsSummary}>
                      {PAID_DTR_CONSULT_ENTRY_LAYOUT.savedReportAboutSummaryJa}
                    </summary>
                    <ConsultSavedReportAboutBody readerDisplayName={view.nickname} />
                    <GroundingPanel
                      supplement
                      reportTitle={groundingDisplayReportTitle(payload.title)}
                      stemOneLine={stem.displayOneLine}
                      readerDisplayName={view.nickname}
                    />
                  </details>
                  <details className={styles.consultEntryDetails}>
                    <summary className={styles.consultEntryDetailsSummary}>
                      {PAID_DTR_CONSULT_GROUNDING_COPY.continuousSupportOverlineJa}
                    </summary>
                    <ContinuousSupportCompact />
                  </details>
                </div>
              </div>
            ) : null}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.reportRoot} data-m55-dtr-scroll-root="true">
      <DrawerHubScrollFab />
      <div className={styles.reportMain}>
        <PremiumHero
          stem={stem}
          stemIdx={stemIdx}
          aiConsultIncluded={aiConsultIncluded}
          expiresAt={expiresAt}
          nickname={view.nickname}
          birthDate={view.birthDate}
          openPanel={openPanel}
          onSelectPanel={selectPanel}
          renderPanelBody={renderDrawerPanelBody}
        />
        <ReportFooterMetaCard
          aiConsultIncluded={aiConsultIncluded}
          expiresAt={expiresAt}
          stemTitle={stem.publicTitle}
          displayedEnvelopeReadMode={displayedEnvelopeReadMode}
          consultWalletSnapshot={consultWalletSnapshot}
        />
      </div>
    </div>
  );
}
