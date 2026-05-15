# M55 Reply Ticket Null Wallet Policy v1

## Facts (preflight-aligned)

- Three **active** `reply_ticket_wallets` rows exist with **`report_instance_id` NULL**.
- Those rows have no report scope key and the preflight also found no `dtr_report_snapshots` rows for the same wallet user_id. Therefore automatic backfill from existing snapshots is not safe.
- Preflight recorded no `dtr_report_snapshots` rows for the same wallet user_id and no duplicate non-null `(user_id, report_instance_id)` pairs.

## Policy position

- **Automatic backfill** of `report_instance_id` for these rows is **not safe** without a separate, explicit mapping rule (not asserted here).
- **Deletion** of wallet rows is **not** selected; retention and audit favor status movement over destructive removal.
- **Quarantine** (closing wallets: `status = 'closed'`) is the **preferred candidate policy** for orphan NULL-scope wallets that cannot be attributed to a snapshot, using the gated SQL candidate:
  - `scripts/sql/staging/m55_reply_ticket_null_wallet_quarantine_candidate.sql`

## Execution status

- **No** database mutation has been executed under this policy document as part of its publication.
- Any `UPDATE` / DDL requires **explicit approval** and a **final gate** consistent with `M55_REPLY_TICKET_WALLET_REPORT_SCOPE_PREFLIGHT_RESULT_v1.md`.

## References

- Preflight result: [`M55_REPLY_TICKET_WALLET_REPORT_SCOPE_PREFLIGHT_RESULT_v1.md`](./M55_REPLY_TICKET_WALLET_REPORT_SCOPE_PREFLIGHT_RESULT_v1.md)
- Report-scope DDL candidate: `scripts/sql/staging/m55_reply_ticket_wallets_report_scope_unique_migration_candidate.sql`

---

*END OF DOCUMENT - M55_REPLY_TICKET_NULL_WALLET_POLICY_v1*
