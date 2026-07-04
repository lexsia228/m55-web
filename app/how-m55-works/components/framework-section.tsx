import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../../lib/m55/topFreeEntryPublicCopy';
import styles from '../how-it-works.module.css';

const copy = TOP_FREE_ENTRY_PUBLIC_COPY.howM55Works;

const VERTICES: [number, number][] = [
  [100, 20],
  [180, 75],
  [155, 165],
  [45, 165],
  [20, 75],
];

export function FrameworkSection() {
  return (
    <section className={styles.shellWide} aria-labelledby="how-m55-individual-title">
      <p className={styles.sectionKicker}>{copy.section03KickerJa}</p>
      <h2 id="how-m55-individual-title" className={styles.sectionTitle}>
        {copy.section03TitleJa}
      </h2>
      {copy.section03ParagraphsJa.map((paragraph) => (
        <p key={paragraph.slice(0, 24)} className={styles.sectionLead}>
          {paragraph.split('\n').map((line, index, lines) => (
            <span key={`${line}-${index}`}>
              {line}
              {index < lines.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
      ))}

      <div className={`${styles.frameworkVisual} ${styles.visibleAxisFigure}`}>
        <svg className={styles.pentagonSvg} viewBox="0 0 200 200" aria-hidden>
          <polygon
            points="100,20 180,75 155,165 45,165 20,75"
            fill="none"
            stroke="rgba(0,0,0,0.12)"
            strokeWidth="1"
          />
          <circle cx="100" cy="100" r="3" fill="rgba(60,60,60,0.35)" />
          {VERTICES.map(([x, y], i) => (
            <line
              key={`l-${i}`}
              x1="100"
              y1="100"
              x2={x}
              y2={y}
              stroke="rgba(0,0,0,0.1)"
              strokeWidth="1"
              strokeDasharray="2 4"
            />
          ))}
          {VERTICES.map(([x, y], i) => (
            <circle key={`d-${i}`} cx={x} cy={y} r="4" fill="rgba(107,95,168,0.25)" />
          ))}
        </svg>
        <p className={styles.visualCaption}>5つの視点（抽象イメージ）</p>
      </div>

      <p className={`${styles.sectionLead} ${styles.sectionLanding}`}>
        {copy.section03LandingJa.split('\n').map((line, index, lines) => (
          <span key={`${line}-${index}`}>
            {line}
            {index < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
    </section>
  );
}
