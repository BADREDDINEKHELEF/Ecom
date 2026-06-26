-- migration_047: Enforce single default address per user via partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS saved_addresses_one_default_per_user
  ON public.saved_addresses (user_id)
  WHERE (is_default = true);
