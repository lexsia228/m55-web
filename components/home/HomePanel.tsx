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

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useEffect, useId, useMemo, useState } from 'react';
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

/** Public showcase lane index (甲) — illustrative weights only, not a user result */
const PUBLIC_SHOWCASE_LANE = 0;

/**
 * Hero Main Visual: quiet layered booklet abstraction — stacked translucent sheets,
 * central protagonist plane, soft light enclosure. No text, icons, or labels.
 */
function PosterMainVisualDiagram() {
  const u = useId().replace(/:/g, '');
  const g = {
    amb: `m55-bk-amb-${u}`,
    halo: `m55-bk-halo-${u}`,
    rim: `m55-bk-rim-${u}`,
    mg: `m55-bk-mg-${u}`,
    tq: `m55-bk-tq-${u}`,
  };
  const cx = 160;
  const cy = 90;
  return (
    <svg
      className={styles.posterDiagramSvg}
      viewBox="0 0 320 180"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <radialGradient id={g.amb} cx="50%" cy="48%" r="68%">
          <stop offset="0%" stopColor="rgba(252, 249, 255, 0.88)" />
          <stop offset="55%" stopColor="rgba(236, 230, 248, 0.38)" />
          <stop offset="100%" stopColor="rgba(210, 200, 234, 0.09)" />
        </radialGradient>
        <radialGradient id={g.halo} cx="50%" cy="50%" r="48%">
          <stop offset="0%" stopColor="rgba(124, 111, 214, 0.11)" />
          <stop offset="72%" stopColor="rgba(124, 111, 214, 0)" />
        </radialGradient>
        <radialGradient id={g.rim} cx="50%" cy="50%" r="50%">
          <stop offset="78%" stopColor="rgba(255, 255, 255, 0)" />
          <stop offset="100%" stopColor="rgba(177, 156, 255, 0.14)" />
        </radialGradient>
        <radialGradient id={g.mg} cx="96%" cy="8%" r="24%">
          <stop offset="0%" stopColor="rgba(188, 96, 168, 0.065)" />
          <stop offset="100%" stopColor="rgba(188, 96, 168, 0)" />
        </radialGradient>
        <radialGradient id={g.tq} cx="4%" cy="92%" r="22%">
          <stop offset="0%" stopColor="rgba(64, 168, 176, 0.055)" />
          <stop offset="100%" stopColor="rgba(64, 168, 176, 0)" />
        </radialGradient>
      </defs>

      <rect width="320" height="180" fill={`url(#${g.amb})`} />
      <rect width="320" height="180" fill={`url(#${g.halo})`} />
      <rect width="320" height="180" fill={`url(#${g.rim})`} />
      <rect width="320" height="180" fill={`url(#${g.mg})`} />
      <rect width="320" height="180" fill={`url(#${g.tq})`} />

      {/* 5 stacked sheets — back → front, offset + rotation like a closed booklet */}
      <g transform={`rotate(-5.2 ${cx} ${cy})`}>
        <rect
          x={cx - 62}
          y={cy - 48}
          width={124}
          height={96}
          rx={11}
          fill="rgba(208, 198, 232, 0.22)"
          stroke="rgba(177, 156, 255, 0.16)"
          strokeWidth="0.75"
        />
      </g>
      <g transform={`rotate(-3.6 ${cx} ${cy})`}>
        <rect
          x={cx - 59}
          y={cy - 46}
          width={118}
          height={92}
          rx={10}
          fill="rgba(220, 212, 242, 0.3)"
          stroke="rgba(177, 156, 255, 0.18)"
          strokeWidth="0.7"
        />
      </g>
      <g transform={`rotate(-2.1 ${cx} ${cy})`}>
        <rect
          x={cx - 56}
          y={cy - 44}
          width={112}
          height={88}
          rx={9}
          fill="rgba(232, 226, 250, 0.4)"
          stroke="rgba(160, 148, 220, 0.2)"
          strokeWidth="0.65"
        />
      </g>
      <g transform={`rotate(-0.7 ${cx} ${cy})`}>
        <rect
          x={cx - 53}
          y={cy - 42}
          width={106}
          height={84}
          rx={9}
          fill="rgba(242, 238, 255, 0.52)"
          stroke="rgba(124, 111, 214, 0.18)"
          strokeWidth="0.65"
        />
      </g>
      {/* Protagonist face — brightest sheet */}
      <rect
        x={cx - 50}
        y={cy - 40}
        width={100}
        height={80}
        rx={8}
        fill="rgba(255, 255, 255, 0.78)"
        stroke="rgba(124, 111, 214, 0.22)"
        strokeWidth="0.85"
      />
      <rect
        x={cx - 46}
        y={cy - 36}
        width={92}
        height={72}
        rx={6}
        fill="rgba(124, 111, 214, 0.045)"
        stroke="none"
      />
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

  const showcaseWeights = getFiveElementWeights(PUBLIC_SHOWCASE_LANE);
  const showcaseElemIdx = stemToElemIdx(PUBLIC_SHOWCASE_LANE);

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
            <div className={styles.posterMainVisualInner} aria-hidden>
              <PosterMainVisualDiagram />
            </div>
          </div>

          <div className={styles.posterTitleLockup}>
            <p className={styles.posterTitleSmall}>アルゴリズムでわかる</p>
            <p className={styles.posterTitleMid}>あなたの</p>
            <h1 className={styles.posterTitleMax}>取扱説明書</h1>
          </div>

          {isLoaded && view.kind === 'no_profile' && (
            <p className={styles.posterSupportOneLine}>保存すると、あなたの見取り図が開きます。</p>
          )}

          {isLoaded && view.kind === 'no_profile' && (
            <div className={styles.inlineIntakeRail}>
              <button
                type="button"
                className={styles.inlineIntakeCta}
                data-testid="m55-home-open-birth-intake"
                onClick={() => setBirthIntakeOpen(true)}
              >
                無料で読み取りを始める
              </button>
            </div>
          )}

          <ul className={styles.posterMicroGrid} aria-label="M55の特徴">
            <li className={styles.posterMicroCard}>再現可能アルゴリズム解析</li>
            <li className={styles.posterMicroCard}>Entry Report</li>
            <li className={styles.posterMicroCard}>AIチャット深掘り</li>
          </ul>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          UNDERSTANDING MODE — public education only (no personal result UI)
          ═══════════════════════════════════════════════════════════════════ */}
      {isLoaded && view.kind === 'no_profile' && (
        <section
          className={styles.understandingSection}
          data-testid="m55-home-understanding"
          aria-label="M55の理解"
        >
          <p className={styles.understandingEyebrow}>はじめに</p>
          <h2 className={styles.understandingTitle}>M55 で何が見えるか</h2>
          <div className={styles.supportCtaGroup} role="navigation" aria-label="理解を深める">
            <Link href="/how-m55-works" className={styles.supportCtaCard}>
              <span className={styles.supportCtaInner}>
                <span className={styles.supportCtaTextCol}>
                  <span className={styles.supportCtaTitle}>M55の見方を知る</span>
                  <span className={styles.supportCtaSub}>流れと無料で見える範囲</span>
                </span>
                <span className={styles.supportCtaChevron} aria-hidden>›</span>
              </span>
            </Link>
            <Link href="/ten-views" className={styles.supportCtaCard}>
              <span className={styles.supportCtaInner}>
                <span className={styles.supportCtaTextCol}>
                  <span className={styles.supportCtaTitle}>10通りの資質を知る</span>
                  <span className={styles.supportCtaSub}>ラベルの意味と読み方</span>
                </span>
                <span className={styles.supportCtaChevron} aria-hidden>›</span>
              </span>
            </Link>
          </div>

          <div className={styles.unifiedAxisCard} data-testid="m55-home-demo-five-element">
            <p className={styles.unifiedAxisTitle}>5つの解析軸の見方</p>
            <p className={styles.unifiedAxisIntro}>C〜L のバランスで傾向を整理（下は共通サンプル）</p>
            <div className={styles.unifiedAxisSample}>
              <div className={styles.elementInnerRow}>
                <FiveElementRing
                  weights={showcaseWeights}
                  primaryElemIdx={showcaseElemIdx}
                  size={72}
                />
                <div className={styles.legendColumn}>
                  {FIVE_ELEMENTS.map((elem, i) => {
                    const w = showcaseWeights[i] ?? 0;
                    return (
                      <div
                        key={elem.char}
                        className={w >= 16 ? styles.legendRow : styles.legendRowMuted}
                      >
                        <span className={styles.legendDot} style={{ background: elem.color }} />
                        <span className={styles.legendCode} style={{ color: elem.color }}>
                          {elem.code}
                        </span>
                        <span className={styles.legendAxisBlock}>
                          <span className={styles.legendAxisEn}>{elem.axis}</span>
                          <span className={styles.legendAxisJp}> / {elem.genre}</span>
                        </span>
                        <span className={styles.legendIntensity} aria-hidden>
                          {axisIntensityBlocks(w)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <p className={styles.unifiedAxisFoot}>個人の結果はプロフィール保存後に表示</p>
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
        <p className={styles.reportSectionEyebrow}>有料レポート</p>

        <div className={styles.valueCard}>
          <p className={styles.valueEyebrow}>Entry Report</p>
          <p className={styles.valuePrice}>¥1,000（税込）</p>

          <p className={styles.depthNote}>
            無料面と同じ本質を、章立ての構造で深く整理した版です。
          </p>

          <ul className={styles.featureListLoose}>
            <li className={styles.featureItemLoose}>本質を章立てで深く読む</li>
            <li className={styles.featureItemLoose}>相談1回付属（購入者専用ルーム）</li>
            <li className={styles.featureItemLoose}>永久閲覧・物理配送なし</li>
          </ul>

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
              無料面は見取り図です。Entry Report は同じ本質を構造化して所有する版です。
            </p>
          </div>

          <p className={styles.reportAuxCard}>
            購入者専用ルームで、レポートに沿って AI チャットにより深掘りできます。
          </p>

          <Link href="/dtr/lp" className={styles.reportCta}>
            Entry Reportを見る →
          </Link>
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

      <footer className={styles.trustFooter}>
        <div className={styles.legalLinks}>
          <Link href="/support" className={styles.legalLink}>サポート</Link>
          <span className={styles.legalSep}> · </span>
          <Link href="/legal/refund" className={styles.legalLink}>返金</Link>
          <span className={styles.legalSep}> · </span>
          <Link href="/legal/tokushoho" className={styles.legalLink}>特商法</Link>
          <span className={styles.legalSep}> · </span>
          <Link href="/legal/terms" className={styles.legalLink}>利用規約</Link>
          <span className={styles.legalSep}> · </span>
          <Link href="/legal/privacy" className={styles.legalLink}>プライバシー</Link>
        </div>
        <p className={styles.copyright}>© 2026 M55</p>
      </footer>

    </div>
  );
}
