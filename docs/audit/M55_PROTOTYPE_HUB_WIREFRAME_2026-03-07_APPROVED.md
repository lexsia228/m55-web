# M55 /prototype/hub Wireframe — 2026-03-07 (Approved)

## Corrections applied before implementation

1. **Bottom Nav**: Explicitly fixed at bottom; no top-header nav implied.
2. **Current state header**: Reuses `m55_ai_meter_detail.html` component language (meter / status / zone / chip vocabulary).
3. **Section order**: DTR shelf before Prime shelf (entitlement/value surfaces before curated no-rank shelf).

## Layout structure

```
┌─────────────────────────────────────────────────────────────┐
│  [Scrollable content area]                                   │
│  ...                                                         │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  [Bottom Nav — FIXED AT BOTTOM]                              │
│  Home | Tarot | Chat | Prime | My                            │
│  SVG glyph 5種、opacity のみ、絵文字なし                     │
└─────────────────────────────────────────────────────────────┘
```

## Sections (top to bottom)

1. **現在の状態** (meter/status/zone/chip vocabulary)
2. **接続ハブ** (AI chat + Tarot cards, Today/Weekly/Prime/DTR/My links)
3. **保存期間の比較** (0/30/90)
4. **プラン概要** (annual display-only, disabled CTA)
5. **DTR棚** (entitlement/unlock)
6. **Prime棚** (curated no-rank)
7. **フッター注記**

## Design contracts

- Step5 Bottom Nav Original Glyph SSOT
- Step5 Prime No-Rank UI SSOT
- Step5 Home Image Policy SSOT
- m55_ai_meter_detail meter/status/zone/chip vocabulary
