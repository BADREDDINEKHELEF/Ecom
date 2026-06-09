# Supabase Migration Apply Order

Run these in the Supabase Dashboard → SQL Editor → New Query **in this exact order**.
Each file is idempotent (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP IF EXISTS`),
so re-running a file that was already applied is safe.

| Order | File | Description |
|-------|------|-------------|
| 1 | `schema.sql` | Core tables, initial (permissive) RLS, base indexes |
| 2 | `migration_002_shipments.sql` | Shipments table + delivery tracking columns |
| 3 | `migration_003_security_hardening.sql` | **Drops permissive RLS policies**, adds secure policies, DB-side triggers, composite indexes |
| 4 | `migration_004_payments_and_stores.sql` | Online payment columns, delivery tokens, vendor store customization |
| 5 | `migration_004b_seller_improvements.sql` | Product variants (JSONB), in-app messages table, seller-specific columns |
| 6 | `migration_005_stock_decrement.sql` | Atomic stock decrement RPC, stock indexes |
| 7 | `migration_006_cod_analytics.sql` | COD analytics table |
| 8 | `migration_007_token_blacklist.sql` | JWT revocation / token blacklist table |
| 9 | `migration_008_audit_log.sql` | Append-only admin audit log table |
| 10 | `migration_009_newsletter_subscribers.sql` | Newsletter subscriber opt-in table |

## Why two 004 files?

`migration_004_payments_and_stores.sql` and `migration_004b_seller_improvements.sql` were originally
both named `004` — a naming collision. They cover independent features and can be applied in either
order as long as both run after `003` and before `005`. The `b` suffix was added to resolve the
ambiguity; the content of neither file was changed.

## After applying all migrations

1. Verify RLS by connecting with the **anon** key and confirming you cannot:
   - Update or delete any product
   - Read another user's orders
   - Insert or update promo codes
2. Verify service_role writes work by testing admin order management.
3. Run the app health check: `GET /api/health` should return `{"ok":true}`.
