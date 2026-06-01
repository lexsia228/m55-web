'use client';

import { compositionStructureVizForStem } from '../../lib/m55/dtrEngine';
import styles from './ConsultRoom.module.css';

const AXES = ['思考', '推進', '感受', '精度', '安定'] as const;
const LABELS: Record<(typeof AXES)[number], string> = {
  思考: '考える',
  推進: '動く',
  感受: '感じる',
  精度: '伝える',
  安定: '整える',
};

const READ_COLOR = {
  front: 'rgba(203, 193, 255, 0.95)',
  bridge: 'rgba(179, 169, 230, 0.78)',
  quiet: 'rgba(157, 149, 206, 0.7)',
} as const;

function roleToRadius(role: 'core' | 'strong' | 'bridge' | 'quiet'): number {
  const weight = role === 'core' ? 1 : role === 'strong' ? 0.72 : role === 'bridge' ? 0.45 : 0.2;
  return 12 + weight * (39 - 12);
}

function pointFor(i: number, n: number, radius: number): [number, number] {
  const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
  return [50 + radius * Math.cos(a), 50 + radius * Math.sin(a)];
}

export default function ConsultReplyStructureMiniViz({ stemIdx }: { stemIdx: number }) {
  const viz = compositionStructureVizForStem(stemIdx);
  const dataPoly = AXES.map((axis, i) => {
    const [x, y] = pointFor(i, AXES.length, roleToRadius(viz.axisRoles[axis]));
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const readRows = [
    {
      label: '強く出やすい',
      color: READ_COLOR.front,
      axes: AXES.filter((axis) => viz.axisRoles[axis] === 'core' || viz.axisRoles[axis] === 'strong'),
    },
    {
      label: '支えになる',
      color: READ_COLOR.bridge,
      axes: AXES.filter((axis) => viz.axisRoles[axis] === 'bridge'),
    },
    {
      label: '整えると開く',
      color: READ_COLOR.quiet,
      axes: AXES.filter((axis) => viz.axisRoles[axis] === 'quiet'),
    },
  ].filter((row) => row.axes.length > 0);

  const gridLevels = [0.6, 1].map((f) =>
    AXES.map((_, i) => {
      const [x, y] = pointFor(i, AXES.length, 12 + f * (39 - 12));
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ')
  );

  return (
    <section className={styles.replyGraphPanel} aria-label="傾向のバランス">
      <div className={styles.replyGraphShell}>
        <svg className={styles.replyGraphSvg} viewBox="0 0 100 100" aria-hidden focusable="false">
          {gridLevels.map((pts, idx) => (
            <polygon
              key={idx}
              points={pts}
              fill="none"
              stroke="rgba(140,120,220,0.2)"
              strokeWidth={idx === 0 ? 0.6 : 0.8}
            />
          ))}
          <polygon
            points={dataPoly}
            fill="rgba(115,100,195,0.2)"
            stroke="rgba(185,165,230,0.88)"
            strokeWidth={1.4}
            strokeLinejoin="round"
          />
        </svg>
        {AXES.map((axis, i) => {
          const [x, y] = pointFor(i, AXES.length, 46);
          return (
            <span key={axis} className={styles.replyGraphAxis} style={{ left: `${x}%`, top: `${y}%` }}>
              {LABELS[axis]}
            </span>
          );
        })}
      </div>
      <p className={styles.replyGraphNote}>
        傾向のバランスを示すものであり、良い悪いの点数ではありません。
      </p>
      <div className={styles.replyPoints}>
        <p className={styles.replyPointsTitle}>今回見るポイント</p>
        {readRows.map((row) => (
          <p key={row.label} className={styles.replyPointsLine}>
            <span className={styles.replyPointsLabel} style={{ color: row.color }}>
              {row.label}
            </span>
            <span>{row.axes.map((axis) => LABELS[axis]).join('・')}</span>
          </p>
        ))}
      </div>
    </section>
  );
}
