'use client';

/**
 * Purchaser-only concierge room.
 * M55_REPORT_CONCIERGE_ROOM_SSOT_v1 + M55_AI_CONSULT_SAFETY_AND_LIMITS_SSOT_v1
 *
 * Constraints:
 * - Shows only when ownership is confirmed (server gate already checked).
 * - Input: reply_theme_id + reply_question_id selection only (no free text).
 * - Output target: 1,200-1,800 JA chars (SSOT §7.2); server validates before commit.
 * - Thread cap display: 5 tickets per report (included 1 + purchased max 4).
 * - Read-only when credits_remaining=0 (prior messages remain visible).
 * - Add-on CTA: room-only, no public lane.
 * - No generic public chat wording.
 *
 * Hardening (2026-03-25):
 * - sendLock ref prevents double-submit before React state updates.
 * - Microcopy aligned with SSOT §5.2 (no urgency/shame/failure wording).
 * - High-risk block response shows safe guidance only.
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  mapConsultRoomLoadErrorToUserMessage,
  mapConsultRoomSendErrorToUserMessage,
} from '../../lib/m55/consult/consultRoomUserFacingErrors';
import {
  PAID_DTR_CONSULT_ENTRY_LAYOUT,
  PAID_DTR_CONSULT_ENTRY_NEUTRAL,
  PAID_DTR_CONSULT_GROUNDING_COPY,
  PAID_DTR_CONSULT_REPLY,
  PAID_DTR_CONSULT_ROOM_UI,
  PAID_DTR_CONSULT_USAGE_DISPLAY,
  formatConsultAvailableCountLine,
  formatConsultUsedCountLine,
} from '../../lib/m55/paidDtrProductCopy';
import { CONSULT_COMPOSE_PANEL_ID } from '../../lib/m55/consult/consultRoomScrollAnchors';
import {
  REPLY_THEME_IDS,
  getQuestionsForTheme,
  type ReplyThemeId,
} from '../../lib/m55/consult/consultQuestionCatalog.v1';
import {
  WIZARD_ENTRY_CARD_DISPLAY,
  wizardQuestionLabelJa,
} from '../../lib/m55/consult/consultReplyWizardDisplay.v1';
import {
  type ConsultWalletDisplaySnapshot,
  walletRowToConsultDisplaySnapshot,
} from '../../lib/m55/reply/consultWalletDisplaySnapshot';
import ConsultReplyCard from './ConsultReplyCard';
import styles from './ConsultRoom.module.css';

const DISPLAY_CAP_PER_REPORT = PAID_DTR_CONSULT_REPLY.totalCapPerReport;

/** Entry-only display copy (Product Truth constants unchanged). */
const ROOM_UI_COPY = {
  valueCardTitle: PAID_DTR_CONSULT_ROOM_UI.valueDeliverablesTitleJa,
  valueItems: PAID_DTR_CONSULT_ENTRY_LAYOUT.valueDeliverableItemsJa,
  valueCardNote: PAID_DTR_CONSULT_ENTRY_LAYOUT.valueDeliverableFooterJa,
  composePanelTitle: '保存版から、今のあなたに合う読み解きを選ぶ',
  historyTitle: 'これまでの相談返書',
  step1Title: '今いちばん近い入口を選ぶ',
  step1Hint:
    '保存版から、今のあなたに近い入口を1つ選んでください。迷ったら、いちばん目に止まるものを選んで大丈夫です。',
  step2Title: '今回深く見るところを選ぶ',
  step2Hint: '選んだ入口に合わせて、保存版から4つの焦点を出します。',
  step2HintSub: 'いま読み返したいものを1つ選んでください。',
  selectionMemoryEyebrow: '今回の入口',
  selectionMemoryPrompt: 'では、今回はどこを深く見ますか？',
  step3Title: '今回見る内容を確認する',
  step3Lead: '保存版に沿って、この内容で追加読み解きを作成します。',
  step3Consume: 'この送信で追加読み解き1件を使用します。',
  confirmEntryLabel: '入口',
  confirmFocusLabel: '焦点',
} as const;

const WIZARD_STEPS = [
  { n: 1 as const, shortLabel: '入口' },
  { n: 2 as const, shortLabel: '焦点' },
  { n: 3 as const, shortLabel: '確認' },
];

