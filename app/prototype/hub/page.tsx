'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { captureHubEvent, type HubCardType } from '../../../lib/hubAnalytics';

type Entitlements = {
  tier: string;
  retention_days: number;
  chat_daily_limit: number;
  tarot_daily_limit: number;
  dtr_rights: string[];
};

const DTR_SLOTS: { key: string; label: string; cardType: HubCardType; desc: string }[] = [
  { key: 'm55_p:core_origin', label: 'Core', cardType: 'core', desc: '本質レポート（永久）' },
  { key: 'm55_p:week:', label: 'Weekly', cardType: 'weekly', desc: '週次（7日）' },
  { key: 'm55_p:day:', label: 'Daily', cardType: 'daily', desc: '日次（1日）' },
  { key: 'm55_p:month:', label: 'Monthly', cardType: 'monthly', desc: '月次（Premium特典）' },
];

const TIER_RETENTION: Record<string, number> = { free: 0, standard: 30, premium: 90 };

// m55_ai_meter_detail / meter vocabulary: zoneShort, zoneLong (m55_data_core)
function getZoneFromRetention(days: number): { short: string; long: string } {
  const zoneShort = days >= 30 ? '澄み' : days >= 7 ? '育ち' : '芽吹き';
  const zoneLong = days >= 90 ? '結晶' : days >= 30 ? '深まり' : '積もり';
  return { short: zoneShort, long: zoneLong };
}

function hasRight(rightKey: string, rights: string[]): boolean {
  if (rightKey === 'm55_p:core_origin') return rights.some((r) => r === rightKey);
  if (rightKey.startsWith('m55_p:week:')) return rights.some((r) => r.startsWith('m55_p:week:'));
  if (rightKey.startsWith('m55_p:day:')) return rights.some((r) => r.startsWith('m55_p:day:'));
  if (rightKey.startsWith('m55_p:month:')) return rights.some((r) => r.startsWith('m55_p:month:'));
  return false;
}

const sectionStyle = { marginBottom: 24 };
const cardStyle = {
  padding: 12,
  border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: 8,
  marginBottom: 8,
};

