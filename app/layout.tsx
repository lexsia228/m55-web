import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { ClerkProvider } from "@clerk/nextjs";
import { jaJP } from "@clerk/localizations";
import { DraftClaimOnLogin } from "../components/dtr/DraftClaimOnLogin";
import { ScrollToTopButton } from "../components/common/ScrollToTopButton";

export const metadata: Metadata = {
  metadataBase: new URL("https://m55-webv2.vercel.app"),
  title: "M55",
  description:
    "商品ごとに異なる生年月日の手がかりと選択式の質問を重ね、現在の自分や二人の関係を整理する読み解きシステムです。",
  icons: {
    icon: "/icons/m55-core-logo.png",
    apple: "/icons/m55-core-logo.png",
  },
  openGraph: {
    title: "M55",
    description:
      "商品ごとに異なる生年月日の手がかりと選択式の質問を重ね、現在の自分や二人の関係を整理します。",
    type: "website",
    locale: "ja_JP",
    images: [{ url: "/icons/m55-core-logo.png", alt: "M55" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1c1630",
};

/**
 * Root layout: ClerkProvider only — no global SiteFooter.
 *
 * SiteFooter is added at the route-group level for pages that need it:
 *   - /legal/*      → app/legal/layout.tsx
 *   - /support      → app/support/layout.tsx
 *   - /dtr/lp       → inline in app/dtr/lp/page.tsx
 *
 * Shell routes (/home /core /today /weekly /my /dtr/core) use ShellLayout
 * (position:fixed, inset:0) and must never render SiteFooter.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      localization={jaJP}
      appearance={{
        layout: {
          logoImageUrl: "/icons/m55-core-logo.png",
        },
      }}
    >
      <html lang="ja">
        <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}>
          <DraftClaimOnLogin />
          <ScrollToTopButton />
          {children}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}