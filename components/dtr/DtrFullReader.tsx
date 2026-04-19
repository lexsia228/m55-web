'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ProfileRepository } from '../../lib/soul/profile';
import { runDtrEngine, type DtrSection } from '../../lib/m55/dtrEngine';
import { TEN_STEM_DISPLAY, type TenStemDisplay } from '../../lib/m55/tenStemCatalog';
import { essenceStemLaneIndex } from '../../lib/m55/essenceEngine';
import {
  AXIS_DATA,
  AXIS_LABELS,
  AXIS_COLORS,
  AXIS_DESCS,
  INTERACTION_NOTE,
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

type Props = {
  ownershipType: string;
  aiConsultIncluded: boolean;
  expiresAt: string | null;
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

function PremiumIncludedBand({ aiConsultIncluded }: { aiConsultIncluded: boolean }) {
  const items: { key: string; label: string }[] = [
    { key: 'axis', label: '5軸の確定ビュー' },
    { key: 'load', label: '傾向と負荷の深読み' },
    { key: 'scene', label: '場面別の整理' },
    { key: 'recovery', label: '戻し方・整え方' },
    { key: 'practical', label: '実践ガイド' },
  ];
  if (aiConsultIncluded) {
    items.push({ key: 'consult', label: '保存版相談 1件' });
  }

  return (
    <div className={styles.premiumIncludedBand} aria-label="有料版に含まれる内容">
      <p className={styles.premiumIncludedOverline}>この保存版に含まれるもの</p>
      <p className={styles.premiumIncludedLead}>
        無料の輪郭に加え、深読みと実践までをこの一冊にまとめています。
      </p>
      <ul className={styles.premiumIncludedList}>
        {items.map((it) => (
          <li key={it.key} className={styles.premiumIncludedItem}>
            {it.label}
          </li>
        ))}
      </ul>
      <p className={styles.premiumIncludedFootnote}>
        無料で見える輪郭に比べ、構造の確定から日々の整理までをこの保存版ひとつで追えます。
      </p>
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
  reportTitle,
  aiConsultIncluded,
  expiresAt,
  nickname,
}: {
  stem: TenStemDisplay;
  stemIdx: number;
  reportTitle: string;
  aiConsultIncluded: boolean;
  expiresAt: string | null;
  nickname: string;
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
            <div className={styles.heroPosterBrandRow}>
              <span className={styles.heroPosterBrandWord}>M55</span>
              <span className={styles.heroPosterBrandSep} aria-hidden>|</span>
              <span className={styles.heroPosterTypeMono}>Full Report</span>
            </div>

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

            <p className={styles.heroPosterKicker}>保存版レポート · 輪郭のプレミアム深読み</p>

            <h1 className={styles.heroBlueprintTitle}>
              <span className={styles.heroBlueprintBalance}>Blueprint of {blueprintName}</span>
            </h1>

            <div className={styles.heroTypeCard}>
              <div className={styles.heroTypeCardRow}>
                <span className={styles.heroTypeCardLabel}>分析類型 /</span>
                <span className={styles.heroTypeCardType}>{typeEnLabel}</span>
              </div>
              <p className={styles.heroTypeCardEssence}>{stem.displayOneLine}</p>
            </div>

            <p className={styles.heroReportSubtitle}>{reportTitle}</p>
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

/* ─────────────────────────────────────────────────────────────────────────────
   C. Deep Analysis — paid-only modules.
   Each module is a native M55 section: overline + serif title + coreSurface.
   Not a "report insert box" — same family as /core sections, elevated tint.
   ───────────────────────────────────────────────────────────────────────────── */

function FiveAxisModule({ stemIdx }: { stemIdx: number }) {
  const data = AXIS_DATA[stemIdx] ?? AXIS_DATA[0]!;
  const primaryNames = AXIS_LABELS.filter((_, i) => (data.balance[i] ?? 0) === 3);
  const assistNames = AXIS_LABELS.filter((_, i) => (data.balance[i] ?? 0) === 2);
  const growNames = AXIS_LABELS.filter((_, i) => {
    const l = data.balance[i] ?? 0;
    return l === 0 || l === 1;
  });

  const summaryRows: { key: string; label: string; names: string[] }[] = [
    { key: 'primary', label: '主に働く軸', names: primaryNames },
    { key: 'assist', label: '補助で効く軸', names: assistNames },
    { key: 'grow', label: '整えると伸びる軸', names: growNames },
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
            <span className={styles.axisVizSummaryVal}>
              {row.names.length > 0 ? row.names.join(' · ') : '—'}
            </span>
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
                  +
                </span>
                <div className={styles.domainTileCell}>
                  <span className={styles.domainTileMicro}>強み</span>
                  <p className={styles.domainTileText}>{d.strength || '—'}</p>
                </div>
              </div>
              <div className={styles.domainTileBand}>
                <span className={`${styles.domainTileGlyph} ${styles.domainTileGlyphMinus}`} aria-hidden>
                  −
                </span>
                <div className={styles.domainTileCell}>
                  <span className={styles.domainTileMicro}>負荷</span>
                  <p className={styles.domainTileText}>{d.load || '—'}</p>
                </div>
              </div>
              <div className={`${styles.domainTileBand} ${styles.domainTileBandRecovery}`}>
                <span className={`${styles.domainTileGlyph} ${styles.domainTileGlyphLoop}`} aria-hidden>
                  ↻
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
  const bridgeText = bridgeSection.body.split('\n\n')[0] ?? bridgeSection.body;

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
                <span className={styles.flowArrowHead}>→</span>
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
  const bridgeRest = parts.slice(1).join('\n\n');

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

export default function DtrFullReader({ ownershipType, aiConsultIncluded, expiresAt }: Props) {
  const { user, isLoaded } = useUser();
  const ownerId = user?.id ?? null;
  const [profileEpoch, setProfileEpoch] = useState(0);

  useEffect(() => {
    const bump = () => setProfileEpoch((n) => n + 1);
    window.addEventListener('m55:profile_updated', bump);
    return () => window.removeEventListener('m55:profile_updated', bump);
  }, []);

  const view = useMemo(() => {
    if (!isLoaded) return { kind: 'loading' as const };
    const profile = ProfileRepository.get(ownerId);
    if (!profile?.birthDate) return { kind: 'need_profile' as const };

    const envelope = runDtrEngine({
      birthDate: profile.birthDate,
      nickname: profile.nickname,
      locale: 'ja-JP',
      contextScope: 'dtr',
    });

    const idx = essenceStemLaneIndex(profile.birthDate);
    const stem = TEN_STEM_DISPLAY[idx]!;

    return {
      kind: 'ready' as const,
      stemIdx: idx,
      stem,
      payload: envelope.payload,
      birthDate: profile.birthDate,
      nickname: profile.nickname,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, ownerId, profileEpoch]);

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

  if (view.kind === 'need_profile') {
    return (
      <div className={styles.reportRoot}>
        <div className={styles.reportMain}>
          <div className={styles.gateCard}>
            <p className={styles.gateMsg}>
              レポートを表示するには、プロフィール（ニックネームと生年月日）の設定が必要です。
            </p>
            <Link href="/my" className={styles.gateLink}>マイページで設定する</Link>
          </div>
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

  return (
    <div className={styles.reportRoot}>
      <div className={styles.reportMain}>
        <PremiumHero
          stem={stem}
          stemIdx={stemIdx}
          reportTitle={payload.title}
          aiConsultIncluded={aiConsultIncluded}
          expiresAt={expiresAt}
          nickname={view.nickname}
        />

        <section
          id="dtr-core-analysis"
          className={`${styles.savedReportShell} ${styles.coreAnalysisScrollAnchor}`}
          aria-label="保存版レポート"
        >
          <div className={styles.savedWideStack}>
            {preGridSections.map((section) => (
              <SectionBlock key={section.id} section={section} density="comfortable" />
            ))}
          </div>
          {gridSections.length > 0 ? (
            <div className={styles.savedGridThree}>
              {gridSections.map((section) => (
                <SectionBlock key={section.id} section={section} density="compact" />
              ))}
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
