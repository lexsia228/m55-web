const SECTIONS = [
  { id: "reply-section-issue", label: "今回の論点" },
  { id: "reply-section-flow", label: "今起きている流れ" },
  { id: "reply-section-background", label: `背景にある\u50be\u5411` },
  { id: "reply-section-load", label: `\u8ca0\u8377が集まる場所` },
  { id: "reply-section-first", label: "先に整えること" },
  { id: "reply-section-next", label: "次に深掘りできる問い" },
] as const;

function scrollToId(id: string) {
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function ReplySectionNav() {
  return (
    <nav
      aria-label="追加読み解きの見出し"
      className="hidden lg:block w-44 shrink-0 border border-border/40 rounded-sm bg-foreground/[0.02] p-3 h-fit sticky top-6"
    >
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 mb-3 px-1">
        移動
      </p>
      <ul className="space-y-1">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => scrollToId(s.id)}
              className="w-full text-left text-xs text-muted-foreground hover:text-foreground/90 py-1.5 px-1 rounded-sm transition-colors border border-transparent hover:border-border/30"
            >
              {s.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function ReplySectionNavMobile() {
  return (
    <nav
      aria-label="追加読み解きの見出し（モバイル）"
      className="lg:hidden -mx-1 mb-6 overflow-x-auto pb-1"
    >
      <div className="flex gap-2 min-w-min px-1">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => scrollToId(s.id)}
            className="shrink-0 text-xs text-muted-foreground border border-border/40 rounded-sm px-3 py-2 whitespace-nowrap bg-foreground/[0.02] hover:border-foreground/20 hover:text-foreground/90 transition-colors"
          >
            {s.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
