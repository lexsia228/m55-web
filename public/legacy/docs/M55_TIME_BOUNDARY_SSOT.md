# M55 Time Boundary & TTL SSOT
**Authority:** Constitution Level-0
**Status:** Frozen / Non-negotiable

## Weekly Boundary
- Week boundary is **Monday 00:00 (UserTZ)**.
- weekly `period_key` MUST be ISO-8601 week format: `YYYY-'W'ww` using **week-year**.

## Cache & TTL
- Persist `expires_at` as a **UTC Timestamp**.
- Cache hit condition MUST be: `now < expires_at` (do not trust Firestore TTL deletion timing).
- If `now >= expires_at`: do not show spinners; show silent waiting state.

## Daily Boundary
- Daily boundary is **00:00 (UserTZ)**.
- `date_key` MUST be UserTZ date.