export default function PrototypeHubPage() {
  const [ent, setEnt] = useState<Entitlements | null>(null);
  const retentionRef = useRef<HTMLElement>(null);
  const planRef = useRef<HTMLElement>(null);
  const retentionFired = useRef(false);
  const planFired = useRef(false);

  useEffect(() => {
    fetch('/api/me/entitlements')
      .then((r) => (r.ok ? r.json() : null))
      .then(setEnt)
      .catch(() =>
        setEnt({
          tier: 'free',
          retention_days: 0,
          chat_daily_limit: 1,
          tarot_daily_limit: 1,
          dtr_rights: [],
        })
      );
  }, []);

  const tier = ent?.tier ?? 'free';
  const rights = ent?.dtr_rights ?? [];
  const retentionDays = ent?.retention_days ?? 0;
  const hasMonthlyDtr = tier === 'premium' && rights.some((r) => r.startsWith('m55_p:month:'));
  const hubViewFired = useRef(false);

  useEffect(() => {
    if (ent === null || hubViewFired.current) return;
    hubViewFired.current = true;
    captureHubEvent('hub_view', {
      tier,
      has_monthly_dtr: hasMonthlyDtr,
      source_surface: 'prototype_hub',
    });
  }, [ent, tier, hasMonthlyDtr]);

  useEffect(() => {
    const retentionEl = retentionRef.current;
    const planEl = planRef.current;
    if (!retentionEl || !planEl) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          if (e.target === retentionEl && !retentionFired.current) {
            retentionFired.current = true;
            captureHubEvent('view_retention_comparison', {
              tier,
              has_monthly_dtr: hasMonthlyDtr,
              section: 'retention_comparison',
              source_surface: 'prototype_hub',
            });
          }
          if (e.target === planEl && !planFired.current) {
            planFired.current = true;
            captureHubEvent('view_plan_summary', {
              tier,
              has_monthly_dtr: hasMonthlyDtr,
              section: 'plan_summary',
              source_surface: 'prototype_hub',
            });
          }
        }
      },
      { threshold: 0.5 }
    );
    io.observe(retentionEl);
    io.observe(planEl);
    return () => io.disconnect();
  }, [tier, hasMonthlyDtr]);

  const zone = getZoneFromRetention(retentionDays);

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 640, margin: '0 auto', paddingBottom: 80 }}>
      {/* Current state header — meter/status/zone/chip vocabulary */}
      <section style={sectionStyle}>
        <h2 style={{ fontSize: 12, fontWeight: 600, margin: '0 0 8px', opacity: 0.8 }}>現在の状態</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span style={{ ...cardStyle, marginBottom: 0, display: 'inline-block' }}>プラン: {tier}</span>
          <span style={{ ...cardStyle, marginBottom: 0, display: 'inline-block' }}>
            保存窓: {retentionDays}日
          </span>
          <span style={{ ...cardStyle, marginBottom: 0, display: 'inline-block' }}>
            月次DTR: {hasMonthlyDtr ? '付与済み' : '未付与'}
          </span>
          <span style={{ ...cardStyle, marginBottom: 0, display: 'inline-block' }}>
            zone: {zone.short} / {zone.long}
          </span>
        </div>
      </section>

      {/* First-class surfaces: AI chat, Tarot */}
      <section style={sectionStyle}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>接続ハブ</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Link
            href="/ai-chat"
            style={{
              ...cardStyle,
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
            }}
          >
            <strong>AI チャット</strong>
            <span style={{ display: 'block', fontSize: 12, marginTop: 4, opacity: 0.8 }}>続きを見る</span>
          </Link>
          <Link
            href="/tarot"
            style={{
              ...cardStyle,
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
            }}
          >
            <strong>タロット</strong>
            <span style={{ display: 'block', fontSize: 12, marginTop: 4, opacity: 0.8 }}>続きを見る</span>
          </Link>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Link href="/today" style={{ color: 'inherit', textDecoration: 'none' }}>Today</Link>
          <Link href="/weekly" style={{ color: 'inherit', textDecoration: 'none' }}>Weekly</Link>
          <Link href="/prototype/hub#prime" style={{ color: 'inherit', textDecoration: 'none' }}>Prime</Link>
          <Link href="/dtr" style={{ color: 'inherit', textDecoration: 'none' }}>DTR</Link>
          <Link href="/my" style={{ color: 'inherit', textDecoration: 'none' }}>My</Link>
        </div>
      </section>

      {/* 0/30/90 retention comparison */}
      <section ref={retentionRef} style={sectionStyle}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>保存期間の比較</h2>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li>Free: {TIER_RETENTION.free}日</li>
          <li>Standard: {TIER_RETENTION.standard}日</li>
          <li>Premium: {TIER_RETENTION.premium}日</li>
        </ul>
      </section>

      {/* Plan overview — annual display-only, CTA disabled */}
      <section ref={planRef} style={sectionStyle}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>プラン概要</h2>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li>月額 Standard — 保存30日・回数中</li>
          <li>月額 Premium — 保存90日・回数多・月次DTR付与</li>
          <li>年額 Standard — 月額の約10ヶ月分相当（比較用）</li>
          <li>年額 Premium — 月額の約10ヶ月分相当（比較用）</li>
        </ul>
        <button
          type="button"
          disabled
          aria-disabled="true"
          aria-label="年額プラン（近日公開予定）"
          style={{
            marginTop: 12,
            padding: 12,
            border: '1px solid rgba(0,0,0,0.15)',
            borderRadius: 8,
            opacity: 0.6,
            cursor: 'not-allowed',
            backgroundColor: 'rgba(0,0,0,0.03)',
            fontFamily: 'inherit',
            fontSize: 14,
            textAlign: 'left',
            width: '100%',
          }}
        >
          <span style={{ fontWeight: 600 }}>年額プラン</span>
          <span style={{ marginLeft: 8, fontSize: 12 }}>近日公開予定</span>
        </button>
      </section>

      {/* DTR shelf — entitlement/unlock (before Prime) */}
      <section style={sectionStyle}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>DTR棚（権利・アンロック）</h2>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {DTR_SLOTS.map((slot) => {
            const unlocked = hasRight(slot.key, rights);
            return (
              <li key={slot.key} style={cardStyle}>
                <Link
                  href="/dtr"
                  onClick={() =>
                    captureHubEvent('dtr_card_click', {
                      tier,
                      has_monthly_dtr: hasMonthlyDtr,
                      card_type: slot.cardType,
                      is_unlocked: unlocked,
                      source_surface: 'prototype_hub',
                    })
                  }
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                >
                  <strong>{slot.label}</strong> — {slot.desc}
                  {unlocked ? (
                    <span style={{ marginLeft: 8, fontSize: 12, color: 'green' }}>利用可</span>
                  ) : (
                    <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.7 }}>詳細は DTR で</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Prime shelf — curated no-rank (after DTR) */}
      <section id="prime" style={sectionStyle}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>Prime棚（キュレーション・No-Rank）</h2>
        <p style={{ fontSize: 12, opacity: 0.8, margin: '0 0 8px' }}>
          厳選コンテンツ。順位・ランキング・数値は表示しません。
        </p>
        <div style={{ ...cardStyle, opacity: 0.9 }}>[カード群]</div>
      </section>

      {/* Footer */}
      <footer style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.1)', fontSize: 12, opacity: 0.7 }}>
        価格・返金・サポート: <Link href="/support">/support</Link>, <Link href="/legal/refund">/legal/refund</Link>
      </footer>
    </main>
  );
}
