'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FreeFiveViewInput } from '../../lib/m55/freeResult/buildFreeFiveViewCompositionV1';
import { buildPersonalFreeNarrativeShareContextV1 } from '../../lib/m55/narrative/projectPersonalFreeNarrativeV1';
import {
  projectPersonalPublicShareV1,
  recommendPublicShareVariant,
} from '../../lib/m55/narrative/projectPublicShareV1';
import type { ShareCandidateVariant } from '../../lib/m55/narrative/m55NarrativeSpecV1';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelActionOnce,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import PublicShareCardPreview from './PublicShareCardPreview';
import NarrativeShareActions from './NarrativeShareActions';
import styles from './NarrativeShare.module.css';

const VARIANTS: readonly ShareCandidateVariant[] = ['manual', 'seen_vs_actual', 'hidden_spec'];

const ROLE_HINT: Readonly<Record<(typeof VARIANTS)[number], string>> = {
  manual: '残して見せる',
  seen_vs_actual: '反応を見る',
  hidden_spec: '意外な一点',
};

export default function ShareCardChooser({ input }: { input: FreeFiveViewInput }) {
  const [selected, setSelected] = useState<ShareCandidateVariant | null>(null);
  const context = useMemo(
    () => buildPersonalFreeNarrativeShareContextV1(input),
    [input.birthDate, input.stemLaneIndex, input.freeAnswerSet],
  );

  useEffect(() => {
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.shareCardImpression,
      'core_share',
      'narrative-share-chooser',
    );
  }, []);

  if (!context.ok) return null;
  const { narrative, answerAxes, birthAxes, hingeAxisId, stemLaneIndex } = context.value;
  const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
  const specs = Object.fromEntries(
    VARIANTS.map((variant) => [
      variant,
      projectPersonalPublicShareV1({
        narrative,
        variant,
        stemLaneIndex,
        answerAxes,
        birthAxes,
        hingeAxisId,
        origin,
      }),
    ]),
  ) as Record<(typeof VARIANTS)[number], ReturnType<typeof projectPersonalPublicShareV1>>;
  const recommended = recommendPublicShareVariant({ answerAxes, birthAxes });
  const spec = selected ? specs[selected] : null;

  return (
    <section
      className={`${styles.chooser} m55-exp-reading`}
      aria-labelledby="narrative-share-chooser-title"
      data-testid="m55-free-result-share"
      data-m55-share-presentation="free"
      id="core-share"
    >
      <span className={styles.optionLabel}>共有</span>
      <h2 id="narrative-share-chooser-title" className={styles.headline}>
        どの自分を見せる？
      </h2>
      <p className={styles.chooserLead}>
        見せたい自分を一枚だけ選んでください。生年月日や回答そのものは含まれません。
      </p>
      <div className={styles.optionGrid} role="list">
        {VARIANTS.map((variant) => {
          const candidate = narrative.shareCandidates.find((item) => item.variant === variant);
          if (!candidate || !specs[variant]) return null;
          const isRecommended = variant === recommended;
          return (
            <button
              key={variant}
              type="button"
              className={styles.option}
              data-selected={selected === variant ? 'true' : 'false'}
              data-recommended={isRecommended ? 'true' : 'false'}
              data-testid={`m55-share-card-${variant}`}
              data-variant={variant}
              onClick={() => {
                setSelected(variant);
                trackFunnelActionOnce(
                  M55_FUNNEL_EVENTS.shareCardSelected,
                  'core_share',
                  `narrative-select-${variant}`,
                  { shareVariant: variant === 'seen_vs_actual' ? 'mirror' : variant === 'hidden_spec' ? 'hidden_spec' : 'manual' },
                );
              }}
            >
              <span className={styles.optionLabel}>{ROLE_HINT[variant]}</span>
              <span className={styles.optionTitle}>{candidate.labelJa}</span>
              {isRecommended ? (
                <span className={styles.optionHint} data-testid="m55-share-card-recommended">
                  {variant === 'hidden_spec' ? 'いちばん意外な結果' : 'おすすめ'}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {spec ? (
        <div className={styles.preview} data-testid="m55-share-preview">
          <p className={styles.optionLabel}>共有される内容</p>
          <PublicShareCardPreview spec={spec} />
          <p className={styles.chooserLead} data-testid="m55-share-preview-text">
            {spec.shareTextJa}
          </p>
          <p
            className={styles.mark}
            data-testid="m55-share-preview-url"
            data-share-path={spec.sharePath}
          >
            M55の共有ページ
          </p>
          <NarrativeShareActions spec={spec} surface="core_share" />
        </div>
      ) : null}
    </section>
  );
}
