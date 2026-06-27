-- migration_041_seller_customers.sql
-- Seller-level audit log for customer data access
-- Enables GDPR-style accountability: who accessed what customer data, when, from where.

CREATE TABLE IF NOT EXISTS public.seller_data_access_log (
  id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id     UUID         NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  action        TEXT         NOT NULL,  -- 'view_customer_list' | 'reveal_phone' | 'view_abandoned' | 'export_csv'
  resource_type TEXT         NOT NULL,  -- 'customer_list' | 'order' | 'abandoned_cart'
  resource_id   TEXT,                   -- order id, phone hash, or session id (never raw phone)
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ  DEFAULT now()
);

-- Service-role only — sellers read via API, never directly
ALTER TABLE public.seller_data_access_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_seller_audit_vendor_id   ON public.seller_data_access_log(vendor_id);
CREATE INDEX IF NOT EXISTS idx_seller_audit_created_at  ON public.seller_data_access_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seller_audit_action      ON public.seller_data_access_log(action);
