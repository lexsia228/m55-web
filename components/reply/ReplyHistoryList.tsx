import type { ReplyHistoryItem } from "./replyHistoryTypes";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ja-JP", { dateStyle: "medium" });
  } catch {
    return "—";
  }
}

export type ReplyHistoryListProps = {
  items: ReplyHistoryItem[];
  selectedSessionId: string | null;
  onSelect: (replySessionId: string) => void;
};

export default function ReplyHistoryList({
  items,
  selectedSessionId,
  onSelect,
}: ReplyHistoryListProps) {
  return (
    <aside className="border border-border/40 rounded-sm bg-foreground/[0.02] p-4 lg:p-5">
      <h2 className="text-xs font-medium tracking-wider text-muted-foreground uppercase mb-4">
        最近の追加読み解き
      </h2>
      <ul className="space-y-2">
        {items.map((item) => {
          const selected = selectedSessionId === item.reply_session_id;
          return (
            <li key={item.reply_session_id}>
              <button
                type="button"
                onClick={() => onSelect(item.reply_session_id)}
                className={cx(
                  "w-full text-left rounded-sm border px-3 py-3 transition-colors",
                  selected
                    ? "border-foreground/25 bg-foreground/[0.06]"
                    : "border-border/40 hover:border-foreground/15 bg-transparent",
                )}
              >
                <p className="text-sm font-medium text-foreground/90">{item.theme}</p>
                <p className="text-xs text-muted-foreground/90 mt-1 line-clamp-2 leading-snug">
                  {item.issue_summary}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-2">
                  {formatDate(item.created_at)}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
