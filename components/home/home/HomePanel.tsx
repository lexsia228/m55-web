'use client';

/**
 * HomePanel — current Home (v11 structure transplant).
 *
 * Logic layer preserved as-is:
 *   engines, FiveElementRing, DTR_TEASER_SECTIONS, view.kind branching.
 * JSX/CSS structure transplanted from v11 skeleton.
 *
 * Field exposure per M55_PAGE_OUTPUT_MAPPING_SSOT_v1 §2 (Home allowed):
 *   essence.summaryShort, essence.keywords,
 *   today.heading, today.summaryShort, today.focus,
 *   weekly.heading, weekly.weeklyKey
 *   dtr: chapter titles only (muted teaser, §4.1) — no fullSections/rawTraits/rawSignals
 */

import Image from 'next/image';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useEffect, useMemo, useState } from 'react';
import { ProfileRepository } from '../../lib/soul/profile';
import HomeBirthIntakeLayer from './HomeBirthIntakeLayer';
import { essenceStemLaneIndex, runEssenceEngine } from '../../lib/m55/essenceEngine';
import { runTodayEngine } from '../../lib/m55/todayEngine';
import { runWeeklyEngine } from '../../lib/m55/weeklyEngine';
import { TEN_STEM_DISPLAY } from '../../lib/m55/tenStemCatalog';
import styles from './HomePanel.module.css';

/* ── Five-element constants ──────────────────────────────────────────────────── */

const FIVE_ELEMENTS = [
  { char: '木', code: 'C', axis: 'Create', genre: '創造・成長', color: '#7cb87a' },
  { char: '火', code: 'E', axis: 'Express', genre: '表現・情熱', color: '#d4795c' },
  { char: '土', code: 'S', axis: 'Support', genre: '基盤・育成', color: '#c4982a' },
  { char: '金', code: 'D', axis: 'Decide', genre: '決断・洗練', color: '#9090ac' },
  { char: '水', code: 'L', axis: 'Logic', genre: '知性・流動', color: '#5a8fc4' },
] as const;

function stemToElemIdx(stemIdx: number): number {
  return Math.floor(stemIdx / 2);
}

function getFiveElementWeights(stemIdx: number): [number, number, number, number, number] {
  const p = stemToElemIdx(stemIdx);
  const w: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  w[p] = 38;
  w[(p + 1) % 5] = 22;
  w[(p + 4) % 5] = 18;
  w[(p + 2) % 5] = 12;
  w[(p + 3) % 5] = 10;
  return w;
}

/** 3-step relative quantity (non-score); matches prior weight thresholds */
function axisIntensityBlocks(w: number): string {
  const filled = w >= 30 ? 3 : w >= 16 ? 2 : 1;
  return `${'▮'.repeat(filled)}${'▯'.repeat(3 - filled)}`;
}

function roleQualityLine(displayOneLine: string): string {
  return displayOneLine.replace(/人$/, '資質');
}

function FiveElementRing({
  weights,
  primaryElemIdx,
  size = 76,
}: {
  weights: readonly number[];
  primaryElemIdx: number;
  size?: number;
}) {
  const r = 30;
  const cx = 43;
  const cy = 43;
  const circ = 2 * Math.PI * r;
  const gap = 2.5;
  let cumPct = 0;

  const arcs = FIVE_ELEMENTS.map((elem, i) => {
    const w = weights[i] ?? 0;
    const segLen = Math.max(0, (w / 100) * circ - gap);
    const rot = (cumPct / 100) * 360 - 90;
    cumPct += w;
    return (
      <circle
        key={elem.char}
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={elem.color}
        strokeWidth="11"
        strokeDasharray={`${segLen} ${circ}`}
        strokeDashoffset="0"
        transform={`rotate(${rot}, ${cx}, ${cy})`}
      />
    );
  });

  const pElem = FIVE_ELEMENTS[primaryElemIdx]!;

  return (
    <svg
      viewBox="0 0 86 86"
      width={size}
      height={size}
      role="img"
      aria-label="5つの解析軸のバランス"
      style={{ flexShrink: 0 }}
    >
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(177,156,255,0.12)" strokeWidth="11" />
      {arcs}
      <text
        x={cx} y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="15"
        fontWeight="700"
        fill={pElem.color}
      >
        {pElem.code}
      </text>
    </svg>
  );
}

/* ── DTR teaser (chapter titles only — 4 of 8, muted + truncated) ───────────── */

