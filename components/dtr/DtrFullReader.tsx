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
  AXIS_LEVEL_LABELS,
  AXIS_COLORS,
  AXIS_DESCS,
  INTERACTION_NOTE,
  parseBlockItems,
  extractAfterLabel,
  firstSentence,
} from '../../lib/m55/dtrPaidModules';
import ConsultRoom from './ConsultRoom';
import styles from './DtrFullReader.module.css';

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

/* ─────────────────────────────────────────────────────────────────────────────
   A. Premium hero — dark poster with ten-views type image + serif headline.
   Inherits /core CoreHeroSection visual language: dark bg, type image overlay,
   eyebrow / serif h1 / one-line structure. Adds "保存済み" owned-report identity.
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

  return (
    <header className={styles.premiumHero} aria-label="保存済みレポート">
      {/* Poster card — dark bg + type image + text overlay */}
      <div className={styles.heroPoster}>
        <img
          className={styles.heroPosterTypeImg}
          src={typeImage}
          alt=""
          decoding="async"
          aria-hidden
        />
        <div className={styles.heroPosterOverlay}>
          {/* Top row: brand + product label + saved status */}
          <div className={styles.heroPosterTopRow}>
            <span className={styles.heroPosterBrandWord}>M55</span>
            <span className={styles.heroPosterTypePill}>Full Report</span>
            <span className={styles.heroPosterSavedPill}>保存済み</span>
            <span className={styles.heroPosterPremiumPill}>Premium</span>
          </div>
          <p className={styles.heroPosterKicker}>
            保存版レポート · 輪郭のプレミアム深読み
            {nick ? (
              <>
                <br />
                <span className={styles.heroPosterKickerName}>Blueprint of {nick}</span>
              </>
            ) : null}
          </p>
          {/* Bottom: type identity + report title + one-line */}
          <div className={styles.heroPosterBottom}>
            <p className={styles.heroPosterEyebrow}>
              分析類型&thinsp;/&thinsp;{typeEnLabel}
            </p>
            <h1 className={styles.heroPosterTitle}>{reportTitle}</h1>
            <p className={styles.heroPosterOneLine}>{stem.displayOneLine}</p>
          </div>
        </div>
      </div>

      {/* Ownership meta strip — subordinate to poster */}
      <div className={styles.heroMetaStrip} aria-label="レポート情報">
        <div className={styles.heroMetaItem}>
          <span className={styles.heroMetaLabel}>有効期限</span>
          <span className={styles.heroMetaValue}>{expiresAt ?? '無期限'}</span>
        </div>
        <div className={styles.heroMetaItem}>
          <span className={styles.heroMetaLabel}>相談枠</span>
          <span className={styles.heroMetaValue}>{aiConsultIncluded ? '1件付帯' : 'なし'}</span>
        </div>
        <div className={styles.heroMetaItem}>
          <span className={styles.heroMetaLabel}>タイプ</span>
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
   Section group header — matches /core tierAOverline + serif section title rhythm.
   Used as structural divider between content groups (コア分析, 深掘り解析, etc.).
   ───────────────────────────────────────────────────────────────────────────── */

