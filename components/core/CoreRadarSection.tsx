import { AXIS_ORDER } from '../../lib/m55/coreResult/axisMeta';
import type { CoreResult } from '../../lib/m55/coreResult/types';
import { AXIS_SHORT_JA } from './corePublicAxisLabels';
import { withNickname } from './corePublicCopy';
import styles from './CoreExperience.module.css';

const VB = 272;
const CX = VB / 2;
const CY = VB / 2;
const R_MAX = 82;
const R_MIN = 22;

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

  const gridPolys = [0.45, 0.72, 1].map((f) => {
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
      className={`${styles.section} ${styles.coreSectionSurface}`}
      aria-labelledby="core-radar-title"
    >
      <div className={styles.radarSectionHeader}>
        <h2 id="core-radar-title" className={styles.sectionTitle}>
          傾向の輪郭
        </h2>
        <p className={styles.sectionLead}>
          {withNickname(
            'これは良し悪しではなく、t の本質を支える5つの固定観測軸の輪郭です。',
            nick,
          )}
        </p>
      </div>
      <div className={styles.radarWrap}>
        <svg
          width="100%"
          viewBox={`0 0 ${VB} ${VB}`}
          role="img"
          aria-label="五つの固定観測軸の輪郭を示す図"
        >
          {gridPolys.map((p, idx) => (
            <polygon
              key={idx}
              points={p}
              fill="none"
              stroke="rgba(90,80,120,0.1)"
              strokeWidth={1}
            />
          ))}
          <polygon
            points={poly.join(' ')}
            fill="rgba(107, 95, 168, 0.1)"
            stroke="rgba(107, 95, 168, 0.55)"
            strokeWidth={1.4}
            strokeLinejoin="round"
          />
          {AXIS_ORDER.map((key, i) => {
            const [lx, ly] = pointFor(i, n, R_MAX + 26);
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
    </section>
  );
}
