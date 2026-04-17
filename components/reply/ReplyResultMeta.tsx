import type { ReplyPayloadV11Parsed } from "../../lib/m55/reply/replyPayload.zod";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export type ReplyResultMetaProps = {
  theme: string;
  /** ISO 8601、無い場合は日時行を出さない */
  createdAtIso?: string | null;
  payload: ReplyPayloadV11Parsed;
};

function formatSavedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString("ja-JP", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return null;
  }
}

export default function ReplyResultMeta({
  theme,
  createdAtIso,
  payload,
}: ReplyResultMetaProps) {
  const displayTheme = theme || payload.theme;
  const savedLine = createdAtIso ? formatSavedAt(createdAtIso) : null;

  return (
    <div className="border-b border-border/40 pb-6 mb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase mb-2">
            テーマ
          </p>
          <h1 className="text-xl font-light tracking-wide text-foreground">{displayTheme}</h1>
        </div>
        <div className="text-right space-y-1">
          <span
            className={cx(
              "inline-block text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm",
              "border border-border/60 text-muted-foreground/90 bg-foreground/[0.03]",
            )}
          >
            保存済み
          </span>
          {savedLine ? (
            <p className="text-xs text-muted-foreground/80 mt-2">{savedLine}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
