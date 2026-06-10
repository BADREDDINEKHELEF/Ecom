-- Migration 014: Add payment account details to store_settings
-- Used on the subscription page so sellers know where to send money

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='store_settings' AND column_name='payment_ccp'
  ) THEN
    ALTER TABLE store_settings ADD COLUMN payment_ccp TEXT DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='store_settings' AND column_name='payment_baridimob'
  ) THEN
    ALTER TABLE store_settings ADD COLUMN payment_baridimob TEXT DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='store_settings' AND column_name='payment_note'
  ) THEN
    ALTER TABLE store_settings ADD COLUMN payment_note TEXT DEFAULT '';
  END IF;
END $$;
