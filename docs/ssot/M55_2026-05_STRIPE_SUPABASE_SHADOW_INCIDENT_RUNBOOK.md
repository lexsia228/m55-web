# M55 2026-05 Stripe / Vercel / Supabase Shadow Incident Runbook

Status: APPROVED SSOT  
Date: 2026-05-11  
Scope: DTR base report ¥1,000 Preview webhook fulfillment  
Branch: work/home-cluster  
Environment: Vercel Preview  
DB: Supabase Shadow/Test = m55-soul-shadow / jonlynrbfveaprncyrmv  

## 1. Final GREEN checkpoint
- Stripe Sandbox `checkout.session.completed` -> HTTP 200[cite: 5, 33].
- Response: `{ "received": true }`[cite: 5].
- Shadow DB verification: `all_checks_pass = true`[cite: 10].

## 2. AI confusion prevention rule
All AI/Cursor/Gemini prompts must start with:
作業アンカー：
Branch:
Environment:
DB:
Stripe mode:
Webhook endpoint:
Product lane:
Non-target:
Last GREEN:
Current blocker:
Next one action:
