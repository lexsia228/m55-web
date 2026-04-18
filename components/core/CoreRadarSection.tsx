import { AXIS_ORDER } from '../../lib/m55/coreResult/axisMeta';
import type { CoreResult } from '../../lib/m55/coreResult/types';
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

  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.surfaceRadar} ${styles.tierASurface} ${styles.coreReveal}`}
      aria-labelledby="core-radar-title"
      data-core-reveal
    >
      <div className={styles.radarSectionHeader}>
        <span className={styles.tierAOverline}>輪郭</span>
        <h2 id="core-radar-title" className={styles.sectionTitle}>
          傾向の輪郭
        </h2>
        <p className={styles.tierASummary}>5つの軸を、ひとつの輪郭として見ます</p>
        <p className={styles.sectionLead}>
          {withNickname(
            'これは良し悪しではなく、tさんがふだんどんな出方をしやすいかを、5つの視点で見た輪郭です。',
            nick,
          )}
        </p>
        <p className={styles.radarTip}>外に開くほど、その視点が表に出やすい傾向があります。</p>
      </div>
      <div className={styles.radarWrap}>
        <svg
          width="100%"
          viewBox={`0 0 ${VB} ${VB}`}
          role="img"
          aria-label="五つの視点の輪郭図"
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
          <polygon
            points={poly.join(' ')}
            fill="rgba(107, 95, 168, 0.06)"
            stroke="rgba(107, 95, 168, 0.62)"
            strokeWidth={1.55}
            strokeLinejoin="round"
          />
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
      <p className={styles.radarSubLead}>このあと下で、5つの軸をひとつずつ見ていきます。</p>
    </section>
  );
}
