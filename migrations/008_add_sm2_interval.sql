-- 008_add_sm2_interval.sql
-- Add `interval` column to vocabularies for SM-2 scheduling.
-- If table already has the column, do nothing (idempotent).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vocabularies' AND column_name = 'interval'
  ) THEN
    ALTER TABLE vocabularies
      ADD COLUMN interval integer NOT NULL DEFAULT 1;
  END IF;
END$$;

