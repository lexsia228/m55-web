import Link from "next/link";

export function SiteFooter() {
  const wrap: React.CSSProperties = {
    borderTop: "1px solid rgba(0,0,0,0.08)",
    background: "#f9f7f4",
    marginTop: 24,
  };

  const inner: React.CSSProperties = {
    maxWidth: 960,
    margin: "0 auto",
    padding: "18px 16px 22px",
    fontFamily: '"Hiragino Kaku Gothic ProN", "Noto Sans JP", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  };

  const nav: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 14,
    fontSize: 13,
    lineHeight: 1.7,
    margin: "0 0 10px",
  };

  const small: React.CSSProperties = {
    fontSize: 12,
    color: "rgba(60, 60, 60, 0.7)",
    margin: 0,
  };

  return (
    <footer style={wrap}>
      <div style={inner}>
        <nav style={nav} aria-label="Footer">
          <Link href="/" style={{ color: "rgba(60, 60, 60, 0.8)", textDecoration: "none" }}>M55 Home</Link>
          <Link href="/dtr/lp" style={{ color: "rgba(60, 60, 60, 0.8)", textDecoration: "none" }}>Product</Link>
          <Link href="/support" style={{ color: "rgba(60, 60, 60, 0.8)", textDecoration: "none" }}>Support</Link>
          <Link href="/legal/tokushoho" style={{ color: "rgba(60, 60, 60, 0.8)", textDecoration: "none" }}>Tokushoho</Link>
          <Link href="/legal/terms" style={{ color: "rgba(60, 60, 60, 0.8)", textDecoration: "none" }}>Terms</Link>
          <Link href="/legal/privacy" style={{ color: "rgba(60, 60, 60, 0.8)", textDecoration: "none" }}>Privacy</Link>
          <Link href="/legal/refund" style={{ color: "rgba(60, 60, 60, 0.8)", textDecoration: "none" }}>Refund</Link>
        </nav>

        <p style={small}>
          本サービスはウェブ上で提供するデジタルコンテンツです。医療・法律・投資等の専門的助言は行いません。
        </p>
        <p style={{ ...small, marginTop: 4 }}>
          Digital content delivered on the web after payment. Not medical, legal, or investment advice.
        </p>
        <p style={{ ...small, marginTop: 6 }}>© 2026 M55 Project</p>
      </div>
    </footer>
  );
}