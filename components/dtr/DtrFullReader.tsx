'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
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
function PremiumIncludedBand({ aiConsultIncluded }: { aiConsultIncluded: boolean }) {
  const parts: { num: string; name: string; desc: string }[] = [
    { num: 'Ⅰ', name: '輪郭を見る', desc: 'あなたの5軸の形と全体を整理する' },
    { num: 'Ⅱ', name: '構造を読む', desc: 'なぜそう動くか・何が本質かを読み解く' },
    { num: 'Ⅲ', name: '無理を知る', desc: '盲点と崩れやすい条件を確認する' },
    { num: 'Ⅳ', name: '楽に扱う',   desc: '戻し方・整え方・日常の手引き' },
  ];

  return (
    <div className={styles.premiumIncludedBand} aria-label="有料版に含まれる内容">
      <p className={styles.premiumIncludedOverline}>この保存版に含まれるもの</p>
      <p className={styles.premiumIncludedLead}>
        無料版は輪郭の入り口まで。
        保存版は、形を知るところから楽に扱うところまで、一冊で読み通せます。
      </p>
      <ol className={styles.premiumIncludedTocList} aria-label="目次">
        {parts.map((p) => (
          <li key={p.num} className={styles.premiumIncludedTocRow}>
            <span className={styles.premiumIncludedTocNum} aria-hidden>{p.num}</span>
            <span className={styles.premiumIncludedTocName}>{p.name}</span>
            <span className={styles.premiumIncludedTocSep} aria-hidden> — </span>
            <span className={styles.premiumIncludedTocDesc}>{p.desc}</span>
          </li>
        ))}
      </ol>
      {aiConsultIncluded && (
        <p className={styles.premiumIncludedConsultRow}>
          <span className={styles.premiumIncludedConsultPlus} aria-hidden>＋</span>
          <span className={styles.premiumIncludedConsultLabel}>保存版相談（1件）</span>
          <span className={styles.premiumIncludedConsultDesc}>このレポートに紐づいた返書相談</span>
        </p>
      )}
    </div>
  );
}