function WalletBalanceStats({
  availableCount,
  usedCount,
  availableClassName,
  usedClassName,
}: {
  availableCount: number;
  usedCount: number;
  availableClassName: string;
  usedClassName: string;
}) {
  return (
    <>
      <p className={availableClassName}>{formatConsultAvailableCountLine(availableCount)}</p>
      <p className={usedClassName}>{formatConsultUsedCountLine(usedCount)}</p>
    </>
  );
}

type Message = {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
};

type ThreadState = {
  credits_total: number;
  credits_remaining: number;
  state: 'writable' | 'read_only';
};

type RoomData = {
  thread: ThreadState;
  messages: Message[];
  effective_credits_remaining?: number;
  effective_state?: 'writable' | 'read_only';
  wallet?: {
    initial_included_count: number;
    purchased_count: number;
    consumed_count: number;
    available_count: number;
    status: string;
  } | null;
  has_wallet_row?: boolean;
  report_instance_id?: string | null;
};

type Props = {
  birthDate: string;
  nickname: string;
  stemIdx: number;
  /** Dev-only: fixture data for /dev/dtr-drawer-preview (skips /api/room/core). */
  devPreviewRoomData?: RoomData | null;
  /** Called after a successful send so the saved-report footer can sync its wallet snapshot. */
  onWalletSnapshotChange?: (snapshot: ConsultWalletDisplaySnapshot | null) => void;
};

function extractThemeAndQuoteFromUserMessage(content: string): { theme: string | null; quote: string | null } {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const themeLine = lines.find((line) => line.startsWith('【テーマ】'));
  const theme = themeLine ? themeLine.replace('【テーマ】', '').trim() : null;
  const questionLine = lines.find((line) => line.startsWith('【質問】'));
  if (questionLine) {
    return {
      theme,
      quote: questionLine.replace('【質問】', '').trim() || null,
    };
  }
  const quoteLine = lines.find((line) => !line.startsWith('【テーマ】') && !line.startsWith('【補助'));
  return {
    theme,
    quote: quoteLine ?? null,
  };
}

type AssistantReplyEntry = {
  messageKey: string;
  msg: Message;
  theme: string | null;
  userQuote: string | null;
};

function buildAssistantReplyHistory(messages: Message[]): AssistantReplyEntry[] {
  const entries: AssistantReplyEntry[] = [];
  for (let i = 0; i < messages.length; i += 1) {
    const msg = messages[i];
    if (msg.role !== 'assistant') continue;
    let linkedTheme: string | null = null;
    let linkedQuote: string | null = null;
    for (let j = i - 1; j >= 0; j -= 1) {
      const prev = messages[j];
      if (prev?.role === 'user') {
        const extracted = extractThemeAndQuoteFromUserMessage(prev.content);
        linkedTheme = extracted.theme;
        linkedQuote = extracted.quote;
        break;
      }
    }
    entries.push({
      messageKey: msg.id ?? `assistant-${i}`,
      msg,
      theme: linkedTheme,
      userQuote: linkedQuote,
    });
  }
  return entries;
}

function formatHistoryCountSummary(count: number): string {
  return PAID_DTR_CONSULT_ROOM_UI.historyCountTemplateJa.replace('{count}', String(count));
}

function deriveWizardActiveStep(
  themeId: ReplyThemeId | null,
  questionId: string | null,
): 1 | 2 | 3 {
  if (themeId && questionId) return 3;
  if (themeId) return 2;
  return 1;
}

