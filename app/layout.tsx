import "./globals.css";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { jaJP } from "@clerk/localizations";

export const metadata: Metadata = {
  title: "M55",
  description: "M55 digital content service.",
  icons: {
    icon: "/icons/m55-core-logo.png",
    apple: "/icons/m55-core-logo.png",
  },
  openGraph: {
    title: "M55",
    description: "M55 digital content service.",
    images: [{ url: "/icons/m55-core-logo.png", alt: "M55" }],
  },
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
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}