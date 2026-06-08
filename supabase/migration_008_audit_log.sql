-- Migration 008: Comprehensive audit log (security + payment events)

CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL   PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role  TEXT        NOT NULL CHECK (actor_role IN ('admin', 'seller', 'system', 'anonymous')),
  action      TEXT        NOT NULL,   -- e.g. 'order.status_changed', 'payment.confirmed'
  resource    TEXT        NOT NULL,   -- e.g. 'order', 'promo_code', 'shipment'
  resource_id TEXT,                   -- UUID or other identifier
  old_value   JSONB,                  -- snapshot before change
  new_value   JSONB,                  -- snapshot after change
  ip_address  INET,
  user_agent  TEXT,
  metadata    JSONB                   -- extra context, gateway response codes, etc.
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_actor      ON audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource   ON audit_log (resource, resource_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action     ON audit_log (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log (created_at DESC);

-- RLS: only service_role may insert; admins may select their scope
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_insert" ON audit_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_role_select" ON audit_log
  FOR SELECT USING (auth.role() = 'service_role');

-- Helper function for API routes to log events without boilerplate
CREATE OR REPLACE FUNCTION log_audit_event(
  p_actor_id    UUID,
  p_actor_role  TEXT,
  p_action      TEXT,
  p_resource    TEXT,
  p_resource_id TEXT    DEFAULT NULL,
  p_old_value   JSONB   DEFAULT NULL,
  p_new_value   JSONB   DEFAULT NULL,
  p_ip_address  INET    DEFAULT NULL,
  p_user_agent  TEXT    DEFAULT NULL,
  p_metadata    JSONB   DEFAULT NULL
) RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO audit_log (
    actor_id, actor_role, action, resource, resource_id,
    old_value, new_value, ip_address, user_agent, metadata
  ) VALUES (
    p_actor_id, p_actor_role, p_action, p_resource, p_resource_id,
    p_old_value, p_new_value, p_ip_address, p_user_agent, p_metadata
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Partition older rows automatically (optional, for high-volume deployments)
-- Comment out if you don't need partitioning
COMMENT ON TABLE audit_log IS
  'Immutable append-only log of security-relevant events. Never UPDATE or DELETE rows.';
