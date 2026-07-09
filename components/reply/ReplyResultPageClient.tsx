"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReplyPayloadV11Parsed } from "../../lib/m55/reply/replyPayload.zod";
import { replyPayloadV11Schema } from "../../lib/m55/reply/replyPayload.zod";
import ReplyHistoryList from "./ReplyHistoryList";
import ReplyResultView from "./ReplyResultView";
import type { ReplyHistoryItem } from "./replyHistoryTypes";
import {
  PAID_DTR_CONSULT_GROUNDING_COPY,
  PAID_DTR_CONSULT_ROOM_UI,
} from "../../lib/m55/paidDtrProductCopy";

const SESSION_STORAGE_RESULT_KEY = "m55_reply_stub_result_v1";

type SessionApiOk = {
  ok: true;
  reply_session_id: string;
  reply_document_id: string;
  theme: string;
  version: string;
  created_at: string;
  reply_document: ReplyPayloadV11Parsed;
};

function ResultSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true">
      <div className="h-10 bg-foreground/10 rounded-sm border border-border/30" />
      <div className="h-28 bg-foreground/10 rounded-sm border border-border/30" />
      <div className="h-28 bg-foreground/10 rounded-sm border border-border/30" />
      <div className="h-28 bg-foreground/10 rounded-sm border border-border/30" />
    </div>
  );
}

function MessagePanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-sm border border-border/40 bg-foreground/[0.02] px-6 py-12 text-center">
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

export default function ReplyResultPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get("session")?.trim() ?? null;

  const [historyItems, setHistoryItems] = useState<ReplyHistoryItem[] | null>(null);
  const [historyGate, setHistoryGate] = useState<"loading" | "ok" | "401" | "error">("loading");

  const [detail, setDetail] = useState<{
    payload: ReplyPayloadV11Parsed;
    theme: string;
    createdAtIso: string | null;
  } | null>(null);
  const [detailGate, setDetailGate] = useState<
    "idle" | "loading" | "ok" | "401" | "404" | "error"
  >("idle");

  const loadHistory = useCallback(async () => {
    setHistoryGate("loading");
    try {
      const res = await fetch("/api/reply/history", { credentials: "include" });
      if (res.status === 401) {
        setHistoryGate("401");
        return;
      }
      if (!res.ok) {
        setHistoryGate("error");
        return;
      }
      const body = (await res.json()) as { ok?: boolean; items?: ReplyHistoryItem[] };
      if (!body.ok || !Array.isArray(body.items)) {
        setHistoryGate("error");
        return;
      }
      setHistoryItems(body.items);
      setHistoryGate("ok");
    } catch {
      setHistoryGate("error");
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!sessionParam) {
      setDetail(null);
      setDetailGate("idle");
      return;
    }

    const sessionId = sessionParam;
    let cancelled = false;

    const tryCache = (): boolean => {
      try {
        const raw = sessionStorage.getItem(SESSION_STORAGE_RESULT_KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw) as {
          reply_session_id?: string;
          reply_document?: unknown;
        };
        if (parsed.reply_session_id !== sessionId || !parsed.reply_document) return false;
        const doc = replyPayloadV11Schema.safeParse(parsed.reply_document);
        if (!doc.success) return false;
        if (cancelled) return true;
        setDetail({
          payload: doc.data,
          theme: doc.data.theme,
          createdAtIso: null,
        });
        setDetailGate("ok");
        return true;
      } catch {
        return false;
      }
    };

    async function loadRemote() {
      if (tryCache()) return;

      setDetail(null);
      setDetailGate("loading");
      try {
        const res = await fetch(`/api/reply/session/${encodeURIComponent(sessionId)}`, {
          credentials: "include",
        });
        if (cancelled) return;
        if (res.status === 401) {
          setDetailGate("401");
          return;
        }
        if (res.status === 404) {
          setDetailGate("404");
          return;
        }
        if (!res.ok) {
          setDetailGate("error");
          return;
        }
        const body = (await res.json()) as SessionApiOk | { ok?: false };
        if (!body || (body as SessionApiOk).ok !== true) {
          setDetailGate("error");
          return;
        }
        const ok = body as SessionApiOk;
        setDetail({
          payload: ok.reply_document,
          theme: ok.theme,
          createdAtIso: ok.created_at,
        });
        setDetailGate("ok");
      } catch {
        if (!cancelled) setDetailGate("error");
      }
    }

    void loadRemote();

    return () => {
      cancelled = true;
    };
  }, [sessionParam]);

  const onSelectHistory = (replySessionId: string) => {
    router.push(`/reply/result?session=${encodeURIComponent(replySessionId)}`);
  };

  if (historyGate === "401") {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-3xl mx-auto px-6 py-16">
          <MessagePanel>サインイン後にご利用いただけます</MessagePanel>
        </main>
      </div>
    );
  }

  if (historyGate === "error") {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-3xl mx-auto px-6 py-16">
          <MessagePanel>時間をおいてもう一度お試しください</MessagePanel>
        </main>
      </div>
    );
  }

  const historyLoaded = historyGate === "ok" && historyItems !== null;
  const list = historyItems ?? [];

  const showEmpty = historyLoaded && list.length === 0 && !sessionParam;
  const showPick = historyLoaded && list.length > 0 && !sessionParam;

  const mainForSession =
    sessionParam && detailGate === "loading"
      ? "loading"
      : sessionParam && detailGate === "401"
        ? "401"
        : sessionParam && detailGate === "404"
          ? "404"
          : sessionParam && detailGate === "error"
            ? "error"
            : sessionParam && detailGate === "ok" && detail
              ? "ok"
              : sessionParam
                ? "loading"
                : "none";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-xl font-light tracking-wide text-foreground">
            {PAID_DTR_CONSULT_ROOM_UI.roomTitleJa}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {PAID_DTR_CONSULT_GROUNDING_COPY.titleLine2Ja}。保存された追加読み解きを読み返せます。
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
          <div className="w-full lg:w-72 shrink-0 order-2 lg:order-1">
            {historyGate === "loading" ? (
              <div className="border border-border/40 rounded-sm p-4 animate-pulse h-40 bg-foreground/[0.04]" />
            ) : (
              <ReplyHistoryList
                items={list}
                selectedSessionId={sessionParam}
                onSelect={onSelectHistory}
              />
            )}
          </div>

          <div className="flex-1 min-w-0 order-1 lg:order-2">
            {historyGate === "loading" && !sessionParam ? <ResultSkeleton /> : null}

            {showEmpty ? (
              <MessagePanel>まだ保存された追加読み解きがありません</MessagePanel>
            ) : null}

            {showPick ? (
              <MessagePanel>最近の追加読み解き一覧から、読み返す読み解きをお選びください</MessagePanel>
            ) : null}

            {sessionParam && mainForSession === "loading" ? <ResultSkeleton /> : null}
            {mainForSession === "401" ? (
              <MessagePanel>サインイン後にご利用いただけます</MessagePanel>
            ) : null}
            {mainForSession === "404" ? (
              <MessagePanel>追加読み解きが見つかりません</MessagePanel>
            ) : null}
            {mainForSession === "error" ? (
              <MessagePanel>時間をおいてもう一度お試しください</MessagePanel>
            ) : null}
            {mainForSession === "ok" && detail ? (
              <ReplyResultView
                payload={detail.payload}
                theme={detail.theme}
                createdAtIso={detail.createdAtIso}
              />
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
