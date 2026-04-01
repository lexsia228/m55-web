import Link from "next/link";

export function SiteFooter() {
  const wrap: React.CSSProperties = {
    borderTop: "1px solid rgba(0,0,0,0.10)",
    background: "rgba(0,0,0,0.02)",
    marginTop: 24,
  };

  const inner: React.CSSProperties = {
    maxWidth: 960,
    margin: "0 auto",
    padding: "18px 16px 22px",
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
    opacity: 0.75,
    margin: 0,
  };

  return (
    <footer style={wrap}>
      <div style={inner}>
        <nav style={nav} aria-label="Footer">
          <Link href="/">M55 Home</Link>
          <Link href="/dtr/lp">Product</Link>
          <Link href="/support">Support</Link>
          <Link href="/legal/tokushoho">Tokushoho</Link>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/refund">Refund</Link>
        </nav>

        <p style={small}>
          This site sells digital content delivered on the web after successful payment. It does not provide medical, legal, or investment advice.
        </p>
        <p style={{ ...small, marginTop: 6 }}>© 2026 M55 Project</p>
      </div>
    </footer>
  );
}