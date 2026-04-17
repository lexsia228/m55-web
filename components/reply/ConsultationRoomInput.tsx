"use client"

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

type Theme = "仕事" | "人間関係" | "疲れやすさ" | "判断の迷い" | "自分の整え方" | "距離感"

type SupplementaryQuestion = {
  id: string
  label: string
}

const THEMES: Theme[] = ["仕事", "人間関係", "疲れやすさ", "判断の迷い", "自分の整え方", "距離感"]

const SUPPLEMENTARY_QUESTIONS: SupplementaryQuestion[] = [
  { id: "q1", label: "最近、判断を急がされる場面が増えている" },
  { id: "q2", label: "対人関係で消耗を感じることがある" },
  { id: "q3", label: "見通しが立ちにくい状態が続いている" },
  { id: "q4", label: "自分のペースを保ちにくい" },
  { id: "q5", label: "休息が十分に取れていない" },
]

const SESSION_STORAGE_RESULT_KEY = "m55_reply_stub_result_v1"

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function messageForStatus(status: number): string {
  switch (status) {
    case 401:
      return "サインイン後にご利用いただけます"
    case 403:
      return "現在ご利用いただける返書がありません"
    case 400:
      return "入力内容を確認してください"
    case 409:
      return "送信内容が更新されています。もう一度お試しください"
    case 422:
      return "返書の準備に失敗しました。もう一度お試しください"
    case 500:
      return "時間をおいてもう一度お試しください"
    default:
      return "時間をおいてもう一度お試しください"
  }
}

function ThemeChip({ 
  theme, 
  selected, 
  disabled,
  onClick 
}: { 
  theme: Theme
  selected: boolean
  disabled?: boolean
  onClick: () => void 
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "px-4 py-2 text-sm rounded-sm border transition-all duration-200",
        !disabled && "hover:border-foreground/30",
        disabled && "opacity-50 cursor-not-allowed",
        selected 
          ? "border-foreground/50 bg-foreground/5 text-foreground" 
          : "border-border text-muted-foreground hover:text-foreground"
      )}
    >
      {theme}
    </button>
  )
}

function QuestionToggle({ 
  question, 
  selected, 
  disabled,
  onToggle 
}: { 
  question: SupplementaryQuestion
  selected: boolean
  disabled?: boolean
  onToggle: () => void 
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={cx(
        "text-left px-4 py-3 text-sm rounded-sm border transition-all duration-200",
        !disabled && "hover:border-foreground/20",
        disabled && "opacity-50 cursor-not-allowed",
        selected 
          ? "border-foreground/40 bg-foreground/5 text-foreground" 
          : "border-border text-muted-foreground hover:text-foreground/80"
      )}
    >
      {question.label}
    </button>
  )
}

