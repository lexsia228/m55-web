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
    <section className="pt-10 pb-8">
      {/* Hero message - calm, welcoming */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-serif text-foreground mb-4 text-balance leading-snug tracking-tight">
          [HOME_HERO_TITLE]
        </h1>
        <p className="text-base text-foreground/80 leading-relaxed max-w-xs mx-auto">
          [HOME_HERO_DESC]
        </p>
      </div>

      {/* What this site is - explanatory strip */}
      <div className="bg-secondary/40 rounded-xl px-5 py-4 mb-6">
        <p className="text-sm text-foreground/70 text-center leading-relaxed mb-2">
          [WHAT_THIS_SITE_IS]
        </p>
        <p className="text-xs text-muted-foreground/60 text-center leading-relaxed">
          [HOME_SUPPORTING_LINE]
        </p>
      </div>

      {/* Input Gate - warm, inviting card */}
      <div className="bg-gradient-to-b from-card to-secondary/20 border border-primary/15 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-medium text-foreground mb-1 text-center">
          [INPUT_GATE_TITLE]
        </h2>
        <p className="text-xs text-muted-foreground/70 text-center mb-5 leading-relaxed">
          [WHY_PRESS_THE_BUTTON]
        </p>
        
        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-xs text-muted-foreground/80 mb-1.5">
              ニックネーム
            </label>
            <div className="w-full px-4 py-3 bg-background border border-border/80 rounded-xl text-sm text-muted-foreground/60">
              [NICKNAME_FIELD]
            </div>
          </div>
          
          <div>
            <label className="block text-xs text-muted-foreground/80 mb-1.5">
              生年月日
            </label>
            <div className="w-full px-4 py-3 bg-background border border-border/80 rounded-xl text-sm text-muted-foreground/60">
              [BIRTHDATE_FIELD]
            </div>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground/60 text-center mb-5 leading-relaxed">
          [INPUT_GATE_EXPLAINER]
        </p>
        
        <button
          type="button"
          className="w-full py-3.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          [INPUT_GATE_CTA]
        </button>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FRAMEWORK STRIP (authority without fake science)
// ═══════════════════════════════════════════════════════════════════

function FrameworkStrip() {
  return (
    <section className="py-6 border-t border-border/20">
      <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-4 text-center font-medium">
        [FRAMEWORK_LABEL]
      </p>
      <div className="flex gap-3 justify-center">
        <div className="flex-1 max-w-[100px] text-center">
          <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-secondary/50 flex items-center justify-center">
            <span className="text-xs text-muted-foreground/70">1</span>
          </div>
          <p className="text-xs text-muted-foreground/60 leading-snug">
            [FRAMEWORK_STEP_1]
          </p>
        </div>
        <div className="flex-1 max-w-[100px] text-center">
          <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-secondary/50 flex items-center justify-center">
            <span className="text-xs text-muted-foreground/70">2</span>
          </div>
          <p className="text-xs text-muted-foreground/60 leading-snug">
            [FRAMEWORK_STEP_2]
          </p>
        </div>
        <div className="flex-1 max-w-[100px] text-center">
          <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-secondary/50 flex items-center justify-center">
            <span className="text-xs text-muted-foreground/70">3</span>
          </div>
          <p className="text-xs text-muted-foreground/60 leading-snug">
            [FRAMEWORK_STEP_3]
          </p>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FOLD 2: Instant Preview Board (PERSONAL, specific, substantial)
// ═══════════════════════════════════════════════════════════════════

function InstantPreviewFold() {
  return (
    <section className="py-8 border-t border-border/30">
      {/* Section header with explanatory note */}
      <div className="mb-5">
        <p className="text-xs text-primary/70 uppercase tracking-widest mb-1.5 text-center font-medium">
          あなたの本質
        </p>
        <p className="text-sm text-muted-foreground/70 text-center leading-relaxed">
          [WHAT_BECOMES_VISIBLE]
        </p>
      </div>

      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm">
        {/* Identity header - personal, warm */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-secondary to-primary/10 border border-border flex items-center justify-center shrink-0">
            <span className="text-base text-primary font-medium">[SYMBOL]</span>
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-xs text-muted-foreground/60 mb-1">[PUBLIC_TITLE]</p>
            <p className="text-xl font-medium text-foreground leading-snug">[DISPLAY_ONE_LINE]</p>
          </div>
        </div>

        {/* Essence summary - readable */}
        <p className="text-sm text-foreground/75 leading-relaxed mb-5">
          [ESSENCE_SUMMARY_SHORT]
        </p>

        {/* Keywords - compact tags */}
        <div className="flex flex-wrap gap-2 mb-5">
          <span className="px-3 py-1.5 text-xs bg-secondary text-secondary-foreground rounded-full">
            [KEYWORD_1]
          </span>
          <span className="px-3 py-1.5 text-xs bg-secondary text-secondary-foreground rounded-full">
            [KEYWORD_2]
          </span>
          <span className="px-3 py-1.5 text-xs bg-secondary text-secondary-foreground rounded-full">
            [KEYWORD_3]
          </span>
        </div>

        {/* Primary title highlight */}
        <div className="pt-4 border-t border-border/50">
          <p className="text-base font-medium text-foreground mb-1.5">[PRIMARY_TITLE_SLOT]</p>
          <p className="text-xs text-muted-foreground/60 leading-relaxed">[TITLE_SYSTEM_NOTE]</p>
        </div>

        {/* Identity support notes */}
        <div className="mt-4 pt-3 border-t border-border/30 space-y-1.5">
          <p className="text-xs text-muted-foreground/50 leading-relaxed">[IDENTITY_SUPPORT_1]</p>
          <p className="text-xs text-muted-foreground/50 leading-relaxed">[IDENTITY_SUPPORT_2]</p>
        </div>
      </div>

      {/* Free surface note - below the card */}
      <p className="text-xs text-muted-foreground/50 text-center mt-4 leading-relaxed">
        [FREE_SURFACE_NOTE]
      </p>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FOLD 3: Free-Result Sample Shelf (SUBSTANTIAL, not decorative)
// ═══════════════════════════════════════════════════════════════════

function FreeResultShelf() {
  return (
    <section className="py-6">
      {/* Chart - supporting visual */}
      <div className="bg-secondary/20 border border-border/30 rounded-xl p-5 mb-5">
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
        
        <div className="mt-4 pt-3 border-t border-border/20 space-y-1.5">
          <p className="text-xs text-muted-foreground/50 leading-relaxed">
            [FIVE_ELEMENT_NOTE]
          </p>
          <p className="text-xs text-muted-foreground/40 leading-relaxed">
            [FIVE_ELEMENT_NOTE_2]
          </p>
        </div>
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
    <section className="py-10 border-t border-border/40">
      {/* Section label */}
      <p className="text-xs text-primary uppercase tracking-widest mb-5 text-center font-semibold">
        有料レポート
      </p>

      {/* Value bridge - STRONGEST visual presence on page */}
      <div className="bg-gradient-to-b from-primary/5 via-primary/10 to-primary/5 border-2 border-primary/25 rounded-2xl p-7 shadow-md">
        <div className="text-center mb-5">
          <p className="text-sm text-muted-foreground/80 mb-1.5">[ENTRY_REPORT_LABEL]</p>
          <p className="text-4xl font-semibold text-foreground tracking-tight">
            [ENTRY_REPORT_PRICE]
          </p>
        </div>

        {/* Depth note - what makes this richer */}
        <div className="bg-background/70 rounded-xl px-4 py-3 mb-5">
          <p className="text-sm text-foreground/70 text-center leading-relaxed">
            [ENTRY_REPORT_DEPTH_NOTE]
          </p>
        </div>
        
        <ul className="space-y-3 mb-6">
          <li className="text-sm text-foreground/85 flex items-start gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
            [ENTRY_REPORT_FEATURE_1]
          </li>
          <li className="text-sm text-foreground/85 flex items-start gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
            [ENTRY_REPORT_FEATURE_2]
          </li>
          <li className="text-sm text-foreground/85 flex items-start gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
            [ENTRY_REPORT_FEATURE_3]
          </li>
        </ul>
        
        <Link
          href="/report"
          className="block w-full py-3.5 bg-primary text-primary-foreground text-center text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm"
        >
          [ENTRY_REPORT_CTA]
        </Link>
      </div>

      {/* Blurred teaser - preview of deeper structure (BLUR ONLY HERE) */}
      <div className="mt-5 bg-card border border-border/60 rounded-xl p-5">
        <p className="text-xs text-muted-foreground/60 font-medium mb-3 text-center">収録内容プレビュー</p>
        <div className="space-y-2.5 mb-4">
          <div className="flex items-center gap-3 bg-secondary/30 rounded-lg px-3 py-2">
            <span className="w-1 h-1 rounded-full bg-primary/40" />
            <span className="text-xs text-foreground/40 blur-[3px] select-none flex-1">[CHAPTER_TITLE_1]</span>
          </div>
          <div className="flex items-center gap-3 bg-secondary/30 rounded-lg px-3 py-2">
            <span className="w-1 h-1 rounded-full bg-primary/40" />
            <span className="text-xs text-foreground/40 blur-[3px] select-none flex-1">[CHAPTER_TITLE_2]</span>
          </div>
          <div className="flex items-center gap-3 bg-secondary/30 rounded-lg px-3 py-2">
            <span className="w-1 h-1 rounded-full bg-primary/40" />
            <span className="text-xs text-foreground/40 blur-[3px] select-none flex-1">[CHAPTER_TITLE_3]</span>
          </div>
          <div className="flex items-center gap-3 bg-secondary/30 rounded-lg px-3 py-2">
            <span className="w-1 h-1 rounded-full bg-primary/40" />
            <span className="text-xs text-foreground/40 blur-[3px] select-none flex-1">[CHAPTER_TITLE_4]</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground/40 text-center leading-relaxed">
          [ENTRY_REPORT_VALUE_GAP_NOTE]
        </p>
      </div>

      {/* Narrative breadcrumbs - next unlock hint without gamification */}
      <div className="mt-5 bg-secondary/20 rounded-xl px-4 py-4">
        <p className="text-xs text-muted-foreground/60 text-center leading-relaxed mb-2">
          [NEXT_REVEAL_HINT]
        </p>
        <p className="text-xs text-muted-foreground/40 text-center leading-relaxed">
          [CHAPTER_PREVIEW_NOTE]
        </p>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// OPERATIONAL TRUST STRIP (trust without fake proof)
// ═══════════════════════════════════════════════════════════════════

function OperationalTrustStrip() {
  return (
    <section className="py-5 border-t border-border/15">
      <div className="flex justify-center gap-6 text-xs text-muted-foreground/40">
        <span>[ARTIFACT_VERSION_LABEL]</span>
        <span>[LAST_UPDATED_LABEL]</span>
      </div>
      <p className="text-xs text-muted-foreground/30 text-center mt-2 leading-relaxed">
        [SUPPORT_CLARITY_NOTE]
      </p>
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

        {/* Framework strip - how M55 reads and organizes */}
        <FrameworkStrip />

        {/* 3. Instant preview board */}
        <InstantPreviewFold />

        {/* 4. Free-result sample shelf */}
        <FreeResultShelf />

        {/* 5. System rule explanation */}
        <SystemRuleFold />

        {/* 6. Entry Report value bridge + 7. Blurred teaser + Narrative breadcrumbs */}
        <EntryReportFold />

        {/* Operational trust strip */}
        <OperationalTrustStrip />

        {/* 8. Quiet trust footer */}
        <TrustFooter />
      </main>
    </div>
  );
}
