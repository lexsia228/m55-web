# VISUAL_ASSET_PLACEMENT_MAP.md
Status: INTERNAL_ONLY
Last Updated: 2026-03-16

目的:
ビジュアル素材の配置規則・命名規則を先に固定し、後の LP / purchased-access / receipt 周りで drift を防ぐ。

## Folder law
| asset_category | target_surface | folder_path | filename_convention | usage_scope | notes |
|---|---|---|---|---|---|
| product hero | LP / product cards | /public/images/products/dtr/ | dtr-{sku}-{variant}.png | public-safe | one product family per folder |
| chat ticket visual | wallet / upsell card | /public/images/products/chat/ | chat-{pack_id}-{variant}.png | internal-first | only publicize after approval |
| receipt/support reference | support docs | /public/images/system/receipts/ | receipt-{context}-{v}.png | internal/support | not necessarily public |
| card/tarot mode visual | future mode cards | /public/images/products/cards/ | cardmode-{mode}-{variant}.png | internal-only initially | avoid public rollout before approval |
| concierge/member visual | future member surfaces | /public/images/products/concierge/ | concierge-{tier}-{variant}.png | internal-only | roadmap only |

## Naming rules
- use lowercase kebab-case
- include sku or pack id where applicable
- no ambiguous "final", "new", "latest" filenames
- keep one canonical hero per SKU

## Safety rules
- frozen public/storefront surface is not rewritten by this document
- this file fixes placement rules only
- do not imply a product is launch-ready merely because assets exist
