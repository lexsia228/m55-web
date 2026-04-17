import type { ReplyPayloadV11Parsed } from "../../lib/m55/reply/replyPayload.zod";
import ReplyResultMeta from "./ReplyResultMeta";
import ReplySectionNav, { ReplySectionNavMobile } from "./ReplySectionNav";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function SectionCard({
  id,
  kicker,
  title,
  body,
}: {
  id: string;
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <section
      id={id}
      className={cx(
        "scroll-mt-24 rounded-sm border border-border/45 bg-foreground/[0.02] px-5 py-6",
        "shadow-[0_1px_0_rgba(255,255,255,0.03)]",
      )}
    >
      <p className="text-[10px] font-medium tracking-widest text-muted-foreground/80 uppercase mb-2">
        {kicker}
      </p>
      <h2 className="text-sm font-medium text-foreground/95 mb-3 tracking-wide">{title}</h2>
      <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap">{body}</p>
    </section>
  );
}

export type ReplyResultViewProps = {
  payload: ReplyPayloadV11Parsed;
  theme: string;
  createdAtIso?: string | null;
};

export default function ReplyResultView({
  payload,
  theme,
  createdAtIso,
}: ReplyResultViewProps) {
  return (
    <div className="flex gap-8 items-start">
      <ReplySectionNav />
      <div className="flex-1 min-w-0">
        <ReplyResultMeta
          theme={theme}
          createdAtIso={createdAtIso}
          payload={payload}
        />
        <ReplySectionNavMobile />
        <div className="space-y-4">
          <SectionCard
            id="reply-section-issue"
            kicker="論点"
            title="今回の論点"
            body={payload.issue_summary}
          />
          <SectionCard
            id="reply-section-flow"
            kicker="流れ"
            title="今起きている流れ"
            body={payload.current_flow}
          />
          <SectionCard
            id="reply-section-background"
            kicker={`\u50be\u5411`}
            title={`背景にある\u50be\u5411`}
            body={payload.background_tendency}
          />
          <SectionCard
            id="reply-section-load"
            kicker={`\u8ca0\u8377`}
            title={`\u8ca0\u8377が集まる場所`}
            body={payload.load_point}
          />
          <SectionCard
            id="reply-section-first"
            kicker="手順"
            title="先に整えること"
            body={payload.first_step}
          />
          <SectionCard
            id="reply-section-next"
            kicker="問い"
            title="次に深掘りできる問い"
            body={payload.next_question}
          />
        </div>

        {payload.caution_note ? (
          <aside className="mt-6 rounded-sm border border-border/35 bg-foreground/[0.03] px-5 py-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/75 mb-2">
              留意点
            </p>
            <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
              {payload.caution_note}
            </p>
          </aside>
        ) : null}

        {payload.followup_prompts && payload.followup_prompts.length > 0 ? (
          <div className="mt-8 pt-6 border-t border-border/35">
            <p className="text-xs text-muted-foreground/90 mb-3 tracking-wide">
              {`次の入力の\u5019\u88dc`}
            </p>
            <ul className="space-y-2">
              {payload.followup_prompts.map((line, i) => (
                <li
                  key={`${i}-${line.slice(0, 12)}`}
                  className="text-sm text-foreground/75 border-l-2 border-border/50 pl-4 py-0.5"
                >
                  {line}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
