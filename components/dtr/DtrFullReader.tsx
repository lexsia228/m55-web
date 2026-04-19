'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useEffect, useMemo, useState } from 'react';
import { ProfileRepository } from '../../lib/soul/profile';
import { runDtrEngine, type DtrSection } from '../../lib/m55/dtrEngine';
import { TEN_STEM_DISPLAY, type TenStemDisplay } from '../../lib/m55/tenStemCatalog';
import { essenceStemLaneIndex } from '../../lib/m55/essenceEngine';
import {
  AXIS_DATA,
  ELEMENT_LABELS,
  ELEMENT_LEVEL_LABELS,
  INTERACTION_NOTE,
  parseBlockItems,
  extractAfterLabel,
  firstSentence,
} from '../../lib/m55/dtrPaidModules';
import ConsultRoom from './ConsultRoom';
import styles from './DtrFullReader.module.css';

type Props = {
  ownershipType: string;
  aiConsultIncluded: boolean;
  expiresAt: string | null;
};

/* ─────────────────────────────────────────────────────────────────────────────
   A. Premium hero
   ───────────────────────────────────────────────────────────────────────────── */

function PremiumHero({
  stem,
  reportTitle,
  aiConsultIncluded,
  expiresAt,
}: {
  stem: TenStemDisplay;
  reportTitle: string;
  aiConsultIncluded: boolean;
  expiresAt: string | null;
}) {
  return (
    <header className={styles.premiumHero}>
      {/* Brand + product + saved badges */}
      <div className={styles.heroBrandRow}>
        <span className={styles.heroBrand}>M55</span>
        <span className={styles.heroProductLabel}>Deep Type Report</span>
        <span className={styles.heroSavedBadge}>保存済み</span>
      </div>

      {/* Type name + title */}
      <div className={styles.heroTypeRow}>
        <span className={styles.heroSymbolDisplay} aria-hidden="true">{stem.symbol}</span>
        <div className={styles.heroTypeInfo}>
          <span className={styles.heroPublicTitle}>
            {stem.publicTitle}&#8201;·&#8201;{stem.stemChar}
          </span>
          <h1 className={styles.heroTitle}>{reportTitle}</h1>
        </div>
      </div>

      <p className={styles.heroEssence}>{stem.displayOneLine}</p>

      {/* Ownership meta strip */}
      <div className={styles.heroOwnershipStrip} aria-label="レポート情報">
        <div className={styles.heroOwnershipItem}>
          <span className={styles.heroOwnershipLabel}>タイプ</span>
          <span className={styles.heroOwnershipValue}>Full Report</span>
        </div>
        <div className={styles.heroOwnershipItem}>
          <span className={styles.heroOwnershipLabel}>有効期限</span>
          <span className={styles.heroOwnershipValue}>{expiresAt ?? '無期限'}</span>
        </div>
        <div className={styles.heroOwnershipItem}>
          <span className={styles.heroOwnershipLabel}>相談枠</span>
          <span className={styles.heroOwnershipValue}>{aiConsultIncluded ? '1件付帯' : 'なし'}</span>
        </div>
      </div>

      <p className={styles.heroNav}>
        <Link href="/my">← マイページへ</Link>
      </p>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Section group label
   ───────────────────────────────────────────────────────────────────────────── */

function SectionGroupLabel({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className={styles.sectionGroupLabel}>
      <div className={styles.sectionGroupLabelAccent} aria-hidden="true" />
      <div>
        <span className={styles.sectionGroupLabelText}>{label}</span>
        {sub && <span className={styles.sectionGroupLabelSub}>{sub}</span>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   B. Core analysis — prose section block
   ───────────────────────────────────────────────────────────────────────────── */

function SectionBlock({ section }: { section: DtrSection }) {
  return (
    <section className={styles.section} aria-label={section.title}>
      <h2 className={styles.sectionTitle}>{section.title}</h2>
      <div className={styles.sectionBody}>
        {section.body.split('\n\n').map((para, i) => (
          <p key={i} className={styles.para}>{para}</p>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   C. Deep Analysis — paid-only modules
   ───────────────────────────────────────────────────────────────────────────── */

function FiveAxisModule({ stemIdx }: { stemIdx: number }) {
  const data = AXIS_DATA[stemIdx] ?? AXIS_DATA[0]!;
  return (
    <div className={styles.paidModule}>
      <div className={styles.paidBadge}>Module 01 — 主軸分析</div>
      <h3 className={styles.paidModuleTitle}>5軸の確定ビュー</h3>
      <div className={styles.axisGrid}>
        {ELEMENT_LABELS.map((label, i) => {
          const level = data.balance[i] ?? 0;
          return (
            <div key={label} className={styles.axisRow}>
              <span className={styles.axisName}>{label}</span>
              <div className={styles.axisBarWrap} aria-hidden="true">
                {[1, 2, 3].map((seg) => (
                  <div
                    key={seg}
                    className={seg <= level ? styles.axisSegFill : styles.axisSegEmpty}
                  />
                ))}
              </div>
              <span className={styles.axisLevelLabel}>
                {ELEMENT_LEVEL_LABELS[level] ?? '—'}
              </span>
            </div>
          );
        })}
      </div>
      <p className={styles.axisNote}>{data.note}</p>
    </div>
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
    <div className={styles.paidModule}>
      <div className={styles.paidBadge}>Module 02 — 構造分析</div>
      <h3 className={styles.paidModuleTitle}>重なり・相互作用分析</h3>
      {note && <p className={styles.interactionNote}>{note}</p>}
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
    </div>
  );
}

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
    { label: '仕事', value: firstSentence(workCond) },
    { label: '人間関係', value: firstSentence(receiveWay) },
    { label: '近い関係', value: firstSentence(withdrawWay) },
    { label: '判断', value: stabilityClause || firstSentence(essenceSection.body) },
    { label: '回復', value: firstSentence(workHint) },
  ];

  return (
    <div className={styles.paidModule}>
      <div className={styles.paidBadge}>Module 03 — 領域比較</div>
      <h3 className={styles.paidModuleTitle}>領域マトリクス</h3>
      <div className={styles.domainTable}>
        {domains.map(({ label, value }) => (
          <div key={label} className={styles.domainRow}>
            <span className={styles.domainLabel}>{label}</span>
            <span className={styles.domainValue}>{value}</span>
          </div>
        ))}
      </div>
    </div>
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
    <div className={styles.paidModule}>
      <div className={styles.paidBadge}>Module 04 — 実践ガイド</div>
      <h3 className={styles.paidModuleTitle}>摩擦 → 回復フロー</h3>
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
    </div>
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
      <h2 className={styles.summarySectionTitle}>{bridgeSection.title}</h2>
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
      <h2 className={styles.supportSectionTitle}>継続サポート</h2>
      <p className={styles.supportBody}>
        このレポートは保存版です。転職・異動・新プロジェクト・ライフステージの変化など、
        大きな局面では、このレポートの構造を土台に、改めて今の状況を整理することができます。
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
      <div className={styles.groundingHeader}>
        <span className={styles.groundingSymbol} aria-hidden="true">{stemSymbol}</span>
        <div className={styles.groundingHeaderText}>
          <p className={styles.groundingTitle}>{reportTitle}</p>
          <p className={styles.groundingSubline}>{stemOneLine}</p>
        </div>
      </div>
      <div className={styles.groundingMeta}>
        <span className={styles.groundingMetaLabel}>参照している分析</span>
        <span className={styles.groundingMetaValue}>
          五行構成・強化傾向と摩擦傾向・本質と安定条件・コミュニケーション傾向・仕事と生活のヒント
        </span>
      </div>
      <p className={styles.groundingNote}>
        レポートが地図、相談が現在地。
        このルームはこの保存済みレポートを土台として動作します。一般的なアドバイスではなく、このレポートの構造を参照した上で返答します。
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

  // Section lookup
  const sec = (id: string) => payload.fullSections.find((s) => s.id === id);

  // B: core narrative = s1–s6 (work and bridge rendered separately)
  const coreNarrativeSections = payload.fullSections.filter(
    (s) => !['s7_work', 's8_bridge'].includes(s.id)
  );

  return (
    <div className={styles.wrap}>

      {/* ── A. Premium hero ────────────────────────────────────────── */}
      <PremiumHero
        stem={stem}
        reportTitle={payload.title}
        aiConsultIncluded={aiConsultIncluded}
        expiresAt={expiresAt}
      />

      {/* ── B. Core analysis narrative ─────────────────────────────── */}
      <SectionGroupLabel label="コア分析" sub="Core Analysis" />
      <div className={styles.sections}>
        {coreNarrativeSections.map((section) => (
          <SectionBlock key={section.id} section={section} />
        ))}
      </div>

      {/* ── C. Deep Analysis — paid-only modules ───────────────────── */}
      <SectionGroupLabel label="深掘り解析" sub="Deep Analysis" />
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

      {/* ── D. Practical Guidance ──────────────────────────────────── */}
      {sec('s7_work') && sec('s6_relation') && (
        <>
          <SectionGroupLabel label="実践ガイド" sub="Practical Guidance" />
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

      {/* ── F. 継続サポート — single-person repeat path only ───────── */}
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
