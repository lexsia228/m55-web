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

// Five Element Ring Chart Component
function FiveElementRing() {
  const size = 160;
  const center = size / 2;
  const radius = 55;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="opacity-85"
      aria-hidden="true"
    >
      {/* Outer ring */}
      <circle
        cx={center}
        cy={center}
        r={radius + 10}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth="1"
      />
      
      {/* Connection lines between elements */}
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
            opacity="0.5"
          />
        );
      })}
      
      {/* Element nodes */}
      {FIVE_ELEMENTS.map((el) => {
        const x = center + radius * Math.cos((el.angle - 90) * Math.PI / 180);
        const y = center + radius * Math.sin((el.angle - 90) * Math.PI / 180);
        return (
          <circle
            key={el.key}
            cx={x}
            cy={y}
            r={16}
            fill={el.color}
            opacity="0.85"
          />
        );
      })}
      
      {/* Center dot */}
      <circle
        cx={center}
        cy={center}
        r={5}
        fill="hsl(var(--primary))"
        opacity="0.6"
      />
    </svg>
  );
}

// Bias Gauge Component (secondary chart)
function BiasGauge() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-16 overflow-hidden">
        {/* Gauge arc background */}
        <svg viewBox="0 0 100 50" className="w-full h-full">
          <path
            d="M 5 50 A 45 45 0 0 1 95 50"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Active portion */}
          <path
            d="M 5 50 A 45 45 0 0 1 60 8"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.7"
          />
        </svg>
      </div>
      <p className="text-xs text-muted-foreground">[BIAS_GAUGE_LABEL]</p>
    </div>
  );
}

// A. Hero Section
function HeroSection() {
  return (
    <section className="text-center py-8">
      <h1 className="text-2xl font-serif text-foreground mb-3 text-balance">
        [HOME_HERO_TITLE]
      </h1>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto mb-2">
        [HOME_HERO_DESC]
      </p>
      <p className="text-xs text-muted-foreground mb-5">
        [HOME_SUPPORTING_LINE]
      </p>
      <Link
        href="/report"
        className="inline-block px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
      >
        [PRIMARY_CTA]
      </Link>
    </section>
  );
}

// B. Input Gate Section
function InputGate() {
  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <h2 className="text-base font-medium text-foreground mb-4 text-center">
        [INPUT_GATE_TITLE]
      </h2>
      
      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">
            お名前
          </label>
          <div className="w-full px-3 py-2.5 bg-secondary/50 border border-border rounded-md text-sm text-muted-foreground">
            [NAME_FIELD]
          </div>
        </div>
        
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">
            生年月日
          </label>
          <div className="w-full px-3 py-2.5 bg-secondary/50 border border-border rounded-md text-sm text-muted-foreground">
            [BIRTHDATE_FIELD]
          </div>
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground text-center mb-4 leading-relaxed">
        [INPUT_GATE_EXPLAINER]
      </p>
      
      <button
        type="button"
        className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
      >
        [INPUT_GATE_CTA]
      </button>
    </section>
  );
}

// C. Instant Preview Board
function InstantPreviewBoard() {
  return (
    <section className="bg-card border border-border rounded-lg p-5">
      {/* Public title and symbol */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">[PUBLIC_TITLE]</p>
          <p className="text-lg font-medium text-foreground">[DISPLAY_ONE_LINE]</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
          <span className="text-sm text-muted-foreground">[SYMBOL]</span>
        </div>
      </div>

      {/* Essence summary */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        [ESSENCE_SUMMARY_SHORT]
      </p>

      {/* Keywords */}
      <div className="flex flex-wrap gap-2">
        <span className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded">
          [KEYWORD_1]
        </span>
        <span className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded">
          [KEYWORD_2]
        </span>
        <span className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded">
          [KEYWORD_3]
        </span>
      </div>
    </section>
  );
}

// D. Chart Layer
function ChartLayer() {
  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Five Element Ring */}
        <div className="flex gap-4 items-start">
          <div className="shrink-0">
            <FiveElementRing />
          </div>
          
          {/* Right-side labels */}
          <div className="flex flex-col gap-1.5 py-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#5d7c5d]" />
              <span className="text-xs text-muted-foreground">[WOOD_LABEL]</span>
              <span className="text-xs text-foreground ml-auto">[WOOD_WEIGHT]</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#b85c5c]" />
              <span className="text-xs text-muted-foreground">[FIRE_LABEL]</span>
              <span className="text-xs text-foreground ml-auto">[FIRE_WEIGHT]</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#c9a857]" />
              <span className="text-xs text-muted-foreground">[EARTH_LABEL]</span>
              <span className="text-xs text-foreground ml-auto">[EARTH_WEIGHT]</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#8b8b8b]" />
              <span className="text-xs text-muted-foreground">[METAL_LABEL]</span>
              <span className="text-xs text-foreground ml-auto">[METAL_WEIGHT]</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#5c7b9c]" />
              <span className="text-xs text-muted-foreground">[WATER_LABEL]</span>
              <span className="text-xs text-foreground ml-auto">[WATER_WEIGHT]</span>
            </div>
          </div>
        </div>
        
        {/* Secondary chart: Bias Gauge */}
        <div className="w-full md:w-auto flex justify-center pt-2 md:pt-4">
          <BiasGauge />
        </div>
      </div>
      
      {/* Interpretive notes */}
      <div className="mt-4 pt-3 border-t border-border space-y-2">
        <p className="text-xs text-muted-foreground leading-relaxed">
          [FIVE_ELEMENT_NOTE]
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          [FIVE_ELEMENT_NOTE_2]
        </p>
      </div>
    </section>
  );
}

