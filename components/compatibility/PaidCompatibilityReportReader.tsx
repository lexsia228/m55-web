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
import PairResultSignature from './PairResultSignature';
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
  const leadChapter = snapshot.chapters.find(
    (chapter) => chapter.key === snapshot.highlightedChapterKeys[0],
  );

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
    <article className={styles.reader} aria-labelledby="paid-report-title" data-m55-pair-premium-tone="night">
      <header className={styles.reportHeader}>
        <p className={styles.eyebrow}>二人の関係を読み解く</p>
        {owned ? (
          <p className={styles.ownedChip}>保存済みの二人の相性レポート</p>
        ) : (
          <p className={styles.ownedChip}>読み返せる二人の相性レポート</p>
        )}
        <h1 id="paid-report-title">{snapshot.reportTitle}</h1>
        <p className={styles.subtitle}>6つの場面から、関係の扱い方を読みます</p>
        <PairResultSignature
          tone="night"
          overlap={snapshot.sharedFoundation}
          difference={snapshot.differentFoundation}
          immediateAction={leadChapter?.resetSteps[0] ?? snapshot.recurringLoop}
        />
        <p className={styles.readingGuide}>
          {snapshot.currentContext?.readingGuide
            ?? '最初から通して読む必要はありません。今気になる場面の章から開いてください。'}
        </p>
        <div className={styles.readingMoments} aria-label="レポートを使う場面">
          <span>会話の前に読む</span>
          <span>すれ違った時に読む</span>
          <span>距離を戻したい時に読む</span>
          <span>あとで振り返る</span>
        </div>
      </header>

      <section className={styles.overview} aria-labelledby="relationship-overview-title">
        <p className={styles.eyebrow}>はじめに</p>
        <h2 id="relationship-overview-title">二人の関係の全体像</h2>
        <div className={styles.roleThesis} data-visual-role="thesis">
          <p className={styles.summary}>{snapshot.relationshipSummary}</p>
        </div>
        <div className={styles.foundationGrid} data-visual-role="recognition">
          <div>
            <h3>重なりやすい土台</h3>
            <p>{snapshot.sharedFoundation}</p>
          </div>
          <div>
            <h3>違いが出やすい土台</h3>
            <p>{snapshot.differentFoundation}</p>
          </div>
        </div>
        {leadChapter ? (
          <div className={styles.openingMoves} data-testid="paid-report-opening-moves" data-visual-role="recognition">
            <h3>その違いが、二人それぞれにどう出ているか</h3>
            <div className={styles.openingGrid}>
              <div data-pair-side="you" aria-label="あなた側">
                <p className={styles.blockLabel}>Aに出やすい動き</p>
                <p>{leadChapter.personAPerspective}</p>
              </div>
              <div data-pair-side="partner" aria-label="相手側">
                <p className={styles.blockLabel}>Bに出やすい動き</p>
                <p>{leadChapter.personBPerspective}</p>
              </div>
            </div>
          </div>
        ) : null}

        <div className={`${styles.recurringLoop} ${styles.rolePrimaryRecognition}`} data-visual-role="primaryRecognition">
          <h3>
            {snapshot.currentContext
              ? '今の回答から見える、続きやすい連鎖'
              : '二人の間で続きやすい連鎖'}
          </h3>
          <p>{snapshot.recurringLoop}</p>
        </div>

        {leadChapter ? (
          <div className={styles.openingHandling} data-testid="paid-report-opening-handling" data-visual-role="action">
            <div>
              <p className={styles.blockLabel}>この連鎖を戻す入口</p>
              <p>{leadChapter.resetSteps[0]}</p>
            </div>
            <div>
              <p className={styles.blockLabel}>最初に使える一言</p>
              <blockquote>{leadChapter.usablePhrase}</blockquote>
            </div>
          </div>
        ) : null}
        {snapshot.currentContext ? (
          <div className={styles.contextProof}>
            <div>
              <h3>生年月日から見える土台</h3>
              <p>重なりやすい土台と、違いが出やすい土台として残しています。</p>
            </div>
            <div>
              <h3>今の回答から重なったこと</h3>
              <p>{snapshot.currentContext.currentExpression}</p>
            </div>
          </div>
        ) : null}
        <div className={styles.highlighted}>
          <h3>
            {snapshot.currentContext
              ? `「${snapshot.currentContext.focusLabel}」から最初に読む2章`
              : '今の二人と直接つながる2章'}
          </h3>
          <div>
            {snapshot.highlightedChapterKeys.map((key) => {
              const chapter = snapshot.chapters.find((candidate) => candidate.key === key);
              const preview = snapshot.currentContext?.chapterPreview.find(
                (candidate) => candidate.chapterKey === key,
              );
              if (!chapter) return null;
              return (
                <button key={key} type="button" onClick={() => openChapter(chapter)}>
                  <span>第{chapter.number}章</span>
                  <strong>{chapter.title}</strong>
                  {preview ? (
                    <>
                      <small>{preview.reason}</small>
                      <em>{preview.concreteValue}</em>
                    </>
                  ) : null}
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
                  <section className={`${styles.sceneBlock} ${styles.roleThesis}`} data-visual-role="thesis">
                    <p className={styles.blockLabel}>場面</p>
                    <p>{chapter.scene}</p>
                  </section>

                  <div className={styles.perspectiveGrid} data-testid="paid-report-perspectives" data-visual-role="recognition">
                    <section data-pair-side="you" aria-label="あなた側">
                      <p className={styles.blockLabel}>Aから見えること</p>
                      <p>{chapter.personAPerspective}</p>
                    </section>
                    <section data-pair-side="partner" aria-label="相手側">
                      <p className={styles.blockLabel}>Bから見えること</p>
                      <p>{chapter.personBPerspective}</p>
                    </section>
                  </div>

                  <section
                    className={`${styles.loopBlock} ${styles.rolePrimaryRecognition}`}
                    data-testid="paid-report-loop"
                    data-visual-role="primaryRecognition"
                  >
                    <p className={styles.blockLabel}>二人の間で起きる連鎖</p>
                    <ol>
                      {chapter.relationshipLoop.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </section>

                  <section className={`${styles.resetBlock} ${styles.roleAction}`} data-testid="paid-report-reset" data-visual-role="action">
                    <p className={styles.blockLabel}>この場面から戻るために</p>
                    <ol>
                      {chapter.resetSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </section>

                  <section className={`${styles.phraseBlock} ${styles.roleAction}`} data-testid="paid-report-phrase" data-visual-role="action">
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

                  <section className={`${styles.experimentBlock} ${styles.roleAction}`} data-testid="paid-report-experiment" data-visual-role="action">
                    <p className={styles.blockLabel}>今週、一度だけ試すこと</p>
                    <p>{chapter.smallExperiment}</p>
                  </section>

                  <section className={`${styles.reflectionBlock} ${styles.roleTakeaway}`} data-visual-role="takeaway">
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
