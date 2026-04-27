'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
} from '../../lib/m55/dtrPaidModules';
import ConsultRoom from './ConsultRoom';
import { ReportBridgeBand } from './ReportBridgeBand';
import styles from './DtrFullReader.module.css';

/** Module 01: map engine level (0–3) to purchaser-facing role labels (no scores). */
function axisRoleFromLevel(level: number): { badge: string; badgeClass: string } {
  switch (level) {
    case 3:
      return { badge: '主軸', badgeClass: styles.axisRolePrimary };
    case 2:
      return { badge: '副軸', badgeClass: styles.axisRoleSecondary };
    case 1:
      return { badge: '支え', badgeClass: styles.axisRoleSupport };
    default:
      return { badge: '静観', badgeClass: styles.axisRoleQuiet };
  }
}

function axisRoleInterpretLine(label: string, level: number): string {
  switch (level) {
    case 3:
      return `${label}が、この輪郭を大きく形づくります。`;
    case 2:
      return `${label}が補助線として働き、全体のバランスをまとめます。`;
    case 1:
      return `${label}が共鳴し、動きに厚みを足します。`;
    default:
      return `${label}は前に出にくく、静かな補助にとどまります。`;
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

/**
 * Ten-views image mapping by stem index.
 * Mirrors CoreHeroSection HERO_VISUAL_PRESET order (TYPE_01–10).
 * stemIdx 0–9 maps to ten stem 甲–癸 (TenStemCatalog order).
 */
const DTR_TYPE_IMAGE: Record<number, string> = {
  0: '/ten-views/president.webp',
  1: '/ten-views/planner.webp',
  2: '/ten-views/influencer.webp',
  3: '/ten-views/creator.webp',
  4: '/ten-views/manager.webp',
  5: '/ten-views/producer.webp',
  6: '/ten-views/executor.webp',
  7: '/ten-views/designer.webp',
  8: '/ten-views/global-leader.webp',
  9: '/ten-views/analyst.webp',
};

const DTR_TYPE_EN: Record<number, string> = {
  0: 'PRESIDENT',
  1: 'PLANNER',
  2: 'INFLUENCER',
  3: 'CREATOR',
  4: 'MANAGER',
  5: 'PRODUCER',
  6: 'EXECUTOR',
  7: 'DESIGNER',
  8: 'GLOBAL LEADER',
  9: 'ANALYST',
};

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
  /** Immutable paid body from dtr_report_snapshots (required; server gate ensures presence). */
  purchasedSnapshot: {
    envelope: DtrEnvelope;
    profile: { nickname: string; birthDate: string };
  };
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

function HeroIconClock({ className }: { className?: string }) {
  return (
    <svg className={className} width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v6l4 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function HeroIconMessage({ className }: { className?: string }) {
  return (
    <svg className={className} width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16v10H8l-4 3V6z"
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

/** SSOT v1 Phase 2: 4部構成の本の目次として機能するバンド */
/* ── SSOT v1: 各部の共通データ（TOC + 章扉で共用） ── */
const REPORT_PARTS = [
  {
    partId: '1' as const,
    roman: 'Ⅰ',
    name: '輪郭を見る',
    catch: '広げるより、深める',
    desc: '今の自分に出やすい傾向を整理する',
    anchor: 'section-overview',
  },
  { partId: '2' as const, roman: 'Ⅱ', name: '構造を読む', desc: 'なぜそう動くか・何が本質かを読み解く',  anchor: 'section-structure' },
  { partId: '3' as const, roman: 'Ⅲ', name: '無理を知る', desc: '盲点と崩れやすい条件を確認する',         anchor: 'section-strain'    },
  { partId: '4' as const, roman: 'Ⅳ', name: '楽に扱う',   desc: '戻し方・整え方・日常での使い方',           anchor: 'section-practice'  },
] as const;

/** 上部「読み方」TOC 専用（章帯の desc は REPORT_PARTS のまま） */
const REPORT_PARTS_TOC_TAG: Readonly<Record<(typeof REPORT_PARTS)[number]['partId'], string>> = {
  '1': '全体像',
  '2': '動き方の理由',
  '3': '崩れやすい条件',
  '4': '戻し方と使い方',
};

/** Ⅰ導入・TOC帯: #section-overview の上端がまだ下寄り＝「本文帯の読み」に入っていない */
const INTRO_TOC_FRACTION = 0.4;
const TOC_GUARD_MS = 1000;

function isIntroOrTocView(): boolean {
  const el = document.getElementById('section-overview');
  if (!el) return true;
  return el.getBoundingClientRect().top > window.innerHeight * INTRO_TOC_FRACTION;
}

/**
 * 現在スクロール中の章 anchor id を返す（IntersectionObserver）。
 * hasScrolledRef により、初期ロード直後の誤検知を抑制する。
 * setActive を返すことで、TOC クリック時に即時 active 更新も可能にする。
 * markTocNavigation: TOC/相談クリック直後の scrollspy による active クリアを避ける。
 */
function useActiveSection(): [string | null, (id: string | null) => void, () => void] {
  const [active, setActive] = useState<string | null>(null);
  const hasScrolledRef = useRef(false);
  const tocClickAtRef = useRef(0);
  const markTocNavigation = useCallback(() => {
    tocClickAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    const ids = [...REPORT_PARTS.map((p) => p.anchor), 'consultation-room'];
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const canClearInIntro = () => Date.now() - tocClickAtRef.current > TOC_GUARD_MS;

    // Suppress the "already in viewport on load" false trigger.
    const onScroll = () => {
      hasScrolledRef.current = true;
      if (isIntroOrTocView() && canClearInIntro()) {
        setActive(null);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });

    const applyScrollspy = (entries: IntersectionObserverEntry[]) => {
      if (!hasScrolledRef.current) return;
      if (isIntroOrTocView()) {
        if (canClearInIntro()) {
          setActive(null);
        }
        return;
      }
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible.length === 0) return;
      setActive(visible[0]!.target.id);
    };

    const obs = new IntersectionObserver(applyScrollspy, { rootMargin: '-8% 0px -55% 0px', threshold: 0 });
    els.forEach((el) => obs.observe(el));
    return () => {
      obs.disconnect();
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, []);

  return [active, setActive, markTocNavigation];
}

const INTRO_BULLETS: { text: string; anchor: string }[] = [
  { text: '仕事や学びで、どこに力が出やすいか',     anchor: 'section-overview'  },
  { text: '人間関係で、どこで無理がたまりやすいか', anchor: 'section-structure' },
  { text: '疲れやすい条件と、崩れやすい流れ',       anchor: 'section-strain'    },
  { text: '自分をどこから整えると戻りやすいか',     anchor: 'section-practice'  },
];

/** フローティング ↑ の移動先（03「この保存版の読み方」ブロック） */
const PREMIUM_INTRO_READING_GUIDE_ID = 'premium-intro-reading-guide';

const READING_GUIDE_FAB_SHOW_PX = 600;

/** 保存版ページ専用：中央下の ↑ を「読み方」ハブへスクロール（グローバル先頭へ戻るボタンは非表示） */
function PremiumReadingGuideScrollFab() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const globalBtn = document.querySelector<HTMLButtonElement>(
      'button[aria-label="ページ上部へ戻る"]'
    );
    if (globalBtn) {
      globalBtn.style.display = 'none';
    }
    return () => {
      if (globalBtn) globalBtn.style.removeProperty('display');
    };
  }, []);

  useEffect(() => {
    const measure = () => {
      const y =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;
      setVisible(y > READING_GUIDE_FAB_SHOW_PX);
    };
    measure();
    window.addEventListener('scroll', measure, { passive: true });
    return () => window.removeEventListener('scroll', measure);
  }, []);

  const handleClick = () => {
    document.getElementById(PREMIUM_INTRO_READING_GUIDE_ID)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${styles.readingGuideFab}${visible ? ` ${styles.readingGuideFabVisible}` : ''}`}
      aria-label="この保存版の読み方へ戻る"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        focusable="false"
        className={styles.readingGuideFabIcon}
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

function PremiumIncludedBand({ aiConsultIncluded }: { aiConsultIncluded: boolean }) {
  const [active, setActive, markTocNavigation] = useActiveSection();

  function scrollTo(anchor: string) {
    return (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      markTocNavigation();
      setActive(anchor);
      const el = document.getElementById(anchor);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add(styles.reportPartBandLanding);
      setTimeout(() => el.classList.remove(styles.reportPartBandLanding), 1400);
    };
  }

  return (
    <div className={styles.premiumIncludedBand} aria-label="保存版レポートの説明">
      <div className={styles.premiumIntroPanelSection}>
        <span className={styles.premiumIntroPanelStep} aria-hidden>
          01
        </span>
        <p className={styles.premiumIntroOverline}>保存版レポート</p>
        <p className={styles.premiumIntroLead}>
          自分を無理に変えなくていい。<br />
          「自分の形」から、今の悩みを読み直すための土台です。
        </p>
        <p className={styles.premiumIntroBody}>
          この保存版では、力が出やすい場面、無理がたまりやすい条件、戻りやすい整え方を順番に見ていきます。
        </p>
      </div>
      <div className={styles.premiumIntroPanelSection}>
        <span className={styles.premiumIntroPanelStep} aria-hidden>
          02
        </span>
        <p className={styles.premiumIntroSectionLabel}>この保存版で分かること</p>
        <ul className={styles.premiumIntroBulletList} aria-label="この保存版で分かること">
          {INTRO_BULLETS.map(({ text }) => (
            <li key={text} className={styles.premiumIntroBulletItem}>
              <span className={styles.premiumIntroBulletText}>
                <HeroIconCheck className={styles.benefitCheckIcon} />
                {text}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div
        id={PREMIUM_INTRO_READING_GUIDE_ID}
        className={`${styles.premiumIntroPanelSection} ${styles.premiumIntroPanelSectionToc} ${styles.premiumIntroReadingGuideAnchor}`}
      >
        <span className={styles.premiumIntroPanelStep} aria-hidden>
          03
        </span>
        <p className={styles.premiumIntroSectionLabel}>この保存版の読み方</p>
        <ol className={styles.premiumIncludedTocList} aria-label="章の目次">
          {REPORT_PARTS.map((p) => {
            const tocDesc = REPORT_PARTS_TOC_TAG[p.partId];
            return (
              <li key={p.roman} className={styles.premiumIncludedTocRow}>
                <a
                  href={`#${p.anchor}`}
                  onClick={scrollTo(p.anchor)}
                  className={`${styles.tocLink} ${styles.tocLinkIntroCard}${active === p.anchor ? ` ${styles.tocLinkActive}` : ''}`}
                  aria-current={active === p.anchor ? 'location' : undefined}
                  aria-label={`${p.roman} ${p.name}へ移動`}
                >
                  <span className={styles.tocLinkIntroCardMain}>
                    <span className={styles.premiumIncludedTocNum} aria-hidden>{p.roman}</span>
                    <span className={styles.premiumIncludedTocName}>{p.name}</span>
                    <span className={styles.premiumIncludedTocSep} aria-hidden> — </span>
                    <span className={styles.premiumIncludedTocDesc}>{tocDesc}</span>
                  </span>
                  <span className={styles.tocLinkIntroCardArrow} aria-hidden>
                    →
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </div>
      {aiConsultIncluded && (
        <div className={styles.premiumIntroConsultNote}>
          <a
            href="#consultation-room"
            onClick={scrollTo('consultation-room')}
            className={`${styles.premiumIntroConsultLink}${active === 'consultation-room' ? ` ${styles.tocLinkActive}` : ''}`}
            aria-current={active === 'consultation-room' ? 'location' : undefined}
          >
            この保存版には、相談返書&nbsp;1件が付いています。<br />
            レポートが地図なら、相談返書は今の状況を読む場所です。
          </a>
        </div>
      )}
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

/** SSOT v1 Phase 3 → Phase 5: 各部の章扉（目次と表記を一致・アンカー・モチーフ付き） */
function ReportPartBand({
  partId,
  title,
}: {
  partId: '1' | '2' | '3' | '4';
  title: string;
}) {
  const part = REPORT_PARTS.find((p) => p.partId === partId);
  const roman: Record<typeof partId, string> = { '1': 'Ⅰ', '2': 'Ⅱ', '3': 'Ⅲ', '4': 'Ⅳ' };
  const catchPhrase = part && 'catch' in part ? part.catch : undefined;
  const a11yLabel = catchPhrase
    ? `第${partId}部 ${title}。${catchPhrase}`
    : `第${partId}部 ${title}`;
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
              {roman[partId]}
            </span>
            <span className={styles.reportPartBandTitle}>{title}</span>
          </div>
          {catchPhrase ? (
            <p className={styles.reportPartBandCatch}>{catchPhrase}</p>
          ) : null}
          {part?.desc && <p className={styles.reportPartBandDesc}>{part.desc}</p>}
        </div>
      </div>
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
}: {
  stem: TenStemDisplay;
  stemIdx: number;
  aiConsultIncluded: boolean;
  expiresAt: string | null;
  nickname: string;
  birthDate: string;
}) {
  const typeImage = DTR_TYPE_IMAGE[stemIdx] ?? '/ten-views/analyst.webp';
  const typeEnLabel = DTR_TYPE_EN[stemIdx] ?? '';
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
                保存済み
              </span>
              <span className={`${styles.heroBadgeChip} ${styles.heroBadgeChipPremium}`}>
                <HeroIconShield className={styles.heroBadgeIcon} />
                Premium
              </span>
            </div>

            <div className={styles.heroPosterBrandRow}>
              <span className={styles.heroPosterBrandWord}>M55</span>
              <span className={styles.heroPosterBrandSep} aria-hidden>|</span>
              <span className={styles.heroPosterTypeMono}>Full Report</span>
            </div>

            <h1 className={styles.heroBlueprintTitle}>
              <span className={styles.heroBlueprintPrefix} lang="en">
                Blueprint of
              </span>
              <span className={styles.heroBlueprintName}>{blueprintName}</span>
            </h1>

            <div className={styles.heroFirstRecord} lang="en" aria-label="生年月日（First Record）">
              <span className={styles.heroFirstRecordLabel}>First Record</span>
              <span className={styles.heroFirstRecordDate}>{formatBirthDateFirstRecordLine(birthDate)}</span>
            </div>

            <div className={styles.heroTypeCard}>
              <div className={styles.heroTypeCardRow}>
                <span className={styles.heroTypeCardLabel}>表現傾向 /</span>
                <span className={styles.heroTypeCardType}>{typeEnLabel}</span>
              </div>
              <p className={styles.heroTypeCardEssence}>{stem.displayOneLine}</p>
            </div>
          </div>
        </div>
      </div>

      <PremiumIncludedBand aiConsultIncluded={aiConsultIncluded} />

      <div className={styles.heroMetaStrip} aria-label="レポート情報">
        <div className={styles.heroMetaItem}>
          <div className={styles.heroMetaLabelRow}>
            <HeroIconClock className={styles.heroMetaIcon} />
            <span className={styles.heroMetaLabel}>有効期限</span>
          </div>
          <span className={styles.heroMetaValue}>{expiresAt ?? '無期限'}</span>
        </div>
        <div className={styles.heroMetaItem}>
          <div className={styles.heroMetaLabelRow}>
            <HeroIconMessage className={styles.heroMetaIcon} />
            <span className={styles.heroMetaLabel}>返書チケット</span>
          </div>
          <span className={styles.heroMetaValue}>{aiConsultIncluded ? '相談返書 1件' : 'なし'}</span>
        </div>
        <div className={styles.heroMetaItem}>
          <div className={styles.heroMetaLabelRow}>
            <HeroIconShield className={styles.heroMetaIcon} />
            <span className={styles.heroMetaLabel}>傾向名</span>
          </div>
          <span className={styles.heroMetaValue}>{stem.publicTitle}</span>
        </div>
      </div>

      <p className={styles.heroBackNav}>
        <Link href="/my">← マイページへ</Link>
      </p>
    </header>
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
        Module {num}
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
      aria-label={section.title}
    >
      {compact ? (
        <h3 className={styles.savedGridTitle}>{section.title}</h3>
      ) : (
        <h2 className={styles.savedWideTitle}>{section.title}</h2>
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
function IdentityDesignFigures({ stemIdx }: { stemIdx: number }) {
  const viz = identityDesignVizForStem(stemIdx);
  const bpLayers: { key: string; label: string; text: string }[] = [
    { key: 'core', label: '中心にある力', text: viz.blueprint.core },
    { key: 'natural', label: '力が出やすい場面', text: viz.blueprint.natural },
    { key: 'fragile', label: 'つまずきやすい場面', text: viz.blueprint.fragile },
    { key: 'max', label: '無理なく進める条件', text: viz.blueprint.maximize },
  ];
  const db = clampTensionBias(viz.tension.deepenBroaden);
  const ge = clampTensionBias(viz.tension.guardExpress);

  return (
    <div className={styles.idDesignShell} aria-label="力の出方を分解する（保存版）">
      <p className={styles.idDesignOverline}>深読み · 力の出方を分解する</p>

      <div className={styles.idDesignBlock}>
        <h3 className={styles.idDesignBlockTitle}>力が出るまでの4つの手がかり</h3>
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
          <p className={styles.idDesignHint}>これは、良い・悪いを決める図ではありません。</p>
          <p className={styles.idDesignHint}>
            「深める・広げる」「守る・出す」のどちらへ動きやすいかを見る図です。
          </p>
          <div className={styles.idDesignHintGlossGrid} role="note">
            <span className={styles.idDesignHintGlossLine}>深める＝じっくり考える</span>
            <span className={styles.idDesignHintGlossLine}>広げる＝人や場に広げる</span>
            <span className={styles.idDesignHintGlossLine}>守る＝自分の基準を保つ</span>
            <span className={styles.idDesignHintGlossLine}>出す＝外へ見せる・伝える</span>
          </div>
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
        <h3 className={styles.idDesignBlockTitle}>出やすさの鍵</h3>
        <div className={styles.idGrowthFlow}>
          <div
            className={`${styles.idGrowthCard} ${styles.idGrowthReveal}`}
            style={{ animationDelay: '0.12s' }}
          >
            <span className={styles.idGrowthTag}>楽になる条件</span>
            <p className={styles.idGrowthText}>{viz.growth.grow}</p>
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
            <p className={styles.idGrowthText}>{viz.growth.break}</p>
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
            <p className={styles.idGrowthText}>{viz.growth.restore}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function IdentityArticleWithBlueprint({
  section,
  stemIdx,
}: {
  section: DtrSection;
  stemIdx: number;
}) {
  const paras = section.body.split('\n\n').filter((p) => p.trim());
  const [lede, ...rest] = paras;
  return (
    <article className={styles.savedWideArticle} aria-label={section.title}>
      <h2 className={styles.savedWideTitle}>{section.title}</h2>
      {lede ? <p className={styles.sectionLede}>{lede}</p> : null}
      {rest.length > 0 ? (
        <div className={`${styles.savedWideBody} ${styles.dtrNarrativeBody}`}>
          {rest.map((para, i) => (
            <BodyPara key={i} para={para} compact={false} />
          ))}
        </div>
      ) : null}
      <IdentityDesignFigures stemIdx={stemIdx} />
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
    <article className={styles.savedWideArticle} aria-label={section.title}>
      <h2 className={styles.savedWideTitle}>{section.title}</h2>
      {lede ? <p className={styles.sectionLede}>{lede}</p> : null}
      {rest.length > 0 ? (
        <div className={`${styles.savedWideBody} ${styles.dtrNarrativeBody}`}>
          {rest.map((para, i) => (
            <BodyPara key={i} para={para} compact={false} />
          ))}
        </div>
      ) : null}
      <StructureInteractionMapFigures stemIdx={stemIdx} />
    </article>
  );
}

/** 本質と安定 — 4領域パネル（数値なし） */
function StabilityConditionsPanelFigures({ stemIdx }: { stemIdx: number }) {
  const viz = essenceStabilityVizForStem(stemIdx);
  const cells: { key: string; label: string; text: string; mod: string }[] = [
    { key: 'st', label: '安定する条件', text: viz.stabilize, mod: styles.stabCellCalm },
    { key: 'mx', label: '無理なく力が出やすい条件', text: viz.maximize, mod: styles.stabCellGrow },
    { key: 'cl', label: '崩れる条件', text: viz.collapse, mod: styles.stabCellRisk },
    { key: 'gd', label: '守る条件', text: viz.guard, mod: styles.stabCellGuard },
  ];

  return (
    <div className={styles.idDesignShell} aria-label="安定条件パネル（保存版）">
      <p className={styles.idDesignOverline}>深読み · 安定条件</p>
      <div className={styles.idDesignBlock}>
        <h3 className={styles.idDesignBlockTitle}>安定の4領域</h3>
        <p className={styles.idDesignHint}>四つの領域で、環境と関わりの条件を整理しています。</p>
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
    </div>
  );
}

function EssenceArticleWithViz({
  section,
  stemIdx,
}: {
  section: DtrSection;
  stemIdx: number;
}) {
  const paras = section.body.split('\n\n');
  const [lede, ...rest] = paras;
  return (
    <article className={styles.savedWideArticle} aria-label={section.title}>
      <h2 className={styles.savedWideTitle}>{section.title}</h2>
      {lede && <p className={styles.sectionLede}>{lede}</p>}
      <StabilityConditionsPanelFigures stemIdx={stemIdx} />
      <div className={`${styles.savedWideBody} ${styles.dtrNarrativeBody}`}>
        {rest.map((para, i) => (
          <BodyPara key={i} para={para} compact={false} />
        ))}
      </div>
    </article>
  );
}

function commFlowShortLabel(header: string): string {
  if (header.includes('受け取り')) return '受け取り';
  if (header.includes('渡し')) return '渡し';
  if (header.includes('引き')) return '引き';
  if (header.includes('会話') || header.includes('リズム')) return 'リズム';
  return header.slice(0, 3);
}

/** 自分の出やすい面 — 出やすさの鍵 + 合流線（本文は親でそのまま表示） */
function StrengthsLiftFigures({ body }: { body: string }) {
  const items = parseBlockItems(body).slice(0, 3);
  if (items.length === 0) return null;

  return (
    <div className={`${styles.idDesignShell} ${styles.gridInsertShell}`} aria-label="出方の可視化">
      <p className={styles.idDesignOverline}>深読み · 出やすさの鍵</p>
      <div className={styles.idDesignBlock}>
        <h3 className={`${styles.idDesignBlockTitle} ${styles.gridInsertBlockTitle}`}>
          価値につながりやすい力
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
                ? '三つの傾向が重なると、仕事や日常の中で力として出やすくなります。'
                : '複数の傾向が重なると、仕事や日常の中で力として出やすくなります。'}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}

/** 注意と盲点 — warning カード列 */
function FrictionWarningFigures({ body }: { body: string }) {
  const items = parseBlockItems(body);
  if (items.length === 0) return null;

  return (
    <div className={`${styles.idDesignShell} ${styles.gridInsertShell}`} aria-label="注意の可視化">
      <p className={styles.idDesignOverline}>深読み · 注意マップ</p>
      <div className={styles.idDesignBlock}>
        <h3 className={`${styles.idDesignBlockTitle} ${styles.gridInsertBlockTitle}`}>
          つまずきやすい位置
        </h3>
        <p className={styles.gridInsertHint}>先に「どこで詰まりやすいか」の輪郭を置きます。</p>
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
    </div>
  );
}

/** コミュニケーションの形 — 縦のフロー（グリッド幅でも破綻しにくい） */
function CommFlowFigures({ body }: { body: string }) {
  const items = parseBlockItems(body);
  if (items.length === 0) return null;

  return (
    <div className={`${styles.idDesignShell} ${styles.gridInsertShell}`} aria-label="対話の流れ">
      <p className={styles.idDesignOverline}>深読み · 対話の流れ</p>
      <div className={styles.idDesignBlock}>
        <h3 className={`${styles.idDesignBlockTitle} ${styles.gridInsertBlockTitle}`}>
          やりとりの順路
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

function GridArticleStrengthsViz({ section }: { section: DtrSection }) {
  return (
    <article className={styles.savedGridArticle} aria-label={section.title}>
      <h3 className={styles.savedGridTitle}>{section.title}</h3>
      <StrengthsLiftFigures body={section.body} />
      <div className={`${styles.savedGridBody} ${styles.dtrNarrativeBody}`}>
        {section.body.split('\n\n').map((para, i) => (
          <BodyPara key={i} para={para} compact />
        ))}
      </div>
    </article>
  );
}

function GridArticleFrictionViz({ section }: { section: DtrSection }) {
  return (
    <article className={styles.savedGridArticle} aria-label={section.title}>
      <h3 className={styles.savedGridTitle}>{section.title}</h3>
      <FrictionWarningFigures body={section.body} />
      <div className={`${styles.savedGridBody} ${styles.dtrNarrativeBody}`}>
        {section.body.split('\n\n').map((para, i) => (
          <BodyPara key={i} para={para} compact />
        ))}
      </div>
    </article>
  );
}

function GridArticleCommViz({ section }: { section: DtrSection }) {
  return (
    <article className={styles.savedGridArticle} aria-label={section.title}>
      <h3 className={styles.savedGridTitle}>{section.title}</h3>
      <CommFlowFigures body={section.body} />
      <div className={`${styles.savedGridBody} ${styles.dtrNarrativeBody}`}>
        {section.body.split('\n\n').map((para, i) => (
          <BodyPara key={i} para={para} compact />
        ))}
      </div>
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
      className={`${styles.module} ${styles.modulePaid} ${styles.prModuleShell}`}
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
            <span className={styles.pmExpandChip} aria-hidden="true">展開</span>
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
    { key: 'primary', label: summary.primaryLabel, val: summary.primaryVal },
    { key: 'assist', label: summary.assistLabel, val: summary.assistVal },
    { key: 'grow', label: summary.growLabel, val: summary.growVal },
  ];

  return (
    <>
      <div className={styles.axisVizSummary} aria-label="軸の役割の要約">
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
                {axisRoleInterpretLine(label, level)}
              </p>
            </div>
          );
        })}
      </div>
      <p className={`${styles.moduleNote} ${styles.prModuleInsight}`}>{data.note}</p>
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
      {note && <p className={`${styles.moduleNote} ${styles.prModuleInsight}`}>{note}</p>}
      <div className={styles.interactionGrid}>
        <div className={styles.interactionCol}>
          <div className={styles.interactionColTitle}>強化傾向</div>
          <div className={styles.traitList}>
            {strengths.map((s) => (
              <div key={s.header} className={styles.traitCard}>
                {s.header}
              </div>
            ))}
          </div>
        </div>
        <div className={styles.interactionCol}>
          <div className={styles.interactionColTitle}>つまずき傾向</div>
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
}: {
  essenceSection: DtrSection;
  relationSection: DtrSection;
  workSection: DtrSection;
}) {
  const workItems = parseBlockItems(workSection.body);
  const relationItems = parseBlockItems(relationSection.body);

  const workCond = workItems.find((i) => i.header === '力が出る条件')?.content ?? '';
  const workStuck = workItems.find((i) => i.header === '詰まりやすい条件')?.content ?? '';
  const workEnv = workItems.find((i) => i.header === '環境のヒント')?.content ?? '';
  const workHint = workItems.find((i) => i.header === '生活のヒント')?.content ?? '';
  const receiveWay = relationItems.find((i) => i.header === '受け取り方')?.content ?? '';
  const deliverWay = relationItems.find((i) => i.header === '渡し方')?.content ?? '';
  const withdrawWay = relationItems.find((i) => i.header === '引き方')?.content ?? '';
  const convRhythm = relationItems.find((i) => i.header === '会話のリズム')?.content ?? '';
  const stabilityClause = extractAfterLabel(essenceSection.body, '安定する条件は');
  const fatigueClause = extractAfterLabel(essenceSection.body, '疲れやすい場面は');

  const closeLoad = afterFirstSentence(withdrawWay) || firstSentence(deliverWay);
  const domainTiles = [
    {
      key: 'work',
      title: '仕事',
      strength: firstSentence(workCond),
      load: firstSentence(workStuck),
      recovery: firstSentence(workEnv),
    },
    {
      key: 'social',
      title: '人間関係',
      strength: firstSentence(receiveWay),
      load: firstSentence(deliverWay),
      recovery: firstSentence(convRhythm),
    },
    {
      key: 'close',
      title: '近い関係',
      strength: firstSentence(withdrawWay),
      load: closeLoad || '—',
      recovery: firstSentence(workHint),
    },
    {
      key: 'judgment',
      title: '判断',
      strength: stabilityClause || firstSentence(essenceSection.body),
      load: fatigueClause || '—',
      recovery: firstSentence(workStuck),
    },
    {
      key: 'recovery',
      title: '回復',
      strength: firstSentence(workHint),
      load: firstSentence(workStuck),
      recovery: firstSentence(workEnv),
    },
  ];

  return (
    <>
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
                  <p className={styles.domainTileText}>{d.strength || '—'}</p>
                </div>
              </div>
              <div className={styles.domainTileBand}>
                <span className={`${styles.domainTileGlyph} ${styles.domainTileGlyphMinus}`} aria-hidden>
                  負
                </span>
                <div className={styles.domainTileCell}>
                  <span className={styles.domainTileMicro}>負荷</span>
                  <p className={styles.domainTileText}>{d.load || '—'}</p>
                </div>
              </div>
              <div className={`${styles.domainTileBand} ${styles.domainTileBandRecovery}`}>
                <span className={`${styles.domainTileGlyph} ${styles.domainTileGlyphLoop}`} aria-hidden>
                  戻
                </span>
                <div className={styles.domainTileCell}>
                  <span className={styles.domainTileMicro}>戻し方</span>
                  <p className={styles.domainTileText}>{d.recovery || '—'}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function FrictionRecoveryModule({
  frictionSection,
  bridgeSection,
}: {
  frictionSection: DtrSection;
  bridgeSection: DtrSection;
}) {
  const frictions = parseBlockItems(frictionSection.body);
  const bridgeParts = bridgeSection.body
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean);
  /** 2段落目 = 戻し方・運用（1段落目はまとめで使用） */
  const bridgeText =
    bridgeParts.length >= 2 ? bridgeParts[1]! : bridgeParts[0] ?? bridgeSection.body;

  const stageLabels = ['入口・トリガー', 'つまずきの型', '消耗が寄りやすい点'];
  const flowNodes: { key: string; stage: string; title: string; body: string }[] = frictions
    .slice(0, 3)
    .map((f, i) => ({
      key: `f-${i}-${f.header}`,
      stage: stageLabels[Math.min(i, 2)] ?? stageLabels[2]!,
      title: f.header,
      body: firstSentence(f.content),
    }));
  flowNodes.push({
    key: 'recovery',
    stage: '回復の方向',
    title: '戻し方のヒント',
    body: bridgeText,
  });

  return (
    <>
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

function PracticalGuidanceSection({
  workSection,
  relationSection,
}: {
  workSection: DtrSection;
  relationSection: DtrSection;
}) {
  const workItems = parseBlockItems(workSection.body);
  const relationItems = parseBlockItems(relationSection.body);

  const workPower = workItems.find((i) => i.header === '力が出る条件')?.content ?? '';
  const workStuck = workItems.find((i) => i.header === '詰まりやすい条件')?.content ?? '';
  const envHint = workItems.find((i) => i.header === '環境のヒント')?.content ?? '';
  const lifeHint = workItems.find((i) => i.header === '生活のヒント')?.content ?? '';
  const receiveWay = relationItems.find((i) => i.header === '受け取り方')?.content ?? '';
  const withdrawWay = relationItems.find((i) => i.header === '引き方')?.content ?? '';

  const categories: {
    title: string;
    icon: 'work' | 'relationship' | 'recovery';
    rows: { action: string; why: string; when: string }[];
  }[] = [
    {
      title: '仕事での判断',
      icon: 'work',
      rows: [
        {
          action: firstSentence(workPower),
          why: firstSentence(workStuck),
          when: firstSentence(envHint),
        },
      ],
    },
    {
      title: '人間関係の境界線',
      icon: 'relationship',
      rows: [
        {
          action: firstSentence(withdrawWay),
          why: firstSentence(receiveWay),
          when: '',
        },
      ],
    },
    {
      title: '疲労と回復',
      icon: 'recovery',
      rows: [
        {
          action: firstSentence(lifeHint),
          why: firstSentence(workStuck),
          when: firstSentence(envHint),
        },
      ],
    },
  ];

  return (
    <div className={styles.practicalStack}>
      <div className={styles.practicalIntro}>
        <h2 className={styles.practicalIntroTitle}>このレポートの使い方</h2>
        <p className={styles.practicalIntroSub}>分析結果を日常で活かすための実践ガイド</p>
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
                  <p className={styles.practicalActionValue}>{row.action || '—'}</p>
                </div>
                <div className={styles.practicalActionCell}>
                  <p className={styles.practicalMicroLabel}>理由</p>
                  <p className={styles.practicalWhyWhen}>{row.why || '—'}</p>
                </div>
                <div className={styles.practicalActionCell}>
                  <p className={styles.practicalMicroLabel}>タイミング</p>
                  <p className={styles.practicalWhyWhen}>{row.when || '—'}</p>
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
   PracticalGuidanceSection（日常要約版）の手前に置き、保存版の具体本文へ誘導。
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

function WorkGuideCards({ workSection }: { workSection: DtrSection }) {
  const items = parseBlockItems(workSection.body);
  if (items.length === 0) return null;
  return (
    <div className={styles.wgGrid} aria-label="力の出し方ガイド">
      {WORK_CARD_META.map(({ key, icon, color }) => {
        const item = items.find((it) => it.header === key);
        if (!item) return null;
        return (
          <div key={key} className={styles.wgCard}>
            <div className={styles.wgCardTop}>
              <span className={styles.wgIcon} style={{ color }} aria-hidden>{icon}</span>
              <span className={styles.wgLabel} style={{ color }}>{key}</span>
            </div>
            <p className={styles.wgBody}>{item.content.trim()}</p>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   E. Summary
   ───────────────────────────────────────────────────────────────────────────── */

function SummarySection({ bridgeSection }: { bridgeSection: DtrSection }) {
  const parts = bridgeSection.body
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean);
  const lead = parts[0] ?? '';
  /** 2段落目は Module 04 の最終ノードで使用するため、まとめでは 3 段落目以降のみ */
  const bridgeRest = parts.slice(2).join('\n\n');

  return (
    <section className={styles.prSummaryBand} aria-label={bridgeSection.title}>
      <p className={styles.prSummaryLead}>{lead}</p>
      {bridgeRest ? (
        <div className={styles.prSummaryBridge}>
          {bridgeRest.split('\n\n').map((para, i) => (
            <p key={i} className={styles.prSummaryBridgePara}>
              {para}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   F. 継続サポート — single-person repeat path only
   ───────────────────────────────────────────────────────────────────────────── */

function ContinuousSupport() {
  return (
    <section className={styles.supportRepeat}>
      <div className={styles.supportRepeatIconWrap} aria-hidden>
        <svg className={styles.supportRepeatIcon} viewBox="0 0 24 24" fill="none">
          <path
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className={styles.supportRepeatBody}>
        <p className={styles.supportRepeatOverline}>継続サポート</p>
        <p className={styles.supportRepeatText}>
          このレポートは保存版です。転職・異動・新プロジェクト・ライフステージの変化など、
          大きな局面では、このレポートの構造を基盤に、改めて今の状況を整理することができます。
        </p>
        <ul className={styles.supportPathList} aria-label="継続利用の経路">
          <li className={styles.supportPathItem}>
            <span className={styles.supportPathLabel}>返書チケットを追加</span>
            <span className={styles.supportPathDesc}>
              このレポートに紐づいた形で返書チケットを追加できます。相談返書ルーム内からのみ申し込みできます（上限3回）。
            </span>
          </li>
          <li className={styles.supportPathItem}>
            <span className={styles.supportPathLabel}>状況整理</span>
            <span className={styles.supportPathDesc}>
              状況が変わったとき、このレポートの「仕事での判断」「疲労と回復」を改めて参照してください。
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   G. Grounding panel — ties consultation room to saved report
   ───────────────────────────────────────────────────────────────────────────── */

/** Grounding の見出し用。エンジン payload.title の表記を画面命名に寄せる（SSOT 本文は未変更）。 */
function groundingDisplayReportTitle(engineTitle: string): string {
  const t = engineTitle.trim();
  const m = /^Entry Report — (.+?)さんの取り扱い説明書$/.exec(t);
  if (m) return `保存版レポート — ${m[1]}さんの形を読み直す`;
  return t
    .replace(/^Entry Report — /, '保存版レポート — ')
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
  stemSymbol,
  reportTitle,
  stemOneLine,
  readerDisplayName,
}: {
  stemSymbol: string;
  reportTitle: string;
  stemOneLine: string;
  readerDisplayName: string;
}) {
  const nick = readerDisplayName.trim();
  const mapLead =
    nick.length > 0
      ? `保存版レポートは、${nick}さんの傾向のまとまりを整理した地図です。`
      : '保存版レポートは、見えている傾向のまとまりを整理した地図です。';
  const groundingNoteText =
    nick.length > 0
      ? `一般的なアドバイスではなく、${nick}さんの保存版レポートに基づいた相談返書を作成します。`
      : '一般的なアドバイスではなく、この保存版レポートに基づいた相談返書を作成します。';
  return (
    <div className={styles.groundingBandInner}>
      <div className={styles.groundingDividerBar} role="presentation">
        <span className={styles.groundingDividerFade} aria-hidden />
        <span className={styles.groundingDividerChip}>相談返書 · レポート基盤</span>
        <span className={styles.groundingDividerFade} aria-hidden />
      </div>

      <div className={styles.groundingPanel} role="complementary" aria-label="相談返書ルームのコンテキスト">
        <div className={styles.groundingHeader}>
          <GroundingDocIcon />
          <div className={styles.groundingHeaderText}>
            <h3 className={styles.groundingTitle}>レポートが地図なら、相談返書は今の状況を読む場所です</h3>
            <p className={styles.groundingLead}>
              {mapLead}
              この相談返書ルームは、その地図を使って「今の状況」を読み解く場所です。
            </p>
            <p className={styles.groundingBridgeLine}>
              この保存版レポートを土台に、今の状況を相談返書で読み直せます。
            </p>
            <p className={styles.groundingReportTitle}>{reportTitle}</p>
            <p className={styles.groundingSubline}>
              <span className={styles.groundingSymbolInline} aria-hidden="true">
                {stemSymbol}
              </span>
              {stemOneLine}
            </p>
          </div>
        </div>

        <div className={styles.groundingPillarGrid}>
          <div className={styles.groundingPillar}>
            <div className={styles.groundingPillarHead}>
              <span className={`${styles.groundingPillarDot} ${styles.groundingPillarDotMint}`} aria-hidden />
              <span className={styles.groundingPillarLabel}>構造を参照</span>
            </div>
            <p className={styles.groundingPillarText}>
              保存版レポートで整理した傾向から、その状況で出やすい反応を読み解きます。
            </p>
          </div>
          <div className={styles.groundingPillar}>
            <div className={styles.groundingPillarHead}>
              <span className={`${styles.groundingPillarDot} ${styles.groundingPillarDotAmber}`} aria-hidden />
              <span className={styles.groundingPillarLabel}>重なりを扱う</span>
            </div>
            <p className={styles.groundingPillarText}>
              複数の傾向が重なる場面で、どこに負荷が寄りやすいかを扱います。
            </p>
          </div>
          <div className={styles.groundingPillar}>
            <div className={styles.groundingPillarHead}>
              <span className={`${styles.groundingPillarDot} ${styles.groundingPillarDotRose}`} aria-hidden />
              <span className={styles.groundingPillarLabel}>回復の方向</span>
            </div>
            <p className={styles.groundingPillarText}>
              消耗の出方に合わせて、無理のない回復の方向を提案します。
            </p>
          </div>
        </div>

        <div className={styles.groundingMeta}>
          <span className={styles.groundingMetaLabel}>参照している読み</span>
          <span className={styles.groundingMetaValue}>
            輪郭 · 5つの視点 · 傾向と負荷 · 生活での出方 · 戻し方
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
  purchasedSnapshot,
}: Props) {
  const { user, isLoaded } = useUser();
  const ownerId = user?.id ?? null;

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
  const preGridSections = coreNarrativeSections.filter((s) => !narrativeGridIds.has(s.id));
  const gridSections = (['s4_strengths', 's5_friction', 's6_relation'] as const)
    .map((id) => coreNarrativeSections.find((s) => s.id === id))
    .filter((s): s is DtrSection => Boolean(s));
  const gridS4 = gridSections.find((s) => s.id === 's4_strengths');
  const gridS5 = gridSections.find((s) => s.id === 's5_friction');
  const gridS6 = gridSections.find((s) => s.id === 's6_relation');

  return (
    <div className={styles.reportRoot}>
      <div className={styles.reportMain}>
        <PremiumHero
          stem={stem}
          stemIdx={stemIdx}
          aiConsultIncluded={aiConsultIncluded}
          expiresAt={expiresAt}
          nickname={view.nickname}
          birthDate={purchasedSnapshot.profile.birthDate}
        />

        <section
          id="dtr-core-analysis"
          className={`${styles.savedReportShell} ${styles.coreAnalysisScrollAnchor}`}
          aria-label="保存版レポート"
        >
          <div className={styles.savedWideStack}>
            {preGridSections.map((section) => (
              <Fragment key={section.id}>
                {section.id === 's1_identity' && <ReportPartBand partId="1" title="輪郭を見る" />}
                {section.id === 's3_essence' && <ReportPartBand partId="2" title="構造を読む" />}
                {section.id === 's1_identity' ? (
                  <IdentityArticleWithBlueprint section={section} stemIdx={stemIdx} />
                ) : section.id === 's2_composition' ? (
                  <>
                    <CompositionArticleWithViz section={section} stemIdx={stemIdx} />
                    <ReportBridgeBand partId="1" />
                  </>
                ) : section.id === 's3_essence' ? (
                  <>
                    <EssenceArticleWithViz section={section} stemIdx={stemIdx} />
                    <ReportBridgeBand partId="2" />
                  </>
                ) : (
                  <SectionBlock section={section} density="comfortable" />
                )}
              </Fragment>
            ))}
          </div>
          {gridSections.length > 0 ? (
            <div className={styles.savedGridThree}>
              {gridS4 ? <GridArticleStrengthsViz key={gridS4.id} section={gridS4} /> : null}
              {gridS5 ? <ReportPartBand partId="3" title="無理を知る" /> : null}
              {gridS5 ? <GridArticleFrictionViz key={gridS5.id} section={gridS5} /> : null}
              {gridS6 ? <GridArticleCommViz key={gridS6.id} section={gridS6} /> : null}
            </div>
          ) : null}
          {gridSections.length > 0 ? <ReportBridgeBand partId="3" /> : null}
        </section>

        <SectionDivider label="プレミアム深読み" premium />

        {/* 4-node structural map — lets readers grasp module relations before diving in */}
        <div className={styles.pmDeepMap} aria-hidden="true">
          {(
            [
              { n: 1, label: '主軸分析', desc: '軸と重心',     colorCls: styles.pmDeepMapMint  },
              { n: 2, label: '構造分析', desc: '傾向の重なり', colorCls: styles.pmDeepMapAmber },
              { n: 3, label: '領域比較', desc: '場面の出方',   colorCls: styles.pmDeepMapBlue  },
              { n: 4, label: '実践ガイド', desc: '整え方',     colorCls: styles.pmDeepMapRose  },
            ] as const
          ).map((m, i) => (
            <Fragment key={m.n}>
              <div className={`${styles.pmDeepMapNode} ${m.colorCls}`}>
                <span className={styles.pmDeepMapN}>0{m.n}</span>
                <span className={styles.pmDeepMapLabel}>{m.label}</span>
                <span className={styles.pmDeepMapDesc}>{m.desc}</span>
              </div>
              {i < 3 && (
                <span className={styles.pmDeepMapArrow}>→</span>
              )}
            </Fragment>
          ))}
        </div>

        <div className={styles.paidModules}>
          <PaidModuleShell
            n={1}
            tierJa="主軸分析"
            tierClass={styles.prTierMint}
            overline="5つの視点"
            title="輪郭を支える構造"
            ariaLabel="5つの視点の分布"
            summary="5つの視点の分布から、この形の重心と周縁部を読む。"
            defaultOpen={false}
          >
            <FiveAxisModule stemIdx={stemIdx} />
          </PaidModuleShell>

          {sec('s4_strengths') && sec('s5_friction') && (
            <PaidModuleShell
              n={2}
              tierJa="構造分析"
              tierClass={styles.prTierAmber}
              overline="傾向と負荷"
              title="重なりと読み解き"
              ariaLabel="傾向と負荷"
              summary="力として出やすい傾向とつまずきやすい傾向の重なりから、この保存版で見えている形を読む。"
              defaultOpen={false}
            >
              <TraitInteractionModule
                strengthsSection={sec('s4_strengths')!}
                frictionSection={sec('s5_friction')!}
                stemIdx={stemIdx}
              />
            </PaidModuleShell>
          )}

          {sec('s3_essence') && sec('s6_relation') && sec('s7_work') && (
            <PaidModuleShell
              n={3}
              tierJa="領域比較"
              tierClass={styles.prTierBlue}
              overline="生活での出方"
              title="場面別の整理"
              ariaLabel="生活での出方"
              summary="仕事・関係・判断・回復の場面で、この形がどう現れるかを整理する。"
              defaultOpen={false}
            >
              <DomainMatrixModule
                essenceSection={sec('s3_essence')!}
                relationSection={sec('s6_relation')!}
                workSection={sec('s7_work')!}
              />
            </PaidModuleShell>
          )}

          {sec('s5_friction') && sec('s8_bridge') && (
            <PaidModuleShell
              n={4}
              tierJa="実践ガイド"
              tierClass={styles.prTierRose}
              overline="戻し方 · 整え方"
              title="つまずきから整える流れ"
              ariaLabel="戻し方と整え方"
              summary="つまずきから整えて戻すまでの流れと、回復のパターンを示す。"
              defaultOpen={false}
            >
              <FrictionRecoveryModule
                frictionSection={sec('s5_friction')!}
                bridgeSection={sec('s8_bridge')!}
              />
            </PaidModuleShell>
          )}
        </div>

        {sec('s7_work') && sec('s6_relation') && (
          <>
            <ReportPartBand partId="4" title="楽に扱う" />
            <WorkGuideCards workSection={sec('s7_work')!} />
            <SectionDivider label="実践ガイド" premium />
            <section className={styles.practicalShell} aria-label="実践ガイド">
              <PracticalGuidanceSection
                workSection={sec('s7_work')!}
                relationSection={sec('s6_relation')!}
              />
            </section>
            <ReportBridgeBand partId="4" />
          </>
        )}

        {sec('s8_bridge') && (
          <>
            <SectionDivider label="まとめと相談返書について" />
            <SummarySection bridgeSection={sec('s8_bridge')!} />
          </>
        )}

        <ContinuousSupport />

        {aiConsultIncluded && (
          <div className={styles.consultLayer} id="consultation-room">
            <div className={styles.consultGroundingBand}>
              <GroundingPanel
                stemSymbol={stem.symbol}
                reportTitle={groundingDisplayReportTitle(payload.title)}
                stemOneLine={stem.displayOneLine}
                readerDisplayName={view.nickname}
              />
            </div>
            <div className={styles.consultRoomBand}>
              <ConsultRoom birthDate={view.birthDate} nickname={view.nickname} />
            </div>
          </div>
        )}

        <footer className={styles.footer}>
          <Link href="/my">マイページへ戻る</Link>
          {' · '}
          <Link href="/core">本質を確認する</Link>
          {' · '}
          <Link href="/support">サポート</Link>
        </footer>
      </div>
      <PremiumReadingGuideScrollFab />
    </div>
  );
}
