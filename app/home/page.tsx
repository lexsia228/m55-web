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
  const size = 180;
  const center = size / 2;
  const radius = 65;

  return (
    <div className="flex gap-6 items-start">
      {/* Ring Chart */}
      <div className="shrink-0">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="opacity-80"
          aria-hidden="true"
        >
          {/* Outer ring */}
          <circle
            cx={center}
            cy={center}
            r={radius + 12}
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
                r={18}
                fill={el.color}
                opacity="0.85"
              />
            );
          })}
          
          {/* Center dot */}
          <circle
            cx={center}
            cy={center}
            r={6}
            fill="hsl(var(--primary))"
            opacity="0.6"
          />
        </svg>
      </div>

      {/* Right-side labels */}
      <div className="flex flex-col gap-2 py-2">
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
  );
}

// Identity Card Component
function IdentityCard() {
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
      <div className="flex gap-2">
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

// Compact Shelves Component
function CompactShelves() {
  return (
    <section className="space-y-4">
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5">
        {/* Today Card */}
        <div className="shrink-0 w-40 bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-2">[TODAY_HEADING]</p>
          <p className="text-sm text-foreground leading-relaxed">
            [TODAY_SUMMARY_SHORT]
          </p>
        </div>

        {/* Weekly Card */}
        <div className="shrink-0 w-40 bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-2">[WEEKLY_HEADING]</p>
          <p className="text-sm text-foreground leading-relaxed">
            [WEEKLY_KEY]
          </p>
        </div>
      </div>
    </section>
  );
}

// Entry Report Purchase Block
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
      
      <ul className="space-y-2 mb-4">
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
      
      <Link
        href="/report"
        className="block w-full py-3 bg-primary text-primary-foreground text-center text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
      >
        [ENTRY_REPORT_CTA]
      </Link>
    </section>
  );
}

// Quiet System Rule Block
function SystemRuleBlock() {
  return (
    <section className="py-6 space-y-3">
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

// Quiet Trust Footer
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
      <main className="flex-1 max-w-lg mx-auto w-full px-5 py-8 space-y-8">
        {/* Hero Section */}
        <section className="text-center py-6">
          <h1 className="text-2xl font-serif text-foreground mb-3 text-balance">
            [HOME_HERO_TITLE]
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto mb-5">
            [HOME_HERO_DESC]
          </p>
          <Link
            href="/report"
            className="inline-block px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
          >
            [PRIMARY_CTA]
          </Link>
        </section>

        {/* Identity Card */}
        <IdentityCard />

        {/* Five Element Ring with Labels */}
        <section className="py-4">
          <FiveElementRing />
          <p className="mt-4 text-xs text-muted-foreground text-center">
            [FIVE_ELEMENT_NOTE]
          </p>
        </section>

        {/* Compact Shelves - Today/Weekly */}
        <CompactShelves />

        {/* Entry Report Block */}
        <EntryReportBlock />

        {/* Quiet System Rule */}
        <SystemRuleBlock />

        {/* Quiet Trust Footer */}
        <TrustFooter />
      </main>

      {/* Bottom Spacing */}
      <div className="h-6" />
    </div>
  );
}
