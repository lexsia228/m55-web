'use client';

/**
 * Purchaser-only concierge room.
 * M55_REPORT_CONCIERGE_ROOM_SSOT_v1 + M55_AI_CONSULT_SAFETY_AND_LIMITS_SSOT_v1
 *
 * Constraints:
 * - Shows only when ownership is confirmed (server gate already checked).
 * - Input: reply_theme_id required; short context is optional.
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
} from '../../lib/m55/consult/consultReplyWizardDisplay.v1';
import {
  CONSULT_SEND_INPUT_MAX,
  buildThemeOnlyConsultMessage,
} from '../../lib/m55/consult/consultSendMessage';
import {
  type ConsultWalletDisplaySnapshot,
  walletRowToConsultDisplaySnapshot,
} from '../../lib/m55/reply/consultWalletDisplaySnapshot';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelAction,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import ConsultReplyCard from './ConsultReplyCard';
import styles from './ConsultRoom.module.css';

const DISPLAY_CAP_PER_REPORT = PAID_DTR_CONSULT_REPLY.totalCapPerReport;

/** Entry-only display copy (Product Truth constants unchanged). */
const ROOM_UI_COPY = {
  valueCardTitle: PAID_DTR_CONSULT_ROOM_UI.valueDeliverablesTitleJa,
  valueItems: PAID_DTR_CONSULT_ENTRY_LAYOUT.valueDeliverableItemsJa,
  valueCardNote: PAID_DTR_CONSULT_ENTRY_LAYOUT.valueDeliverableFooterJa,
  composePanelTitle: '追加読み解きを作る',
  historyTitle: '最近の追加読み解き',
  step1Title: '今、どこから整理しますか？',
  step1Hint: '保存版をもとに、今気になっていることを一つのテーマで整理します。',
  step2Title: '必要なら補足する',
  step2Hint: 'テーマだけでも作れます。',
  step2HintSub:
    'もっと具体的に見てほしいことがあれば、下に短く書いてください。',
  selectionMemoryEyebrow: '選んだテーマ',
  selectionMemoryPrompt: 'このテーマをもとに整理します。',
  step3Title: '内容を確認する',
  step3Lead: '保存版に沿って、この内容で追加読み解きを作成します。',
  confirmEntryLabel: '選んだテーマ',
  confirmContextLabel: '補足内容',
  reviewCurrentLabel: '現在',
  reviewUseLabel: '今回',
  reviewAfterLabel: '作成後',
} as const;