function SectionGroupLabel({
  label,
  sub,
  scrollAnchorId,
}: {
  label: string;
  sub?: string;
  /** When set, adds id + scroll-margin for /dtr/core initial scroll to Core Analysis */
  scrollAnchorId?: string;
}) {
  return (
    <div
      id={scrollAnchorId}
      className={
        scrollAnchorId
          ? `${styles.groupLabel} ${styles.coreAnalysisScrollAnchor}`
          : styles.groupLabel
      }
    >
      <div className={styles.groupLabelLine}>
        <span className={styles.groupLabelAccentBar} aria-hidden />
        <span className={styles.groupLabelOverline}>{sub}</span>
      </div>
      <h2 className={styles.groupLabelTitle}>{label}</h2>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   B. Core analysis — prose section block.
   Uses /core coreSectionSurface style: 22px radius, shadow, serif title.
   ───────────────────────────────────────────────────────────────────────────── */

function SectionBlock({ section }: { section: DtrSection }) {
  return (
    <section className={styles.section} aria-label={section.title}>
      <h3 className={styles.sectionTitle}>{section.title}</h3>
      <div className={styles.sectionBody}>
        {section.body.split('\n\n').map((para, i) => (
          <p key={i} className={styles.para}>{para}</p>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   C. Deep Analysis — paid-only modules.
   Each module is a native M55 section: overline + serif title + coreSurface.
   Not a "report insert box" — same family as /core sections, elevated tint.
   ───────────────────────────────────────────────────────────────────────────── */

function FiveAxisModule({ stemIdx }: { stemIdx: number }) {
  const data = AXIS_DATA[stemIdx] ?? AXIS_DATA[0]!;
  return (
    <section className={`${styles.module} ${styles.modulePaid}`} aria-label="5軸分析">
      <span className={styles.moduleOverline}>5軸</span>
      <h3 className={styles.moduleTitle}>輪郭を支える構造</h3>
      <div className={styles.axisCardGrid}>
        {AXIS_LABELS.map((label, i) => {
          const level = data.balance[i] ?? 0;
          const color = AXIS_COLORS[i] ?? '#9E92BE';
          const desc = AXIS_DESCS[i] ?? '';
          const levelLabel = AXIS_LEVEL_LABELS[level] ?? '—';
          return (
            <div key={label} className={styles.axisCard}>
              <div
                className={styles.axisDot}
                style={{ background: color }}
                aria-hidden="true"
              />
              <div className={styles.axisCardBody}>
                <span className={styles.axisCardName}>{label}</span>
                <span className={styles.axisCardDesc}>{desc}</span>
              </div>
              {level > 0 && (
                <span
                  className={
                    level === 3
                      ? `${styles.axisLevelPill} ${styles.axisLevelPillPrimary}`
                      : styles.axisLevelPill
                  }
                >
                  {levelLabel}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className={styles.moduleNote}>{data.note}</p>
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
    <section className={`${styles.module} ${styles.modulePaid}`} aria-label="傾向と負荷">
      <span className={styles.moduleOverline}>傾向と負荷</span>
      <h3 className={styles.moduleTitle}>重なりと読み解き</h3>
      {note && <p className={styles.moduleNote}>{note}</p>}
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
  const workHint = workItems.find((i) => i.header === '生活のヒント')?.content ?? '';
  const receiveWay = relationItems.find((i) => i.header === '受け取り方')?.content ?? '';
  const withdrawWay = relationItems.find((i) => i.header === '引き方')?.content ?? '';
  const stabilityClause = extractAfterLabel(essenceSection.body, '安定する条件は');

  const domains = [
    { label: '仕事での力', value: firstSentence(workCond) },
    { label: '人間関係', value: firstSentence(receiveWay) },
    { label: '近い関係', value: firstSentence(withdrawWay) },
    { label: '判断と安定', value: stabilityClause || firstSentence(essenceSection.body) },
    { label: '回復のヒント', value: firstSentence(workHint) },
  ];

  return (
    <section className={`${styles.module} ${styles.modulePaid}`} aria-label="生活での出方">
      <span className={styles.moduleOverline}>生活での出方</span>
      <h3 className={styles.moduleTitle}>場面別の整理</h3>
      <div className={styles.domainGrid}>
        {domains.map(({ label, value }) => (
          <div key={label} className={styles.domainCard}>
            <span className={styles.domainCardLabel}>{label}</span>
            <p className={styles.domainCardValue}>{value || '—'}</p>
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

  return (
    <section className={`${styles.module} ${styles.modulePaid}`} aria-label="戻し方と整え方">
      <span className={styles.moduleOverline}>戻し方 · 整え方</span>
      <h3 className={styles.moduleTitle}>摩擦から整える流れ</h3>
      <div className={styles.frictionList}>
        {frictions.map((f) => (
          <div key={f.header} className={styles.frictionItem}>
            <span className={styles.frictionMarker}>摩擦</span>
            <span className={styles.frictionHeader}>{f.header}</span>
          </div>
        ))}
      </div>
      <div className={styles.recoveryBlock}>
        <span className={styles.recoveryMarker}>回復の方向</span>
        <p className={styles.recoveryText}>{bridgeText}</p>
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

  const workCond = workItems.find((i) => i.header === '力が出る条件')?.content ?? '';
  const envHint = workItems.find((i) => i.header === '環境のヒント')?.content ?? '';
  const lifeHint = workItems.find((i) => i.header === '生活のヒント')?.content ?? '';
  const withdrawWay = relationItems.find((i) => i.header === '引き方')?.content ?? '';

  const cards = [
    {
      title: '仕事での判断',
      lead: firstSentence(workCond),
      detail: envHint ? firstSentence(envHint) : '',
    },
    {
      title: '人間関係の境界線',
      lead: firstSentence(withdrawWay),
      detail: '',
    },
    {
      title: '疲労と回復',
      lead: firstSentence(lifeHint),
      detail: '',
    },
  ];

  return (
    <div className={styles.practicalGrid}>
      {cards.map((card) => (
        <div key={card.title} className={styles.practicalCard}>
          <h3 className={styles.practicalCardTitle}>{card.title}</h3>
          <p className={styles.practicalCardContent}>{card.lead}</p>
          {card.detail && (
            <p className={styles.practicalCardDetail}>{card.detail}</p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   E. Summary
   ───────────────────────────────────────────────────────────────────────────── */

function SummarySection({ bridgeSection }: { bridgeSection: DtrSection }) {
  const bridgeText = bridgeSection.body.split('\n\n')[0] ?? bridgeSection.body;
  return (
    <div className={styles.summarySection}>
      <h3 className={styles.summarySectionTitle}>{bridgeSection.title}</h3>
      <p className={styles.summarySectionBody}>{bridgeText}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   F. 継続サポート — single-person repeat path only
   ───────────────────────────────────────────────────────────────────────────── */

function ContinuousSupport() {
  return (
    <div className={styles.supportSection}>
      <h3 className={styles.supportSectionTitle}>継続サポート</h3>
      <p className={styles.supportBody}>
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
    <div className={styles.groundingPanel} role="complementary" aria-label="ルームのコンテキスト">
      <div className={styles.groundingBadgeRow}>
        <span className={styles.groundingBrandWord}>M55</span>
        <span className={styles.groundingProductPill}>Report-backed consult</span>
      </div>
      <div className={styles.groundingHeader}>
        <GroundingDocIcon />
        <div className={styles.groundingHeaderText}>
          <p className={styles.groundingReportLabel}>Premium grounding</p>
          <p className={styles.groundingTitle}>{reportTitle}</p>
          <p className={styles.groundingSubline}>
            <span className={styles.groundingSymbolInline} aria-hidden="true">{stemSymbol}</span>
            {stemOneLine}
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
        レポートが地図、相談が現在地。
        このルームは保存版レポートを基盤に動作します。一般的なアドバイスではなく、上記の読みを参照したうえで返答します。
      </p>
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
      <div className={styles.wrap}>
        <p className={styles.stateMsg}>読み込み中…</p>
      </div>
    );
  }

  if (view.kind === 'need_profile') {
    return (
      <div className={styles.wrap}>
        <div className={styles.gateCard}>
          <p className={styles.gateMsg}>
            レポートを表示するには、プロフィール（ニックネームと生年月日）の設定が必要です。
          </p>
          <Link href="/my" className={styles.gateLink}>マイページで設定する</Link>
        </div>
      </div>
    );
  }

  const { stemIdx, stem, payload } = view;

  const sec = (id: string) => payload.fullSections.find((s) => s.id === id);

  const coreNarrativeSections = payload.fullSections.filter(
    (s) => !['s7_work', 's8_bridge'].includes(s.id)
  );

  return (
    <div className={styles.wrap}>

      {/* ── A. Premium hero ────────────────────────────────────────── */}
      <PremiumHero
        stem={stem}
        stemIdx={stemIdx}
        reportTitle={payload.title}
        aiConsultIncluded={aiConsultIncluded}
        expiresAt={expiresAt}
        nickname={view.nickname}
      />

      {/* ── B. Core analysis narrative — 輪郭（free /core 系） ───────── */}
      <SectionGroupLabel
        label="輪郭とコア分析"
        sub="Core Analysis"
        scrollAnchorId="dtr-core-analysis"
      />
      <div className={styles.sections}>
        {coreNarrativeSections.map((section) => (
          <SectionBlock key={section.id} section={section} />
        ))}
      </div>

      {/* ── C. Deep Analysis — プレミアム深読み ─────────────────────── */}
      <SectionGroupLabel label="プレミアム深読み" sub="Premium Deep Read" />
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

      {/* ── D. 生活での出方 ───────────────────────────────────────── */}
      {sec('s7_work') && sec('s6_relation') && (
        <>
          <SectionGroupLabel label="生活での出方" sub="Daily patterns" />
          <PracticalGuidanceSection
            workSection={sec('s7_work')!}
            relationSection={sec('s6_relation')!}
          />
        </>
      )}

      {/* ── E. Summary ─────────────────────────────────────────────── */}
      {sec('s8_bridge') && (
        <>
          <SectionGroupLabel label="まとめ" sub="Summary" />
          <SummarySection bridgeSection={sec('s8_bridge')!} />
        </>
      )}

      {/* ── F. 継続サポート ─────────────────────────────────────────── */}
      <SectionGroupLabel label="継続サポート" sub="Continuous Support" />
      <ContinuousSupport />

      {/* ── G. Report-backed consultation room ─────────────────────── */}
      {aiConsultIncluded && (
        <>
          <div className={styles.layerDivider} role="separator" id="consultation-room">
            <span className={styles.layerDividerLabel}>相談ルーム</span>
          </div>
          <GroundingPanel
            stemSymbol={stem.symbol}
            reportTitle={payload.title}
            stemOneLine={stem.displayOneLine}
          />
          <ConsultRoom birthDate={view.birthDate} nickname={view.nickname} />
        </>
      )}

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <Link href="/my">マイページへ戻る</Link>
        {' · '}
        <Link href="/core">本質を確認する</Link>
        {' · '}
        <Link href="/support">サポート</Link>
      </footer>
    </div>
  );
}
