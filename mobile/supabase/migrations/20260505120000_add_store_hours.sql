ALTER TABLE IF EXISTS stores
  ADD COLUMN IF NOT EXISTS open_time text,
  ADD COLUMN IF NOT EXISTS close_time text;
