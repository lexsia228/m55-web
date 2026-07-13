'use client';

import { FormEvent, useEffect, useMemo, useState, useTransition } from 'react';
import { buildGuestCompatibilityResult } from '../../app/synastry/actions';
import {
  COMPATIBILITY_GUEST_SESSION_KEY,
  isCompleteCompatibilityGuestInput,
  type CompatibilityGuestInput,
  type CompatibilityPublicResult,
} from '../../lib/m55/compatibility/pairReadingGuestContract';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelAction,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import styles from './CompatibilityGuestExperience.module.css';

const EMPTY_INPUT: CompatibilityGuestInput = { personA: '', personB: '' };

function restoreSessionInput(): CompatibilityGuestInput | null {
  try {
    const raw = sessionStorage.getItem(COMPATIBILITY_GUEST_SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<CompatibilityGuestInput>;
    const candidate = {
      personA: typeof value.personA === 'string' ? value.personA : '',
      personB: typeof value.personB === 'string' ? value.personB : '',
    };
    return isCompleteCompatibilityGuestInput(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export default function CompatibilityGuestExperience() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [input, setInput] = useState<CompatibilityGuestInput>(EMPTY_INPUT);
  const [result, setResult] = useState<CompatibilityPublicResult | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const complete = isCompleteCompatibilityGuestInput(input, today);

  useEffect(() => {
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.compatibilityInputView,
      'compatibility_guest',
      'compatibility-input-view',
    );
    const restored = restoreSessionInput();
    if (!restored) return;
    setInput(restored);
    startTransition(async () => {
      const outcome = await buildGuestCompatibilityResult(restored);
      if (outcome.ok) setResult(outcome.value);
    });
  }, []);

  useEffect(() => {
    if (!result) return;
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.compatibilityFreeResultView,
      'compatibility_guest',
      'compatibility-free-result-view',
    );
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.compatibilityActionView,
      'compatibility_guest',
      'compatibility-action-view',
    );
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.compatibilityPaidBridgeView,
      'compatibility_guest',
      'compatibility-paid-bridge-view',
    );
  }, [result]);

  function updateInput(field: keyof CompatibilityGuestInput, value: string) {
    setInput((current) => ({ ...current, [field]: value }));
    setResult(null);
    setError('');
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!complete) {
      setError('二人分の有効な生年月日を入力してください。');
      return;
    }
    setError('');
    startTransition(async () => {
      const outcome = await buildGuestCompatibilityResult(input);
      if (!outcome.ok) {
        setError(outcome.message);
        return;
      }
      try {
        sessionStorage.setItem(COMPATIBILITY_GUEST_SESSION_KEY, JSON.stringify(input));
      } catch {
        /* Result remains available even when tab storage is unavailable. */
      }
      setResult(outcome.value);
    });
  }

  return (
    <div className={styles.page}>
      <section className={styles.intro} aria-labelledby="compatibility-title">
        <p className={styles.eyebrow}>二人の関係の見取り図</p>
        <h1 id="compatibility-title">二人の関係を、重なりと違いから見ます</h1>
        <p className={styles.lead}>
          良し悪しや点数ではなく、距離・反応・進め方の違いを確認します。
        </p>

        <form className={styles.form} onSubmit={submit} noValidate>
          <div className={styles.inputGrid}>
            <label className={styles.inputCard}>
              <span className={styles.inputRole}>あなた</span>
              <span className={styles.inputLabel}>あなたの生年月日</span>
              <input
                type="date"
                required
                max={today}
                value={input.personA}
                onChange={(event) => updateInput('personA', event.target.value)}
              />
            </label>
            <label className={styles.inputCard}>
              <span className={styles.inputRole}>相手</span>
              <span className={styles.inputLabel}>相手の生年月日</span>
              <input
                type="date"
                required
                max={today}
                value={input.personB}
                onChange={(event) => updateInput('personB', event.target.value)}
              />
            </label>
          </div>
          <p className={styles.privacyNote}>
            入力はこの結果の組み立てにだけ使い、このタブを閉じると保持されません。
          </p>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <button className={styles.submit} type="submit" disabled={!complete || isPending}>
            {isPending ? '見取り図を組み立てています' : '二人の見取り図を見る'}
          </button>
        </form>
      </section>

      {result ? (
        <div className={styles.result}>
          <section className={styles.resultHeader} aria-labelledby="result-title">
            <p className={styles.eyebrow}>無料で見えること</p>
            <h2 id="result-title">二人の関係の見取り図</h2>
            <p>重なるところ、違いが出る条件、二人の間で続きやすい流れを分けて読みます。</p>
          </section>

          <div className={styles.insightGrid}>
            <article className={styles.insightCard}>
              <p className={styles.cardNumber}>01</p>
              <h3>重なりやすいところ</h3>
              <p>{result.free.overlap}</p>
            </article>
            <article className={styles.insightCard}>
              <p className={styles.cardNumber}>02</p>
              <h3>違いが出やすいところ</h3>
              <p>{result.free.difference}</p>
            </article>
          </div>

          <section className={styles.dynamicCard}>
            <p className={styles.cardNumber}>03</p>
            <h3>二人の間で起きやすいこと</h3>
            <div className={styles.perspectiveGrid}>
              <p><strong>あなた側</strong>{result.free.perspectives.personA}</p>
              <p><strong>相手側</strong>{result.free.perspectives.personB}</p>
            </div>
            <p className={styles.dynamicOutcome}>{result.free.relationshipDynamic}</p>
          </section>

          <section className={styles.actionCard} aria-labelledby="action-title">
            <p className={styles.eyebrow}>今日から使う</p>
            <h3 id="action-title">次に一度だけ試すこと</h3>
            <p className={styles.actionSituation}>{result.free.immediateAction.situation}、</p>
            <p className={styles.actionText}>{result.free.immediateAction.action}</p>
            <p className={styles.actionNote}>結果を決めるためではなく、二人の違いを確かめる一回分の行動です。</p>
          </section>

          <section className={styles.interpretation} aria-labelledby="interpretation-title">
            <h3 id="interpretation-title">この結果の見方</h3>
            <div className={styles.interpretationGrid}>
              <div>
                <h4>生年月日から見る土台</h4>
                <p>二人それぞれに出やすい傾向を見ています。</p>
              </div>
              <div>
                <h4>二人を重ねた見取り図</h4>
                <p>その傾向を重ねたときに起きやすい違いを整理しています。</p>
              </div>
              <div>
                <h4>実際の関係</h4>
                <p>状況や対話によって変わります。この結果は、関係を決めるものではありません。</p>
              </div>
            </div>
          </section>

          <section className={styles.paidBridge} aria-labelledby="paid-bridge-title">
            <p className={styles.eyebrow}>6章への接続</p>
            <h3 id="paid-bridge-title">この二人の場合、6章ではここから深めます</h3>
            <div className={styles.mappedChapters}>
              {result.mappedChapters.map((chapter) => (
                <article key={chapter.chapterId}>
                  <p className={styles.connectionLabel}>無料で見えたこと</p>
                  <p>{chapter.freeConnection}</p>
                  <p className={styles.connectionLabel}>有料で深める章</p>
                  <h4>{chapter.chapterTitle}</h4>
                  <p>{chapter.actualContent}</p>
                </article>
              ))}
            </div>

            <h4 className={styles.sixTitle} id="compatibility-six-chapters">現行の6章</h4>
            <ol className={styles.chapterList}>
              {result.allChapters.map((chapter) => (
                <li key={chapter.chapterId}>
                  <span>{chapter.chapterTitle}</span>
                  <p>{chapter.actualContent}</p>
                </li>
              ))}
            </ol>
            <div className={styles.bridgeActions}>
              <a
                className={styles.primaryLink}
                href="#compatibility-six-chapters"
                onClick={() => trackFunnelAction(
                  M55_FUNNEL_EVENTS.compatibilityPaidBridgeClick,
                  'compatibility_guest',
                )}
              >
                相性レポートで深める内容を見る
              </a>
              <a className={styles.secondaryLink} href="#compatibility-free-detail">
                無料の詳細をこのまま読む
              </a>
            </div>
          </section>

          <section
            className={styles.freeDetail}
            id="compatibility-free-detail"
            aria-labelledby="free-detail-title"
          >
            <p className={styles.eyebrow}>無料の詳細</p>
            <h3 id="free-detail-title">この見取り図の要約</h3>
            <p>{result.freeTeaser}</p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
