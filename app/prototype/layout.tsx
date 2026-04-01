'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/prototype/hub', icon: '/assets/nav/ic_home.svg', label: 'Home' },
  { href: '/tarot', icon: '/assets/nav/ic_tarot.svg', label: 'Tarot' },
  { href: '/ai-chat', icon: '/assets/nav/ic_chat.svg', label: 'Chat' },
  { href: '/prototype/hub#prime', icon: '/assets/nav/ic_prime.svg', label: 'Prime' },
  { href: '/my', icon: '/assets/nav/ic_my.svg', label: 'My' },
];

export default function PrototypeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: 64 }}>
      <div style={{ flex: '1 0 auto' }}>{children}</div>
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '8px 0 12px',
          background: 'rgba(255,255,255,0.95)',
          borderTop: '1px solid rgba(0,0,0,0.08)',
          zIndex: 50,
        }}
        aria-label="Bottom navigation"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href === '/prototype/hub' && pathname?.startsWith('/prototype/hub'));
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                textDecoration: 'none',
                color: 'inherit',
                opacity: isActive ? 1 : 0.3,
              }}
            >
              <img src={item.icon} alt="" width={24} height={24} style={{ display: 'block' }} />
              <span style={{ fontSize: 10 }}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
