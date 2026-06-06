"use client"

import {
  PAID_DTR_CONSULT_ENTRY_NEUTRAL,
  PAID_DTR_CONSULT_REPLY,
  PAID_DTR_CONSULT_ROOM_UI,
  PAID_DTR_CONSULT_USAGE_DISPLAY,
  formatConsultUsedCountLine,
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
  onCreateReply?: () => void
}

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

const INTERNAL_CAP = PAID_DTR_CONSULT_REPLY.totalCapPerReport
const PRIMARY_TERM = PAID_DTR_CONSULT_REPLY.primaryTermJa

export function ConsultationTicketWallet({
  initial_included_count,
  purchased_count,
  consumed_count,
  available_count,
  status,
  isLoading = false,
  disableActions = false,
  onCreateReply,
  ..._legacyCheckoutProps
}: ConsultationTicketWalletProps & Record<string, unknown>) {
  void _legacyCheckoutProps
  const totalCount = initial_included_count + purchased_count
  const hasReachedLimit =
    totalCount >= INTERNAL_CAP ||
    purchased_count >= PAID_DTR_CONSULT_REPLY.additionalMaxPurchased
  const isWalletActive = status === "active"

  if (isLoading) {
    return (
      <div className="rounded-sm border border-border/50">
        <div className="flex items-center justify-center gap-3 px-4 py-8">
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
                  {PAID_DTR_CONSULT_ENTRY_NEUTRAL.walletRemainingTemplateJa.replace(
                    "{count}",
                    String(available_count)
                  )}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {PAID_DTR_CONSULT_ROOM_UI.savedReportLinkNoteJa}
              </p>
              <p className="text-xs text-muted-foreground/80 leading-relaxed">
                {formatConsultUsedCountLine(consumed_count)}
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

  if (available_count === 0 && !hasReachedLimit && isWalletActive) {
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
                {PAID_DTR_CONSULT_USAGE_DISPLAY.exhaustedPrimaryJa}
              </p>
              <p className="text-xs text-muted-foreground/80 leading-relaxed">
                {PAID_DTR_CONSULT_ENTRY_NEUTRAL.walletExhaustedJa}
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

  return null
}
