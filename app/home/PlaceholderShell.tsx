'use client';

import Link from 'next/link';
import './home.css';

type TabId = 'home' | 'tarot' | 'ai-chat' | 'dtr' | 'my';

export default function PlaceholderShell({
  children,
  activeBottomTab = 'home',
}: {
  children: React.ReactNode;
  activeBottomTab?: TabId;
}) {
  return (
    <div className="home-hub">
      <div className="app-shell main-container">
        <header className="app-header">
          <Link href="/home" className="app-title" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="app-logo-orb" />
            <span className="app-logo-text">M55</span>
          {"\u30db\u30fc\u30e0"}</Link>
          <div className="header-right" />
        </header>
        <main className="home-main content-area">{children}</main>
        <nav className="bottom-nav" aria-label="ボトムナビ">
          <div className="bottom-nav-inner">
            <Link href="/home" className={`nav-item${activeBottomTab === 'home' ? ' active' : ''}`}>
              <span>🏠</span>{"\u30db\u30fc\u30e0"}</Link>
            <Link href="/tarot" className={`nav-item${activeBottomTab === 'tarot' ? ' active' : ''}`}>
              <span>ワ</span>{"\u30bf\u30ed\u30c3\u30c8"}</Link>
            <Link href="/ai-chat" className={`nav-item${activeBottomTab === 'ai-chat' ? ' active' : ''}`}>
              <span>町</span>{"AI\u30c1\u30e3\u30c3\u30c8"}</Link>
            <Link href="/dtr" className={`nav-item${activeBottomTab === 'dtr' ? ' active' : ''}`}>
              <span>糖</span>{"\u30d7\u30ec\u30df\u30a2\u30e0\u9451\u5b9a"}</Link>
            <Link href="/my" className={`nav-item${activeBottomTab === 'my' ? ' active' : ''}`}>
              <span>側</span>{"\u30de\u30a4\u30da\u30fc\u30b8"}</Link>
          </div>
        </nav>
      </div>
    </div>
  );
}
