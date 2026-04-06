'use client';

/**
 * HomePanel — 販売・導入の主舞台。鑑定後も無料説明・探索・Entry Report 訴求は消さない。
 * 鑑定後も Home 上では個人結果（5軸個人図・今の焦点・今日/今週・要約カード等）を一切出さない。
 */

import Image from 'next/image';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ProfileRepository } from '../../lib/soul/profile';
import BirthProfileIntakeLayer from '../profile/BirthProfileIntakeLayer';
import HomeCoreAnalyzingOverlay from './HomeCoreAnalyzingOverlay';
import styles from './HomePanel.module.css';

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
  const router = useRouter();
  const ownerId = user?.id ?? null;
  const [profileEpoch, setProfileEpoch] = useState(0);
  const [birthIntakeOpen, setBirthIntakeOpen] = useState(false);
  const [coreAnalyzing, setCoreAnalyzing] = useState(false);

  useEffect(() => {
    const bump = () => setProfileEpoch((n) => n + 1);
    window.addEventListener('m55:profile_updated', bump);
    return () => window.removeEventListener('m55:profile_updated', bump);
  }, []);

  useEffect(() => {
    if (!coreAnalyzing) return;
    const t = window.setTimeout(() => {
      setCoreAnalyzing(false);
      router.push('/core');
    }, 3000);
    return () => window.clearTimeout(t);
  }, [coreAnalyzing, router]);

  const view = useMemo(() => {
    if (!isLoaded) return { kind: 'loading' as const };
    const profile = ProfileRepository.get(ownerId);
    if (!profile?.birthDate || !profile.nickname?.trim()) return { kind: 'no_profile' as const };
    return { kind: 'has_profile' as const };
  }, [isLoaded, ownerId, profileEpoch]);

  const hasProfile = view.kind === 'has_profile';
  const showPublicValueBlocks = isLoaded && view.kind !== 'loading';

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
              <div className={styles.posterHeroFoot}>
                <div className={styles.posterHeroCopy}>
                  <div className={styles.posterHeroTopBlock}>
                    <div className={styles.posterHeroLabelGroup}>
                      <p className={styles.posterHeroBrandM55}>M55</p>
                      <p className={styles.posterHeroProductTitle}>Entry Report</p>
                    </div>
                    <h1 className={styles.posterHeroTitleBlite}>
                      <span className={styles.posterHeroTitleLine}>生まれた日からひらく</span>
                      <span className={styles.posterHeroTitleLine}>あなたの強みの見取り図</span>
                    </h1>
                  </div>
                  <div className={styles.posterHeroBreathing} aria-hidden />
                  <div className={styles.posterHeroBottomStack}>
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
                    {hasProfile && (
                      <p className={styles.posterHeroCoreLink} data-testid="m55-home-has-profile-hero">
                        <Link href="/core" className={styles.posterHeroCoreLinkA}>
                          本質ページを開く →
                        </Link>
                      </p>
                    )}
                    <p className={styles.posterHeroSupportInline}>
                      生まれた日から個人向けの見取り図が開きます。
                      <br />
                      無料ではまず輪郭まで見えます。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div
        className={`${styles.homeSurfaceShell} ${styles.homeBelowHeroStack}`}
        data-testid="m55-home-public-surface-shell"
      >
      {showPublicValueBlocks && (
        <div
          className={`${styles.homeSurfaceCard} ${styles.homeTierStack}`}
          data-testid="m55-home-tier-stack"
          aria-label="無料で得られるもの、このサイトで読めること、有料レポートの違い"
        >
          <div className={styles.homeTierRow}>
            <span className={styles.homeTierBadge}>無料</span>
            <p className={styles.homeTierText}>
              生まれた日から5つの視点の見取り図（傾向のバランス）が開きます。
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
      {showPublicValueBlocks && (
        <section
          className={styles.useExploreSection}
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
              <span
                className={`${styles.useExploreIconThumbExplore} ${styles.useExploreIconThumbQualities}`}
              >
                <Image
                  src="/home/card-qualities-flower.webp"
                  alt=""
                  fill
                  sizes="60px"
                  className={`${styles.useExploreThumbImage} ${styles.useExploreThumbImageQualities}`}
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

      {showPublicValueBlocks && (
        <section
          className={`${styles.homeSurfaceCard} ${styles.homeSurfaceCardSoft} ${styles.fiveAxisReadCard}`}
          data-testid="m55-home-five-axis-read"
          aria-labelledby="m55-home-five-axis-read-title"
        >
          <h2 id="m55-home-five-axis-read-title" className={styles.fiveAxisReadTitle}>
            5つの解析軸の見方
          </h2>
          <p className={styles.fiveAxisReadLead}>円のバランスでいまの出方をざっと整理します。</p>
          <div className={styles.fiveAxisReadMeterWrap}>
            <ExploreFiveAxisMeter className={styles.fiveAxisReadMeterSvg} />
          </div>
          <div className={styles.fiveAxisReadCardGrid}>
            <div className={styles.fiveAxisReadMiniCard}>
              <p className={styles.fiveAxisReadMiniCardText}>
                5つの視点の配分をひとつの見取り図として見ます。
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

      </div>

      <div
        className={`${styles.homeSurfaceShell} ${styles.homeBelowHeroStack}`}
        data-testid="m55-home-report-shell"
      >
      {/* ═══════════════════════════════════════════════════════════════════
          FOLD 5: ENTRY REPORT MONETIZATION LAYER (always visible)
          One hero only — no second product or second price.
          ═══════════════════════════════════════════════════════════════════ */}
      <section className={styles.reportSection} aria-label="Entry Report">
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

              <p className={styles.depthNote}>無料の見取り図と同じ本質を章立てで深く読む版です。</p>

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
                  購入者専用ルームで、レポートに沿って AI チャットで深掘りできます。
                </p>

                <Link href="/dtr/lp" className={styles.reportCta}>
                  Entry Reportを見る →
                </Link>
              </div>
            </div>
          </div>
          </div>
      </section>

      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          FOLD 6: TRUST FOOTER (always visible)
          ═══════════════════════════════════════════════════════════════════ */}
      <BirthProfileIntakeLayer
        open={birthIntakeOpen}
        ownerId={ownerId}
        nicknameHint={nicknameHint}
        onClose={() => setBirthIntakeOpen(false)}
        onSaved={() => setCoreAnalyzing(true)}
        dataTestId="m55-home-birth-intake-layer"
      />

      <HomeCoreAnalyzingOverlay open={coreAnalyzing} />

    </div>
  );
}