export default function ConsultationRoomInput({
  canGenerateReply = true,
  availableCount = 0,
}: {
  canGenerateReply?: boolean
  availableCount?: number
}) {
  const router = useRouter()
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null)
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())
  const [freeInput, setFreeInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const idempotencyKeyRef = useRef<string | null>(null)

  const toggleQuestion = (id: string) => {
    const newSet = new Set(selectedQuestions)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else if (newSet.size < 3) {
      newSet.add(id)
    }
    setSelectedQuestions(newSet)
  }

  const handleSubmit = async () => {
    if (!selectedTheme || isSubmitting || !canGenerateReply) return

    const idempotencyKey = crypto.randomUUID()
    idempotencyKeyRef.current = idempotencyKey
    setIsSubmitting(true)
    setFeedbackError(null)

    const trimmedFree = freeInput.trim()
    const selectedSubquestions = SUPPLEMENTARY_QUESTIONS.filter((q) =>
      selectedQuestions.has(q.id),
    ).map((q) => q.label)

    const body = {
      theme: selectedTheme,
      input_mode: "guided" as const,
      selected_subquestions: selectedSubquestions,
      free_text: trimmedFree.length > 0 ? trimmedFree : "",
      schema_version: "1.1" as const,
    }

    try {
      const res = await fetch("/api/reply/generate", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(body),
      })

      let data: unknown = null
      try {
        data = await res.json()
      } catch {
        setFeedbackError(messageForStatus(500))
        return
      }

      if (res.ok) {
        const payload = data as { reply_document?: { version?: string } }
        if (payload.reply_document?.version !== "1.1") {
          setFeedbackError("返書の準備に失敗しました。もう一度お試しください")
          return
        }
        try {
          sessionStorage.setItem(SESSION_STORAGE_RESULT_KEY, JSON.stringify(data))
        } catch {
          setFeedbackError("時間をおいてもう一度お試しください")
          return
        }
        const sid =
          typeof (data as { reply_session_id?: string }).reply_session_id === "string"
            ? (data as { reply_session_id: string }).reply_session_id
            : null
        if (sid) {
          router.push(`/reply/result?session=${encodeURIComponent(sid)}`)
        } else {
          router.push("/reply/result")
        }
        return
      }

      setFeedbackError(messageForStatus(res.status))
    } catch {
      setFeedbackError(messageForStatus(500))
    } finally {
      idempotencyKeyRef.current = null
      setIsSubmitting(false)
    }
  }

  const isSubmitDisabled = !selectedTheme || isSubmitting || !canGenerateReply
  const controlsDisabled = isSubmitting

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="max-w-2xl mx-auto px-6 py-8 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-light tracking-wide text-foreground">
              相談返書ルーム
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              見えている傾向を土台に、今回の論点を整理する
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground/70 uppercase tracking-wider">利用状態</span>
            <p className="text-sm text-foreground/80 mt-0.5">
              {canGenerateReply ? `返書 ${availableCount}件利用可能` : "返書 0件"}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="space-y-12">
          {/* Theme Selection */}
          <section>
            <h2 className="text-xs font-medium tracking-wider text-muted-foreground uppercase mb-4">
              テーマを選択
            </h2>
            <div className="flex flex-wrap gap-2">
              {THEMES.map((theme) => (
                <ThemeChip
                  key={theme}
                  theme={theme}
                  selected={selectedTheme === theme}
                  disabled={controlsDisabled}
                  onClick={() => setSelectedTheme(theme)}
                />
              ))}
            </div>
          </section>

          {/* Supplementary Questions */}
          <section>
            <h2 className="text-xs font-medium tracking-wider text-muted-foreground uppercase mb-2">
              補助質問（最大3つ）
            </h2>
            <p className="text-xs text-muted-foreground/70 mb-1">
              当てはまるものがあれば選択してください
            </p>
            <p className="text-xs text-muted-foreground/60 mb-4">
              選択中 {selectedQuestions.size}/3
            </p>
            <div className="grid grid-cols-1 gap-2">
              {SUPPLEMENTARY_QUESTIONS.map((q) => (
                <QuestionToggle
                  key={q.id}
                  question={q}
                  selected={selectedQuestions.has(q.id)}
                  disabled={
                    controlsDisabled ||
                    (!selectedQuestions.has(q.id) && selectedQuestions.size >= 3)
                  }
                  onToggle={() => toggleQuestion(q.id)}
                />
              ))}
            </div>
          </section>

          {/* Free Input */}
          <section>
            <h2 className="text-xs font-medium tracking-wider text-muted-foreground uppercase mb-4">
              自由入力
            </h2>
            <textarea
              value={freeInput}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setFreeInput(e.target.value)
              }
              disabled={controlsDisabled}
              placeholder="今気になっていること、整理したいことがあればご記入ください"
              className="min-h-[160px] w-full rounded-sm bg-input/50 border border-border/50 px-3 py-3 text-sm focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 placeholder:text-muted-foreground/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </section>

          {!canGenerateReply ? (
            <div className="rounded-sm border border-border/60 bg-muted/20 px-4 py-3">
              <p className="text-sm text-muted-foreground" role="status">
                現在ご利用いただける返書がありません
              </p>
              <a
                href="/dtr/lp"
                className="mt-2 inline-block text-sm text-foreground/80 underline underline-offset-2 hover:text-foreground"
              >
                利用プランを確認する
              </a>
            </div>
          ) : null}

          {feedbackError ? (
            <p className="text-sm text-muted-foreground" role="alert">
              {feedbackError}
            </p>
          ) : null}
          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className={cx(
              "w-full py-4 rounded-sm text-sm font-medium tracking-wide transition-all duration-200",
              isSubmitDisabled
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-foreground text-background hover:bg-foreground/90"
            )}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                作成中
              </span>
            ) : (
              "返書を作成する"
            )}
          </button>
        </div>
      </main>
    </div>
  )
}
