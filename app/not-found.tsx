import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicShell } from './_components/PublicShell';
import { M55_COMMERCIAL_TERMINOLOGY } from '../lib/m55/commercialUx/terminology';
import typography from './_components/PublicTypography.module.css';

export const metadata: Metadata = {
  title: 'ページが見つかりません | M55',
  robots: { index: false, follow: false },
};

/**
 * Root unmatched-route recovery. HTTP 404 + noindex stay with Next.js.
 * Chrome reuses PublicShell; CTAs reuse existing public entry copy/routes.
 */
export default function NotFound() {
  return (
    <PublicShell>
      <div
        className={typography.root}
        data-m55-experience-surface="PUBLIC_EDITORIAL"
        data-testid="m55-not-found"
        style={{
          maxWidth: 'min(42rem, calc(100vw - 48px))',
          margin: '0 auto',
          padding: '48px clamp(20px, 3vw, 32px) 72px',
          textAlign: 'center',
        }}
      >
        <h1 id="m55-not-found-title" className={typography.headingL}>
          このページは見つかりませんでした
        </h1>
        <p
          className={typography.body}
          style={{ margin: '16px 0 36px', color: 'var(--public-text-meta)' }}
        >
          指定されたページはありません。
        </p>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <Link
            href="/core"
            className={typography.body}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 44,
              padding: '14px 32px',
              fontWeight: 600,
              color: '#ffffff',
              background: '#6b5fa8',
              border: '1px solid rgba(58, 48, 98, 0.25)',
              borderRadius: 8,
              textDecoration: 'none',
              boxSizing: 'border-box',
            }}
          >
            {M55_COMMERCIAL_TERMINOLOGY.freeEntry}
          </Link>
          <Link
            href="/home"
            className={typography.body}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 44,
              padding: '12px 26px',
              fontWeight: 600,
              color: '#453d58',
              background: 'rgba(255, 255, 255, 0.85)',
              border: '1px solid rgba(107, 95, 168, 0.38)',
              borderRadius: 8,
              textDecoration: 'none',
              boxSizing: 'border-box',
            }}
          >
            ホームへ戻る
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
