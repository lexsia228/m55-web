# Human / AI Operating Model

## Roles

| Actor | May do | Must not do |
|-------|--------|-------------|
| **Human (owner)** | Provider UI, Vault writes, GO/STOP, suffix verification in Vault | Paste full secrets into AI chat |
| **AI (Cursor)** | Read repo, run sanitized scripts, produce gate reports | Fetch env, output secrets, auto-capture suffix |
| **CI** | Existing audit gates | Access Vault or env values |

## Gate flow

1. Preflight checklist + allowlist
2. L1 automated evidence (git, diagnostics)
3. Human L2 provider confirmation → Vault
4. AI review (sanitized, separate from Human sign-off)
5. Postflight + checksums
6. Human promotes to `ops/releases/` if GREEN

## Control Plane vs product

Control Plane **does not** reorder paid LP implementation. First dry-run target after Control Plane commit: **paid LP READ-ONLY Planning**.

## Sign-off separation

`human_signoff` and `ai_review` are distinct blocks in templates. AI GREEN does not replace Human L2 for provider facts.
