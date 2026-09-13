/**
 * Legal group layout.
 * Public shell (header + quiet footer) for all /legal/* pages.
 * Shell routes do NOT inherit this layout.
 */
import { PublicShell } from "../_components/PublicShell";
import { M55_PUBLIC_SUPPORT_EMAIL } from "../../lib/m55/accountDataControlPublicCopy";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://m-55.jp/#operator",
  name: "M55 Project",
  url: "https://m-55.jp/",
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

const organizationJsonLdString = JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c");

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: organizationJsonLdString }}
      />
      <PublicShell>{children}</PublicShell>
    </>
  );
}
