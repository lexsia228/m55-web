'use client';

/**
 * Purchaser-only concierge room.
 * M55_REPORT_CONCIERGE_ROOM_SSOT_v1 + M55_AI_CONSULT_SAFETY_AND_LIMITS_SSOT_v1
 *
 * Constraints:
 * - Shows only when ownership is confirmed (server gate already checked).
 * - Input: theme required; free body optional; warning=450, hard max=500 chars (theme included).
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
  PAID_DTR_DRAWER_THEME_ENTRIES,
  THEME_CHIP_DISPLAY_LABEL_OVERRIDES,
  formatConsultAvailableCountLine,
  formatConsultUsedCountLine,
} from '../../lib/m55/paidDtrProductCopy';
import { CONSULT_COMPOSE_PANEL_ID } from '../../lib/m55/consult/consultRoomScrollAnchors';
import {
  type ConsultWalletDisplaySnapshot,
  walletRowToConsultDisplaySnapshot,
} from '../../lib/m55/reply/consultWalletDisplaySnapshot';
import ConsultReplyCard from './ConsultReplyCard';
import styles from './ConsultRoom.module.css';

const INPUT_WARN = 450;
const INPUT_MAX = 500;
const DISPLAY_CAP_PER_REPORT = PAID_DTR_CONSULT_REPLY.totalCapPerReport;

/** Entry-only display copy (Product Truth constants unchanged). */
const ROOM_UI_COPY = {
  valueCardTitle: PAID_DTR_CONSULT_ROOM_UI.valueDeliverablesTitleJa,
  valueItems: PAID_DTR_CONSULT_ENTRY_LAYOUT.valueDeliverableItemsJa,
  valueCardNote: PAID_DTR_CONSULT_ENTRY_LAYOUT.valueDeliverableFooterJa,
  composePanelTitle: PAID_DTR_CONSULT_ROOM_UI.composePanelTitleJa,
  historyTitle: 'これまでの相談返書',
  step1Title: 'Step 1 いちばん気になるテーマを選ぶ',
  step1Hint: '1テーマだけ選びます。迷ったら、いちばん近いものを選んでください。',
  step2Title: 'Step 2 相談を書く（任意）',
  step2Hint: 'テーマだけでも返書を作れます。',
  step2HintSub: 'もう少し詳しく見てほしいことがあれば、下に短く書いてください。',
  inputPlaceholder:
    '書ける人だけ、今気になっていることを短く書いてください。空欄でも大丈夫です。',
  counterHelper: '選んだテーマも含めて送信します。相談文は空欄でも大丈夫です。',
  step3Title: 'Step 3 相談返書を作成する',
  step3Consume: 'この送信で相談返書を1件使用します。',
} as const;

/** 用途ラベル（1テーマ）— copy master themeExamplesJa */
const THEMES = PAID_DTR_CONSULT_REPLY.themeExamplesJa;

type Theme = (typeof PAID_DTR_CONSULT_REPLY.themeExamplesJa)[number];

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

const SUPPLEMENTARY_QUESTIONS: { id: string; label: string }[] = [
  { id: 'q1', label: '恋人や近い人に、どう伝えればいいか迷っている' },
  { id: 'q2', label: '仕事やスキルで、いま伸ばすところが分からない' },
  { id: 'q3', label: 'お金や生活の不安で、気持ちが落ち着かない' },
  { id: 'q4', label: 'これから何を優先すればいいか迷っている' },
  { id: 'q5', label: '疲れていて、まずどこから戻せばいいか知りたい' },
];

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

function buildComposedMessage(
  theme: Theme | null,
  selectedIds: Set<string>,
  freeText: string
): string {
  const parts: string[] = [];
  if (theme) parts.push(`【テーマ】${theme}`);
  if (selectedIds.size > 0) {
    const labels = SUPPLEMENTARY_QUESTIONS.filter((q) => selectedIds.has(q.id)).map(
      (q) => `・${q.label}`
    );
    parts.push(`【補助（最大3つ）】\n${labels.join('\n')}`);
  }
  const body = freeText.trim();
  if (body) parts.push(body);
  return parts.join('\n\n');
}

/** Drawer sublabels keyed by theme label (Product Truth). */
const THEME_CHIP_SUBLABEL_BY_LABEL = Object.fromEntries(
  PAID_DTR_DRAWER_THEME_ENTRIES.map((entry) => [entry.labelJa, entry.sublabelJa]),
) as Record<Theme, string>;

