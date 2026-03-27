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
  const size = 140;
  const center = size / 2;
  const radius = 48;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="opacity-70"
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
            opacity="0.4"
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
            r={14}
            fill={el.color}
            opacity="0.75"
          />
        );
      })}
      <circle
        cx={center}
        cy={center}
        r={4}
        fill="hsl(var(--primary))"
        opacity="0.5"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FOLD 1: Hero + Input Gate (dominant, unmistakable entry point)
// ═══════════════════════════════════════════════════════════════════

function HeroFold() {
  return (
    <section className="pt-10 pb-8 text-center">
      {/* Hero message - large, serif, commanding */}
      <h1 className="text-3xl font-serif text-foreground mb-4 text-balance leading-tight">
        [HOME_HERO_TITLE]
      </h1>
      <p className="text-base text-muted-foreground leading-relaxed max-w-xs mx-auto mb-2">
        [HOME_HERO_DESC]
      </p>
      <p className="text-sm text-muted-foreground/70 mb-8">
        [HOME_SUPPORTING_LINE]
      </p>

      {/* Input Gate - prominent card, the action point */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm text-left">
        <h2 className="text-lg font-medium text-foreground mb-5 text-center">
          [INPUT_GATE_TITLE]
        </h2>
        
        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 font-medium">
              ニックネーム
            </label>
            <div className="w-full px-4 py-3 bg-secondary/40 border border-border rounded-lg text-sm text-muted-foreground">
              [NICKNAME_FIELD]
            </div>
          </div>
          
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 font-medium">
              生年月日
            </label>
            <div className="w-full px-4 py-3 bg-secondary/40 border border-border rounded-lg text-sm text-muted-foreground">
              [BIRTHDATE_FIELD]
            </div>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground/80 text-center mb-5 leading-relaxed">
          [INPUT_GATE_EXPLAINER]
        </p>
        
        <button
          type="button"
          className="w-full py-3 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          [INPUT_GATE_CTA]
        </button>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FOLD 2: Instant Preview Board (personal, specific, engaging)
// ═══════════════════════════════════════════════════════════════════

function InstantPreviewFold() {
  return (
    <section className="py-8">
      {/* Section label */}
      <p className="text-xs text-muted-foreground/70 uppercase tracking-wider mb-4 text-center">
        あなたの本質
      </p>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        {/* Identity header */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <span className="text-base text-muted-foreground font-medium">[SYMBOL]</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">[PUBLIC_TITLE]</p>
            <p className="text-xl font-medium text-foreground leading-snug">[DISPLAY_ONE_LINE]</p>
          </div>
        </div>

        {/* Essence summary */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-5">
          [ESSENCE_SUMMARY_SHORT]
        </p>

        {/* Keywords */}
        <div className="flex flex-wrap gap-2 mb-5">
          <span className="px-3 py-1.5 text-xs bg-secondary text-secondary-foreground rounded-full font-medium">
            [KEYWORD_1]
          </span>
          <span className="px-3 py-1.5 text-xs bg-secondary text-secondary-foreground rounded-full font-medium">
            [KEYWORD_2]
          </span>
          <span className="px-3 py-1.5 text-xs bg-secondary text-secondary-foreground rounded-full font-medium">
            [KEYWORD_3]
          </span>
        </div>

        {/* Primary title highlight */}
        <div className="pt-4 border-t border-border">
          <p className="text-base font-medium text-foreground mb-1">[PRIMARY_TITLE_SLOT]</p>
          <p className="text-xs text-muted-foreground/70">[TITLE_SYSTEM_NOTE]</p>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FOLD 3: Chart Block (quiet, supporting, not dominant)
// ═══════════════════════════════════════════════════════════════════

function ChartFold() {
  return (
    <section className="py-6">
      <div className="bg-secondary/20 border border-border/50 rounded-lg p-5">
        <div className="flex gap-4 items-start">
          <div className="shrink-0">
            <FiveElementRing />
          </div>
          
          <div className="flex flex-col gap-1.5 py-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#5d7c5d]" />
              <span className="text-xs text-muted-foreground">[WOOD_LABEL]</span>
              <span className="text-xs text-foreground/70 ml-auto">[WOOD_WEIGHT]</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#b85c5c]" />
              <span className="text-xs text-muted-foreground">[FIRE_LABEL]</span>
              <span className="text-xs text-foreground/70 ml-auto">[FIRE_WEIGHT]</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#c9a857]" />
              <span className="text-xs text-muted-foreground">[EARTH_LABEL]</span>
              <span className="text-xs text-foreground/70 ml-auto">[EARTH_WEIGHT]</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#8b8b8b]" />
              <span className="text-xs text-muted-foreground">[METAL_LABEL]</span>
              <span className="text-xs text-foreground/70 ml-auto">[METAL_WEIGHT]</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#5c7b9c]" />
              <span className="text-xs text-muted-foreground">[WATER_LABEL]</span>
              <span className="text-xs text-foreground/70 ml-auto">[WATER_WEIGHT]</span>
            </div>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground/70 leading-relaxed mt-4 pt-3 border-t border-border/50">
          [FIVE_ELEMENT_NOTE]
        </p>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FOLD 4: Secondary Content (current focus + shelves - light weight)
// ═══════════════════════════════════════════════════════════════════

function SecondaryContentFold() {
  return (
    <section className="py-4 space-y-4">
      {/* Current Focus - minimal */}
      <div className="px-4 py-3 bg-secondary/20 rounded-lg">
        <p className="text-xs text-muted-foreground/70 mb-1">[CURRENT_FOCUS_TITLE]</p>
        <p className="text-sm text-foreground/80 leading-relaxed">
          [CURRENT_FOCUS_SUMMARY]
        </p>
      </div>

      {/* Compact horizontal shelves */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5">
        <div className="shrink-0 w-40 bg-secondary/15 border border-border/40 rounded-lg p-3">
          <p className="text-xs text-muted-foreground/70 mb-1.5">[TODAY_HEADING]</p>
          <p className="text-sm text-foreground/80 leading-snug mb-2">
            [TODAY_SUMMARY_SHORT]
          </p>
          <p className="text-xs text-muted-foreground/60 leading-relaxed">
            [TODAY_SUPPORT_LINE]
          </p>
        </div>

        <div className="shrink-0 w-40 bg-secondary/15 border border-border/40 rounded-lg p-3">
          <p className="text-xs text-muted-foreground/70 mb-1.5">[WEEKLY_HEADING]</p>
          <p className="text-sm text-foreground/80 leading-snug mb-2">
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
// FOLD 5: Entry Report (monetization hero - strongest lower-fold block)
// ═══════════════════════════════════════════════════════════════════

function EntryReportFold() {
  return (
    <section className="py-8">
      {/* Section label */}
      <p className="text-xs text-muted-foreground/70 uppercase tracking-wider mb-4 text-center">
        有料レポート
      </p>

      {/* Value bridge - prominent card */}
      <div className="bg-gradient-to-b from-primary/5 to-primary/10 border-2 border-primary/20 rounded-xl p-6 shadow-sm">
        <div className="flex items-baseline justify-between mb-5">
          <div>
            <p className="text-xs text-muted-foreground mb-1">[ENTRY_REPORT_LABEL]</p>
            <p className="text-2xl font-medium text-foreground">
              [ENTRY_REPORT_PRICE]
            </p>
          </div>
        </div>
        
        <ul className="space-y-3 mb-6">
          <li className="text-sm text-foreground/80 flex items-start gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
            [ENTRY_REPORT_FEATURE_1]
          </li>
          <li className="text-sm text-foreground/80 flex items-start gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
            [ENTRY_REPORT_FEATURE_2]
          </li>
          <li className="text-sm text-foreground/80 flex items-start gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
            [ENTRY_REPORT_FEATURE_3]
          </li>
        </ul>
        
        <Link
          href="/report"
          className="block w-full py-3.5 bg-primary text-primary-foreground text-center text-sm font-medium rounded-lg hover:opacity-90 transition-opacity shadow-sm"
        >
          [ENTRY_REPORT_CTA]
        </Link>
      </div>

      {/* Blurred teaser - inside the report section, blur only here */}
      <div className="mt-5 bg-card border border-border rounded-lg p-5">
        <p className="text-xs text-muted-foreground/70 font-medium mb-3">収録内容プレビュー</p>
        <div className="space-y-2.5 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-primary/40" />
            <span className="text-sm text-foreground/60 blur-[3px] select-none">[CHAPTER_TITLE_1]</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-primary/40" />
            <span className="text-sm text-foreground/60 blur-[3px] select-none">[CHAPTER_TITLE_2]</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-primary/40" />
            <span className="text-sm text-foreground/60 blur-[3px] select-none">[CHAPTER_TITLE_3]</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-primary/40" />
            <span className="text-sm text-foreground/60 blur-[3px] select-none">[CHAPTER_TITLE_4]</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground/60 text-center">
          [ENTRY_REPORT_VALUE_GAP_NOTE]
        </p>
      </div>
    </section>
  );
}

// ═══════════��═══════════════════════════════════════════════════════
// FOLD 6: System Rules + Trust (quiet, light, explanatory)
// ═════════════════════════════════════════════════════════���═════════

function SystemRuleFold() {
  return (
    <section className="py-6 border-t border-border/50">
      <div className="space-y-2 text-center">
        <p className="text-xs text-muted-foreground/60 leading-relaxed">
          [SYSTEM_RULE_1]
        </p>
        <p className="text-xs text-muted-foreground/60 leading-relaxed">
          [SYSTEM_RULE_2]
        </p>
        <p className="text-xs text-muted-foreground/60 leading-relaxed">
          [SYSTEM_RULE_3]
        </p>
        <p className="text-xs text-muted-foreground/60 leading-relaxed">
          [SYSTEM_RULE_4]
        </p>
        <p className="text-xs text-muted-foreground/60 leading-relaxed">
          [SYSTEM_RULE_5]
        </p>
      </div>
    </section>
  );
}

function TrustFooter() {
  return (
    <footer className="py-6 border-t border-border/30">
      <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground/50">
        <Link href="/support" className="hover:text-foreground/70 transition-colors">
          [SUPPORT_LINK]
        </Link>
        <Link href="/legal/refund" className="hover:text-foreground/70 transition-colors">
          [REFUND_LINK]
        </Link>
        <span className="text-border/50">|</span>
        <Link href="/legal/tokushoho" className="hover:text-foreground/70 transition-colors">
          [LEGAL_LINKS]
        </Link>
      </nav>
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
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
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
        {/* 1. Quiet hero */}
        {/* 2. Input gate */}
        <HeroFold />

        {/* 3. Instant preview board */}
        <InstantPreviewFold />

        {/* 4. Free-result sample shelf (chart + current focus + today/weekly) */}
        <ChartFold />
        <SecondaryContentFold />

        {/* 5. System rule explanation */}
        <SystemRuleFold />

        {/* 6. Entry Report value bridge */}
        {/* 7. Entry Report blurred teaser */}
        <EntryReportFold />

        {/* 8. Quiet trust/legal/support footer */}
        <TrustFooter />
      </main>
    </div>
  );
}