const DTR_TEASER_SECTIONS = [
  { id: 's1', title: 'あなたという人物' },
  { id: 's2', title: '構成と傾向の全体像' },
  { id: 's3', title: '本質と安定の条件' },
  { id: 's4', title: '活きる力' },
  { id: 's5', title: '注意と盲点' },
  { id: 's6', title: 'コミュニケーションの形' },
  { id: 's7', title: '仕事と生活の取扱いヒント' },
  { id: 's8', title: 'まとめと相談について' },
] as const;

/* ── Helpers ─────────────────────────────────────────────────────────────────── */

function todayIso(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const POSTER_FIVE_AXIS_COLORS = ['#7cb87a', '#d4795c', '#c4982a', '#9090ac', '#5a8fc4'] as const;

/** 探索カード1用：5分割円弧メーター（ラスタより一瞥で「5軸」の読みを返す） */
const EXPLORE_METER_WEIGHTS = [22, 20, 18, 22, 18] as const;

function ExploreFiveAxisMeter({ className }: { className?: string }) {
  const r = 23.5;
  const cx = 32;
  const cy = 32;
  const circ = 2 * Math.PI * r;
  const gap = 0.88;
  let cumPct = 0;
  const arcs = EXPLORE_METER_WEIGHTS.map((w, i) => {
    const segLen = Math.max(0, (w / 100) * circ - gap);
    const rot = (cumPct / 100) * 360 - 90;
    cumPct += w;
    return { segLen, rot, color: POSTER_FIVE_AXIS_COLORS[i]!, key: i };
  });
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      width={64}
      height={64}
      aria-hidden
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(92, 78, 160, 0.5)"
        strokeWidth="5.6"
      />
      {arcs.map(({ segLen, rot, color, key }) => (
        <circle
          key={key}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6.6"
          strokeOpacity={0.97}
          strokeLinecap="round"
          strokeDasharray={`${segLen} ${circ}`}
          transform={`rotate(${rot}, ${cx}, ${cy})`}
        />
      ))}
    </svg>
  );
}

/* ── Component ───────────────────────────────────────────────────────────────── */

