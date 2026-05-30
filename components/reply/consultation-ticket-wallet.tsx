"use client"

import {
  PAID_DTR_CONSULT_REPLY,
  PAID_DTR_CONSULT_ROOM_UI,
} from "../../lib/m55/paidDtrProductCopy"

interface ConsultationTicketWalletProps {
  initial_included_count: number
  purchased_count: number
  consumed_count: number
  available_count: number
  /** DB `reply_ticket_wallets.status` */
  status: string
  isLoading?: boolean
  /** Disables main actions (wallet refresh / submit in flight) */
  disableActions?: boolean
  /** Checkout request in flight */
  isCheckoutBusy?: boolean
  checkoutError?: string | null
  /** false when reportInstanceId is missing (do not call checkout API) */
  purchaseCheckoutAllowed?: boolean
  onCreateReply?: () => void
  onPurchase?: () => void
}

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

const TOTAL_CAP = PAID_DTR_CONSULT_REPLY.totalCapPerReport
const PRIMARY_TERM = PAID_DTR_CONSULT_REPLY.primaryTermJa

export function ConsultationTicketWallet({
  initial_included_count,
  purchased_count,
  consumed_count: _consumed,
  available_count,
  status,
  isLoading = false,
  disableActions = false,
  isCheckoutBusy = false,
  checkoutError,
  purchaseCheckoutAllowed = true,
  onCreateReply,
  onPurchase,
}: ConsultationTicketWalletProps) {
  void _consumed
  const totalCount = initial_included_count + purchased_count
  const hasReachedLimit =
    totalCount >= TOTAL_CAP || purchased_count >= PAID_DTR_CONSULT_REPLY.additionalMaxPurchased
  const isWalletActive = status === "active"
  const canPurchase =
    purchaseCheckoutAllowed &&
    isWalletActive &&
    available_count === 0 &&
    !hasReachedLimit &&
    totalCount < TOTAL_CAP &&
    purchased_count < PAID_DTR_CONSULT_REPLY.additionalMaxPurchased

  if (isLoading) {
    return (
      <div className="rounded-sm border border-border/50">
        <div className="flex items-center justify-center gap-3 px-4 py-8">
          <svg
            className="h-5 w-5 shrink-0 animate-spin text-muted-foreground"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm text-muted-foreground">
            {PAID_DTR_CONSULT_ROOM_UI.walletLoadingShortJa}
          </span>
        </div>
      </div>
    )
  }

  if (hasReachedLimit && available_count === 0) {
    return (
      <div className="rounded-sm border border-border/50">
        <div className="space-y-4 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-muted p-2" aria-hidden>
              <span className="block h-4 w-4 text-center text-xs text-muted-foreground">!</span>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-medium text-foreground">{PRIMARY_TERM}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {PAID_DTR_CONSULT_ROOM_UI.walletLimitReachedBodyJa}
              </p>
              <p className="text-xs text-muted-foreground/80 leading-relaxed">
                {PAID_DTR_CONSULT_REPLY.savedReportLinkedShortJa}
              </p>
              <p className="text-xs text-muted-foreground/80 leading-relaxed">
                {PAID_DTR_CONSULT_ROOM_UI.walletLimitReachedHintJa}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (available_count > 0) {
    return (
      <div className="rounded-sm border border-border/50">
        <div className="space-y-4 px-4 py-4">
          <div className="flex items-start gap-3">
            <div
              className="rounded-full bg-foreground/5 p-2 dark:bg-foreground/10"
              aria-hidden
            >
              <span className="block h-4 w-4 text-center text-xs text-foreground/80">+</span>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-sm font-medium text-foreground">{PRIMARY_TERM}</h3>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  残り {available_count}件 / 合計{TOTAL_CAP}件まで
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {PAID_DTR_CONSULT_ROOM_UI.savedReportLinkNoteJa}
              </p>
              <p className="text-xs text-muted-foreground/80 leading-relaxed">
                {PAID_DTR_CONSULT_REPLY.capSummaryJa}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCreateReply}
            className={cx(
              "inline-flex w-full items-center justify-center gap-2 rounded-sm py-3 text-sm font-medium",
              "bg-foreground text-background transition-colors",
              "hover:bg-foreground/90",
              (disableActions || !isWalletActive) && "cursor-not-allowed opacity-50"
            )}
            disabled={disableActions || !isWalletActive}
          >
            {PAID_DTR_CONSULT_ROOM_UI.submitLabelJa}
          </button>
        </div>
      </div>
    )
  }

  if (
    available_count === 0 &&
    !hasReachedLimit &&
    isWalletActive &&
    !purchaseCheckoutAllowed
  ) {
    return (
      <div className="rounded-sm border border-border/50">
        <div className="space-y-4 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-muted p-2" aria-hidden>
              <span className="block h-4 w-4 text-center text-xs text-muted-foreground">!</span>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-medium text-foreground">{PRIMARY_TERM}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {PAID_DTR_CONSULT_ROOM_UI.walletPurchaseReportMissingJa}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (available_count === 0 && !hasReachedLimit && !isWalletActive) {
    return (
      <div className="rounded-sm border border-border/50">
        <div className="space-y-4 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-muted p-2" aria-hidden>
              <span className="block h-4 w-4 text-center text-xs text-muted-foreground">!</span>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-medium text-foreground">{PRIMARY_TERM}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {PAID_DTR_CONSULT_ROOM_UI.walletPurchaseUnavailableJa}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (canPurchase) {
    return (
      <div className="rounded-sm border border-border/50">
        <div className="space-y-4 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-muted p-2" aria-hidden>
              <span className="block h-4 w-4 text-center text-xs text-muted-foreground">¥</span>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-sm font-medium text-foreground">
                  追加{PRIMARY_TERM}
                </h3>
                <span className="shrink-0 text-sm font-medium text-foreground tabular-nums">
                  1件 {PAID_DTR_CONSULT_REPLY.additionalPriceYen}円
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {PAID_DTR_CONSULT_ROOM_UI.walletPurchaseRetryNoteJa}
              </p>
              <p className="text-xs text-muted-foreground/80 leading-relaxed">
                {PAID_DTR_CONSULT_REPLY.capSummaryJa}
              </p>
            </div>
          </div>
          {checkoutError ? (
            <p className="text-sm text-muted-foreground" role="alert">
              {checkoutError}
            </p>
          ) : null}
          <button
            type="button"
            onClick={onPurchase}
            className={cx(
              "inline-flex w-full items-center justify-center gap-2 rounded-sm border border-border/50 py-3 text-sm font-medium",
              "text-foreground transition-colors",
              "hover:border-foreground/20 hover:bg-foreground/5",
              (disableActions || isCheckoutBusy) && "cursor-not-allowed opacity-50"
            )}
            disabled={disableActions || isCheckoutBusy}
          >
            {isCheckoutBusy ? "処理中…" : PAID_DTR_CONSULT_REPLY.additionalPriceLabelJa}
          </button>
        </div>
      </div>
    )
  }

  return null
}
