import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { jaJP } from "@clerk/localizations";
import M55PrivacySafeAnalytics from "../components/analytics/M55PrivacySafeAnalytics";
import { DraftClaimOnLogin } from "../components/dtr/DraftClaimOnLogin";
import { ScrollToTopButton } from "../components/common/ScrollToTopButton";
import RuntimeStateIdentitySync from "../components/shell/RuntimeStateIdentitySync";
import { M55_PUBLIC_SUPPORT_EMAIL } from "../lib/m55/accountDataControlPublicCopy";

export const metadata: Metadata = {
  metadataBase: new URL("https://m-55.jp"),
  title: "M55",
  description:
    "M55は、生年月日と今の回答から、自分の傾向を言葉にするセルフリーディングサービスです。",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-512.png",
  },
  openGraph: {
    title: "M55",
    description:
      "M55は、生年月日と今の回答から、自分の傾向を言葉にするセルフリーディングサービスです。",
    images: [{ url: "/icons/icon-512.png", alt: "M55" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1c1630",
};

const operatorJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://m-55.jp/#operator",
  name: "M55 Project",
  alternateName: "M55",
  url: "https://m-55.jp/",
  logo: {
    "@type": "ImageObject",
    url: "https://m-55.jp/icons/icon-512.png",
  },
  email: M55_PUBLIC_SUPPORT_EMAIL,
  address: {
    "@type": "PostalAddress",
    postalCode: "107-0062",
    addressRegion: "東京都",
    addressLocality: "港区",
    streetAddress: "南青山3丁目1番36号 青山丸竹ビル6F",
    addressCountry: "JP",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: M55_PUBLIC_SUPPORT_EMAIL,
    availableLanguage: ["ja"],
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://m-55.jp/#website",
  url: "https://m-55.jp/",
  name: "M55",
  alternateName: "m-55.jp",
  description:
    "M55は、生年月日と今の回答から、自分に出やすい反応や傾向、整え方の入口を言葉にする自己理解サービスです。",
  inLanguage: "ja-JP",
  publisher: { "@id": "https://m-55.jp/#operator" },
};

const operatorJsonLdString = JSON.stringify(operatorJsonLd).replace(/</g, "\\u003c");
const websiteJsonLdString = JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c");

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
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      appearance={{
        layout: {
          logoImageUrl: "/icons/icon-512.png",
        },
      }}
    >
      <html lang="ja">
        <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: operatorJsonLdString }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: websiteJsonLdString }}
          />
          <DraftClaimOnLogin />
          <RuntimeStateIdentitySync />
          <ScrollToTopButton />
          {children}
          <M55PrivacySafeAnalytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
