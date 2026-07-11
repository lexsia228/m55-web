'use client';

import { useState } from 'react';
import { AXIS_ORDER } from '../../lib/m55/coreResult/axisMeta';
import type { AxisKey, CoreResult } from '../../lib/m55/coreResult/types';
import { AXIS_SHORT_JA } from './corePublicAxisLabels';
import { withNickname } from './corePublicCopy';
import styles from './CoreExperience.module.css';

const VB = 300;
const CX = VB / 2;
const CY = VB / 2;
const R_MAX = 92;
const R_MIN = 24;

function pointFor(i: number, n: number, radius: number): [number, number] {
  const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
  return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)];
}

const AXIS_MEANING: Record<AxisKey, string> = {
  socialEnergy: '人との関わり方',
  stability: '感情の受け取り方',
  openness: '考えや発想の広がり',
  cooperation: '人との関係の保ち方',
  structure: '物事の進め方や段取り',
};

type RadarSummary = { line1: string; line2: string };

function buildRadarSummary(scores: CoreResult['coreAxisScores']): RadarSummary {
  const SHORT = AXIS_SHORT_JA;
  const sorted = [...AXIS_ORDER].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));
  const [first, second, third] = sorted;
  const s0 = scores[first!] ?? 0;
  const s1 = scores[second!] ?? 0;
  const s2 = scores[third!] ?? 0;

  if (s0 >= 78 && s1 < 55) {
    return {
      line1: `${SHORT[first!]}が強く前に出やすい輪郭です。`,
      line2: `${AXIS_MEANING[first!]}に、自分らしい輪郭が出やすい形です。`,
    };
  }
  if (s0 >= 62 && s1 >= 62 && s2 < 45) {
    return {
      line1: `${SHORT[first!]}と${SHORT[second!]}が前に出やすい輪郭です。`,
      line2: `${AXIS_MEANING[first!]}と${AXIS_MEANING[second!]}に輪郭が出やすい形です。`,
    };
  }
  if (s0 >= 62 && s1 >= 62 && s2 >= 62) {
    return {
      line1: `${SHORT[first!]}・${SHORT[second!]}・${SHORT[third!]}が広がりやすい輪郭です。`,
      line2: `複数の視点にわたって輪郭が広がりやすく、全体的に前に出やすい傾向があります。`,
    };
  }
  if (s0 >= 55 && s1 >= 45) {
    return {
      line1: `${SHORT[first!]}と${SHORT[second!]}が効きやすい輪郭です。`,
      line2: `${AXIS_MEANING[first!]}を中心に、自分の動き方の傾向が出やすい形です。`,
    };
  }
  return {
    line1: `${SHORT[first!]}を軸に、全体が穏やかに効きやすい輪郭です。`,
    line2: `特定の軸に偏らず、場に応じて使い分けやすい形です。`,
  };
}

export default function CoreRadarSection({
  result,
  nickname,
}: {
  result: CoreResult;
  nickname: string;
}) {
  const nick = nickname.trim();
  const scores = result.coreAxisScores;
  const n = AXIS_ORDER.length;

  const [revealed, setRevealed] = useState(false);

  function handleReveal() {
    setRevealed(true);
  }

  const poly: string[] = [];
  for (let i = 0; i < n; i++) {
    const key = AXIS_ORDER[i]!;
    const sc = scores[key] ?? 0;
    const t = Math.max(0, Math.min(1, sc / 100));
    const rad = R_MIN + t * (R_MAX - R_MIN);
    const [x, y] = pointFor(i, n, rad);
    poly.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  const gridPolys = [0.68, 1].map((f) => {
    const pts: string[] = [];
    for (let i = 0; i < n; i++) {
      const rad = R_MIN + f * (R_MAX - R_MIN);
      const [x, y] = pointFor(i, n, rad);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join(' ');
  });

  const summary = buildRadarSummary(scores);

  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.surfaceRadar} ${styles.tierASurface}`}
      aria-labelledby="core-radar-title"
    >
      <div className={styles.radarSectionHeader}>
        <span className={styles.tierAOverline}>輪郭</span>
        <h2 id="core-radar-title" className={styles.sectionTitle}>
          傾向の輪郭
        </h2>
        <p className={styles.tierASummary}>生年月日から見る輪郭を、ひとつの形として見ます</p>
        <p className={styles.sectionLead}>
          {withNickname(
            '良し悪しではなく、tさんの生年月日から見えやすい土台の傾向を見た結果です。回答から見る5つの視点とは別の層です。',
            nick,
          )}
        </p>
        <p className={styles.radarTip}>外に開くほど、その軸が表に出やすい傾向があります。</p>
      </div>

      {!revealed && (
        <div className={styles.radarRevealBtnWrap}>
          <button
            type="button"
            className={styles.radarRevealBtn}
            onClick={handleReveal}
          >
            <span className={styles.radarRevealBtnIcon} aria-hidden>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M2.5 12C4.5 7 8 4.5 12 4.5S19.5 7 21.5 12c-2 5-5.5 7.5-9.5 7.5S4.5 17 2.5 12z" stroke="currentColor" strokeWidth="1.8"/>
              </svg>
            </span>
            私の輪郭を見る
          </button>
          <p className={styles.radarRevealHelper}>
            タップすると、生年月日から見る輪郭の形が表示されます
          </p>
        </div>
      )}

      <div className={styles.radarWrap}>
        <svg
          width="100%"
          viewBox={`0 0 ${VB} ${VB}`}
          role="img"
          aria-label={
            revealed ? `傾向の輪郭: ${summary.line1}` : '生年月日から見る輪郭図（ボタンを押すと表示）'
          }
        >
          {gridPolys.map((p, idx) => (
            <polygon
              key={idx}
              points={p}
              fill="none"
              stroke="rgba(107, 95, 168, 0.13)"
              strokeWidth={idx === 0 ? 0.9 : 1}
            />
          ))}

          {revealed && (
            <g className={styles.radarDataGroup}>
              <polygon
                points={poly.join(' ')}
                fill="rgba(107, 95, 168, 0.10)"
                stroke="rgba(107, 95, 168, 0.72)"
                strokeWidth={1.75}
                strokeLinejoin="round"
              />
            </g>
          )}

          {AXIS_ORDER.map((key, i) => {
            const [lx, ly] = pointFor(i, n, R_MAX + 14);
            const ta = (-90 + (i / n) * 360 + 360) % 360;
            const anchor =
              ta > 35 && ta < 145 ? 'end' : ta > 215 && ta < 325 ? 'start' : 'middle';
            const dy = ta > 135 && ta < 225 ? 12 : ta > 315 || ta < 45 ? -4 : 4;
            return (
              <text
                key={key}
                x={lx}
                y={ly + dy}
                textAnchor={anchor}
                fontSize={10.5}
                fill="rgba(60,60,60,0.78)"
              >
                {AXIS_SHORT_JA[key]}
              </text>
            );
          })}
        </svg>
      </div>

      {revealed && (
        <div className={styles.radarSummaryCard}>
          <div className={styles.radarSummaryBadge} aria-hidden>
            <span className={styles.radarSummaryBadgeDot} />
            まとめ
          </div>
          <p>{summary.line1}</p>
          <p>{summary.line2}</p>
        </div>
      )}

      <p className={styles.radarSubLead}>このあと下で、5つの軸をひとつずつ見ていきます。</p>
    </section>
  );
}
