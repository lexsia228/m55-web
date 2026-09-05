'use client';

import type { PublicShareSpecV1 } from '../../lib/m55/narrative/publicShareSpecV1';
import { parsePublicCardDisplayV1, posterHeroLinesJa } from '../../lib/m55/narrative/publicCardDisplayV1';
import { buildPairSharePresentationV1 } from '../../lib/m55/narrative/pairSharePresentationV1';
import styles from './NarrativeShare.module.css';

export type ShareAspectRatio = '1:1' | '4:5' | '9:16';

export default function PublicShareCardPreview({
  spec,
  premiumMark = false,
  imagePath,
  aspectRatio = '4:5',
  shareSubsystem,
}: {
  spec: PublicShareSpecV1;
  premiumMark?: boolean;
  imagePath?: string;
  aspectRatio?: ShareAspectRatio;
  shareSubsystem?: 'self' | 'pair';
}) {
  const display = parsePublicCardDisplayV1(spec);
  const variant = spec.variant;
  const art = imagePath?.trim() ?? '';
  const pairPresentation = buildPairSharePresentationV1(spec, aspectRatio);
  const subsystem =
    shareSubsystem ??
    (variant === 'pair_manual' || variant === 'pair_generic' ? 'pair' : 'self');

  return (
    <article
      className={`${styles.card} ${art || pairPresentation ? styles.cardWithArt : ''} ${pairPresentation ? styles.cardPair : ''}`}
      data-testid="m55-narrative-share-card"
      data-share-card="true"
      data-card-variant={variant}
      data-share-path={spec.sharePath}
      data-share-art={art || pairPresentation ? 'true' : 'false'}
      data-share-aspect={aspectRatio}
      data-m55-share-subsystem={subsystem}
      aria-label={`M55の共有カード：${spec.headline}`}
    >
      {pairPresentation ? (
        <>
          <div className={styles.pairDualHeroBand} aria-hidden data-testid="m55-pair-share-trait-hero">
            <div className={styles.pairDualHeroCell}>
              <img className={styles.pairDualHeroImage} src={pairPresentation.heroPaths[0]} alt="" decoding="async" />
            </div>
            <div className={styles.pairDualHeroCell}>
              <img className={styles.pairDualHeroImage} src={pairPresentation.heroPaths[1]} alt="" decoding="async" />
            </div>
            <div className={styles.pairDualHeroVeil} />
          </div>
          <header className={styles.pairShareHeader} data-testid="m55-pair-share-header">
            <p className={styles.brand}>M55</p>
            {pairPresentation.showGenericHeadline ? <p className={styles.pairShareKicker}>{spec.headline}</p> : null}
          <p className={styles.pairTraitLabel} data-testid="m55-pair-share-trait-label">
              {pairPresentation.pairLabel}
          </p>
          </header>
        </>
      ) : art ? (
        <div className={styles.cardArt} aria-hidden>
          <img className={styles.cardArtImage} src={art} alt="" decoding="async" />
          <div className={styles.cardArtVeil} />
        </div>
      ) : null}
      {!pairPresentation ? (
        <>
          <p className={styles.brand}>M55</p>
          <h3 className={styles.headline}>{spec.headline}</h3>
        </>
      ) : null}

      {variant === 'manual' && display.rows.length > 0 ? (
        <dl className={styles.specSheet}>
          {display.rows.map((row) => (
            <div key={row.label} className={styles.specRow}>
              <dt className={styles.specLabel}>{row.label}：</dt>
              <dd className={styles.specValue}>{row.body}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {variant === 'seen_vs_actual' && display.seenJa && display.actualJa ? (
        <div className={styles.mirror}>
          <div className={styles.mirrorPane} data-side="seen">
            <p className={styles.mirrorLabel}>外から見えやすい動き</p>
            <p className={styles.mirrorBody}>「{display.seenJa}」</p>
          </div>
          <p className={styles.mirrorVs} aria-hidden>
            vs
          </p>
          <div className={styles.mirrorPane} data-side="actual">
            <p className={styles.mirrorLabel}>自分に出やすい傾向</p>
            <p className={styles.mirrorBody}>「{display.actualJa}」</p>
          </div>
        </div>
      ) : null}

      {(variant === 'hidden_spec' || variant === 'premium_takeaway') && display.heroJa ? (
        <div className={styles.poster}>
          {posterHeroLinesJa(display.heroJa).map((line) => (
            <p key={line} className={styles.posterHero}>
              {line}
            </p>
          ))}
          {display.supportJa ? <p className={styles.posterSupport}>{display.supportJa}</p> : null}
        </div>
      ) : null}

      {variant === 'pair_manual' && pairPresentation ? (
        <div className={styles.relation} data-testid="m55-pair-share-relation">
          {pairPresentation.relationMode === 'combined' ? (
            <p className={styles.relationCombined} data-testid="m55-pair-share-relation-combined">
              {pairPresentation.combinedRelationJa}
            </p>
          ) : pairPresentation.sideAJa && pairPresentation.sideBJa ? (
            <>
              <div className={styles.relationSide} data-testid="m55-pair-share-relation-a">
                <span className={styles.relationLabel}>一方</span>
                <p className={styles.relationBody}>{pairPresentation.sideAJa}</p>
              </div>
              <p className={styles.mirrorVs} aria-hidden data-testid="m55-pair-share-arrow">
                →
              </p>
              <div className={styles.relationSide} data-testid="m55-pair-share-relation-b">
                <span className={styles.relationLabel}>もう一方</span>
                <p className={styles.relationBody}>{pairPresentation.sideBJa}</p>
              </div>
            </>
          ) : (
            <div className={styles.relationSide} data-testid="m55-pair-share-relation-a">
              <span className={styles.relationLabel}>すれ違いの入口</span>
              <p className={styles.relationBody}>{pairPresentation.sideAJa}</p>
            </div>
          )}
        </div>
      ) : null}

      {variant === 'pair_generic' ? <p className={styles.body}>{spec.body}</p> : null}

      {pairPresentation ? (
        pairPresentation.showCue ? <p className={styles.cue} data-testid="m55-pair-share-cue">{pairPresentation.cueJa}</p> : null
      ) : display.cueJa ? <p className={styles.cue}>{display.cueJa}</p> : null}
      <p className={styles.cta} data-testid={pairPresentation ? 'm55-pair-share-card-cta' : undefined}>
        {pairPresentation?.ctaJa ?? display.cta}
      </p>
      {premiumMark ? <p className={styles.mark}>M55 プレミアムレポートから</p> : null}
    </article>
  );
}