const WIZARD_STEPS = [
  { n: 1 as const, shortLabel: '入口' },
  { n: 2 as const, shortLabel: '補足' },
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

function formatStoredResultDate(createdAt?: string): string | null {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
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
        <span className={`${styles.choiceCardTitle} ${styles.wizTypoCardTitle}`}>{card.label}</span>
        <span className={`${styles.choiceCardDescription} ${styles.wizTypoCardCaption}`}>
          {card.description}
        </span>
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
  const [optionalContext, setOptionalContext] = useState('');
  const [wizardActiveStep, setWizardActiveStep] = useState<1 | 2 | 3>(1);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [expandLatestReply, setExpandLatestReply] = useState(false);
  const latestReplyCardRef = useRef<HTMLDivElement>(null);

  const sendLock = useRef(false);
  /** True only after user send; reload/focus must not scroll the thread. */
  const shouldScrollToLatestReplyRef = useRef(false);
  const activeIdempotencyKeyRef = useRef<string | null>(null);
  const activeSnapshotHashRef = useRef<string | null>(null);

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
    if (!roomData) return;
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.additionalReadingFlowView,
      'dtr_additional_reading',
      'dtr-additional-reading-flow-view',
    );
  }, [roomData]);

  useEffect(() => {
    if (wizardActiveStep !== 3) return;
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.additionalReadingReviewView,
      'dtr_additional_reading',
      'dtr-additional-reading-review-view',
    );
  }, [wizardActiveStep]);

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
    trackFunnelAction(
      M55_FUNNEL_EVENTS.additionalReadingThemeSelected,
      'dtr_additional_reading',
    );
    trackFunnelAction(
      M55_FUNNEL_EVENTS.additionalThemeStarted,
      'dtr_additional_reading',
    );
  };

  const buildSnapshotHash = (themeId: ReplyThemeId | null, context: string): string =>
    `${themeId ?? ''}|${context.trim()}`;

  const handleSend = async () => {
    if (sendLock.current) return;
    trackFunnelAction(
      M55_FUNNEL_EVENTS.additionalReadingSendIntent,
      'dtr_additional_reading',
    );
    trackFunnelAction(
      M55_FUNNEL_EVENTS.consultReplyStarted,
      'dtr_additional_reading',
    );
    if (isDevPreview) {
      setSendError(DEV_PREVIEW_SEND_BLOCKED_JA);
      return;
    }
    if (!roomData) return;
    if (!selectedThemeId) return;
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
      optionalContext,
      wizardActiveStep,
    };

    const snapshotHash = buildSnapshotHash(selectedThemeId, optionalContext);
    if (activeSnapshotHashRef.current !== snapshotHash) {
      activeIdempotencyKeyRef.current = crypto.randomUUID();
      activeSnapshotHashRef.current = snapshotHash;
    }
    const idempotencyKey = activeIdempotencyKeyRef.current!;

    const themeId = selectedThemeId;
    const themeLabel =
      getQuestionsForTheme(themeId)[0]?.themeLabelJa ??
      WIZARD_ENTRY_CARD_DISPLAY[themeId].label;
    const trimmedContext = optionalContext.trim();

    sendLock.current = true;
    setSending(true);
    setSendError(null);
    shouldScrollToLatestReplyRef.current = true;
    setExpandLatestReply(true);

    const optimisticMsg: Message = {
      role: 'user',
      content: trimmedContext
        ? `${buildThemeOnlyConsultMessage(themeLabel)}\n\n${trimmedContext}`
        : buildThemeOnlyConsultMessage(themeLabel),
    };
    setRoomData((prev) => (prev ? { ...prev, messages: [...prev.messages, optimisticMsg] } : prev));

    try {
      const res = await fetch('/api/room/core/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          reply_theme_id: themeId,
          optional_context: trimmedContext || undefined,
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
        setOptionalContext(snapshot.optionalContext);
        setWizardActiveStep(snapshot.wizardActiveStep);
        return;
      }

      const { reply, thread } = data as { reply: Message; thread: ThreadState };
      activeIdempotencyKeyRef.current = null;
      activeSnapshotHashRef.current = null;
      setSelectedThemeId(null);
      setOptionalContext('');
      setWizardActiveStep(1);
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
      setOptionalContext(snapshot.optionalContext);
      setWizardActiveStep(snapshot.wizardActiveStep);
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
      ) : showExhausted || showCapReached ? (
        <>
          <p className={styles.usagePrimaryLead}>追加読み解きはすべて利用済みです。</p>
          <p className={styles.usageSecondaryLead}>保存版はいつでも読み返せます。</p>
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
    ) : showExhausted || (showCapReached && isReadOnly) ? (
      <div className={styles.readOnlyNotice} role="status" aria-live="polite">
        <Link href="/dtr/core" className={styles.zeroStatePrimaryLink}>
          保存版を読み返す
        </Link>
      </div>
    ) : isReadOnly ? (
      <div className={styles.readOnlyNotice} role="status" aria-live="polite">
        <p className={styles.readOnlyText}>{PAID_DTR_CONSULT_ROOM_UI.limitReachedReadOnlyJa}</p>
      </div>
    ) : null;

  const selectedEntryLabel =
    selectedThemeId != null ? WIZARD_ENTRY_CARD_DISPLAY[selectedThemeId].label : null;
  const projectedRemaining = Math.max(0, effectiveRemaining - 1);

  const composeBlock = !isReadOnly ? (
    <div
      id={CONSULT_COMPOSE_PANEL_ID}
      className={`${styles.composePanel} ${styles.composePanelScrollAnchor} ${styles.replyWizard}`}
    >
      <h3 className={`${styles.composePanelTitle} ${styles.wizTypoPanelTitle}`}>
        {ROOM_UI_COPY.composePanelTitle}
      </h3>
      <WizardProgress activeStep={wizardActiveStep} />

      {wizardActiveStep === 1 ? (
        <section
          className={`${styles.wizardStepPanel} ${styles.wizardStepPanelActive}`}
          aria-labelledby="consult-step-1"
        >
          <p className={`${styles.stepEyebrow} ${styles.wizTypoCaption}`}>Step 1 / 3</p>
          <h4 id="consult-step-1" className={`${styles.composeStepTitle} ${styles.wizTypoStepHeading}`}>
            {ROOM_UI_COPY.step1Title}
          </h4>
          <p className={`${styles.composeHintMuted} ${styles.wizTypoBody}`}>{ROOM_UI_COPY.step1Hint}</p>
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
          <div className={styles.wizardActions}>
            <button
              type="button"
              className={`${styles.submitBtn} ${styles.submitBtnPrimary}`}
              disabled={!selectedThemeId}
              onClick={() => setWizardActiveStep(2)}
            >
              次へ
            </button>
          </div>
        </section>
      ) : null}

      {wizardActiveStep === 2 && selectedThemeId ? (
        <section
          className={`${styles.wizardStepPanel} ${styles.wizardStepPanelActive}`}
          aria-labelledby="consult-step-2"
        >
          <p className={`${styles.stepEyebrow} ${styles.wizTypoCaption}`}>Step 2 / 3</p>
          <h4 id="consult-step-2" className={`${styles.composeStepTitle} ${styles.wizTypoStepHeading}`}>
            {ROOM_UI_COPY.step2Title}
          </h4>
          <p className={`${styles.composeHintMuted} ${styles.wizTypoBody}`}>{ROOM_UI_COPY.step2Hint}</p>
          <p className={`${styles.composeHintMuted} ${styles.wizTypoBody}`}>{ROOM_UI_COPY.step2HintSub}</p>
          <div className={styles.selectionMemory} aria-live="polite">
            <p className={`${styles.selectionMemoryEyebrow} ${styles.wizTypoCaption}`}>
              {ROOM_UI_COPY.selectionMemoryEyebrow}
            </p>
            <p className={`${styles.selectionMemoryValue} ${styles.wizTypoEmphasis}`}>{selectedEntryLabel}</p>
            <p className={`${styles.selectionMemoryPrompt} ${styles.wizTypoBody}`}>
              {ROOM_UI_COPY.selectionMemoryPrompt}
            </p>
          </div>
          <label className={styles.optionalInputLabel} htmlFor="consult-optional-context">
            補足（任意）
          </label>
          <textarea
            id="consult-optional-context"
            className={styles.textarea}
            value={optionalContext}
            onChange={(event) => setOptionalContext(event.target.value)}
            maxLength={CONSULT_SEND_INPUT_MAX}
            placeholder="例：最近、仕事の進め方を見直したいと感じています。"
          />
          <div className={styles.counterRow}>
            <span className={styles.counter}>
              {optionalContext.length} / {CONSULT_SEND_INPUT_MAX}文字
            </span>
          </div>
          <div className={styles.wizardActions}>
            <button
              type="button"
              className={styles.wizardSecondaryButton}
              onClick={() => setWizardActiveStep(1)}
            >
              入口を見直す
            </button>
            <button
              type="button"
              className={`${styles.submitBtn} ${styles.submitBtnPrimary}`}
              onClick={() => setWizardActiveStep(3)}
            >
              内容を確認する
            </button>
          </div>
        </section>
      ) : null}

      {wizardActiveStep === 3 && selectedThemeId ? (
        <section
          className={`${styles.wizardStepPanel} ${styles.wizardStepPanelActive} ${styles.composeStepSubmit}`}
          aria-labelledby="consult-step-3"
        >
          <p className={`${styles.stepEyebrow} ${styles.wizTypoCaption}`}>Step 3 / 3</p>
          <h4 id="consult-step-3" className={`${styles.composeStepTitle} ${styles.wizTypoStepHeading}`}>
            {ROOM_UI_COPY.step3Title}
          </h4>
          <div className={styles.confirmPanel}>
            <div className={styles.confirmRow}>
              <span className={`${styles.confirmLabel} ${styles.wizTypoCaption}`}>
                {ROOM_UI_COPY.confirmEntryLabel}
              </span>
              <span className={`${styles.confirmValue} ${styles.wizTypoEmphasis}`}>{selectedEntryLabel}</span>
            </div>
            {optionalContext.trim() ? (
              <div className={styles.confirmRow}>
                <span className={`${styles.confirmLabel} ${styles.wizTypoCaption}`}>
                  {ROOM_UI_COPY.confirmContextLabel}
                </span>
                <span className={`${styles.confirmValue} ${styles.wizTypoEmphasis}`}>
                  {optionalContext.trim()}
                </span>
              </div>
            ) : null}
          </div>
          <p className={`${styles.composeHintMuted} ${styles.wizTypoBody}`}>{ROOM_UI_COPY.step3Lead}</p>
          <div className={styles.consumptionProjection} aria-label="追加読み解きの使用確認">
            <p>
              <span>{ROOM_UI_COPY.reviewCurrentLabel}</span>
              <strong>{effectiveRemaining}件</strong>
            </p>
            <p>
              <span>{ROOM_UI_COPY.reviewUseLabel}</span>
              <strong>1件使用</strong>
            </p>
            <p>
              <span>{ROOM_UI_COPY.reviewAfterLabel}</span>
              <strong>{projectedRemaining}件</strong>
            </p>
          </div>
          <div className={styles.wizardActions}>
            <button
              type="button"
              className={styles.wizardSecondaryButton}
              onClick={() => setWizardActiveStep(2)}
            >
              内容を見直す
            </button>
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
              {sending ? PAID_DTR_CONSULT_ROOM_UI.submittingLabelJa : 'この内容で1件使って作る'}
            </button>
          </div>
          <p className={`${styles.inputNote} ${styles.wizTypoCtaNote}`}>{PAID_DTR_CONSULT_REPLY.consumeNoteJa}</p>
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
          const createdDate = formatStoredResultDate(entry.msg.created_at);
          return (
            <div
              key={entry.messageKey}
              ref={isLatest ? latestReplyCardRef : undefined}
              className={isLatest ? styles.latestReplyAnchor : undefined}
            >
              {createdDate ? (
                <p className={styles.storedResultDate}>作成日 {createdDate}</p>
              ) : null}
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
