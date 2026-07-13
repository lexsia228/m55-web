'use client';

import { useEffect, useState } from 'react';
import type {
  PaidCompatibilityChapter,
  PaidCompatibilityReportSnapshot,
} from '../../lib/m55/compatibility/buildPaidCompatibilityReportV1';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelAction,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import styles from './PaidCompatibilityReportReader.module.css';

type CopyState = {
  chapterKey: string;
  status: 'success' | 'failure';
} | null;

function chapterAnchor(chapter: PaidCompatibilityChapter): string {
  return `paid-compatibility-chapter-${chapter.number}`;
}

export default function PaidCompatibilityReportReader({
  snapshot,
  owned = false,
  analyticsEnabled = true,
}: {
  snapshot: PaidCompatibilityReportSnapshot;
  owned?: boolean;
  analyticsEnabled?: boolean;
}) {
  const [openChapterKeys, setOpenChapterKeys] = useState<readonly string[]>([]);
  const [copyState, setCopyState] = useState<CopyState>(null);

  useEffect(() => {
    if (!analyticsEnabled) return;
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.compatibilityPaidReportView,
      'compatibility_paid_report',
      'compatibility-paid-report-view',
    );
    if (owned) {
      trackFunnelImpressionOnce(
        M55_FUNNEL_EVENTS.compatibilityOwnedReportOpen,
        'compatibility_saved_report',
        'compatibility-owned-report-open',
      );
    }
  }, [analyticsEnabled, owned]);

  function openChapter(chapter: PaidCompatibilityChapter) {
    const alreadyOpen = openChapterKeys.includes(chapter.key);
    setOpenChapterKeys((current) =>
      current.includes(chapter.key) ? current : [...current, chapter.key],
    );
    if (!alreadyOpen && analyticsEnabled) {
      trackFunnelAction(
        M55_FUNNEL_EVENTS.compatibilityPaidChapterOpen,
        'compatibility_paid_report',
      );
      trackFunnelImpressionOnce(
        M55_FUNNEL_EVENTS.compatibilityExperimentView,
        'compatibility_paid_report',
        `compatibility-experiment-${chapter.key}`,
      );
    }
    window.requestAnimationFrame(() => {
      document.getElementById(chapterAnchor(chapter))?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
        block: 'start',
      });
    });
  }

  function toggleChapter(chapter: PaidCompatibilityChapter) {
    if (openChapterKeys.includes(chapter.key)) {
      setOpenChapterKeys((current) =>
        current.filter((key) => key !== chapter.key),
      );
      return;
    }
    openChapter(chapter);
  }

  async function copyPhrase(chapter: PaidCompatibilityChapter) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(chapter.usablePhrase);
      setCopyState({ chapterKey: chapter.key, status: 'success' });
      if (analyticsEnabled) {
        trackFunnelAction(
          M55_FUNNEL_EVENTS.compatibilityPhraseCopy,
          'compatibility_paid_report',
        );
      }
    } catch {
      setCopyState({ chapterKey: chapter.key, status: 'failure' });
    }
  }

  return (
    <article className={styles.reader} aria-labelledby="paid-report-title">
      <header className={styles.reportHeader}>
        <p className={styles.eyebrow}>二人の関係を扱うための6章</p>
        <h1 id="paid-report-title">{snapshot.reportTitle}</h1>
        <p className={styles.subtitle}>6つの場面から、関係の扱い方を読みます</p>
        <p className={styles.readingGuide}>
          最初から通して読む必要はありません。今気になる場面の章から開いてください。
        </p>
      </header>

      <section className={styles.overview} aria-labelledby="relationship-overview-title">
        <p className={styles.eyebrow}>はじめに</p>
        <h2 id="relationship-overview-title">二人の関係の全体像</h2>
        <p className={styles.summary}>{snapshot.relationshipSummary}</p>
        <div className={styles.foundationGrid}>
          <div>
            <h3>重なりやすい土台</h3>
            <p>{snapshot.sharedFoundation}</p>
          </div>
          <div>
            <h3>違いが出やすい土台</h3>
            <p>{snapshot.differentFoundation}</p>
          </div>
        </div>
        <div className={styles.recurringLoop}>
          <h3>二人の間で続きやすい連鎖</h3>
          <p>{snapshot.recurringLoop}</p>
        </div>
        <div className={styles.highlighted}>
          <h3>今の見取り図と直接つながる2章</h3>
          <div>
            {snapshot.highlightedChapterKeys.map((key) => {
              const chapter = snapshot.chapters.find((candidate) => candidate.key === key);
              if (!chapter) return null;
              return (
                <button key={key} type="button" onClick={() => openChapter(chapter)}>
                  <span>第{chapter.number}章</span>
                  {chapter.title}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <nav className={styles.chapterIndex} id="paid-compatibility-chapter-index" aria-label="6章の一覧">
        <div className={styles.indexHeading}>
          <p className={styles.eyebrow}>章一覧</p>
          <h2>気になる場面から開く</h2>
        </div>
        <ol>
          {snapshot.chapters.map((chapter) => (
            <li key={chapter.key}>
              <button type="button" onClick={() => openChapter(chapter)}>
                <span className={styles.chapterNumber}>
                  {String(chapter.number).padStart(2, '0')}
                </span>
                <span>
                  <strong>{chapter.title}</strong>
                  <small>{chapter.scene}</small>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className={styles.chapterStack}>
        {snapshot.chapters.map((chapter) => {
          const isOpen = openChapterKeys.includes(chapter.key);
          const feedback = copyState?.chapterKey === chapter.key ? copyState.status : null;
          return (
            <section
              className={styles.chapter}
              id={chapterAnchor(chapter)}
              key={chapter.key}
              aria-labelledby={`${chapterAnchor(chapter)}-title`}
            >
              <button
                className={styles.chapterToggle}
                type="button"
                aria-expanded={isOpen}
                aria-controls={`${chapterAnchor(chapter)}-body`}
                onClick={() => toggleChapter(chapter)}
              >
                <span>第{chapter.number}章</span>
                <strong id={`${chapterAnchor(chapter)}-title`}>{chapter.title}</strong>
                <small>{isOpen ? '章を閉じる' : '章を開く'}</small>
              </button>

              {isOpen ? (
                <div className={styles.chapterBody} id={`${chapterAnchor(chapter)}-body`}>
                  <section className={styles.sceneBlock}>
                    <p className={styles.blockLabel}>場面</p>
                    <p>{chapter.scene}</p>
                  </section>

                  <div className={styles.perspectiveGrid} data-testid="paid-report-perspectives">
                    <section>
                      <p className={styles.blockLabel}>Aから見えること</p>
                      <p>{chapter.personAPerspective}</p>
                    </section>
                    <section>
                      <p className={styles.blockLabel}>Bから見えること</p>
                      <p>{chapter.personBPerspective}</p>
                    </section>
                  </div>

                  <section className={styles.loopBlock} data-testid="paid-report-loop">
                    <p className={styles.blockLabel}>二人の間で起きる連鎖</p>
                    <ol>
                      {chapter.relationshipLoop.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </section>

                  <section className={styles.resetBlock} data-testid="paid-report-reset">
                    <p className={styles.blockLabel}>この場面から戻るために</p>
                    <ol>
                      {chapter.resetSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </section>

                  <section className={styles.phraseBlock} data-testid="paid-report-phrase">
                    <p className={styles.blockLabel}>そのまま使える一言</p>
                    <blockquote>{chapter.usablePhrase}</blockquote>
                    <button type="button" onClick={() => copyPhrase(chapter)}>
                      一言をコピー
                    </button>
                    <p className={styles.copyFeedback} aria-live="polite">
                      {feedback === 'success'
                        ? 'コピーしました'
                        : feedback === 'failure'
                          ? 'コピーできませんでした。文を選択してお使いください。'
                          : ''}
                    </p>
                  </section>

                  <section className={styles.experimentBlock} data-testid="paid-report-experiment">
                    <p className={styles.blockLabel}>今週、一度だけ試すこと</p>
                    <p>{chapter.smallExperiment}</p>
                  </section>

                  <section className={styles.reflectionBlock}>
                    <p className={styles.blockLabel}>あとで振り返る一問</p>
                    <p>{chapter.reflectionQuestion}</p>
                  </section>

                  <a className={styles.indexReturn} href="#paid-compatibility-chapter-index">
                    章一覧へ戻る
                  </a>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <footer className={styles.safetyNote}>
        <h2>このレポートについて</h2>
        <p>{snapshot.safetyNote}</p>
      </footer>
    </article>
  );
}