/** SSOT v1 Phase 3: 各部の区切り（上部目次バンドと表記を一致） */
function ReportPartBand({
  partId,
  title,
}: {
  partId: '1' | '2' | '3' | '4';
  title: string;
}) {
  const roman: Record<typeof partId, string> = {
    '1': 'Ⅰ',
    '2': 'Ⅱ',
    '3': 'Ⅲ',
    '4': 'Ⅳ',
  };
  return (
    <div
      className={styles.reportPartBand}
      aria-label={`第${partId}部 ${title}`}
    >
      <span className={styles.reportPartBandNum} aria-hidden>
        {roman[partId]}
      </span>
      <span className={styles.reportPartBandTitle}>{title}</span>
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
                <span className={styles.heroTypeCardLabel}>観測タイプ /</span>
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
            <span className={styles.heroMetaLabel}>相談枠</span>
          </div>
          <span className={styles.heroMetaValue}>{aiConsultIncluded ? '1件付帯' : 'なし'}</span>
        </div>
        <div className={styles.heroMetaItem}>
          <div className={styles.heroMetaLabelRow}>
            <HeroIconShield className={styles.heroMetaIcon} />
            <span className={styles.heroMetaLabel}>タイプ</span>
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
          <p key={i} className={compact ? styles.savedGridPara : styles.savedWidePara}>
            {para}
          </p>
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
    { key: 'core', label: '核', text: viz.blueprint.core },
    { key: 'natural', label: '自然に出る', text: viz.blueprint.natural },
    { key: 'fragile', label: '崩れやすい', text: viz.blueprint.fragile },
    { key: 'max', label: '無理なく力が出やすい条件', text: viz.blueprint.maximize },
  ];
  const db = clampTensionBias(viz.tension.deepenBroaden);
  const ge = clampTensionBias(viz.tension.guardExpress);

  return (
    <div className={styles.idDesignShell} aria-label="自己設計図（保存版）">
      <p className={styles.idDesignOverline}>深読み · 自己設計図</p>

      <div className={styles.idDesignBlock}>
        <h3 className={styles.idDesignBlockTitle}>設計の4層</h3>
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
        <h3 className={styles.idDesignBlockTitle}>両極マップ</h3>
        <p className={styles.idDesignHint}>スコアではなく、重心の位置関係です。</p>
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
  return (
    <article className={styles.savedWideArticle} aria-label={section.title}>
      <h2 className={styles.savedWideTitle}>{section.title}</h2>
      <IdentityDesignFigures stemIdx={stemIdx} />
      <div className={`${styles.savedWideBody} ${styles.dtrNarrativeBody}`}>
        {section.body.split('\n\n').map((para, i) => (
          <p key={i} className={styles.savedWidePara}>
            {para}
          </p>
        ))}
      </div>
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

/** 構成と傾向 — 5軸輪郭レーダー（paid 深読み版 · 数値なし） */
function StructureInteractionMapFigures({ stemIdx }: { stemIdx: number }) {
  const viz = compositionStructureVizForStem(stemIdx);

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
      label: '整えると伸びる',
      accent: 'quiet' as const,
      axes: STRUCTURE_AXIS_ORDER.filter((a) => viz.axisRoles[a] === 'quiet'),
    },
  ].filter((r) => r.axes.length > 0);

  return (
    <div className={styles.idDesignShell} aria-label="構成の5軸輪郭（保存版）">
      <p className={styles.idDesignOverline}>深読み · 5軸の構成輪郭</p>

      <div className={styles.idDesignBlock}>
        <h3 className={styles.idDesignBlockTitle}>構成の輪郭</h3>
        {/* 構成タイプ名を図の前に置く */}
        <p className={styles.strMapPattern}>
          <span className={styles.strMapPatternLabel}>{viz.patternLabel}</span>
        </p>

        <div className={styles.strMapFig}>
          <svg
            className={styles.strMapSvg}
            viewBox="0 0 100 100"
            aria-hidden
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

            {/* Axis labels */}
            {STRUCTURE_AXIS_ORDER.map((axis, i) => {
              const [lx, ly] = strPentPoint(i, STR_VIZ_R_LABEL);
              const ta = ((-90 + (i / STR_VIZ_N) * 360) + 360) % 360;
              const anchor =
                ta > 35 && ta < 145 ? 'end' :
                ta > 215 && ta < 325 ? 'start' :
                'middle';
              const dy = ta > 135 && ta < 225 ? 2.5 : ta > 315 || ta < 45 ? -1 : 1;
              return (
                <text
                  key={axis}
                  x={lx}
                  y={ly + dy}
                  textAnchor={anchor}
                  fontSize={4.8}
                  fontWeight="700"
                  fill="rgba(200,185,240,0.90)"
                  letterSpacing="0.02em"
                >
                  {axis}
                </text>
              );
            })}
          </svg>
          {/* 図の直後に生活語の要約 */}
          <p className={styles.strMapLinksCaption}>{viz.patternCaption}</p>
        </div>

        {/* ── 読み取り要約カード ── */}
        <div className={`${styles.strMapReadCard} ${styles.idBpReveal}`} style={{ animationDelay: '0.28s' }}>
          <div className={styles.strMapReadBadge}>
            <span className={styles.strMapReadBadgeDot} aria-hidden />
            輪郭の読み取り
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
                <span className={styles.strMapReadAxes}>{axes.join('・')}</span>
              </div>
            ))}
          </div>
          <p className={styles.strMapReadLegend}>
            外に開く軸ほど前に出やすい — 無料版「傾向の輪郭」と同じ読み方
          </p>
        </div>

        <div className={styles.strMapCallouts}>
          <div
            className={`${styles.strMapCallout} ${styles.idBpReveal}`}
            style={{ animationDelay: '0.35s' }}
          >
            <span className={styles.strMapCalloutLabel}>強みの立ち上がり</span>
            <p className={styles.strMapCalloutText}>{viz.strengthEmergence}</p>
          </div>
          <div
            className={`${styles.strMapCallout} ${styles.strMapCalloutFlip} ${styles.idBpReveal}`}
            style={{ animationDelay: '0.42s' }}
          >
            <span className={styles.strMapCalloutLabel}>裏返り</span>
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
  return (
    <article className={styles.savedWideArticle} aria-label={section.title}>
      <h2 className={styles.savedWideTitle}>{section.title}</h2>
      <StructureInteractionMapFigures stemIdx={stemIdx} />
      <div className={`${styles.savedWideBody} ${styles.dtrNarrativeBody}`}>
        {section.body.split('\n\n').map((para, i) => (
          <p key={i} className={styles.savedWidePara}>
            {para}
          </p>
        ))}
      </div>
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
  return (
    <article className={styles.savedWideArticle} aria-label={section.title}>
      <h2 className={styles.savedWideTitle}>{section.title}</h2>
      <StabilityConditionsPanelFigures stemIdx={stemIdx} />
      <div className={`${styles.savedWideBody} ${styles.dtrNarrativeBody}`}>
        {section.body.split('\n\n').map((para, i) => (
          <p key={i} className={styles.savedWidePara}>
            {para}
          </p>
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
    <div className={`${styles.idDesignShell} ${styles.gridInsertShell}`} aria-label="強みの可視化">
      <p className={styles.idDesignOverline}>深読み · 出やすさの鍵</p>
      <div className={styles.idDesignBlock}>
        <h3 className={`${styles.idDesignBlockTitle} ${styles.gridInsertBlockTitle}`}>
          価値に繋がる噛み合い
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
                ? '三つの傾向が重なると、状況に対して再現性のある強みとして現れます。'
                : '複数の傾向が重なると、状況に対して再現性のある強みとして現れます。'}
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
          <p key={i} className={styles.savedGridPara}>
            {para}
          </p>
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
          <p key={i} className={styles.savedGridPara}>
            {para}
          </p>
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
          <p key={i} className={styles.savedGridPara}>
            {para}
          </p>
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

function FiveAxisModule({ stemIdx }: { stemIdx: number }) {
  const data = AXIS_DATA[stemIdx] ?? AXIS_DATA[0]!;
  const summary = axisVizSummaryDisplay(data.balance);

  const summaryRows: { key: string; label: string; val: string }[] = [
    { key: 'primary', label: summary.primaryLabel, val: summary.primaryVal },
    { key: 'assist', label: summary.assistLabel, val: summary.assistVal },
    { key: 'grow', label: summary.growLabel, val: summary.growVal },
  ];

  return (
    <section
      className={`${styles.module} ${styles.modulePaid} ${styles.prModuleShell}`}
      aria-label="5軸分析"
    >
      <PremiumModuleLead n={1} tierJa="主軸分析" tierClass={styles.prTierMint} />
      <span className={styles.moduleOverline}>5軸</span>
      <h3 className={styles.moduleTitle}>輪郭を支える構造</h3>

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
    </section>
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
    <section
      className={`${styles.module} ${styles.modulePaid} ${styles.prModuleShell}`}
      aria-label="傾向と負荷"
    >
      <PremiumModuleLead n={2} tierJa="構造分析" tierClass={styles.prTierAmber} />
      <span className={styles.moduleOverline}>傾向と負荷</span>
      <h3 className={styles.moduleTitle}>重なりと読み解き</h3>
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
          <div className={styles.interactionColTitle}>摩擦傾向</div>
          <div className={styles.traitList}>
            {frictions.map((f) => (
              <div key={f.header} className={styles.traitCardFriction}>
                {f.header}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
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
    <section
      className={`${styles.module} ${styles.modulePaid} ${styles.prModuleShell}`}
      aria-label="生活での出方"
    >
      <PremiumModuleLead n={3} tierJa="領域比較" tierClass={styles.prTierBlue} />
      <span className={styles.moduleOverline}>生活での出方</span>
      <h3 className={styles.moduleTitle}>場面別の整理</h3>
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
                  強
                </span>
                <div className={styles.domainTileCell}>
                  <span className={styles.domainTileMicro}>強み</span>
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
    </section>
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

  const stageLabels = ['入口・トリガー', '摩擦の型', '消耗が寄りやすい点'];
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
    <section
      className={`${styles.module} ${styles.modulePaid} ${styles.prModuleShell}`}
      aria-label="戻し方と整え方"
    >
      <PremiumModuleLead n={4} tierJa="実践ガイド" tierClass={styles.prTierRose} />
      <span className={styles.moduleOverline}>戻し方 · 整え方</span>
      <h3 className={styles.moduleTitle}>摩擦から整える流れ</h3>
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
    </section>
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
    <section className={styles.prSummaryBand}>
      <h2 className={styles.prSummaryEyebrow}>{bridgeSection.title}</h2>
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
            <span className={styles.supportPathLabel}>追加相談</span>
            <span className={styles.supportPathDesc}>
              このレポートに紐づいた形で相談枠を追加できます。ルーム内からのみ申し込みできます（上限3回）。
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
}: {
  stemSymbol: string;
  reportTitle: string;
  stemOneLine: string;
}) {
  return (
    <div className={styles.groundingBandInner}>
      <div className={styles.groundingDividerBar} role="presentation">
        <span className={styles.groundingDividerFade} aria-hidden />
        <span className={styles.groundingDividerChip}>レポート基盤の相談</span>
        <span className={styles.groundingDividerFade} aria-hidden />
      </div>

      <div className={styles.groundingPanel} role="complementary" aria-label="ルームのコンテキスト">
        <div className={styles.groundingHeader}>
          <GroundingDocIcon />
          <div className={styles.groundingHeaderText}>
            <h3 className={styles.groundingTitle}>レポートが地図、相談が現在地</h3>
            <p className={styles.groundingLead}>
              レポートはあなたの傾向構造を示した地図です。この相談ルームは、その地図を使って「今の状況」を読み解く場所です。
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
            輪郭 · 5軸 · 傾向と負荷 · 生活での出方 · 戻し方
          </span>
        </div>
        <p className={styles.groundingNote}>
          一般的なアドバイスではなく、あなたの保存済みレポートに基づいた返書を作成します。
        </p>
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

  const didScrollToCoreAnalysisRef = useRef(false);

  /** One-time: land readers at Core Analysis after hero (sticky header offset via scroll-margin). */
  useLayoutEffect(() => {
    if (view.kind !== 'ready') return;
    if (didScrollToCoreAnalysisRef.current) return;
    didScrollToCoreAnalysisRef.current = true;
    const el = document.getElementById('dtr-core-analysis');
    if (!el) return;
    const run = () => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(run);
    });
  }, [view.kind]);

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
                  <CompositionArticleWithViz section={section} stemIdx={stemIdx} />
                ) : section.id === 's3_essence' ? (
                  <EssenceArticleWithViz section={section} stemIdx={stemIdx} />
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
        </section>

        <SectionDivider label="プレミアム深読み" premium />

        <div className={styles.paidModules}>
          <FiveAxisModule stemIdx={stemIdx} />

          {sec('s4_strengths') && sec('s5_friction') && (
            <TraitInteractionModule
              strengthsSection={sec('s4_strengths')!}
              frictionSection={sec('s5_friction')!}
              stemIdx={stemIdx}
            />
          )}

          {sec('s3_essence') && sec('s6_relation') && sec('s7_work') && (
            <DomainMatrixModule
              essenceSection={sec('s3_essence')!}
              relationSection={sec('s6_relation')!}
              workSection={sec('s7_work')!}
            />
          )}

          {sec('s5_friction') && sec('s8_bridge') && (
            <FrictionRecoveryModule
              frictionSection={sec('s5_friction')!}
              bridgeSection={sec('s8_bridge')!}
            />
          )}
        </div>

        {sec('s7_work') && sec('s6_relation') && (
          <>
            <ReportPartBand partId="4" title="楽に扱う" />
            <SectionDivider label="実践ガイド" premium />
            <section className={styles.practicalShell} aria-label="実践ガイド">
              <PracticalGuidanceSection
                workSection={sec('s7_work')!}
                relationSection={sec('s6_relation')!}
              />
            </section>
          </>
        )}

        {sec('s8_bridge') && (
          <>
            <SectionDivider label="まとめ" />
            <SummarySection bridgeSection={sec('s8_bridge')!} />
          </>
        )}

        <ContinuousSupport />

        {aiConsultIncluded && (
          <div className={styles.consultLayer} id="consultation-room">
            <div className={styles.consultGroundingBand}>
              <GroundingPanel
                stemSymbol={stem.symbol}
                reportTitle={payload.title}
                stemOneLine={stem.displayOneLine}
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
    </div>
  );
}
