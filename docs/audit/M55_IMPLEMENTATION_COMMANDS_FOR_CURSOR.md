# M55_IMPLEMENTATION_COMMANDS_FOR_CURSOR
Status: Execution Order / Cursor Hand-off
Date: 2026-03-03 (JST)
Goal: Stripe審査中のProduction(main)凍結を守りながら、Web移植をfeatureブランチで進める。

## 0. Absolute Rules (DO NOT VIOLATE)
- Production(main)は凍結。Gate R対象面は差し戻し時のみ最小差分。
- 公開テキスト禁止語彙を0（占い/鑑定/運勢/予言/開運/霊感/当たる）。本文/メタ/OG/構造化データ/エラーメッセージ含む。
- URL/クエリで状態・権利・contextKeyを注入しない（Tap-only）。
- 購入判定の真実はDB/PurchaseCache。TrustedStorage単独でunlockしない。
- 背景NoTouch、通知っぽさ禁止、煽りコピー禁止。
- 秘密鍵/シークレットの要求・出力・ログ禁止。

## 1. Branch Operations (PowerShell)
### 1.1 Create and push feature branch
```powershell
git fetch origin

git switch main
git pull --ff-only

git switch -c post-review-web-migration
git push -u origin post-review-web-migration
```

### 1.2 Exception flow (only if Stripe asks for changes)
```powershell
git fetch origin

git switch main
git pull --ff-only

git switch -c hotfix/stripe-review-minimal
git push -u origin hotfix/stripe-review-minimal
# Fix only the minimal diff on Gate R pages.
# Run Gate R checks and save evidence BEFORE merge.
```

## 2. Mechanical Checks (PowerShell)
### 2.1 Gate R path guard (block if changed)
```powershell
$gatePaths = @(
  "src/app/dtr/lp",
  "src/app/legal",
  "src/app/support",
  "src/app/page.tsx",
  "app/dtr/lp",
  "app/legal",
  "app/support",
  "app/page.tsx"
)

git fetch origin
git diff --name-only origin/main...HEAD | ForEach-Object {
  $f = $_
  foreach ($p in $gatePaths) {
    if ($f -like "$p*") { "BLOCK: GateR path changed -> $f" }
  }
}
```

### 2.2 Forbidden vocabulary scan (must be zero)
```powershell
$words = @("占い","鑑定","運勢","予言","開運","霊感","当たる")
$roots = @("src","app","pages","public")
foreach ($w in $words) {
  Get-ChildItem -Recurse -File $roots -ErrorAction SilentlyContinue |
    Select-String -SimpleMatch -List $w |
    ForEach-Object { "$w :: $($_.Path):$($_.LineNumber)" }
}
```

### 2.3 URL injection scan (Tap-only violation candidates)
```powershell
$patterns = @("location.search","URLSearchParams","searchParams","router.query","useSearchParams")
Get-ChildItem -Recurse -File @("src","app","pages") -ErrorAction SilentlyContinue |
  Select-String -SimpleMatch -List $patterns |
  ForEach-Object { "$($_.Pattern) :: $($_.Path):$($_.LineNumber)" }
```

### 2.4 Sensory law scan (duration/easing/reduce motion/vibrate)
```powershell
# duration must be only 200 or 400 (Tailwind assumed)
Get-ChildItem -Recurse -File @("src","app","pages") -ErrorAction SilentlyContinue |
  Select-String -Pattern "duration-(?!200\b|400\b)\d+" -AllMatches |
  ForEach-Object { "BAD_DURATION :: $($_.Path):$($_.LineNumber) :: $($_.Line.Trim())" }

# reduce motion presence
Get-ChildItem -Recurse -File @("src","app","pages","public") -ErrorAction SilentlyContinue |
  Select-String -SimpleMatch -List "prefers-reduced-motion" |
  ForEach-Object { "REDUCE_MOTION :: $($_.Path):$($_.LineNumber)" }

# vibrate calls (must be Light/Medium/Heavy only; manual verify patterns)
Get-ChildItem -Recurse -File @("src","app","pages") -ErrorAction SilentlyContinue |
  Select-String -SimpleMatch -List "vibrate(" |
  ForEach-Object { "VIBRATE_CHECK :: $($_.Path):$($_.LineNumber) :: $($_.Line.Trim())" }
```

## 3. Isolation Rules (during Stripe review)
### 3.1 Preview-only gating (recommended)
- Any feature that might surface forbidden vocabulary (Tarot/Synastry/Today descriptions) must not appear on public routes during review.
- Use environment-based gating (NOT URL query):
  - Vercel Preview only: VERCEL_ENV === "preview"
  - Production deny: VERCEL_ENV === "production" → notFound / redirect / render nothing

### 3.2 Feature flags (allowed, but must be server/env based)
- Flags must be enforced server-side or via environment variables.
- Never use URL parameters or query strings to toggle entitlements or content visibility.

### 3.3 Purchase truth
- DB/PurchaseCache is the only source of truth for unlock.
- TrustedStorage can cache for UX but must not unlock by itself.
- Never create a second "purchase state" (no duplicated flags).

## 4. Implementation Constraints (SSOT compliance)
### 4.1 Data Logic Bridge
- Only data/m55_name_analysis_81_sanitized.json is used for NameAnalysis.
- No external heuristics, no LLM regeneration.
- userHash is mandatory; missing → fail-closed.

### 4.2 Context injection
- contextKey injection is Tap-only:
  window.onNavigateChat({ contextKey, contextTitle })
- No location.search / searchParams based injection.

### 4.3 Tarot
- CSPRNG only: crypto.getRandomValues.
- ritual_id computed via crypto.subtle; missing → fail-closed.
- Logging is local-only; no external sync until separate SSOT freeze.
- Motion/haptics must follow Sensory SSOT (200/400ms; vibrate patterns fixed).

End of Document
