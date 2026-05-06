-- =============================================
-- Replace single-value role column with a roles array column.
-- A user can now hold multiple roles simultaneously
-- (e.g., both 'customer' and 'owner').
-- =============================================

-- Step 1: Add the new roles array column with a safe default
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS roles user_role[] NOT NULL DEFAULT ARRAY['customer']::user_role[];

-- Step 2: Migrate all existing single-role values into the new array column
UPDATE users
  SET roles = ARRAY[role]::user_role[];

-- Step 3: Remove the old single-value role column
-- (data has been preserved in the roles array above)
ALTER TABLE users
  DROP COLUMN IF EXISTS role;
