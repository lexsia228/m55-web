/**
 * Support page layout.
 * Adds SiteFooter to /support.
 * Shell routes do NOT inherit this layout.
 */
import { SiteFooter } from "../_components/SiteFooter";

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: "1 0 auto" }}>{children}</div>
      <SiteFooter />
    </div>
  );
}
