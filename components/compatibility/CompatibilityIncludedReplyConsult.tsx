'use client';

/**
 * Pair Premium — one included additional reading per owned report (#251).
 * API + persistence live in lib/m55/compatibility/*Consult* and /api/compatibility/reports/.../consult.
 * Commercial polish / layout tokens: integrate in PR #255 without duplicating wallet or DTR ConsultRoom routes.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  COMPATIBILITY_CONSULT_PAIR_QUESTION_IDS,
  COMPATIBILITY_CONSULT_REPLY_THEME_IDS,
} from '../../lib/m55/compatibility/compatibilityConsultPrompt';
import {
  getQuestionsForTheme,
  type ConsultQuestionCatalogEntry,
} from '../../lib/m55/consult/consultQuestionCatalog.v1';
import {
  mapConsultRoomLoadErrorToUserMessage,
  mapConsultRoomSendErrorToUserMessage,
} from '../../lib/m55/consult/consultRoomUserFacingErrors';
import {
  mapConsultReplyBodyForDisplay,
  normalizeConsultReplyParagraphs,
} from '../../lib/m55/consult/consultReplyDisplaySections';
import { normalizeConsultReplyDisplayText, normalizeConsultReplyTodayStepDisplayText } from '../../lib/m55/consult/normalizeConsultReplyDisplayText';
import { wizardQuestionLabelJa } from '../../lib/m55/consult/consultReplyWizardDisplay.v1';
import consultStyles from '../dtr/ConsultRoom.module.css';
import styles from './CompatibilityIncludedReplyConsult.module.css';

type CompatibilityConsultReplyThemeId = (typeof COMPATIBILITY_CONSULT_REPLY_THEME_IDS)[number];

type ConsultMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export type IncludedReplyRoom = {
  reportId: string;
  creditsRemaining: number;
  creditsTotal: number;
  state: 'writable' | 'read_only';
  messages: ConsultMessage[];
};

export type IncludedReplySelection = {
  replyThemeId: CompatibilityConsultReplyThemeId;
  replyQuestionId: string;
};

export type IncludedReplySendIntent = IncludedReplySelection & { idempotencyKey: string };

export type IncludedReplySendOutcome =
  /** Server state shows the reading saved; the intent is settled. */
  | { kind: 'committed'; room: IncludedReplyRoom }
  /** Definitive rejection with no live reservation; a new intent may use a new key. */
  | { kind: 'rejected'; room: IncludedReplyRoom | null; message: string }
  /** Outcome unknown or still in progress; the same intent and key must be kept. */
  | { kind: 'unresolved'; room: IncludedReplyRoom | null; message: string };

export type IncludedReplySessionResult =
  | IncludedReplySendOutcome
  | { kind: 'ignored'; reason: 'in_flight' | 'intent_locked' | 'invalid_selection' };

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Pair wizard cards — UI only; theme/question IDs and catalog unchanged. */
const PAIR_WIZARD_THEME_CARDS: Record<
  CompatibilityConsultReplyThemeId,
  { label: string; description: string }
> = {
  relation: {
    label: '二人の距離や会話が気になる',
    description: '近づき方・言葉・タイミング・戻り方を、6章レポートから読む',
  },
  report: {
    label: '二人の相性レポートを読み返したい',
    description: '読み返す順番や章の選び方を、購入済みレポートから整理する',
  },
};

type PairConsultQuestionId = (typeof COMPATIBILITY_CONSULT_PAIR_QUESTION_IDS)[number];

const PAIR_WIZARD_FOCUS_CARD_DESCRIPTION: Record<PairConsultQuestionId, string> = {
  'relation.distance': '2人の距離に出やすいズレと、お相手側の反応とペースの章から、距離の取り方を読み返す',
  'relation.words': 'あなた側の反応とペースと、2人の距離のズレの章から、言葉の選び方を整理する',
  'relation.timing':
    'あなた側の反応とペースと、今日見る一つの手がかりの章から、伝えるタイミングの目印を置く',
  'relation.recovery': '今日見る一つの手がかりと、2人の距離に出やすいズレの章から、やりとり後の戻り方を見る',
  'report.how_to_use': '6章全体の読み返し順を、レポートの構成に沿って整理する',
  'report.chapter_pick': 'いま開きやすい章を、二人のレポートから1つ選ぶ',
  'report.review_timing': '読み返すタイミングの目印を、レポートの場面から置く',
  'report.next_step': '読んだあとの次の一手を、レポート抜粋から1つだけ置く',
};

