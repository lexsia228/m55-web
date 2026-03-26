"use client";

import Link from "next/link";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useState } from "react";

// Tab navigation config
const TABS = [
  { href: "/home", label: "Home" },
  { href: "/core", label: "本質" },
  { href: "/dtr", label: "レポート" },
  { href: "/my", label: "My" },
] as const;

// 10-Title Identity concept
const IDENTITY_TITLES = [
  { label: "基盤の声", desc: "あなたの核となる性質" },
  { label: "内なる対話者", desc: "自己と向き合う姿勢" },
  { label: "創造の源泉", desc: "生み出す力の本質" },
  { label: "関係の織り手", desc: "つながりを紡ぐ方法" },
  { label: "探究者", desc: "学びへの向き合い方" },
  { label: "調和の守り手", desc: "バランスを保つ力" },
  { label: "変容の案内人", desc: "変化との付き合い方" },
  { label: "直感の声", desc: "感じ取る力の特性" },
  { label: "表現者", desc: "伝える力の形" },
  { label: "統合の智慧", desc: "すべてを結ぶ視座" },
];

// Five Elements for the ring chart
const FIVE_ELEMENTS = [
  { name: "木", color: "#5d7c5d", angle: 0 },
  { name: "火", color: "#b85c5c", angle: 72 },
  { name: "土", color: "#c9a857", angle: 144 },
  { name: "金", color: "#8b8b8b", angle: 216 },
  { name: "水", color: "#5c7b9c", angle: 288 },
];

// Five Element Ring Chart Component
function FiveElementRing() {
  const size = 180;
  const center = size / 2;
  const radius = 65;

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="opacity-80"
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
        {FIVE_ELEMENTS.map((el, i) => {
          const x = center + radius * Math.cos((el.angle - 90) * Math.PI / 180);
          const y = center + radius * Math.sin((el.angle - 90) * Math.PI / 180);
          return (
            <g key={el.name}>
              <circle
                cx={x}
                cy={y}
                r={22}
                fill={el.color}
                opacity="0.85"
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize="13"
                fontWeight="500"
              >
                {el.name}
              </text>
            </g>
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
      <p className="mt-3 text-xs text-muted-foreground text-center max-w-[200px]">
        五行は解釈の補助であり、絶対的な判定ではありません
      </p>
    </div>
  );
}

// Identity Card Component
function IdentityCard() {
  const [expanded, setExpanded] = useState(false);
  const visibleTitles = expanded ? IDENTITY_TITLES : IDENTITY_TITLES.slice(0, 3);

  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <h2 className="text-sm font-medium text-muted-foreground mb-4">
        あなたの10の称号
      </h2>
      
      <div className="space-y-3">
        {visibleTitles.map((title, i) => (
          <div
            key={i}
            className="flex items-start gap-3 py-2 border-b border-border last:border-0"
          >
            <span className="text-xs text-muted-foreground w-6 shrink-0 pt-0.5">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">{title.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{title.desc}</p>
            </div>
          </div>
        ))}
      </div>
      
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          すべて表示 →
        </button>
      )}
    </section>
  );
}

// Content Shelf Component
function ContentShelf({ title, items }: { title: string; items: { label: string; sub?: string }[] }) {
  return (
    <section>
      <h3 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
        {title}
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
        {items.map((item, i) => (
          <div
            key={i}
            className="shrink-0 w-32 bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors cursor-pointer"
          >
            <p className="text-sm font-medium text-foreground">{item.label}</p>
            {item.sub && (
              <p className="text-xs text-muted-foreground mt-1">{item.sub}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// Entry Report Purchase Block
function EntryReportBlock() {
  return (
    <section className="bg-primary/5 border border-primary/10 rounded-lg p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1">Entry Report</p>
          <h3 className="text-lg font-medium text-foreground mb-2">
            あなただけの深層分析
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            基本情報から導き出す、あなたの本質的な傾向と可能性。
            購入者専用のコンシェルジュルームへのアクセス権付き。
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-serif text-foreground">¥1,000</p>
          <p className="text-xs text-muted-foreground mt-1">1回相談含む</p>
        </div>
      </div>
      
      <Link
        href="/dtr"
        className="mt-4 block w-full py-3 bg-primary text-primary-foreground text-center text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
      >
        レポートを見る
      </Link>
    </section>
  );
}

// System Rule Explanation
function SystemRuleBlock() {
  return (
    <section className="text-center py-6">
      <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
        M55は生年月日と時間から導き出される要素の組み合わせを用いて、
        自己理解の補助となる情報を提供します。
        占いや診断ではなく、自己観察のための一つの視点です。
      </p>
    </section>
  );
}

// Trust Links
function TrustLinks() {
  return (
    <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      <Link href="/support" className="hover:text-foreground transition-colors">
        サポート
      </Link>
      <Link href="/legal/tokushoho" className="hover:text-foreground transition-colors">
        特定商取引法
      </Link>
      <Link href="/legal/terms" className="hover:text-foreground transition-colors">
        利用規約
      </Link>
      <Link href="/legal/privacy" className="hover:text-foreground transition-colors">
        プライバシー
      </Link>
    </nav>
  );
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("/home");

  const todayItems = [
    { label: "今日の傾向", sub: "内省の日" },
    { label: "注目の要素", sub: "水の流れ" },
    { label: "相性の良い時間", sub: "午後の静寂" },
  ];

  const weeklyItems = [
    { label: "週の概観", sub: "調和のとき" },
    { label: "重要な転換点", sub: "水曜日" },
    { label: "週末の傾向", sub: "創造性" },
  ];

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
                onClick={() => setActiveTab(tab.href)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  activeTab === tab.href
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
            静かに、自分を知る
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            あなたの生まれ持った要素を読み解き、
            日々の自己観察を支える情報をお届けします。
          </p>
        </section>

        {/* Identity Card */}
        <IdentityCard />

        {/* Five Element Ring */}
        <section className="py-4">
          <h2 className="text-sm font-medium text-muted-foreground mb-5 text-center">
            五行のバランス
          </h2>
          <FiveElementRing />
        </section>

        {/* Today Shelf */}
        <ContentShelf title="Today" items={todayItems} />

        {/* Weekly Shelf */}
        <ContentShelf title="Weekly" items={weeklyItems} />

        {/* Entry Report Block */}
        <EntryReportBlock />

        {/* System Rule */}
        <SystemRuleBlock />

        {/* Trust Links */}
        <TrustLinks />
      </main>

      {/* Bottom Spacing */}
      <div className="h-6" />
    </div>
  );
}