function WizardProgress({ activeStep }: { activeStep: 1 | 2 | 3 }) {
  return (
    <ol className={styles.wizardProgress} aria-label="追加読み解きの進行">
      {WIZARD_STEPS.map((step, index) => {
        const done = step.n < activeStep;
        const active = step.n === activeStep;
        const pending = step.n > activeStep;
        return (
          <li key={step.n} className={styles.wizardProgressItem}>
            {index > 0 ? (
              <div
                className={
                  done
                    ? `${styles.wizardConnector} ${styles.wizardConnectorDone}`
                    : active
                      ? `${styles.wizardConnector} ${styles.wizardConnectorActive}`
                      : styles.wizardConnector
                }
                aria-hidden
              />
            ) : null}
            <div
              className={[
                styles.wizardStep,
                done ? styles.wizardStepDone : '',
                active ? styles.wizardStepActive : '',
                pending ? styles.wizardStepPending : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={active ? 'step' : undefined}
            >
              {done ? (
                <>
                  <span className={styles.wizardStepCheck} aria-hidden>
                    ✓
                  </span>
                  <span className={styles.wizardStepLabel}>{step.shortLabel}</span>
                  <span className={styles.srOnly}>完了</span>
                </>
              ) : (
                <>
                  <span className={styles.wizardStepNum}>Step {step.n} / 3</span>
                  <span className={styles.wizardStepLabel}>{step.shortLabel}</span>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function EntryChoiceCard({
  themeId,
  selected,
  onSelect,
}: {
  themeId: ReplyThemeId;
  selected: boolean;
  onSelect: () => void;
}) {
  const card = WIZARD_ENTRY_CARD_DISPLAY[themeId];
  return (
    <button
      type="button"
      className={
        selected
          ? `${styles.choiceCard} ${styles.choiceCardSelected}`
          : styles.choiceCard
      }
      onClick={onSelect}
      aria-pressed={selected}
      aria-selected={selected}
    >
      <span className={styles.choiceCardBody}>
        <span className={styles.choiceCardTitle}>{card.label}</span>
        <span className={styles.choiceCardDescription}>{card.description}</span>
      </span>
      {selected ? (
        <span className={styles.choiceCardCheck} aria-hidden>
          ✓
        </span>
      ) : null}
    </button>
  );
}

function FocusChoiceCard({
  labelJa,
  selected,
  onSelect,
}: {
  labelJa: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={
        selected
          ? `${styles.choiceCard} ${styles.choiceCardSelected}`
          : styles.choiceCard
      }
      onClick={onSelect}
      aria-pressed={selected}
      aria-selected={selected}
      role="option"
    >
      <span className={styles.choiceCardBody}>
        <span className={styles.choiceCardTitle}>{labelJa}</span>
      </span>
      {selected ? (
        <span className={styles.choiceCardCheck} aria-hidden>
          ✓
        </span>
      ) : null}
    </button>
  );
}

const DEV_PREVIEW_SEND_BLOCKED_JA = 'プレビューでは送信できません。';

function ConsultRoomIssueNotice({
  message,
  messageClassName,
}: {
  message: string;
  messageClassName: string;
}) {
  return (
    <div className={styles.issueNotice} role="alert">
      <p className={messageClassName}>{message}</p>
      <p className={styles.issueSupport}>
        解決しない場合は{' '}
        <Link href="/support" className={styles.issueSupportLink}>
          サポート
        </Link>
        をご利用ください。
      </p>
    </div>
  );
}

export default function ConsultRoom({
  birthDate,
  nickname,
  stemIdx,
  devPreviewRoomData = null,
  onWalletSnapshotChange,
}: Props) {
  const isDevPreview = devPreviewRoomData != null;
  const [roomData, setRoomData] = useState<RoomData | null>(devPreviewRoomData);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<ReplyThemeId | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [expandLatestReply, setExpandLatestReply] = useState(false);
  const latestReplyCardRef = useRef<HTMLDivElement>(null);

  const sendLock = useRef(false);
  /** True only after user send; reload/focus must not scroll the thread. */
  const shouldScrollToLatestReplyRef = useRef(false);
  const activeIdempotencyKeyRef = useRef<string | null>(null);
  const activeSnapshotHashRef = useRef<string | null>(null);

  const themeQuestions = useMemo(
    () => (selectedThemeId ? getQuestionsForTheme(selectedThemeId) : []),
    [selectedThemeId],
  );
  const selectedCatalogEntry = useMemo(
    () =>
      selectedThemeId && selectedQuestionId
        ? themeQuestions.find((entry) => entry.reply_question_id === selectedQuestionId) ?? null
        : null,
    [selectedThemeId, selectedQuestionId, themeQuestions],
  );

  const historyMessages = roomData?.messages ?? [];
  const assistantReplies = useMemo(
    () => buildAssistantReplyHistory(historyMessages),
    [historyMessages]
  );
  const repliesNewestFirst = useMemo(
    () => [...assistantReplies].reverse(),
    [assistantReplies]
  );
  const replyCount = assistantReplies.length;
  const hasMoreReplies = replyCount > 1;
  const visibleReplies = showAllHistory ? repliesNewestFirst : repliesNewestFirst.slice(0, 1);
  const latestReplyKey = repliesNewestFirst[0]?.messageKey ?? null;

  const reloadRoom = useCallback(async (cancelledRef?: { cancelled: boolean }) => {
    if (isDevPreview && devPreviewRoomData) {
      if (!cancelledRef?.cancelled) {
        setLoadError(null);
        setRoomData(devPreviewRoomData);
      }
      return;
    }
    try {
      const res = await fetch('/api/room/core', { cache: 'no-store' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        if (!cancelledRef?.cancelled) {
          const apiErr = (d as { error?: string }).error;
          setLoadError(mapConsultRoomLoadErrorToUserMessage(apiErr, res.status));
        }
        return;
      }
      const data = await res.json();
      if (!cancelledRef?.cancelled) {
        setLoadError(null);
        setRoomData(data as RoomData);
      }
    } catch {
      if (!cancelledRef?.cancelled) {
        setLoadError(PAID_DTR_CONSULT_ROOM_UI.loadErrorJa);
      }
    }
  }, [isDevPreview, devPreviewRoomData]);

  useEffect(() => {
    if (isDevPreview) return;
    const cancelledRef = { cancelled: false };
    void reloadRoom(cancelledRef);
    return () => {
      cancelledRef.cancelled = true;
    };
  }, [reloadRoom, isDevPreview]);

  useEffect(() => {
    if (isDevPreview) return;
    const onFocus = () => {
      void reloadRoom();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [reloadRoom, isDevPreview]);

  useEffect(() => {
    if (!roomData) return;
    if (!shouldScrollToLatestReplyRef.current) return;
    if (replyCount === 0) return;

    const frame = requestAnimationFrame(() => {
      latestReplyCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      shouldScrollToLatestReplyRef.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [roomData?.messages, replyCount, expandLatestReply]);

  const selectTheme = (themeId: ReplyThemeId) => {
    setSelectedThemeId(themeId);
    setSelectedQuestionId(null);
  };

  const buildSnapshotHash = (themeId: ReplyThemeId | null, questionId: string | null): string =>
    `${themeId ?? ''}|${questionId ?? ''}`;

  const handleSend = async () => {
    if (isDevPreview) {
      setSendError(DEV_PREVIEW_SEND_BLOCKED_JA);
      return;
    }
    if (sendLock.current) return;
    if (!roomData) return;
    if (!selectedThemeId || !selectedQuestionId || !selectedCatalogEntry) return;
    const liveWallet = roomData.wallet ?? null;
    const liveHasWalletRow = roomData.has_wallet_row === true;
    const liveWalletUsable =
      Boolean(liveWallet) &&
      liveHasWalletRow &&
      liveWallet?.status === 'active';
    const liveWalletAvailable = liveWallet?.available_count ?? 0;
    const liveEffectiveRemaining = liveWalletUsable
      ? liveWalletAvailable
      : typeof roomData.effective_credits_remaining === 'number'
        ? roomData.effective_credits_remaining
        : roomData.thread.credits_remaining;
    const liveEffectiveState = liveWalletUsable
      ? (liveEffectiveRemaining > 0 ? 'writable' : 'read_only')
      : roomData.effective_state ?? roomData.thread.state;
    if (liveEffectiveState !== 'writable') return;
    if (liveEffectiveRemaining <= 0) return;

    const snapshot = {
      themeId: selectedThemeId,
      questionId: selectedQuestionId,
    };

    const snapshotHash = buildSnapshotHash(selectedThemeId, selectedQuestionId);
    if (activeSnapshotHashRef.current !== snapshotHash) {
      activeIdempotencyKeyRef.current = crypto.randomUUID();
      activeSnapshotHashRef.current = snapshotHash;
    }
    const idempotencyKey = activeIdempotencyKeyRef.current!;

    const themeId = selectedThemeId;
    const questionId = selectedQuestionId;
    const catalogEntry = selectedCatalogEntry;

    sendLock.current = true;
    setSending(true);
    setSendError(null);
    shouldScrollToLatestReplyRef.current = true;
    setExpandLatestReply(true);

    const optimisticMsg: Message = {
      role: 'user',
      content: `【テーマ】${catalogEntry.themeLabelJa}\n【質問】${catalogEntry.labelJa}`,
    };
    setRoomData((prev) => (prev ? { ...prev, messages: [...prev.messages, optimisticMsg] } : prev));
    setSelectedQuestionId(null);

    try {
      const res = await fetch('/api/room/core/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          reply_theme_id: themeId,
          reply_question_id: questionId,
          birthDate,
          nickname,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        shouldScrollToLatestReplyRef.current = false;
        setRoomData((prev) => (prev ? { ...prev, messages: prev.messages.slice(0, -1) } : prev));
        setSendError(
          mapConsultRoomSendErrorToUserMessage(
            (data as { safeMessage?: string }).safeMessage,
            (data as { error?: string }).error,
          ),
        );
        setSelectedThemeId(snapshot.themeId);
        setSelectedQuestionId(snapshot.questionId);
        return;
      }

      const { reply, thread } = data as { reply: Message; thread: ThreadState };
      activeIdempotencyKeyRef.current = null;
      activeSnapshotHashRef.current = null;
      // Optimistically decrement wallet so all counters agree immediately.
      const prevWallet = roomData?.wallet ?? null;
      const updatedWallet = prevWallet
        ? {
            ...prevWallet,
            consumed_count: prevWallet.consumed_count + 1,
            available_count: Math.max(0, prevWallet.available_count - 1),
          }
        : null;
      setRoomData((prev) =>
        prev
          ? { ...prev, thread, messages: [...prev.messages, reply], wallet: updatedWallet }
          : null,
      );
      if (onWalletSnapshotChange && updatedWallet) {
        const snap = walletRowToConsultDisplaySnapshot(updatedWallet);
        onWalletSnapshotChange(snap);
      }
    } catch {
      shouldScrollToLatestReplyRef.current = false;
      setRoomData((prev) => (prev ? { ...prev, messages: prev.messages.slice(0, -1) } : prev));
      setSendError('送信に失敗しました。ネットワークを確認して再度お試しください。');
      setSelectedThemeId(snapshot.themeId);
      setSelectedQuestionId(snapshot.questionId);
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  };

  if (loadError) {
    return (
      <div className={styles.room} aria-label={PAID_DTR_CONSULT_ROOM_UI.ariaLabelJa}>
        <ConsultRoomIssueNotice message={loadError} messageClassName={styles.errorMsg} />
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className={styles.room} aria-label={PAID_DTR_CONSULT_ROOM_UI.ariaLabelJa}>
        <p className={styles.loading}>読み込み中…</p>
      </div>
    );
  }

  const { thread, messages } = roomData;
  const wallet = roomData.wallet ?? null;
  const hasWalletRow = roomData.has_wallet_row === true;
  const walletUsable =
    Boolean(wallet) && hasWalletRow && wallet!.status === 'active';
  const effectiveRemaining =
    walletUsable
      ? wallet!.available_count
      : typeof roomData.effective_credits_remaining === 'number'
        ? roomData.effective_credits_remaining
        : thread.credits_remaining;
  const effectiveState =
    walletUsable
      ? (effectiveRemaining > 0 ? 'writable' : 'read_only')
      : roomData.effective_state ?? thread.state;
  const isReadOnly = effectiveState === 'read_only' || effectiveRemaining <= 0;
  const reportInstanceId =
    typeof roomData.report_instance_id === 'string' && roomData.report_instance_id.trim().length > 0
      ? roomData.report_instance_id.trim()
      : null;
  const walletLoading = !wallet || !hasWalletRow;
  const walletTotal = wallet ? wallet.initial_included_count + wallet.purchased_count : 0;
  const walletReachedLimit =
    walletTotal >= DISPLAY_CAP_PER_REPORT ||
    (wallet?.purchased_count ?? 0) >= PAID_DTR_CONSULT_REPLY.additionalMaxPurchased;

  const usedCount = wallet?.consumed_count ?? 0;

  const actionLocked = sending || walletLoading;
  const submitDisabled =
    actionLocked ||
    sending ||
    !selectedThemeId ||
    !selectedQuestionId ||
    isReadOnly;
  const showComposeFirst = !walletLoading && effectiveRemaining > 0 && !isReadOnly;
  const showExhausted =
    !walletLoading &&
    Boolean(wallet) &&
    effectiveRemaining <= 0 &&
    !walletReachedLimit;
  const showCapReached = !walletLoading && walletReachedLimit;

  const usageStatusCard = walletLoading ? (
    <div className={styles.usageStatusCard} role="status" aria-live="polite">
      <p className={styles.usageLoadingText}>{PAID_DTR_CONSULT_ROOM_UI.walletLoadingJa}</p>
    </div>
  ) : wallet ? (
    <div
      className={
        showCapReached
          ? `${styles.usageStatusCard} ${styles.usageStatusCardCap}`
          : showExhausted
            ? `${styles.usageStatusCard} ${styles.usageStatusCardPurchase}`
            : styles.usageStatusCard
      }
      aria-live="polite"
    >
      {showComposeFirst ? (
        <>
          <WalletBalanceStats
            availableCount={wallet.available_count}
            usedCount={usedCount}
            availableClassName={styles.usageStatAvailable}
            usedClassName={styles.usageStatCompact}
          />
        </>
      ) : showExhausted ? (
        <>
          <p className={styles.usagePrimaryLead}>{PAID_DTR_CONSULT_USAGE_DISPLAY.exhaustedPrimaryJa}</p>
          <p className={styles.usageSecondaryLead}>
            {PAID_DTR_CONSULT_USAGE_DISPLAY.exhaustedSecondaryJa}
          </p>
          <WalletBalanceStats
            availableCount={wallet.available_count}
            usedCount={usedCount}
            availableClassName={styles.usageStatAvailable}
            usedClassName={styles.usageStatCompact}
          />
        </>
      ) : showCapReached ? (
        <>
          <p className={styles.usagePrimaryLead}>{PAID_DTR_CONSULT_USAGE_DISPLAY.capReachedPrimaryJa}</p>
          <p className={styles.usageSecondaryLead}>
            {PAID_DTR_CONSULT_USAGE_DISPLAY.capReachedSecondaryJa}
          </p>
          <WalletBalanceStats
            availableCount={wallet.available_count}
            usedCount={usedCount}
            availableClassName={styles.usageStatAvailable}
            usedClassName={styles.usageStatCompact}
          />
        </>
      ) : (
        <>
          <p className={styles.usagePrimaryLead}>{PAID_DTR_CONSULT_USAGE_DISPLAY.capReachedPrimaryJa}</p>
          <WalletBalanceStats
            availableCount={wallet.available_count}
            usedCount={usedCount}
            availableClassName={styles.usageStatAvailable}
            usedClassName={styles.usageStatCompact}
          />
        </>
      )}
    </div>
  ) : null;

  const valueDeliverablesDetails = !walletLoading ? (
    <details className={`${styles.entryDetails} ${styles.entryDetailsLower}`}>
      <summary className={styles.entryDetailsSummary}>
        {PAID_DTR_CONSULT_ENTRY_LAYOUT.valueDetailsSummaryJa}
      </summary>
      <div className={styles.valueDeliverablesCard}>
        <ol className={styles.valueDeliverablesList}>
          {ROOM_UI_COPY.valueItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <p className={styles.valueDeliverablesNote}>{ROOM_UI_COPY.valueCardNote}</p>
      </div>
    </details>
  ) : null;

  const entryEssentialNotes = (
    <ul
      className={
        showComposeFirst
          ? `${styles.entryEssentialNotes} ${styles.entryEssentialNotesMuted}`
          : styles.entryEssentialNotes
      }
      aria-label="利用上の注意"
    >
      {PAID_DTR_CONSULT_ENTRY_LAYOUT.essentialNotesJa.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );

  const statusNotice =
    walletLoading ? null : !reportInstanceId ? (
      <div className={styles.readOnlyNotice} role="status" aria-live="polite">
        <p className={styles.readOnlyText}>{PAID_DTR_CONSULT_ROOM_UI.cannotPurchaseReportInfoJa}</p>
      </div>
    ) : showExhausted ? (
      <div className={styles.readOnlyNotice} role="status" aria-live="polite">
        <p className={styles.readOnlyText}>{PAID_DTR_CONSULT_ENTRY_NEUTRAL.walletExhaustedJa}</p>
      </div>
    ) : isReadOnly ? (
      <div className={styles.readOnlyNotice} role="status" aria-live="polite">
        <p className={styles.readOnlyText}>{PAID_DTR_CONSULT_ROOM_UI.limitReachedReadOnlyJa}</p>
      </div>
    ) : null;

  const wizardActiveStep = deriveWizardActiveStep(selectedThemeId, selectedQuestionId);
  const selectedEntryLabel =
    selectedThemeId != null ? WIZARD_ENTRY_CARD_DISPLAY[selectedThemeId].label : null;
  const selectedFocusLabel = selectedCatalogEntry
    ? wizardQuestionLabelJa(selectedCatalogEntry.reply_question_id, selectedCatalogEntry.labelJa)
    : null;

  const composeBlock = !isReadOnly ? (
    <div
      id={CONSULT_COMPOSE_PANEL_ID}
      className={`${styles.composePanel} ${styles.composePanelScrollAnchor} ${styles.replyWizard}`}
    >
      <h3 className={styles.composePanelTitle}>{ROOM_UI_COPY.composePanelTitle}</h3>
      <WizardProgress activeStep={wizardActiveStep} />

      <section
        className={`${styles.wizardStepPanel} ${wizardActiveStep === 1 ? styles.wizardStepPanelActive : ''}`}
        aria-labelledby="consult-step-1"
      >
        <p className={styles.stepEyebrow}>Step 1 / 3</p>
        <h4 id="consult-step-1" className={styles.composeStepTitle}>
          {ROOM_UI_COPY.step1Title}
        </h4>
        <p className={styles.composeHintMuted}>{ROOM_UI_COPY.step1Hint}</p>
        <div className={styles.choiceGrid} role="list">
          {REPLY_THEME_IDS.map((themeId) => (
            <EntryChoiceCard
              key={themeId}
              themeId={themeId}
              selected={selectedThemeId === themeId}
              onSelect={() => selectTheme(themeId)}
            />
          ))}
        </div>
      </section>

      {selectedThemeId ? (
        <section
          className={`${styles.wizardStepPanel} ${wizardActiveStep === 2 ? styles.wizardStepPanelActive : ''}`}
          aria-labelledby="consult-step-2"
        >
          <p className={styles.stepEyebrow}>Step 2 / 3</p>
          <h4 id="consult-step-2" className={styles.composeStepTitle}>
            {ROOM_UI_COPY.step2Title}
          </h4>
          <p className={styles.composeHintMuted}>{ROOM_UI_COPY.step2Hint}</p>
          <p className={styles.composeHintMuted}>{ROOM_UI_COPY.step2HintSub}</p>
          <div className={styles.selectionMemory} aria-live="polite">
            <p className={styles.selectionMemoryEyebrow}>{ROOM_UI_COPY.selectionMemoryEyebrow}</p>
            <p className={styles.selectionMemoryValue}>{selectedEntryLabel}</p>
            <p className={styles.selectionMemoryPrompt}>{ROOM_UI_COPY.selectionMemoryPrompt}</p>
          </div>
          <div className={styles.choiceGrid} role="listbox" aria-label="今回深く見る焦点">
            {themeQuestions.map((entry) => (
              <FocusChoiceCard
                key={entry.reply_question_id}
                labelJa={wizardQuestionLabelJa(entry.reply_question_id, entry.labelJa)}
                selected={selectedQuestionId === entry.reply_question_id}
                onSelect={() => setSelectedQuestionId(entry.reply_question_id)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {selectedThemeId && selectedQuestionId && selectedCatalogEntry ? (
        <section
          className={`${styles.wizardStepPanel} ${styles.wizardStepPanelActive} ${styles.composeStepSubmit}`}
          aria-labelledby="consult-step-3"
        >
          <p className={styles.stepEyebrow}>Step 3 / 3</p>
          <h4 id="consult-step-3" className={styles.composeStepTitle}>
            {ROOM_UI_COPY.step3Title}
          </h4>
          <div className={styles.confirmPanel}>
            <div className={styles.confirmRow}>
              <span className={styles.confirmLabel}>{ROOM_UI_COPY.confirmEntryLabel}</span>
              <span className={styles.confirmValue}>{selectedEntryLabel}</span>
            </div>
            <div className={styles.confirmRow}>
              <span className={styles.confirmLabel}>{ROOM_UI_COPY.confirmFocusLabel}</span>
              <span className={styles.confirmValue}>{selectedFocusLabel}</span>
              <span className={styles.checkMark} aria-hidden>
                ✓
              </span>
            </div>
          </div>
          <p className={styles.composeHintMuted}>{ROOM_UI_COPY.step3Lead}</p>
          <p className={styles.stepConsumeNote}>{ROOM_UI_COPY.step3Consume}</p>
          <button
            type="button"
            className={
              submitDisabled
                ? `${styles.submitBtn} ${styles.submitBtnPrimary} ${styles.submitBtnDisabled}`
                : `${styles.submitBtn} ${styles.submitBtnPrimary}`
            }
            onClick={handleSend}
            disabled={submitDisabled}
            aria-busy={sending}
          >
            {sending ? (
              <span className={styles.submitBtnInner}>
                <svg className={styles.submitSpinner} viewBox="0 0 24 24" aria-hidden>
                  <circle
                    className={styles.submitSpinnerTrack}
                    cx="12"
                    cy="12"
                    r="10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className={styles.submitSpinnerArc}
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {PAID_DTR_CONSULT_ROOM_UI.submittingLabelJa}
              </span>
            ) : (
              PAID_DTR_CONSULT_ROOM_UI.submitLabelJa
            )}
          </button>
          <p className={styles.inputNote}>{PAID_DTR_CONSULT_REPLY.consumeNoteJa}</p>
        </section>
      ) : null}
    </div>
  ) : null;

  const messagesBlock = (
    <div className={replyCount > 0 ? `${styles.historySection} ${styles.historySectionActive}` : styles.historySection}>
      {replyCount > 0 ? (
        <div className={styles.historyHeader}>
          <div className={styles.historyHeaderText}>
            <h3 className={styles.historyTitle}>{ROOM_UI_COPY.historyTitle}</h3>
            <p className={styles.historySummary}>{formatHistoryCountSummary(replyCount)}</p>
          </div>
          {hasMoreReplies ? (
            <button
              type="button"
              className={styles.historyHeaderAction}
              onClick={() => setShowAllHistory((prev) => !prev)}
              aria-expanded={showAllHistory}
            >
              {showAllHistory
                ? PAID_DTR_CONSULT_ROOM_UI.historyShowLessJa
                : PAID_DTR_CONSULT_ROOM_UI.historyShowAllJa}
            </button>
          ) : null}
        </div>
      ) : null}
      <div
        className={styles.messages}
        role="region"
        aria-label={PAID_DTR_CONSULT_ROOM_UI.historyMessagesAriaJa}
      >
        {replyCount === 0 && !isReadOnly && (
          <p className={styles.emptyMsg}>{PAID_DTR_CONSULT_ROOM_UI.emptyThreadJa}</p>
        )}
        {visibleReplies.map((entry) => {
          const isLatest = entry.messageKey === latestReplyKey;
          return (
            <div
              key={entry.messageKey}
              ref={isLatest ? latestReplyCardRef : undefined}
              className={isLatest ? styles.latestReplyAnchor : undefined}
            >
              <ConsultReplyCard
                assistantContent={entry.msg.content}
                theme={entry.theme}
                userQuote={entry.userQuote}
                stemIdx={stemIdx}
                usedCount={usedCount}
                remainingCount={wallet?.available_count ?? effectiveRemaining}
                compactInitially={!(isLatest && expandLatestReply)}
                initialExpanded={isLatest && expandLatestReply}
                isLatest={isLatest}
                highlightLatest={isLatest && expandLatestReply}
              />
            </div>
          );
        })}
        {!showAllHistory && hasMoreReplies ? (
          <button
            type="button"
            className={styles.historyShowMoreBtn}
            onClick={() => setShowAllHistory(true)}
          >
            {PAID_DTR_CONSULT_ROOM_UI.historyShowMoreTemplateJa.replace(
              '{count}',
              String(replyCount - 1)
            )}
          </button>
        ) : null}
        {sending && (
          <p className={styles.msgPending} aria-live="polite">
            {PAID_DTR_CONSULT_ROOM_UI.generatingReplyJa}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <section className={styles.room} aria-label={PAID_DTR_CONSULT_ROOM_UI.ariaLabelJa}>
      <header className={styles.roomHeaderBar}>
        <h2 className={styles.roomTitle}>{PAID_DTR_CONSULT_ROOM_UI.roomTitleJa}</h2>
        <p className={styles.roomLead}>{PAID_DTR_CONSULT_GROUNDING_COPY.titleLine2Ja}。</p>
        {isDevPreview ? (
          <p className={styles.devPreviewNote} role="note">
            開発プレビュー（送信・購入は実行されません）
          </p>
        ) : null}
      </header>

      {usageStatusCard}
      {showComposeFirst ? (
        <>
          {entryEssentialNotes}
          {composeBlock}
        </>
      ) : (
        <>
          {entryEssentialNotes}
          {statusNotice}
        </>
      )}
      {sendError ? (
        <ConsultRoomIssueNotice message={sendError} messageClassName={styles.sendError} />
      ) : null}
      {messagesBlock}
      {valueDeliverablesDetails}
    </section>
  );
}