const PAIR_WIZARD_COPY = {
  step1Title: '二人の関係について整理したいテーマを選ぶ',
  step1Hint: '購入済みの6章レポートを根拠に、今の関係について1テーマだけ読み解きます。',
  step2Title: '具体的に読み解きたい焦点を選ぶ',
  step2Hint: '焦点は後から戻って選び直せます。最終確認のあとに作成が始まります。',
  step3Title: '選択内容と使用枠を確認する',
  step3Lead: 'この内容で追加読み解きを1件作成します。作成が完了するまでページを閉じないでください。',
  confirmThemeLabel: '選んだテーマ',
  confirmFocusLabel: '読み解きたい焦点',
  creditThisUse: '今回の使用',
  creditAfterSuccess: '成功後の残り',
  backToFocus: '焦点を選び直す',
  backToTheme: 'テーマを選び直す',
} as const;

const WIZARD_STEPS = [
  { n: 1 as const, shortLabel: 'テーマ' },
  { n: 2 as const, shortLabel: '焦点' },
  { n: 3 as const, shortLabel: '確認' },
] as const;

function PairConsultWizardProgress({ activeStep }: { activeStep: 1 | 2 | 3 }) {
  return (
    <ol className={consultStyles.wizardProgress} aria-label="追加読み解きの進行">
      {WIZARD_STEPS.map((step) => {
        const done = step.n < activeStep;
        const active = step.n === activeStep;
        const pending = step.n > activeStep;
        return (
          <li key={step.n} className={consultStyles.wizardProgressItem}>
            <div
              className={[
                consultStyles.wizardStep,
                done ? consultStyles.wizardStepDone : '',
                active ? consultStyles.wizardStepActive : '',
                pending ? consultStyles.wizardStepPending : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={active ? 'step' : undefined}
            >
              {done ? (
                <>
                  <span className={consultStyles.wizardStepCheck} aria-hidden>
                    ✓
                  </span>
                  <span className={consultStyles.wizardStepLabel}>{step.shortLabel}</span>
                </>
              ) : (
                <>
                  <span className={consultStyles.wizardStepNum}>Step {step.n} / 3</span>
                  <span className={consultStyles.wizardStepLabel}>{step.shortLabel}</span>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function PairIncludedReplyAssistantBody({ content }: { content: string }) {
  const displayContent = normalizeConsultReplyDisplayText(content);
  const paragraphs = normalizeConsultReplyParagraphs(displayContent);
  const bodies = mapConsultReplyBodyForDisplay(paragraphs);
  const sections = [
    { label: '今の場面', body: bodies.scene },
    { label: '二人のレポートから見ると', body: bodies.report },
    { label: '少し違う見方', body: bodies.alt },
    { label: '整理の補助', body: bodies.aux },
  ].filter((section) => section.body.trim());
  const todayRaw = bodies.today.trim();
  const todayStep = todayRaw
    ? normalizeConsultReplyTodayStepDisplayText(todayRaw) || todayRaw
    : null;

  return (
    <article className={styles.assistantReply} data-testid="pair-included-reply-assistant-body">
      {sections.map((section) => (
        <div key={section.label} className={styles.replySection}>
          <h3 className={consultStyles.replySectionTitle}>{section.label}</h3>
          <p className={consultStyles.replySectionBody}>{section.body}</p>
        </div>
      ))}
      {todayStep ? (
        <div className={styles.replySection}>
          <h3 className={consultStyles.replySectionTitle}>今日の一手</h3>
          <p className={consultStyles.replySectionBody}>{todayStep}</p>
        </div>
      ) : null}
    </article>
  );
}

export const INCLUDED_REPLY_QUESTION_OPTIONS: Readonly<
  Record<CompatibilityConsultReplyThemeId, readonly ConsultQuestionCatalogEntry[]>
> = Object.freeze({
  relation: Object.freeze(getQuestionsForTheme('relation')),
  report: Object.freeze(getQuestionsForTheme('report')),
});

const ROOM_INCONSISTENT_MESSAGE_JA =
  '追加読み解きの状態を確認できませんでした。ページを再読み込みしてください。';
const NETWORK_UNRESOLVED_MESSAGE_JA =
  '通信が途切れたため、作成結果を確認できませんでした。同じ内容でもう一度送ると、作成済みの場合はその結果を表示します。';
const IN_PROGRESS_MESSAGE_JA =
  '前の送信を処理しています。少し時間をおいて、同じ内容でもう一度送ってください。';
const RESULT_UNCONFIRMED_MESSAGE_JA =
  '作成結果を確認できませんでした。ページを再読み込みしてご確認ください。';
const SEND_IN_PROGRESS_API_ERROR = 'Send already in progress. Reload and try again.';

function consultUrl(reportId: string): string {
  return `/api/compatibility/reports/${encodeURIComponent(reportId)}/consult`;
}

function parseMessage(value: unknown): ConsultMessage | null {
  if (!value || typeof value !== 'object') return null;
  const m = value as Record<string, unknown>;
  if (typeof m.id !== 'string' || !m.id) return null;
  if (m.role !== 'user' && m.role !== 'assistant') return null;
  if (typeof m.content !== 'string' || !m.content.trim()) return null;
  if (typeof m.createdAt !== 'string') return null;
  return { id: m.id, role: m.role, content: m.content, createdAt: m.createdAt };
}

/** Fail-closed: any missing body or contradictory credit/state combination yields null. */
export function parseIncludedReplyRoom(payload: unknown, reportId: string): IncludedReplyRoom | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  if (p.reportId !== reportId) return null;
  const total = p.creditsTotal;
  const remaining = p.creditsRemaining;
  if (typeof total !== 'number' || !Number.isInteger(total) || total < 1) return null;
  if (typeof remaining !== 'number' || !Number.isInteger(remaining)) return null;
  if (remaining < 0 || remaining > total) return null;
  if (p.state !== 'writable' && p.state !== 'read_only') return null;
  if (!Array.isArray(p.messages)) return null;

  const messages: ConsultMessage[] = [];
  for (const raw of p.messages) {
    const message = parseMessage(raw);
    if (!message) return null;
    messages.push(message);
  }

  const used = remaining < total || p.state === 'read_only';
  const hasAssistant = messages.some((message) => message.role === 'assistant');
  if (used !== hasAssistant) return null;

  return { reportId, creditsRemaining: remaining, creditsTotal: total, state: p.state, messages };
}

export function isIncludedReplyRoomUsed(room: IncludedReplyRoom): boolean {
  return room.creditsRemaining < room.creditsTotal || room.state === 'read_only';
}

export function isIncludedReplySelection(selection: IncludedReplySelection): boolean {
  const options = INCLUDED_REPLY_QUESTION_OPTIONS[selection.replyThemeId];
  return Boolean(options?.some((entry) => entry.reply_question_id === selection.replyQuestionId));
}

export function buildIncludedReplySendBody(selection: IncludedReplySelection): {
  reply_theme_id: CompatibilityConsultReplyThemeId;
  reply_question_id: string;
} {
  return {
    reply_theme_id: selection.replyThemeId,
    reply_question_id: selection.replyQuestionId,
  };
}

export async function loadIncludedReplyRoom(
  reportId: string,
  fetchImpl: FetchLike,
): Promise<{ ok: true; room: IncludedReplyRoom } | { ok: false; message: string }> {
  let res: Response;
  try {
    res = await fetchImpl(consultUrl(reportId), { cache: 'no-store', credentials: 'same-origin' });
  } catch {
    return { ok: false, message: mapConsultRoomLoadErrorToUserMessage(null, 503) };
  }
  const payload = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const apiError =
      payload && typeof payload === 'object' && typeof (payload as { error?: unknown }).error === 'string'
        ? ((payload as { error: string }).error)
        : null;
    return { ok: false, message: mapConsultRoomLoadErrorToUserMessage(apiError, res.status) };
  }
  const room = parseIncludedReplyRoom(payload, reportId);
  if (!room) return { ok: false, message: ROOM_INCONSISTENT_MESSAGE_JA };
  return { ok: true, room };
}

/**
 * One POST with the intent's key, then GET as the source of truth.
 * Only a definitive 4xx (no live reservation) releases the key; everything else keeps it,
 * because the server replays, reports in-progress, or re-reserves for the same key.
 */
export async function executeIncludedReplySend(
  reportId: string,
  intent: IncludedReplySendIntent,
  fetchImpl: FetchLike,
): Promise<IncludedReplySendOutcome> {
  let status: number | null = null;
  let payload: Record<string, unknown> | null = null;
  try {
    const res = await fetchImpl(`${consultUrl(reportId)}/send`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': intent.idempotencyKey,
      },
      body: JSON.stringify(buildIncludedReplySendBody(intent)),
    });
    status = res.status;
    payload = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  } catch {
    status = null;
  }

  const sync = await loadIncludedReplyRoom(reportId, fetchImpl);
  const room = sync.ok ? sync.room : null;
  if (room && isIncludedReplyRoomUsed(room)) return { kind: 'committed', room };

  const apiError = typeof payload?.error === 'string' ? payload.error : null;
  const safeMessage = typeof payload?.safeMessage === 'string' ? payload.safeMessage : null;

  if (status !== null && status >= 400 && status < 500 && status !== 409) {
    return {
      kind: 'rejected',
      room,
      message: mapConsultRoomSendErrorToUserMessage(safeMessage, apiError),
    };
  }
  if (!sync.ok) return { kind: 'unresolved', room: null, message: sync.message };
  if (status === null) return { kind: 'unresolved', room, message: NETWORK_UNRESOLVED_MESSAGE_JA };
  if (status === 409) {
    return {
      kind: 'unresolved',
      room,
      message:
        apiError === SEND_IN_PROGRESS_API_ERROR
          ? IN_PROGRESS_MESSAGE_JA
          : mapConsultRoomSendErrorToUserMessage(safeMessage, apiError),
    };
  }
  if (status >= 200 && status < 300) {
    return { kind: 'unresolved', room, message: RESULT_UNCONFIRMED_MESSAGE_JA };
  }
  return {
    kind: 'unresolved',
    room,
    message: mapConsultRoomSendErrorToUserMessage(safeMessage, apiError),
  };
}

export function createIncludedReplyIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pair-consult-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Holds at most one send intent; a different intent is refused until the current one settles. */
export function createIncludedReplySendSession(deps: {
  reportId: string;
  fetchImpl: FetchLike;
  createIdempotencyKey: () => string;
}) {
  let intent: IncludedReplySendIntent | null = null;
  let inFlight = false;

  return {
    get pendingIntent(): IncludedReplySendIntent | null {
      return intent;
    },
    get inFlight(): boolean {
      return inFlight;
    },
    async send(selection: IncludedReplySelection): Promise<IncludedReplySessionResult> {
      if (inFlight) return { kind: 'ignored', reason: 'in_flight' };
      if (!isIncludedReplySelection(selection)) return { kind: 'ignored', reason: 'invalid_selection' };
      if (
        intent &&
        (intent.replyThemeId !== selection.replyThemeId ||
          intent.replyQuestionId !== selection.replyQuestionId)
      ) {
        return { kind: 'ignored', reason: 'intent_locked' };
      }

      const current = intent ?? { ...selection, idempotencyKey: deps.createIdempotencyKey() };
      intent = current;
      inFlight = true;
      try {
        const outcome = await executeIncludedReplySend(deps.reportId, current, deps.fetchImpl);
        if (outcome.kind !== 'unresolved') intent = null;
        return outcome;
      } finally {
        inFlight = false;
      }
    },
  };
}

type Props = {
  reportId: string;
};

export default function CompatibilityIncludedReplyConsult({ reportId }: Props) {
  const [room, setRoom] = useState<IncludedReplyRoom | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [themeId, setThemeId] = useState<CompatibilityConsultReplyThemeId | null>(null);
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [pendingIntent, setPendingIntent] = useState<IncludedReplySendIntent | null>(null);

  const session = useMemo(
    () =>
      createIncludedReplySendSession({
        reportId,
        fetchImpl: (input, init) => fetch(input, init),
        createIdempotencyKey: createIncludedReplyIdempotencyKey,
      }),
    [reportId],
  );

  useEffect(() => {
    if (pendingIntent) {
      setWizardStep(3);
    }
  }, [pendingIntent]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    void loadIncludedReplyRoom(reportId, (input, init) => fetch(input, init)).then((result) => {
      if (!active) return;
      if (result.ok) {
        setRoom(result.room);
      } else {
        setRoom(null);
        setLoadError(result.message);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [reportId]);

  const activeThemeId = pendingIntent?.replyThemeId ?? themeId;
  const activeQuestionId = pendingIntent?.replyQuestionId ?? questionId;
  const questions = activeThemeId ? INCLUDED_REPLY_QUESTION_OPTIONS[activeThemeId] : [];
  const selectedThemeLabel = activeThemeId
    ? PAIR_WIZARD_THEME_CARDS[activeThemeId].label
    : null;
  const selectedQuestionEntry = activeQuestionId
    ? questions.find((entry) => entry.reply_question_id === activeQuestionId)
    : null;
  const selectedQuestionLabel = selectedQuestionEntry
    ? wizardQuestionLabelJa(selectedQuestionEntry.reply_question_id, selectedQuestionEntry.labelJa)
    : null;

  async function handleSend() {
    if (session.inFlight || !activeThemeId || !activeQuestionId) return;
    setSending(true);
    setSendError(null);
    try {
      const result = await session.send({
        replyThemeId: activeThemeId,
        replyQuestionId: activeQuestionId,
      });
      setPendingIntent(session.pendingIntent);
      if (result.kind === 'ignored') return;
      if (result.room) setRoom(result.room);
      if (result.kind === 'committed') {
        setThemeId(null);
        setQuestionId(null);
        setWizardStep(1);
        return;
      }
      setSendError(result.message);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <section className={styles.section} data-testid="pair-included-reply-loading" aria-busy="true">
        <p className={styles.hint}>追加読み解きを読み込んでいます…</p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className={styles.section} data-testid="pair-included-reply-load-error">
        <p className={styles.error}>{loadError}</p>
      </section>
    );
  }

  if (!room) return null;

  const canCompose = !isIncludedReplyRoomUsed(room) && room.creditsRemaining > 0;
  const selectionLocked = sending || pendingIntent !== null;

  return (
    <section
      className={styles.section}
      data-testid="pair-included-reply-consult"
      aria-labelledby="pair-included-reply-heading"
    >
      <h2 id="pair-included-reply-heading" className={styles.heading}>
        追加読み解き（1件）
      </h2>
      <p className={styles.lead}>
        購入済みの6章レポートを根拠に、今の関係について1テーマだけ読み解きます。相手の本音や未来の結果は断定しません。
      </p>
      <p className={styles.credits} data-testid="pair-included-reply-credits">
        残り {room.creditsRemaining} / {room.creditsTotal} 件
      </p>

      {room.messages.length > 0 ? (
        <div className={styles.messages} data-testid="pair-included-reply-history">
          {room.messages.map((message) =>
            message.role === 'user' ? (
              <div key={message.id} className={styles.messageUser}>
                {message.content}
              </div>
            ) : (
              <div key={message.id} className={styles.messageAssistant}>
                <PairIncludedReplyAssistantBody content={message.content} />
              </div>
            ),
          )}
        </div>
      ) : null}

      {canCompose ? (
        <div
          className={`${styles.compose} ${consultStyles.replyWizard}`}
          data-testid="pair-included-reply-compose"
        >
          <PairConsultWizardProgress activeStep={wizardStep} />

          {pendingIntent && sendError ? (
            <p className={styles.error} role="alert" data-testid="pair-included-reply-send-error">
              {sendError}
            </p>
          ) : null}

          {wizardStep === 1 ? (
            <section
              className={`${consultStyles.wizardStepPanel} ${consultStyles.wizardStepPanelActive}`}
              data-testid="pair-included-reply-wizard-step-1"
              aria-labelledby="pair-included-reply-step-1"
            >
              <h3 id="pair-included-reply-step-1" className={consultStyles.composeStepTitle}>
                {PAIR_WIZARD_COPY.step1Title}
              </h3>
              <p className={styles.wizardHint}>{PAIR_WIZARD_COPY.step1Hint}</p>
              <div
                className={consultStyles.choiceGrid}
                role="group"
                aria-label="追加読み解きのテーマを選ぶ"
              >
                {COMPATIBILITY_CONSULT_REPLY_THEME_IDS.map((id) => {
                  const card = PAIR_WIZARD_THEME_CARDS[id];
                  const selected = themeId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={[
                        consultStyles.choiceCard,
                        selected ? consultStyles.choiceCardSelected : '',
                        id === 'report' ? consultStyles.choiceCardMeta : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      disabled={selectionLocked}
                      aria-pressed={selected}
                      onClick={() => {
                        setThemeId(id);
                        setQuestionId(null);
                      }}
                    >
                      <span className={consultStyles.choiceCardBody}>
                        <span className={`${consultStyles.choiceCardTitle} ${consultStyles.wizTypoCardTitle}`}>
                          {card.label}
                        </span>
                        <span
                          className={`${consultStyles.choiceCardDescription} ${consultStyles.wizTypoCardCaption}`}
                        >
                          {card.description}
                        </span>
                      </span>
                      {selected ? (
                        <span className={consultStyles.choiceCardCheck} aria-hidden>
                          ✓
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <div className={consultStyles.wizardActions}>
                <button
                  type="button"
                  className={`${consultStyles.submitBtn} ${consultStyles.submitBtnPrimary}`}
                  disabled={!themeId || selectionLocked}
                  onClick={() => setWizardStep(2)}
                >
                  次へ
                </button>
              </div>
            </section>
          ) : null}

          {wizardStep === 2 && themeId ? (
            <section
              className={`${consultStyles.wizardStepPanel} ${consultStyles.wizardStepPanelActive}`}
              data-testid="pair-included-reply-wizard-step-2"
              aria-labelledby="pair-included-reply-step-2"
            >
              <h3 id="pair-included-reply-step-2" className={consultStyles.composeStepTitle}>
                {PAIR_WIZARD_COPY.step2Title}
              </h3>
              <p className={styles.wizardHint}>{PAIR_WIZARD_COPY.step2Hint}</p>
              {selectedThemeLabel ? (
                <p className={styles.selectionMemory}>
                  <span className={styles.selectionMemoryEyebrow}>選んだテーマ</span>
                  <span className={styles.selectionMemoryValue}>{selectedThemeLabel}</span>
                </p>
              ) : null}
              <div
                className={consultStyles.choiceGrid}
                role="group"
                aria-label="読み解きたい焦点を選ぶ"
              >
                {questions.map((entry) => {
                  const selected = questionId === entry.reply_question_id;
                  const label = wizardQuestionLabelJa(entry.reply_question_id, entry.labelJa);
                  const focusId = entry.reply_question_id as PairConsultQuestionId;
                  const description = PAIR_WIZARD_FOCUS_CARD_DESCRIPTION[focusId];
                  return (
                    <button
                      key={entry.reply_question_id}
                      type="button"
                      className={[
                        consultStyles.choiceCard,
                        selected ? consultStyles.choiceCardSelected : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      disabled={selectionLocked}
                      aria-pressed={selected}
                      onClick={() => setQuestionId(entry.reply_question_id)}
                    >
                      <span className={consultStyles.choiceCardBody}>
                        <span className={`${consultStyles.choiceCardTitle} ${consultStyles.wizTypoCardTitle}`}>
                          {label}
                        </span>
                        <span
                          className={`${consultStyles.choiceCardDescription} ${consultStyles.wizTypoCardCaption}`}
                        >
                          {description}
                        </span>
                      </span>
                      {selected ? (
                        <span className={consultStyles.choiceCardCheck} aria-hidden>
                          ✓
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <div className={consultStyles.wizardActions}>
                <button
                  type="button"
                  className={consultStyles.wizardSecondaryButton}
                  disabled={selectionLocked}
                  onClick={() => setWizardStep(1)}
                >
                  {PAIR_WIZARD_COPY.backToTheme}
                </button>
                <button
                  type="button"
                  className={`${consultStyles.submitBtn} ${consultStyles.submitBtnPrimary}`}
                  disabled={!questionId || selectionLocked}
                  onClick={() => setWizardStep(3)}
                >
                  内容を確認する
                </button>
              </div>
            </section>
          ) : null}

          {wizardStep === 3 && themeId && questionId ? (
            <section
              className={`${consultStyles.wizardStepPanel} ${consultStyles.wizardStepPanelActive}`}
              data-testid="pair-included-reply-wizard-confirm"
              aria-labelledby="pair-included-reply-step-3"
            >
              <h3 id="pair-included-reply-step-3" className={consultStyles.composeStepTitle}>
                {PAIR_WIZARD_COPY.step3Title}
              </h3>
              <p className={styles.wizardHint}>{PAIR_WIZARD_COPY.step3Lead}</p>
              <div className={consultStyles.confirmPanel}>
                <div className={consultStyles.confirmRow}>
                  <span className={consultStyles.confirmLabel}>{PAIR_WIZARD_COPY.confirmThemeLabel}</span>
                  <span className={consultStyles.confirmValue}>{selectedThemeLabel}</span>
                </div>
                <div className={consultStyles.confirmRow}>
                  <span className={consultStyles.confirmLabel}>{PAIR_WIZARD_COPY.confirmFocusLabel}</span>
                  <span className={consultStyles.confirmValue}>{selectedQuestionLabel}</span>
                </div>
                <div className={consultStyles.confirmRow}>
                  <span className={consultStyles.confirmLabel}>{PAIR_WIZARD_COPY.creditThisUse}</span>
                  <span className={consultStyles.confirmValue}>1件（このレポートに付いている追加読み解き）</span>
                </div>
                <div className={consultStyles.confirmRow}>
                  <span className={consultStyles.confirmLabel}>{PAIR_WIZARD_COPY.creditAfterSuccess}</span>
                  <span className={consultStyles.confirmValue}>0 / {room.creditsTotal} 件</span>
                </div>
              </div>
              <div className={consultStyles.wizardActions}>
                <button
                  type="button"
                  className={consultStyles.wizardSecondaryButton}
                  disabled={sending || pendingIntent !== null}
                  onClick={() => setWizardStep(2)}
                >
                  {PAIR_WIZARD_COPY.backToFocus}
                </button>
                <button
                  type="button"
                  className={`${consultStyles.submitBtn} ${consultStyles.submitBtnPrimary}`}
                  data-testid="pair-included-reply-wizard-submit"
                  disabled={sending || !activeQuestionId}
                  onClick={() => void handleSend()}
                >
                  {sending
                    ? '作成中…'
                    : pendingIntent
                      ? '同じ内容でもう一度送る'
                      : 'この内容で追加読み解きを作成する'}
                </button>
              </div>
              {sendError && !pendingIntent ? (
                <p className={styles.error} role="alert">
                  {sendError}
                </p>
              ) : null}
            </section>
          ) : null}
        </div>
      ) : (
        <p className={styles.hint} data-testid="pair-included-reply-readonly">
          このレポートに付いている追加読み解きは使用済みです。上の内容をいつでも読み返せます。
        </p>
      )}
    </section>
  );
}
