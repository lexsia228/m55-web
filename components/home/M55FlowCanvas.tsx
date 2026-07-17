'use client';

import styles from './M55FlowCanvas.module.css';

type M55FlowCanvasProps = {
  'data-testid': string;
  eyebrow: string;
  ctaLabel: string;
  meta: string;
  personalLabels: readonly string[];
  relationshipLabels: readonly string[];
};

function FlowLabels({
  labels,
  kind,
}: {
  labels: readonly string[];
  kind: 'personal' | 'relationship';
}) {
  return (
    <ol className={styles.flowLabels} data-flow-kind={kind}>
      {labels.map((label, index) => (
        <li className={styles.flowLabel} data-flow-point={index + 1} key={label}>
          <span>{label}</span>
        </li>
      ))}
    </ol>
  );
}

export function M55FlowCanvas({
  'data-testid': ctaTestId,
  eyebrow,
  ctaLabel,
  meta,
  personalLabels,
  relationshipLabels,
}: M55FlowCanvasProps) {
  return (
    <div
      className={styles.canvas}
      data-testid="m55-home-flow-canvas"
      data-m55-flow-static-fallback="complete"
    >
      <div className={styles.backgroundTexture} aria-hidden />

      <div className={styles.intro}>
        <div className={styles.brandLine}>
          <p className={styles.mark}>M55</p>
          <p className={styles.eyebrow}>{eyebrow}</p>
        </div>
        <h1 className={styles.headline}>
          <span>あなたの「いつもこうなる」</span>
          <span>には、順番がある。</span>
        </h1>
      </div>

      <div className={styles.flowScene} data-testid="m55-home-flow-scene">
        <section
          className={`${styles.flowBand} ${styles.personalFlow}`}
          aria-labelledby="m55-personal-flow-title"
          data-testid="m55-home-personal-flow"
        >
          <div className={styles.flowHeading}>
            <p className={styles.flowIndex}>PERSONAL FLOW</p>
            <h2 id="m55-personal-flow-title">個人の流れ</h2>
          </div>
          <div className={styles.flowTrack}>
            <svg
              className={`${styles.flowSvg} ${styles.wideFlowSvg}`}
              viewBox="0 0 1000 180"
              preserveAspectRatio="none"
              aria-hidden="true"
              focusable="false"
            >
              <path
                className={styles.personalPath}
                d="M18 108 C135 108 166 46 276 46 C389 46 432 126 548 126 C668 126 711 66 824 66 C901 66 949 103 982 103"
                pathLength="1"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <svg
              className={`${styles.flowSvg} ${styles.narrowFlowSvg}`}
              viewBox="0 0 320 168"
              preserveAspectRatio="none"
              aria-hidden="true"
              focusable="false"
            >
              <path
                className={styles.personalPath}
                d="M28 15 C28 49 284 31 284 67 C284 101 30 83 30 119 C30 143 209 147 286 151"
                pathLength="1"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <FlowLabels labels={personalLabels} kind="personal" />
          </div>
        </section>

        <section
          className={`${styles.flowBand} ${styles.relationshipFlow}`}
          aria-labelledby="m55-relationship-flow-title"
          data-testid="m55-home-relationship-flow"
        >
          <div className={styles.flowHeading}>
            <p className={styles.flowIndex}>RELATIONSHIP FLOW</p>
            <h2 id="m55-relationship-flow-title">二人の関係の流れ</h2>
          </div>
          <div className={styles.flowTrack}>
            <svg
              className={`${styles.flowSvg} ${styles.wideFlowSvg}`}
              viewBox="0 0 1000 210"
              preserveAspectRatio="none"
              aria-hidden="true"
              focusable="false"
            >
              <path
                className={styles.relationshipCoralPath}
                d="M18 48 C154 48 231 104 370 104 C503 104 552 75 672 76 C794 77 865 132 982 166"
                pathLength="1"
                vectorEffect="non-scaling-stroke"
              />
              <path
                className={styles.relationshipIndigoPath}
                d="M18 166 C154 166 231 104 370 104 C503 104 552 128 672 127 C794 126 865 87 982 48"
                pathLength="1"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <svg
              className={`${styles.flowSvg} ${styles.narrowFlowSvg}`}
              viewBox="0 0 320 178"
              preserveAspectRatio="none"
              aria-hidden="true"
              focusable="false"
            >
              <path
                className={styles.relationshipCoralPath}
                d="M38 12 C38 52 158 42 158 81 C158 111 263 110 286 164"
                pathLength="1"
                vectorEffect="non-scaling-stroke"
              />
              <path
                className={styles.relationshipIndigoPath}
                d="M282 12 C282 52 158 42 158 81 C158 111 57 110 34 164"
                pathLength="1"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <FlowLabels labels={relationshipLabels} kind="relationship" />
          </div>
        </section>
      </div>

      <div className={styles.action}>
        <a
          href="#m55-home-free-intents"
          className={styles.cta}
          data-testid={ctaTestId}
          data-m55-hero-intent-anchor="true"
        >
          {ctaLabel}
        </a>
        <p className={styles.meta}>{meta}</p>
      </div>
    </div>
  );
}