// E. Current Focus Block (small, secondary)
function CurrentFocusBlock() {
  return (
    <section className="bg-secondary/30 border border-border rounded-lg p-4">
      <p className="text-xs text-muted-foreground mb-1">[CURRENT_FOCUS_TITLE]</p>
      <p className="text-sm text-foreground leading-relaxed">
        [CURRENT_FOCUS_SUMMARY]
      </p>
    </section>
  );
}

// F. Compact Shelves
function CompactShelves() {
  return (
    <section className="space-y-3">
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5">
        {/* Today Card */}
        <div className="shrink-0 w-44 bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-2">[TODAY_HEADING]</p>
          <p className="text-sm text-foreground leading-relaxed mb-2">
            [TODAY_SUMMARY_SHORT]
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border">
            [TODAY_SUPPORT_LINE]
          </p>
        </div>

        {/* Weekly Card */}
        <div className="shrink-0 w-44 bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-2">[WEEKLY_HEADING]</p>
          <p className="text-sm text-foreground leading-relaxed mb-2">
            [WEEKLY_KEY]
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border">
            [WEEKLY_SUPPORT_LINE]
          </p>
        </div>
      </div>
    </section>
  );
}

// I. System Rule Block
function SystemRuleBlock() {
  return (
    <section className="py-4 space-y-2">
      <p className="text-xs text-muted-foreground leading-relaxed text-center">
        [SYSTEM_RULE_1]
      </p>
      <p className="text-xs text-muted-foreground leading-relaxed text-center">
        [SYSTEM_RULE_2]
      </p>
      <p className="text-xs text-muted-foreground leading-relaxed text-center">
        [SYSTEM_RULE_3]
      </p>
      <p className="text-xs text-muted-foreground leading-relaxed text-center">
        [SYSTEM_RULE_4]
      </p>
      <p className="text-xs text-muted-foreground leading-relaxed text-center">
        [SYSTEM_RULE_5]
      </p>
    </section>
  );
}

// G + H. Entry Report Block with Blurred Teaser Inside
function EntryReportBlock() {
  return (
    <section className="bg-primary/5 border border-primary/10 rounded-lg p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1">[ENTRY_REPORT_LABEL]</p>
          <p className="text-lg font-medium text-foreground">
            [ENTRY_REPORT_PRICE]
          </p>
        </div>
      </div>
      
      <ul className="space-y-2 mb-5">
        <li className="text-sm text-muted-foreground flex items-start gap-2">
          <span className="text-primary mt-0.5">•</span>
          [ENTRY_REPORT_FEATURE_1]
        </li>
        <li className="text-sm text-muted-foreground flex items-start gap-2">
          <span className="text-primary mt-0.5">•</span>
          [ENTRY_REPORT_FEATURE_2]
        </li>
        <li className="text-sm text-muted-foreground flex items-start gap-2">
          <span className="text-primary mt-0.5">•</span>
          [ENTRY_REPORT_FEATURE_3]
        </li>
      </ul>
      
      {/* H. Blurred chapter teaser INSIDE the Entry Report layer */}
      <div className="mb-5 p-4 bg-background/50 rounded-md border border-border">
        <p className="text-xs text-muted-foreground mb-3 font-medium">収録内容</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-primary/50" />
            <span className="text-xs text-foreground/70 blur-[2px] select-none">[CHAPTER_TITLE_1]</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-primary/50" />
            <span className="text-xs text-foreground/70 blur-[2px] select-none">[CHAPTER_TITLE_2]</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-primary/50" />
            <span className="text-xs text-foreground/70 blur-[2px] select-none">[CHAPTER_TITLE_3]</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-primary/50" />
            <span className="text-xs text-foreground/70 blur-[2px] select-none">[CHAPTER_TITLE_4]</span>
          </div>
        </div>
      </div>
      
      {/* Value gap note */}
      <p className="text-xs text-muted-foreground text-center mb-4">
        [ENTRY_REPORT_VALUE_GAP_NOTE]
      </p>
      
      <Link
        href="/report"
        className="block w-full py-3 bg-primary text-primary-foreground text-center text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
      >
        [ENTRY_REPORT_CTA]
      </Link>
    </section>
  );
}

// J. Quiet Trust Footer
function TrustFooter() {
  return (
    <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground py-4">
      <Link href="/support" className="hover:text-foreground transition-colors">
        [SUPPORT_LINK]
      </Link>
      <Link href="/legal/refund" className="hover:text-foreground transition-colors">
        [REFUND_LINK]
      </Link>
      <span className="text-border">|</span>
      <Link href="/legal/tokushoho" className="hover:text-foreground transition-colors">
        [LEGAL_LINKS]
      </Link>
    </nav>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Tab Navigation */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
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
      <main className="flex-1 max-w-lg mx-auto w-full px-5 py-6 space-y-6">
        {/* 1. Quiet Hero */}
        <HeroSection />

        {/* 2. Input Gate */}
        <InputGate />

        {/* 3. Instant Preview Board */}
        <InstantPreviewBoard />

        {/* 4. Chart Layer (Five Element Ring + Bias Gauge) */}
        <ChartLayer />

        {/* 5. Current Focus Block (small, secondary) */}
        <CurrentFocusBlock />

        {/* 6. Free-Result Sample Shelf (Today/Weekly) */}
        <CompactShelves />

        {/* 7. System Rule Explanation */}
        <SystemRuleBlock />

        {/* 8. Entry Report Value Bridge + Blurred Teaser */}
        <EntryReportBlock />

        {/* 9. Quiet Trust Footer */}
        <TrustFooter />
      </main>

      {/* Bottom Spacing */}
      <div className="h-6" />
    </div>
  );
}