function ThemeChip({
  theme,
  selected,
  onSelect,
}: {
  theme: Theme;
  selected: boolean;
  onSelect: () => void;
}) {
  const sublabel = THEME_CHIP_SUBLABEL_BY_LABEL[theme];
  const displayLabel = THEME_CHIP_DISPLAY_LABEL_OVERRIDES[theme] ?? theme;
  return (
    <button
      type="button"
      className={selected ? `${styles.themeChip} ${styles.themeChipSelected}` : styles.themeChip}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className={styles.themeChipMain}>{displayLabel}</span>
      {sublabel ? <span className={styles.themeChipSublabel}>{sublabel}</span> : null}
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
  const [inputText, setInputText] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(() => new Set());
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [expandLatestReply, setExpandLatestReply] = useState(false);
  const latestReplyCardRef = useRef<HTMLDivElement>(null);

  const sendLock = useRef(false);
  /** True only after user send; reload/focus must not scroll the thread. */
  const shouldScrollToLatestReplyRef = useRef(false);
  const activeIdempotencyKeyRef = useRef<string | null>(null);
  const activeSnapshotHashRef = useRef<string | null>(null);

  const composedMessage = useMemo(
    () => buildComposedMessage(selectedTheme, selectedQuestionIds, inputText),
    [selectedTheme, selectedQuestionIds, inputText]
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

  const composedLen = composedMessage.length;
  const isOverMax = composedLen > INPUT_MAX;
  const isWarn = composedLen >= INPUT_WARN && !isOverMax;

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

  const toggleQuestion = (id: string) => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  };

  const buildSnapshotHash = (
    msg: string,
    theme: Theme | null,
    questionIds: Set<string>
  ): string => `${theme ?? ''}|${[...questionIds].sort().join(',')}|${msg}`;

  const handleSend = async () => {
    if (isDevPreview) {
      setSendError(DEV_PREVIEW_SEND_BLOCKED_JA);
      return;
    }
    if (sendLock.current) return;
    if (!roomData) return;
    if (!selectedTheme) return;

    const msg = composedMessage.trim();
    if (!msg) return;
    if (msg.length > INPUT_MAX) return;
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
      free: inputText,
      questions: new Set(selectedQuestionIds),
      theme: selectedTheme,
    };

    const snapshotHash = buildSnapshotHash(msg, selectedTheme, selectedQuestionIds);
    if (activeSnapshotHashRef.current !== snapshotHash) {
      activeIdempotencyKeyRef.current = crypto.randomUUID();
      activeSnapshotHashRef.current = snapshotHash;
    }
    const idempotencyKey = activeIdempotencyKeyRef.current!;

    sendLock.current = true;
    setSending(true);
    setSendError(null);
    shouldScrollToLatestReplyRef.current = true;
    setExpandLatestReply(true);

    const optimisticMsg: Message = { role: 'user', content: msg };
    setRoomData((prev) => (prev ? { ...prev, messages: [...prev.messages, optimisticMsg] } : prev));
    setInputText('');
    setSelectedQuestionIds(new Set());

    try {
      const res = await fetch('/api/room/core/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ message: msg, birthDate, nickname }),
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
        setInputText(snapshot.free);
        setSelectedQuestionIds(snapshot.questions);
        setSelectedTheme(snapshot.theme);
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
      setInputText(snapshot.free);
      setSelectedQuestionIds(snapshot.questions);
      setSelectedTheme(snapshot.theme);
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
    actionLocked || sending || !selectedTheme || isOverMax || isReadOnly;
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

  const composeBlock = !isReadOnly ? (
    <div id={CONSULT_COMPOSE_PANEL_ID} className={`${styles.composePanel} ${styles.composePanelScrollAnchor}`}>
      <h3 className={styles.composePanelTitle}>{ROOM_UI_COPY.composePanelTitle}</h3>

      <section className={styles.composeStep} aria-labelledby="consult-step-1">
        <div className={styles.composeStepHead}>
          <h4 id="consult-step-1" className={styles.composeStepTitle}>
            {ROOM_UI_COPY.step1Title}
          </h4>
        </div>
        <p className={styles.composeHintMuted}>{ROOM_UI_COPY.step1Hint}</p>
        <div className={styles.themeRow}>
          {THEMES.map((t) => (
            <ThemeChip
              key={t}
              theme={t}
              selected={selectedTheme === t}
              onSelect={() => setSelectedTheme(t)}
            />
          ))}
        </div>
      </section>

      <section className={styles.composeStep} aria-labelledby="consult-step-2">
        <div className={styles.composeStepHead}>
          <h4 id="consult-step-2" className={styles.composeStepTitle}>
            {ROOM_UI_COPY.step2Title}
          </h4>
        </div>
        <p className={styles.composeHintMuted}>{ROOM_UI_COPY.step2Hint}</p>
        <p className={styles.composeHintMuted}>{ROOM_UI_COPY.step2HintSub}</p>
        <label htmlFor="consult-input" className={styles.srOnly}>
          {PAID_DTR_CONSULT_ROOM_UI.composeFreeInputAriaJa}
          （任意・全体で{INPUT_MAX}文字まで）
        </label>
        <textarea
          id="consult-input"
          className={styles.textarea}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={ROOM_UI_COPY.inputPlaceholder}
          rows={5}
          maxLength={INPUT_MAX + 80}
          disabled={actionLocked}
          aria-describedby="char-counter"
        />
        <div className={styles.counterRow}>
          <span
            id="char-counter"
            className={isOverMax ? styles.counterOver : isWarn ? styles.counterWarn : styles.counter}
            aria-live="polite"
          >
            送信内容（選んだテーマを含む） {composedLen} / {INPUT_MAX}
            {selectedTheme == null && ' — テーマを選択してください'}
            {isWarn && ` — あと${INPUT_MAX - composedLen}文字`}
            {isOverMax && ' — 上限を超えています。短くしてください'}
          </span>
          <span className={styles.composeHintMuted}>{ROOM_UI_COPY.counterHelper}</span>
        </div>
      </section>

      <section className={styles.composeStepSubmit} aria-labelledby="consult-step-3">
        <h4 id="consult-step-3" className={styles.composeStepTitle}>
          {ROOM_UI_COPY.step3Title}
        </h4>
        <p className={styles.stepConsumeNote}>{ROOM_UI_COPY.step3Consume}</p>
        <button
          type="button"
          className={submitDisabled ? `${styles.submitBtn} ${styles.submitBtnDisabled}` : styles.submitBtn}
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