export default function HomePanel() {
  const { user, isLoaded } = useUser();
  const ownerId = user?.id ?? null;
  const [profileEpoch, setProfileEpoch] = useState(0);
  const [birthIntakeOpen, setBirthIntakeOpen] = useState(false);

  useEffect(() => {
    const bump = () => setProfileEpoch((n) => n + 1);
    window.addEventListener('m55:profile_updated', bump);
    return () => window.removeEventListener('m55:profile_updated', bump);
  }, []);

  const view = useMemo(() => {
    if (!isLoaded) return { kind: 'loading' as const };
    const profile = ProfileRepository.get(ownerId);
    if (!profile?.birthDate || !profile.nickname?.trim()) return { kind: 'no_profile' as const };

    const today = todayIso();
    const base = { birthDate: profile.birthDate, nickname: profile.nickname, locale: 'ja-JP', nowDate: today };

    try {
      const essEnv = runEssenceEngine({ ...base, contextScope: 'essence' });
      const todayEnv = runTodayEngine({ ...base, contextScope: 'today' });
      const weekEnv = runWeeklyEngine({ ...base, contextScope: 'weekly' });

      const lane = essenceStemLaneIndex(profile.birthDate);
      const stem = TEN_STEM_DISPLAY[lane]!;

      return {
        kind: 'ready' as const,
        stem,
        elemIdx: stemToElemIdx(lane),
        fiveWeights: getFiveElementWeights(lane),
        essence: {
          summaryShort: essEnv.payload.summaryShort,
          keywords: essEnv.payload.keywords,
        },
        today: {
          heading: todayEnv.payload.heading,
          summaryShort: todayEnv.payload.summaryShort,
          focus: todayEnv.payload.focus,
        },
        weekly: {
          heading: weekEnv.payload.heading,
          weeklyKey: weekEnv.payload.weeklyKey,
        },
      };
    } catch {
      return { kind: 'no_profile' as const };
    }
  }, [isLoaded, ownerId, profileEpoch]);

  const personal = view.kind === 'ready' ? view : null;
  /** Observation mode = personalized engines; otherwise public understanding mode */
  const observation = !!personal;

  const nicknameHint = (user?.firstName || user?.username || '').trim();

  return (
    <div className={styles.wrap}>

      {/* ═══════════════════════════════════════════════════════════════════
          FOLD 1: HERO + SITE STRIP (intake: /my only)
          ═══════════════════════════════════════════════════════════════════ */}
      <section className={styles.heroSection} data-testid="m55-home-hero">
        <div className={styles.posterStack}>
          <div
            className={styles.posterMainVisual}
            data-testid="m55-home-poster-main-visual"
            aria-label="M55 メインビジュアル（プレースホルダー）"
          >
            <div className={styles.posterMainVisualStack} aria-hidden>
              <div className={styles.posterHeroBaseLayer}>
                <Image
                  src="/home/hero-tech-map.webp"
                  alt=""
                  fill
                  sizes="(max-width: 767px) 100vw, min(1320px, 100vw)"
                  className={styles.posterHeroBaseImage}
                  priority
                />
              </div>
              <div className={styles.posterHeroReadabilityVeil} />
            </div>
            <div className={styles.posterHeroOverlay}>
              <div className={styles.posterHeroCopy}>
                <div className={styles.posterHeroLabelGroup}>
                  <p className={styles.posterHeroBrandM55}>M55</p>
                  <p className={styles.posterHeroProductTitle}>Entry Report</p>
                </div>
                <h1 className={styles.posterHeroTitleBlite}>
                  <span className={styles.posterHeroTitleLine}>生まれた日からひらく、</span>
                  <span className={styles.posterHeroTitleLine}>あなたの強みの見取り図</span>
                </h1>
                <p className={styles.posterHeroSupportInline}>
                  生まれた日から個人向けの見取り図が開きます。無料ではまず輪郭まで見えます。
                </p>
                {isLoaded && view.kind === 'no_profile' && (
                  <button
                    type="button"
                    className={styles.posterHeroCta}
                    data-testid="m55-home-open-birth-intake"
                    onClick={() => setBirthIntakeOpen(true)}
                  >
                    無料で見取り図を開く
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {isLoaded && view.kind === 'no_profile' && (
        <div
          className={`${styles.homeSurfaceShell} ${styles.homeSurfaceCard} ${styles.homeTierStack}`}
          data-testid="m55-home-tier-stack"
          aria-label="無料で得られるもの、このサイトで読めること、有料レポートの違い"
        >
          <div className={styles.homeTierRow}>
            <span className={styles.homeTierBadge}>無料</span>
            <p className={styles.homeTierText}>
              生まれた日から、5つの視点の見取り図（傾向のバランス）が開きます。
            </p>
          </div>
          <div className={styles.homeTierRow}>
            <span className={styles.homeTierBadge}>無料</span>
            <p className={styles.homeTierText}>
              仕組みと読み方、10通りの資質の地図はページから読めます。
            </p>
          </div>
          <div className={styles.homeTierRow}>
            <span className={styles.homeTierBadgePaid}>Entry Report</span>
            <p className={styles.homeTierText}>
              同じ本質を章立てで深く整理し、手元に残して読み返せます（¥1,000・税込）。
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          UNDERSTANDING MODE — public education only (no personal result UI)
          ═══════════════════════════════════════════════════════════════════ */}
      {isLoaded && view.kind === 'no_profile' && (
        <section
          className={`${styles.homeSurfaceShell} ${styles.useExploreSection}`}
          data-testid="m55-home-understanding"
          aria-label="次の一歩"
        >
          <div className={styles.useExploreRule} aria-hidden />
          <div className={styles.useExploreGrid} role="navigation" aria-label="探索への入口">
            <Link href="/how-m55-works" className={styles.useExploreCard}>
              <span
                className={styles.useExploreIconThumbExplore}
                data-testid="m55-home-demo-five-element"
              >
                <Image
                  src="/home/card-how-to-read.webp"
                  alt=""
                  fill
                  sizes="60px"
                  className={styles.useExploreThumbImage}
                />
              </span>
              <span className={styles.useExploreBody}>
                <span className={styles.useExploreTitle}>M55の見方を知る</span>
                <span className={styles.useExploreSub}>仕組みと無料範囲 →</span>
              </span>
              <span className={styles.useExploreChevron} aria-hidden>›</span>
            </Link>
            <Link href="/ten-views" className={styles.useExploreCard}>
              <span className={styles.useExploreIconThumbExplore}>
                <Image
                  src="/home/card-qualities-flower.webp"
                  alt=""
                  fill
                  sizes="60px"
                  className={styles.useExploreThumbImage}
                />
              </span>
              <span className={styles.useExploreBody}>
                <span className={styles.useExploreTitle}>10通りの資質から読む</span>
                <span className={styles.useExploreSub}>資質の地図へ →</span>
              </span>
              <span className={styles.useExploreChevron} aria-hidden>›</span>
            </Link>
          </div>
        </section>
      )}

      {isLoaded && view.kind === 'no_profile' && (
        <section
          className={`${styles.homeSurfaceShell} ${styles.homeSurfaceCard} ${styles.homeSurfaceCardSoft} ${styles.fiveAxisReadCard}`}
          data-testid="m55-home-five-axis-read"
          aria-labelledby="m55-home-five-axis-read-title"
        >
          <h2 id="m55-home-five-axis-read-title" className={styles.fiveAxisReadTitle}>
            5つの解析軸の見方
          </h2>
          <p className={styles.fiveAxisReadLead}>円のバランスで、いまの出方をざっと整理します。</p>
          <div className={styles.fiveAxisReadMeterWrap}>
            <ExploreFiveAxisMeter className={styles.fiveAxisReadMeterSvg} />
          </div>
          <div className={styles.fiveAxisReadCardGrid}>
            <div className={styles.fiveAxisReadMiniCard}>
              <p className={styles.fiveAxisReadMiniCardText}>
                5つの視点の配分を、ひとつの見取り図として見ます。
              </p>
            </div>
            <div className={styles.fiveAxisReadMiniCard}>
              <p className={styles.fiveAxisReadMiniCardText}>
                順位ではなく、あなたの中の傾向として読みます。
              </p>
            </div>
            <div className={styles.fiveAxisReadMiniCard}>
              <p className={styles.fiveAxisReadMiniCardText}>
                詳しい読み方は「M55の見方を知る」から。
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          OBSERVATION MODE — personal computed surfaces only
          ═══════════════════════════════════════════════════════════════════ */}
      {observation && personal && (
        <div data-testid="m55-home-observation">
          <section className={styles.previewSection} aria-label="本質の概観">
            <p className={styles.previewEyebrow}>あなたの本質</p>

            <div className={styles.identityCard}>
              <div className={styles.roleCardHeader}>
                <p className={styles.roleCardUpper}>10通りの資質のひとつ</p>
                <p className={styles.roleCardTitle}>{personal.stem.publicTitle}</p>
                <p className={styles.roleCardDesc}>{roleQualityLine(personal.stem.displayOneLine)}</p>
              </div>

              <p className={styles.essenceSummary}>{personal.essence.summaryShort}</p>

              <div className={styles.keywords}>
                {personal.essence.keywords.slice(0, 3).map((kw) => (
                  <span key={kw} className={styles.keywordPill}>{kw}</span>
                ))}
              </div>

              <div className={styles.supportNotes}>
                <p className={styles.supportNote}>上記は無料の見取り図です。</p>
                <p className={styles.supportNote}>本質ページでさらに深く読めます。</p>
              </div>

              <Link href="/core" className={styles.cardLink}>本質をさらに読む →</Link>
            </div>

            <p className={styles.freeSurfaceNote}>
              無料面は見取り図です。Entry Report で構造化された版を所有できます。
            </p>
          </section>

          <section className={styles.shelfSection}>
            <div
              className={styles.elementCard}
              aria-label="5つの解析軸のバランス"
              data-testid="m55-home-five-element-card"
            >
              <p className={styles.elementLabel}>5つの解析軸</p>

              <div className={`${styles.elementInnerRow} ${styles.elementInnerRowObs}`}>
                <FiveElementRing
                  weights={personal.fiveWeights}
                  primaryElemIdx={personal.elemIdx}
                  size={86}
                />
                <div className={styles.obsLegendColumn}>
                  {FIVE_ELEMENTS.map((elem, i) => {
                    const w = personal.fiveWeights[i] ?? 0;
                    return (
                      <div
                        key={elem.char}
                        className={w >= 16 ? styles.obsLegendRow : styles.obsLegendRowMuted}
                      >
                        <span className={styles.legendDot} style={{ background: elem.color }} />
                        <span className={styles.obsLegendText} style={{ color: elem.color }}>
                          {elem.code} · {elem.axis} / {elem.char}
                        </span>
                        <span className={styles.legendIntensity} aria-hidden>
                          {axisIntensityBlocks(w)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className={styles.chartDisclaimerTight}>見取り · 内省の補助として</p>
            </div>

            <div className={styles.focusCard}>
              <p className={styles.focusEyebrow}>今の焦点</p>
              <p className={styles.focusText}>{personal.today.focus}</p>
            </div>

            <div className={styles.shelfRow}>
              <section className={styles.shelfCard} aria-label="今日の観測">
                <p className={styles.shelfLabel}>今日</p>
                <p className={styles.shelfHeading}>{personal.today.heading}</p>
                <p className={styles.shelfSummary}>{personal.today.summaryShort}</p>
                <p className={`${styles.shelfSupport} ${styles.shelfSupportOneLine}`}>/今日 で全文</p>
                <Link href="/today" className={styles.shelfLink}>読む →</Link>
              </section>
              <section className={styles.shelfCard} aria-label="今週の観測">
                <p className={styles.shelfLabel}>今週</p>
                <p className={styles.shelfHeading}>{personal.weekly.heading}</p>
                <p className={styles.shelfKey}>{personal.weekly.weeklyKey}</p>
                <p className={`${styles.shelfSupport} ${styles.shelfSupportOneLine}`}>/今週 で全文</p>
                <Link href="/weekly" className={styles.shelfLink}>読む →</Link>
              </section>
            </div>
          </section>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          FOLD 5: ENTRY REPORT MONETIZATION LAYER (always visible)
          One hero only — no second product or second price.
          ═══════════════════════════════════════════════════════════════════ */}
      <section className={styles.reportSection} aria-label="Entry Report">
        <div className={styles.homeSurfaceShell}>
          <p className={styles.reportSectionEyebrow}>有料レポート</p>

          <div
            className={`${styles.homeSurfaceCard} ${styles.homeSurfaceCardPaid} ${styles.valueCard}`}
          >
          <div className={styles.reportCardHeroBand} aria-hidden>
            <Image
              src="/home/card-entry-report.webp"
              alt=""
              fill
              sizes="(max-width: 767px) 100vw, min(1320px, 100vw)"
              className={styles.reportCardHeroBandImg}
            />
            <div className={styles.reportCardHeroBandVeil} />
          </div>

          <div className={styles.reportCardBody}>
            <div className={styles.reportCardColMain}>
              <p className={styles.valueEyebrow}>Entry Report</p>
              <p className={styles.valuePrice}>¥1,000（税込）</p>

              <p className={styles.depthNote}>無料の見取り図と同じ本質を、章立てで深く読む版です。</p>

              <ul className={styles.featureListLoose}>
                <li className={styles.featureItemLoose}>本質を章立てで深く読む</li>
                <li className={styles.featureItemLoose}>相談1回付属（購入者専用ルーム）</li>
                <li className={styles.featureItemLoose}>永久閲覧・物理配送なし</li>
              </ul>
            </div>

            <div className={styles.reportCardColAside}>
              <div className={styles.reportCardLower}>
                {/* Chapter preview — chips / mini-cards (no blur) */}
                <div className={styles.chapterPreview}>
                  <p className={styles.chapterPreviewLabel}>収録内容プレビュー</p>
                  <div className={styles.chapterChipWrap}>
                    {DTR_TEASER_SECTIONS.slice(0, 4).map((s) => (
                      <span key={s.id} className={styles.chapterChip}>
                        {s.title}
                      </span>
                    ))}
                  </div>
                  <p className={styles.chapterMore}>ほかにも章を収録</p>
                  <p className={styles.valueGapNote}>
                    無料＝見取り図／有料＝章立てレポート（保存・深読み）。
                  </p>
                </div>

                <p className={styles.reportAuxCard}>
                  購入者専用ルームで、レポートに沿って AI チャットにより深掘りできます。
                </p>

                <Link href="/dtr/lp" className={styles.reportCta}>
                  Entry Reportを見る →
                </Link>
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>

      {observation && personal && (
        <details className={styles.learnMoreDetails} data-testid="m55-home-learn-more">
          <summary className={styles.learnMoreSummary}>M55の仕組みと資料</summary>
          <nav className={styles.learnMoreLinks} aria-label="理解を深める">
            <Link href="/how-m55-works">M55の使い方</Link>
            <Link href="/ten-views">10通りの資質</Link>
          </nav>
          <ul className={styles.rulesList}>
            <li className={styles.ruleItem}>無料では基礎の見取り図が見えます</li>
            <li className={styles.ruleItem}>Entry Report では同じ本質を深く整理します</li>
            <li className={styles.ruleItem}>レポートには相談1回がつきます</li>
            <li className={styles.ruleItem}>追加相談はそのレポートのルームだけで行えます</li>
            <li className={styles.ruleItem}>1レポートの相談は最大3回です</li>
          </ul>
        </details>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          FOLD 6: TRUST FOOTER (always visible)
          ═══════════════════════════════════════════════════════════════════ */}
      <HomeBirthIntakeLayer
        open={birthIntakeOpen}
        ownerId={ownerId}
        nicknameHint={nicknameHint}
        onClose={() => setBirthIntakeOpen(false)}
        onSaved={() => {}}
      />

    </div>
  );
}
