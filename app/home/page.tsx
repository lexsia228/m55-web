"use client";

import Link from "next/link";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

// Tab navigation config
const TABS = [
  { href: "/home", label: "ホーム" },
  { href: "/core", label: "本質" },
  { href: "/report", label: "レポート" },
  { href: "/my", label: "マイページ" },
] as const;

// Five Elements for the ring chart
const FIVE_ELEMENTS = [
  { key: "wood", color: "#5d7c5d", angle: 0 },
  { key: "fire", color: "#b85c5c", angle: 72 },
  { key: "earth", color: "#c9a857", angle: 144 },
  { key: "metal", color: "#8b8b8b", angle: 216 },
  { key: "water", color: "#5c7b9c", angle: 288 },
];

// Five Element Ring Chart - quiet supporting visual
function FiveElementRing() {
  const size = 120;
  const center = size / 2;
  const radius = 40;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="opacity-60"
      aria-hidden="true"
    >
      <circle
        cx={center}
        cy={center}
        r={radius + 8}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth="1"
      />
      {FIVE_ELEMENTS.map((el, i) => {
        const nextEl = FIVE_ELEMENTS[(i + 1) % 5];
        const x1 = center + radius * Math.cos((el.angle - 90) * Math.PI / 180);
        const y1 = center + radius * Math.sin((el.angle - 90) * Math.PI / 180);
        const x2 = center + radius * Math.cos((nextEl.angle - 90) * Math.PI / 180);
        const y2 = center + radius * Math.sin((nextEl.angle - 90) * Math.PI / 180);
        return (
          <line
            key={`line-${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="hsl(var(--border))"
            strokeWidth="1"
            opacity="0.3"
          />
        );
      })}
      {FIVE_ELEMENTS.map((el) => {
        const x = center + radius * Math.cos((el.angle - 90) * Math.PI / 180);
        const y = center + radius * Math.sin((el.angle - 90) * Math.PI / 180);
        return (
          <circle
            key={el.key}
            cx={x}
            cy={y}
            r={12}
            fill={el.color}
            opacity="0.7"
          />
        );
      })}
      <circle
        cx={center}
        cy={center}
        r={3}
        fill="hsl(var(--primary))"
        opacity="0.4"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FOLD 1: Hero + Input Gate (DOMINANT - unmistakable entry point)
// ═══════════════════════════════════════════════════════════════════

function HeroFold() {
  return (
    <section className="pt-12 pb-10">
      {/* Hero message - LARGE, serif, commanding presence */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-serif text-foreground mb-5 text-balance leading-tight tracking-tight">
          [HOME_HERO_TITLE]
        </h1>
        <p className="text-lg text-foreground/80 leading-relaxed max-w-sm mx-auto mb-3">
          [HOME_HERO_DESC]
        </p>
        <p className="text-sm text-muted-foreground/70">
          [HOME_SUPPORTING_LINE]
        </p>
      </div>

      {/* What this site is - compact support strip */}
      <div className="bg-secondary/30 rounded-lg px-4 py-3 mb-8">
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          [WHAT_THIS_SITE_IS]
        </p>
      </div>

      {/* Input Gate - PROMINENT card, the primary action point */}
      <div className="bg-card border-2 border-primary/20 rounded-2xl p-7 shadow-md">
        <h2 className="text-xl font-medium text-foreground mb-2 text-center">
          [INPUT_GATE_TITLE]
        </h2>
        <p className="text-xs text-muted-foreground text-center mb-6">
          [WHY_PRESS_THE_BUTTON]
        </p>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs text-muted-foreground mb-2 font-medium">
              ニックネーム
            </label>
            <div className="w-full px-4 py-3.5 bg-background border-2 border-border rounded-xl text-sm text-muted-foreground">
              [NICKNAME_FIELD]
            </div>
          </div>
          
          <div>
            <label className="block text-xs text-muted-foreground mb-2 font-medium">
              生年月日
            </label>
            <div className="w-full px-4 py-3.5 bg-background border-2 border-border rounded-xl text-sm text-muted-foreground">
              [BIRTHDATE_FIELD]
            </div>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground/70 text-center mb-6 leading-relaxed">
          [INPUT_GATE_EXPLAINER]
        </p>
        
        <button
          type="button"
          className="w-full py-4 bg-primary text-primary-foreground text-base font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm"
        >
          [INPUT_GATE_CTA]
        </button>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FOLD 2: Instant Preview Board (PERSONAL, specific, substantial)
// ═══════════════════════════════════════════════════════════════════

function InstantPreviewFold() {
  return (
    <section className="py-10 border-t border-border/40">
      {/* Section header with explanatory note */}
      <div className="mb-6">
        <p className="text-xs text-primary/80 uppercase tracking-widest mb-2 text-center font-medium">
          あなたの本質
        </p>
        <p className="text-xs text-muted-foreground/60 text-center">
          [WHAT_BECOMES_VISIBLE]
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        {/* Identity header - larger, more personal */}
        <div className="flex items-start gap-5 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20 flex items-center justify-center shrink-0">
            <span className="text-lg text-primary font-medium">[SYMBOL]</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1.5">[PUBLIC_TITLE]</p>
            <p className="text-2xl font-medium text-foreground leading-snug tracking-tight">[DISPLAY_ONE_LINE]</p>
          </div>
        </div>

        {/* Essence summary - substantial */}
        <p className="text-base text-foreground/80 leading-relaxed mb-6">
          [ESSENCE_SUMMARY_SHORT]
        </p>

        {/* Keywords - visible tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-full font-medium">
            [KEYWORD_1]
          </span>
          <span className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-full font-medium">
            [KEYWORD_2]
          </span>
          <span className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-full font-medium">
            [KEYWORD_3]
          </span>
        </div>

        {/* Primary title highlight - visible, informative */}
        <div className="pt-5 border-t border-border">
          <p className="text-lg font-medium text-foreground mb-2">[PRIMARY_TITLE_SLOT]</p>
          <p className="text-sm text-muted-foreground/70 leading-relaxed">[TITLE_SYSTEM_NOTE]</p>
        </div>

        {/* Identity support notes */}
        <div className="mt-5 pt-4 border-t border-border/50 space-y-2">
          <p className="text-xs text-muted-foreground/60 leading-relaxed">[IDENTITY_SUPPORT_1]</p>
          <p className="text-xs text-muted-foreground/60 leading-relaxed">[IDENTITY_SUPPORT_2]</p>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FOLD 3: Free-Result Sample Shelf (SUBSTANTIAL, not decorative)
// ═══════════════════════════════════════════════════════════════════

function FreeResultShelf() {
  return (
    <section className="py-8">
      {/* Free surface note */}
      <div className="bg-secondary/20 rounded-lg px-4 py-2.5 mb-6">
        <p className="text-xs text-muted-foreground text-center">
          [FREE_SURFACE_NOTE]
        </p>
      </div>

      {/* Chart - supporting visual */}
      <div className="bg-secondary/10 border border-border/40 rounded-xl p-5 mb-6">
        <div className="flex gap-5 items-start">
          <div className="shrink-0">
            <FiveElementRing />
          </div>
          
          <div className="flex flex-col gap-2 py-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5d7c5d]" />
              <span className="text-xs text-muted-foreground">[WOOD_LABEL]</span>
              <span className="text-xs text-foreground/60 ml-auto tabular-nums">[WOOD_WEIGHT]</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#b85c5c]" />
              <span className="text-xs text-muted-foreground">[FIRE_LABEL]</span>
              <span className="text-xs text-foreground/60 ml-auto tabular-nums">[FIRE_WEIGHT]</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#c9a857]" />
              <span className="text-xs text-muted-foreground">[EARTH_LABEL]</span>
              <span className="text-xs text-foreground/60 ml-auto tabular-nums">[EARTH_WEIGHT]</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8b8b8b]" />
              <span className="text-xs text-muted-foreground">[METAL_LABEL]</span>
              <span className="text-xs text-foreground/60 ml-auto tabular-nums">[METAL_WEIGHT]</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5c7b9c]" />
              <span className="text-xs text-muted-foreground">[WATER_LABEL]</span>
              <span className="text-xs text-foreground/60 ml-auto tabular-nums">[WATER_WEIGHT]</span>
            </div>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground/60 leading-relaxed mt-4 pt-3 border-t border-border/30">
          [FIVE_ELEMENT_NOTE]
        </p>
      </div>

      {/* Current Focus - informative but secondary */}
      <div className="bg-card border border-border rounded-xl p-5 mb-5">
        <p className="text-xs text-primary/70 uppercase tracking-wider mb-2 font-medium">[CURRENT_FOCUS_TITLE]</p>
        <p className="text-base text-foreground/80 leading-relaxed">
          [CURRENT_FOCUS_SUMMARY]
        </p>
      </div>

      {/* Today/Weekly shelves - horizontal, informative */}
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-5 px-5">
        <div className="shrink-0 w-44 bg-card border border-border/60 rounded-xl p-4">
          <p className="text-xs text-muted-foreground/70 uppercase tracking-wider mb-2 font-medium">[TODAY_HEADING]</p>
          <p className="text-sm text-foreground leading-snug mb-3">
            [TODAY_SUMMARY_SHORT]
          </p>
          <p className="text-xs text-muted-foreground/60 leading-relaxed">
            [TODAY_SUPPORT_LINE]
          </p>
        </div>

        <div className="shrink-0 w-44 bg-card border border-border/60 rounded-xl p-4">
          <p className="text-xs text-muted-foreground/70 uppercase tracking-wider mb-2 font-medium">[WEEKLY_HEADING]</p>
          <p className="text-sm text-foreground leading-snug mb-3">
            [WEEKLY_KEY]
          </p>
          <p className="text-xs text-muted-foreground/60 leading-relaxed">
            [WEEKLY_SUPPORT_LINE]
          </p>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FOLD 4: System Rule Explanation (quiet, explanatory)
// ═══════════════════════════════════════════════════════════════════

function SystemRuleFold() {
  return (
    <section className="py-8 border-t border-border/30">
      <p className="text-xs text-muted-foreground/50 uppercase tracking-wider mb-4 text-center font-medium">
        このサービスについて
      </p>
      <div className="space-y-3 text-center max-w-xs mx-auto">
        <p className="text-xs text-muted-foreground/50 leading-relaxed">
          [SYSTEM_RULE_1]
        </p>
        <p className="text-xs text-muted-foreground/50 leading-relaxed">
          [SYSTEM_RULE_2]
        </p>
        <p className="text-xs text-muted-foreground/50 leading-relaxed">
          [SYSTEM_RULE_3]
        </p>
        <p className="text-xs text-muted-foreground/50 leading-relaxed">
          [SYSTEM_RULE_4]
        </p>
        <p className="text-xs text-muted-foreground/50 leading-relaxed">
          [SYSTEM_RULE_5]
        </p>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FOLD 5: Entry Report (STRONGEST LOWER-FOLD HERO)
// ═══════════════════════════════════════════════════════════════════

function EntryReportFold() {
  return (
    <section className="py-10 border-t border-border/30">
      {/* Section label */}
      <p className="text-xs text-primary uppercase tracking-widest mb-6 text-center font-semibold">
        有料レポート
      </p>

      {/* Value bridge - STRONGEST visual presence */}
      <div className="bg-gradient-to-b from-primary/8 via-primary/12 to-primary/8 border-2 border-primary/30 rounded-2xl p-8 shadow-lg">
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground mb-2">[ENTRY_REPORT_LABEL]</p>
          <p className="text-4xl font-semibold text-foreground tracking-tight">
            [ENTRY_REPORT_PRICE]
          </p>
        </div>

        {/* Depth note - what makes this richer */}
        <div className="bg-background/60 rounded-lg px-4 py-3 mb-6">
          <p className="text-xs text-foreground/70 text-center leading-relaxed">
            [ENTRY_REPORT_DEPTH_NOTE]
          </p>
        </div>
        
        <ul className="space-y-4 mb-8">
          <li className="text-base text-foreground/90 flex items-start gap-4">
            <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
            [ENTRY_REPORT_FEATURE_1]
          </li>
          <li className="text-base text-foreground/90 flex items-start gap-4">
            <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
            [ENTRY_REPORT_FEATURE_2]
          </li>
          <li className="text-base text-foreground/90 flex items-start gap-4">
            <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
            [ENTRY_REPORT_FEATURE_3]
          </li>
        </ul>
        
        <Link
          href="/report"
          className="block w-full py-4 bg-primary text-primary-foreground text-center text-base font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-md"
        >
          [ENTRY_REPORT_CTA]
        </Link>
      </div>

      {/* Blurred teaser - preview of deeper structure (BLUR ONLY HERE) */}
      <div className="mt-6 bg-card border border-border rounded-xl p-6">
        <p className="text-xs text-muted-foreground/70 font-medium mb-4 text-center">収録内容プレビュー</p>
        <div className="space-y-3 mb-5">
          <div className="flex items-center gap-3 bg-secondary/20 rounded-lg px-4 py-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
            <span className="text-sm text-foreground/50 blur-[4px] select-none flex-1">[CHAPTER_TITLE_1]</span>
          </div>
          <div className="flex items-center gap-3 bg-secondary/20 rounded-lg px-4 py-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
            <span className="text-sm text-foreground/50 blur-[4px] select-none flex-1">[CHAPTER_TITLE_2]</span>
          </div>
          <div className="flex items-center gap-3 bg-secondary/20 rounded-lg px-4 py-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
            <span className="text-sm text-foreground/50 blur-[4px] select-none flex-1">[CHAPTER_TITLE_3]</span>
          </div>
          <div className="flex items-center gap-3 bg-secondary/20 rounded-lg px-4 py-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
            <span className="text-sm text-foreground/50 blur-[4px] select-none flex-1">[CHAPTER_TITLE_4]</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground/50 text-center leading-relaxed">
          [ENTRY_REPORT_VALUE_GAP_NOTE]
        </p>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FOLD 6: Trust Footer (quiet but credible)
// ═══════════════════════════════════════════════════════════════════

function TrustFooter() {
  return (
    <footer className="py-8 border-t border-border/20">
      <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground/60 mb-4">
        <Link href="/support" className="hover:text-foreground/80 transition-colors underline-offset-4 hover:underline">
          [SUPPORT_LINK]
        </Link>
        <Link href="/legal/refund" className="hover:text-foreground/80 transition-colors underline-offset-4 hover:underline">
          [REFUND_LINK]
        </Link>
        <Link href="/legal/tokushoho" className="hover:text-foreground/80 transition-colors underline-offset-4 hover:underline">
          [LEGAL_LINKS]
        </Link>
      </nav>
      <p className="text-xs text-muted-foreground/40 text-center">
        M55
      </p>
    </footer>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PAGE COMPOSITION
// ═══════════════════════════════════════════════════════════════════

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Tab Navigation - sticky, minimal */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="max-w-lg mx-auto px-5 py-3 flex items-center justify-between">
          <nav className="flex gap-1" aria-label="メインナビゲーション">
            {TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  tab.href === "/home"
                    ? "bg-secondary text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
          
          <div className="flex items-center">
            <SignedOut>
              <SignInButton mode="redirect">
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ログイン
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-5">
        {/* 1. Quiet hero + 2. Input gate */}
        <HeroFold />

        {/* 3. Instant preview board */}
        <InstantPreviewFold />

        {/* 4. Free-result sample shelf */}
        <FreeResultShelf />

        {/* 5. System rule explanation */}
        <SystemRuleFold />

        {/* 6. Entry Report value bridge + 7. Blurred teaser */}
        <EntryReportFold />

        {/* 8. Quiet trust footer */}
        <TrustFooter />
      </main>
    </div>
  );
}
